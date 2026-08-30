import os
import json
import re

adp_path = os.path.join(os.getcwd(), 'underdog_adp.json')
with open(adp_path, 'r', encoding='utf-8') as f:
    adp_data = json.load(f)

players_dict = adp_data.get('players', {})

def normalize(str_val):
    return re.sub(r'[^a-z0-9]', '', (str_val or '').lower())

# Check short name collisions
short_counts = {}
for p in players_dict.values():
    full_name = p['full_name']
    parts = full_name.split()
    short = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else full_name
    norm_short = normalize(short)
    short_counts[norm_short] = short_counts.get(norm_short, 0) + 1

player_list = []
for p in players_dict.values():
    full_name = p['full_name']
    no_suffix = re.sub(r'(?i)\b(jr\.?|sr\.?|iii|ii|iv)\b', '', full_name).strip()
    
    parts = full_name.split()
    short_name = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else full_name
    short_no_suffix = f"{parts[0][0]}. {' '.join(no_suffix.split()[1:])}" if len(no_suffix.split()) > 1 else short_name
    
    norm_short = normalize(short_name)
    is_ambiguous = short_counts.get(norm_short, 0) > 1

    player_list.append({
        'name': full_name,
        'clean': normalize(full_name),
        'no_suffix': normalize(no_suffix),
        'short': norm_short,
        'short_no_suffix': normalize(short_no_suffix),
        'is_ambiguous': is_ambiguous,
        'pos': p.get('position', 'FLEX').upper(),
        'team': p.get('team', 'NFL').upper()
    })

# Sort players by clean name length descending so longer specific names match first
player_list.sort(key=lambda x: len(x['clean']), reverse=True)
players_json = json.dumps(player_list)

