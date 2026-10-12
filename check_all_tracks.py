import json

with open('tracks_data.js', 'r', encoding='utf-8') as f:
    text = f.read()

data = json.loads(text[text.find('{'):text.rfind('}};')+2])

# Rule for corner90:
# connects (dr1, dc1) and (dr2, dc2) relative to (r, c):
# o % 360 == 0:   down (j+1) and right (i+1)
# o % 360 == 90:  down (j+1) and left (i-1)
# o % 360 == 180: up (j-1)   and left (i-1)
# o % 360 == 270: up (j-1)   and right (i+1)

corner_ports = {
    0:   [(0, 1), (1, 0)],    # down, right
    90:  [(0, 1), (-1, 0)],   # down, left
    180: [(0, -1), (-1, 0)],  # up, left
    270: [(0, -1), (1, 0)]    # up, right
}

for track_id, t in data.items():
    tile_map = {f"{tile['i']},{tile['j']}": tile for tile in t['tiles']}
    road_types = {'straight', 'finish', 'bridge', 'corner90', 'corner45Left', 'corner45Right', 'straight45Male', 'straight45Female'}
    
    broken_corners = []
    c90_count = 0
    c45_count = 0
    straight_count = 0
    
    for tile in t['tiles']:
        tt = tile['t']
        if tt == 'corner90':
            c90_count += 1
            i, j, o = tile['i'], tile['j'], tile['o']
            norm_o = ((o % 360) + 360) % 360
            ports = corner_ports.get(norm_o)
            if ports:
                for di, dj in ports:
                    neighbor = tile_map.get(f"{i+di},{j+dj}")
                    if not neighbor or neighbor['t'] not in road_types:
                        broken_corners.append((i, j, o, di, dj))
        elif 'corner45' in tt:
            c45_count += 1
        elif tt in ('straight', 'finish'):
            straight_count += 1
            
    print(f"Track: {track_id:25s} | size: {t.get('cols')}x{t.get('rows')} | c90: {c90_count:2d} | c45: {c45_count:2d} | str: {straight_count:2d} | broken_c90: {len(broken_corners)}")
    if broken_corners:
        for b in broken_corners:
            print(f"    -> Broken at i={b[0]}, j={b[1]}, o={b[2]} missing connection at di={b[3]}, dj={b[4]}")
