import urllib.request
import json

test_urls = [
    "https://api.sleeper.app/v1/user/nfl",
    "https://api.sleeper.app/v1/state/nfl",
    "https://sleeper.app/api/v1/adp/ppr",
    "https://sleeper.app/api/v1/players/nfl",
    "https://api.sleeper.app/projections/nfl/2025?season_type=regular&position[]=QB",
    "https://api.sleeper.app/v1/draft/nfl",
    "https://sleeper.app/graphql"
]

for url in test_urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req)
        print(f"OK {url} -> status {res.status}")
    except Exception as e:
        print(f"FAIL {url} -> {e}")
