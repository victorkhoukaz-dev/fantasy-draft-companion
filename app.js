// Fantasy Football Draft Companion PWA - Production Edition
document.addEventListener('DOMContentLoaded', () => {
  // App State
  let rawTakesData = [];
  let groupedPlayersMap = new Map(); // canonical_name -> player object
  let sleeperAdpMap = new Map(); // normalized_name -> { adp, position, team, full_name, pos_rank, pos_num }
  
  let myRosterPlayers = new Set(JSON.parse(localStorage.getItem('fp_my_roster') || '[]'));
  let otherDraftedPlayers = new Set(JSON.parse(localStorage.getItem('fp_other_drafted') || '[]'));
  let starredPlayers = new Set(JSON.parse(localStorage.getItem('fp_starred_players') || '[]'));
  let selectedForCompare = new Set(); // max 3 player_names
  
  let currentPosFilter = 'ALL';
  let currentAuthorFilter = 'ALL';
  let searchQuery = '';
  let hideDrafted = localStorage.getItem('fp_hide_drafted') === 'true';
  let viewMode = localStorage.getItem('fp_view_mode') || 'list'; // 'list' or 'card'
  let sortBy = localStorage.getItem('fp_sort_by') || 'adp'; // 'adp', 'pos_rank', 'stance'
  let isSidebarCollapsed = localStorage.getItem('fp_sidebar_collapsed') === 'true';

  // NFL Team Bye Weeks Database
  const TEAM_BYE_WEEKS = {
    ARI: 11, ATL: 12, BAL: 14, BUF: 12, CAR: 11, CHI: 5, CIN: 12, CLE: 10,
    DAL: 7, DEN: 14, DET: 5, GB: 10, HOU: 14, IND: 14, JAX: 12, KC: 6,
    LV: 10, LAC: 5, LAR: 6, MIA: 6, MIN: 6, NE: 14, NO: 12, NYG: 11,
    NYJ: 12, PHI: 5, PIT: 9, SF: 9, SEA: 10, TB: 11, TEN: 5, WAS: 14
  };

  // Common Name Aliases
  const NAME_ALIASES = {
    'jonathonbrooks': 'jonathanbrooks',
    'lutherburdeniii': 'lutherburden',
    'marvinharrisonjr': 'marvinharrison',
    'brianrobinsonjr': 'brianrobinson',
    'gabedavis': 'gabrieldavis',
    'mitchtrubisky': 'mitchelltrubisky',
    'kennethwalkeriii': 'kennethwalker',
    'travisetiennejr': 'travisetienne',
    'michaelwilsonjr': 'michaelwilson'
  };

  // DOM Elements
  const playerGrid = document.getElementById('playerGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sortBySelect = document.getElementById('sortBySelect');
  const authorFilterSelect = document.getElementById('authorFilterSelect');
  const viewListBtn = document.getElementById('viewListBtn');
  const viewCardBtn = document.getElementById('viewCardBtn');
  const hideDraftedBtn = document.getElementById('hideDraftedBtn');
  const resetDraftBtn = document.getElementById('resetDraftBtn');
  const posChips = document.querySelectorAll('.pos-chip');
  const activeCountEl = document.getElementById('activeCount');
  const totalCountEl = document.getElementById('totalCount');
  const starredCountEl = document.getElementById('starredCount');
  const rosterCountBadge = document.getElementById('rosterCountBadge');
  const sleeperStatusBadge = document.getElementById('sleeperStatusBadge');
  
  // Right Sidebar Elements
  const rosterSidebar = document.getElementById('rosterSidebar');
  const toggleRosterSidebarBtn = document.getElementById('toggleRosterSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const sidebarRosterList = document.getElementById('sidebarRosterList');
  const byeWarningArea = document.getElementById('byeWarningArea');
  const needWarningArea = document.getElementById('needWarningArea');

  // Modals
  const compareBar = document.getElementById('compareBar');
  const selectedCompareList = document.getElementById('selectedCompareList');
  const triggerCompareBtn = document.getElementById('triggerCompareBtn');
  
  const playerModal = document.getElementById('playerModal');
  const modalContent = document.getElementById('modalContent');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  
  const compareModal = document.getElementById('compareModal');
  const compareGridContent = document.getElementById('compareGridContent');
  const compareModalCloseBtn = document.getElementById('compareModalCloseBtn');

  // Initialize UI Controls
  if (sortBySelect) sortBySelect.value = sortBy;
  updateHideDraftedButtonState();
  updateViewToggleButtonState();
  updateSidebarVisibility();
  updateHeaderCounts();

  // Load Sleeper Live ADP & FantasyPoints Database in Parallel
  Promise.all([
    fetchSleeperAdp(),
    fetch('fantasypoints_db.json?t=' + Date.now()).then(r => r.json())
  ])
  .then(([sleeperData, dbData]) => {
    rawTakesData = dbData;
    processTakesData(dbData);
    renderPlayerBoard();
  })
  .catch(err => {
    console.error('Initialization error:', err);
    fetch('fantasypoints_db.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        rawTakesData = data;
        processTakesData(data);
        renderPlayerBoard();
      })
      .catch(e => {
        playerGrid.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <h3>Could not load player dataset</h3>
            <p>Please ensure fantasypoints_db.json exists in the project root.</p>
          </div>
        `;
      });
  });

  // Fetch Live Sleeper Real ADP & Positional Ranks
  function fetchSleeperAdp() {
    const year = new Date().getFullYear();
    const playersUrl = 'https://api.sleeper.app/v1/players/nfl';
    const projectionsUrl = `https://api.sleeper.app/projections/nfl/${year}?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE`;

    return Promise.all([
      fetch(playersUrl).then(res => res.json()),
      fetch(projectionsUrl).then(res => res.json()).catch(() => [])
    ])
    .then(([players, projections]) => {
      sleeperAdpMap.clear();

      // Map player_id -> ADP stat value (PPR first)
      const adpByPlayerId = new Map();
      if (Array.isArray(projections)) {
        projections.forEach(item => {
          if (item && item.player_id && item.stats) {
            const val = item.stats.adp_ppr || item.stats.adp_half_ppr || item.stats.adp_std;
            if (val && val < 990) {
              adpByPlayerId.set(item.player_id, val);
            }
          }
        });
      }

      // Build sorted list of active players with true ADP
      const sortedPlayers = Object.values(players)
        .filter(p => p && p.full_name && p.position)
        .map(p => {
          const realAdp = adpByPlayerId.get(p.player_id) || p.search_rank || 300;
          return {
            player: p,
            adp: Math.round(realAdp),
            pos: p.position
          };
        })
        .filter(item => item.adp < 500)
        .sort((a, b) => a.adp - b.adp);

      const posCounters = { QB: 0, RB: 0, WR: 0, TE: 0 };

      sortedPlayers.forEach(item => {
        const p = item.player;
        const norm = getCanonicalNameKey(p.full_name);
        const pos = item.pos || 'FLEX';

        if (posCounters[pos] !== undefined) {
          posCounters[pos]++;
        }

        const posRank = posCounters[pos] ? `${pos}${posCounters[pos]}` : pos;

        sleeperAdpMap.set(norm, {
          adp: item.adp,
          position: pos,
          team: p.team || 'NFL',
          full_name: p.full_name,
          pos_rank: posRank,
          pos_num: posCounters[pos] || 99
        });
      });

      if (sleeperStatusBadge) sleeperStatusBadge.textContent = '🟢 Sleeper ADP: Live';
      console.log(`Loaded Live Sleeper Real ADP for ${sortedPlayers.length} players.`);
      return sleeperAdpMap;
    })
    .catch(err => {
      console.warn('Sleeper API fetch failed:', err);
      if (sleeperStatusBadge) sleeperStatusBadge.textContent = '🟡 Sleeper ADP: Cached';
      return sleeperAdpMap;
    });
  }

  // Helper: Normalize name
  function getCanonicalNameKey(name) {
    if (!name) return '';
    let rawKey = name.toLowerCase()
      .replace(/ jr\.?| sr\.?| iii| ii| iv/gi, '')
      .replace(/[^a-z]/g, '');
    return NAME_ALIASES[rawKey] || rawKey;
  }

  // Process & Group Takes Data
  function processTakesData(takes) {
    groupedPlayersMap.clear();
    const allAuthors = new Set();

    takes.forEach(take => {
      const rawName = take.player_name ? take.player_name.trim() : 'Unknown Player';
      const canonicalKey = getCanonicalNameKey(rawName);
      
      const sleeperInfo = sleeperAdpMap.get(canonicalKey);
      const displayName = sleeperInfo?.full_name || rawName;
      const position = take.position || sleeperInfo?.position || 'FLEX';
      const team = take.team || sleeperInfo?.team || 'NFL';
      const sleeperAdp = sleeperInfo?.adp || 300;
      const posRank = sleeperInfo?.pos_rank || `${position}`;

      if (!groupedPlayersMap.has(canonicalKey)) {
        groupedPlayersMap.set(canonicalKey, {
          canonical_key: canonicalKey,
          player_name: displayName,
          position: position,
          team: team,
          sleeper_adp: sleeperAdp,
          pos_rank: posRank,
          pos_num: sleeperInfo?.pos_num || 99,
          fp_overall_rank: take.fp_overall_rank || null,
          fp_pos_rank: take.fp_pos_rank || null,
          raw_takes: [],
          author_takes_map: new Map()
        });
      }

      const playerObj = groupedPlayersMap.get(canonicalKey);
      playerObj.raw_takes.push(take);

      if (take.fp_overall_rank) playerObj.fp_overall_rank = take.fp_overall_rank;
      if (take.fp_pos_rank) playerObj.fp_pos_rank = take.fp_pos_rank;

      const author = take.author || 'FantasyPoints Staff';
      allAuthors.add(author);

      if (!playerObj.author_takes_map.has(author)) {
        playerObj.author_takes_map.set(author, {
          author: author,
          stances: new Set(),
          tiers: new Set(),
          reasons: [],
          upside_metrics: [],
          risk_factors: []
        });
      }

      const authorConsolidated = playerObj.author_takes_map.get(author);
      if (take.stance) authorConsolidated.stances.add(take.stance);
      if (take.target_round_advice || take.tier_or_target_round) {
        authorConsolidated.tiers.add(take.target_round_advice || take.tier_or_target_round);
      }
      if (take.key_reason && !authorConsolidated.reasons.includes(take.key_reason)) {
        authorConsolidated.reasons.push(take.key_reason);
      }
      if (take.upside_metric && !authorConsolidated.upside_metrics.includes(take.upside_metric)) {
        authorConsolidated.upside_metrics.push(take.upside_metric);
      }
      if (take.risk_factor && !authorConsolidated.risk_factors.includes(take.risk_factor)) {
        authorConsolidated.risk_factors.push(take.risk_factor);
      }
    });

    if (authorFilterSelect) {
      const selected = authorFilterSelect.value || 'ALL';
      authorFilterSelect.innerHTML = '<option value="ALL">✍️ All Analysts</option>';
      Array.from(allAuthors).sort().forEach(auth => {
        const opt = document.createElement('option');
        opt.value = auth;
        opt.textContent = `✍️ ${auth}`;
        authorFilterSelect.appendChild(opt);
      });
      authorFilterSelect.value = selected;
    }

    groupedPlayersMap.forEach(p => {
      p.display_pos_rank = p.fp_pos_rank || p.pos_rank || `${p.position}`;
      p.fp_pos_num = p.fp_overall_rank || p.pos_num;
    });
  }

  // Render Player Board & Sidebar Panel
  function renderPlayerBoard() {
    playerGrid.innerHTML = '';
    
    if (viewMode === 'list') {
      playerGrid.className = 'player-list-view';
    } else {
      playerGrid.className = 'player-grid';
    }

    let playersArray = Array.from(groupedPlayersMap.values());

    // Position or On Deck Filter
    if (currentPosFilter === 'DECK') {
      playersArray = playersArray.filter(p => starredPlayers.has(p.canonical_key));
    } else if (currentPosFilter !== 'ALL') {
      playersArray = playersArray.filter(p => p.position === currentPosFilter);
    }

    // Author Filter
    if (currentAuthorFilter !== 'ALL') {
      playersArray = playersArray.filter(p => p.author_takes_map.has(currentAuthorFilter));
    }

    // Search Query Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      playersArray = playersArray.filter(p => {
        const matchesName = p.player_name.toLowerCase().includes(query);
        const matchesTeam = p.team.toLowerCase().includes(query);
        const matchesPos = p.position.toLowerCase().includes(query);
        const matchesTakes = p.raw_takes.some(t => 
          (t.author && t.author.toLowerCase().includes(query)) ||
          (t.stance && t.stance.toLowerCase().includes(query)) ||
          (t.key_reason && t.key_reason.toLowerCase().includes(query))
        );
        return matchesName || matchesTeam || matchesPos || matchesTakes;
      });
    }

    // Context-Aware Sorting
    playersArray.sort((a, b) => {
      if (sortBy === 'rank') {
        if (currentPosFilter !== 'ALL' && currentPosFilter !== 'DECK') {
          return (a.fp_pos_num || a.pos_num) - (b.fp_pos_num || b.pos_num);
        } else {
          const rankA = a.fp_overall_rank || a.sleeper_adp;
          const rankB = b.fp_overall_rank || b.sleeper_adp;
          return rankA - rankB;
        }
      } else if (sortBy === 'adp') {
        return a.sleeper_adp - b.sleeper_adp;
      } else if (sortBy === 'stance') {
        const stanceA = getPrimaryStanceForPlayer(a);
        const stanceB = getPrimaryStanceForPlayer(b);
        const hierarchy = { 'Must-Draft': 1, 'Breakout': 2, 'Bullish': 3, 'Sleeper': 4, 'Bearish': 5, 'Avoid': 6 };
        const scoreA = hierarchy[stanceA] || 7;
        const scoreB = hierarchy[stanceB] || 7;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.sleeper_adp - b.sleeper_adp;
      }
      return a.sleeper_adp - b.sleeper_adp;
    });

    let visibleCount = 0;

    playersArray.forEach((player) => {
      const isDraftedMe = myRosterPlayers.has(player.canonical_key);
      const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);

      visibleCount++;

      if (viewMode === 'list') {
        const row = createCompactPlayerRow(player, isDraftedMe, isDraftedOther);
        playerGrid.appendChild(row);
      } else {
        const card = createPlayerCard(player, isDraftedMe, isDraftedOther);
        playerGrid.appendChild(card);
      }
    });

    renderRosterSidebarContent();
    updateHeaderCounts();

    if (visibleCount === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }

    updateCompareFloatingBar();
  }

  // Helper: Consolidate & Clean Target Round Advice (No Tiers, No Redundancy)
  function consolidateTargetRoundAdvice(rawList) {
    if (!rawList || rawList.length === 0) return '';

    const cleaned = [];
    rawList.forEach(rawStr => {
      if (!rawStr) return;
      // Strip out tier mentions, ADP QB tags, and bracket noise
      let str = rawStr
        .replace(/tier\s*\d+/gi, '')
        .replace(/\(adp\s*[^)]*\)/gi, '')
        .replace(/adp\s*[a-z0-9-]+/gi, '')
        .replace(/\(qb\d+\)/gi, '')
        .replace(/\(rb\d+\)/gi, '')
        .replace(/\(wr\d+\)/gi, '')
        .replace(/\(te\d+\)/gi, '')
        .replace(/\s*\/\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (str && !cleaned.some(c => c.toLowerCase() === str.toLowerCase() || str.toLowerCase().includes(c.toLowerCase()))) {
        cleaned.push(str);
      }
    });

    return cleaned.join(' / ');
  }

  // Helper: Format 12-Team Draft Round & Pick
  function format12TeamAdpDisplay(rawAdp) {
    const rounded = Math.round(rawAdp);
    if (!rounded || rounded >= 300) return 'Undrafted';
    
    const round = Math.ceil(rounded / 12);
    const pickInRound = rounded % 12 === 0 ? 12 : rounded % 12;
    
    return `#${rounded} (Rd ${round}.${pickInRound})`;
  }

  // Helper: Evaluate Global Analyst Consensus & Conflicts
  function evaluatePlayerConsensus(player) {
    const allStances = [];
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.push(s)));
    
    if (allStances.length === 0) return { type: 'NONE', label: '', modalTitle: '', icon: '', class: '', boxStyle: '', titleColor: '' };

    const positiveSet = new Set(['Exodia', 'Hansen 50', 'Hansen-50', 'Must-Draft', 'Bullish', 'Breakout', 'Sleeper']);
    const negativeSet = new Set(['Dirty Thirty', 'Dirty-Thirty', 'Avoid', 'Bearish']);

    let hasPositive = false;
    let hasNegative = false;

    allStances.forEach(s => {
      if (positiveSet.has(s)) hasPositive = true;
      if (negativeSet.has(s)) hasNegative = true;
    });

    if (hasPositive && hasNegative) {
      return {
        type: 'SPLIT',
        label: '⚠️ Split',
        modalTitle: '⚠️ ANALYST DISAGREEMENT',
        icon: '⚠️',
        class: 'Split',
        boxStyle: 'background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.5); box-shadow: 0 0 15px rgba(245, 158, 11, 0.2);',
        titleColor: '#fde68a'
      };
    } else if (hasNegative && !hasPositive) {
      return {
        type: 'FADE',
        label: '🛑 Fade Consensus',
        modalTitle: '🛑 UNANIMOUS FADE',
        icon: '🛑',
        class: 'FadeConsensus',
        boxStyle: 'background: rgba(244, 63, 94, 0.15); border: 1px solid rgba(244, 63, 94, 0.5); box-shadow: 0 0 15px rgba(244, 63, 94, 0.2);',
        titleColor: '#fecdd3'
      };
    } else {
      return {
        type: 'BULLISH',
        label: '📈 Consensus',
        modalTitle: '🟢 UNANIMOUS CONSENSUS',
        icon: '🟢',
        class: 'Consensus',
        boxStyle: 'background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(56, 189, 248, 0.15)); border: 1px solid rgba(16, 185, 129, 0.4); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);',
        titleColor: '#6ee7b7'
      };
    }
  }

  function getSignatureStances(player) {
    const signature = [];
    const signatureNames = ['Exodia', 'Hansen 50', 'Hansen-50', 'Dirty Thirty', 'Dirty-Thirty'];
    player.author_takes_map.forEach(auth => {
      auth.stances.forEach(s => {
        if (signatureNames.includes(s) && !signature.includes(s)) {
          signature.push(s);
        }
      });
    });
    return signature;
  }

  // Create Compact Row
  function createCompactPlayerRow(player, isDraftedMe, isDraftedOther) {
    const row = document.createElement('div');
    const isDrafted = isDraftedMe || isDraftedOther;
    
    let draftClass = '';
    if (isDraftedMe) draftClass = 'drafted-me';
    else if (isDraftedOther) draftClass = 'drafted-other';

    row.className = `player-row ${draftClass} ${isDrafted && hideDrafted ? 'hidden' : ''}`;
    row.setAttribute('data-player', player.canonical_key);

    const authors = Array.from(player.author_takes_map.keys());
    const isStarred = starredPlayers.has(player.canonical_key);
    const rawTargetList = player.raw_takes.map(t => t.target_round_advice || t.tier_or_target_round).filter(Boolean);
    const topTargetStr = consolidateTargetRoundAdvice(rawTargetList);
    const isCheckedForCompare = selectedForCompare.has(player.canonical_key);
    const adpDisplay = format12TeamAdpDisplay(player.sleeper_adp);

    const consensusInfo = evaluatePlayerConsensus(player);
    const signatureStances = getSignatureStances(player);

    const stancePills = [];
    signatureStances.forEach(sig => {
      stancePills.push(`<span class="badge-stance ${sig.replace(/\s+/g, '-')}">${getIconForStance(sig)} ${sig}</span>`);
    });
    if (consensusInfo.label) {
      stancePills.push(`<span class="badge-stance ${consensusInfo.class}">${consensusInfo.label}</span>`);
    }

    row.innerHTML = `
      <div class="row-left">
        <button class="btn-star ${isStarred ? 'starred' : ''}" data-player="${escapeHtml(player.canonical_key)}" onclick="event.stopPropagation();" title="Pin to On Deck">
          ${isStarred ? '⭐' : '☆'}
        </button>

        <div class="draft-action-group">
          <button class="btn-draft-me ${isDraftedMe ? 'active' : ''}" data-player="${escapeHtml(player.canonical_key)}" onclick="event.stopPropagation();" title="Draft for MY Team">
            ${isDraftedMe ? 'MINE' : 'ME'}
          </button>
          <button class="btn-draft-other ${isDraftedOther ? 'active' : ''}" data-player="${escapeHtml(player.canonical_key)}" onclick="event.stopPropagation();" title="Drafted by OTHER Team">
            ${isDraftedOther ? 'TAKEN' : 'OFF'}
          </button>
        </div>

        <span class="badge-pos ${player.position}">${escapeHtml(player.display_pos_rank || player.pos_rank)}</span>

        <div class="row-player-info">
          <div class="row-name-line">
            <span class="row-player-name ${isDraftedOther ? 'card-drafted-strike' : ''}">${escapeHtml(player.player_name)}</span>
            <span class="team-badge">${escapeHtml(player.team)}</span>
          </div>

          <div class="row-sub-line">
            <span class="adp-tag">Sleeper: ${adpDisplay}</span>
            <span class="author-approval-tag">✍️ ${authors.join(', ')}</span>
            ${topTargetStr ? `<span class="tier-tag">🎯 ${escapeHtml(topTargetStr)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="row-right">
        <div class="stance-pills-compact">
          ${stancePills.join('')}
        </div>

        <label class="compare-checkbox-label" onclick="event.stopPropagation();">
          <input type="checkbox" class="compare-checkbox" data-player="${escapeHtml(player.canonical_key)}" ${isCheckedForCompare ? 'checked' : ''}>
          <span>VS</span>
        </label>
      </div>
    `;

    row.addEventListener('click', () => openPlayerModal(player));
    
    row.querySelector('.btn-star').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStarStatus(player.canonical_key);
    });

    row.querySelector('.btn-draft-me').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDraftForMe(player.canonical_key);
    });

    row.querySelector('.btn-draft-other').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDraftForOther(player.canonical_key);
    });

    row.querySelector('.compare-checkbox').addEventListener('change', (e) => {
      e.stopPropagation();
      toggleCompareSelection(player.canonical_key, e.target.checked);
    });

    return row;
  }

  // Create Standard Detailed Card
  function createPlayerCard(player, isDraftedMe, isDraftedOther) {
    const card = document.createElement('div');
    const isDrafted = isDraftedMe || isDraftedOther;

    let draftClass = '';
    if (isDraftedMe) draftClass = 'drafted-me';
    else if (isDraftedOther) draftClass = 'drafted-other';

    card.className = `player-card ${draftClass} ${isDrafted && hideDrafted ? 'hidden' : ''}`;
    card.setAttribute('data-player', player.canonical_key);

    const consensusInfo = evaluatePlayerConsensus(player);
    const signatureStances = getSignatureStances(player);

    const stancePills = [];
    signatureStances.forEach(sig => {
      stancePills.push(`<span class="badge-stance ${sig.replace(/\s+/g, '-')}">${getIconForStance(sig)} ${sig}</span>`);
    });
    if (consensusInfo.label) {
      stancePills.push(`<span class="badge-stance ${consensusInfo.class}">${consensusInfo.label}</span>`);
    }

    card.innerHTML = `
      <div>
        <div class="card-header">
          <div class="player-info-meta">
            <div style="display: flex; align-items: center; gap: 6px;">
              <button class="btn-star ${isStarred ? 'starred' : ''}" onclick="event.stopPropagation();">
                ${isStarred ? '⭐' : '☆'}
              </button>
              <span class="player-name ${isDraftedOther ? 'card-drafted-strike' : ''}">${escapeHtml(player.player_name)}</span>
            </div>
            <div class="team-pos-row">
              <span class="badge-pos ${player.position}">${escapeHtml(player.display_pos_rank || player.pos_rank)}</span>
              <span class="team-name">${escapeHtml(player.team)}</span>
              <span class="adp-tag" style="margin-left: 4px;">Sleeper: #${player.sleeper_adp}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <div class="draft-action-group">
              <button class="btn-draft-me ${isDraftedMe ? 'active' : ''}" onclick="event.stopPropagation();">ME</button>
              <button class="btn-draft-other ${isDraftedOther ? 'active' : ''}" onclick="event.stopPropagation();">OFF</button>
            </div>
            <label class="compare-checkbox-label" onclick="event.stopPropagation();">
              <input type="checkbox" class="compare-checkbox" ${isCheckedForCompare ? 'checked' : ''}>
              <span>VS</span>
            </label>
          </div>
        </div>

        <div class="card-body">
          <div class="stance-pill-row">
            ${stancePills.join('')}
            ${topTargetStr ? `<span class="tier-text">🎯 ${escapeHtml(topTargetStr)}</span>` : ''}
          </div>

          ${upsideSample ? `
            <div class="upside-teaser">
              💡 <strong>Takeaway:</strong> ${escapeHtml(upsideSample)}
            </div>
          ` : ''}
        </div>
      </div>

      <div class="author-avatars" style="margin-top: 10px;">
        <div class="author-avatar-dot">${authors.length}</div>
        <span>✍️ Approved by ${authors.join(', ')} (${player.raw_takes.length} takes)</span>
      </div>
    `;

    card.addEventListener('click', () => openPlayerModal(player));
    card.querySelector('.btn-star').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleStarStatus(player.canonical_key);
    });
    card.querySelector('.btn-draft-me').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDraftForMe(player.canonical_key);
    });
    card.querySelector('.btn-draft-other').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDraftForOther(player.canonical_key);
    });
    card.querySelector('.compare-checkbox').addEventListener('change', (e) => {
      e.stopPropagation();
      toggleCompareSelection(player.canonical_key, e.target.checked);
    });

    return card;
  }

  // Render Content inside Right Roster Sidebar Panel
  function renderRosterSidebarContent() {
    if (!sidebarRosterList) return;
    sidebarRosterList.innerHTML = '';
    byeWarningArea.innerHTML = '';
    needWarningArea.innerHTML = '';

    const myPlayers = Array.from(myRosterPlayers).map(k => groupedPlayersMap.get(k)).filter(Boolean);

    // Bye Week Conflicts
    const byeCount = {};
    myPlayers.forEach(p => {
      const bye = TEAM_BYE_WEEKS[p.team];
      if (bye) byeCount[bye] = (byeCount[bye] || 0) + 1;
    });

    const heavyByes = Object.entries(byeCount).filter(([bye, count]) => count >= 2);
    if (heavyByes.length > 0) {
      byeWarningArea.innerHTML = heavyByes.map(([bye, count]) => `
        <div class="bye-warning-banner">
          ⚠️ <strong>Bye Conflict:</strong> ${count} starters on <strong>Wk ${bye} Bye</strong>
        </div>
      `).join('');
    }

    // Positional Needs
    const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };
    myPlayers.forEach(p => { if (posCounts[p.position] !== undefined) posCounts[p.position]++; });

    const missingNeeds = [];
    if (posCounts.QB < 1) missingNeeds.push('QB1');
    if (posCounts.RB < 2) missingNeeds.push(`RB${posCounts.RB + 1}`);
    if (posCounts.WR < 2) missingNeeds.push(`WR${posCounts.WR + 1}`);
    if (posCounts.TE < 1) missingNeeds.push('TE1');

    if (missingNeeds.length > 0) {
      needWarningArea.innerHTML = `
        <div class="need-warning-banner">
          🎯 <strong>Need:</strong> ${missingNeeds.join(', ')}
        </div>
      `;
    }

    // Roster Slot Layout
    const slots = [
      { label: 'QB1', pos: 'QB' },
      { label: 'RB1', pos: 'RB' },
      { label: 'RB2', pos: 'RB' },
      { label: 'WR1', pos: 'WR' },
      { label: 'WR2', pos: 'WR' },
      { label: 'TE1', pos: 'TE' },
      { label: 'FLEX1', pos: 'FLEX' },
      { label: 'FLEX2', pos: 'FLEX' },
      { label: 'BN1', pos: 'BENCH' },
      { label: 'BN2', pos: 'BENCH' },
      { label: 'BN3', pos: 'BENCH' },
      { label: 'BN4', pos: 'BENCH' },
      { label: 'BN5', pos: 'BENCH' }
    ];

    const filledPlayers = new Set();

    slots.forEach(slot => {
      const row = document.createElement('div');
      row.className = 'sidebar-slot-row';

      let matchedPlayer = null;

      if (slot.pos !== 'FLEX' && slot.pos !== 'BENCH') {
        matchedPlayer = myPlayers.find(p => p.position === slot.pos && !filledPlayers.has(p.canonical_key));
      } else if (slot.pos === 'FLEX') {
        matchedPlayer = myPlayers.find(p => (p.position === 'RB' || p.position === 'WR' || p.position === 'TE') && !filledPlayers.has(p.canonical_key));
      } else {
        matchedPlayer = myPlayers.find(p => !filledPlayers.has(p.canonical_key));
      }

      if (matchedPlayer) {
        filledPlayers.add(matchedPlayer.canonical_key);
        const bye = TEAM_BYE_WEEKS[matchedPlayer.team] ? `Wk ${TEAM_BYE_WEEKS[matchedPlayer.team]}` : '';
        row.innerHTML = `
          <span class="sidebar-slot-label">${slot.label}</span>
          <span class="sidebar-slot-player">${escapeHtml(matchedPlayer.player_name)}</span>
          <span class="badge-pos ${matchedPlayer.position}">${matchedPlayer.position}</span>
        `;
      } else {
        row.innerHTML = `
          <span class="sidebar-slot-label">${slot.label}</span>
          <span class="sidebar-empty-slot">Empty</span>
        `;
      }

      sidebarRosterList.appendChild(row);
    });
  }

  // Sidebar Visibility Toggle Handler
  function updateSidebarVisibility() {
    if (isSidebarCollapsed) {
      rosterSidebar.classList.add('collapsed');
      toggleRosterSidebarBtn.classList.remove('active');
    } else {
      rosterSidebar.classList.remove('collapsed');
      toggleRosterSidebarBtn.classList.add('active');
    }
  }

  toggleRosterSidebarBtn.addEventListener('click', () => {
    isSidebarCollapsed = !isSidebarCollapsed;
    localStorage.setItem('fp_sidebar_collapsed', isSidebarCollapsed ? 'true' : 'false');
    updateSidebarVisibility();
  });

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      isSidebarCollapsed = true;
      localStorage.setItem('fp_sidebar_collapsed', 'true');
      updateSidebarVisibility();
    });
  }

  // Toggle Star / On Deck Status
  function toggleStarStatus(canonicalKey) {
    if (starredPlayers.has(canonicalKey)) {
      starredPlayers.delete(canonicalKey);
    } else {
      starredPlayers.add(canonicalKey);
    }
    localStorage.setItem('fp_starred_players', JSON.stringify(Array.from(starredPlayers)));
    renderPlayerBoard();
  }

  // Toggle Draft for ME
  function toggleDraftForMe(canonicalKey) {
    if (myRosterPlayers.has(canonicalKey)) {
      myRosterPlayers.delete(canonicalKey);
    } else {
      myRosterPlayers.add(canonicalKey);
      otherDraftedPlayers.delete(canonicalKey);
    }
    saveDraftStates();
    renderPlayerBoard();
  }

  // Toggle Draft for OTHER
  function toggleDraftForOther(canonicalKey) {
    if (otherDraftedPlayers.has(canonicalKey)) {
      otherDraftedPlayers.delete(canonicalKey);
    } else {
      otherDraftedPlayers.add(canonicalKey);
      myRosterPlayers.delete(canonicalKey);
    }
    saveDraftStates();
    renderPlayerBoard();
  }

  function saveDraftStates() {
    localStorage.setItem('fp_my_roster', JSON.stringify(Array.from(myRosterPlayers)));
    localStorage.setItem('fp_other_drafted', JSON.stringify(Array.from(otherDraftedPlayers)));
  }

  function updateHeaderCounts() {
    if (starredCountEl) starredCountEl.textContent = starredPlayers.size;
    if (rosterCountBadge) rosterCountBadge.textContent = `(${myRosterPlayers.size}/15)`;
    
    const totalPlayers = groupedPlayersMap.size;
    const activeAvailable = totalPlayers - (myRosterPlayers.size + otherDraftedPlayers.size);
    if (totalCountEl) totalCountEl.textContent = totalPlayers;
    if (activeCountEl) activeCountEl.textContent = activeAvailable;
  }

  // Toggle Compare Selection
  function toggleCompareSelection(canonicalKey, isChecked) {
    if (isChecked) {
      if (selectedForCompare.size >= 3) {
        alert('You can compare a maximum of 3 players at a time.');
        renderPlayerBoard();
        return;
      }
      selectedForCompare.add(canonicalKey);
    } else {
      selectedForCompare.delete(canonicalKey);
    }
    updateCompareFloatingBar();
  }

  function updateCompareFloatingBar() {
    selectedCompareList.innerHTML = '';
    if (selectedForCompare.size > 0) {
      selectedForCompare.forEach(key => {
        const p = groupedPlayersMap.get(key);
        if (p) {
          const chip = document.createElement('span');
          chip.className = 'selected-player-chip';
          chip.textContent = p.player_name;
          selectedCompareList.appendChild(chip);
        }
      });
      triggerCompareBtn.textContent = `Compare (${selectedForCompare.size})`;
      compareBar.classList.add('active');
    } else {
      compareBar.classList.remove('active');
    }
  }

  // Helper: Generate Smart AI Executive Consensus Synthesis (Ultra-Compact 1-Liner)
  function generateAiConsensusSummary(player) {
    if (player.ai_consensus_summary) return player.ai_consensus_summary;

    const authors = Array.from(player.author_takes_map.keys());
    const allStances = [];
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.push(s)));
    const primaryStance = getPrimaryStance(allStances);

    const reasons = [];
    player.author_takes_map.forEach(auth => {
      if (auth.reasons.length > 0) reasons.push(auth.reasons[0]);
    });

    const targetList = [];
    player.author_takes_map.forEach(auth => {
      const t = consolidateTargetRoundAdvice(Array.from(auth.tiers));
      if (t) targetList.push(t);
    });

    const mainReason = reasons.length > 0 ? reasons[0] : 'strong analytical consensus';
    const mainTarget = targetList.length > 0 ? ` | Target: ${targetList[0]}` : '';

    return `${primaryStance} by ${authors.join(', ')} — ${mainReason}${mainTarget}`;
  }

  // Open Consolidated Multi-Author Consensus Modal
  function openPlayerModal(player) {
    const isDraftedMe = myRosterPlayers.has(player.canonical_key);
    const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);
    const adpDisplay = format12TeamAdpDisplay(player.sleeper_adp);

    const authors = Array.from(player.author_takes_map.keys());
    const consensusInfo = evaluatePlayerConsensus(player);
    const aiSummaryText = generateAiConsensusSummary(player);

    modalContent.innerHTML = `
      <div class="modal-header-main">
        <div class="modal-meta-bar" style="margin-bottom: 6px;">
          <span class="badge-pos ${player.position}">${escapeHtml(player.display_pos_rank || player.pos_rank)}</span>
          <span class="team-name" style="font-size: 1rem;">${escapeHtml(player.team)}</span>
          <span class="adp-tag">Sleeper PPR: ${adpDisplay}</span>
          ${isDraftedMe ? '<span class="badge-stance Must-Draft">MY TEAM</span>' : ''}
          ${isDraftedOther ? '<span class="badge-stance Avoid">DRAFTED</span>' : ''}
        </div>
        <h2 class="modal-player-title">${escapeHtml(player.player_name)}</h2>
      </div>

      <!-- AI Executive Consensus Overview Box -->
      <div style="${consensusInfo.boxStyle} border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 800; font-size: 0.85rem; color: ${consensusInfo.titleColor}; text-transform: uppercase; letter-spacing: 0.05em;">🤖 AI Executive Consensus</span>
          <span class="badge-stance ${consensusInfo.class}">${consensusInfo.modalTitle}</span>
        </div>
        <p style="font-size: 0.88rem; color: #f1f5f9; line-height: 1.45; font-weight: 500;">
          ${escapeHtml(aiSummaryText)}
        </p>
      </div>

      <!-- Consolidated Author Cards -->
      <div class="modal-takes-list">
        ${Array.from(player.author_takes_map.values()).map(auth => {
          const authStance = getPrimaryStance(Array.from(auth.stances));
          const targetStr = consolidateTargetRoundAdvice(Array.from(auth.tiers));

          return `
            <div class="modal-take-card">
              <div class="take-author-row">
                <span class="author-name">✍️ ${escapeHtml(auth.author)}</span>
                <span class="badge-stance ${authStance}">${getIconForStance(authStance)} ${authStance}</span>
              </div>

              ${targetStr ? `
                <div class="take-section">
                  <div class="take-label">🎯 Target Round</div>
                  <div class="take-text" style="font-weight: 600; color: #38bdf8;">${escapeHtml(targetStr)}</div>
                </div>
              ` : ''}

              <div class="take-section">
                <div class="take-label">📊 Key Analytical Reasons</div>
                <ul style="padding-left: 18px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                  ${auth.reasons.map(r => `<li class="take-text">${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>

              ${auth.upside_metrics.length > 0 ? `
                <div class="upside-box">
                  🚀 <strong>Upside Metrics:</strong>
                  <ul style="padding-left: 16px; margin-top: 2px;">
                    ${auth.upside_metrics.map(u => `<li>${escapeHtml(u)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              ${auth.risk_factors.length > 0 ? `
                <div class="risk-box">
                  ⚠️ <strong>Risk Factors:</strong>
                  <ul style="padding-left: 16px; margin-top: 2px;">
                    ${auth.risk_factors.map(rf => `<li>${escapeHtml(rf)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    playerModal.classList.add('open');
    playerModal.setAttribute('aria-hidden', 'false');
  }

  // Head-to-Head Compare Modal Trigger
  triggerCompareBtn.addEventListener('click', () => {
    if (selectedForCompare.size === 0) return;

    compareGridContent.innerHTML = '';
    selectedForCompare.forEach(key => {
      const player = groupedPlayersMap.get(key);
      if (!player) return;

      const col = document.createElement('div');
      col.className = 'compare-col';

      const allStances = new Set();
      player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.add(s)));

      col.innerHTML = `
        <div style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
          <div class="team-pos-row" style="margin-bottom: 4px;">
            <span class="badge-pos ${player.position}">${escapeHtml(player.display_pos_rank || player.pos_rank)}</span>
            <span class="team-name">${escapeHtml(player.team)}</span>
            <span class="adp-tag">Sleeper #${player.sleeper_adp}</span>
          </div>
          <h3 style="font-size: 1.15rem; font-weight: 800;">${escapeHtml(player.player_name)}</h3>
          <div class="stance-pill-row" style="margin-top: 6px;">
            ${Array.from(allStances).map(s => `<span class="badge-stance ${s}">${s}</span>`).join('')}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${Array.from(player.author_takes_map.values()).map(auth => `
            <div style="background: rgba(15, 23, 42, 0.5); padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
              <div style="font-size: 0.8rem; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">${escapeHtml(auth.author)}</div>
              <ul style="padding-left: 14px; font-size: 0.75rem; color: #cbd5e1;">
                ${auth.reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
              </ul>
              ${auth.upside_metrics.length > 0 ? `<div style="font-size: 0.75rem; color: #6ee7b7; margin-top: 4px;">📈 ${escapeHtml(auth.upside_metrics[0])}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;

      compareGridContent.appendChild(col);
    });

    compareModal.classList.add('open');
    compareModal.setAttribute('aria-hidden', 'false');
  });

  // Modal Handlers & Helpers
  modalCloseBtn.addEventListener('click', () => {
    playerModal.classList.remove('open');
    playerModal.setAttribute('aria-hidden', 'true');
  });

  compareModalCloseBtn.addEventListener('click', () => {
    compareModal.classList.remove('open');
    compareModal.setAttribute('aria-hidden', 'true');
  });

  // Fix 3: Global ESC Key Listener to Close Modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      playerModal.classList.remove('open');
      playerModal.setAttribute('aria-hidden', 'true');
      compareModal.classList.remove('open');
      compareModal.setAttribute('aria-hidden', 'true');
    }
  });

  [playerModal, compareModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    });
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderPlayerBoard();
  });

  if (sortBySelect) {
    sortBySelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      localStorage.setItem('fp_sort_by', sortBy);
      renderPlayerBoard();
    });
  }

  // Fix 4: Clear Segmented View Switch Button Handlers
  if (viewListBtn && viewCardBtn) {
    viewListBtn.addEventListener('click', () => {
      viewMode = 'list';
      localStorage.setItem('fp_view_mode', 'list');
      updateViewToggleButtonState();
      renderPlayerBoard();
    });

    viewCardBtn.addEventListener('click', () => {
      viewMode = 'card';
      localStorage.setItem('fp_view_mode', 'card');
      updateViewToggleButtonState();
      renderPlayerBoard();
    });
  }

  hideDraftedBtn.addEventListener('click', () => {
    hideDrafted = !hideDrafted;
    localStorage.setItem('fp_hide_drafted', hideDrafted ? 'true' : 'false');
    updateHideDraftedButtonState();
    renderPlayerBoard();
  });

  resetDraftBtn.addEventListener('click', () => {
    if (confirm('Reset all drafted player statuses & rosters?')) {
      myRosterPlayers.clear();
      otherDraftedPlayers.clear();
      starredPlayers.clear();
      localStorage.removeItem('fp_my_roster');
      localStorage.removeItem('fp_other_drafted');
      localStorage.removeItem('fp_starred_players');
      renderPlayerBoard();
    }
  });

  posChips.forEach(chip => {
    chip.addEventListener('click', () => {
      posChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPosFilter = chip.getAttribute('data-pos');
      renderPlayerBoard();
    });
  });

  function updateHideDraftedButtonState() {
    if (hideDrafted) {
      hideDraftedBtn.classList.add('active');
    } else {
      hideDraftedBtn.classList.remove('active');
    }
  }

  function updateViewToggleButtonState() {
    if (viewListBtn && viewCardBtn) {
      if (viewMode === 'list') {
        viewListBtn.classList.add('active');
        viewCardBtn.classList.remove('active');
      } else {
        viewCardBtn.classList.add('active');
        viewListBtn.classList.remove('active');
      }
    }
  }

  function getPrimaryStanceForPlayer(player) {
    const allStances = [];
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.push(s)));
    return getPrimaryStance(allStances);
  }

  function getPrimaryStance(stancesArr) {
    if (!stancesArr || stancesArr.length === 0) return 'Bullish';
    const hierarchy = ['Exodia', 'Must-Draft', 'Hansen 50', 'Hansen-50', 'Breakout', 'Bullish', 'Sleeper', 'Dirty Thirty', 'Dirty-Thirty', 'Bearish', 'Avoid'];
    for (const h of hierarchy) {
      if (stancesArr.includes(h)) return h;
    }
    return stancesArr[0];
  }

  function getIconForStance(stance) {
    if (!stance) return '📌';
    const s = stance.toLowerCase();
    if (s.includes('exodia')) return '✨';
    if (s.includes('hansen')) return '🎯';
    if (s.includes('dirty')) return '☣️';
    if (s.includes('must')) return '🔥';
    if (s.includes('bull')) return '📈';
    if (s.includes('break')) return '⚡';
    if (s.includes('sleep')) return '💎';
    if (s.includes('avoid') || s.includes('bear')) return '🛑';
    return '📌';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, match => {
      const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return escapeMap[match];
    });
  }

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('PWA ServiceWorker registered:', reg.scope))
        .catch(err => console.log('PWA ServiceWorker registration failed:', err));
    });
  }
});
