import urllib.request
import json

# Let's test sleeper ADP endpoints
endpoints = [
    "https://api.sleeper.app/v1/drafts/nfl/2026",
    "https://api.sleeper.app/v1/drafts/nfl/2025",
    "https://sleeper.app/api/adp/nfl/2025",
    "https://sleeper.app/api/adp/nfl/2026",
    "https://api.sleeper.app/v1/players/nfl/adp"
]

for ep in endpoints:
    try:
        req = urllib.request.Request(ep, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode('utf-8'))
        print(f"SUCCESS {ep} -> {type(data)} size: {len(data) if isinstance(data, (list, dict)) else 'N/A'}")
        if isinstance(data, list) and len(data) > 0:
            print("Sample item:", data[0])
    except Exception as e:
        print(f"FAILED {ep} -> {e}")
