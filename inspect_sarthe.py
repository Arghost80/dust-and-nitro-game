import json

with open('tracks_data.js', 'r', encoding='utf-8') as f:
    text = f.read()

end_idx = text.rfind('}};') + 2
start_idx = text.find('{')
data = json.loads(text[start_idx:end_idx])
s = data['sarthe_endurance']

road = [t for t in s['tiles'] if t['t'] != 'grass']
print(f"Total road/special tiles: {len(road)}")
for t in road:
    print(f"i={t['i']:2d}, j={t['j']:2d}, o={t['o']:4d}, t={t['t']}")
