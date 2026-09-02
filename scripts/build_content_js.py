import os
import json
import re

adp_path = os.path.join(os.getcwd(), 'underdog_adp.json')
with open(adp_path, 'r', encoding='utf-8') as f:
    adp_data = json.load(f)

players_dict = adp_data.get('players', {})

def normalize(str_val):
    return re.sub(r'[^a-z0-9]', '', (str_val or '').lower())

def normalize_no_suffix(str_val):
    cleaned = re.sub(r'(?i)\b(jr|sr|iii|ii|iv|v)\b\.?', '', str(str_val or ''))
    return re.sub(r'[^a-z0-9]', '', cleaned.lower())

# Check short name collisions
short_counts = {}
for p in players_dict.values():
    full_name = p['full_name']
    parts = full_name.split()
    short = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else full_name
    norm_short = normalize_no_suffix(short)
    short_counts[norm_short] = short_counts.get(norm_short, 0) + 1

player_list = []
for p in players_dict.values():
    full_name = p['full_name']
    no_suffix = re.sub(r'(?i)\b(jr|sr|iii|ii|iv|v)\b\.?', '', full_name).strip()
    
    parts = full_name.split()
    parts_no_suffix = no_suffix.split()
    
    short_name = f"{parts[0][0]}. {' '.join(parts[1:])}" if len(parts) > 1 else full_name
    short_no_suffix = f"{parts[0][0]}. {' '.join(parts_no_suffix[1:])}" if len(parts_no_suffix) > 1 else short_name
    
    last_first = f"{parts_no_suffix[-1]} {' '.join(parts_no_suffix[:-1])}" if len(parts_no_suffix) > 1 else no_suffix
    last_first_short = f"{parts_no_suffix[-1]} {parts[0][0]}" if len(parts_no_suffix) > 1 else no_suffix

    norm_short = normalize_no_suffix(short_name)
    is_ambiguous = short_counts.get(norm_short, 0) > 1

    player_list.append({
        'name': full_name,
        'clean': normalize(full_name),
        'no_suffix': normalize(no_suffix),
        'inverted': normalize(last_first),
        'inverted_short': normalize(last_first_short),
        'short': norm_short,
        'short_no_suffix': normalize(short_no_suffix),
        'last_name': normalize(parts_no_suffix[-1]) if len(parts_no_suffix) > 0 else normalize(no_suffix),
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

  function normalizeNoSuffix(str) {{
    return (str || '').toLowerCase()
      .replace(/\\b(jr|sr|iii|ii|iv|v)\\b\\.?/gi, '')
      .replace(/[^a-z0-9]/g, '');
  }}

  function matchPlayerInText(normText, normNoSuffix, rawUpperText) {{
    for (let i = 0; i < KNOWN_PLAYERS.length; i++) {{
      const kp = KNOWN_PLAYERS[i];
      
      // 1. Exact Full Name Match (e.g. "lutherburdeniii", "brianthomasjr", "marvinharrisonjr")
      if (normText.includes(kp.clean) || normNoSuffix.includes(kp.clean)) {{
        return kp;
      }}
      
      // 2. Name without Suffix Match (e.g. "lutherburden", "brianthomas", "marvinharrison")
      if (kp.no_suffix.length >= 5 && (normText.includes(kp.no_suffix) || normNoSuffix.includes(kp.no_suffix))) {{
        return kp;
      }}

      // 3. Inverted Name Match ("burdenluther", "thomasbrian", "harrisonmarvin")
      if (kp.inverted.length >= 5 && (normText.includes(kp.inverted) || normNoSuffix.includes(kp.inverted))) {{
        return kp;
      }}

      // 4. Inverted Short Match ("burdenl", "thomasb", "harrisonm") with team or pos
      if (kp.inverted_short.length >= 4 && (normText.includes(kp.inverted_short) || normNoSuffix.includes(kp.inverted_short))) {{
        if (rawUpperText.includes(kp.team) || rawUpperText.includes(kp.pos)) {{
          return kp;
        }}
      }}

      // 5. Unambiguous Short Initial Match (e.g. "lburden", "bthomas", "mharrison")
      if (!kp.is_ambiguous && kp.short_no_suffix.length >= 4 && (normText.includes(kp.short_no_suffix) || normNoSuffix.includes(kp.short_no_suffix))) {{
        return kp;
      }}

      // 6. Ambiguous Short Initial Match WITH Team or Position Verification
      if (kp.is_ambiguous && (normNoSuffix.includes(kp.short) || normNoSuffix.includes(kp.short_no_suffix))) {{
        if (rawUpperText.includes(kp.team) || rawUpperText.includes(kp.pos)) {{
          return kp;
        }}
      }}

      // 7. Last Name Match (>= 5 chars) WITH explicit Team AND Position (e.g. "BURDEN WR CHI", "THOMAS WR JAX", "SKATTEBO RB NYG")
      if (kp.last_name.length >= 5 && (normText.includes(kp.last_name) || normNoSuffix.includes(kp.last_name))) {{
        if (rawUpperText.includes(kp.team) && rawUpperText.includes(kp.pos)) {{
          return kp;
        }}
      }}
    }}
    return null;
  }}

  const KNOWN_USER_PICKS = new Map();

  function parseDraftPicks() {{
    try {{
      const picks = [];
      const seenKeys = new Set();
      const myRosterKeys = new Set();
      const winWidth = window.innerWidth || document.documentElement.clientWidth || 1920;

      // =========================================================================
      // 1. DRAFT BOARD MODAL PARSER (When full draft board is open)
      // =========================================================================
      const modalEl = document.querySelector('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="dialog"], [class*="overlay"], [class*="Overlay"]');
      const isBoardModalOpen = Boolean(modalEl && modalEl.textContent && modalEl.textContent.length > 50 && (modalEl.textContent.includes('QB') || modalEl.textContent.includes('RB')) && modalEl.textContent.includes('WR'));

      if (isBoardModalOpen && modalEl) {{
        let userColIndex = -1;
        const columns = modalEl.querySelectorAll('[class*="Column"], [class*="column"], [class*="col"], div[style*="flex-direction: column"]');
        
        columns.forEach((col, idx) => {{
          const t = (col.textContent || '').toLowerCase();
          if (t.includes('(you)') || col.className.toLowerCase().includes('user') || col.className.toLowerCase().includes('active')) {{
            userColIndex = idx;
          }}
        }});

        const modalNodes = modalEl.querySelectorAll('p, span, div, li, tr, h1, h2, h3, h4, h5, h6, a');
        modalNodes.forEach(el => {{
          if (el.children.length > 4) return;
          const text = (el.textContent || '').trim();
          if (!text || text.length < 3 || text.length > 90) return;
          if (text.includes('QB') && text.includes('RB') && text.includes('WR') && text.includes('TE')) return;

          const normText = normalize(text);
          const normNoSuffix = normalizeNoSuffix(text);
          const rawUpper = text.toUpperCase();
          const matched = matchPlayerInText(normText, normNoSuffix, rawUpper);

          if (matched) {{
            const key = normalize(matched.name);
            if (!seenKeys.has(key)) {{
              seenKeys.add(key);
              let isUser = KNOWN_USER_PICKS.has(key);
              if (!isUser && userColIndex !== -1 && columns[userColIndex] && columns[userColIndex].contains(el)) {{
                isUser = true;
              }}
              const pickObj = {{
                player_name: matched.name,
                position: matched.pos,
                team: matched.team,
                is_user: isUser
              }};
              if (isUser) {{
                myRosterKeys.add(key);
                KNOWN_USER_PICKS.set(key, pickObj);
              }}
              picks.push(pickObj);
            }}
          }}
        }});

        if (picks.length > 0) {{
          return picks;
        }}
      }}

      // =========================================================================
      // 2. MAIN DRAFT ROOM VIEW (Board Closed)
      // =========================================================================

      // Step A: Scan Right Sidebar for User Roster
      const allTextNodes = document.querySelectorAll('p, span, div, li, tr, h1, h2, h3, h4, h5, h6, a');

      allTextNodes.forEach(el => {{
        if (el.children.length > 3) return;
        if (el.tagName === 'BUTTON' || (el.closest && el.closest('button'))) return;

        const text = (el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 70) return;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('adp') || lowerText.includes('add to queue')) return;

        let rect = null;
        try {{ rect = el.getBoundingClientRect(); }} catch(e) {{}}

        // Right sidebar check (user roster)
        if (rect && rect.left > (winWidth * 0.55) && rect.top > 70) {{
          const normText = normalize(text);
          const normNoSuffix = normalizeNoSuffix(text);
          const rawUpper = text.toUpperCase();
          const matched = matchPlayerInText(normText, normNoSuffix, rawUpper);

          if (matched) {{
            const key = normalize(matched.name);
            if (!myRosterKeys.has(key)) {{
              myRosterKeys.add(key);
              seenKeys.add(key);
              const pickObj = {{
                player_name: matched.name,
                position: matched.pos,
                team: matched.team,
                is_user: true
              }};
              KNOWN_USER_PICKS.set(key, pickObj);
              picks.push(pickObj);
            }}
          }}
        }}
      }});

      // Step B: Scan Top Completed Picks Ticker / Carousel / Recent Picks
      const candidateElements = document.querySelectorAll(
        'header div, nav div, [class*="ticker"] div, [class*="Ticker"] div, [class*="carousel"] div, [class*="Carousel"] div, [class*="completed"] div, [class*="recent"] div, [class*="board"] div, [class*="Board"] div, [class*="grid"] div, [class*="Grid"] div, [class*="cell"] div, [class*="Cell"] div, [class*="slot"] div, [class*="Slot"] div, [data-testid*="pick"], [data-testid*="cell"], [data-testid*="ticker"], [data-testid*="recent"]'
      );

      candidateElements.forEach(el => {{
        if (el.tagName === 'BUTTON' || (el.closest && el.closest('button'))) return;
        if (el.children.length > 4) return;

        const text = (el.textContent || '').trim();
        if (!text || text.length < 3 || text.length > 90) return;
        const lowerText = text.toLowerCase();
        if (lowerText.includes('adp') || lowerText.includes('add to queue')) return;

        const normText = normalize(text);
        const normNoSuffix = normalizeNoSuffix(text);
        const rawUpper = text.toUpperCase();
        const matched = matchPlayerInText(normText, normNoSuffix, rawUpper);

        if (matched) {{
          const key = normalize(matched.name);
          if (!seenKeys.has(key)) {{
            seenKeys.add(key);
            const isUser = myRosterKeys.has(key) || KNOWN_USER_PICKS.has(key);
            picks.push({{
              player_name: matched.name,
              position: matched.pos,
              team: matched.team,
              is_user: isUser
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
      }} else if (msg && msg.type === 'RESET_DRAFT_STATE') {{
        lastPicksCount = -1;
      }}
    }});
  }}

  if (typeof BroadcastChannel !== 'undefined') {{
    try {{
      const channel = new BroadcastChannel('underdog-sync');
      channel.onmessage = (e) => {{
        if (e.data && e.data.type === 'REQUEST_UNDERDOG_SYNC') {{
          lastPicksCount = -1;
          tick();
        }} else if (e.data && e.data.type === 'RESET_DRAFT_STATE') {{
          lastPicksCount = -1;
        }}
      }};
    }} catch(e) {{}}
  }}
}})();
"""

out_path = os.path.join(os.getcwd(), 'underdog-extension', 'content.js')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(content_js_template)

print(f"Generated unified {out_path} successfully!")
