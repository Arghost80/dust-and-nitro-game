const fs = require('fs');
const tracks = JSON.parse(fs.readFileSync('tracks_data.json', 'utf8'));

console.log('Total tracks in tracks_data.json:', Object.keys(tracks).length);
let errors = 0;

for (const [id, t] of Object.entries(tracks)) {
    const fin = t.tiles.find(x => x.t === 'finish');
    if (!fin) {
        console.error(`ERROR: Track ${id} has no finish tile!`);
        errors++;
    }
    if (!t.nodes || t.nodes.length < 5) {
        console.error(`ERROR: Track ${id} has invalid nodes (${t.nodes ? t.nodes.length : 0})!`);
        errors++;
    }
    if (!t.worldWidth || !t.worldHeight) {
        console.error(`ERROR: Track ${id} has invalid world dimensions!`);
        errors++;
    }
}

if (errors === 0) {
    console.log('ALL CIRCUITS VALIDATED 100% PERFECTLY! No errors found.');
} else {
    console.log(`Found ${errors} errors.`);
}
