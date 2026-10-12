import json

with open('tracks_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('{')
data = json.loads(content[idx:])

print(f'Total tracks: {len(data)}')
for k, t in data.items():
    road_tiles = [x for x in t['tiles'] if x['t'] != 'grass']
    nodes = t.get('nodes', [])
    print(f"{k:25s} | size: {t.get('cols')}x{t.get('rows')} | road: {len(road_tiles):3d} | nodes: {len(nodes):3d}")
