#!/usr/bin/env node
// Smoke público de producción. No usa credenciales ni modifica cuentas.
// Uso:
//   node scripts/production_smoke.js https://tu-servicio.onrender.com
//   node scripts/production_smoke.js https://... --strict
//   node scripts/production_smoke.js https://... --skip-version
//
// En modo --strict, la configuración incompleta de lanzamiento (Admin,
// canal humano de soporte o Adsgram) se considera fallo. Sin --strict se reporta
// como aviso, pero una caída del servicio o un interruptor peligroso sí
// sigue siendo fallo.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const skipVersion = args.includes('--skip-version');
const jsonOutput = args.includes('--json');
const positional = args.filter(arg => !arg.startsWith('--'));
const BASE = String(positional[0] || 'https://dust-and-nitro-game.onrender.com').replace(/\/+$/, '');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const expectedVersionArg = args.find(arg => arg.startsWith('--expected-version='));
const expectedVersion = skipVersion ? null : (expectedVersionArg ? expectedVersionArg.split('=').slice(1).join('=') : pkg.version);
const expectedSchemaArg = args.find(arg => arg.startsWith('--expected-schema='));
const expectedSchema = expectedSchemaArg ? Number(expectedSchemaArg.split('=')[1]) : 106;

const results = [];
function record(level, name, detail) {
    results.push({ level, name, detail: detail || '' });
}
function pass(name, detail) { record('pass', name, detail); }
function warn(name, detail) { record(strict ? 'fail' : 'warn', name, detail); }
function fail(name, detail) { record('fail', name, detail); }

async function request(pathname, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(BASE + pathname, {
            redirect: 'follow',
            signal: controller.signal,
            headers: { 'User-Agent': 'ApexMotorsportProductionSmoke/1.0', ...(options.headers || {}) }
        });
        const text = await response.text();
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (e) {}
        return { status: response.status, headers: response.headers, text, json };
    } finally {
        clearTimeout(timer);
    }
}

function checkVersion(label, actual) {
    if (!expectedVersion) return;
    if (actual === expectedVersion) pass(`${label} anuncia ${expectedVersion}`);
    else fail(`${label} anuncia una versión distinta`, `esperada ${expectedVersion}, recibida ${actual || '(vacía)'}`);
}

