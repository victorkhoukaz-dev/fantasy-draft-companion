import urllib.request
import re

url = "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req).read().decode('utf-8')

# Find player table rows
rows = re.findall(r'<tr.*?>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*<td.*?>(.*?)</td>\s*</tr>', html, re.DOTALL)
print("Found rows:", len(rows))
for r in rows[:10]:
    clean_r = [re.sub(r'<.*?>', '', col).strip() for col in r]
    print(clean_r)
