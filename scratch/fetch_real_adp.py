import urllib.request
import json
import re

url = "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
try:
    html = urllib.request.urlopen(req).read().decode('utf-8')
    print("FantasyPros HTML length:", len(html))
    # Look for e.g. ecrData or adpData JS variable in HTML
    matches = re.findall(r'var ecrData\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not matches:
        matches = re.findall(r'var adpData\s*=\s*(\{.*?\});', html, re.DOTALL)
    print("Matches found:", len(matches))
except Exception as e:
    print("Error:", e)
