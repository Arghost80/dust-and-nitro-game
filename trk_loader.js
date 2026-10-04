// ===== DUST RACING 2D TRACK PARSER & LOADER =====
const fs = require('fs');
const path = require('path');

function parseTrackXml(xmlContent) {
    const colsMatch = xmlContent.match(/cols="(\d+)"/);
    const rowsMatch = xmlContent.match(/rows="(\d+)"/);
    const nameMatch = xmlContent.match(/name="([^"]+)"/);

    const cols = colsMatch ? parseInt(colsMatch[1], 10) : 30;
    const rows = rowsMatch ? parseInt(rowsMatch[1], 10) : 20;
    const name = nameMatch ? nameMatch[1] : 'Track';

    // Tiles
    const tiles = [];
    const tRegex = /<t\s+([^>]+)\/>/g;
    let match;
    while ((match = tRegex.exec(xmlContent)) !== null) {
        const attrs = match[1];
        const iM = attrs.match(/i="(\d+)"/);
        const jM = attrs.match(/j="(\d+)"/);
        const oM = attrs.match(/o="(-?\d+)"/);
        const tM = attrs.match(/t="([^"]+)"/);
        if (iM && jM && tM) {
            tiles.push({
                i: parseInt(iM[1], 10),
                j: parseInt(jM[1], 10),
                o: oM ? parseInt(oM[1], 10) : 0,
                t: tM[1]
            });
        }
    }

    // Objects (trees, grandstands, tire walls, pits, rocks)
    const objects = [];
    const oRegex = /<o\s+([^>]+)\/>/g;
    while ((match = oRegex.exec(xmlContent)) !== null) {
        const attrs = match[1];
        const xM = attrs.match(/x="([^"]+)"/);
        const yM = attrs.match(/y="([^"]+)"/);
        const oM = attrs.match(/o="([^"]+)"/);
        const rM = attrs.match(/r="([^"]+)"/);
        if (xM && yM && rM) {
            objects.push({
                x: parseFloat(xM[1]),
                y: parseFloat(yM[1]),
                o: oM ? parseFloat(oM[1]) : 0,
                r: rM[1]
            });
        }
    }

    // Checkpoint nodes
    const nodes = [];
    const nRegex = /<n\s+([^>]+)\/>/g;
    while ((match = nRegex.exec(xmlContent)) !== null) {
        const attrs = match[1];
        const xM = attrs.match(/x="([^"]+)"/);
        const yM = attrs.match(/y="([^"]+)"/);
        const wM = attrs.match(/w="([^"]+)"/);
        const hM = attrs.match(/h="([^"]+)"/);
        const iM = attrs.match(/i="(\d+)"/);
        if (xM && yM && iM) {
            nodes.push({
                x: parseFloat(xM[1]),
                y: parseFloat(yM[1]),
                w: wM ? parseFloat(wM[1]) : 256,
                h: hM ? parseFloat(hM[1]) : 256,
                i: parseInt(iM[1], 10)
            });
        }
    }
    nodes.sort((a, b) => a.i - b.i);

    return {
        name,
        cols,
        rows,
        tileSize: 256,
        worldWidth: cols * 256,
        worldHeight: rows * 256,
        tiles,
        objects,
        nodes
    };
}

function loadTrackFile(filePath) {
    const xml = fs.readFileSync(filePath, 'utf8');
    return parseTrackXml(xml);
}

module.exports = { parseTrackXml, loadTrackFile };

if (require.main === module) {
    const monza = loadTrackFile(path.join(__dirname, 'monza.trk'));
    console.log(`Successfully parsed: ${monza.name}`);
    console.log(`Grid: ${monza.cols}x${monza.rows} (${monza.worldWidth}x${monza.worldHeight}px)`);
    console.log(`Tiles count: ${monza.tiles.length}`);
    console.log(`Objects count: ${monza.objects.length}`);
    console.log(`Checkpoints count: ${monza.nodes.length}`);
}
