import json

# Connection rules for Dust Racing 2D tiles:
# straight: o=0 is vertical (connects UP j-1 and DOWN j+1)
#           o=90 is horizontal (connects LEFT i-1 and RIGHT i+1)
# finish: same as straight, o=90 is horizontal
# corner90:
#   o=0:   connects DOWN (j+1) and RIGHT (i+1)  [top-left corner]
#   o=90:  connects DOWN (j+1) and LEFT (i-1)   [top-right corner]
#   o=180: connects UP (j-1)   and LEFT (i-1)   [bottom-right corner]
#   o=270: connects UP (j-1)   and RIGHT (i+1)  [bottom-left corner]

def build_circuit(track_id, name, cols, rows, path_tiles, objects_list=None):
    """
    path_tiles: list of dicts: {'i': int, 'j': int, 't': str, 'o': int}
    Automatically fills background grass tiles, generates sequential nodes, and places decorations.
    """
    tile_map = {(t['i'], t['j']): t for t in path_tiles}
    
    # 1. Full grid with default grass
    all_tiles = []
    for i in range(cols):
        for j in range(rows):
            if (i, j) in tile_map:
                all_tiles.append(tile_map[(i, j)])
            else:
                all_tiles.append({'i': i, 'j': j, 'o': 0, 't': 'grass'})
                
    # 2. Sequential nodes along the circuit
    # Find finish tile as start
    finish_idx = -1
    for idx, pt in enumerate(path_tiles):
        if pt['t'] == 'finish':
            finish_idx = idx
            break
    if finish_idx == -1:
        finish_idx = 0
        
    ordered = path_tiles[finish_idx:] + path_tiles[:finish_idx]
    nodes = []
    for n_i, pt in enumerate(ordered):
        nodes.append({
            'x': pt['i'] * 256 + 128,
            'y': pt['j'] * 256 + 128,
            'w': 256,
            'h': 256,
            'i': n_i
        })
        
    # 3. Scenery objects
    objs = objects_list or []
    
    return {
        'id': track_id,
        'name': name,
        'cols': cols,
        'rows': rows,
        'tileSize': 256,
        'worldWidth': cols * 256,
        'worldHeight': rows * 256,
        'tiles': all_tiles,
        'objects': objs,
        'nodes': nodes
    }

print("Circuit generator helper defined.")
