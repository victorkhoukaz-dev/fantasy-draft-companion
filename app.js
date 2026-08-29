// Fantasy Football Draft Companion PWA - Production Edition
document.addEventListener('DOMContentLoaded', () => {
  // Platform & Mode State
  let currentPlatformMode = localStorage.getItem('fp_platform_mode') || 'redraft';
  let rawTakesData = [];
  let groupedPlayersMap = new Map(); // canonical_name -> player object
  let sleeperAdpMap = new Map(); // normalized_name -> { adp, exact_adp, position, team, full_name, pos_rank, pos_num }
  let underdogAdpMap = new Map(); // normalized_name -> { adp, exact_adp, position, team, full_name, pos_rank, pos_num, bye_week }
  
  function getStorageKey(key) {
    return currentPlatformMode === 'underdog' ? `${key}_underdog` : key;
  }

  let myRosterPlayers = new Set();
  let otherDraftedPlayers = new Set();
  let starredPlayers = new Set();
  let selectedForCompare = new Set(); // max 3 player_names
  
  function loadDraftState() {
    myRosterPlayers = new Set(JSON.parse(localStorage.getItem(getStorageKey('fp_my_roster')) || '[]'));
    otherDraftedPlayers = new Set(JSON.parse(localStorage.getItem(getStorageKey('fp_other_drafted')) || '[]'));
    starredPlayers = new Set(JSON.parse(localStorage.getItem(getStorageKey('fp_starred_players')) || '[]'));
  }
  loadDraftState();

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
    'rstevenson': 'rhamondrestevenson',
    'kenwalker': 'kennethwalker',
    'kennethwalkeriii': 'kennethwalker',
    'jcroskeymerritt': 'jacorycroskeymerritt',
    'croskeymerritt': 'jacorycroskeymerritt',
    'jonathonbrooks': 'jonathanbrooks',
    'lutherburdeniii': 'lutherburden',
    'marvinharrisonjr': 'marvinharrison',
    'brianrobinsonjr': 'brianrobinson',
    'gabedavis': 'gabrieldavis',
    'mitchtrubisky': 'mitchelltrubisky',
    'travisetiennejr': 'travisetienne',
    'michaelwilsonjr': 'michaelwilson',
    'jamescookiii': 'jamescook',
    'brianthomasjr': 'brianthomas',
    'tyronetracyjr': 'tyronetracy',
    'michaelpittmanjr': 'michaelpittman',
    'chrisgodwinjr': 'chrisgodwin',
    'chrisrodriguezjr': 'chrisrodriguez',
    'deebosamuelsr': 'deebosamuel',
    'aaronjonessr': 'aaronjones',
    'kylepittssr': 'kylepitts',
    'orondegadsdenii': 'orondegadsden'
  };

  // DOM Elements
  const btnModeRedraft = document.getElementById('btnModeRedraft');
  const btnModeUnderdog = document.getElementById('btnModeUnderdog');
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

  // AI Advisor DOM Elements
  const toggleAiAdvisorBtn = document.getElementById('toggleAiAdvisorBtn');
  const openAiSettingsBtn = document.getElementById('openAiSettingsBtn');
  const aiAdvisorHud = document.getElementById('aiAdvisorHud');
  const aiTurnBadge = document.getElementById('aiTurnBadge');
  const aiTurnIcon = document.getElementById('aiTurnIcon');
  const aiTurnText = document.getElementById('aiTurnText');
  const aiNextTurnDistance = document.getElementById('aiNextTurnDistance');
  const aiNextTurnText = document.getElementById('aiNextTurnText');
  const aiDeepReasonBtn = document.getElementById('aiDeepReasonBtn');
  const aiRefreshBtn = document.getElementById('aiRefreshBtn');
  const aiMinimizeBtn = document.getElementById('aiMinimizeBtn');
  const aiMinimizeIcon = document.getElementById('aiMinimizeIcon');
  const aiHudBody = document.getElementById('aiHudBody');

  // AI Settings Modal DOM Elements
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  const aiSettingsCloseBtn = document.getElementById('aiSettingsCloseBtn');
  const aiProviderSelect = document.getElementById('aiProviderSelect');
  const groqKeyGroup = document.getElementById('groqKeyGroup');
  const geminiKeyGroup = document.getElementById('geminiKeyGroup');
  const groqApiKeyInput = document.getElementById('groqApiKeyInput');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const aiModelSelect = document.getElementById('aiModelSelect');
  const customModelGroup = document.getElementById('customModelGroup');
  const aiCustomModelInput = document.getElementById('aiCustomModelInput');
  const aiStrategyModeSelect = document.getElementById('aiStrategyModeSelect');
  const aiAutoTriggerCheck = document.getElementById('aiAutoTriggerCheck');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');
  const aiSettingsStatusMsg = document.getElementById('aiSettingsStatusMsg');

  // AI Advisor State
  let aiProvider = localStorage.getItem('fp_ai_provider') || 'groq';
  let groqApiKey = localStorage.getItem('fp_groq_api_key') || '';
  let geminiApiKey = localStorage.getItem('fp_gemini_api_key') || '';
  let aiModel = localStorage.getItem('fp_ai_model') || (aiProvider === 'groq' ? 'qwen/qwen3.8-27b' : 'gemini-2.5-flash');
  let aiStrategyMode = localStorage.getItem('fp_ai_strategy') || 'balanced';
  let isAiAutoTrigger = localStorage.getItem('fp_ai_auto_trigger') !== 'false';
  let isAiAdvisorVisible = localStorage.getItem('fp_ai_advisor_visible') !== 'false';
  let isAiHudCollapsed = localStorage.getItem('fp_ai_hud_collapsed') === 'true';
  let currentAiAdvice = null;
  let isAiGenerating = false;
  let lastEvaluatedTurnKey = '';
  let passedSuggestionsSet = new Set();

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

  // Wire Platform Mode Switchers
  const modeSwitcherContainer = document.getElementById('platformModeSwitcher');
  if (modeSwitcherContainer) {
    modeSwitcherContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-switch-btn');
      if (btn) {
        const targetMode = btn.getAttribute('data-mode');
        if (targetMode && targetMode !== currentPlatformMode) {
          console.log('Switching platform mode to:', targetMode);
          loadPlatformData(targetMode);
        }
      }
    });
  }

  if (btnModeRedraft) {
    btnModeRedraft.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPlatformMode !== 'redraft') {
        loadPlatformData('redraft');
      }
    });
  }
  if (btnModeUnderdog) {
    btnModeUnderdog.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPlatformMode !== 'underdog') {
        loadPlatformData('underdog');
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.switchDraftPlatform = function(mode) {
      if (mode && mode !== currentPlatformMode) {
        loadPlatformData(mode);
      }
    };
  }

  updateSidebarVisibility();
  updateHeaderCounts();

  // Load Platform Data on Startup
  loadPlatformData(currentPlatformMode);

  // Fetch Underdog ADP Dataset
  function fetchUnderdogAdp() {
    return fetch('underdog_adp.json?t=' + Date.now())
      .then(res => res.json())
      .then(payload => {
        underdogAdpMap.clear();
        const playersObj = payload.players || {};
        Object.entries(playersObj).forEach(([normKey, p]) => {
          underdogAdpMap.set(normKey, {
            adp: p.adp,
            exact_adp: p.exact_adp,
            position: p.position,
            team: p.team,
            full_name: p.full_name,
            pos_rank: p.pos_rank,
            pos_num: p.pos_num,
            bye_week: p.bye_week
          });
        });
        console.log(`Loaded Underdog ADP for ${underdogAdpMap.size} players.`);
        return underdogAdpMap;
      })
      .catch(err => {
        console.warn('Underdog ADP fetch failed:', err);
        return underdogAdpMap;
      });
  }

  // Load Platform Data (Unified Redraft vs Underdog Handler)
  function loadPlatformData(mode) {
    currentPlatformMode = mode;
    localStorage.setItem('fp_platform_mode', mode);
    loadDraftState();

    if (btnModeRedraft) btnModeRedraft.classList.toggle('active', mode === 'redraft');
    if (btnModeUnderdog) btnModeUnderdog.classList.toggle('active', mode === 'underdog');

    if (sleeperStatusBadge) {
      if (mode === 'underdog') {
        sleeperStatusBadge.className = 'badge-underdog-live';
        sleeperStatusBadge.textContent = '🐶 Underdog Best Ball (0.5 PPR)';
      } else {
        sleeperStatusBadge.className = 'badge-sleeper-live';
        sleeperStatusBadge.textContent = '🟢 Sleeper ADP: Live';
      }
    }

    if (thAdp) {
      const span = thAdp.querySelector('span');
      if (span) span.textContent = (mode === 'underdog') ? 'UD ADP' : 'ADP';
      thAdp.title = (mode === 'underdog') ? 'Sort by Underdog Best Ball ADP' : 'Sort by Sleeper ADP';
    }

    if (authorFilterSelect) {
      if (mode === 'underdog') {
        authorFilterSelect.innerHTML = `
          <option value="Consensus" selected>🏆 Best Ball Rankings</option>
        `;
        currentAuthorFilter = 'Consensus';
      } else {
        authorFilterSelect.innerHTML = `
          <option value="Consensus" selected>🏆 Consensus Rankings</option>
          <option value="John Hansen">John Hansen</option>
          <option value="Scott Barrett">Scott Barrett</option>
          <option value="Graham Barfield">Graham Barfield</option>
        `;
        currentAuthorFilter = localStorage.getItem('fp_rank_source') || 'Consensus';
        authorFilterSelect.value = currentAuthorFilter;
      }
    }

    if (mode === 'underdog') {
      Promise.all([
        fetchUnderdogAdp(),
        fetch('underdog_db.json?t=' + Date.now()).then(r => r.json()).catch(() => []),
        fetch('fantasypoints_db.json?t=' + Date.now()).then(r => r.json()).catch(() => [])
      ])
      .then(([udAdp, udData, redraftData]) => {
        rawTakesData = udData;
        processTakesData(udData, 'underdog', redraftData);
        renderPlayerBoard();
        updateHeaderCounts();
        renderRosterSidebarContent();
      })
      .catch(err => {
        console.error('Underdog load error:', err);
      });
    } else {
      Promise.all([
        fetchSleeperAdp(),
        fetch('fantasypoints_db.json?t=' + Date.now()).then(r => r.json())
      ])
      .then(([sleeperData, dbData]) => {
        rawTakesData = dbData;
        processTakesData(dbData, 'redraft');
        renderPlayerBoard();
        updateHeaderCounts();
        renderRosterSidebarContent();
      })
      .catch(err => {
        console.error('Redraft initialization error:', err);
      });
    }
  }

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
  function processTakesData(takes, mode = 'redraft', secondaryTakes = []) {
    groupedPlayersMap.clear();
    const allAuthors = new Set();
    const activeAdpMap = (mode === 'underdog') ? underdogAdpMap : sleeperAdpMap;

    // In Underdog mode, populate all ADP players first so unmentioned players exist on the board
    if (mode === 'underdog' && activeAdpMap.size > 0) {
      activeAdpMap.forEach((info, canonicalKey) => {
        groupedPlayersMap.set(canonicalKey, {
          canonical_key: canonicalKey,
          player_name: info.full_name,
          position: info.position,
          team: info.team,
          sleeper_adp: info.adp,
          exact_adp: info.exact_adp || info.adp,
          pos_rank: info.pos_rank,
          pos_num: info.pos_num || 99,
          raw_takes: [],
          author_takes_map: new Map(),
          author_pos_ranks: new Map()
        });
      });
    }

    takes.forEach(take => {
      const rawName = take.player_name ? take.player_name.trim() : 'Unknown Player';
      const canonicalKey = getCanonicalNameKey(rawName);
      
      const adpInfo = activeAdpMap.get(canonicalKey);
      const displayName = adpInfo?.full_name || rawName;
      const position = take.position || adpInfo?.position || 'FLEX';
      const team = take.team || adpInfo?.team || 'NFL';
      const marketAdp = adpInfo?.adp || 300;
      const posRank = adpInfo?.pos_rank || `${position}`;

      if (!groupedPlayersMap.has(canonicalKey)) {
        groupedPlayersMap.set(canonicalKey, {
          canonical_key: canonicalKey,
          player_name: displayName,
          position: position,
          team: team,
          sleeper_adp: marketAdp,
          exact_adp: adpInfo?.exact_adp || marketAdp,
          pos_rank: posRank,
          pos_num: adpInfo?.pos_num || 99,
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

      if (take.fp_overall_rank && (take.author === 'FantasyPoints Staff' || take.key_reason?.includes('Top-200') || take.key_reason?.includes('Best Ball Rank'))) {
        playerObj.fp_overall_rank = take.fp_overall_rank;
      }

      // Check if take is a generic CSV ranking entry (no written commentary)
      const isGenericCsvRank = take.is_official_ranking && 
        (!take.stance || take.stance === 'Bullish') && 
        (!take.key_reason || take.key_reason.startsWith('Official '));
      
      const isFlagshipStance = ['Exodia', 'The Twelve', "Guru's Guys", 'Gurus Guys', 'Hansen 50', 'Hansen-50', 'Dirty Thirty', 'Dirty-Thirty', 'Tournament Anchor', 'Stack Partner', 'Late-Round Spike'].includes(take.stance);

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

    // In Underdog mode, blend in secondary redraft takes (Scott Barrett / John Hansen Guru's Guys)
    if (mode === 'underdog' && Array.isArray(secondaryTakes) && secondaryTakes.length > 0) {
      secondaryTakes.forEach(take => {
        const rawName = take.player_name ? take.player_name.trim() : '';
        const canonicalKey = getCanonicalNameKey(rawName);
        if (!canonicalKey || !groupedPlayersMap.has(canonicalKey)) return;

        const playerObj = groupedPlayersMap.get(canonicalKey);
        const isFlagship = ['Exodia', 'The Twelve', "Guru's Guys", 'Gurus Guys', 'Hansen 50', 'Hansen-50', 'Dirty Thirty', 'Dirty-Thirty', 'Must-Draft'].includes(take.stance);
        const hasWrittenCommentary = take.key_reason && !take.key_reason.startsWith('Official ') && take.key_reason.length > 15;

        if (isFlagship || hasWrittenCommentary) {
          const authorList = getCleanAuthorsList(take.author);
          authorList.forEach(author => {
            const authorTag = `${author} (Redraft)`;
            if (!playerObj.author_takes_map.has(authorTag) && !playerObj.author_takes_map.has(author)) {
              playerObj.author_takes_map.set(authorTag, {
                author: authorTag,
                stances: new Set(),
                tiers: new Set(),
                reasons: [],
                upside_metrics: [],
                risk_factors: [],
                is_redraft_insight: true
              });
            }
            const authConsolidated = playerObj.author_takes_map.get(authorTag) || playerObj.author_takes_map.get(author);
            if (take.stance) authConsolidated.stances.add(take.stance);
            if (take.key_reason && !take.key_reason.startsWith('Official ') && !authConsolidated.reasons.includes(take.key_reason)) {
              authConsolidated.reasons.push(take.key_reason);
            }
            if (take.upside_metric && !take.upside_metric.startsWith('Official ') && !authConsolidated.upside_metrics.includes(take.upside_metric)) {
              authConsolidated.upside_metrics.push(take.upside_metric);
            }
          });
        }
      });
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
    if (authorFilterSelect && authorFilterSelect.options) {
      Array.from(authorFilterSelect.options).forEach(opt => {
        if (opt && opt.value !== 'Consensus') {
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
    const stackContext = computeRosterStackContext(myRosterPlayers, groupedPlayersMap);

    playersArray.forEach((player) => {
      const isDraftedMe = myRosterPlayers.has(player.canonical_key);
      const isDraftedOther = otherDraftedPlayers.has(player.canonical_key);

      visibleCount++;

      const row = createCompactPlayerRow(player, isDraftedMe, isDraftedOther, stackContext);
      playerGrid.appendChild(row);
    });

    renderRosterSidebarContent();
    updateHeaderCounts();
    updateAiDraftAdvisor();

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
        label: null, // Removed generic green consensus pill to reduce visual noise!
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
    const signatureNames = ['Exodia', 'The Twelve', "Guru's Guys", 'Gurus Guys', 'Hansen 50', 'Hansen-50', 'Dirty Thirty', 'Dirty-Thirty'];
    
    player.author_takes_map.forEach(auth => {
      auth.stances.forEach(s => {
        if (signatureNames.includes(s) && !signature.includes(s)) {
          signature.push(s);
        }
      });
    });

    // Fallback: Scan text for keywords if stance wasn't explicitly extracted in JSON
    if (player.raw_takes) {
      const fullText = player.raw_takes.map(t => `${t.key_reason || ''} ${t.target_round_advice || ''} ${t.tier_or_target_round || ''} ${t.source_file || ''}`).join(' ').toLowerCase();
      if (fullText.includes('exodia') && !signature.includes('Exodia')) signature.push('Exodia');
      if ((fullText.includes('the twelve') || fullText.includes("'the twelve'") || fullText.includes('"the twelve"')) && !signature.includes('The Twelve')) signature.push('The Twelve');
      if ((fullText.includes('hansen 50') || fullText.includes('hansen50')) && !signature.includes('Hansen 50')) signature.push('Hansen 50');
      if ((fullText.includes('dirty thirty') || fullText.includes('dirty 30')) && !signature.includes('Dirty Thirty')) signature.push('Dirty Thirty');
    }

    return signature;
  }

  // Helper: Compute Bi-Directional Stacking & Team Correlation Context
  function computeRosterStackContext(myRosterKeys, playersMap) {
    const teamQBs = new Map(); // team -> [Player]
    const teamPassCatchers = new Map(); // team -> [Player]
    const teamRBs = new Map(); // team -> [Player]
    const allDraftedByTeam = new Map(); // team -> [Player]

    myRosterKeys.forEach(k => {
      const p = playersMap.get(k);
      if (!p || !p.team || p.team === 'NFL') return;
      
      if (!allDraftedByTeam.has(p.team)) allDraftedByTeam.set(p.team, []);
      allDraftedByTeam.get(p.team).push(p);

      if (p.position === 'QB') {
        if (!teamQBs.has(p.team)) teamQBs.set(p.team, []);
        teamQBs.get(p.team).push(p);
      } else if (p.position === 'WR' || p.position === 'TE') {
        if (!teamPassCatchers.has(p.team)) teamPassCatchers.set(p.team, []);
        teamPassCatchers.get(p.team).push(p);
      } else if (p.position === 'RB') {
        if (!teamRBs.has(p.team)) teamRBs.set(p.team, []);
        teamRBs.get(p.team).push(p);
      }
    });

    return { teamQBs, teamPassCatchers, teamRBs, allDraftedByTeam };
  }

  // Helper: Get Stacking Badge for any Player on the Board
  function getPlayerStackBadge(player, stackContext) {
    if (!stackContext || currentPlatformMode !== 'underdog' || !player.team || player.team === 'NFL') return null;

    const team = player.team;
    const qbs = stackContext.teamQBs.get(team) || [];
    const passCatchers = stackContext.teamPassCatchers.get(team) || [];

    // 1. If player is a QB: Check if we drafted WR/TE from this team!
    if (player.position === 'QB') {
      if (passCatchers.length > 0) {
        const names = passCatchers.map(pc => pc.player_name.split(' ').pop()).join(' & ');
        return {
          label: `⚡ Stack (${team}: ${names})`,
          type: 'Stack'
        };
      }
    }

    // 2. If player is WR or TE: Check if we drafted QB from this team (or partner pass-catchers)!
    if (player.position === 'WR' || player.position === 'TE') {
      if (qbs.length > 0) {
        const qbName = qbs[0].player_name.split(' ').pop();
        return {
          label: `⚡ Stack (QB: ${qbName})`,
          type: 'Stack'
        };
      } else if (passCatchers.length > 0) {
        const names = passCatchers.map(pc => pc.player_name.split(' ').pop()).join(' & ');
        return {
          label: `⚡ ${team} Partner (${names})`,
          type: 'Stack-Partner'
        };
      }
    }

    // 3. If player is RB: Check if we drafted the QB
    if (player.position === 'RB' && qbs.length > 0) {
      return {
        label: `⚡ ${team} Offense`,
        type: 'Stack-Partner'
      };
    }

    return null;
  }

  // Helper: Best Ball Roster Construction & Strategy Guide Evaluator
  function evaluateBestBallRosterStructure(myPlayersList) {
    const posCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };
    myPlayersList.forEach(p => {
      posCounts[p.position] = (posCounts[p.position] || 0) + 1;
    });

    const hasEliteQB = myPlayersList.some(p => p.position === 'QB' && (p.sleeper_adp < 75 || p.exact_adp < 75));
    const hasEliteTE = myPlayersList.some(p => p.position === 'TE' && (p.sleeper_adp < 60 || p.exact_adp < 60));
    const earlyRBsCount = myPlayersList.filter(p => p.position === 'RB' && (p.sleeper_adp < 36 || p.exact_adp < 36)).length;

    // Dynamic Positional Targets based on Underdog Strategy Guide (Always sums to exactly 18)
    const targetQB = hasEliteQB ? 2 : 3;
    const targetTE = hasEliteTE ? 2 : (posCounts.TE >= 3 ? 3 : 2);
    let targetRB = 5;
    if (earlyRBsCount >= 2) targetRB = 5;
    else if (earlyRBsCount === 1) targetRB = 5;
    else if (earlyRBsCount === 0 && myPlayersList.length >= 3 && posCounts.RB >= 6) targetRB = 6;
    else targetRB = 5;

    // Remaining roster spots allocated to WR (7-9 WRs)
    const targetWR = Math.max(7, 18 - targetQB - targetTE - targetRB);

    // Detected Archetype & Tactical Roster Strategy Advice
    let archetype = '🎯 Best Ball Build';
    let archetypeAdvice = 'Target 5-6 RBs, 7-9 WRs, 2-3 QBs, and 2-3 TEs. Build correlation with your QBs.';

    const totalDrafted = myPlayersList.length;

    // Priority 1: Hyper-Fragile (Elite QB + Elite TE, or dual early QB/TE investment)
    if ((hasEliteQB && hasEliteTE) || (posCounts.QB >= 1 && posCounts.TE >= 1 && (hasEliteQB || hasEliteTE))) {
      archetype = '👑 HYPER-FRAGILE';
      archetypeAdvice = 'Elite QB + TE secured. Hard cap at 2 QBs and 2 TEs to preserve valuable WR & RB roster capital.';
    } else if (posCounts.RB >= 3 && totalDrafted <= 5) {
      archetype = '💥 TRIPLE ANCHOR';
      archetypeAdvice = '3 early RBs drafted. Hard cap at 4 RBs total! Devote all remaining picks to WR volume, QB & TE.';
    } else if (earlyRBsCount >= 2 || (posCounts.RB >= 2 && totalDrafted <= 4)) {
      archetype = '⚓ DUAL ANCHOR RB';
      archetypeAdvice = '2 early anchor RBs locked in. Hard cap at 5 RBs max. Shift all mid/late capital to WR volume & stacks.';
    } else if (earlyRBsCount === 1) {
      if (totalDrafted <= 2) {
        archetype = '⚓ ANCHOR RB START';
        archetypeAdvice = '1 elite RB anchor secured. Open to Dual Anchor (if elite RB falls in R2-3) or pivot to WRs for Hero-RB.';
      } else {
        archetype = '🦸 HERO-RB BUILD';
        archetypeAdvice = 'Hero RB locked in. Pause on RBs in Rds 3-7. Pour capital into WR volume, locked QB, and TE.';
      }
    } else if (earlyRBsCount === 0 && totalDrafted >= 3) {
      archetype = '🚫 ZERO-RB BUILD';
      archetypeAdvice = '0 early RBs. Target 5-6 high-upside RBs in Rds 7-15. Build massive WR dominance & stacks now.';
    }

    return {
      posCounts,
      targets: { QB: targetQB, RB: targetRB, WR: targetWR, TE: targetTE },
      hasEliteQB,
      hasEliteTE,
      earlyRBsCount,
      archetype,
      archetypeAdvice
    };
  }

  // Create Compact Tabular Row
  function createCompactPlayerRow(player, isDraftedMe, isDraftedOther, stackContext) {
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

    // Best Ball Stacking Pill (Top Priority in Underdog mode)
    if (stackContext && currentPlatformMode === 'underdog') {
      const stackBadge = getPlayerStackBadge(player, stackContext);
      if (stackBadge) {
        stancePills.push(`<span class="badge-stance ${stackBadge.type}">${escapeHtml(stackBadge.label)}</span>`);
      }
    }

    signatureStances.forEach(sig => {
      const cssClass = sig.replace(/['’\s]/g, '-');
      stancePills.push(`<span class="badge-stance ${cssClass}">${getIconForStance(sig)} ${sig}</span>`);
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
    passedSuggestionsSet.clear();
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
    passedSuggestionsSet.clear();
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
    localStorage.setItem(getStorageKey('fp_starred_players'), JSON.stringify(Array.from(starredPlayers)));
    renderPlayerBoard();
  }

  function saveDraftStates() {
    localStorage.setItem(getStorageKey('fp_my_roster'), JSON.stringify(Array.from(myRosterPlayers)));
    localStorage.setItem(getStorageKey('fp_other_drafted'), JSON.stringify(Array.from(otherDraftedPlayers)));
  }

  function updateHeaderCounts() {
    const maxRosterSize = (currentPlatformMode === 'underdog') ? 18 : 15;
    if (starredCountEl) starredCountEl.textContent = starredPlayers.size;
    if (rosterCountBadge) rosterCountBadge.textContent = `(${myRosterPlayers.size}/${maxRosterSize})`;
    
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

    // In Underdog Best Ball mode: Render Best Ball Structure HUD & Stacks Box
    if (currentPlatformMode === 'underdog') {
      const structure = evaluateBestBallRosterStructure(myPlayersList);
      const stackContext = computeRosterStackContext(myRosterPlayers, groupedPlayersMap);

      // Helper: Determine Positional Status Classes (Neutral, Approaching/Capped = Yellow, Optimal = Green, Over = Red)
      function getPosGaugeClass(pos, count, target) {
        if (pos === 'WR') {
          if (count > 9) return 'over';
          if (count >= target && count > 0) return 'optimal';
          if (count >= 7 || (target > 7 && count === target - 1)) return 'capped';
          return '';
        }
        if (count > target) return 'over';
        if (count === target && count > 0) return 'optimal';
        if (count === target - 1 && count > 0) return 'capped';
        return '';
      }

      const qbClass = getPosGaugeClass('QB', structure.posCounts.QB, structure.targets.QB);
      const rbClass = getPosGaugeClass('RB', structure.posCounts.RB, structure.targets.RB);
      const wrClass = getPosGaugeClass('WR', structure.posCounts.WR, structure.targets.WR);
      const teClass = getPosGaugeClass('TE', structure.posCounts.TE, structure.targets.TE);

      const hudEl = document.createElement('div');
      hudEl.className = 'bb-structure-hud';
      hudEl.innerHTML = `
        <div class="bb-hud-header">
          <span class="bb-hud-title">🐶 Portfolio Structure</span>
          <span class="bb-archetype-chip">${escapeHtml(structure.archetype)}</span>
        </div>
        <div class="bb-pos-gauge-row">
          <div class="bb-pos-gauge-chip ${qbClass}">
            <span class="bb-pos-name">QB</span>
            <span class="bb-pos-val">${structure.posCounts.QB}/${structure.targets.QB}</span>
          </div>
          <div class="bb-pos-gauge-chip ${rbClass}">
            <span class="bb-pos-name">RB</span>
            <span class="bb-pos-val">${structure.posCounts.RB}/${structure.targets.RB}</span>
          </div>
          <div class="bb-pos-gauge-chip ${wrClass}">
            <span class="bb-pos-name">WR</span>
            <span class="bb-pos-val">${structure.posCounts.WR}/${structure.targets.WR}</span>
          </div>
          <div class="bb-pos-gauge-chip ${teClass}">
            <span class="bb-pos-name">TE</span>
            <span class="bb-pos-val">${structure.posCounts.TE}/${structure.targets.TE}</span>
          </div>
        </div>
        <div class="bb-advice-text">
          💡 ${escapeHtml(structure.archetypeAdvice)}
        </div>
      `;
      sidebarRosterList.appendChild(hudEl);

      // Find Active Stacks
      const activeStacks = [];
      stackContext.allDraftedByTeam.forEach((players, team) => {
        if (players.length >= 2) {
          const names = players.map(p => `${p.player_name.split(' ').pop()} (${p.position})`).join(', ');
          activeStacks.push({ team, count: players.length, names });
        }
      });

      if (activeStacks.length > 0) {
        const stacksBox = document.createElement('div');
        stacksBox.className = 'bb-stacks-box';
        stacksBox.innerHTML = `
          <div class="bb-stacks-title">⚡ Active Stacks (${activeStacks.length})</div>
          ${activeStacks.map(st => `
            <div class="bb-stack-item">
              <strong style="color: #fde68a;">${escapeHtml(st.team)} (${st.count}-Stack):</strong>
              <span style="font-size: 0.7rem; color: #cbd5e1; margin-left: 6px;">${escapeHtml(st.names)}</span>
            </div>
          `).join('')}
        `;
        sidebarRosterList.appendChild(stacksBox);
      }
    }

    if (myPlayersList.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style = "font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px 0;";
      emptyDiv.innerHTML = `No players drafted yet.<br>Click "ME" on player rows to build your roster!`;
      sidebarRosterList.appendChild(emptyDiv);
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
          <span class="adp-tag">${(currentPlatformMode === 'underdog') ? 'Underdog 0.5 PPR' : 'Sleeper PPR'}: ${adpDisplay}</span>
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
    const modeLabel = (currentPlatformMode === 'underdog') ? 'Underdog Best Ball' : 'Redraft';
    if (confirm(`Reset all drafted player statuses & rosters for ${modeLabel}?`)) {
      myRosterPlayers.clear();
      otherDraftedPlayers.clear();
      starredPlayers.clear();
      localStorage.removeItem(getStorageKey('fp_my_roster'));
      localStorage.removeItem(getStorageKey('fp_other_drafted'));
      localStorage.removeItem(getStorageKey('fp_starred_players'));
      renderPlayerBoard();
      updateHeaderCounts();
      renderRosterSidebarContent();
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
    const hierarchy = ['Exodia', 'The Twelve', "Guru's Guys", 'Gurus Guys', 'Must-Draft', 'Hansen 50', 'Hansen-50', 'Breakout', 'Bullish', 'Sleeper', 'Dirty Thirty', 'Dirty-Thirty', 'Bearish', 'Avoid'];
    for (const h of hierarchy) {
      if (stancesArr.includes(h)) return h;
    }
    return stancesArr[0];
  }

  function getIconForStance(stance) {
    if (!stance) return '📌';
    const s = stance.toLowerCase();
    if (s.includes('exodia')) return '✨';
    if (s.includes('twelve')) return '⭐';
    if (s.includes('guru')) return '🧙‍♂️';
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

  // ==========================================================================
  // 🐶 UNDERDOG FANTASY LIVE DRAFT BROADCAST RECEIVER
  // ==========================================================================
  let underdogChannel = null;
  let isUnderdogRelayConnected = false;

  if (typeof BroadcastChannel !== 'undefined') {
    underdogChannel = new BroadcastChannel('underdog-sync');
    
    // Request initial draft sync state from open Underdog tabs
    setTimeout(() => {
      if (underdogChannel) {
        underdogChannel.postMessage({ type: 'REQUEST_UNDERDOG_SYNC' });
      }
    }, 1200);

    underdogChannel.onmessage = (event) => {
      const data = event.data;
      if (data && data.type === 'UNDERDOG_PICKS_SYNC' && Array.isArray(data.picks)) {
        handleIncomingUnderdogPicks(data);
      }
    };
  }

  function handleIncomingUnderdogPicks(data) {
    isUnderdogRelayConnected = true;
    const picks = data.picks;
    if (!picks || picks.length === 0) return;

    if (currentPlatformMode !== 'underdog') {
      currentPlatformMode = 'underdog';
      localStorage.setItem('fp_platform_mode', 'underdog');
      loadPlatformData('underdog');
    }

    let hasNewPicks = false;

    picks.forEach(p => {
      const canonicalKey = getCanonicalNameKey(p.player_name);
      if (!canonicalKey) return;

      // Register player in groupedPlayersMap if not present yet
      if (!groupedPlayersMap.has(canonicalKey)) {
        groupedPlayersMap.set(canonicalKey, {
          canonical_key: canonicalKey,
          player_name: p.player_name,
          position: p.position || 'FLEX',
          team: 'NFL',
          sleeper_adp: 999,
          pos_rank: '—',
          pos_num: 99,
          raw_takes: [],
          author_takes_map: new Map(),
          author_pos_ranks: new Map()
        });
      }

      if (p.is_user) {
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
      localStorage.setItem('fp_my_roster_underdog', JSON.stringify(Array.from(myRosterPlayers)));
      localStorage.setItem('fp_other_drafted_underdog', JSON.stringify(Array.from(otherDraftedPlayers)));
      renderPlayerBoard();
    }

    // Update Header sync indicator
    if (openDraftSyncBtn && draftSyncLabel) {
      openDraftSyncBtn.classList.add('syncing');
      if (draftSyncIcon) draftSyncIcon.textContent = '🐶';
      draftSyncLabel.textContent = `UD Live: #${picks.length}`;
    }
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

  // ==========================================================================
  // 🧠 AI LIVE DRAFT ADVISOR & LOOKAHEAD ENGINE
  // ==========================================================================

  // Snake Draft Turn & Distance Calculator
  function calculateDraftTurns(currentPickNo, totalTeams, userSlot, totalRounds = 16) {
    const teams = totalTeams || 12;
    const currentRound = Math.ceil(currentPickNo / teams);
    const pickInRound = (currentPickNo - 1) % teams + 1;

    if (!userSlot || userSlot < 1 || userSlot > teams) {
      // Default assumed next turn in snake draft (e.g. assume slot 1 turn at pick 24 for round 1)
      const assumedNextPick = currentPickNo <= teams ? (teams * 2) : (currentPickNo + teams);
      return {
        hasSlot: false,
        currentPickNo,
        currentRound,
        pickInRound,
        totalTeams: teams,
        userSlot: null,
        isOnTheClock: false,
        isOnDeck: false,
        picksAway: null,
        currentUserPick: null,
        currentUserRound: null,
        nextUserPick: assumedNextPick,
        nextUserRound: Math.ceil(assumedNextPick / teams),
        interveningPicks: (assumedNextPick - currentPickNo)
      };
    }

    // Generate user's overall picks in snake format
    const userPicks = [];
    for (let r = 1; r <= totalRounds; r++) {
      let pickNum;
      if (r % 2 === 1) { // Odd round: slot 1 -> T
        pickNum = (r - 1) * teams + userSlot;
      } else { // Even round: slot T -> 1 (snake back)
        pickNum = r * teams - userSlot + 1;
      }
      userPicks.push({ round: r, pickNo: pickNum });
    }

    // Find upcoming user picks >= currentPickNo
    const upcoming = userPicks.filter(p => p.pickNo >= currentPickNo);
    const nextUp = upcoming.length > 0 ? upcoming[0] : null;
    const subsequent = upcoming.length > 1 ? upcoming[1] : null;

    const picksAway = nextUp ? (nextUp.pickNo - currentPickNo) : null;
    const isOnTheClock = (picksAway === 0);
    const isOnDeck = (picksAway !== null && picksAway > 0 && picksAway <= 2);
    const interveningPicks = (nextUp && subsequent) ? (subsequent.pickNo - nextUp.pickNo) : (teams * 2 - 2);

    return {
      hasSlot: true,
      currentPickNo,
      currentRound,
      pickInRound,
      totalTeams: teams,
      userSlot,
      isOnTheClock,
      isOnDeck,
      picksAway,
      currentUserPick: nextUp ? nextUp.pickNo : null,
      currentUserRound: nextUp ? nextUp.round : null,
      nextUserPick: subsequent ? subsequent.pickNo : null,
      nextUserRound: subsequent ? subsequent.round : null,
      interveningPicks
    };
  }

  // Logistic Survival Probability Model (P(Player survives until targetPick))
  function calculateSurvivalProbability(playerAdp, targetPick) {
    if (!playerAdp || playerAdp >= 300) return 0.99;
    const pickTarget = targetPick || 24;

    const sigma = Math.max(3.2, playerAdp * 0.14);
    const z = (pickTarget - playerAdp) / sigma;
    const probDrafted = 1 / (1 + Math.exp(-1.65 * z));
    const survivalProb = Math.max(0.01, Math.min(0.99, 1 - probDrafted));
    return survivalProb;
  }

  // Roster Needs & Bye Week Conflict Evaluator
  function evaluateRosterNeeds(myRosterSet, currentRound) {
    const counts = { QB: 0, RB: 0, WR: 0, TE: 0, FLEX: 0 };
    const byeMap = {};
    const myPlayersList = [];

    myRosterSet.forEach(key => {
      const p = groupedPlayersMap.get(key);
      if (p) {
        myPlayersList.push(p);
        if (counts[p.position] !== undefined) counts[p.position]++;
        const bye = TEAM_BYE_WEEKS[p.team];
        if (bye) {
          byeMap[bye] = (byeMap[bye] || 0) + 1;
        }
      }
    });

    const urgency = { QB: 1.0, RB: 1.0, WR: 1.0, TE: 1.0 };
    
    // Mode-Specific Urgency Calibration
    if (currentPlatformMode === 'underdog') {
      const structure = evaluateBestBallRosterStructure(myPlayersList);
      
      // Best Ball QB Urgency & Caps
      if (counts.QB >= structure.targets.QB) {
        urgency.QB = 0.05; // Hard cap on QBs
      } else if (counts.QB === 0 && currentRound >= 8) {
        urgency.QB = 1.60;
      }

      // Best Ball TE Urgency & Caps
      if (counts.TE >= structure.targets.TE) {
        urgency.TE = 0.05; // Hard cap on TEs
      } else if (counts.TE === 0 && currentRound >= 7) {
        urgency.TE = 1.50;
      }

      // Best Ball RB Urgency based on Archetype
      if (counts.RB >= structure.targets.RB) {
        urgency.RB = 0.05; // Hard cap on RBs
      } else if (structure.earlyRBsCount >= 2) {
        // Dual Anchor: Pause on RBs in mid rounds
        if (currentRound >= 3 && currentRound <= 8 && counts.RB >= 2) urgency.RB = 0.35;
      } else if (structure.earlyRBsCount === 1) {
        // Hero RB: Do not draft RB in rounds 3-7
        if (currentRound >= 3 && currentRound <= 7) urgency.RB = 0.30;
      } else if (structure.earlyRBsCount === 0) {
        // Zero RB: Avoid R1-R5, surge in R7+
        if (currentRound <= 5) urgency.RB = 0.20;
        else if (currentRound >= 7 && counts.RB < structure.targets.RB) urgency.RB = 1.85;
      }

      // Best Ball WR Dominance in Rounds 1-8
      if (counts.WR >= 9) {
        urgency.WR = 0.05; // Hard cap at 9 WRs
      } else if (currentRound <= 8 && counts.WR < 5) {
        urgency.WR = 1.40;
      }

      return { counts, urgency, byeMap, structure };
    }

    // Redraft Dynamic positional need weighting
    if (counts.QB === 0 && currentRound >= 6) urgency.QB += (currentRound - 5) * 0.35;
    if (counts.TE === 0 && currentRound >= 5) urgency.TE += (currentRound - 4) * 0.30;
    if (counts.RB < 2 && currentRound >= 3) urgency.RB += (3 - counts.RB) * 0.45;
    if (counts.WR < 3 && currentRound >= 3) urgency.WR += (3 - counts.WR) * 0.40;
    
    // Redraft Saturation dampening
    if (counts.RB >= 4) urgency.RB *= 0.55;
    if (counts.WR >= 5) urgency.WR *= 0.55;
    if (counts.QB >= 2) urgency.QB *= 0.25;
    if (counts.TE >= 2) urgency.TE *= 0.25;

    return { counts, urgency, byeMap };
  }

  // Candidate Composite Scoring Engine
  function evaluateCandidateScore(player, turnsInfo, rosterNeeds, strategyMode) {
    const adp = player.sleeper_adp ? player.sleeper_adp : (player.pos_num ? player.pos_num * 7.5 : 150);
    
    // 1. Base Score anchored to Market ADP and Official Expert Overall Rank
    const expertRank = player.fp_overall_rank || adp;
    const effectiveMarketVal = (adp * 0.65) + (expertRank * 0.35);
    let score = Math.max(10, 165 - effectiveMarketVal);

    // 2. Reach & Value Delta Calibration
    const currentPick = turnsInfo.isOnTheClock ? turnsInfo.currentPickNo : (turnsInfo.currentUserPick || turnsInfo.currentPickNo);
    const reachDelta = currentPick - adp; // negative if reaching

    if (reachDelta < 0) {
      const absReach = Math.abs(reachDelta);
      if (turnsInfo.currentRound === 1) {
        if (absReach <= 2) {
          score -= absReach * 1.5;
        } else if (absReach <= 5) {
          score -= (2 * 1.5) + (absReach - 2) * 3.5;
        } else {
          score -= (2 * 1.5) + (3 * 3.5) + (absReach - 5) * 6.0;
        }
      } else if (turnsInfo.currentRound <= 3) {
        score -= absReach * 2.2;
      } else {
        score -= absReach * 1.3;
      }
    } else {
      score += Math.min(22, reachDelta * 1.0);
    }

    // 3. Stance Bonus (Capped in early rounds to act as tier-tiebreakers)
    const signatureStances = getSignatureStances(player);
    let stancePoints = 0;
    
    if (currentPlatformMode === 'underdog') {
      // In Best Ball mode: Redraft Guru takes provide secondary talent conviction (~50% weight)
      if (signatureStances.includes('Exodia')) stancePoints += 8;
      if (signatureStances.includes('The Twelve')) stancePoints += 6;
      if (signatureStances.includes("Guru's Guys") || signatureStances.includes("Gurus Guys")) stancePoints += 6;
      if (signatureStances.includes('Must-Draft')) stancePoints += 5;
      if (signatureStances.includes('Hansen 50') || signatureStances.includes('Hansen-50')) stancePoints += 4;
    } else {
      // Full weight in Redraft
      if (signatureStances.includes('Exodia')) stancePoints += 14;
      if (signatureStances.includes('The Twelve')) stancePoints += 10;
      if (signatureStances.includes("Guru's Guys") || signatureStances.includes("Gurus Guys")) stancePoints += 10;
      if (signatureStances.includes('Must-Draft')) stancePoints += 8;
      if (signatureStances.includes('Hansen 50') || signatureStances.includes('Hansen-50')) stancePoints += 6;
    }

    const consensus = evaluatePlayerConsensus(player);
    if (consensus.type === 'FADE') stancePoints -= 25;
    if (consensus.type === 'SPLIT') stancePoints -= 5;

    if (turnsInfo.currentRound <= 2) {
      stancePoints = Math.min(14, stancePoints);
    }
    score += stancePoints;

    // 4. Best Ball Stacking & Correlation Bonus
    if (currentPlatformMode === 'underdog') {
      const stackContext = computeRosterStackContext(myRosterPlayers, groupedPlayersMap);
      const stackBadge = getPlayerStackBadge(player, stackContext);
      if (stackBadge) {
        if (stackBadge.type === 'Stack') {
          score += 26; // Major priority: Direct QB <-> Pass-Catcher correlation
        } else if (stackBadge.type === 'Stack-Partner') {
          score += 12; // Pass-catcher partner / double stack setup
        }
      }
    }

    // 5. Early Round Positional Strategy Rules (Rounds 1-3)
    if (turnsInfo.currentRound <= 3) {
      if (player.position === 'QB') {
        // Strict anti-early QB unless elite mobile rushing QB
        score *= 0.45;
      } else if (player.position === 'TE') {
        const isAllowedEliteTe = (player.canonical_key === 'brockbowers' || player.canonical_key === 'treymcbride');
        if (!isAllowedEliteTe) {
          score *= 0.45;
        } else {
          score *= 0.90;
        }
      }
    }

    // 6. Survival Odds / Tier Cliff Bonus
    const survivalToNext = calculateSurvivalProbability(player.sleeper_adp, turnsInfo.nextUserPick);
    if (turnsInfo.isOnTheClock || turnsInfo.isOnDeck) {
      if (currentPick >= 9 && survivalToNext < 0.25 && score > 60) {
        score += 12;
      }
    }

    // 7. Positional Need Multiplier
    const posMultiplier = rosterNeeds.urgency[player.position] || 1.0;
    score *= posMultiplier;

    // 8. Strategy Profile Adjustments
    if (strategyMode === 'exodia_hunter') {
      if (signatureStances.length > 0) score *= 1.30;
    } else if (strategyMode === 'hero_rb') {
      if (player.position === 'RB' && rosterNeeds.counts.RB === 0) score *= 1.4;
      else if (player.position === 'RB' && rosterNeeds.counts.RB >= 1) score *= 0.75;
      else if (player.position === 'WR') score *= 1.2;
    } else if (strategyMode === 'zero_rb') {
      if (player.position === 'WR' && turnsInfo.currentRound <= 6) score *= 1.4;
      if (player.position === 'RB' && turnsInfo.currentRound <= 5) score *= 0.4;
    }

    return {
      score,
      survivalToNext,
      isCliffRisk: (survivalToNext < 0.30),
      signatureStances
    };
  }

  // Instant Heuristic Strategy Generator (0ms Fallback)
  function generateHeuristicStrategy(turnsInfo, rosterNeeds, availableCandidates) {
    if (!availableCandidates || availableCandidates.length === 0) {
      return {
        primary: null,
        contingency: null,
        rationale: 'No available players remaining in pool.',
        lookaheadList: [],
        cliffList: []
      };
    }

    // Filter out passed suggestions unless everything has been passed
    let candidatePool = availableCandidates.filter(p => !passedSuggestionsSet.has(p.canonical_key));
    if (candidatePool.length === 0) candidatePool = availableCandidates;

    const scored = candidatePool.map(p => {
      const evalResult = evaluateCandidateScore(p, turnsInfo, rosterNeeds, aiStrategyMode);
      return { player: p, ...evalResult };
    });

    scored.sort((a, b) => b.score - a.score);

    const primary = scored[0];
    let contingency = scored.find(s => s.player.canonical_key !== primary.player.canonical_key && s.player.position !== primary.player.position);
    if (!contingency && scored.length > 1) contingency = scored[1];

    // Lookahead targets (High survival odds for next round)
    const lookaheadList = scored
      .filter(s => s.player.canonical_key !== primary.player.canonical_key && s.survivalToNext >= 0.50)
      .slice(0, 4);

    // Cliff list (High value, low survival odds)
    const cliffList = scored
      .filter(s => s.isCliffRisk && s.score > 65)
      .slice(0, 3);

    // Formulate Expert Strategic Rationale
    let rationale = '';
    const p = primary.player;
    const authTakes = p.raw_takes || [];
    const topReason = authTakes.find(t => t.key_reason)?.key_reason || '';
    const stancesText = primary.signatureStances.length > 0 ? primary.signatureStances.join(' / ') : (p.stance || 'Value Target');

    if (turnsInfo.isOnTheClock) {
      rationale = `🚨 <strong>ON THE CLOCK:</strong> Draft <strong>${escapeHtml(p.player_name)}</strong> (${p.position} - ${p.team}). Stance: <em>${escapeHtml(stancesText)}</em>. `;
      if (primary.isCliffRisk) {
        rationale += `<strong>Tier Cliff Alert:</strong> Only <strong>${Math.round(primary.survivalToNext * 100)}% survival odds</strong> to your next turn (Pick #${turnsInfo.nextUserPick || '—'}). `;
      }
      if (topReason) {
        rationale += `<em>"${escapeHtml(topReason.slice(0, 140))}..."</em> `;
      }
      if (contingency) {
        rationale += `If sniped, pivot to <strong>${escapeHtml(contingency.player.player_name)}</strong> (${contingency.player.position}).`;
      }
    } else if (turnsInfo.isOnDeck) {
      rationale = `⏳ <strong>ON DECK (${turnsInfo.picksAway} pick${turnsInfo.picksAway > 1 ? 's' : ''} away):</strong> Prepare to lock in <strong>${escapeHtml(p.player_name)}</strong> (${p.position}). `;
      if (primary.isCliffRisk) {
        rationale += `High demand tier; unlikely to make it past this window. `;
      }
      if (contingency) {
        rationale += `Backup option: <strong>${escapeHtml(contingency.player.player_name)}</strong>.`;
      }
    } else {
      const dist = turnsInfo.picksAway ? `${turnsInfo.picksAway} picks away (Pick #${turnsInfo.currentUserPick})` : `Round ${turnsInfo.currentRound}`;
      rationale = `🎯 <strong>PLANNING (${dist}):</strong> Top projected board target is <strong>${escapeHtml(p.player_name)}</strong> (${p.position} - ADP ${p.sleeper_adp ? p.sleeper_adp.toFixed(1) : '—'}). `;
      if (lookaheadList.length > 0) {
        const safeNames = lookaheadList.map(l => l.player.player_name).join(', ');
        rationale += `Safe to let fall for later turns: <em>${escapeHtml(safeNames)}</em>.`;
      }
    }

    return {
      primary,
      contingency,
      rationale,
      lookaheadList,
      cliffList
    };
  }

  // Groq LLM Ultra-Fast Strategic Reasoning Integration
  async function queryGroqStrategist(turnsInfo, rosterNeeds, topCandidates, heuristicAdvice) {
    if (!groqApiKey) {
      return {
        ...heuristicAdvice,
        isAiGenerated: false,
        aiNotice: '💡 Add your Groq API Key in ⚙️ Settings for ultra-fast (~300ms) live AI reasoning.'
      };
    }

    isAiGenerating = true;
    updateAiAdvisorHudGenerating(true);

    const mapCandidateToPayload = (c) => {
      const p = c.player;
      const takesSummary = (p.raw_takes || []).slice(0, 2).map(t => `[${t.author || 'Analyst'}]: ${t.key_reason || t.stance || ''}`).join(' | ');
      return {
        name: p.player_name,
        pos: p.position,
        team: p.team,
        adp: p.sleeper_adp ? parseFloat(p.sleeper_adp.toFixed(1)) : null,
        survival_to_next_pick_pct: Math.round(c.survivalToNext * 100),
        is_cliff_risk: c.isCliffRisk,
        stances: c.signatureStances,
        expert_database_takes: takesSummary.slice(0, 180)
      };
    };

    const immediatePayload = topCandidates.slice(0, 5).map(mapCandidateToPayload);
    const lookaheadPayload = topCandidates.filter(c => c.survivalToNext >= 0.40).slice(0, 5).map(mapCandidateToPayload);

    const nextPickStr = turnsInfo.nextUserPick ? `Pick #${turnsInfo.nextUserPick}` : 'your next turn';

    const isBestBall = (currentPlatformMode === 'underdog');
    const systemRole = isBestBall
      ? "You are the FantasyPoints AI Underdog Best Ball Tournament Strategist. Your primary directive is enforcing Underdog Best Ball tournament structure (18 rounds: QB 2-3, RB 5-6, WR 7-9, TE 2-3), maximizing stacking correlation (QB <-> WR/TE), and respecting the user's detected archetype (Hero-RB, Zero-RB, Dual-Anchor, Hyper-Fragile). Use FantasyPoints analyst guru takes (Scott Barrett, John Hansen) for secondary talent conviction."
      : "You are the FantasyPoints AI Chief Draft Strategist. You provide decisive, high-IQ draft recommendations grounded strictly in Scott Barrett and John Hansen analytics and the provided FantasyPoints database. Do NOT hallucinate generic web takes or make assumptions outside the provided expert quotes.";

    const userRules = isBestBall
      ? `Best Ball Tournament Rules: Strictly adhere to positional caps (QB: ${rosterNeeds.structure?.targets?.QB || '2-3'}, RB: ${rosterNeeds.structure?.targets?.RB || '5-6'}, WR: ${rosterNeeds.structure?.targets?.WR || '7-9'}, TE: ${rosterNeeds.structure?.targets?.TE || '2-3'}). Prioritize stacking quarterbacks with their pass-catchers. Current Archetype: ${rosterNeeds.structure?.archetype || 'Balanced Best Ball'}.`
      : "Strict anti-early-QB policy in Rounds 1-3. Deprioritize early TEs in Rounds 1-3 except elite targets Brock Bowers and Trey McBride.";

    const promptPayload = {
      system_role: systemRole,
      user_draft_strategy_rules: userRules,
      format: isBestBall ? "Underdog Best Ball (0.5 PPR - 18 Rounds)" : "Sleeper Redraft (1.0 PPR - 15 Rounds)",
      draft_state: {
        current_pick: turnsInfo.currentPickNo,
        current_round: turnsInfo.currentRound,
        user_slot: turnsInfo.userSlot,
        is_on_the_clock: turnsInfo.isOnTheClock,
        picks_until_turn: turnsInfo.picksAway,
        next_turn_pick_number: turnsInfo.nextUserPick,
        intervening_picks_between_turns: turnsInfo.interveningPicks,
        current_roster_counts: rosterNeeds.counts,
        strategy_mode: aiStrategyMode,
        roster_structure: isBestBall ? rosterNeeds.structure : null
      },
      immediate_current_turn_candidates: immediatePayload,
      viable_lookahead_candidates_for_next_turn: lookaheadPayload,
      instructions: `Give a concise 2 to 3 sentence tactical draft recommendation:
1) Immediate Pick: Choose the best player from 'immediate_current_turn_candidates' and cite specific analytical rationale or stacking synergy.
2) Next Turn (${nextPickStr}): You MUST ONLY recommend players from 'viable_lookahead_candidates_for_next_turn' (who have high survival odds). NEVER suggest a top player with near-0% survival odds (like a Round 1 player) for a later turn.
3) Backup Pivot: Name one pivot option from 'immediate_current_turn_candidates' if the primary target is taken.`
    };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: aiModel || 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: promptPayload.system_role + ' ' + promptPayload.user_draft_strategy_rules },
            { role: 'user', content: JSON.stringify(promptPayload) }
          ],
          temperature: 0.3,
          max_tokens: 350
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const generatedText = resData.choices?.[0]?.message?.content;

      if (generatedText) {
        return {
          ...heuristicAdvice,
          rationale: generatedText.trim(),
          isAiGenerated: true,
          aiModelUsed: `Groq (${aiModel || 'qwen/qwen3.8-27b'})`
        };
      } else {
        throw new Error('Empty Groq response');
      }
    } catch (err) {
      console.warn('Groq AI Advisor query failed, falling back to heuristic engine:', err);
      return {
        ...heuristicAdvice,
        isAiGenerated: false,
        aiNotice: `⚠️ Groq call error (${err.message}). Showing heuristic analytics.`
      };
    } finally {
      isAiGenerating = false;
      updateAiAdvisorHudGenerating(false);
    }
  }

  // Gemini LLM Strategic Reasoning Integration
  async function queryGeminiStrategist(turnsInfo, rosterNeeds, topCandidates, heuristicAdvice) {
    if (!geminiApiKey) {
      return {
        ...heuristicAdvice,
        isAiGenerated: false,
        aiNotice: '💡 Add your Gemini API Key in ⚙️ Settings for live AI deep tactical reasoning.'
      };
    }

    isAiGenerating = true;
    updateAiAdvisorHudGenerating(true);

    const mapCandidateToPayload = (c) => {
      const p = c.player;
      const takesSummary = (p.raw_takes || []).slice(0, 2).map(t => `[${t.author || 'Analyst'}]: ${t.key_reason || t.stance || ''}`).join(' | ');
      return {
        name: p.player_name,
        pos: p.position,
        team: p.team,
        adp: p.sleeper_adp ? parseFloat(p.sleeper_adp.toFixed(1)) : null,
        survival_to_next_pick_pct: Math.round(c.survivalToNext * 100),
        is_cliff_risk: c.isCliffRisk,
        stances: c.signatureStances,
        expert_database_takes: takesSummary.slice(0, 180)
      };
    };

    const immediatePayload = topCandidates.slice(0, 5).map(mapCandidateToPayload);
    const lookaheadPayload = topCandidates.filter(c => c.survivalToNext >= 0.40).slice(0, 5).map(mapCandidateToPayload);
    const nextPickStr = turnsInfo.nextUserPick ? `Pick #${turnsInfo.nextUserPick}` : 'your next turn';

    const isBestBall = (currentPlatformMode === 'underdog');
    const systemRole = isBestBall
      ? "You are the FantasyPoints AI Underdog Best Ball Tournament Strategist. Your primary directive is enforcing Underdog Best Ball tournament structure (18 rounds: QB 2-3, RB 5-6, WR 7-9, TE 2-3), maximizing stacking correlation (QB <-> WR/TE), and respecting the user's detected archetype (Hero-RB, Zero-RB, Dual-Anchor, Hyper-Fragile). Use FantasyPoints analyst guru takes (Scott Barrett, John Hansen) for secondary talent conviction."
      : "You are the FantasyPoints AI Chief Draft Strategist. You provide decisive, high-IQ draft recommendations grounded strictly in Scott Barrett and John Hansen analytics and the provided FantasyPoints database. Do NOT hallucinate generic web takes or make assumptions outside the provided expert quotes.";

    const userRules = isBestBall
      ? `Best Ball Tournament Rules: Strictly adhere to positional caps (QB: ${rosterNeeds.structure?.targets?.QB || '2-3'}, RB: ${rosterNeeds.structure?.targets?.RB || '5-6'}, WR: ${rosterNeeds.structure?.targets?.WR || '7-9'}, TE: ${rosterNeeds.structure?.targets?.TE || '2-3'}). Prioritize stacking quarterbacks with their pass-catchers. Current Archetype: ${rosterNeeds.structure?.archetype || 'Balanced Best Ball'}.`
      : "Strict anti-early-QB policy in Rounds 1-3. Deprioritize early TEs in Rounds 1-3 except elite targets Brock Bowers and Trey McBride.";

    const promptPayload = {
      system_role: systemRole,
      user_draft_strategy_rules: userRules,
      format: isBestBall ? "Underdog Best Ball (0.5 PPR - 18 Rounds)" : "Sleeper Redraft (1.0 PPR - 15 Rounds)",
      draft_state: {
        current_pick: turnsInfo.currentPickNo,
        current_round: turnsInfo.currentRound,
        user_slot: turnsInfo.userSlot,
        is_on_the_clock: turnsInfo.isOnTheClock,
        picks_until_turn: turnsInfo.picksAway,
        next_turn_pick_number: turnsInfo.nextUserPick,
        intervening_picks_between_turns: turnsInfo.interveningPicks,
        current_roster_counts: rosterNeeds.counts,
        strategy_mode: aiStrategyMode,
        roster_structure: isBestBall ? rosterNeeds.structure : null
      },
      immediate_current_turn_candidates: immediatePayload,
      viable_lookahead_candidates_for_next_turn: lookaheadPayload,
      instructions: `Give a concise 2 to 3 sentence tactical draft recommendation:
1) Immediate Pick: Choose the best player from 'immediate_current_turn_candidates' and cite specific analytical rationale or stacking synergy.
2) Next Turn (${nextPickStr}): You MUST ONLY recommend players from 'viable_lookahead_candidates_for_next_turn' (who have high survival odds). NEVER suggest a top player with near-0% survival odds (like a Round 1 player) for a later turn.
3) Backup Pivot: Name one pivot option from 'immediate_current_turn_candidates' if the primary target is taken.`
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${geminiApiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: JSON.stringify(promptPayload) }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 350
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return {
          ...heuristicAdvice,
          rationale: generatedText.trim(),
          isAiGenerated: true,
          aiModelUsed: `Gemini (${aiModel || 'gemini-2.5-flash'})`
        };
      } else {
        throw new Error('Empty AI response');
      }
    } catch (err) {
      console.warn('Gemini AI Advisor query failed, falling back to heuristic engine:', err);
      return {
        ...heuristicAdvice,
        isAiGenerated: false,
        aiNotice: `⚠️ Gemini call error (${err.message}). Showing heuristic analytics.`
      };
    } finally {
      isAiGenerating = false;
      updateAiAdvisorHudGenerating(false);
    }
  }

  // Unified Dispatcher for AI Strategist Query
  async function queryAiStrategist(turnsInfo, rosterNeeds, topCandidates, heuristicAdvice) {
    if (aiProvider === 'groq') {
      return queryGroqStrategist(turnsInfo, rosterNeeds, topCandidates, heuristicAdvice);
    } else {
      return queryGeminiStrategist(turnsInfo, rosterNeeds, topCandidates, heuristicAdvice);
    }
  }

  function updateAiAdvisorHudGenerating(generating) {
    if (aiDeepReasonBtn) {
      aiDeepReasonBtn.disabled = generating;
      aiDeepReasonBtn.innerHTML = generating 
        ? '<span class="sync-spin-target">⚡</span> Analyzing...' 
        : '<span>✨ Deep Reason</span>';
    }
  }

  // Render AI Advisor HUD UI
  function renderAiAdvisorHudUI(turnsInfo, advice) {
    if (!aiAdvisorHud || !isAiAdvisorVisible) {
      if (aiAdvisorHud) aiAdvisorHud.style.display = 'none';
      return;
    }
    aiAdvisorHud.style.display = 'block';

    // Update Collapsed State
    if (isAiHudCollapsed) {
      aiAdvisorHud.classList.add('collapsed');
      if (aiMinimizeIcon) aiMinimizeIcon.textContent = '▼';
    } else {
      aiAdvisorHud.classList.remove('collapsed');
      if (aiMinimizeIcon) aiMinimizeIcon.textContent = '▲';
    }

    // Update Turn Badge & Clock Status
    aiAdvisorHud.classList.remove('on-the-clock', 'on-deck');
    if (aiTurnBadge) {
      aiTurnBadge.className = 'ai-turn-badge';
      if (turnsInfo.isOnTheClock) {
        aiAdvisorHud.classList.add('on-the-clock');
        aiTurnBadge.classList.add('ai-turn-on-clock');
        if (aiTurnIcon) aiTurnIcon.textContent = '🚨';
        if (aiTurnText) aiTurnText.textContent = `ON THE CLOCK (Rd ${turnsInfo.currentRound}.${turnsInfo.pickInRound} - Pick #${turnsInfo.currentPickNo})`;
      } else if (turnsInfo.isOnDeck) {
        aiAdvisorHud.classList.add('on-deck');
        aiTurnBadge.classList.add('ai-turn-on-deck');
        if (aiTurnIcon) aiTurnIcon.textContent = '⏳';
        if (aiTurnText) aiTurnText.textContent = `ON DECK (${turnsInfo.picksAway} away - Pick #${turnsInfo.currentUserPick})`;
      } else if (turnsInfo.hasSlot && turnsInfo.picksAway !== null) {
        aiTurnBadge.classList.add('ai-turn-waiting');
        if (aiTurnIcon) aiTurnIcon.textContent = '🕒';
        if (aiTurnText) aiTurnText.textContent = `${turnsInfo.picksAway} Picks Away (Pick #${turnsInfo.currentUserPick})`;
      } else {
        aiTurnBadge.classList.add('ai-turn-waiting');
        if (aiTurnIcon) aiTurnIcon.textContent = '⚡';
        if (aiTurnText) aiTurnText.textContent = `Pick #${turnsInfo.currentPickNo} (Choose Slot in Sync Modal)`;
      }
    }

    // Update Next Turn Distance Chip
    if (aiNextTurnDistance && aiNextTurnText) {
      if (turnsInfo.nextUserPick) {
        const slotNote = turnsInfo.hasSlot ? '' : ' (Projected Turn)';
        aiNextTurnText.textContent = `#${turnsInfo.nextUserPick} (${turnsInfo.interveningPicks} picks away)${slotNote}`;
        aiNextTurnDistance.style.display = 'inline-block';
      } else {
        aiNextTurnDistance.style.display = 'none';
      }
    }

    if (!advice || !advice.primary) {
      if (aiHudBody) {
        aiHudBody.innerHTML = `
          <div class="ai-hud-loading">
            <span>⚡</span> Select your draft slot or mark players drafted to activate real-time advisor.
          </div>
        `;
      }
      return;
    }

    const p = advice.primary.player;
    const survivalPct = Math.round(advice.primary.survivalToNext * 100);
    let survivalPillClass = 'survival-safe';
    let survivalPillIcon = '🛡️';
    let survivalPillText = `${survivalPct}% Survival`;

    if (advice.primary.isCliffRisk) {
      survivalPillClass = 'survival-cliff';
      survivalPillIcon = '⚠️';
      survivalPillText = `${survivalPct}% Tier Cliff!`;
    } else if (survivalPct < 65) {
      survivalPillClass = 'survival-med';
      survivalPillIcon = '⚖️';
      survivalPillText = `${survivalPct}% Survival`;
    }

    const signatureBadgesHtml = advice.primary.signatureStances.map(st => {
      const cls = st.replace(/\s+/g, '-').replace(/'/g, '');
      return `<span class="badge-stance ${cls}" style="font-size: 0.7rem; padding: 2px 6px;">${escapeHtml(st)}</span>`;
    }).join(' ');

    const lookaheadItemsHtml = (advice.lookaheadList || []).map(item => {
      const surv = Math.round(item.survivalToNext * 100);
      return `
        <div class="ai-lookahead-item">
          <span class="ai-lookahead-name">
            <span class="badge-pos ${item.player.position}" style="font-size: 0.65rem; padding: 1px 4px;">${item.player.position}</span>
            ${escapeHtml(item.player.player_name)}
          </span>
          <span class="survival-pill survival-safe" style="font-size: 0.68rem; padding: 1px 5px;">
            ${surv}%
          </span>
        </div>
      `;
    }).join('') || '<div style="font-size: 0.75rem; color: var(--text-muted);">No safe targets projected for next turn</div>';

    const contingencyHtml = advice.contingency ? `
      <div class="ai-contingency-box">
        <strong>Pivot / Backup:</strong> ${escapeHtml(advice.contingency.player.player_name)} 
        <span class="badge-pos ${advice.contingency.player.position}" style="font-size: 0.65rem; padding: 1px 4px;">${advice.contingency.player.position}</span>
        (ADP ${advice.contingency.player.sleeper_adp ? advice.contingency.player.sleeper_adp.toFixed(1) : '—'})
      </div>
    ` : '';

    const aiNoticeHtml = advice.aiNotice ? `
      <div style="font-size: 0.72rem; color: #38bdf8; margin-top: 6px; font-style: italic;">
        ${advice.aiNotice}
      </div>
    ` : (advice.isAiGenerated ? `
      <div style="font-size: 0.72rem; color: #a855f7; margin-top: 6px; font-weight: 700;">
        ✨ Deep Analysis via ${advice.aiModelUsed || 'AI Engine'}
      </div>
    ` : '');

    const resetPassesBtnHtml = passedSuggestionsSet.size > 0 ? `
      <button id="btnAiResetPasses" class="btn-ai-reset-passes">
        ↺ Reset ${passedSuggestionsSet.size} passed player${passedSuggestionsSet.size > 1 ? 's' : ''}
      </button>
    ` : '';

    if (aiHudBody) {
      aiHudBody.innerHTML = `
        <div class="ai-advice-grid">
          <!-- Primary Recommendation Card -->
          <div class="ai-primary-card">
            <div>
              <div class="ai-rec-header">
                <span class="ai-rec-label">⭐ Recommended Pick</span>
                <span class="survival-pill ${survivalPillClass}" title="Estimated odds this player is still available at your NEXT draft pick">
                  ${survivalPillIcon} ${survivalPillText}
                </span>
              </div>
              <div class="ai-rec-player">
                <span class="badge-pos ${p.position}">${p.position}</span>
                <span class="ai-rec-name">${escapeHtml(p.player_name)}</span>
              </div>
              <div class="ai-rec-meta">
                <span>Team: <strong>${escapeHtml(p.team)}</strong></span>
                <span>ADP: <strong>${p.sleeper_adp ? p.sleeper_adp.toFixed(1) : '—'}</strong></span>
                <span>Pos Rank: <strong>${escapeHtml(p.pos_rank || '—')}</strong></span>
              </div>
              <div class="ai-rec-badges">
                ${signatureBadgesHtml}
              </div>
            </div>
            <div style="margin-top: 8px;">
              <div class="ai-primary-actions-row">
                <button class="btn-draft-me" style="flex: 1; padding: 6px 10px; font-size: 0.8rem; font-weight: 800;" data-player="${escapeHtml(p.canonical_key)}" onclick="event.stopPropagation();">
                  🏈 Draft for MY Team
                </button>
                <button class="btn-ai-pass" data-player="${escapeHtml(p.canonical_key)}" onclick="event.stopPropagation();" title="Pass on this suggestion and view the next best pick">
                  🚫 Pass
                </button>
              </div>
              ${resetPassesBtnHtml}
            </div>
          </div>

          <!-- Strategic Reasoning & Tactical Rationale -->
          <div class="ai-rationale-card">
            <div class="ai-rationale-title">
              <span>🎯 Tactical Analysis & Lookahead Rationale</span>
            </div>
            <div class="ai-rationale-text">
              ${advice.rationale}
            </div>
            ${contingencyHtml}
            ${aiNoticeHtml}
          </div>

          <!-- Turn Lookahead Queue -->
          <div class="ai-lookahead-card">
            <div class="ai-lookahead-title">
              <span>🔮 Next Turn Safe Targets</span>
            </div>
            <div class="ai-lookahead-list">
              ${lookaheadItemsHtml}
            </div>
          </div>
        </div>
      `;

      const draftMeBtn = aiHudBody.querySelector('.btn-draft-me');
      if (draftMeBtn) {
        draftMeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDraftForMe(p.canonical_key);
        });
      }

      const passBtn = aiHudBody.querySelector('.btn-ai-pass');
      if (passBtn) {
        passBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          passedSuggestionsSet.add(p.canonical_key);
          updateAiDraftAdvisor(false);
        });
      }

      const resetPassesBtn = aiHudBody.querySelector('#btnAiResetPasses');
      if (resetPassesBtn) {
        resetPassesBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          passedSuggestionsSet.clear();
          updateAiDraftAdvisor(false);
        });
      }
    }
  }

  // Update AI Advisor Pipeline
  async function updateAiDraftAdvisor(forceDeepReason = false) {
    if (!groupedPlayersMap || groupedPlayersMap.size === 0) return;

    const totalDraftedCount = myRosterPlayers.size + otherDraftedPlayers.size;
    const currentPickNo = totalDraftedCount + 1;
    const teams = draftMetaObj?.settings?.teams || 12;
    const totalRounds = draftMetaObj?.settings?.rounds || 16;

    const turnsInfo = calculateDraftTurns(currentPickNo, teams, myDraftSlot, totalRounds);
    const rosterNeeds = evaluateRosterNeeds(myRosterPlayers, turnsInfo.currentRound);

    // Available Undrafted Players
    const available = [];
    groupedPlayersMap.forEach(p => {
      if (!myRosterPlayers.has(p.canonical_key) && !otherDraftedPlayers.has(p.canonical_key)) {
        available.push(p);
      }
    });

    const heuristicAdvice = generateHeuristicStrategy(turnsInfo, rosterNeeds, available);
    currentAiAdvice = heuristicAdvice;
    renderAiAdvisorHudUI(turnsInfo, heuristicAdvice);

    const hasKey = (aiProvider === 'groq' && groqApiKey) || (aiProvider === 'gemini' && geminiApiKey);
    const turnKey = `${currentPickNo}_${myDraftSlot}_${turnsInfo.isOnTheClock}_${aiProvider}_${Array.from(passedSuggestionsSet).join(',')}`;
    const shouldAutoDeepReason = (isAiAutoTrigger && turnsInfo.isOnTheClock && turnKey !== lastEvaluatedTurnKey && hasKey);

    if (forceDeepReason || shouldAutoDeepReason) {
      lastEvaluatedTurnKey = turnKey;
      let candidatePool = available.filter(p => !passedSuggestionsSet.has(p.canonical_key));
      if (candidatePool.length === 0) candidatePool = available;

      const scoredCandidates = candidatePool.map(p => ({
        player: p,
        ...evaluateCandidateScore(p, turnsInfo, rosterNeeds, aiStrategyMode)
      })).sort((a, b) => b.score - a.score);

      const aiAdvice = await queryAiStrategist(turnsInfo, rosterNeeds, scoredCandidates, heuristicAdvice);
      currentAiAdvice = aiAdvice;
      renderAiAdvisorHudUI(turnsInfo, aiAdvice);
    }
  }

  function syncProviderModelOptions() {
    if (!aiModelSelect) return;
    aiModelSelect.innerHTML = '';
    
    let isCustom = false;
    if (aiProvider === 'groq') {
      if (groqKeyGroup) groqKeyGroup.style.display = 'block';
      if (geminiKeyGroup) geminiKeyGroup.style.display = 'none';
      const groqModels = [
        { val: 'qwen/qwen3.8-27b', label: 'qwen/qwen3.8-27b (Recommended - Latest & Sharpest ~300ms)' },
        { val: 'qwen/qwen3.6-27b', label: 'qwen/qwen3.6-27b (Fast & Stable ~300ms)' },
        { val: 'custom', label: 'Custom Groq Model ID...' }
      ];
      groqModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.val;
        opt.textContent = m.label;
        if (aiModel === m.val || (!aiModel && m.val === 'qwen/qwen3.8-27b')) {
          opt.selected = true;
        }
        aiModelSelect.appendChild(opt);
      });
      if (aiModel && !['qwen/qwen3.8-27b', 'qwen/qwen3.6-27b'].includes(aiModel)) {
        aiModelSelect.value = 'custom';
        isCustom = true;
        if (aiCustomModelInput) aiCustomModelInput.value = aiModel;
      }
    } else {
      if (groqKeyGroup) groqKeyGroup.style.display = 'none';
      if (geminiKeyGroup) geminiKeyGroup.style.display = 'block';
      const geminiModels = [
        { val: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Fastest & Recommended)' },
        { val: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
        { val: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
        { val: 'custom', label: 'Custom Gemini Model ID...' }
      ];
      geminiModels.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.val;
        opt.textContent = m.label;
        if (aiModel === m.val || (!aiModel && m.val === 'gemini-2.5-flash')) {
          opt.selected = true;
        }
        aiModelSelect.appendChild(opt);
      });
      if (aiModel && !['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'].includes(aiModel)) {
        aiModelSelect.value = 'custom';
        isCustom = true;
        if (aiCustomModelInput) aiCustomModelInput.value = aiModel;
      }
    }

    if (customModelGroup) {
      customModelGroup.style.display = isCustom ? 'block' : 'none';
    }
  }

  // Initialize AI Advisor Event Listeners
  function initAiAdvisorControls() {
    if (toggleAiAdvisorBtn) {
      toggleAiAdvisorBtn.addEventListener('click', () => {
        isAiAdvisorVisible = !isAiAdvisorVisible;
        localStorage.setItem('fp_ai_advisor_visible', isAiAdvisorVisible);
        if (isAiAdvisorVisible) {
          toggleAiAdvisorBtn.classList.add('active');
        } else {
          toggleAiAdvisorBtn.classList.remove('active');
        }
        updateAiDraftAdvisor();
      });
    }

    if (aiMinimizeBtn) {
      aiMinimizeBtn.addEventListener('click', () => {
        isAiHudCollapsed = !isAiHudCollapsed;
        localStorage.setItem('fp_ai_hud_collapsed', isAiHudCollapsed);
        if (currentAiAdvice) {
          const totalDraftedCount = myRosterPlayers.size + otherDraftedPlayers.size;
          const teams = draftMetaObj?.settings?.teams || 12;
          const turnsInfo = calculateDraftTurns(totalDraftedCount + 1, teams, myDraftSlot);
          renderAiAdvisorHudUI(turnsInfo, currentAiAdvice);
        }
      });
    }

    if (aiDeepReasonBtn) {
      aiDeepReasonBtn.addEventListener('click', () => {
        updateAiDraftAdvisor(true);
      });
    }

    if (aiRefreshBtn) {
      aiRefreshBtn.addEventListener('click', () => {
        updateAiDraftAdvisor(false);
      });
    }

    if (aiProviderSelect) {
      aiProviderSelect.value = aiProvider;
      aiProviderSelect.addEventListener('change', (e) => {
        aiProvider = e.target.value;
        aiModel = (aiProvider === 'groq') ? 'qwen/qwen3.8-27b' : 'gemini-2.5-flash';
        syncProviderModelOptions();
      });
    }

    if (aiModelSelect) {
      aiModelSelect.addEventListener('change', (e) => {
        if (customModelGroup) {
          customModelGroup.style.display = (e.target.value === 'custom') ? 'block' : 'none';
        }
      });
    }

    // AI Settings Modal
    if (openAiSettingsBtn && aiSettingsModal) {
      openAiSettingsBtn.addEventListener('click', () => {
        if (aiProviderSelect) aiProviderSelect.value = aiProvider;
        if (groqApiKeyInput) groqApiKeyInput.value = groqApiKey;
        if (geminiApiKeyInput) geminiApiKeyInput.value = geminiApiKey;
        syncProviderModelOptions();
        if (aiStrategyModeSelect) aiStrategyModeSelect.value = aiStrategyMode;
        if (aiAutoTriggerCheck) aiAutoTriggerCheck.checked = isAiAutoTrigger;
        if (aiSettingsStatusMsg) aiSettingsStatusMsg.textContent = '';
        aiSettingsModal.classList.add('open');
        aiSettingsModal.setAttribute('aria-hidden', 'false');
      });
    }

    if (aiSettingsCloseBtn && aiSettingsModal) {
      aiSettingsCloseBtn.addEventListener('click', () => {
        aiSettingsModal.classList.remove('open');
        aiSettingsModal.setAttribute('aria-hidden', 'true');
      });
    }

    if (saveAiSettingsBtn) {
      saveAiSettingsBtn.addEventListener('click', () => {
        if (aiProviderSelect) {
          aiProvider = aiProviderSelect.value;
          localStorage.setItem('fp_ai_provider', aiProvider);
        }
        if (groqApiKeyInput) {
          groqApiKey = groqApiKeyInput.value.trim();
          localStorage.setItem('fp_groq_api_key', groqApiKey);
        }
        if (geminiApiKeyInput) {
          geminiApiKey = geminiApiKeyInput.value.trim();
          localStorage.setItem('fp_gemini_api_key', geminiApiKey);
        }
        if (aiModelSelect) {
          if (aiModelSelect.value === 'custom' && aiCustomModelInput) {
            aiModel = aiCustomModelInput.value.trim() || (aiProvider === 'groq' ? 'qwen/qwen3.8-27b' : 'gemini-2.5-flash');
          } else {
            aiModel = aiModelSelect.value;
          }
          localStorage.setItem('fp_ai_model', aiModel);
        }
        if (aiStrategyModeSelect) {
          aiStrategyMode = aiStrategyModeSelect.value;
          localStorage.setItem('fp_ai_strategy', aiStrategyMode);
        }
        if (aiAutoTriggerCheck) {
          isAiAutoTrigger = aiAutoTriggerCheck.checked;
          localStorage.setItem('fp_ai_auto_trigger', isAiAutoTrigger);
        }

        if (aiSettingsStatusMsg) {
          aiSettingsStatusMsg.textContent = '✅ Settings saved successfully!';
        }

        setTimeout(() => {
          if (aiSettingsModal) {
            aiSettingsModal.classList.remove('open');
            aiSettingsModal.setAttribute('aria-hidden', 'true');
          }
          updateAiDraftAdvisor();
        }, 600);
      });
    }
  }

  syncProviderModelOptions();
  initAiAdvisorControls();

  // Auto-Resume Active Draft Connection on page load
  if (activeDraftId) {
    connectToSleeperDraft(activeDraftId);
  }

  if (typeof window !== 'undefined') {
    window._testHooks = {
      evaluateBestBallRosterStructure,
      computeRosterStackContext,
      getPlayerStackBadge
    };
  }
});
