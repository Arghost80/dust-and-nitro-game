const fs = require('fs');
const path = require('path');

// 1. Parser para los 16 circuitos oficiales de Dust Racing 2D (.trk XML)
function parseTrk(filePath, id, customName) {
    const xml = fs.readFileSync(filePath, 'utf8');
    const colsM = xml.match(/cols="(\d+)"/);
    const rowsM = xml.match(/rows="(\d+)"/);
    const cols = colsM ? parseInt(colsM[1]) : 20;
    const rows = rowsM ? parseInt(rowsM[1]) : 15;

    const tiles = [];
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
        name: customName,
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

// 2. Creador de circuitos modulares para los 6 nuevos circuitos
function buildCustomCircuit(def) {
    const { id, name, cols, rows, waypoints, decor } = def;
    const tileGrid = new Map();

    // Rellenar fondo con césped
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            tileGrid.set(`${c},${r}`, { i: c, j: r, o: 0, t: 'grass' });
        }
    }

    // Colocar baldosas de pista según waypoints ordenados
    // waypoints es un array de { i, j, t, o }
    waypoints.forEach(wp => {
        tileGrid.set(`${wp.i},${wp.j}`, { i: wp.i, j: wp.j, o: wp.o || 0, t: wp.t });
    });

    // Crear baldosas de arena (escapatorias en las curvas principales)
    waypoints.forEach(wp => {
        if (wp.t.startsWith('corner')) {
            // Colocar arena exterior
            [-1, 1].forEach(di => {
                [-1, 1].forEach(dj => {
                    const ni = wp.i + di;
                    const nj = wp.j + dj;
                    const key = `${ni},${nj}`;
                    if (tileGrid.has(key) && tileGrid.get(key).t === 'grass') {
                        tileGrid.set(key, { i: ni, j: nj, o: 0, t: 'sand' });
                    }
                });
            });
        }
    });

    // Generar nodos de navegación IA y checkpoints a lo largo del recorrido
    // Empezando por la baldosa inmediatamente después de 'finish'
    const finishIdx = waypoints.findIndex(w => w.t === 'finish');
    const orderedWps = [];
    for (let k = 0; k < waypoints.length; k++) {
        const idx = (finishIdx + 1 + k) % waypoints.length;
        orderedWps.push(waypoints[idx]);
    }

    const nodes = orderedWps.map((wp, idx) => ({
        x: wp.i * 256 + 128,
        y: wp.j * 256 + 128,
        w: 256,
        h: 256,
        i: idx
    }));

    // Generar objetos ambientales y decorado
    const objects = [];
    const addObj = (x, y, o, r) => objects.push({ x: Math.round(x), y: Math.round(y), o, r });

    // Tribunas y boxes en la recta de meta
    const finishWp = waypoints[finishIdx] || waypoints[0];
    const fx = finishWp.i * 256 + 128;
    const fy = finishWp.j * 256 + 128;

    // Pit lane a un lado de la meta
    addObj(fx - 128, fy + 160, 0, 'pit');
    addObj(fx + 128, fy + 160, 0, 'pit');

    // Tribunas principales frente a la recta de meta
    addObj(fx - 140, fy - 180, 0, 'grandstand');
    addObj(fx + 140, fy - 180, 0, 'grandstand');

    // Elementos temáticos
    if (decor === 'coastal') {
        // Palmeras, rocas costeras, gradas
        for (let i = 0; i < cols; i += 2) {
            addObj(i * 256 + 80, 60, 0, 'tree');
            addObj(i * 256 + 180, 70, 0, 'bushArea');
        }
        for (let j = 0; j < rows; j += 2) {
            addObj(60, j * 256 + 80, 0, 'rock');
            addObj((cols - 1) * 256 + 190, j * 256 + 120, 0, 'grandstand');
        }
    } else if (decor === 'alpine') {
        // Montaña: abundantes abetos y rocas
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                if (tileGrid.get(`${c},${r}`).t === 'grass' && (c + r) % 3 === 0) {
                    addObj(c * 256 + 70 + (r * 15) % 80, r * 256 + 60 + (c * 20) % 90, 0, 'tree');
                }
                if (tileGrid.get(`${c},${r}`).t === 'sand' && (c * r) % 4 === 0) {
                    addObj(c * 256 + 100, r * 256 + 100, 0, 'rock');
                }
            }
        }
    } else if (decor === 'airfield') {
        // Pista amplia: tribunas grandes, neumáticos y muros
        waypoints.forEach((wp, wIdx) => {
            if (wIdx % 4 === 0) {
                addObj(wp.i * 256 + 30, wp.j * 256 + 30, 0, 'tire');
                addObj(wp.i * 256 + 220, wp.j * 256 + 220, 0, 'tire');
            }
            if (wp.t.startsWith('corner') && wIdx % 2 === 0) {
                addObj(wp.i * 256 + 200, wp.j * 256 - 60, 0, 'grandstand');
            }
        });
    } else {
        // Estándar Gran Premio: Árboles, gradas y neumáticos
        for (let c = 0; c < cols; c += 2) {
            addObj(c * 256 + 100, 80, 0, 'tree');
            addObj(c * 256 + 120, (rows - 1) * 256 + 170, 0, 'tree');
        }
        waypoints.forEach((wp, wIdx) => {
            if (wp.t.startsWith('corner')) {
                addObj(wp.i * 256 + 40, wp.j * 256 + 40, 0, 'tire');
                addObj(wp.i * 256 + 210, wp.j * 256 + 40, 0, 'tire');
            }
        });
    }

    return {
        id,
        name,
        cols,
        rows,
        tileSize: 256,
        worldWidth: cols * 256,
        worldHeight: rows * 256,
        tiles: Array.from(tileGrid.values()),
        objects,
        nodes
    };
}

