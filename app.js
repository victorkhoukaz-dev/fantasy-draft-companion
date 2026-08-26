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
  let currentAuthorFilter = localStorage.getItem('fp_rank_source') || 'Consensus';
  let searchQuery = '';
  const savedSort = localStorage.getItem('fp_sort_by');
  let sortBy = (savedSort === 'pos_rank' || savedSort === 'adp') ? savedSort : 'pos_rank';
  let isSidebarCollapsed = localStorage.getItem('fp_sidebar_collapsed') === 'true';
  let hideTakenPlayers = localStorage.getItem('fp_hide_taken') === 'true';

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
  const hideTakenToggleBtn = document.getElementById('hideTakenToggleBtn');
  const resetDraftBtn = document.getElementById('resetDraftBtn');
  const posChips = document.querySelectorAll('.pos-chip[data-pos]');
  const activeCountEl = document.getElementById('activeCount');
  const totalCountEl = document.getElementById('totalCount');
  const starredCountEl = document.getElementById('starredCount');
  const rosterCountBadge = document.getElementById('rosterCountBadge');
  const sleeperStatusBadge = document.getElementById('sleeperStatusBadge');
  
  // Tabular Column Headers
  const thRank = document.getElementById('thRank');
  const thAdp = document.getElementById('thAdp');
  const rankSortIndicator = document.getElementById('rankSortIndicator');
  const adpSortIndicator = document.getElementById('adpSortIndicator');
  
  // Right Sidebar Elements
  const rosterSidebar = document.getElementById('rosterSidebar');
  const toggleRosterSidebarBtn = document.getElementById('toggleRosterSidebarBtn');
  const closeSidebarBtn = document.getElementById('closeSidebarBtn');
  const sidebarRosterList = document.getElementById('sidebarRosterList');
  const byeWarningArea = document.getElementById('byeWarningArea');

  // Modals
  const playerModal = document.getElementById('playerModal');
  const modalContent = document.getElementById('modalContent');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // Draft Sync DOM Elements
  const openDraftSyncBtn = document.getElementById('openDraftSyncBtn');
  const quickForceSyncBtn = document.getElementById('quickForceSyncBtn');
  const draftSyncIcon = document.getElementById('draftSyncIcon');
  const draftSyncLabel = document.getElementById('draftSyncLabel');
  const draftSyncModal = document.getElementById('draftSyncModal');
  const draftSyncCloseBtn = document.getElementById('draftSyncCloseBtn');
  const draftUrlInput = document.getElementById('draftUrlInput');
  const connectDraftBtn = document.getElementById('connectDraftBtn');
  const draftActiveSection = document.getElementById('draftActiveSection');
  const draftInfoBanner = document.getElementById('draftInfoBanner');
  const myDraftSlotSelect = document.getElementById('myDraftSlotSelect');
  const toggleSyncPollingBtn = document.getElementById('toggleSyncPollingBtn');
  const modalForceSyncBtn = document.getElementById('modalForceSyncBtn');
  const disconnectDraftBtn = document.getElementById('disconnectDraftBtn');
  const draftSyncStatusMsg = document.getElementById('draftSyncStatusMsg');

  // Draft Sync State
  let activeDraftId = localStorage.getItem('fp_draft_id') || null;
  let myDraftSlot = parseInt(localStorage.getItem('fp_draft_slot'), 10) || null;
  let draftSyncInterval = null;
  let isDraftSyncActive = false;
  let lastSyncedPicksCount = -1;
  let draftUsersMap = new Map();
  let draftMetaObj = null;

  // Initialize UI Controls
  if (authorFilterSelect) {
    authorFilterSelect.value = currentAuthorFilter;
    authorFilterSelect.addEventListener('change', (e) => {
      currentAuthorFilter = e.target.value;
      localStorage.setItem('fp_rank_source', currentAuthorFilter);
      sortBy = 'pos_rank';
      localStorage.setItem('fp_sort_by', 'pos_rank');
      renderPlayerBoard();
    });
  }
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

      const sortedPlayers = Object.values(players)
        .filter(p => p && p.full_name && p.position)
        .map(p => {
          const realAdp = (adpByPlayerId.has(p.player_id)) ? adpByPlayerId.get(p.player_id) : (p.search_rank || 300);
          return {
            player: p,
            exact_adp: Number(realAdp),
            pos: p.position
          };
        })
        .filter(item => item.exact_adp < 500)
        .sort((a, b) => a.exact_adp - b.exact_adp);

      const posCounters = { QB: 0, RB: 0, WR: 0, TE: 0 };

      sortedPlayers.forEach((item, index) => {
        const p = item.player;
        const norm = getCanonicalNameKey(p.full_name);
        const pos = item.pos || 'FLEX';

        if (posCounters[pos] !== undefined) {
          posCounters[pos]++;
        }

        const overallRank = index + 1;
        const posNum = posCounters[pos] || 99;
        const posRank = posCounters[pos] ? `${pos}${posCounters[pos]}` : pos;

        sleeperAdpMap.set(norm, {
          adp: overallRank,
          exact_adp: item.exact_adp,
          position: pos,
          team: p.team || 'NFL',
          full_name: p.full_name,
          pos_rank: posRank,
          pos_num: posNum
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

  // Helper: Parse, split, and normalize author names into single individual analysts
  function getCleanAuthorsList(authorRaw) {
    if (!authorRaw || typeof authorRaw !== 'string') return ['FantasyPoints Staff'];
    let cleaned = String(authorRaw)
      .replace(/FPTS Staff/gi, 'FantasyPoints Staff')
      .replace(/\s+and\s+/gi, ', ')
      .replace(/\s+&\s+/gi, ', ');
    
    const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
    const result = new Set();

    parts.forEach(p => {
      const lower = p.toLowerCase();
      if (lower.includes('barrett')) result.add('Scott Barrett');
      else if (lower.includes('hansen')) result.add('John Hansen');
      else if (lower.includes('heath')) result.add('Ryan Heath');
      else if (lower.includes('barfield')) result.add('Graham Barfield');
      else if (lower.includes('fpts') || lower.includes('fantasypoints')) result.add('FantasyPoints Staff');
      else if (p.length > 2) result.add(p);
    });

    return result.size > 0 ? Array.from(result) : ['FantasyPoints Staff'];
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
          raw_takes: [],
          author_takes_map: new Map(),
          author_pos_ranks: new Map()
        });
      }

      const playerObj = groupedPlayersMap.get(canonicalKey);
      playerObj.raw_takes.push(take);

      // Store author positional rank if present (used for sorting & row badges)
      if (take.fp_pos_rank) {
        const numMatch = String(take.fp_pos_rank).match(/\d+/);
        const posNum = numMatch ? parseInt(numMatch[0], 10) : 99;
        const authorList = getCleanAuthorsList(take.author);
        authorList.forEach(authorName => {
          playerObj.author_pos_ranks.set(authorName, {
            pos_rank: take.fp_pos_rank,
            pos_num: posNum
          });
          if (authorName === 'FantasyPoints Staff' || take.is_official_ranking || !playerObj.fp_pos_num) {
            playerObj.fp_pos_rank = take.fp_pos_rank;
            playerObj.fp_pos_num = posNum;
          }
        });
      }

      if (take.fp_overall_rank && (!playerObj.fp_overall_rank || take.author === 'FantasyPoints Staff')) {
        playerObj.fp_overall_rank = take.fp_overall_rank;
      }

      // Check if take is a generic CSV ranking entry (no written commentary)
      const isGenericCsvRank = take.is_official_ranking && 
        (!take.stance || take.stance === 'Bullish') && 
        (!take.key_reason || take.key_reason.startsWith('Official '));
      
      const isFlagshipStance = ['Exodia', 'Hansen 50', 'Hansen-50', 'Dirty Thirty', 'Dirty-Thirty'].includes(take.stance);

      // Only add to author_takes_map if it's a real article take OR a flagship stance!
      if (!isGenericCsvRank || isFlagshipStance) {
        const authorList = getCleanAuthorsList(take.author);

        authorList.forEach(author => {
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
          if (take.key_reason && !take.key_reason.startsWith('Official ') && !authorConsolidated.reasons.includes(take.key_reason)) {
            authorConsolidated.reasons.push(take.key_reason);
          }
          if (take.upside_metric && !take.upside_metric.startsWith('Official ') && !authorConsolidated.upside_metrics.includes(take.upside_metric)) {
            authorConsolidated.upside_metrics.push(take.upside_metric);
          }
          if (take.risk_factor && !authorConsolidated.risk_factors.includes(take.risk_factor)) {
            authorConsolidated.risk_factors.push(take.risk_factor);
          }
        });
      }
    });

    if (authorFilterSelect) {
      const selected = localStorage.getItem('fp_rank_source') || 'Consensus';
      authorFilterSelect.innerHTML = `
        <option value="Consensus">🏆 Consensus Rankings</option>
        <option value="John Hansen">John Hansen</option>
        <option value="Scott Barrett">Scott Barrett</option>
        <option value="Graham Barfield">Graham Barfield</option>
      `;
      authorFilterSelect.value = selected;
    }

    groupedPlayersMap.forEach(p => {
      p.display_pos_rank = p.fp_pos_rank || p.pos_rank;
      if (!p.fp_pos_num) {
        p.fp_pos_num = p.pos_num || 999;
      }
    });
  }

  // Render Player Board & Sidebar Panel
  function renderPlayerBoard() {

    playerGrid.innerHTML = '';
    playerGrid.className = 'player-list-view';

    let playersArray = Array.from(groupedPlayersMap.values());

    // Position or On Deck Filter
    if (currentPosFilter === 'DECK') {
      playersArray = playersArray.filter(p => starredPlayers.has(p.canonical_key));
    } else if (currentPosFilter !== 'ALL') {
      playersArray = playersArray.filter(p => p.position === currentPosFilter);
    }

    // Update Hide Taken Toggle Button State
    if (hideTakenToggleBtn) {
      if (hideTakenPlayers) {
        hideTakenToggleBtn.classList.add('active');
        hideTakenToggleBtn.innerHTML = '🚫 Taken: Hidden';
        hideTakenToggleBtn.style.background = 'rgba(244, 63, 94, 0.2)';
        hideTakenToggleBtn.style.borderColor = 'rgba(244, 63, 94, 0.5)';
        hideTakenToggleBtn.style.color = '#fda4af';
      } else {
        hideTakenToggleBtn.classList.remove('active');
        hideTakenToggleBtn.innerHTML = '👁️ Hide Taken';
        hideTakenToggleBtn.style.background = '';
        hideTakenToggleBtn.style.borderColor = '';
        hideTakenToggleBtn.style.color = '';
      }
    }

    // Hide Taken / Drafted Players Filter
    if (hideTakenPlayers) {
      playersArray = playersArray.filter(p => !otherDraftedPlayers.has(p.canonical_key) && !myRosterPlayers.has(p.canonical_key));
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

    // Update Rank Source Dropdown State (Disable other authors on ALL / DECK tabs)
    const isGlobalView = (currentPosFilter === 'ALL' || currentPosFilter === 'DECK');
    if (authorFilterSelect) {
      Array.from(authorFilterSelect.options).forEach(opt => {
        if (opt.value !== 'Consensus') {
          opt.disabled = isGlobalView;
        }
      });
      if (isGlobalView) {
        authorFilterSelect.value = 'Consensus';
        currentAuthorFilter = 'Consensus';
      }
    }

    // Context-Aware Positional Sorting (Pure Numerical Rank or ADP)
    playersArray.sort((a, b) => {
      if (sortBy === 'pos_rank' || sortBy === 'rank') {
        if (isGlobalView) {
          const rankA = a.fp_overall_rank || 999;
          const rankB = b.fp_overall_rank || 999;
          if (rankA !== rankB) return rankA - rankB;
          return a.sleeper_adp - b.sleeper_adp;
        }

        const isAnalyst = (currentAuthorFilter && currentAuthorFilter !== 'Consensus' && currentAuthorFilter !== 'ALL');
        const rankA = (isAnalyst ? a.author_pos_ranks?.get(currentAuthorFilter)?.pos_num : null) || a.fp_pos_num || 999;
        const rankB = (isAnalyst ? b.author_pos_ranks?.get(currentAuthorFilter)?.pos_num : null) || b.fp_pos_num || 999;

        if (rankA !== rankB) return rankA - rankB;
        return a.sleeper_adp - b.sleeper_adp;
      }
      return a.sleeper_adp - b.sleeper_adp;
    });

    // Update Table Header Sort Indicators
    if (thRank && rankSortIndicator && thAdp && adpSortIndicator) {
      if (sortBy === 'pos_rank' || sortBy === 'rank') {
        thRank.classList.add('active-sort');
        thAdp.classList.remove('active-sort');
        rankSortIndicator.textContent = '▼';
        adpSortIndicator.textContent = '↕';
      } else if (sortBy === 'adp') {
        thAdp.classList.add('active-sort');
        thRank.classList.remove('active-sort');
        adpSortIndicator.textContent = '▲';
        rankSortIndicator.textContent = '↕';
      } else {
        thRank.classList.remove('active-sort');
        thAdp.classList.remove('active-sort');
        rankSortIndicator.textContent = '↕';
        adpSortIndicator.textContent = '↕';
      }
    }

    let visibleCount = 0;

    playersArray.forEach((player) => {
      const isDraftedMe = myRosterPlayers.has(player.canonical_key);
      const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);

      visibleCount++;

      const row = createCompactPlayerRow(player, isDraftedMe, isDraftedOther);
      playerGrid.appendChild(row);
    });

    renderRosterSidebarContent();
    updateHeaderCounts();

    if (visibleCount === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  }

  // Helper: Deduplicate near-identical sentences & filter out AI junk phrases
  function dedupeAndCondenseList(rawList, maxItems = 3) {
    if (!rawList || !Array.isArray(rawList) || rawList.length === 0) return [];

    const junkPhrases = [
      'none explicit', 'none mentioned', 'no major risk', 'no specific risk', 
      'n/a', 'official scott barrett', 'official john hansen', 'none listed',
      'none noted', 'not specified', 'no risk mentioned', 'none'
    ];

    const cleaned = [];

    rawList.forEach(rawItem => {
      if (!rawItem || typeof rawItem !== 'string') return;
      let text = rawItem.trim();
      const lower = text.toLowerCase();

      // Skip generic AI filler
      if (junkPhrases.some(junk => lower === junk || lower.startsWith(junk))) return;
      if (text.length < 5) return;

      // Extract key significant words for overlap check (ignoring common stop words)
      const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
      
      let isDuplicate = false;
      for (const existing of cleaned) {
        const existingLower = existing.toLowerCase();
        // Check direct substring inclusion
        if (existingLower.includes(lower) || lower.includes(existingLower)) {
          isDuplicate = true;
          break;
        }

        // Check word overlap ratio (Jaccard similarity threshold ~0.55)
        const existingWords = existingLower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
        if (words.length > 2 && existingWords.length > 2) {
          const matchCount = words.filter(w => existingWords.includes(w)).length;
          const similarity = matchCount / Math.min(words.length, existingWords.length);
          if (similarity >= 0.55) {
            isDuplicate = true;
            // Prefer the longer/more informative sentence if concise
            if (text.length > existing.length && text.length < 180) {
              const idx = cleaned.indexOf(existing);
              cleaned[idx] = text;
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        cleaned.push(text);
      }
    });

    return cleaned.slice(0, maxItems);
  }

  // Helper: Consolidate & Clean Target Round Advice
  function consolidateTargetRoundAdvice(rawList) {
    if (!rawList || rawList.length === 0) return '';

    const cleaned = [];
    rawList.forEach(rawStr => {
      if (!rawStr) return;
      let str = rawStr
        .replace(/tier\s*\d+/gi, '')
        .replace(/\(adp\s*[^)]*\)/gi, '')
        .replace(/adp\s*[a-z0-9-]+/gi, '')
        .replace(/\(qb\d+\)/gi, '')
        .replace(/\(rb\d+\)/gi, '')
        .replace(/\(wr\d+\)/gi, '')
        .replace(/\(te\d+\)/gi, '')
        .replace(/exodia\s*/gi, '')
        .replace(/\s*\/\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (str && str.length > 2 && !cleaned.some(c => c.toLowerCase() === str.toLowerCase() || str.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(str.toLowerCase()))) {
        cleaned.push(str);
      }
    });

    return cleaned.slice(0, 2).join(' / ');
  }

  // Helper: Format 12-Team Draft Round & Pick
  function format12TeamAdpDisplay(rawAdp) {
    const rounded = Math.round(rawAdp);
    if (!rounded || rounded >= 300) return 'Undrafted';
    
    const round = Math.ceil(rounded / 12);
    const pickInRound = rounded % 12 === 0 ? 12 : rounded % 12;
    
    return `#${rounded} (Rd ${round}.${pickInRound})`;
  }

  // Helper: Evaluate Global Analyst Consensus & Conflicts (Written Articles Only)
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

    // Fallback: Scan text for keywords if stance wasn't explicitly extracted in JSON
    if (signature.length === 0 && player.raw_takes) {
      const fullText = player.raw_takes.map(t => `${t.key_reason || ''} ${t.target_round_advice || ''} ${t.tier_or_target_round || ''}`).join(' ').toLowerCase();
      if (fullText.includes('exodia') && !signature.includes('Exodia')) signature.push('Exodia');
      if ((fullText.includes('hansen 50') || fullText.includes('hansen50')) && !signature.includes('Hansen 50')) signature.push('Hansen 50');
      if ((fullText.includes('dirty thirty') || fullText.includes('dirty 30')) && !signature.includes('Dirty Thirty')) signature.push('Dirty Thirty');
    }

    return signature;
  }

  // Create Compact Tabular Row
  function createCompactPlayerRow(player, isDraftedMe, isDraftedOther) {
    const row = document.createElement('div');
    const isDrafted = isDraftedMe || isDraftedOther;

    let draftClass = '';
    if (isDraftedMe) draftClass = 'drafted-me';
    else if (isDraftedOther) draftClass = 'drafted-other';

    row.className = `player-row ${draftClass}`;
    row.setAttribute('data-player', player.canonical_key);

    const authors = Array.from(player.author_takes_map.keys());
    const isStarred = starredPlayers.has(player.canonical_key);
    const rawTargetList = player.raw_takes.map(t => t.target_round_advice || t.tier_or_target_round).filter(Boolean);
    const topTargetStr = consolidateTargetRoundAdvice(rawTargetList);
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

    // 1. Calculate Active Rank Badge (from selected analyst or consensus)
    const isSinglePosView = (currentPosFilter !== 'ALL' && currentPosFilter !== 'DECK');
    let displayedRank = '—';

    if (!isSinglePosView) {
      // In ALL or DECK view: display the Top-200 overall rank number!
      displayedRank = player.fp_overall_rank ? `${player.fp_overall_rank}` : '—';
    } else {
      // In Position views: display positional numerical rank!
      let rawRankStr = player.fp_pos_rank || player.pos_rank || '—';
      if (currentAuthorFilter && currentAuthorFilter !== 'Consensus' && currentAuthorFilter !== 'ALL') {
        const authPosObj = player.author_pos_ranks?.get(currentAuthorFilter);
        if (authPosObj && authPosObj.pos_rank) {
          rawRankStr = authPosObj.pos_rank;
        }
      }
      displayedRank = (rawRankStr !== '—') ? rawRankStr.replace(/^[A-Za-z]+/, '') : '—';
    }

    // 2. Format ADP Column
    let adpMain = '—';
    let adpSub = '';

    if (player.sleeper_adp && player.sleeper_adp < 300) {
      const overallAdp = player.sleeper_adp;
      const round = Math.ceil(overallAdp / 12);
      const pickInRound = Math.floor(((overallAdp - 1) % 12) + 1);

      if (isSinglePosView && player.pos_num) {
        // Show pure positional ADP number in position view (e.g. "1")
        adpMain = `${player.pos_num}`;
        adpSub = `#${overallAdp} (Rd ${round}.${pickInRound})`;
      } else {
        adpMain = `#${overallAdp}`;
        adpSub = `Rd ${round}.${pickInRound}`;
      }
    } else {
      adpMain = '300+';
      adpSub = 'Late';
    }

    const byeWeek = TEAM_BYE_WEEKS[player.team] ? `Bye ${TEAM_BYE_WEEKS[player.team]}` : '';

    row.innerHTML = `
      <!-- 1. ACTIONS COLUMN -->
      <div class="col-actions">
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
      </div>

      <!-- 2. RANK COLUMN -->
      <div class="col-rank">
        <span class="rank-num-badge">${escapeHtml(displayedRank)}</span>
      </div>

      <!-- 3. ADP COLUMN -->
      <div class="col-adp">
        <span class="adp-text">${adpMain}</span>
        <span class="adp-subtext">${adpSub}</span>
      </div>

      <!-- 4. PLAYER & TEAM COLUMN -->
      <div class="col-player">
        <div class="row-name-line">
          <span class="row-player-name ${isDraftedOther ? 'card-drafted-strike' : ''}">${escapeHtml(player.player_name)}</span>
          <span class="badge-pos ${player.position}">${player.position}</span>
        </div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 1px;">
          ${escapeHtml(player.team)}${byeWeek ? ` • ${byeWeek}` : ''}
        </div>
      </div>

      <!-- 5. ANALYST TAKES & STANCES COLUMN -->
      <div class="col-stances">
        <div class="stance-pills-compact">
          ${stancePills.join('')}
        </div>
        ${authors.length > 0 ? `<span class="author-approval-tag">✍️ ${authors.join(', ')}</span>` : ''}
        ${(topTargetStr && consensusInfo.type !== 'FADE') ? `<span class="tier-tag">🎯 ${escapeHtml(topTargetStr)}</span>` : ''}
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

    return row;
  }

  // Toggle Player Drafted for MY Team
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

  // Toggle Player Drafted for OTHER Team
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

  // Toggle Star / Pin Status
  function toggleStarStatus(canonicalKey) {
    if (starredPlayers.has(canonicalKey)) {
      starredPlayers.delete(canonicalKey);
    } else {
      starredPlayers.add(canonicalKey);
    }
    localStorage.setItem('fp_starred_players', JSON.stringify(Array.from(starredPlayers)));
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

  function updateSidebarVisibility() {
    if (isSidebarCollapsed) {
      rosterSidebar.classList.add('collapsed');
    } else {
      rosterSidebar.classList.remove('collapsed');
    }
  }

  function renderRosterSidebarContent() {
    sidebarRosterList.innerHTML = '';
    const myPlayersList = [];

    myRosterPlayers.forEach(key => {
      const p = groupedPlayersMap.get(key);
      if (p) myPlayersList.push(p);
    });

    if (myPlayersList.length === 0) {
      sidebarRosterList.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px 0;">
          No players drafted yet.<br>Click "ME" on player rows to build your roster!
        </div>
      `;
      if (byeWarningArea) byeWarningArea.style.display = 'none';
      return;
    }

    // Sort Roster by position (QB, RB, WR, TE)
    const posOrder = { QB: 1, RB: 2, WR: 3, TE: 4, FLEX: 5 };
    myPlayersList.sort((a, b) => (posOrder[a.position] || 99) - (posOrder[b.position] || 99));

    // Bye Weeks Analysis
    const byeMap = {};
    const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };

    myPlayersList.forEach(p => {
      posCounts[p.position] = (posCounts[p.position] || 0) + 1;
      const bye = TEAM_BYE_WEEKS[p.team];
      if (bye) {
        if (!byeMap[bye]) byeMap[bye] = [];
        byeMap[bye].push(p);
      }

      const item = document.createElement('div');
      item.className = 'roster-sidebar-item';
      item.innerHTML = `
        <div class="roster-item-info">
          <span class="badge-pos ${p.position}">${p.position}</span>
          <span class="roster-item-name">${escapeHtml(p.player_name)}</span>
          <span class="roster-item-team">${escapeHtml(p.team)}</span>
          ${bye ? `<span class="roster-item-bye">Bye ${bye}</span>` : ''}
        </div>
        <button class="btn-remove-roster" data-player="${escapeHtml(p.canonical_key)}" title="Remove from Roster">✕</button>
      `;

      item.querySelector('.btn-remove-roster').addEventListener('click', () => {
        toggleDraftForMe(p.canonical_key);
      });

      sidebarRosterList.appendChild(item);
    });

    // Check Bye Conflicts (3+ players on same bye week)
    let byeWarningHtml = '';
    Object.keys(byeMap).forEach(byeWeek => {
      if (byeMap[byeWeek].length >= 3) {
        const names = byeMap[byeWeek].map(p => p.player_name).join(', ');
        byeWarningHtml += `⚠️ Week ${byeWeek} Bye Conflict: ${byeMap[byeWeek].length} players (${names})<br>`;
      }
    });

    if (byeWarningHtml) {
      byeWarningArea.innerHTML = byeWarningHtml;
      byeWarningArea.style.display = 'block';
    } else {
      byeWarningArea.style.display = 'none';
    }
  }

  // Sidebar Controls
  if (toggleRosterSidebarBtn) {
    toggleRosterSidebarBtn.addEventListener('click', () => {
      isSidebarCollapsed = !isSidebarCollapsed;
      localStorage.setItem('fp_sidebar_collapsed', isSidebarCollapsed);
      updateSidebarVisibility();
    });
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      isSidebarCollapsed = true;
      localStorage.setItem('fp_sidebar_collapsed', 'true');
      updateSidebarVisibility();
    });
  }

  // Helper: Generate Smart AI Executive Consensus Synthesis (Ultra-Compact 1-Liner)
  function generateAiConsensusSummary(player) {
    if (player.ai_consensus_summary) return player.ai_consensus_summary;

    const consensusInfo = evaluatePlayerConsensus(player);
    const positiveSet = new Set(['Exodia', 'Hansen 50', 'Hansen-50', 'Must-Draft', 'Bullish', 'Breakout', 'Sleeper']);
    const negativeSet = new Set(['Dirty Thirty', 'Dirty-Thirty', 'Avoid', 'Bearish']);

    const positiveAuthors = [];
    const negativeAuthors = [];

    player.author_takes_map.forEach((authData, authName) => {
      const primaryStance = getPrimaryStance(Array.from(authData.stances));
      if (positiveSet.has(primaryStance)) {
        if (!positiveAuthors.includes(authName)) positiveAuthors.push(authName);
      } else if (negativeSet.has(primaryStance)) {
        if (!negativeAuthors.includes(authName)) negativeAuthors.push(authName);
      }
    });

    const reasons = [];
    player.author_takes_map.forEach(auth => {
      if (auth.reasons.length > 0) reasons.push(auth.reasons[0]);
    });

    const targetList = [];
    player.author_takes_map.forEach(auth => {
      const t = consolidateTargetRoundAdvice(Array.from(auth.tiers));
      if (t) targetList.push(t);
    });

    const mainReason = reasons.length > 0 ? reasons[0] : 'key analytical drivers';
    const mainTarget = (targetList.length > 0 && consensusInfo.type !== 'FADE') ? ` | Target: ${targetList[0]}` : '';

    if (consensusInfo.type === 'SPLIT') {
      const posStr = positiveAuthors.length > 0 ? positiveAuthors.join(' & ') : 'Some Analysts';
      const negStr = negativeAuthors.length > 0 ? negativeAuthors.join(' & ') : 'Other Analysts';
      return `Analyst Split: ${posStr} recommend Target/Must-Draft, but ${negStr} recommend Avoid — ${mainReason}${mainTarget}`;
    } else if (consensusInfo.type === 'FADE') {
      const negStr = negativeAuthors.length > 0 ? negativeAuthors.join(' & ') : Array.from(player.author_takes_map.keys()).join(' & ');
      return `Unanimous Avoid by ${negStr} — ${mainReason}`;
    } else if (consensusInfo.type === 'BULLISH') {
      const posStr = positiveAuthors.length > 0 ? positiveAuthors.join(' & ') : Array.from(player.author_takes_map.keys()).join(' & ');
      return `Consensus Target by ${posStr} — ${mainReason}${mainTarget}`;
    } else {
      if (player.author_pos_ranks && player.author_pos_ranks.size > 0) {
        const ranksStr = Array.from(player.author_pos_ranks.entries()).map(([auth, info]) => `${auth.split(' ')[0]}: ${info.pos_rank}`).join(', ');
        return `Official Ranks: ${ranksStr}. No written article commentary available.`;
      }
      return `No specific written article commentary available for this player.`;
    }
  }

  // Open Consolidated Multi-Author Consensus Modal
  function openPlayerModal(player) {
    const isDraftedMe = myRosterPlayers.has(player.canonical_key);
    const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);
    const adpDisplay = format12TeamAdpDisplay(player.sleeper_adp);

    const consensusInfo = evaluatePlayerConsensus(player);
    const aiSummaryText = generateAiConsensusSummary(player);
    const hasArticleTakes = player.author_takes_map.size > 0;

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

      <!-- Official Positional Ranks Box -->
      ${player.author_pos_ranks.size > 0 ? `
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <span style="font-weight: 700; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase;">📊 Official Positional Ranks</span>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${Array.from(player.author_pos_ranks.entries()).map(([auth, info]) => `
              <span class="badge-stance Bullish" style="font-size: 0.82rem; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3);">✍️ ${escapeHtml(auth)}: ${escapeHtml(info.pos_rank)}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- AI Executive Consensus Overview Box -->
      ${hasArticleTakes ? `
        <div style="${consensusInfo.boxStyle} border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 800; font-size: 0.85rem; color: ${consensusInfo.titleColor}; text-transform: uppercase; letter-spacing: 0.05em;">🤖 AI Executive Consensus</span>
            <span class="badge-stance ${consensusInfo.class}">${consensusInfo.modalTitle}</span>
          </div>
          <p style="font-size: 0.88rem; color: #f1f5f9; line-height: 1.45; font-weight: 500;">
            ${escapeHtml(aiSummaryText)}
          </p>
        </div>
      ` : `
        <div style="background: rgba(15, 23, 42, 0.4); border: 1px dashed rgba(255,255,255,0.1); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 16px; color: #94a3b8; font-size: 0.85rem;">
          ℹ️ No specific written article commentary available for this player. Positioned based on official rankings and Sleeper ADP.
        </div>
      `}

      <!-- Consolidated Author Cards -->
      ${hasArticleTakes ? `
        <div class="modal-takes-list">
          ${Array.from(player.author_takes_map.values()).map(auth => {
            const authStance = getPrimaryStance(Array.from(auth.stances));
            const targetStr = consolidateTargetRoundAdvice(Array.from(auth.tiers));
            const isNegativeStance = ['Avoid', 'Bearish', 'Dirty Thirty', 'Dirty-Thirty'].includes(authStance);

            return `
              <div class="modal-take-card">
                <div class="take-author-row">
                  <span class="author-name">✍️ ${escapeHtml(auth.author)}</span>
                  <span class="badge-stance ${authStance}">${getIconForStance(authStance)} ${authStance}</span>
                </div>

                ${targetStr ? `
                  <div class="take-section">
                    <div class="take-label">${isNegativeStance ? '📍 Draft Range' : '🎯 Target Round'}</div>
                    <div class="take-text" style="font-weight: 600; color: ${isNegativeStance ? '#f43f5e' : '#38bdf8'};">${escapeHtml(targetStr)}</div>
                  </div>
                ` : ''}

                ${(() => {
                  const cleanReasons = dedupeAndCondenseList(auth.reasons, 3);
                  if (cleanReasons.length === 0) return '';
                  return `
                    <div class="take-section">
                      <div class="take-label">📊 Key Analytical Reasons</div>
                      <ul style="padding-left: 18px; margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
                        ${cleanReasons.map(r => `<li class="take-text">${escapeHtml(r)}</li>`).join('')}
                      </ul>
                    </div>
                  `;
                })()}

                ${(() => {
                  const cleanUpsides = dedupeAndCondenseList(auth.upside_metrics, 3);
                  if (cleanUpsides.length === 0) return '';
                  return `
                    <div class="upside-box">
                      🚀 <strong>Upside Metrics:</strong>
                      <ul style="padding-left: 16px; margin-top: 2px;">
                        ${cleanUpsides.map(u => `<li>${escapeHtml(u)}</li>`).join('')}
                      </ul>
                    </div>
                  `;
                })()}

                ${(() => {
                  const cleanRisks = dedupeAndCondenseList(auth.risk_factors, 3);
                  if (cleanRisks.length === 0) return '';
                  return `
                    <div class="risk-box">
                      ⚠️ <strong>Risk Factors:</strong>
                      <ul style="padding-left: 16px; margin-top: 2px;">
                        ${cleanRisks.map(rf => `<li>${escapeHtml(rf)}</li>`).join('')}
                      </ul>
                    </div>
                  `;
                })()}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    playerModal.classList.add('open');
    playerModal.setAttribute('aria-hidden', 'false');
  }

  // Modal Handlers & Helpers
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (playerModal) {
        playerModal.classList.remove('open');
        playerModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  // Global ESC Key Listener to Close Modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      if (playerModal) {
        playerModal.classList.remove('open');
        playerModal.setAttribute('aria-hidden', 'true');
      }
      if (draftSyncModal) {
        draftSyncModal.classList.remove('open');
        draftSyncModal.setAttribute('aria-hidden', 'true');
      }
    }
  });

  if (playerModal) {
    playerModal.addEventListener('click', (e) => {
      if (e.target === playerModal) {
        playerModal.classList.remove('open');
        playerModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderPlayerBoard();
  });

  if (hideTakenToggleBtn) {
    hideTakenToggleBtn.addEventListener('click', () => {
      hideTakenPlayers = !hideTakenPlayers;
      localStorage.setItem('fp_hide_taken', hideTakenPlayers);
      renderPlayerBoard();
    });
  }

  if (thRank) {
    thRank.addEventListener('click', () => {
      sortBy = 'pos_rank';
      localStorage.setItem('fp_sort_by', sortBy);
      renderPlayerBoard();
    });
  }

  if (thAdp) {
    thAdp.addEventListener('click', () => {
      sortBy = 'adp';
      localStorage.setItem('fp_sort_by', sortBy);
      renderPlayerBoard();
    });
  }

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
      currentPosFilter = chip.getAttribute('data-pos') || 'ALL';
      renderPlayerBoard();
    });
  });

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

  // ==========================================
  // SLEEPER LIVE DRAFT PILOT & SYNC ENGINE
  // ==========================================

  function extractSleeperDraftId(input) {
    if (!input) return null;
    const trimmed = input.trim();
    const match = trimmed.match(/\b\d{16,20}\b/);
    return match ? match[0] : null;
  }

  function connectToSleeperDraft(draftId) {
    if (!draftId) return;
    if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = 'Connecting to Sleeper Draft...';

    // If switching to a brand new draft ID, reset previous picks so old mocks don't linger
    if (activeDraftId && activeDraftId !== draftId) {
      myRosterPlayers.clear();
      otherDraftedPlayers.clear();
      localStorage.removeItem('fp_my_roster');
      localStorage.removeItem('fp_other_drafted');
      lastSyncedPicksCount = -1;
      renderPlayerBoard();
    }

    Promise.all([
      fetch(`https://api.sleeper.app/v1/draft/${draftId}`).then(r => {
        if (!r.ok) throw new Error('Draft not found on Sleeper');
        return r.json();
      }),
      fetch(`https://api.sleeper.app/v1/draft/${draftId}/users`).then(r => r.ok ? r.json() : [])
    ])
    .then(([draft, users]) => {
      if (!draft || !draft.draft_id) throw new Error('Invalid draft response');
      draftMetaObj = draft;
      activeDraftId = draft.draft_id;
      localStorage.setItem('fp_draft_id', activeDraftId);

      draftUsersMap.clear();
      if (Array.isArray(users)) {
        users.forEach(u => {
          const name = u.metadata?.team_name || u.display_name || 'Team';
          draftUsersMap.set(u.user_id, name);
        });
      }

      // Populate draft slots dropdown
      const teamsCount = draft.settings?.teams || 12;
      const roundsCount = draft.settings?.rounds || 15;
      const draftOrder = draft.draft_order || {};

      if (myDraftSlotSelect) {
        myDraftSlotSelect.innerHTML = '<option value="">-- Choose Your Draft Slot / Team --</option>';
        for (let slot = 1; slot <= teamsCount; slot++) {
          let slotOwnerName = `Team Slot ${slot}`;
          for (const [userId, assignedSlot] of Object.entries(draftOrder)) {
            if (assignedSlot === slot) {
              const userName = draftUsersMap.get(userId) || 'User';
              slotOwnerName = `Slot ${slot}: ${userName}`;
              break;
            }
          }
          const opt = document.createElement('option');
          opt.value = slot;
          opt.textContent = slotOwnerName;
          if (myDraftSlot && myDraftSlot === slot) opt.selected = true;
          myDraftSlotSelect.appendChild(opt);
        }
      }

      if (draftInfoBanner) {
        draftInfoBanner.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong>🏈 Draft: ${escapeHtml(draft.metadata?.name || 'Sleeper Draft')}</strong>
            <span class="badge-pos QB" style="text-transform: uppercase;">${draft.status || 'Active'}</span>
          </div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">
            Format: <strong>${draft.type || 'Snake'}</strong> | Teams: <strong>${teamsCount}</strong> | Rounds: <strong>${roundsCount}</strong>
          </div>
        `;
      }

      if (draftActiveSection) draftActiveSection.style.display = 'block';
      if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = '✅ Connected! Auto-syncing live picks.';

      startDraftSyncPolling();
    })
    .catch(err => {
      console.error('Sleeper draft connection error:', err);
      if (draftSyncStatusMsg) {
        draftSyncStatusMsg.innerHTML = `<span style="color: #f43f5e;">⚠️ Error: ${escapeHtml(err.message || 'Could not connect to draft')}</span>`;
      }
    });
  }

  function startDraftSyncPolling() {
    if (!activeDraftId) return;
    if (draftSyncInterval) clearInterval(draftSyncInterval);

    isDraftSyncActive = true;
    updateDraftSyncBadgeUI();
    pollDraftPicks();

    // Fast 1.2s polling for real-time responsiveness
    draftSyncInterval = setInterval(pollDraftPicks, 1200);
  }

  function pollDraftPicks() {
    if (!activeDraftId || !isDraftSyncActive) return Promise.resolve();

    return fetch(`https://api.sleeper.app/v1/draft/${activeDraftId}/picks?t=` + Date.now())
      .then(r => r.ok ? r.json() : [])
      .then(picks => {
        if (!Array.isArray(picks)) return;

        let hasNewPicks = (picks.length !== lastSyncedPicksCount);
        lastSyncedPicksCount = picks.length;

        picks.forEach(pick => {
          const playerName = pick.metadata?.full_name || (pick.metadata?.first_name + ' ' + pick.metadata?.last_name) || '';
          const canonicalKey = getCanonicalNameKey(playerName);
          if (!canonicalKey) return;

          // Register player in groupedPlayersMap if not present yet (ensures DEF, K, or rookies show up in My Roster)
          if (!groupedPlayersMap.has(canonicalKey)) {
            groupedPlayersMap.set(canonicalKey, {
              canonical_key: canonicalKey,
              player_name: playerName,
              position: pick.metadata?.position || 'FLEX',
              team: pick.metadata?.team || 'NFL',
              sleeper_adp: 999,
              pos_rank: '—',
              pos_num: 99,
              raw_takes: [],
              author_takes_map: new Map(),
              author_pos_ranks: new Map()
            });
          }

          // Robust check for user's draft slot
          const slotMatch = (myDraftSlot !== null && myDraftSlot !== undefined && Number(pick.draft_slot) === Number(myDraftSlot));
          const userMatch = (myDraftSlot !== null && myDraftSlot !== undefined && draftMetaObj?.draft_order && Number(draftMetaObj.draft_order[pick.picked_by]) === Number(myDraftSlot));
          const isMyPick = Boolean(slotMatch || userMatch);

          if (isMyPick) {
            if (!myRosterPlayers.has(canonicalKey)) {
              myRosterPlayers.add(canonicalKey);
              otherDraftedPlayers.delete(canonicalKey);
              hasNewPicks = true;
            }
          } else {
            if (!otherDraftedPlayers.has(canonicalKey)) {
              otherDraftedPlayers.add(canonicalKey);
              myRosterPlayers.delete(canonicalKey);
              hasNewPicks = true;
            }
          }
        });

        if (hasNewPicks) {
          localStorage.setItem('fp_my_roster', JSON.stringify(Array.from(myRosterPlayers)));
          localStorage.setItem('fp_other_drafted', JSON.stringify(Array.from(otherDraftedPlayers)));
          renderPlayerBoard();
        }

        const teams = draftMetaObj?.settings?.teams || 12;
        const currentPickNo = picks.length + 1;
        const currentRound = Math.ceil(currentPickNo / teams);
        const pickInRound = currentPickNo % teams === 0 ? teams : currentPickNo % teams;

        updateDraftSyncBadgeUI(currentRound, pickInRound, picks.length);
      })
      .catch(err => {
        console.warn('Draft sync polling warning:', err);
      });
  }

  function triggerForceRefresh() {
    if (!activeDraftId) return;

    // Spin 🔄 animation targets
    document.querySelectorAll('.sync-spin-target').forEach(el => el.classList.add('spin-icon'));
    if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = '🔄 Fetching latest picks from Sleeper...';

    pollDraftPicks()
      .then(() => {
        setTimeout(() => {
          document.querySelectorAll('.sync-spin-target').forEach(el => el.classList.remove('spin-icon'));
          if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = '✅ Picks synced successfully!';
        }, 300);
      })
      .catch(() => {
        document.querySelectorAll('.sync-spin-target').forEach(el => el.classList.remove('spin-icon'));
      });
  }

  function updateDraftSyncBadgeUI(round, pickInRound, totalPicks) {
    if (!openDraftSyncBtn || !draftSyncIcon || !draftSyncLabel) return;

    if (isDraftSyncActive && activeDraftId) {
      openDraftSyncBtn.classList.add('syncing');
      draftSyncIcon.textContent = '🟢';
      if (round && totalPicks !== undefined) {
        draftSyncLabel.textContent = `Sync: Rd ${round}.${pickInRound} (#${totalPicks})`;
      } else {
        draftSyncLabel.textContent = `Sync: Live`;
      }
      if (quickForceSyncBtn) quickForceSyncBtn.style.display = 'inline-flex';
      if (toggleSyncPollingBtn) {
        toggleSyncPollingBtn.textContent = '🟢 Active: Auto-Syncing Picks';
        toggleSyncPollingBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      }
    } else {
      openDraftSyncBtn.classList.remove('syncing');
      draftSyncIcon.textContent = '⚡';
      draftSyncLabel.textContent = `Sync Draft`;
      if (quickForceSyncBtn) quickForceSyncBtn.style.display = 'none';
      if (toggleSyncPollingBtn) {
        toggleSyncPollingBtn.textContent = '⏸️ Paused: Click to Resume Sync';
        toggleSyncPollingBtn.style.background = 'rgba(255,255,255,0.1)';
      }
    }
  }

  function disconnectDraftSync() {
    if (draftSyncInterval) clearInterval(draftSyncInterval);
    activeDraftId = null;
    myDraftSlot = null;
    isDraftSyncActive = false;
    lastSyncedPicksCount = -1;
    localStorage.removeItem('fp_draft_id');
    localStorage.removeItem('fp_draft_slot');

    if (draftActiveSection) draftActiveSection.style.display = 'none';
    if (draftUrlInput) draftUrlInput.value = '';
    if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = 'Draft disconnected.';
    updateDraftSyncBadgeUI();
  }

  // Draft Sync Modal & Button Event Listeners
  if (openDraftSyncBtn) {
    openDraftSyncBtn.addEventListener('click', () => {
      if (draftSyncModal) {
        draftSyncModal.classList.add('open');
        draftSyncModal.setAttribute('aria-hidden', 'false');
        if (activeDraftId && draftUrlInput) {
          draftUrlInput.value = activeDraftId;
        }
      }
    });
  }

  if (quickForceSyncBtn) {
    quickForceSyncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerForceRefresh();
    });
  }

  if (modalForceSyncBtn) {
    modalForceSyncBtn.addEventListener('click', () => {
      triggerForceRefresh();
    });
  }

  if (draftSyncCloseBtn) {
    draftSyncCloseBtn.addEventListener('click', () => {
      if (draftSyncModal) {
        draftSyncModal.classList.remove('open');
        draftSyncModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  if (connectDraftBtn) {
    connectDraftBtn.addEventListener('click', () => {
      const rawInput = draftUrlInput?.value || '';
      const extractedId = extractSleeperDraftId(rawInput);
      if (!extractedId) {
        if (draftSyncStatusMsg) {
          draftSyncStatusMsg.innerHTML = '<span style="color: #f43f5e;">⚠️ Invalid Draft URL or ID. Please check the link.</span>';
        }
        return;
      }
      connectToSleeperDraft(extractedId);
    });
  }

  if (myDraftSlotSelect) {
    myDraftSlotSelect.addEventListener('change', (e) => {
      const slotVal = parseInt(e.target.value, 10);
      myDraftSlot = slotVal || null;
      if (myDraftSlot) {
        localStorage.setItem('fp_draft_slot', myDraftSlot);
        if (draftSyncStatusMsg) {
          draftSyncStatusMsg.innerHTML = `✅ Saved! Tracking <strong>Slot ${myDraftSlot}</strong> as YOUR team.`;
        }
        // Force re-poll immediately to update my picks
        pollDraftPicks();
      } else {
        localStorage.removeItem('fp_draft_slot');
      }
    });
  }

  if (toggleSyncPollingBtn) {
    toggleSyncPollingBtn.addEventListener('click', () => {
      if (isDraftSyncActive) {
        isDraftSyncActive = false;
        if (draftSyncInterval) clearInterval(draftSyncInterval);
        updateDraftSyncBadgeUI();
        if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = '⏸️ Draft sync paused.';
      } else {
        startDraftSyncPolling();
        if (draftSyncStatusMsg) draftSyncStatusMsg.textContent = '🟢 Draft sync resumed.';
      }
    });
  }

  if (disconnectDraftBtn) {
    disconnectDraftBtn.addEventListener('click', () => {
      if (confirm('Disconnect from this Sleeper draft?')) {
        disconnectDraftSync();
      }
    });
  }

  // Auto-Resume Active Draft Connection on page load
  if (activeDraftId) {
    connectToSleeperDraft(activeDraftId);
  }

  // Unregister Service Worker to prevent caching issues
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }
});
