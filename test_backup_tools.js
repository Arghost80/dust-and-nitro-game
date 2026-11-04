// ===== TEST v107: verificador de copias SQLite =====
// Genera una BD temporal y una copia con la API oficial de SQLite, valida
// que scripts/verify_backup.js la acepta y que detecta un archivo no-SQLite
// y un perfil JSON corrupto sin modificar la copia original válida.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const SqliteDatabase = require('better-sqlite3');

function check(condition, message, detail) {
    if (!condition) throw new Error(`FALLO: ${message}${detail ? ` :: ${String(detail).slice(0, 900)}` : ''}`);
    console.log(`✓ ${message}`);
}

function run(command, args, options = {}) {
    return spawnSync(command, args, {
        cwd: __dirname,
        encoding: 'utf8',
        ...options
    });
}

const stamp = `${Date.now()}-${process.pid}`;
const sourceDb = path.join(os.tmpdir(), `apex-backup-source-${stamp}.sqlite`);
const backupDb = path.join(os.tmpdir(), `apex-backup-valid-${stamp}.sqlite`);
const corruptDb = path.join(os.tmpdir(), `apex-backup-corrupt-${stamp}.sqlite`);
const textFile = path.join(os.tmpdir(), `apex-backup-text-${stamp}.sqlite`);

function remove(file) {
    for (const suffix of ['', '-wal', '-shm']) {
        try { fs.unlinkSync(file + suffix); } catch (e) {}
    }
}

try {
    const create = run(process.execPath, ['-e', `
        const db = require('./database');
        (async () => {
            db.getOrCreateEconomyProfile('123456789', { pilotName: 'Backup Test' });
            await db.backupDatabaseTo(process.argv[1]);
            db.closeDatabase();
        })().catch(error => { console.error(error); process.exit(1); });
    `, backupDb], {
        env: {
            ...process.env,
            DB_FILE: sourceDb,
            TEAM_BOOTSTRAP_TELEGRAM_IDS: '',
            TEAM_ACCOUNT_IDS: ''
        }
    });
    check(create.status === 0 && fs.existsSync(backupDb), 'se genera una copia SQLite de prueba', create.stderr || create.stdout);

    const valid = run(process.execPath, ['scripts/verify_backup.js', backupDb, '--json']);
    check(valid.status === 0, 'la copia válida supera la verificación', valid.stderr || valid.stdout);
    const report = JSON.parse(valid.stdout);
    check(report.schemaVersion === 106 && report.counts.economy_profiles === 1 && /^[a-f0-9]{64}$/.test(report.sha256),
        'el informe incluye esquema, conteos y SHA-256 sin IDs', report);
    check(!valid.stdout.includes('123456789'), 'el informe no imprime el ID de la cuenta de prueba');

    fs.copyFileSync(backupDb, corruptDb);
    const db = new SqliteDatabase(corruptDb);
    try {
        db.prepare('UPDATE economy_profiles SET garage_json = ?').run('{json-roto');
    } finally {
        db.close();
    }
    const corrupt = run(process.execPath, ['scripts/verify_backup.js', corruptDb]);
    check(corrupt.status === 1 && /JSON inválido|Perfiles económicos inválidos/.test(corrupt.stdout),
        'una copia con JSON de perfil corrupto se rechaza', corrupt.stdout || corrupt.stderr);

    fs.writeFileSync(textFile, 'esto no es sqlite');
    const text = run(process.execPath, ['scripts/verify_backup.js', textFile]);
    check(text.status === 1 && /No se pudo verificar/.test(text.stdout),
        'un archivo que no es SQLite se rechaza', text.stdout || text.stderr);

    console.log('✅ TEST BACKUP TOOLS v107 SUPERADO');
} finally {
    remove(sourceDb);
    remove(backupDb);
    remove(corruptDb);
    remove(textFile);
}