(async () => {
    let home = null;
    try {
        home = await request('/');
        if (home.status === 200 && /Apex Motorsport/i.test(home.text)) pass('Portada responde');
        else fail('Portada no responde correctamente', `HTTP ${home.status}`);
        if (expectedVersion) {
            const assetVersion = String(expectedVersion).replace(/\D/g, '');
            const versions = [...new Set([...home.text.matchAll(/\?v=(\d+)/g)].map(match => match[1]))];
            if (versions.length === 1 && versions[0] === assetVersion) pass(`Assets principales con ?v=${assetVersion}`);
            else fail('Assets principales con versión inesperada', versions.join(', ') || 'sin ?v=');
        }
    } catch (error) {
        fail('Portada inaccesible', error.message);
    }

    try {
        const health = await request('/healthz');
        if (health.status === 200 && health.json && health.json.ok === true) pass('/healthz OK', `uptime ${health.json.uptimeSeconds}s`);
        else fail('/healthz no está sano', `HTTP ${health.status}`);
        if (health.json) checkVersion('/healthz', health.json.version);
    } catch (error) {
        fail('/healthz inaccesible', error.message);
    }

    try {
        const ready = await request('/readyz');
        if (ready.status === 200 && ready.json && ready.json.ready === true) pass('/readyz OK');
        else fail('/readyz no está listo', `HTTP ${ready.status}`);
        if (ready.json) {
            checkVersion('/readyz', ready.json.version);
            if (Number(ready.json.schemaVersion) === expectedSchema) pass(`Esquema SQLite ${expectedSchema}`);
            else fail('Esquema SQLite inesperado', `esperado ${expectedSchema}, recibido ${ready.json.schemaVersion}`);
        }
    } catch (error) {
        fail('/readyz inaccesible', error.message);
    }

    let config = null;
    try {
        const response = await request('/api/config');
        config = response.json;
        if (response.status === 200 && config && config.ok === true) pass('/api/config responde');
        else fail('/api/config no responde correctamente', `HTTP ${response.status}`);
        if (config) checkVersion('/api/config', config.version);
    } catch (error) {
        fail('/api/config inaccesible', error.message);
    }

    if (config) {
        const features = config.features || {};
        if (features.marketplaceEnabled === true && config.marketplace && config.marketplace.enabled === true) pass('Mercado P2P activado');
        else warn('Mercado P2P no aparece activado');

        const safeOff = [
            ['nftMintingEnabled', 'Acuñación NFT'],
            ['telegramTonPurchasesEnabled', 'Compras TON dentro de Telegram'],
            ['wagerStakesEnabled', 'Apuestas con saldo'],
            ['weeklyTournamentEnabled', 'Torneo semanal con entrada']
        ];
        for (const [key, label] of safeOff) {
            if (features[key] === false) pass(`${label} desactivada`);
            else fail(`${label} debería seguir desactivada`, `${key}=${String(features[key])}`);
        }

        if (config.support && config.support.tickets && config.support.tickets.ready === true) pass('Tickets privados de soporte listos');
        else if (config.support && (config.support.contact || config.support.url)) warn('Soporte público configurado, pero los tickets privados del bot no están listos');
        else warn('Falta activar tickets privados de soporte o SUPPORT_CONTACT/SUPPORT_URL');

        if (config.adsgram && config.adsgram.enabled === false) pass('Adsgram desactivado deliberadamente; el cliente no mostrará anuncios');
        else if (config.adsgram && config.adsgram.ready === true) pass('Adsgram listo según /api/config');
        else if (config.adsgram) warn('Adsgram no está listo según /api/config');
        else warn('/api/config todavía no anuncia el estado de Adsgram');

        if (config.nft && config.nft.mintingEnabled === false && !config.nft.collectionAddress) {
            pass('NFT sigue en preparación, sin colección ni acuñación');
        } else {
            warn('Revisar estado público NFT antes de anunciarlo como acuñado');
        }
    }

    for (const page of ['/terms.html', '/privacy.html', '/support.html']) {
        try {
            const response = await request(page);
            if (response.status === 200 && /<title/i.test(response.text)) pass(`${page} responde`);
            else fail(`${page} no responde correctamente`, `HTTP ${response.status}`);
        } catch (error) {
            fail(`${page} inaccesible`, error.message);
        }
    }

    for (const sensitive of ['/server.js', '/database.js', '/.env', '/game_database.sqlite']) {
        try {
            const response = await request(sensitive);
            if (response.status === 404) pass(`${sensitive} no se sirve`);
            else fail(`${sensitive} debería devolver 404`, `HTTP ${response.status}`);
        } catch (error) {
            fail(`${sensitive} no se pudo comprobar`, error.message);
        }
    }

    try {
        const admin = await request('/api/admin/launch-readiness');
        if (admin.status === 403) pass('ADMIN_AUDIT_TOKEN parece configurado (sin token: 403)');
        else if (admin.status === 503 && admin.json && admin.json.error === 'admin_not_configured') warn('ADMIN_AUDIT_TOKEN no está configurado');
        else warn('Respuesta inesperada al comprobar Admin', `HTTP ${admin.status}`);
    } catch (error) {
        fail('No se pudo comprobar Admin', error.message);
    }

    if (config && config.adsgram && config.adsgram.enabled === false) {
        pass('No se sondea el webhook porque Adsgram está desactivado');
    } else {
        try {
            const ads = await request('/api/ad-reward');
            if (ads.status === 403) pass('Webhook Adsgram configurado (sin secreto: 403)');
            else if (ads.status === 503 && ads.json && ads.json.error === 'ad_reward_not_configured') warn('ADSGRAM_WEBHOOK_SECRET no está configurado');
            else warn('Respuesta inesperada al comprobar Adsgram', `HTTP ${ads.status}`);
        } catch (error) {
            fail('No se pudo comprobar Adsgram', error.message);
        }
    }

    const failures = results.filter(item => item.level === 'fail');
    const warnings = results.filter(item => item.level === 'warn');
    if (jsonOutput) {
        console.log(JSON.stringify({ base: BASE, strict, expectedVersion, expectedSchema, results, failures: failures.length, warnings: warnings.length }, null, 2));
    } else {
        console.log(`Smoke de producción: ${BASE}${strict ? ' (strict)' : ''}`);
        for (const item of results) {
            const icon = item.level === 'pass' ? '✓' : (item.level === 'warn' ? '!' : '✗');
            console.log(`${icon} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
        }
        console.log(`\nResultado: ${failures.length} fallos, ${warnings.length} avisos.`);
    }
    if (failures.length) process.exit(1);
})().catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
