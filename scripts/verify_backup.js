#!/usr/bin/env node
// Verifica una copia SQLite generada por el servidor sin abrirla en modo
// escritura. Uso:
//   node scripts/verify_backup.js /ruta/apex-sqlite-....sqlite
//   node scripts/verify_backup.js copia.sqlite --json
//
// No imprime IDs de usuario ni contenido de perfiles. Un resultado correcto
// demuestra que el archivo es íntegro y coherente; la restauración completa
// debe probarse además arrancando una copia en un entorno aislado.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const expectedSchemaArg = args.find(arg => arg.startsWith('--expected-schema='));
const expectedSchema = expectedSchemaArg ? Number(expectedSchemaArg.split('=')[1]) : 106;
const fileArg = args.find(arg => !arg.startsWith('--'));

if (!fileArg) {
    console.error('Uso: node scripts/verify_backup.js <copia.sqlite> [--expected-schema=106] [--json]');
    process.exit(2);
}

const file = path.resolve(fileArg);
const checks = [];
function record(level, name, detail) {
    checks.push({ level, name, detail: detail || '' });
}
function pass(name, detail) { record('pass', name, detail); }
function warn(name, detail) { record('warn', name, detail); }
function fail(name, detail) { record('fail', name, detail); }

function sha256File(filename) {
    const hash = crypto.createHash('sha256');
    const fd = fs.openSync(filename, 'r');
    try {
        const buffer = Buffer.allocUnsafe(1024 * 1024);
        let bytesRead = 0;
        do {
            bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
            if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
        } while (bytesRead > 0);
    } finally {
        fs.closeSync(fd);
    }
    return hash.digest('hex');
}

function count(db, table) {
    return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count || 0);
}

function scalar(db, sql, params = []) {
    const row = db.prepare(sql).get(...params);
    if (!row) return 0;
    const value = Object.values(row)[0];
    return Number(value) || 0;
}

function checkJsonColumns(db, table, columns) {
    let rowsChecked = 0;
    let invalid = 0;
    const select = db.prepare(`SELECT rowid AS _rowid, ${columns.join(', ')} FROM ${table}`);
    for (const row of select.iterate()) {
        rowsChecked++;
        for (const column of columns) {
            const value = row[column];
            if (value == null) continue;
            try {
                JSON.parse(String(value));
            } catch (e) {
                invalid++;
            }
        }
    }
    if (invalid === 0) pass(`JSON válido en ${table}`, `${rowsChecked} filas`);
    else fail(`JSON inválido en ${table}`, `${invalid} valores`);
    return rowsChecked;
}

