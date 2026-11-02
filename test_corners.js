const fs = require('fs');
const path = require('path');

const fixture = path.join(__dirname, 'assets', 'dustrac', 'levels', 'triangle.trk');
const xml = fs.readFileSync(fixture, 'utf8');
const lines = xml.split('\n').filter(l => l.includes('<t ') && l.includes('t="corner90"'));

console.log('corner90 in triangle.trk:');
lines.forEach(l => console.log(l));

if (lines.length === 0) {
    console.error('FAIL: no se encontraron tiles corner90 en el fixture');
    process.exit(1);
}

console.log(`PASS: ${lines.length} tiles corner90 encontrados`);
