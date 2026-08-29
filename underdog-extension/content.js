// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Underdog draft detector loaded on ' + window.location.href);

  const channel = new BroadcastChannel('underdog-sync');
  let lastPicksCount = -1;
  let syncStatusEl = null;

  function createFloatingBadge() {
    if (document.getElementById('fp-ud-sync-badge')) {
      syncStatusEl = document.getElementById('fp-ud-sync-badge');
      return;
    }
    syncStatusEl = document.createElement('div');
    syncStatusEl.id = 'fp-ud-sync-badge';
    syncStatusEl.style.cssText = 'position: fixed; bottom: 16px; right: 16px; z-index: 9999999; background: #0f172a; border: 1px solid #10b981; color: #6ee7b7; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; transition: all 0.2s ease;';
    syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Ready</span>';
    syncStatusEl.title = 'FantasyPoints Underdog Live Relay is active';
    
    document.body.appendChild(syncStatusEl);
  }

  function getDraftId() {
    const match = window.location.pathname.match(/\/drafts?\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : 'underdog-draft';
  }

  function parseDraftPicks() {
    const picks = [];
    const seenNames = new Set();
    
    // Method 1: Scan all draft board cells and pick tiles
    const pickElements = document.querySelectorAll(
      '[data-testid*="pick"], [data-testid*="draft-cell"], [data-testid*="player-card"], [class*="draftCell"], [class*="pickCard"], [class*="DraftBoard_cell"], [class*="DraftPick"], [class*="PlayerCard"], [class*="PickTile"]'
    );

    if (pickElements.length > 0) {
      pickElements.forEach((el, index) => {
        const text = (el.innerText || el.textContent || '').trim();
        if (!text) return;
        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
        
        const posMatch = text.match(/\b(QB|RB|WR|TE)\b/i);
        const isUser = el.classList.contains('user-pick') || text.includes('YOU') || text.includes('My Team') || el.querySelector('[class*="user"], [class*="myPick"], [class*="isUser"]') !== null;
        
        let playerName = lines[0];
        if (/^\d+$/.test(playerName) && lines.length > 1) {
          playerName = lines[1];
        }

        // Avoid clock / header text
        if (playerName && playerName.length > 2 && !playerName.includes('Clock') && !playerName.includes('Draft') && !playerName.includes('Round') && !seenNames.has(playerName)) {
          seenNames.add(playerName);
          picks.push({
            pick_no: index + 1,
            player_name: playerName,
            position: posMatch ? posMatch[1].toUpperCase() : null,
            is_user: isUser
          });
        }
      });
    }

    // Method 2: Scan Draft Log / Recent Picks feed or History list
    if (picks.length === 0) {
      const rows = document.querySelectorAll('[class*="pick-row"], [class*="PickRow"], [class*="history-row"], [class*="HistoryItem"], [data-testid*="history-item"], tr');
      rows.forEach((row, idx) => {
        const text = (row.innerText || row.textContent || '').trim();
        const posMatch = text.match(/\b(QB|RB|WR|TE)\b/i);
        const nameMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
        const isUser = text.includes('YOU') || text.includes('My Team') || row.classList.contains('is-me');

        if (nameMatch && !seenNames.has(nameMatch[1])) {
          seenNames.add(nameMatch[1]);
          picks.push({
            pick_no: idx + 1,
            player_name: nameMatch[1],
            position: posMatch ? posMatch[1].toUpperCase() : null,
            is_user: isUser
          });
        }
      });
    }

    return picks;
  }

  function broadcastPicks() {
    createFloatingBadge();
    const draftId = getDraftId();
    const picks = parseDraftPicks();

    if (syncStatusEl) {
      if (picks.length > 0) {
        syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks)</span>';
        syncStatusEl.style.borderColor = '#10b981';
      } else {
        const isDraftUrl = window.location.pathname.includes('draft') || window.location.pathname.includes('contest') || window.location.pathname.includes('tournament');
        if (isDraftUrl) {
          syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Draft Room Ready</span>';
          syncStatusEl.style.borderColor = '#f59e0b';
        } else {
          syncStatusEl.innerHTML = '<span>🐶</span><span>FantasyPoints Relay Active</span>';
          syncStatusEl.style.borderColor = '#38bdf8';
        }
      }
    }

    if (picks.length !== lastPicksCount && picks.length > 0) {
      lastPicksCount = picks.length;
      console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks...', picks);
      channel.postMessage({
        type: 'UNDERDOG_PICKS_SYNC',
        draft_id: draftId,
        picks: picks,
        timestamp: Date.now()
      });
    }
  }

  // Active polling & MutationObserver
  setInterval(broadcastPicks, 1000);

  const observer = new MutationObserver(() => {
    broadcastPicks();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Listen for sync ping from companion tab
  channel.onmessage = (e) => {
    if (e.data && e.data.type === 'REQUEST_UNDERDOG_SYNC') {
      console.log('[FantasyPoints Relay] Companion requested sync. Responding with live state...');
      lastPicksCount = -1;
      broadcastPicks();
    }
  };
})();
