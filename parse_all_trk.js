const fs = require('fs');
const path = require('path');

function parseTrk(filePath, id, customName) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const colsM = xml.match(/cols="(\d+)"/);
    const rowsM = xml.match(/rows="(\d+)"/);
    const nameM = xml.match(/name="([^"]+)"/);
    const cols = colsM ? parseInt(colsM[1]) : 20;
    const rows = rowsM ? parseInt(rowsM[1]) : 15;
    const trackName = customName || (nameM ? nameM[1] : id);

    const tiles = [];
    // Match any combination of attributes in <t ... />
    const tileTagRegex = /<t\s+([^>]+)\/>/g;
    let tm;
    while ((tm = tileTagRegex.exec(xml)) !== null) {
        const attrStr = tm[1];
        const iM = attrStr.match(/i="(\d+)"/);
        const jM = attrStr.match(/j="(\d+)"/);
        const oM = attrStr.match(/o="([-\d]+)"/);
        const tM = attrStr.match(/t="([^"]+)"/);
        if (iM && jM && tM) {
            tiles.push({
                i: parseInt(iM[1]),
                j: parseInt(jM[1]),
                o: oM ? parseInt(oM[1]) : 0,
                t: tM[1]
            });
        }
    }

    const objects = [];
    const objTagRegex = /<o\s+([^>]+)\/>/g;
    let om;
    while ((om = objTagRegex.exec(xml)) !== null) {
        const attrStr = om[1];
        const xM = attrStr.match(/x="(\d+)"/);
        const yM = attrStr.match(/y="(\d+)"/);
        const oM = attrStr.match(/o="([-\d]+)"/);
        const rM = attrStr.match(/r="([^"]+)"/);
        if (xM && yM && rM) {
            objects.push({
                x: parseInt(xM[1]),
                y: parseInt(yM[1]),
                o: oM ? parseInt(oM[1]) : 0,
                r: rM[1]
            });
        }
    }

    const nodes = [];
    const nodeTagRegex = /<n\s+([^>]+)\/>/g;
    let nm;
    while ((nm = nodeTagRegex.exec(xml)) !== null) {
        const attrStr = nm[1];
        const xM = attrStr.match(/x="(\d+)"/);
        const yM = attrStr.match(/y="(\d+)"/);
        const wM = attrStr.match(/w="(\d+)"/);
        const hM = attrStr.match(/h="(\d+)"/);
        const iM = attrStr.match(/i="(\d+)"/);
        if (xM && yM && iM) {
            nodes.push({
                x: parseInt(xM[1]),
                y: parseInt(yM[1]),
                w: wM ? parseInt(wM[1]) : 256,
                h: hM ? parseInt(hM[1]) : 256,
                i: parseInt(iM[1])
            });
        }
    }
    nodes.sort((a, b) => a.i - b.i);

    return {
        id: id,
        name: trackName,
        cols: cols,
        rows: rows,
        tileSize: 256,
        worldWidth: cols * 256,
        worldHeight: rows * 256,
        tiles: tiles,
        objects: objects,
        nodes: nodes
    };
}

const dir = path.join(__dirname, 'dust_src', 'data', 'levels');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.trk'));
console.log(`Found ${files.length} .trk files in ${dir}`);

files.forEach(f => {
    const rawId = f.replace('.trk', '').toLowerCase().replace(/\s+/g, '_');
    const t = parseTrk(path.join(dir, f), rawId);
    const fin = t.tiles.find(x => x.t === 'finish');
    console.log(
        f.padEnd(20),
        `cols=${String(t.cols).padEnd(2)}`,
        `rows=${String(t.rows).padEnd(2)}`,
        `tiles=${String(t.tiles.length).padEnd(4)}`,
        `objs=${String(t.objects.length).padEnd(4)}`,
        `nodes=${String(t.nodes.length).padEnd(3)}`,
        `hasFinish=${!!fin}`
    );
});
