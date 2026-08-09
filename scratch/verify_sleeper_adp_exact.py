import urllib.request
import json

# Fetch players map for player_id -> full_name lookup
url_players = 'https://api.sleeper.app/v1/players/nfl'
players_raw = json.loads(urllib.request.urlopen(urllib.request.Request(url_players, headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf-8'))

# Fetch Sleeper official ADP projections endpoint
url_proj = "https://api.sleeper.app/projections/nfl/2025?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE"
proj_raw = json.loads(urllib.request.urlopen(urllib.request.Request(url_proj, headers={'User-Agent':'Mozilla/5.0'})).read().decode('utf-8'))

print(f"Total projection items: {len(proj_raw)}")

target_names = ["jalen hurts", "jaxson dart", "justin herbert", "caleb williams", "trevor lawrence", "dak prescott"]

results = []

for item in proj_raw:
    p_id = item.get('player_id')
    player_info = players_raw.get(p_id, {})
    name = player_info.get('full_name', '')
    if any(t in name.lower() for t in target_names):
        stats = item.get('stats', {})
        adp_half = stats.get('adp_half_ppr') or stats.get('adp_ppr') or 999
        adp_ppr = stats.get('adp_ppr') or 999
        pos = player_info.get('position', 'FLEX')
        team = player_info.get('team', 'NFL')
        results.append({
            'name': name,
            'pos': pos,
            'team': team,
            'adp_half': adp_half,
            'adp_ppr': adp_ppr
        })

results.sort(key=lambda x: x['adp_ppr'])

print("\n--- SLEEPER OFFICIAL ADP TEST RESULTS ---")
for r in results:
    print(f"{r['name']} ({r['pos']}-{r['team']}): PPR ADP = {r['adp_ppr']}, Half-PPR ADP = {r['adp_half']}")
