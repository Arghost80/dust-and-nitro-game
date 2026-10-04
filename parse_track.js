const fs = require('fs');
const path = require('path');

const trkFile = path.join(__dirname, 'dust_src', 'data', 'levels', 'ring.trk');
const xml = fs.readFileSync(trkFile, 'utf8');

const tiles = [];
const tileRegex = /<t i="(\d+)" j="(\d+)" o="([-\d]+)" t="([^"]+)"/g;
let m;
while ((m = tileRegex.exec(xml)) !== null) {
    tiles.push({ i: parseInt(m[1]), j: parseInt(m[2]), rot: parseInt(m[3]), type: m[4] });
}

const objects = [];
const objRegex = /<o x="(\d+)" y="(\d+)" o="([-\d]+)" r="([^"]+)"/g;
while ((m = objRegex.exec(xml)) !== null) {
    objects.push({ x: parseInt(m[1]), y: parseInt(m[2]), rot: parseInt(m[3]), model: m[4] });
}

const nodes = [];
const nodeRegex = /<n w="(\d+)" x="(\d+)" y="(\d+)" h="(\d+)" i="(\d+)"/g;
while ((m = nodeRegex.exec(xml)) !== null) {
    nodes.push({ x: parseInt(m[2]), y: parseInt(m[3]), i: parseInt(m[5]) });
}

const trackData = {
    name: 'Ring Grand Prix (Dust Racing 2D Oficial)',
    cols: 20,
    rows: 8,
    tileSize: 256,
    tiles: tiles,
    objects: objects,
    nodes: nodes
};

const outFile = path.join(__dirname, 'assets', 'dust', 'ring_track.json');
fs.writeFileSync(outFile, JSON.stringify(trackData, null, 2));
console.log('EXITO: Pista Ring de Dust Racing 2D extraida con ' + tiles.length + ' baldosas y ' + objects.length + ' objetos oficiales');