let db = null;
const summary = { file: path.basename(file), bytes: 0, sha256: null, schemaVersion: null, counts: {}, checks };
try {
    if (!fs.existsSync(file)) throw new Error('El archivo no existe');
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size === 0) throw new Error('El archivo está vacío o no es un archivo');
    summary.bytes = stat.size;
    summary.sha256 = sha256File(file);
    pass('Archivo presente', `${stat.size} bytes · sha256 ${summary.sha256}`);

    for (const suffix of ['-wal', '-shm']) {
        const sidecar = file + suffix;
        if (fs.existsSync(sidecar) && fs.statSync(sidecar).size > 0) {
            warn(`Existe sidecar ${suffix}`, 'usa preferentemente una copia generada con SQLite backup, no una copia en caliente incompleta');
        }
    }

    db = new SqliteDatabase(file, { readonly: true, fileMustExist: true });
    const integrityRows = db.prepare('PRAGMA integrity_check').all();
    const integrityValues = integrityRows.map(row => String(Object.values(row)[0] || ''));
    if (integrityValues.length === 1 && integrityValues[0] === 'ok') pass('PRAGMA integrity_check = ok');
    else fail('PRAGMA integrity_check no es ok', integrityValues.slice(0, 5).join('; '));

    const foreignKeyRows = db.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeyRows.length === 0) pass('PRAGMA foreign_key_check sin violaciones');
    else fail('Violaciones de claves foráneas', `${foreignKeyRows.length} filas`);

    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(row => row.name));
    const requiredTables = [
        'schema_migrations', 'meta', 'users', 'saves', 'device_credentials',
        'economy_profiles', 'economy_ledger', 'purchases', 'processed_ton_tx',
        'processed_payment_charges', 'nft_car_registry', 'nft_mint_claims',
        'marketplace_listings', 'marketplace_trades', 'leaderboard_entries',
        'ad_reward_entitlements', 'audit_events'
    ];
    const missingTables = requiredTables.filter(table => !tables.has(table));
    if (missingTables.length === 0) pass('Existen todas las tablas requeridas');
    else fail('Faltan tablas requeridas', missingTables.join(', '));

    if (tables.has('schema_migrations')) {
        summary.schemaVersion = scalar(db, 'SELECT COALESCE(MAX(version), 0) FROM schema_migrations');
        if (summary.schemaVersion === expectedSchema) pass(`Esquema ${expectedSchema} presente`);
        else fail('Esquema inesperado', `esperado ${expectedSchema}, encontrado ${summary.schemaVersion}`);
    }

    for (const table of requiredTables) {
        if (tables.has(table)) summary.counts[table] = count(db, table);
    }

    const jsonColumns = {
        users: ['data_json'],
        saves: ['data_json'],
        economy_profiles: ['garage_json'],
        economy_ledger: ['details_json'],
        purchases: ['data_json'],
        processed_payment_charges: ['data_json'],
        nft_car_registry: ['snapshot_json'],
        nft_mint_claims: ['snapshot_json'],
        marketplace_listings: ['asset_json', 'public_snapshot_json'],
        marketplace_trades: ['asset_json'],
        audit_events: ['details_json'],
        meta: ['value_json']
    };
    for (const [table, columns] of Object.entries(jsonColumns)) {
        if (tables.has(table)) checkJsonColumns(db, table, columns);
    }

    if (tables.has('economy_profiles')) {
        let profiles = 0;
        let invalidProfiles = 0;
        for (const row of db.prepare('SELECT garage_json FROM economy_profiles').iterate()) {
            profiles++;
            let garage = null;
            try { garage = JSON.parse(row.garage_json); } catch (e) {}
            const carsValid = garage && Array.isArray(garage.garage) && garage.garage.length > 0
                && garage.garage.every(car => car && typeof car === 'object' && typeof car.instanceId === 'string'
                    && car.instanceId.length >= 1 && car.instanceId.length <= 120);
            const balancesValid = garage && ['credits', 'gems'].every(field => {
                const value = Number(garage[field]);
                return Number.isFinite(value) && value >= 0 && value <= 1000000000;
            });
            if (!garage || typeof garage !== 'object' || !carsValid || !balancesValid) invalidProfiles++;
        }
        if (invalidProfiles === 0) pass('Perfiles económicos con forma válida', `${profiles} perfiles`);
        else fail('Perfiles económicos inválidos', `${invalidProfiles} de ${profiles}`);
    }

    if (tables.has('marketplace_listings') && tables.has('marketplace_trades')) {
        const soldWithoutTrade = scalar(db, `
            SELECT COUNT(*) FROM marketplace_listings l
            LEFT JOIN marketplace_trades t ON t.listing_id = l.listing_id
            WHERE l.status = 'sold' AND t.trade_id IS NULL`);
        if (soldWithoutTrade === 0) pass('Toda venta del mercado tiene su trade');
        else fail('Ventas del mercado sin trade', `${soldWithoutTrade}`);

        const badTradeMath = scalar(db, `
            SELECT COUNT(*) FROM marketplace_trades
            WHERE gross_cr <> seller_net_cr + fee_cr
               OR fee_cr <> platform_fee_cr + burn_fee_cr + rewards_fee_cr`);
        if (badTradeMath === 0) pass('La aritmética bruto/fee/neto de trades cuadra');
        else fail('Trades con aritmética incoherente', `${badTradeMath}`);

        const badListingMath = scalar(db, `
            SELECT COUNT(*) FROM marketplace_listings
            WHERE status = 'sold' AND (
                gross_cr IS NULL OR fee_cr IS NULL OR seller_net_cr IS NULL
                OR gross_cr <> price_cr OR gross_cr <> seller_net_cr + fee_cr)`);
        if (badListingMath === 0) pass('Las ventas conservan su cotización liquidada');
        else fail('Ventas con cotización incoherente', `${badListingMath}`);
    }

    if (tables.has('nft_car_registry')) {
        const invalidIdentities = scalar(db, `
            SELECT COUNT(*) FROM nft_car_registry
            WHERE (registry_id IS NOT NULL AND registry_id <> ('APEX-CAR-' || printf('%06d', serial)))
               OR (nft_index IS NOT NULL AND nft_index <> serial - 1)`);
        if (invalidIdentities === 0) pass('Identidades APEX-CAR/índice NFT coherentes');
        else fail('Identidades NFT incoherentes', `${invalidIdentities}`);
    }

    if (tables.has('audit_events')) {
        summary.teamBootstrapApplied = scalar(db, "SELECT COUNT(*) FROM audit_events WHERE event = 'TEAM_BOOTSTRAP_GRANT_APPLIED'");
        summary.teamBootstrapFailed = scalar(db, "SELECT COUNT(*) FROM audit_events WHERE event = 'TEAM_BOOTSTRAP_GRANT_FAILED'");
        if (summary.teamBootstrapFailed > 0) warn('Hay fallos auditados de dotación de equipo', `${summary.teamBootstrapFailed}`);
    }
} catch (error) {
    fail('No se pudo verificar la copia', error.message);
} finally {
    try { if (db) db.close(); } catch (e) {}
}

const failures = checks.filter(item => item.level === 'fail');
const warnings = checks.filter(item => item.level === 'warn');
summary.failures = failures.length;
summary.warnings = warnings.length;

if (jsonOutput) {
    console.log(JSON.stringify(summary, null, 2));
} else {
    console.log(`Verificación de copia: ${summary.file}`);
    if (summary.sha256) console.log(`SHA-256: ${summary.sha256}`);
    for (const item of checks) {
        const icon = item.level === 'pass' ? '✓' : (item.level === 'warn' ? '!' : '✗');
        console.log(`${icon} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
    }
    const countSummary = Object.entries(summary.counts)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
    if (countSummary) console.log(`\nConteos: ${countSummary}`);
    console.log(`\nResultado: ${failures.length} fallos, ${warnings.length} avisos.`);
}

if (failures.length) process.exit(1);
