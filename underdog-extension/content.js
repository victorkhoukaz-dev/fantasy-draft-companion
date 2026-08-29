// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {
  'use strict';

  console.log('[FantasyPoints Relay] Underdog draft detector initialized.');

  const channel = new BroadcastChannel('underdog-sync');
  let lastPicksCount = -1;
  let syncStatusEl = null;

  function createFloatingBadge() {
    if (document.getElementById('fp-ud-sync-badge')) return;
    syncStatusEl = document.createElement('div');
    syncStatusEl.id = 'fp-ud-sync-badge';
    syncStatusEl.style.cssText = 'position: fixed; bottom: 14px; right: 16px; z-index: 999999; background: #0f172a; border: 1px solid #10b981; color: #6ee7b7; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 6px; pointer-events: none; transition: all 0.3s ease;';
    syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints Sync: Ready</span>';
    document.body.appendChild(syncStatusEl);
  }

  function getDraftId() {
    const match = window.location.pathname.match(/\/drafts?\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : 'underdog-draft';
  }

  function parseDraftPicks() {
    const picks = [];
    
    // Method 1: Scan draft board cells and pick tiles
    const pickElements = document.querySelectorAll(
      '[data-testid*="pick"], [data-testid*="draft-cell"], [class*="draftCell"], [class*="pickCard"], [class*="DraftBoard_cell"], [class*="DraftPick"]'
    );

    if (pickElements.length > 0) {
      pickElements.forEach((el, index) => {
        const text = el.innerText || el.textContent || '';
        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const posMatch = text.match(/\b(QB|RB|WR|TE)\b/i);
          const isUser = el.classList.contains('user-pick') || text.includes('YOU') || el.querySelector('[class*="user"], [class*="myPick"]') !== null;
          
          let playerName = lines[0];
          if (/^\d+$/.test(playerName) && lines.length > 1) {
            playerName = lines[1];
          }

          if (playerName && playerName.length > 2 && !playerName.includes('Clock') && !playerName.includes('Draft')) {
            picks.push({
              pick_no: index + 1,
              player_name: playerName,
              position: posMatch ? posMatch[1].toUpperCase() : null,
              is_user: isUser
            });
          }
        }
      });
    }

    // Method 2: Scan Draft Log / Recent Picks feed
    if (picks.length === 0) {
      const rows = document.querySelectorAll('[class*="pick-row"], [class*="PickRow"], [class*="history-row"], [class*="HistoryItem"], [data-testid*="history-item"]');
      rows.forEach((row, idx) => {
        const text = row.innerText || row.textContent || '';
        const posMatch = text.match(/\b(QB|RB|WR|TE)\b/i);
        const nameMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)/);
        const isUser = text.includes('YOU') || row.classList.contains('is-me');

        if (nameMatch) {
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
        syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Waiting for draft start</span>';
        syncStatusEl.style.borderColor = '#f59e0b';
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
