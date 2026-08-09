import urllib.request

url = "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req).read().decode('utf-8')

pos = html.find("Jalen Hurts")
if pos != -1:
    print("Found Jalen Hurts at pos:", pos)
    print("Snippet:")
    print(html[max(0, pos-200):min(len(html), pos+400)])
else:
    print("Jalen Hurts not found in raw HTML.")
