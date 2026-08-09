import urllib.request
import json

# Check players endpoint fields for Jalen Hurts & Jaxson Dart
url = 'https://api.sleeper.app/v1/players/nfl'
req = urllib.request.urlopen(url)
players = json.loads(req.read().decode('utf-8'))

for p_id, p in players.items():
    name = p.get('full_name', '')
    if 'jalen hurts' in name.lower() or 'jaxson dart' in name.lower():
        print(f"--- {name} ---")
        print("keys:", p.keys())
        print("search_rank:", p.get('search_rank'))
        print("fantasy_positions:", p.get('fantasy_positions'))
        print("years_exp:", p.get('years_exp'))
        print("depth_chart_order:", p.get('depth_chart_order'))
        print("full dictionary sample:")
        print(json.dumps(p, indent=2))
        print("="*40)
