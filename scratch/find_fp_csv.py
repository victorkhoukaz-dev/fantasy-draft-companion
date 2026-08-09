import urllib.request

urls = [
    "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php?export=csv",
    "https://www.fantasypros.com/nfl/adp/ppr-overall.php?export=csv",
    "https://www.fantasypros.com/nfl/adp/half-point-ppr-qb.php?export=csv"
]

for url in urls:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        content = urllib.request.urlopen(req).read().decode('utf-8')
        lines = content.split('\n')
        print(f"SUCCESS {url} -> {len(lines)} lines")
        print("Header:", lines[0] if lines else "")
        print("Line 1:", lines[1] if len(lines) > 1 else "")
        print("Line 2:", lines[2] if len(lines) > 2 else "")
        print("="*40)
    except Exception as e:
        print(f"FAILED {url} -> {e}")
