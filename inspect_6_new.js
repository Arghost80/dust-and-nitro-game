const fs = require('fs');
const tracks = JSON.parse(fs.readFileSync('tracks_data.json', 'utf8'));

const newIds = ['riviera_coast', 'nordkette_pass', 'silverstone_airfield', 'neo_tokyo_bay', 'inter_laguna', 'sarthe_endurance'];
newIds.forEach(id => {
    const t = tracks[id];
    const fin = t.tiles.find(x => x.t === 'finish');
    console.log(id.padEnd(22), 'nodes:', t.nodes.length, 'n0:', t.nodes[0], 'fin:', { i: fin.i, j: fin.j, o: fin.o });
});
