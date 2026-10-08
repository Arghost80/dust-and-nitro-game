const fs = require('fs');
const xml = fs.readFileSync('dust_src/data/levels/triangle.trk', 'utf8');
const lines = xml.split('\n').filter(l => l.includes('<t ') && l.includes('t="corner90"'));
console.log('corner90 in triangle.trk:');
lines.forEach(l => console.log(l));
