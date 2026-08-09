import urllib.request
import json

url = "https://api.sleeper.app/projections/nfl/2025?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print("Sleeper projections status:", res.status, "Count:", len(data))
    if data:
        p = data[0]
        print("Sample item keys:", p.keys())
        print("Sample item stats keys:", p.get('stats', {}).keys() if 'stats' in p else 'N/A')
        print("Sample item player:", p.get('player', {}).get('full_name') if 'player' in p else p.get('player_id'))
        print(json.dumps(p, indent=2)[:500])
except Exception as e:
    print("Error:", e)
