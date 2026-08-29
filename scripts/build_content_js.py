import os
import json

adp_path = os.path.join(os.getcwd(), 'underdog_adp.json')
with open(adp_path, 'r', encoding='utf-8') as f:
    adp_data = json.load(f)

player_list = []
players_dict = adp_data.get('players', {})
for p in players_dict.values():
    player_list.append({
        'name': p['full_name'],
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
  const channel = new BroadcastChannel('underdog-sync');
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
    syncStatusEl.title = 'Click to inspect synced picks in Console';
    
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

  function normalizeText(str) {{
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }}

  function parseDraftPicks() {{
    try {{
      const picks = [];
      const seenKeys = new Set();
      
      // Strategy 1: Search all elements across the page for known player names
      const candidates = document.querySelectorAll(
        '[class*="pick"], [class*="Pick"], [class*="cell"], [class*="Cell"], [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], [class*="player"], [class*="Player"], [data-testid*="pick"], [data-testid*="cell"], tr, li, div'
      );

      candidates.forEach(el => {{
        const text = (el.innerText || el.textContent || '').trim();
        if (!text || text.length > 250) return; // ignore giant containers

        for (let i = 0; i < KNOWN_PLAYERS.length; i++) {{
          const kp = KNOWN_PLAYERS[i];
          if (text.includes(kp.name)) {{
            const key = normalizeText(kp.name);
            if (!seenKeys.has(key)) {{
              seenKeys.add(key);
              
              const isUser = text.includes('YOU') || text.includes('My Team') || el.classList.contains('is-user') || el.classList.contains('user-pick') || el.querySelector('[class*="user"], [class*="myPick"], [class*="isUser"]') !== null;

              picks.push({{
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: isUser
              }});
            }}
            break;
          }}
        }}
      }});

      // Strategy 2: If few or no picks found via elements, scan whole page text
      if (picks.length === 0 && document.body) {{
        const bodyText = document.body.innerText || '';
        KNOWN_PLAYERS.forEach(kp => {{
          if (bodyText.includes(kp.name)) {{
            const key = normalizeText(kp.name);
            if (!seenKeys.has(key)) {{
              seenKeys.add(key);
              picks.push({{
                pick_no: picks.length + 1,
                player_name: kp.name,
                position: kp.pos,
                team: kp.team,
                is_user: false
              }});
            }}
          }}
        }});
      }}

      return picks;
    }} catch (err) {{
      console.warn('[FantasyPoints Relay] parse error:', err);
      return [];
    }}
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
        console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks to Companion...');
        channel.postMessage({{
          type: 'UNDERDOG_PICKS_SYNC',
          draft_id: draftId,
          picks: picks,
          timestamp: Date.now()
        }});
      }}
    }} catch (err) {{
      console.warn('[FantasyPoints Relay] tick error:', err);
    }}
  }}

  // Safe 1.5s interval
  setInterval(tick, 1500);
  setTimeout(tick, 1200);

  // Listen for sync ping from companion
  channel.onmessage = (e) => {{
    if (e.data && e.data.type === 'REQUEST_UNDERDOG_SYNC') {{
      lastPicksCount = -1;
      tick();
    }}
  }};
}})();
"""

out_path = os.path.join(os.getcwd(), 'underdog-extension', 'content.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content_js_template)

print(f"Generated {out_path} with {len(player_list)} known players successfully!")