// Configuración de los 6 circuitos nuevos
function generate6NewCircuits() {
    // 1. Riviera Monaco Harbor (20x14)
    // Trazado rectangular con chicanes y horquilla
    const rivieraWps = [
        // Recta de meta hacia el oeste
        { i: 10, j: 11, t: 'finish', o: 90 },
        { i: 9,  j: 11, t: 'straight', o: 90 },
        { i: 8,  j: 11, t: 'straight', o: 90 },
        { i: 7,  j: 11, t: 'straight', o: 90 },
        { i: 6,  j: 11, t: 'straight', o: 90 },
        { i: 5,  j: 11, t: 'straight', o: 90 },
        { i: 4,  j: 11, t: 'straight', o: 90 },
        { i: 3,  j: 11, t: 'corner90', o: 90 },
        // Subida norte
        { i: 3,  j: 10, t: 'straight', o: 0 },
        { i: 3,  j: 9,  t: 'straight', o: 0 },
        { i: 3,  j: 8,  t: 'straight', o: 0 },
        { i: 3,  j: 7,  t: 'straight', o: 0 },
        { i: 3,  j: 6,  t: 'corner90', o: 0 },
        // Boulevard este
        { i: 4,  j: 6,  t: 'straight', o: 90 },
        { i: 5,  j: 6,  t: 'straight', o: 90 },
        { i: 6,  j: 6,  t: 'corner90', o: 270 },
        // Curva hacia el norte
        { i: 6,  j: 5,  t: 'straight', o: 0 },
        { i: 6,  j: 4,  t: 'straight', o: 0 },
        { i: 6,  j: 3,  t: 'corner90', o: 0 },
        // Recta alta hacia el este
        { i: 7,  j: 3,  t: 'straight', o: 90 },
        { i: 8,  j: 3,  t: 'straight', o: 90 },
        { i: 9,  j: 3,  t: 'straight', o: 90 },
        { i: 10, j: 3,  t: 'straight', o: 90 },
        { i: 11, j: 3,  t: 'straight', o: 90 },
        { i: 12, j: 3,  t: 'straight', o: 90 },
        { i: 13, j: 3,  t: 'straight', o: 90 },
        { i: 14, j: 3,  t: 'straight', o: 90 },
        { i: 15, j: 3,  t: 'straight', o: 90 },
        { i: 16, j: 3,  t: 'corner90', o: 90 },
        // Descenso hacia el sur
        { i: 16, j: 4,  t: 'straight', o: 0 },
        { i: 16, j: 5,  t: 'straight', o: 0 },
        { i: 16, j: 6,  t: 'straight', o: 0 },
        { i: 16, j: 7,  t: 'corner90', o: 180 },
        // Chicane portuaria
        { i: 15, j: 7,  t: 'straight', o: 90 },
        { i: 14, j: 7,  t: 'corner90', o: 0 },
        { i: 14, j: 8,  t: 'straight', o: 0 },
        { i: 14, j: 9,  t: 'corner90', o: 270 },
        { i: 15, j: 9,  t: 'straight', o: 90 },
        { i: 16, j: 9,  t: 'corner90', o: 90 },
        // Bajada final hacia la meta
        { i: 16, j: 10, t: 'straight', o: 0 },
        { i: 16, j: 11, t: 'corner90', o: 180 },
        { i: 15, j: 11, t: 'straight', o: 90 },
        { i: 14, j: 11, t: 'straight', o: 90 },
        { i: 13, j: 11, t: 'straight', o: 90 },
        { i: 12, j: 11, t: 'straight', o: 90 },
        { i: 11, j: 11, t: 'straight', o: 90 }
    ];

    const riviera = buildCustomCircuit({
        id: 'riviera_coast',
        name: 'RIVIERA MONACO HARBOR (Costa Azul GP)',
        cols: 20,
        rows: 14,
        waypoints: rivieraWps,
        decor: 'coastal'
    });

    // 2. Nordkette Alpine Pass (22x16)
    const alpineWps = [
        { i: 12, j: 13, t: 'finish', o: 90 },
        { i: 11, j: 13, t: 'straight', o: 90 },
        { i: 10, j: 13, t: 'straight', o: 90 },
        { i: 9,  j: 13, t: 'straight', o: 90 },
        { i: 8,  j: 13, t: 'straight', o: 90 },
        { i: 7,  j: 13, t: 'straight', o: 90 },
        { i: 6,  j: 13, t: 'straight', o: 90 },
        { i: 5,  j: 13, t: 'straight', o: 90 },
        { i: 4,  j: 13, t: 'corner90', o: 90 },
        // Subida escarpada
        { i: 4,  j: 12, t: 'straight', o: 0 },
        { i: 4,  j: 11, t: 'straight', o: 0 },
        { i: 4,  j: 10, t: 'straight', o: 0 },
        { i: 4,  j: 9,  t: 'straight', o: 0 },
        { i: 4,  j: 8,  t: 'corner90', o: 0 },
        // Serpentina intermedia
        { i: 5,  j: 8,  t: 'straight', o: 90 },
        { i: 6,  j: 8,  t: 'straight', o: 90 },
        { i: 7,  j: 8,  t: 'corner90', o: 270 },
        { i: 7,  j: 7,  t: 'straight', o: 0 },
        { i: 7,  j: 6,  t: 'straight', o: 0 },
        { i: 7,  j: 5,  t: 'corner90', o: 180 },
        { i: 6,  j: 5,  t: 'straight', o: 90 },
        { i: 5,  j: 5,  t: 'straight', o: 90 },
        { i: 4,  j: 5,  t: 'corner90', o: 0 },
        // Cima norte
        { i: 4,  j: 4,  t: 'straight', o: 0 },
        { i: 4,  j: 3,  t: 'straight', o: 0 },
        { i: 4,  j: 2,  t: 'corner90', o: 0 },
        { i: 5,  j: 2,  t: 'straight', o: 90 },
        { i: 6,  j: 2,  t: 'straight', o: 90 },
        { i: 7,  j: 2,  t: 'straight', o: 90 },
        { i: 8,  j: 2,  t: 'straight', o: 90 },
        { i: 9,  j: 2,  t: 'straight', o: 90 },
        { i: 10, j: 2,  t: 'straight', o: 90 },
        { i: 11, j: 2,  t: 'straight', o: 90 },
        { i: 12, j: 2,  t: 'straight', o: 90 },
        { i: 13, j: 2,  t: 'straight', o: 90 },
        { i: 14, j: 2,  t: 'straight', o: 90 },
        { i: 15, j: 2,  t: 'straight', o: 90 },
        { i: 16, j: 2,  t: 'straight', o: 90 },
        { i: 17, j: 2,  t: 'corner90', o: 90 },
        // Gran bajada alpina
        { i: 17, j: 3,  t: 'straight', o: 0 },
        { i: 17, j: 4,  t: 'straight', o: 0 },
        { i: 17, j: 5,  t: 'straight', o: 0 },
        { i: 17, j: 6,  t: 'straight', o: 0 },
        { i: 17, j: 7,  t: 'straight', o: 0 },
        { i: 17, j: 8,  t: 'straight', o: 0 },
        { i: 17, j: 9,  t: 'straight', o: 0 },
        { i: 17, j: 10, t: 'straight', o: 0 },
        { i: 17, j: 11, t: 'straight', o: 0 },
        { i: 17, j: 12, t: 'straight', o: 0 },
        { i: 17, j: 13, t: 'corner90', o: 180 },
        { i: 16, j: 13, t: 'straight', o: 90 },
        { i: 15, j: 13, t: 'straight', o: 90 },
        { i: 14, j: 13, t: 'straight', o: 90 },
        { i: 13, j: 13, t: 'straight', o: 90 }
    ];

    const alpine = buildCustomCircuit({
        id: 'nordkette_pass',
        name: 'NORDKETTE ALPINE PASS (Paso de Montaña)',
        cols: 22,
        rows: 16,
        waypoints: alpineWps,
        decor: 'alpine'
    });

    // 3. Silverstone Airfield (24x15)
    const airfieldWps = [
        { i: 12, j: 12, t: 'finish', o: 90 },
        { i: 11, j: 12, t: 'straight', o: 90 },
        { i: 10, j: 12, t: 'straight', o: 90 },
        { i: 9,  j: 12, t: 'straight', o: 90 },
        { i: 8,  j: 12, t: 'straight', o: 90 },
        { i: 7,  j: 12, t: 'straight', o: 90 },
        { i: 6,  j: 12, t: 'straight', o: 90 },
        { i: 5,  j: 12, t: 'straight', o: 90 },
        { i: 4,  j: 12, t: 'corner90', o: 90 },
        { i: 4,  j: 11, t: 'straight', o: 0 },
        { i: 4,  j: 10, t: 'straight', o: 0 },
        { i: 4,  j: 9,  t: 'corner90', o: 0 },
        // Eses amplias
        { i: 5,  j: 9,  t: 'straight', o: 90 },
        { i: 6,  j: 9,  t: 'straight', o: 90 },
        { i: 7,  j: 9,  t: 'corner90', o: 270 },
        { i: 7,  j: 8,  t: 'straight', o: 0 },
        { i: 7,  j: 7,  t: 'corner90', o: 0 },
        { i: 8,  j: 7,  t: 'straight', o: 90 },
        { i: 9,  j: 7,  t: 'straight', o: 90 },
        { i: 10, j: 7,  t: 'corner90', o: 270 },
        { i: 10, j: 6,  t: 'straight', o: 0 },
        { i: 10, j: 5,  t: 'corner90', o: 180 },
        { i: 9,  j: 5,  t: 'straight', o: 90 },
        { i: 8,  j: 5,  t: 'straight', o: 90 },
        { i: 7,  j: 5,  t: 'straight', o: 90 },
        { i: 6,  j: 5,  t: 'corner90', o: 0 },
        { i: 6,  j: 4,  t: 'straight', o: 0 },
        { i: 6,  j: 3,  t: 'corner90', o: 0 },
        // Gran Recta del Hangar
        { i: 7,  j: 3,  t: 'straight', o: 90 },
        { i: 8,  j: 3,  t: 'straight', o: 90 },
        { i: 9,  j: 3,  t: 'straight', o: 90 },
        { i: 10, j: 3,  t: 'straight', o: 90 },
        { i: 11, j: 3,  t: 'straight', o: 90 },
        { i: 12, j: 3,  t: 'straight', o: 90 },
        { i: 13, j: 3,  t: 'straight', o: 90 },
        { i: 14, j: 3,  t: 'straight', o: 90 },
        { i: 15, j: 3,  t: 'straight', o: 90 },
        { i: 16, j: 3,  t: 'straight', o: 90 },
        { i: 17, j: 3,  t: 'straight', o: 90 },
        { i: 18, j: 3,  t: 'straight', o: 90 },
        { i: 19, j: 3,  t: 'corner90', o: 90 },
        // Curva Stowe y Chicane final
        { i: 19, j: 4,  t: 'straight', o: 0 },
        { i: 19, j: 5,  t: 'straight', o: 0 },
        { i: 19, j: 6,  t: 'straight', o: 0 },
        { i: 19, j: 7,  t: 'straight', o: 0 },
        { i: 19, j: 8,  t: 'straight', o: 0 },
        { i: 19, j: 9,  t: 'straight', o: 0 },
        { i: 19, j: 10, t: 'straight', o: 0 },
        { i: 19, j: 11, t: 'straight', o: 0 },
        { i: 19, j: 12, t: 'corner90', o: 180 },
        { i: 18, j: 12, t: 'straight', o: 90 },
        { i: 17, j: 12, t: 'straight', o: 90 },
        { i: 16, j: 12, t: 'straight', o: 90 },
        { i: 15, j: 12, t: 'straight', o: 90 },
        { i: 14, j: 12, t: 'straight', o: 90 },
        { i: 13, j: 12, t: 'straight', o: 90 }
    ];

    const airfield = buildCustomCircuit({
        id: 'silverstone_airfield',
        name: 'AERODROME APEX GP (Aeródromo Clásico)',
        cols: 24,
        rows: 15,
        waypoints: airfieldWps,
        decor: 'airfield'
    });

    // 4. Neo-Tokyo Bay Ring (20x15)
    const tokyoWps = [
        { i: 10, j: 12, t: 'finish', o: 90 },
        { i: 9,  j: 12, t: 'straight', o: 90 },
        { i: 8,  j: 12, t: 'straight', o: 90 },
        { i: 7,  j: 12, t: 'straight', o: 90 },
        { i: 6,  j: 12, t: 'straight', o: 90 },
        { i: 5,  j: 12, t: 'straight', o: 90 },
        { i: 4,  j: 12, t: 'corner90', o: 90 },
        { i: 4,  j: 11, t: 'straight', o: 0 },
        { i: 4,  j: 10, t: 'straight', o: 0 },
        { i: 4,  j: 9,  t: 'straight', o: 0 },
        { i: 4,  j: 8,  t: 'corner90', o: 0 },
        { i: 5,  j: 8,  t: 'straight', o: 90 },
        { i: 6,  j: 8,  t: 'straight', o: 90 },
        { i: 7,  j: 8,  t: 'corner90', o: 90 },
        { i: 7,  j: 7,  t: 'straight', o: 0 },
        { i: 7,  j: 6,  t: 'corner90', o: 180 },
        { i: 6,  j: 6,  t: 'straight', o: 90 },
        { i: 5,  j: 6,  t: 'straight', o: 90 },
        { i: 4,  j: 6,  t: 'corner90', o: 0 },
        { i: 4,  j: 5,  t: 'straight', o: 0 },
        { i: 4,  j: 4,  t: 'straight', o: 0 },
        { i: 4,  j: 3,  t: 'corner90', o: 0 },
        { i: 5,  j: 3,  t: 'straight', o: 90 },
        { i: 6,  j: 3,  t: 'straight', o: 90 },
        { i: 7,  j: 3,  t: 'straight', o: 90 },
        { i: 8,  j: 3,  t: 'straight', o: 90 },
        { i: 9,  j: 3,  t: 'straight', o: 90 },
        { i: 10, j: 3,  t: 'straight', o: 90 },
        { i: 11, j: 3,  t: 'straight', o: 90 },
        { i: 12, j: 3,  t: 'straight', o: 90 },
        { i: 13, j: 3,  t: 'straight', o: 90 },
        { i: 14, j: 3,  t: 'straight', o: 90 },
        { i: 15, j: 3,  t: 'corner90', o: 90 },
        { i: 15, j: 4,  t: 'straight', o: 0 },
        { i: 15, j: 5,  t: 'straight', o: 0 },
        { i: 15, j: 6,  t: 'straight', o: 0 },
        { i: 15, j: 7,  t: 'corner90', o: 180 },
        { i: 14, j: 7,  t: 'straight', o: 90 },
        { i: 13, j: 7,  t: 'straight', o: 90 },
        { i: 12, j: 7,  t: 'corner90', o: 0 },
        { i: 12, j: 8,  t: 'straight', o: 0 },
        { i: 12, j: 9,  t: 'corner90', o: 270 },
        { i: 13, j: 9,  t: 'straight', o: 90 },
        { i: 14, j: 9,  t: 'straight', o: 90 },
        { i: 15, j: 9,  t: 'corner90', o: 90 },
        { i: 15, j: 10, t: 'straight', o: 0 },
        { i: 15, j: 11, t: 'straight', o: 0 },
        { i: 15, j: 12, t: 'corner90', o: 180 },
        { i: 14, j: 12, t: 'straight', o: 90 },
        { i: 13, j: 12, t: 'straight', o: 90 },
        { i: 12, j: 12, t: 'straight', o: 90 },
        { i: 11, j: 12, t: 'straight', o: 90 }
    ];

    const tokyo = buildCustomCircuit({
        id: 'neo_tokyo_bay',
        name: 'NEO-TOKYO BAY RING (Bahía Nocturna)',
        cols: 20,
        rows: 15,
        waypoints: tokyoWps,
        decor: 'tokyo'
    });

    // 5. Inter-Laguna Bowl (20x15)
    const lagunaWps = [
        { i: 10, j: 12, t: 'finish', o: 90 },
        { i: 9,  j: 12, t: 'straight', o: 90 },
        { i: 8,  j: 12, t: 'straight', o: 90 },
        { i: 7,  j: 12, t: 'straight', o: 90 },
        { i: 6,  j: 12, t: 'straight', o: 90 },
        { i: 5,  j: 12, t: 'straight', o: 90 },
        { i: 4,  j: 12, t: 'corner90', o: 90 },
        // Senna S inicial
        { i: 4,  j: 11, t: 'straight', o: 0 },
        { i: 4,  j: 10, t: 'corner90', o: 0 },
        { i: 5,  j: 10, t: 'straight', o: 90 },
        { i: 6,  j: 10, t: 'corner90', o: 270 },
        { i: 6,  j: 9,  t: 'straight', o: 0 },
        { i: 6,  j: 8,  t: 'corner90', o: 180 },
        { i: 5,  j: 8,  t: 'straight', o: 90 },
        { i: 4,  j: 8,  t: 'corner90', o: 0 },
        // Curva do Sol y recta opuesta
        { i: 4,  j: 7,  t: 'straight', o: 0 },
        { i: 4,  j: 6,  t: 'straight', o: 0 },
        { i: 4,  j: 5,  t: 'straight', o: 0 },
        { i: 4,  j: 4,  t: 'straight', o: 0 },
        { i: 4,  j: 3,  t: 'corner90', o: 0 },
        { i: 5,  j: 3,  t: 'straight', o: 90 },
        { i: 6,  j: 3,  t: 'straight', o: 90 },
        { i: 7,  j: 3,  t: 'straight', o: 90 },
        { i: 8,  j: 3,  t: 'straight', o: 90 },
        { i: 9,  j: 3,  t: 'straight', o: 90 },
        { i: 10, j: 3,  t: 'straight', o: 90 },
        { i: 11, j: 3,  t: 'straight', o: 90 },
        { i: 12, j: 3,  t: 'straight', o: 90 },
        { i: 13, j: 3,  t: 'straight', o: 90 },
        { i: 14, j: 3,  t: 'straight', o: 90 },
        { i: 15, j: 3,  t: 'corner90', o: 90 },
        // Ferradura doble vértice
        { i: 15, j: 4,  t: 'straight', o: 0 },
        { i: 15, j: 5,  t: 'straight', o: 0 },
        { i: 15, j: 6,  t: 'straight', o: 0 },
        { i: 15, j: 7,  t: 'straight', o: 0 },
        { i: 15, j: 8,  t: 'straight', o: 0 },
        { i: 15, j: 9,  t: 'straight', o: 0 },
        { i: 15, j: 10, t: 'straight', o: 0 },
        { i: 15, j: 11, t: 'straight', o: 0 },
        { i: 15, j: 12, t: 'corner90', o: 180 },
        { i: 14, j: 12, t: 'straight', o: 90 },
        { i: 13, j: 12, t: 'straight', o: 90 },
        { i: 12, j: 12, t: 'straight', o: 90 },
        { i: 11, j: 12, t: 'straight', o: 90 }
    ];

    const laguna = buildCustomCircuit({
        id: 'inter_laguna',
        name: 'INTER-LAGUNA BOWL (Autódromo Tropical)',
        cols: 20,
        rows: 15,
        waypoints: lagunaWps,
        decor: 'standard'
    });

    // 6. Sarthe 24H Legends (26x16)
    const sartheWps = [
        { i: 14, j: 13, t: 'finish', o: 90 },
        { i: 13, j: 13, t: 'straight', o: 90 },
        { i: 12, j: 13, t: 'straight', o: 90 },
        { i: 11, j: 13, t: 'straight', o: 90 },
        { i: 10, j: 13, t: 'straight', o: 90 },
        { i: 9,  j: 13, t: 'straight', o: 90 },
        { i: 8,  j: 13, t: 'straight', o: 90 },
        { i: 7,  j: 13, t: 'straight', o: 90 },
        { i: 6,  j: 13, t: 'straight', o: 90 },
        { i: 5,  j: 13, t: 'straight', o: 90 },
        { i: 4,  j: 13, t: 'corner90', o: 90 },
        // Curva Dunlop y subida
        { i: 4,  j: 12, t: 'straight', o: 0 },
        { i: 4,  j: 11, t: 'straight', o: 0 },
        { i: 4,  j: 10, t: 'straight', o: 0 },
        { i: 4,  j: 9,  t: 'straight', o: 0 },
        { i: 4,  j: 8,  t: 'straight', o: 0 },
        { i: 4,  j: 7,  t: 'straight', o: 0 },
        { i: 4,  j: 6,  t: 'straight', o: 0 },
        { i: 4,  j: 5,  t: 'straight', o: 0 },
        { i: 4,  j: 4,  t: 'straight', o: 0 },
        { i: 4,  j: 3,  t: 'corner90', o: 0 },
        // Recta colosal Mulsanne
        { i: 5,  j: 3,  t: 'straight', o: 90 },
        { i: 6,  j: 3,  t: 'straight', o: 90 },
        { i: 7,  j: 3,  t: 'straight', o: 90 },
        { i: 8,  j: 3,  t: 'straight', o: 90 },
        { i: 9,  j: 3,  t: 'straight', o: 90 },
        { i: 10, j: 3,  t: 'straight', o: 90 },
        { i: 11, j: 3,  t: 'straight', o: 90 },
        { i: 12, j: 3,  t: 'straight', o: 90 },
        { i: 13, j: 3,  t: 'straight', o: 90 },
        { i: 14, j: 3,  t: 'straight', o: 90 },
        { i: 15, j: 3,  t: 'straight', o: 90 },
        { i: 16, j: 3,  t: 'straight', o: 90 },
        { i: 17, j: 3,  t: 'straight', o: 90 },
        { i: 18, j: 3,  t: 'straight', o: 90 },
        { i: 19, j: 3,  t: 'straight', o: 90 },
        { i: 20, j: 3,  t: 'straight', o: 90 },
        { i: 21, j: 3,  t: 'corner90', o: 90 },
        // Mulsanne corner & Arnage
        { i: 21, j: 4,  t: 'straight', o: 0 },
        { i: 21, j: 5,  t: 'straight', o: 0 },
        { i: 21, j: 6,  t: 'straight', o: 0 },
        { i: 21, j: 7,  t: 'straight', o: 0 },
        { i: 21, j: 8,  t: 'straight', o: 0 },
        { i: 21, j: 9,  t: 'straight', o: 0 },
        { i: 21, j: 10, t: 'straight', o: 0 },
        { i: 21, j: 11, t: 'straight', o: 0 },
        { i: 21, j: 12, t: 'straight', o: 0 },
        { i: 21, j: 13, t: 'corner90', o: 180 },
        { i: 20, j: 13, t: 'straight', o: 90 },
        { i: 19, j: 13, t: 'straight', o: 90 },
        { i: 18, j: 13, t: 'straight', o: 90 },
        { i: 17, j: 13, t: 'straight', o: 90 },
        { i: 16, j: 13, t: 'straight', o: 90 },
        { i: 15, j: 13, t: 'straight', o: 90 }
    ];

    const sarthe = buildCustomCircuit({
        id: 'sarthe_endurance',
        name: 'SARTHE 24H SPEEDWAY (Leyenda de Resistencia)',
        cols: 26,
        rows: 16,
        waypoints: sartheWps,
        decor: 'standard'
    });

    return [riviera, alpine, airfield, tokyo, laguna, sarthe];
}

