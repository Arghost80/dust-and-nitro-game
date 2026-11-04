'use strict';

/*
 * Pruebas cuantitativas de conducción.
 *
 * No se limitan a un fotograma: miden pulsaciones completas del botón de
 * dirección a 30/60/120 FPS y recorren vueltas completas siguiendo la
 * polilínea oficial de varios circuitos con un controlador de botones.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
let failures = 0;

function check(condition, label, details) {
    if (condition) {
        console.log(`✅ ${label}`);
    } else {
        failures++;
        console.error(`❌ ${label}`);
        if (details !== undefined) console.error('   ', details);
    }
}

function inRange(value, min, max) {
    return Number.isFinite(value) && value >= min && value <= max;
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function range(values) {
    return [Math.min(...values), median(values), Math.max(...values)];
}

// ---------- Carga del catálogo y de las funciones reales de dirección ----------
const sandbox = {
    console,
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    document: {
        getElementById: () => null,
        addEventListener: () => {}
    },
    addEventListener: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'nft_cars_data.js'), 'utf8'), sandbox, {
    filename: 'nft_cars_data.js'
});

const gameSource = fs.readFileSync(path.join(ROOT, 'dustrac_game.js'), 'utf8');
const steeringStart = gameSource.indexOf('// ===== DIRECCIÓN EN TIEMPO REAL');
const steeringEnd = gameSource.indexOf('// ===== PRELOAD:', steeringStart);
if (steeringStart < 0 || steeringEnd <= steeringStart) {
    throw new Error('No se encontró el bloque real de dirección en dustrac_game.js');
}
vm.runInContext(gameSource.slice(steeringStart, steeringEnd), sandbox, {
    filename: 'dustrac_game.js#steering'
});

const models = vm.runInContext('NFT_CAR_MODELS', sandbox);
const calculateCarPerformance = vm.runInContext('calculateCarPerformance', sandbox);
const physics = sandbox.ApexDrivingPhysics;
if (!physics) throw new Error('ApexDrivingPhysics no quedó expuesto por dustrac_game.js');

const MAX_PARTS = {
    speed_power: 5,
    braking: 5,
    handling_grip: 5,
    accel_traction: 5,
    aero_lightness: 5
};

function performanceFor(model, level, parts) {
    return calculateCarPerformance({
        stats: model.stats,
        level,
        parts: parts || {}
    });
}

const level1 = models.map(model => performanceFor(model, 1, {}));
const level10 = models.map(model => performanceFor(model, 10, {
    speed_power: 2,
    braking: 2,
    handling_grip: 2,
    accel_traction: 2,
    aero_lightness: 2
}));
const level50 = models.map(model => performanceFor(model, 50, MAX_PARTS));

console.log('\n--- RANGOS DE FÍSICAS POR PROGRESIÓN ---');
for (const [label, perfs] of [['Nivel 1', level1], ['Nivel 10 + ramas 2', level10], ['Nivel 50 maximizado', level50]]) {
    console.log(
        `${label}: velocidad ${range(perfs.map(p => p.speedKmh)).join('/')} | ` +
        `aceleración ${range(perfs.map(p => p.accelVal)).join('/')} | ` +
        `manejo ${range(perfs.map(p => p.handlingVal)).join('/')}`
    );
}

check(
    Math.min(...level1.map(p => p.speedKmh)) === 310
        && Math.max(...level1.map(p => p.speedKmh)) === 404
        && Math.min(...level1.map(p => p.handlingVal)) === 3.62
        && Math.max(...level1.map(p => p.handlingVal)) === 4.46,
    'los coches de nivel 1 conservan exactamente sus físicas históricas'
);
check(
    level50.every(p => p.speedKmh >= 600 && p.speedKmh <= 650),
    'un coche maximizado sigue siendo muy rápido, pero no supera 650 px/s',
    range(level50.map(p => p.speedKmh))
);
check(
    level50.every(p => p.accelVal >= 540 && p.accelVal <= 600),
    'la aceleración maximizada queda en una zona controlable (540–600)',
    range(level50.map(p => p.accelVal))
);
check(
    level50.every(p => p.handlingVal >= 7.8 && p.handlingVal <= 8.25),
    'el manejo maximizado queda acotado antes de llegar al volante (7,8–8,25)',
    range(level50.map(p => p.handlingVal))
);
check(
    level50.every((p, i) => p.speedKmh > level1[i].speedKmh && p.handlingVal > level1[i].handlingVal),
    'la progresión hasta nivel 50 sigue mejorando todos los coches'
);

// ---------- Pulsaciones del botón de giro ----------
function simulateButton({ fps = 60, holdSec = 0.10, settleSec = 0.30, handling = 4.0, speed = 300, direction = 1, grip = 1 }) {
    const dt = 1 / fps;
    const totalFrames = Math.round((holdSec + settleSec) * fps);
    const holdFrames = Math.round(holdSec * fps);
    let steerInput = 0;
    let angle = 0;
    for (let frame = 0; frame < totalFrames; frame++) {
        const desired = frame < holdFrames ? direction : 0;
        steerInput = physics.smoothPlayerSteerInput(steerInput, desired, dt);
        angle += physics.playerSteeringStepDeg({
            handling,
            speed,
            dt,
            steerInput,
            grip
        });
    }
    return angle;
}

function checkButtonScenario(label, options, minAbs, maxAbs, maxFpsSpread = 4) {
    const results = [30, 60, 120].map(fps => simulateButton({ ...options, fps }));
    const magnitudes = results.map(Math.abs);
    const spread = Math.max(...magnitudes) - Math.min(...magnitudes);
    console.log(`${label}: ${results.map(v => v.toFixed(1) + '°').join(' / ')} (30/60/120 FPS)`);
    check(
        magnitudes.every(v => inRange(v, minAbs, maxAbs)) && spread <= maxFpsSpread,
        `${label} es predecible y no depende de los FPS`,
        { results, spread }
    );
    return results;
}

console.log('\n--- PULSACIONES DE DIRECCIÓN ---');
check(inRange(physics.handlingYawRateDegPerSec(3.62), 155, 162), 'guiñada máxima de un coche básico: 155–162°/s');
check(inRange(physics.handlingYawRateDegPerSec(4.46), 168, 174), 'guiñada máxima de un legendario inicial: 168–174°/s');
check(inRange(physics.handlingYawRateDegPerSec(8.20), 198, 205), 'guiñada máxima de un coche maximizado: 198–205°/s');
check(physics.handlingYawRateDegPerSec(1000) <= 215, 'ningún valor de manejo puede superar 215°/s');

checkButtonScenario('Toque de 0,10 s, coche normal a 300 px/s', { handling: 4.0, speed: 300, holdSec: 0.10 }, 9, 16);
checkButtonScenario('Toque de 0,10 s, coche maximizado a 300 px/s', { handling: 8.2, speed: 300, holdSec: 0.10 }, 11, 18);
checkButtonScenario('Pulsación de 0,25 s, coche normal', { handling: 4.0, speed: 300, holdSec: 0.25 }, 30, 48);
checkButtonScenario('Pulsación de 0,25 s, coche maximizado', { handling: 8.2, speed: 300, holdSec: 0.25 }, 38, 52);
checkButtonScenario('Pulsación de 0,50 s, coche normal', { handling: 4.0, speed: 300, holdSec: 0.50 }, 65, 100);
checkButtonScenario('Pulsación de 0,50 s, coche maximizado', { handling: 8.2, speed: 300, holdSec: 0.50 }, 80, 105);
checkButtonScenario('Pulsación de 0,50 s a velocidad máxima de equipo', { handling: 8.2, speed: 638, holdSec: 0.50 }, 55, 78);

const oneSecondNormal = Math.abs(simulateButton({ handling: 4.0, speed: 300, holdSec: 1.0 }));
const oneSecondMax = Math.abs(simulateButton({ handling: 8.2, speed: 300, holdSec: 1.0 }));
console.log(`Mantener 1,00 s: normal ${oneSecondNormal.toFixed(1)}°, maximizado ${oneSecondMax.toFixed(1)}°`);
check(oneSecondNormal >= 130 && oneSecondNormal <= 165, 'mantener un segundo permite una curva muy cerrada sin dar media vuelta instantánea en un coche normal');
check(oneSecondMax >= 165 && oneSecondMax <= 195, 'mantener un segundo en el coche maximizado permite el cambio de sentido solo como maniobra sostenida');

check(simulateButton({ handling: 8.2, speed: 0, holdSec: 1 }) === 0, 'el coche parado no rota sobre sí mismo');
const reverseTap = simulateButton({ handling: 4.0, speed: -150, holdSec: 0.10, direction: -1 });
console.log(`Toque a la izquierda marcha atrás: morro ${reverseTap.toFixed(1)}°`);
check(reverseTap > 9 && reverseTap < 17, 'marcha atrás invierte el morro como un coche real y con la misma autoridad acotada');

const stalledFrameStep = Math.abs(physics.playerSteeringStepDeg({
    handling: 8.2,
    speed: 300,
    dt: 1,
    steerInput: 1,
    grip: 1
}));
console.log(`Un fotograma bloqueado de 1 s solo puede aplicar ${stalledFrameStep.toFixed(1)}°`);
check(stalledFrameStep <= 11, 'un tirón de rendimiento no puede convertir un fotograma en un trompo');

// ---------- Vueltas completas siguiendo circuitos oficiales ----------
const tracks = JSON.parse(fs.readFileSync(path.join(ROOT, 'tracks_data.json'), 'utf8'));
const wrapDeg = deg => {
    let d = (deg + 180) % 360;
    if (d < 0) d += 360;
    return d - 180;
};
const toRad = deg => deg * Math.PI / 180;
const toDeg = rad => rad * 180 / Math.PI;

function prepareTrack(track) {
    const points = [];
    for (const node of track.nodes || []) {
        const point = { x: Number(node.x), y: Number(node.y) };
        const prev = points[points.length - 1];
        if (!prev || Math.hypot(point.x - prev.x, point.y - prev.y) > 1) points.push(point);
    }
    if (points.length > 1) {
        const first = points[0];
        const last = points[points.length - 1];
        if (Math.hypot(first.x - last.x, first.y - last.y) <= 1) points.pop();
    }
    const segments = [];
    let total = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        segments.push({ a, b, len, start: total });
        total += len;
    }
    return { points, segments, total };
}

function pointAtDistance(prepared, distance) {
    const d = ((distance % prepared.total) + prepared.total) % prepared.total;
    const segment = prepared.segments.find(s => d >= s.start && d <= s.start + s.len) || prepared.segments[prepared.segments.length - 1];
    const t = segment.len ? (d - segment.start) / segment.len : 0;
    return {
        x: segment.a.x + (segment.b.x - segment.a.x) * t,
        y: segment.a.y + (segment.b.y - segment.a.y) * t,
        angle: toDeg(Math.atan2(segment.b.y - segment.a.y, segment.b.x - segment.a.x))
    };
}

function nearestOnTrack(prepared, pos) {
    let best = { dist: Infinity, s: 0 };
    for (const segment of prepared.segments) {
        const vx = segment.b.x - segment.a.x;
        const vy = segment.b.y - segment.a.y;
        const lenSq = vx * vx + vy * vy;
        let t = lenSq ? ((pos.x - segment.a.x) * vx + (pos.y - segment.a.y) * vy) / lenSq : 0;
        t = Math.max(0, Math.min(1, t));
        const x = segment.a.x + vx * t;
        const y = segment.a.y + vy * t;
        const dist = Math.hypot(pos.x - x, pos.y - y);
        if (dist < best.dist) best = { dist, s: segment.start + segment.len * t };
    }
    return best;
}

function simulateLap(trackId, car) {
    const prepared = prepareTrack(tracks[trackId]);
    const dt = 1 / 60;
    // 160 s deja margen a la vuelta más larga con el coche mediano de nivel 1.
    const maxSteps = Math.round(160 / dt);
    let pos = { ...prepared.points[0] };
    let heading = pointAtDistance(prepared, 1).angle;
    let speed = 0;
    let steerInput = 0;
    let desiredSteer = 0;
    let decisionTimer = 0;
    let progress = 0;
    let lastRawS = 0;
    let time = 0;
    const lateralSamples = [];

    for (let step = 0; step < maxSteps; step++) {
        const nearest = nearestOnTrack(prepared, pos);
        let ds = nearest.s - lastRawS;
        if (ds < -prepared.total / 2) ds += prepared.total;
        if (ds > prepared.total / 2) ds -= prepared.total;
        progress += ds;
        lastRawS = nearest.s;
        if (time > 2) lateralSamples.push(nearest.dist);
        if (progress >= prepared.total) break;

        const lookAhead = 55 + speed * 0.48;
        const target = pointAtDistance(prepared, progress + lookAhead);
        const headingError = wrapDeg(toDeg(Math.atan2(target.y - pos.y, target.x - pos.x)) - heading);
        const bend = Math.abs(wrapDeg(
            pointAtDistance(prepared, progress + lookAhead * 1.25).angle
            - pointAtDistance(prepared, progress + lookAhead * 0.35).angle
        ));

        let targetSpeed = car.top;
        if (bend > 65) targetSpeed = 215;
        else if (bend > 40) targetSpeed = 285;
        else if (bend > 20) targetSpeed = 365;
        else if (bend > 10) targetSpeed = Math.min(car.top, 450);
        if (Math.abs(headingError) > 60) targetSpeed = Math.min(targetSpeed, 205);
        else if (Math.abs(headingError) > 35) targetSpeed = Math.min(targetSpeed, 285);
        else if (Math.abs(headingError) > 20) targetSpeed = Math.min(targetSpeed, 370);
        if (nearest.dist > 60) targetSpeed *= 0.82;

        // Piloto de botones: decide cada 80 ms y solo puede aplicar -1, 0 o +1.
        decisionTimer -= dt;
        if (decisionTimer <= 0) {
            desiredSteer = Math.abs(headingError) < 2 ? 0 : Math.sign(headingError);
            decisionTimer = 0.08;
        }

        if (speed < targetSpeed) speed = Math.min(targetSpeed, speed + car.accel * dt);
        else speed = Math.max(targetSpeed, speed - car.accel * 2.2 * dt);

        steerInput = physics.smoothPlayerSteerInput(steerInput, desiredSteer, dt);
        heading = wrapDeg(heading + physics.playerSteeringStepDeg({
            handling: car.handling,
            speed,
            dt,
            steerInput,
            grip: 1
        }));
        pos.x += Math.cos(toRad(heading)) * speed * dt;
        pos.y += Math.sin(toRad(heading)) * speed * dt;
        time += dt;
    }

    lateralSamples.sort((a, b) => a - b);
    const percentile = p => lateralSamples[Math.min(lateralSamples.length - 1, Math.floor(lateralSamples.length * p))] || 0;
    return {
        trackId,
        car: car.name,
        completed: progress >= prepared.total,
        progressPct: Math.min(100, progress / prepared.total * 100),
        time,
        maxLateral: Math.max(...lateralSamples, 0),
        p95Lateral: percentile(0.95)
    };
}

const sortedLevel1 = [...level1].sort((a, b) => a.speedKmh - b.speedKmh);
const normalPerf = sortedLevel1[Math.floor(sortedLevel1.length / 2)];
const teamPerf = [...level50].sort((a, b) => b.speedKmh - a.speedKmh)[0];
const lapCars = [
    { name: 'nivel 1 mediano', top: normalPerf.speedKmh, accel: normalPerf.accelVal, handling: normalPerf.handlingVal },
    { name: 'nivel 50 maximizado', top: teamPerf.speedKmh, accel: teamPerf.accelVal, handling: teamPerf.handlingVal }
];

console.log('\n--- VUELTAS COMPLETAS CON BOTONES ---');
for (const trackId of Object.keys(tracks)) {
    for (const car of lapCars) {
        const result = simulateLap(trackId, car);
        console.log(
            `${trackId} / ${car.name}: ${result.progressPct.toFixed(1)}% en ${result.time.toFixed(1)} s; ` +
            `desviación p95 ${result.p95Lateral.toFixed(1)} px, máxima ${result.maxLateral.toFixed(1)} px`
        );
        check(
            result.completed && result.p95Lateral <= 60 && result.maxLateral <= 85,
            `vuelta completable sin trompos en ${trackId} con ${car.name}`,
            result
        );
    }
}

console.log(`\nRESULTADO PRUEBAS DE CONDUCCIÓN: ${failures === 0 ? 'OK' : failures + ' fallo(s)'}`);
process.exitCode = failures ? 1 : 0;
