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
  const viewToggleBtn = document.getElementById('viewToggleBtn');
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

  // Fetch Live Sleeper ADP
  function fetchSleeperAdp() {
    return fetch('https://api.sleeper.app/v1/players/nfl')
      .then(res => {
        if (!res.ok) throw new Error('Sleeper API HTTP error');
        return res.json();
      })
      .then(players => {
        sleeperAdpMap.clear();
        const posCounters = { QB: 0, RB: 0, WR: 0, TE: 0 };
        
        const sortedPlayers = Object.values(players)
          .filter(p => p.full_name && p.search_rank && p.search_rank < 500)
          .sort((a, b) => a.search_rank - b.search_rank);

        sortedPlayers.forEach(p => {
          const norm = getCanonicalNameKey(p.full_name);
          const pos = p.position || 'FLEX';
          if (posCounters[pos] !== undefined) {
            posCounters[pos]++;
          }
          const posRank = posCounters[pos] ? `${pos}${posCounters[pos]}` : pos;

          sleeperAdpMap.set(norm, {
            adp: p.search_rank,
            position: pos,
            team: p.team || 'NFL',
            full_name: p.full_name,
            pos_rank: posRank,
            pos_num: posCounters[pos] || 99
          });
        });

        if (sleeperStatusBadge) sleeperStatusBadge.textContent = 'Sleeper ADP 🟢';
        console.log(`Loaded Sleeper ADP for ${sortedPlayers.length} players.`);
        return sleeperAdpMap;
      })
      .catch(err => {
        console.warn('Sleeper API fetch failed:', err);
        if (sleeperStatusBadge) sleeperStatusBadge.textContent = 'Sleeper ADP 🟡';
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
      if (take.tier_or_target_round) authorConsolidated.tiers.add(take.tier_or_target_round);
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

    const posGroups = { QB: [], RB: [], WR: [], TE: [] };
    groupedPlayersMap.forEach(p => {
      if (posGroups[p.position]) posGroups[p.position].push(p);
    });

    Object.values(posGroups).forEach(group => {
      group.sort((a, b) => (a.fp_overall_rank || a.sleeper_adp) - (b.fp_overall_rank || b.sleeper_adp));
      group.forEach((p, idx) => {
        p.fp_pos_num = idx + 1;
        p.display_pos_rank = p.fp_pos_rank || `${p.position}${idx + 1}`;
      });
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
    let currentTierBoundary = 0;

    playersArray.forEach((player, idx) => {
      const isDraftedMe = myRosterPlayers.has(player.canonical_key);
      const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);
      const isDrafted = isDraftedMe || isDraftedOther;

      visibleCount++;

      // Positional Tier Divider Rows
      if (viewMode === 'list' && currentPosFilter !== 'ALL' && currentPosFilter !== 'DECK') {
        const playerTierGroup = Math.ceil((player.pos_num || idx + 1) / 5);
        if (playerTierGroup !== currentTierBoundary) {
          currentTierBoundary = playerTierGroup;
          
          const remainingInTier = playersArray.slice(idx, idx + 5).filter(p => !myRosterPlayers.has(p.canonical_key) && !otherDraftedPlayers.has(p.canonical_key)).length;
          
          const divider = document.createElement('div');
          divider.className = 'tier-divider-row';
          divider.innerHTML = `
            <span>--- ${currentPosFilter} TIER ${currentTierBoundary} ---</span>
            ${remainingInTier <= 2 ? `<span class="tier-alert-pill">⚠️ Only ${remainingInTier} Left!</span>` : `<span style="font-size: 0.75rem; color: var(--text-muted);">${remainingInTier} Available</span>`}
          `;
          playerGrid.appendChild(divider);
        }
      }

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

  // Create Compact Row
  function createCompactPlayerRow(player, isDraftedMe, isDraftedOther) {
    const row = document.createElement('div');
    const isDrafted = isDraftedMe || isDraftedOther;
    
    let draftClass = '';
    if (isDraftedMe) draftClass = 'drafted-me';
    else if (isDraftedOther) draftClass = 'drafted-other';

    row.className = `player-row ${draftClass} ${isDrafted && hideDrafted ? 'hidden' : ''}`;
    row.setAttribute('data-player', player.canonical_key);

    const allStances = new Set();
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.add(s)));
    const stances = Array.from(allStances);

    const isStarred = starredPlayers.has(player.canonical_key);
    const topTargetStr = player.raw_takes.find(t => t.tier_or_target_round)?.tier_or_target_round || '';
    const isCheckedForCompare = selectedForCompare.has(player.canonical_key);
    
    const roundEst = player.sleeper_adp < 300 ? Math.ceil(player.sleeper_adp / 12) : '-';
    const pickEst = player.sleeper_adp < 300 ? ((player.sleeper_adp - 1) % 12) + 1 : '-';
    const adpDisplay = player.sleeper_adp < 300 ? `#${player.sleeper_adp} (Rd ${roundEst}.${pickEst})` : 'Undrafted';

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
            ${topTargetStr ? `<span class="tier-tag">🎯 ${escapeHtml(topTargetStr)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="row-right">
        <div class="stance-pills-compact">
          ${stances.map(s => `<span class="badge-stance ${s}">${getIconForStance(s)} ${s}</span>`).join('')}
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

    const allStances = new Set();
    const authors = Array.from(player.author_takes_map.keys());
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.add(s)));
    const stances = Array.from(allStances);

    const isStarred = starredPlayers.has(player.canonical_key);
    const topTargetStr = player.raw_takes.find(t => t.tier_or_target_round)?.tier_or_target_round || '';
    const upsideSample = player.raw_takes.find(t => t.upside_metric)?.upside_metric || player.raw_takes[0]?.key_reason || '';
    const isCheckedForCompare = selectedForCompare.has(player.canonical_key);

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
            ${stances.map(s => `<span class="badge-stance ${s}">${getIconForStance(s)} ${s}</span>`).join('')}
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
        <span>${authors.join(', ')} (${player.raw_takes.length} takes)</span>
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

  // Open Consolidated Multi-Author Consensus Modal
  function openPlayerModal(player) {
    const isDraftedMe = myRosterPlayers.has(player.canonical_key);
    const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);
    const roundEst = player.sleeper_adp < 300 ? Math.ceil(player.sleeper_adp / 12) : '-';
    const pickEst = player.sleeper_adp < 300 ? ((player.sleeper_adp - 1) % 12) + 1 : '-';

    const authors = Array.from(player.author_takes_map.keys());
    const allStances = [];
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.push(s)));
    const primaryStance = getPrimaryStance(allStances);

    modalContent.innerHTML = `
      <div class="modal-header-main">
        <div class="modal-meta-bar" style="margin-bottom: 6px;">
          <span class="badge-pos ${player.position}">${escapeHtml(player.display_pos_rank || player.pos_rank)}</span>
          <span class="team-name" style="font-size: 1rem;">${escapeHtml(player.team)}</span>
          <span class="adp-tag">Sleeper ADP: #${player.sleeper_adp} (Rd ${roundEst}.${pickEst})</span>
          ${isDraftedMe ? '<span class="badge-stance Must-Draft">MY TEAM</span>' : ''}
          ${isDraftedOther ? '<span class="badge-stance Avoid">DRAFTED</span>' : ''}
        </div>
        <h2 class="modal-player-title">${escapeHtml(player.player_name)}</h2>
      </div>

      <!-- Consensus Overview Box -->
      <div style="background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.12)); border: 1px solid var(--border-glow); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-weight: 800; font-size: 0.85rem; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em;">🧠 FantasyPoints Consensus</span>
          <span class="badge-stance ${primaryStance}">${getIconForStance(primaryStance)} ${primaryStance}</span>
        </div>
        <p style="font-size: 0.85rem; color: #e2e8f0; line-height: 1.4;">
          Covered by <strong>${authors.join(', ')}</strong> across ${player.raw_takes.length} analytical takes.
        </p>
      </div>

      <!-- Consolidated Author Cards -->
      <div class="modal-takes-list">
        ${Array.from(player.author_takes_map.values()).map(auth => {
          const authStance = getPrimaryStance(Array.from(auth.stances));
          const targetStr = Array.from(auth.tiers).join(' / ') || 'Author Advice';

          return `
            <div class="modal-take-card">
              <div class="take-author-row">
                <span class="author-name">✍️ ${escapeHtml(auth.author)}</span>
                <span class="badge-stance ${authStance}">${getIconForStance(authStance)} ${authStance}</span>
              </div>

              <div class="take-section">
                <div class="take-label">🎯 Target / Round Advice</div>
                <div class="take-text" style="font-weight: 600; color: #38bdf8;">${escapeHtml(targetStr)}</div>
              </div>

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

  viewToggleBtn.addEventListener('click', () => {
    viewMode = viewMode === 'list' ? 'card' : 'list';
    localStorage.setItem('fp_view_mode', viewMode);
    updateViewToggleButtonState();
    renderPlayerBoard();
  });

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
    if (viewMode === 'list') {
      viewToggleBtn.querySelector('span').textContent = '📋 List';
    } else {
      viewToggleBtn.querySelector('span').textContent = '🃏 Card';
    }
  }

  function getPrimaryStanceForPlayer(player) {
    const allStances = [];
    player.author_takes_map.forEach(auth => auth.stances.forEach(s => allStances.push(s)));
    return getPrimaryStance(allStances);
  }

  function getPrimaryStance(stancesArr) {
    if (!stancesArr || stancesArr.length === 0) return 'Bullish';
    const hierarchy = ['Must-Draft', 'Breakout', 'Bullish', 'Sleeper', 'Bearish', 'Avoid'];
    for (const h of hierarchy) {
      if (stancesArr.includes(h)) return h;
    }
    return stancesArr[0];
  }

  function getIconForStance(stance) {
    switch (stance) {
      case 'Must-Draft': return '🔥';
      case 'Bullish': return '📈';
      case 'Breakout': return '⚡';
      case 'Sleeper': return '💎';
      case 'Avoid':
      case 'Bearish': return '🛑';
      default: return '📌';
    }
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
