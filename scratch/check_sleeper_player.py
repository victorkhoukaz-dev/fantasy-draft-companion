import urllib.request
import json

url = 'https://api.sleeper.app/v1/players/nfl'
req = urllib.request.urlopen(url)
data = json.loads(req.read().decode('utf-8'))

dart_matches = [p for p in data.values() if p.get('full_name') and 'dart' in p.get('full_name').lower()]
print(f"Found {len(dart_matches)} match(es) for 'dart':")
for p in dart_matches:
    print(f"Name: {p.get('full_name')}, Pos: {p.get('position')}, Team: {p.get('team')}, SearchRank: {p.get('search_rank')}")
