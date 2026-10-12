import json

with open('tracks_data.js', 'r', encoding='utf-8') as f:
    text = f.read()

data = json.loads(text[text.find('{'):text.rfind('}};')+2])

for track_id in ['red_rock_junction', 'crossroads', 'overpass_figure8']:
    t = data.get(track_id)
    if not t: continue
    print('=== ' + track_id + ' ===')
    tile_map = {f"{tile['i']},{tile['j']}": tile for tile in t['tiles']}
    for tile in t['tiles']:
        if tile['t'] == 'corner90':
            i, j, o = tile['i'], tile['j'], tile['o']
            # Neighbors
            up = tile_map.get(f"{i},{j-1}", {}).get('t')
            down = tile_map.get(f"{i},{j+1}", {}).get('t')
            left = tile_map.get(f"{i-1},{j}", {}).get('t')
            right = tile_map.get(f"{i+1},{j}", {}).get('t')
            print(f"i={i:2d}, j={j:2d}, o={o:4d} | up={up} down={down} left={left} right={right}")
