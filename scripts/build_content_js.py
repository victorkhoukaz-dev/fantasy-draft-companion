import os
import json

adp_path = os.path.join(os.getcwd(), 'underdog_adp.json')
with open(adp_path, 'r', encoding='utf-8') as f:
    adp_data = json.load(f)

player_list = []
players_dict = adp_data.get('players', {})
for p in players_dict.values():
    full_name = p['full_name']
    
    # Generate variations
    clean_name = full_name.replace("'", "").replace("’", "").replace(".", "").strip()
    no_suffix = full_name.replace(" Jr.", "").replace(" Jr", "").replace(" III", "").replace(" II", "").strip()
    
    parts = full_name.split()
    short_name = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else full_name

    aliases = list(set([full_name, clean_name, no_suffix, short_name]))

    player_list.append({
        'name': full_name,
        'aliases': aliases,
        'pos': p.get('position', 'FLEX'),
        'team': p.get('team', 'NFL')
    })

players_json = json.dumps(player_list)

content_js_template = f"""// FantasyPoints Underdog Live Draft Relay
// Seamlessly syncs live picks from Underdog Fantasy draft rooms into the FantasyPoints Draft Companion

(function() {{
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = {players_json};
  let lastPicksCount = -1;
  let syncStatusEl = null;

  function initBadge() {{
    if (document.getElementById('fp-ud-sync-badge')) {{
      syncStatusEl = document.getElementById('fp-ud-sync-badge');
      return;
    }}
    if (!document.body) return;

    syncStatusEl = document.createElement('div');
    syncStatusEl.id = 'fp-ud-sync-badge';
    syncStatusEl.style.cssText = 'position: fixed; bottom: 16px; right: 16px; z-index: 9999999; background: #0f172a; border: 1px solid #10b981; color: #6ee7b7; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; box-shadow: 0 4px 16px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; transition: all 0.2s ease;';
    syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Active</span>';
    syncStatusEl.title = 'Click to inspect detected picks in console';
    
    syncStatusEl.addEventListener('click', () => {{
      const picks = parseDraftPicks();
      console.log('[FantasyPoints Relay] Current Detected Picks (' + picks.length + '):', picks);
      if (picks.length > 0) console.table(picks);
    }});

    document.body.appendChild(syncStatusEl);
  }}

  function getDraftId() {{
    const match = window.location.pathname.match(/\\/drafts?\\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : 'underdog-draft';
  }}

  function normalize(str) {{
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }}

  function isInsideAvailableQueue(el) {{
    let cur = el;
    while (cur && cur !== document.body) {{
      const cls = (typeof cur.className === 'string' ? cur.className : '').toLowerCase();
      const id = (cur.id || '').toLowerCase();
      const testId = (cur.getAttribute && cur.getAttribute('data-testid') || '').toLowerCase();
      
      if (
        cls.includes('queue') || cls.includes('available') || cls.includes('rankings') || 
        cls.includes('playerlist') || cls.includes('player-list') || cls.includes('search') ||
        id.includes('queue') || id.includes('available') || id.includes('player-list') ||
        testId.includes('player-list') || testId.includes('queue')
      ) {{
        return true;
      }}
      cur = cur.parentElement;
    }}
    return false;
  }}

  function parseDraftPicks() {{
    try {{
      const picks = [];
      const seenKeys = new Set();
      
      // Target elements strictly inside the draft board / completed pick cells
      const boardCells = document.querySelectorAll(
        '[class*="board"] [class*="cell"], [class*="Board"] [class*="Cell"], [class*="draft-board"] div, [class*="DraftBoard"] div, [class*="pickCard"], [class*="DraftPick"], [class*="PickTile"], [data-testid*="draft-cell"], [data-testid*="pick"]'
      );

      const targetElements = (boardCells.length > 0) ? boardCells : document.querySelectorAll('[class*="cell"], [class*="Cell"], [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], div');

      targetElements.forEach(el => {{
        // Exclude elements inside the available player queue/rankings list!
        if (isInsideAvailableQueue(el)) return;
        if (el.children.length > 6) return;

        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 140) return;

        const normText = normalize(text);

        for (let i = 0; i < KNOWN_PLAYERS.length; i++) {{
          const kp = KNOWN_PLAYERS[i];
          const matched = kp.aliases.some(alias => {{
            const normAlias = normalize(alias);
            return normText.includes(normAlias);
          }});

          if (matched) {{
            const key = normalize(kp.name);
            if (!seenKeys.has(key)) {{
              seenKeys.add(key);
              
              const isUser = text.includes('YOU') || text.includes('My Team') || el.classList.contains('is-user') || el.classList.contains('user-pick') || (el.parentElement && el.parentElement.classList.contains('user-pick'));

              picks.push({{
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: Boolean(isUser)
              }});
            }}
            break;
          }}
        }}
      }});

      return picks;
    }} catch (err) {{
      console.warn('[FantasyPoints Relay] parse error:', err);
      return [];
    }}
  }}

  function sendPicks(picks, draftId) {{
    const payload = {{
      type: 'UNDERDOG_PICKS_SYNC',
      draft_id: draftId,
      picks: picks,
      timestamp: Date.now()
    }};

    // 1. Extension Background Router
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {{
      try {{
        chrome.runtime.sendMessage(payload);
      }} catch(e) {{}}
    }}

    // 2. BroadcastChannel
    try {{
      const channel = new BroadcastChannel('underdog-sync');
      channel.postMessage(payload);
    }} catch(e) {{}}

    // 3. Window postMessage
    window.postMessage(payload, '*');
  }}

  function tick() {{
    try {{
      if (!syncStatusEl && document.body) {{
        initBadge();
      }}

      const picks = parseDraftPicks();
      const draftId = getDraftId();

      if (syncStatusEl) {{
        if (picks.length > 0) {{
          syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks)</span>';
          syncStatusEl.style.borderColor = '#10b981';
        }} else {{
          syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Relay Ready</span>';
          syncStatusEl.style.borderColor = '#f59e0b';
        }}
      }}

      if (picks.length !== lastPicksCount && picks.length > 0) {{
        lastPicksCount = picks.length;
        console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks to Companion...', picks);
        sendPicks(picks, draftId);
      }}
    }} catch (err) {{
      console.warn('[FantasyPoints Relay] tick error:', err);
    }}
  }}

  // Safe 1.5s interval
  setInterval(tick, 1500);
  setTimeout(tick, 1000);

  // Listen for sync ping from companion
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {{
    chrome.runtime.onMessage.addListener((msg) => {{
      if (msg && msg.type === 'REQUEST_UNDERDOG_SYNC') {{
        lastPicksCount = -1;
        tick();
      }}
    }});
  }}
}})();
"""

out_path = os.path.join(os.getcwd(), 'underdog-extension', 'content.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content_js_template)

print(f"Generated clean queue-filtered {out_path} successfully!")