// 3. Ejecución principal y ensamblaje de la campaña completa de 22 circuitos
function main() {
    const dir = path.join(__dirname, 'dust_src', 'data', 'levels');

    // Nombres y temáticas 100% libres de derechos
    const officialTrackSpecs = [
        { file: 'ring.trk',           id: 'rookie_ring',          name: 'ROOKIE RING SPEEDWAY (Iniciación)' },
        { file: 'Radiator.trk',       id: 'radiator_oval',        name: 'RADIATOR OVAL PARK (Velocidad Básica)' },
        { file: 'triangle.trk',       id: 'tri_apex_coliseum',    name: 'TRI-APEX COLISEUM (Tri-Óvalo Técnico)' },
        { file: 'twister.trk',        id: 'twister_chicanes',     name: 'TWISTER S-CHICANES (Chicanes Enlazadas)' },

        { file: 'Crossroads.trk',     id: 'red_rock_junction',    name: 'RED ROCK JUNCTION (Cruce a Dos Niveles)' },
        { file: 'curvastone.trk',     id: 'curvastone_park',      name: 'CURVASTONE PARKWAY (Parque Británico)' },
        { file: 'Twineburg.trk',      id: 'schwarzwald_sprint',   name: 'SCHWARZWALD FOREST (Bosque Rápido)' },
        { file: 'Figure 8.trk',       id: 'overpass_figure8',     name: 'OVERPASS FIGURE-8 (Puente en Ocho)' },

        { file: 'Western Valley.trk', id: 'desert_canyon',        name: 'DESERT CANYON RIDGE (Desfiladero Árido)' },
        { file: 'Desert Storm.trk',   id: 'sandstorm_dunes',      name: 'SANDSTORM DUNES (Dunas y Grava)' },
        { file: 'Far Lands.trk',      id: 'badlands_endurance',   name: 'BADLANDS MEGA-ENDURANCE (Gran Resistencia)' },
        { file: 'infinity.trk',       id: 'infinity_loops',       name: 'INFINITY TWIN-LOOPS (Doble Bucle)' },

        { file: 'monza.trk',          id: 'brianza_speedway',     name: 'AUTODROMO BRIANZA (Templo de la Velocidad)' },
        { file: 'suzuka.trk',         id: 'sakura_ring',          name: 'SAKURA TWIN-RING (Curvas en 8 & Paso Elevado)' },
        { file: 'Diamond.trk',        id: 'diamond_apex',         name: 'DIAMOND APEX RING (Geometría Pura)' },
        { file: 'straight.trk',       id: 'super_dragway',        name: 'SUPER-STRAIGHT DRAGWAY (Punta Máxima)' }
    ];

    const allTracks = {};

    // Cargar y renombrar los 16 oficiales
    officialTrackSpecs.forEach(spec => {
        const filePath = path.join(dir, spec.file);
        const t = parseTrk(filePath, spec.id, spec.name);
        allTracks[spec.id] = t;
    });

    // Añadir alias de compatibilidad con IDs antiguos
    allTracks['monza'] = allTracks['brianza_speedway'];
    allTracks['suzuka'] = allTracks['sakura_ring'];
    allTracks['twineburg'] = allTracks['schwarzwald_sprint'];
    allTracks['crossroads'] = allTracks['red_rock_junction'];
    allTracks['western_valley'] = allTracks['desert_canyon'];
    allTracks['triangle'] = allTracks['tri_apex_coliseum'];

    // Añadir los 6 nuevos circuitos
    const newCircuits = generate6NewCircuits();
    newCircuits.forEach(t => {
        allTracks[t.id] = t;
    });

    console.log(`Compilando catálogo total de ${Object.keys(allTracks).length} circuitos...`);

    // Guardar tracks_data.json
    fs.writeFileSync('tracks_data.json', JSON.stringify(allTracks, null, 2), 'utf8');
    console.log('Guardado tracks_data.json con éxito');

    // Compilar tracks_data.js
    const jsContent = `// ===== AUTOGENERATED DUSTRAC TRACKS DATA: 22 CIRCUITOS =====
const DustracTracks = ${JSON.stringify(allTracks)};

if (typeof window !== 'undefined') {
    window.DustracTracks = DustracTracks;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DustracTracks;
}
`;
    fs.writeFileSync('tracks_data.js', jsContent, 'utf8');
    console.log(`Guardado tracks_data.js (${fs.statSync('tracks_data.js').size} bytes)`);
}

main();