content_js_template = f"""// FantasyPoints Underdog Live Draft Relay
// Ultra-lightweight, high-accuracy live pick scanner for Underdog Fantasy draft rooms

(function() {{
  'use strict';

  console.log('[FantasyPoints Relay] Extension active on ' + window.location.hostname);

  const KNOWN_PLAYERS = {players_json};
  let lastPicksCount = -1;
  let syncStatusEl = null;
  let isScanning = false;

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
    syncStatusEl.title = 'Click to inspect detected picks';
    
    syncStatusEl.addEventListener('click', () => {{
      const picks = parseDraftPicks();
      const myPicks = picks.filter(p => p.is_user);
      const myNames = myPicks.map(p => p.player_name).join(', ') || 'None detected yet';
      alert(
        '🏈 FantasyPoints Underdog Live Relay\\n\\n' +
        'Total Picks Found: ' + picks.length + '\\n' +
        'My Roster (' + myPicks.length + ' players): ' + myNames + '\\n\\n' +
        'Opponent Picks: ' + (picks.length - myPicks.length) + ' players taken'
      );
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
      const aria = (cur.getAttribute && cur.getAttribute('aria-label') || '').toLowerCase();
      
      // Do NOT filter out roster panel even if it has some generic classes
      let rect = null;
      try {{ rect = cur.getBoundingClientRect(); }} catch(e) {{}}
      const winWidth = window.innerWidth || 1920;
      if (rect && rect.left > (winWidth * 0.55)) {{
        return false;
      }}

      if (
        cls.includes('playerlist') || cls.includes('player-list') || 
        cls.includes('available') || cls.includes('rankings') || cls.includes('ranking') ||
        cls.includes('search') || cls.includes('queue') ||
        id.includes('player-list') || id.includes('playerlist') ||
        id.includes('available') || id.includes('search') || id.includes('queue') ||
        testId.includes('player-list') || testId.includes('playerlist') ||
        testId.includes('available') || testId.includes('search') || testId.includes('queue') ||
        aria.includes('available') || aria.includes('search') || aria.includes('queue')
      ) {{
        return true;
      }}
      cur = cur.parentElement;
    }}
    return false;
  }}

  function matchPlayerInText(normText, rawUpperText) {{
    for (let i = 0; i < KNOWN_PLAYERS.length; i++) {{
      const kp = KNOWN_PLAYERS[i];
      
      // 1. Exact Full Name Match (e.g. "christianmccaffrey", "chrisolave", "zayflowers")
      if (normText.includes(kp.clean)) {{
        return kp;
      }}
      
      // 2. Name without Suffix Match (e.g. "brianthomas", "tyronetracy", "marvinharrison")
      if (kp.no_suffix.length > 5 && normText.includes(kp.no_suffix)) {{
        return kp;
      }}

      // 3. Unambiguous Short Initial Match (e.g. "c. mccaffrey", "c. olave", "z. flowers")
      if (!kp.is_ambiguous && kp.short.length > 4 && normText.includes(kp.short)) {{
        return kp;
      }}

      // 4. Ambiguous Short Initial Match WITH Team or Position Verification
      if (kp.is_ambiguous && (normText.includes(kp.short) || normText.includes(kp.short_no_suffix))) {{
        if (rawUpperText.includes(kp.team) || rawUpperText.includes(kp.pos)) {{
          return kp;
        }}
      }}
    }}
    return null;
  }}

  function parseDraftPicks() {{
    try {{
      const picks = [];
      const seenKeys = new Set();
      const myRosterKeys = new Set();

      const winWidth = window.innerWidth || document.documentElement.clientWidth || 1920;

      // 1. Scan Right Roster Panel for User Picks (100% User Roster)
      const allTextNodes = document.querySelectorAll('p, span, div, li, tr, h1, h2, h3, h4, h5, h6, a');

      allTextNodes.forEach(el => {{
        if (el.children.length > 3) return;

        const text = (el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 70) return;

        const normText = normalize(text);
        const rawUpper = text.toUpperCase();
        const matched = matchPlayerInText(normText, rawUpper);

        if (matched) {{
          const key = normalize(matched.name);
          let rect = null;
          try {{ rect = el.getBoundingClientRect(); }} catch(e) {{}}

          // If located in right third of screen (Roster sidebar)
          if (rect && rect.left > (winWidth * 0.55) && rect.top > 80) {{
            if (!myRosterKeys.has(key)) {{
              myRosterKeys.add(key);
              seenKeys.add(key);
              picks.push({{
                player_name: matched.name,
                position: matched.pos,
                team: matched.team,
                is_user: true
              }});
            }}
          }}
        }}
      }});

      // 2. Scan Top Ticker, Header Carousel, Board Grid, and Completed Picks
      const candidateElements = document.querySelectorAll(
        'header div, nav div, [class*="ticker"] div, [class*="Ticker"] div, [class*="carousel"] div, [class*="Carousel"] div, [class*="board"] div, [class*="Board"] div, [class*="grid"] div, [class*="Grid"] div, [class*="column"] div, [class*="Column"] div, [class*="card"], [class*="Card"], [class*="tile"], [class*="Tile"], [class*="pick"], [class*="Pick"], [data-testid*="pick"], [data-testid*="cell"]'
      );

      candidateElements.forEach(el => {{
        if (isInsideAvailableQueue(el)) return;
        if (el.children.length > 5) return;

        const text = (el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 90) return;

        const normText = normalize(text);
        const rawUpper = text.toUpperCase();
        const matched = matchPlayerInText(normText, rawUpper);

        if (matched) {{
          const key = normalize(matched.name);
          if (!seenKeys.has(key)) {{
            seenKeys.add(key);
            picks.push({{
              player_name: matched.name,
              position: matched.pos,
              team: matched.team,
              is_user: myRosterKeys.has(key)
            }});
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

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {{
      try {{
        chrome.runtime.sendMessage(payload);
      }} catch(e) {{}}
    }}

    try {{
      const channel = new BroadcastChannel('underdog-sync');
      channel.postMessage(payload);
    }} catch(e) {{}}

    window.postMessage(payload, '*');
  }}

  function tick() {{
    if (isScanning) return;
    isScanning = true;
    try {{
      if (!syncStatusEl && document.body) {{
        initBadge();
      }}

      const picks = parseDraftPicks();
      const draftId = getDraftId();

      if (syncStatusEl) {{
        const userPicks = picks.filter(p => p.is_user);
        if (picks.length > 0) {{
          syncStatusEl.innerHTML = '<span>🟢</span><span>FantasyPoints: Syncing (#' + picks.length + ' picks, ' + userPicks.length + ' mine)</span>';
          syncStatusEl.style.borderColor = '#10b981';
        }} else {{
          syncStatusEl.innerHTML = '<span>🟡</span><span>FantasyPoints: Relay Ready</span>';
          syncStatusEl.style.borderColor = '#f59e0b';
        }}
      }}

      if (picks.length !== lastPicksCount && picks.length > 0) {{
        lastPicksCount = picks.length;
        console.log('[FantasyPoints Relay] Broadcasting ' + picks.length + ' Underdog picks (' + picks.filter(p=>p.is_user).length + ' mine)...', picks);
        sendPicks(picks, draftId);
      }}
    }} catch (err) {{
      console.warn('[FantasyPoints Relay] tick error:', err);
    }} finally {{
      isScanning = false;
    }}
  }}

  setInterval(tick, 1200);
  setTimeout(tick, 400);

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

print(f"Generated unified {out_path} successfully!")
