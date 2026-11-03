// ===== APEX MOTORSPORT · GUARDADO EN SERVIDOR (v100) =====
// Sincroniza el progreso del jugador (garaje NFT, saldo $CR, modo historia y
// ajustes) con el servidor (/api/save/:userId), para que nadie pierda su
// partida al cambiar de móvil o borrar la caché de Telegram.
//
// Cómo funciona (sin tocar la lógica del juego, que sigue leyendo localStorage):
//  1. Al abrir el juego: descarga el guardado del servidor. Si es más nuevo
//     que el local, lo vuelca a localStorage ANTES de que se renderice el hub.
//  2. Cada vez que el juego guarda (saveNftUserData / saveStoryProgress), se
//     programa una subida con debounce (~0,9 s) para no saturar la red.
//  3. Al minimizar/cerrar la Mini App, sube lo pendiente con keepalive.
//  4. Conflictos entre dispositivos: gana el guardado con updatedAt mayor.
//  5. Sin conexión o sin servidor: el juego funciona en local como siempre.
//
// Identidad: ID de Telegram si está disponible; si no, el userId ya presente
// en el guardado local; si tampoco, un ID de dispositivo aleatorio persistente.
(function () {
    'use strict';
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    var GARAGE_KEY = 'apex_web3_garage_save';
    var STORY_KEY = 'dustrac_story_save';
    var DEVICE_KEY = 'apex_device_id';
    var DEVICE_SECRET_KEY = 'apex_device_secret_v1';
    var META_KEY = 'apex_cloud_meta';
    var EXTRA_KEYS = [
        'apex_pilot_name', 'dustrac_lang', 'dustrac_music', 'dustrac_sfx',
        'dustrac_graphics', 'dustrac_controls', 'dust_touch_mode',
        'dustrac_tournament_state', 'apex_launch_epoch'
    ];

    var _readyPromise = null;
    var _suppressUpload = true;   // hasta que init() termine (evita que un móvil
                                  // nuevo sobrescriba la nube con el coche inicial)
    var _applyingRemote = false;
    var _pending = false;
    var _dirty = false;
    var _timer = null;
    var _cachedUserId = null;
    var _status = 'local';
    var appliedRemote = false;

    // ---------- Utilidades ----------
    function safeParse(raw) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    }
    function lsGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function lsSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }
    function generateDeviceId() {
        try {
            if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
                var bytes = new Uint8Array(16);
                window.crypto.getRandomValues(bytes);
                var hex = '';
                for (var i = 0; i < bytes.length; i++) hex += ('0' + bytes[i].toString(16)).slice(-2);
                return 'usr_' + hex;
            }
        } catch (e) {}
        return 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    }
    function getDeviceSecret() {
        try {
            if (typeof window.getOrCreateDeviceSecret === 'function') {
                return window.getOrCreateDeviceSecret();
            }
        } catch (e) {}
        var existing = lsGet(DEVICE_SECRET_KEY);
        if (typeof existing === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(existing)) return existing;
        var secret = '';
        try {
            if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
                var bytes = new Uint8Array(32);
                window.crypto.getRandomValues(bytes);
                for (var i = 0; i < bytes.length; i++) secret += ('0' + bytes[i].toString(16)).slice(-2);
            }
        } catch (e) {}
        while (secret.length < 64) {
            secret += Date.now().toString(36) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        }
        secret = secret.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 64);
        lsSet(DEVICE_SECRET_KEY, secret);
        return secret;
    }
    function getMeta() { return safeParse(lsGet(META_KEY)) || {}; }
    function setMeta(patch) {
        var meta = getMeta();
        for (var k in patch) meta[k] = patch[k];
        lsSet(META_KEY, JSON.stringify(meta));
    }
    function telegramWebApp() {
        try {
            return (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
        } catch (e) { return null; }
    }
    function telegramInitData() {
        var wa = telegramWebApp();
        return (wa && typeof wa.initData === 'string') ? wa.initData : '';
    }
    function headers() {
        var h = { 'Content-Type': 'application/json' };
        var initData = telegramInitData();
        if (initData) h['X-Telegram-Init-Data'] = initData;
        // Para cuentas usr_..., el ID puede verse en salas; la credencial es
        // este secreto separado, persistente solo en este dispositivo.
        if (typeof _cachedUserId === 'string' && _cachedUserId.indexOf('usr_') === 0) {
            var deviceSecret = getDeviceSecret();
            if (deviceSecret) h['X-Device-Secret'] = deviceSecret;
        }
        return h;
    }
    function fetchWithTimeout(url, options, timeoutMs) {
        if (typeof fetch !== 'function') return Promise.reject(new Error('fetch no disponible'));
        options = options || {};
        if (typeof AbortController !== 'undefined' && !options.keepalive) {
            var ctrl = new AbortController();
            options.signal = ctrl.signal;
            setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, timeoutMs || 3000);
        }
        return fetch(url, options);
    }

    // El SDK de Telegram carga con "defer": esperamos un poco a que exista
    // window.Telegram para poder usar el ID real del piloto.
    function waitForTelegram(maxMs) {
        return new Promise(function (resolve) {
            var start = Date.now();
            (function tick() {
                if (telegramWebApp() || Date.now() - start >= (maxMs || 900)) return resolve();
                setTimeout(tick, 50);
            })();
        });
    }

    // ---------- Identidad ----------
    function getUserId() {
        if (_cachedUserId) return _cachedUserId;
        var wa = telegramWebApp();
        var tgUser = wa && wa.initDataUnsafe && wa.initDataUnsafe.user;
        if (tgUser && tgUser.id) {
            _cachedUserId = String(tgUser.id);
            return _cachedUserId;
        }
        var garage = safeParse(lsGet(GARAGE_KEY));
        if (garage && garage.userId && String(garage.userId) !== 'usr_guest_local') {
            _cachedUserId = String(garage.userId);
            return _cachedUserId;
        }
        var deviceId = lsGet(DEVICE_KEY);
        if (!deviceId) {
            deviceId = generateDeviceId();
            lsSet(DEVICE_KEY, deviceId);
        }
        _cachedUserId = deviceId;
        return _cachedUserId;
    }

    // ---------- Paquete de guardado ----------
    function localUpdatedAt(garage, story) {
        var meta = getMeta();
        return Math.max(
            Number(garage && garage.updatedAt) || 0,
            Number(story && story.updatedAt) || 0,
            Number(meta.localUpdatedAt) || 0
        );
    }
    function readLocalBundle() {
        var garage = safeParse(lsGet(GARAGE_KEY));
        var story = safeParse(lsGet(STORY_KEY));
        var extra = {};
        EXTRA_KEYS.forEach(function (k) {
            var v = lsGet(k);
            if (v !== null && v !== undefined) extra[k] = v;
        });
        return { garage: garage, story: story, extra: extra, updatedAt: localUpdatedAt(garage, story) };
    }
    function applyRemote(save) {
        if (!save) return;
        _applyingRemote = true;
        try {
            if (save.garage && typeof save.garage === 'object') lsSet(GARAGE_KEY, JSON.stringify(save.garage));
            if (save.story && typeof save.story === 'object') lsSet(STORY_KEY, JSON.stringify(save.story));
            if (save.extra && typeof save.extra === 'object') {
                EXTRA_KEYS.forEach(function (k) {
                    if (typeof save.extra[k] === 'string') lsSet(k, save.extra[k]);
                });
            }
            setMeta({ lastSyncAt: Date.now(), lastRemoteUpdatedAt: Number(save.updatedAt) || 0, localUpdatedAt: Number(save.updatedAt) || 0 });
            appliedRemote = true;
        } finally {
            _applyingRemote = false;
        }
    }
    function notifyApplied() {
        try { window.dispatchEvent(new CustomEvent('apex-cloud-applied')); } catch (e) {}
    }

    // ---------- Badge de estado en la cabecera ----------
    var STATUS_LABELS = {
        syncing: '☁️ SINCRONIZANDO…',
        saved: '☁️ GUARDADO ✓',
        offline: '☁️ SIN CONEXIÓN',
        local: '☁️ LOCAL'
    };
    function refreshBadge() {
        try {
            var el = document.getElementById('cloud-sync-badge');
            if (el) el.textContent = STATUS_LABELS[_status] || STATUS_LABELS.local;
        } catch (e) {}
    }
    function setStatus(s) { _status = s; refreshBadge(); }

    // ---------- Subida ----------
    function uploadNow(useKeepalive) {
        var bundle = readLocalBundle();
        if (!bundle.garage && !bundle.story) return Promise.resolve(false);
        if (!bundle.updatedAt) bundle.updatedAt = Date.now();
        var sentTs = bundle.updatedAt;
        var url = '/api/save/' + encodeURIComponent(getUserId());
        var opts = { method: 'PUT', headers: headers(), body: JSON.stringify(bundle) };
        if (useKeepalive) opts.keepalive = true;
        return fetchWithTimeout(url, opts, 4000).then(function (res) {
            if (res.status === 409) {
                return res.json().then(function (data) {
                    if (data && data.save && Number(data.save.updatedAt) > sentTs) {
                        applyRemote(data.save);
                        notifyApplied();
                        _dirty = false;
                        setStatus('saved');
                    }
                    return false;
                }).catch(function () { return false; });
            }
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.clone().json().then(function (data) {
                // v104: la economía del paquete subido no es autoritativa.
                // Si el servidor devuelve su garaje sellado, sustituye solo
                // ese espejo local; historia y ajustes enviados no cambian.
                if (data && data.save && data.save.garage) {
                    applyRemote({ garage: data.save.garage, updatedAt: sentTs });
                    notifyApplied();
                }
                var after = readLocalBundle();
                if (after.updatedAt <= sentTs) _dirty = false;
                setMeta({ lastSyncAt: Date.now(), lastRemoteUpdatedAt: sentTs, localUpdatedAt: sentTs });
                setStatus('saved');
                return true;
            }).catch(function () {
                var after = readLocalBundle();
                if (after.updatedAt <= sentTs) _dirty = false;
                setMeta({ lastSyncAt: Date.now(), lastRemoteUpdatedAt: sentTs });
                setStatus('saved');
                return true;
            });
        }).catch(function () {
            setStatus('offline'); // el progreso sigue a salvo en local y se reintentará
            return false;
        });
    }

    function scheduleUpload() {
        if (_applyingRemote) return;
        _dirty = true;
        if (_suppressUpload) { _pending = true; return; }
        if (_timer) clearTimeout(_timer);
        _timer = setTimeout(function () { _timer = null; uploadNow(false); }, 900);
    }

    function flushOnExit() {
        if (!_dirty || _suppressUpload) return;
        if (_timer) { clearTimeout(_timer); _timer = null; }
        uploadNow(true);
    }

    // ---------- Arranque ----------
    function init() {
        if (_readyPromise) return _readyPromise;
        _readyPromise = (async function () {
            // CRÍTICO: foto del guardado local ANTES de cualquier await y antes de
            // que el hub arranque. Si no, en un móvil nuevo el hub crearía la partida
            // inicial (con updatedAt = ahora) y parecería "más nueva" que la nube.
            var local = readLocalBundle();
            try {
                setStatus('syncing');
                await waitForTelegram(900);
                try { if (telegramWebApp() && telegramWebApp().ready) telegramWebApp().ready(); } catch (e) {}
                var id = getUserId();
                var res = await fetchWithTimeout('/api/save/' + encodeURIComponent(id), { method: 'GET', headers: headers() }, 3000);
                if (res.status === 404) {
                    // Primera vez con guardado en servidor: subir lo local (migración v99 -> v100)
                    if (local.garage || local.story) {
                        _suppressUpload = false;
                        await uploadNow(false);
                    } else {
                        setStatus('local');
                    }
                } else if (res.ok) {
                    var data = await res.json();
                    var remote = data && data.save;
                    var remoteTs = Number(remote && remote.updatedAt) || 0;
                    if (remote && remoteTs > local.updatedAt) {
                        applyRemote(remote);
                        setStatus('saved');
                        notifyApplied();
                    } else if (local.updatedAt > remoteTs) {
                        _suppressUpload = false;
                        await uploadNow(false);
                    } else {
                        setStatus('saved');
                    }
                } else {
                    setStatus('offline');
                }
            } catch (e) {
                setStatus('offline');
            } finally {
                _suppressUpload = false;
                if (_pending) { _pending = false; scheduleUpload(); }
            }
            return true;
        })();
        return _readyPromise;
    }

    // Borrado total (Ajustes > Restablecer progreso): también borra la nube,
    // si no, al recargar "resucitaría" la partida anterior.
    function clearRemote() {
        if (_timer) { clearTimeout(_timer); _timer = null; }
        _dirty = false;
        _pending = false;
        return fetchWithTimeout('/api/save/' + encodeURIComponent(getUserId()), { method: 'DELETE', headers: headers() }, 5000)
            .then(function (response) {
                return response.json().catch(function () { return null; }).then(function (data) {
                    var ok = response.ok && data && data.ok === true;
                    // Solo se olvida el metadato de sincronización si el servidor
                    // confirma el borrado. Un 409 por anuncios en escrow (u otro
                    // error) debe conservar la partida local y remota intactas.
                    if (ok) {
                        try { localStorage.removeItem(META_KEY); } catch (e) {}
                    }
                    return { ok: ok, status: response.status, data: data };
                });
            })
            .catch(function () {
                return { ok: false, status: 0, data: { ok: false, error: 'network_unavailable' } };
            });
    }

    window.CloudSave = {
        init: init,
        scheduleUpload: scheduleUpload,
        uploadNow: function () { return uploadNow(false); },
        clearRemote: clearRemote,
        refreshBadge: refreshBadge,
        getUserId: getUserId,
        getAuthHeaders: headers,
        get appliedRemote() { return appliedRemote; },
        get status() { return _status; }
    };

    try {
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') flushOnExit();
        });
        window.addEventListener('pagehide', flushOnExit);
    } catch (e) {}

    init();
})();
