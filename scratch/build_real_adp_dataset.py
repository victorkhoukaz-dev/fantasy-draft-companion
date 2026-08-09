import urllib.request
import re

urls = [
    "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php",
    "https://www.fantasypros.com/nfl/adp/ppr-overall.php",
    "https://www.fantasypros.com/nfl/adp/overall.php"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        html = urllib.request.urlopen(req).read().decode('utf-8')
        print(f"SUCCESS {url} -> HTML length: {len(html)}")
        
        # Look for table rows containing player names and ADP
        # Example pattern: fp-id="..." ... >Player Name</a> ... <td>ADP_VALUE</td>
        matches = re.findall(r'<tr[^>]*>.*?<a[^>]*fp-id[^>]*>(.*?)</a>.*?</td>.*?<td[^>]*>(\d+\.?\d*)</td>', html, re.DOTALL)
        if not matches:
            matches = re.findall(r'class="player-name"[^>]*>(.*?)</a>.*?<td[^>]*>(\d+\.?\d*)</td>', html, re.DOTALL)
        
        print(f"Found {len(matches)} matches")
        for m in matches[:10]:
            print(f"  {m[0].strip()} -> ADP {m[1].strip()}")
        print("="*50)
    except Exception as e:
        print(f"FAILED {url} -> {e}")
