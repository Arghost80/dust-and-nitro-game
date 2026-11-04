// ===== TEST v107: identidad Telegram y separación local por cuenta =====
// Ejecuta cloud_save.js en una VM con localStorage/Telegram simulados.
// Verifica que una cuenta nueva en el mismo dispositivo nunca sube el
// garaje/historia que dejó otra cuenta y que la foto anterior se conserva
// separada en el propio terminal.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { webcrypto } = require('crypto');

const SOURCE = fs.readFileSync(path.join(__dirname, 'cloud_save.js'), 'utf8');
const GARAGE_KEY = 'apex_web3_garage_save';
const STORY_KEY = 'dustrac_story_save';
const META_KEY = 'apex_cloud_meta';
const SNAPSHOT_PREFIX = 'apex_cloud_account_snapshot:';

function check(condition, message, detail) {
    if (!condition) {
        throw new Error(`FALLO: ${message}${detail ? ` :: ${JSON.stringify(detail).slice(0, 700)}` : ''}`);
    }
    console.log(`✓ ${message}`);
}

function makeLocalStorage(seed) {
    const map = new Map(Object.entries(seed || {}));
    return {
        getItem(key) { return map.has(String(key)) ? map.get(String(key)) : null; },
        setItem(key, value) { map.set(String(key), String(value)); },
        removeItem(key) { map.delete(String(key)); },
        _map: map
    };
}

function response(status, data) {
    return {
        status,
        ok: status >= 200 && status < 300,
        json: async () => data,
        clone() { return response(status, data); }
    };
}

async function loadScenario({ seed, telegramId, fetchHandler }) {
    const localStorage = makeLocalStorage(seed);
    const requests = [];
    const fakeWindow = {
        localStorage,
        crypto: webcrypto,
        Telegram: {
            WebApp: {
                initData: 'test-init-data',
                initDataUnsafe: { user: { id: telegramId, first_name: 'Piloto Actual' } },
                ready() {}
            }
        },
        addEventListener() {},
        dispatchEvent() { return true; }
    };
    const context = {
        window: fakeWindow,
        localStorage,
        document: { addEventListener() {} },
        console,
        setTimeout,
        clearTimeout,
        AbortController,
        CustomEvent: class CustomEvent { constructor(type) { this.type = type; } },
        fetch: async (url, options = {}) => {
            requests.push({ url: String(url), method: options.method || 'GET', body: options.body || null });
            return fetchHandler(String(url), options || {});
        }
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(SOURCE, context, { filename: 'cloud_save.js' });
    await fakeWindow.CloudSave.init();
    return { localStorage, requests, cloudSave: fakeWindow.CloudSave };
}

function seedForPreviousAccount() {
    return {
        [GARAGE_KEY]: JSON.stringify({
            userId: '111111111',
            credits: 9999,
            gems: 0,
            garage: [{ instanceId: 'car-de-otra-cuenta' }],
            updatedAt: 5000
        }),
        [STORY_KEY]: JSON.stringify({ marker: 'historia-anterior', updatedAt: 5000 }),
        [META_KEY]: JSON.stringify({ accountUserId: '111111111', localUpdatedAt: 5000, lastRemoteUpdatedAt: 5000 }),
        apex_pilot_name: 'Cuenta Anterior'
    };
}

(async () => {
    // 1) Aunque la copia local de otra cuenta sea más nueva, gana el remoto
    // de la cuenta Telegram actual y no se hace ningún PUT cruzado.
    const remoteScenario = await loadScenario({
        seed: seedForPreviousAccount(),
        telegramId: 222222222,
        fetchHandler: async (url) => {
            if (url === '/api/save/222222222') {
                return response(200, {
                    save: {
                        garage: { userId: '222222222', credits: 222, gems: 0, garage: [{ instanceId: 'car-actual' }], updatedAt: 1000 },
                        story: { marker: 'historia-actual', updatedAt: 1000 },
                        extra: { apex_pilot_name: 'Cuenta Actual' },
                        updatedAt: 1000
                    }
                });
            }
            return response(404, { ok: false });
        }
    });
    const currentGarage = JSON.parse(remoteScenario.localStorage.getItem(GARAGE_KEY));
    const currentStory = JSON.parse(remoteScenario.localStorage.getItem(STORY_KEY));
    const previousSnapshot = JSON.parse(remoteScenario.localStorage.getItem(SNAPSHOT_PREFIX + '111111111'));
    check(remoteScenario.cloudSave.getUserId() === '222222222', 'la identidad activa es la de Telegram, no la cacheada');
    check(currentGarage.userId === '222222222' && currentGarage.credits === 222, 'se aplica el garaje remoto de la cuenta actual');
    check(currentStory.marker === 'historia-actual', 'se aplica la historia de la cuenta actual');
    check(previousSnapshot.story.marker === 'historia-anterior', 'la foto local anterior queda separada por cuenta');
    check(remoteScenario.requests.every(req => req.method === 'GET'), 'el cambio de cuenta no sube datos ajenos');

    // 2) Si la cuenta actual aún no tiene guardado remoto, el arranque no
    // migra por accidente la partida local de la identidad anterior.
    const emptyScenario = await loadScenario({
        seed: seedForPreviousAccount(),
        telegramId: 222222222,
        fetchHandler: async () => response(404, { ok: false })
    });
    const preserved = JSON.parse(emptyScenario.localStorage.getItem(SNAPSHOT_PREFIX + '111111111'));
    check(emptyScenario.localStorage.getItem(GARAGE_KEY) === null, 'una cuenta nueva no hereda el garaje fijo anterior');
    check(emptyScenario.localStorage.getItem(STORY_KEY) === null, 'una cuenta nueva no hereda la historia anterior');
    check(preserved.garage.credits === 9999 && preserved.story.marker === 'historia-anterior', 'la partida anterior sigue guardada localmente bajo su ID');
    check(emptyScenario.requests.every(req => req.method === 'GET'), 'sin remoto tampoco se sube la partida de otra cuenta');

    console.log('✅ TEST CLOUD IDENTITY v107 SUPERADO');
})().catch(error => {
    console.error(error.stack || error);
    process.exit(1);
});
