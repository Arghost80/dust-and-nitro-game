import json

# Tile connection rules:
# Incoming direction and outgoing direction determine corner90 orientation:
# Dir vectors: UP = (0, -1), DOWN = (0, 1), LEFT = (-1, 0), RIGHT = (1, 0)
# corner90 connects two directions:
# o = 0:   DOWN (0, 1) and RIGHT (1, 0)   [Top-Left corner]
# o = 90:  DOWN (0, 1) and LEFT (-1, 0)    [Top-Right corner]
# o = 180: UP (0, -1)  and LEFT (-1, 0)    [Bottom-Right corner]
# o = 270: UP (0, -1)  and RIGHT (1, 0)   [Bottom-Left corner]

def make_circuit_from_steps(track_id, name, cols, rows, start_pos, steps, finish_step_idx=0, theme='green'):
    """
    start_pos: (start_i, start_j)
    steps: list of move directions: 'R', 'L', 'U', 'D'
    Each step moves 1 tile in that direction.
    Automatically assigns 'straight' or 'corner90' with exact 'o'!
    """
    dir_map = {
        'R': (1, 0),
        'L': (-1, 0),
        'U': (0, -1),
        'D': (0, 1)
    }
    
    positions = [start_pos]
    curr_i, curr_j = start_pos
    for s in steps:
        di, dj = dir_map[s]
        curr_i += di
        curr_j += dj
        positions.append((curr_i, curr_j))
        
    # The last position must equal the start position
    if positions[-1] != positions[0]:
        raise ValueError(f"Circuit {track_id} does not close! Start={positions[0]}, End={positions[-1]}")
        
    positions.pop() # remove duplicate closing pos
    N = len(positions)
    
    path_tiles = []
    for idx in range(N):
        i, j = positions[idx]
        prev_i, prev_j = positions[(idx - 1 + N) % N]
        next_i, next_j = positions[(idx + 1) % N]
        
        in_dir = (i - prev_i, j - prev_j)
        out_dir = (next_i - i, next_j - j)
        
        # Check if straight or corner
        if in_dir == out_dir:
            # Straight
            if in_dir in ((1, 0), (-1, 0)):
                o = 90 # horizontal
            else:
                o = 0  # vertical
            t_type = 'finish' if idx == finish_step_idx else 'straight'
            path_tiles.append({'i': i, 'j': j, 'o': o, 't': t_type})
        else:
            # Corner90: connects reverse of in_dir and out_dir
            rev_in = (-in_dir[0], -in_dir[1])
            ports = {rev_in, out_dir}
            if ports == {(0, 1), (1, 0)}:    # DOWN and RIGHT
                o = 0
            elif ports == {(0, 1), (-1, 0)}:  # DOWN and LEFT
                o = 90
            elif ports == {(0, -1), (-1, 0)}: # UP and LEFT
                o = 180
            elif ports == {(0, -1), (1, 0)}:  # UP and RIGHT
                o = 270
            else:
                raise ValueError(f"Invalid corner ports at ({i},{j}): {ports}")
            path_tiles.append({'i': i, 'j': j, 'o': o, 't': 'corner90'})
            
    # Generate decorations based on theme
    objects = []
    tile_set = {(p['i'], p['j']) for p in path_tiles}
    
    # 1. Start/Finish Line decorations: Grandstands & Pits
    finish_tile = path_tiles[finish_step_idx]
    fx, fy = finish_tile['i'] * 256 + 128, finish_tile['j'] * 256 + 128
    if finish_tile['o'] == 90: # Horizontal straight
        objects.append({'x': fx, 'y': fy - 180, 'o': 0, 'r': 'grandstand'})
        objects.append({'x': fx + 256, 'y': fy - 180, 'o': 0, 'r': 'grandstand'})
        objects.append({'x': fx - 256, 'y': fy - 180, 'o': 0, 'r': 'grandstand'})
        objects.append({'x': fx, 'y': fy + 160, 'o': 180, 'r': 'pit'})
        objects.append({'x': fx + 256, 'y': fy + 160, 'o': 180, 'r': 'pit'})
    else: # Vertical straight
        objects.append({'x': fx - 180, 'y': fy, 'o': 90, 'r': 'grandstand'})
        objects.append({'x': fx - 180, 'y': fy + 256, 'o': 90, 'r': 'grandstand'})
        objects.append({'x': fx + 160, 'y': fy, 'o': 270, 'r': 'pit'})
        
    # 2. Tire barriers at every corner90 outside zone
    for pt in path_tiles:
        if pt['t'] == 'corner90':
            cx, cy = pt['i'] * 256 + 128, pt['j'] * 256 + 128
            o = pt['o']
            # Place tire stack at apex/runoff
            if o == 0:    # Top-left corner -> runoff is at top-left
                objects.append({'x': cx - 90, 'y': cy - 90, 'o': 0, 'r': 'tire'})
                objects.append({'x': cx - 70, 'y': cy - 90, 'o': 0, 'r': 'tire'})
            elif o == 90: # Top-right corner -> runoff is at top-right
                objects.append({'x': cx + 90, 'y': cy - 90, 'o': 0, 'r': 'tire'})
                objects.append({'x': cx + 70, 'y': cy - 90, 'o': 0, 'r': 'tire'})
            elif o == 180: # Bottom-right corner -> runoff is at bottom-right
                objects.append({'x': cx + 90, 'y': cy + 90, 'o': 0, 'r': 'tire'})
                objects.append({'x': cx + 70, 'y': cy + 90, 'o': 0, 'r': 'tire'})
            elif o == 270: # Bottom-left corner -> runoff is at bottom-left
                objects.append({'x': cx - 90, 'y': cy + 90, 'o': 0, 'r': 'tire'})
                objects.append({'x': cx - 70, 'y': cy + 90, 'o': 0, 'r': 'tire'})
                
    # 3. Scenic Trees, Grandstands and Banners around the map
    # Scatter trees in empty grass areas
    for c in range(1, cols - 1, 3):
        for r in range(1, rows - 1, 3):
            if (c, r) not in tile_set and (c+1, r) not in tile_set:
                tx, ty = c * 256 + 128, r * 256 + 128
                objects.append({'x': tx, 'y': ty, 'o': 0, 'r': 'tree'})
                if (c+1, r+1) not in tile_set:
                    objects.append({'x': tx + 120, 'y': ty + 90, 'o': 0, 'r': 'tree'})
                    
    # Sequential nodes
    nodes = []
    ordered = path_tiles[finish_step_idx:] + path_tiles[:finish_step_idx]
    for n_i, pt in enumerate(ordered):
        nodes.append({
            'x': pt['i'] * 256 + 128,
            'y': pt['j'] * 256 + 128,
            'w': 256,
            'h': 256,
            'i': n_i
        })
        
    all_tiles = []
    tile_dict = {(pt['i'], pt['j']): pt for pt in path_tiles}
    for c in range(cols):
        for r in range(rows):
            if (c, r) in tile_dict:
                all_tiles.append(tile_dict[(c, r)])
            else:
                all_tiles.append({'i': c, 'j': r, 'o': 0, 't': 'grass'})
                
    return {
        'id': track_id,
        'name': name,
        'cols': cols,
        'rows': rows,
        'tileSize': 256,
        'worldWidth': cols * 256,
        'worldHeight': rows * 256,
        'tiles': all_tiles,
        'objects': objects,
        'nodes': nodes
    }

print("make_circuit_from_steps defined successfully.")
