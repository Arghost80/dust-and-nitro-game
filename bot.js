// ===== APEX MOTORSPORT - BOT DE TELEGRAM NATIVO (SIN DEPENDENCIAS) =====
// Utiliza Node.js https con long-polling para no requerir túneles HTTPS en desarrollo local.

const https = require('https');
const fs = require('fs');
const path = require('path');
const db = require('./database');

// El bot anuncia el mismo catálogo jugable que el cliente y el servidor.
// tracks_data.json es la fuente canónica; tracks_data.js se genera desde ella.
let PlayableTracksCatalog = [];
try {
    const tracksData = JSON.parse(fs.readFileSync(path.join(__dirname, 'tracks_data.json'), 'utf8'));
    PlayableTracksCatalog = Object.values(tracksData || {})
        .filter(track => track && typeof track.id === 'string' && typeof track.name === 'string')
        .map(track => ({ id: track.id, name: track.name, cols: Number(track.cols) || 0, rows: Number(track.rows) || 0 }));
} catch (e) {
    console.warn('⚠️ No se pudo cargar tracks_data.json en el bot:', e.message);
}

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const WEBAPP_URL = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL || 'https://dust-and-nitro-game.onrender.com';

if (!BOT_TOKEN) {
    console.log('================================================================');
    console.log('⚠️ AVISO: BOT_TOKEN no está definido.');
    console.log('Para conectar tu bot oficial de Telegram:');
    console.log('1. Abre @BotFather en Telegram y crea un bot con /newbot');
    console.log('2. Copia el token proporcionado');
    console.log('3. Ejecuta en terminal:');
    console.log('   $env:BOT_TOKEN="tu_token_aqui"; node bot.js');
    console.log('================================================================');
    module.exports = { started: false, reason: 'missing_bot_token' };
    return;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function telegramRequest(method, data = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            let bodyBytes = 0;
            res.on('data', chunk => {
                bodyBytes += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk));
                if (bodyBytes > 1024 * 1024) {
                    req.destroy(new Error('Respuesta de Telegram demasiado grande'));
                    return;
                }
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.setTimeout(35000, () => req.destroy(new Error('Timeout llamando a Telegram')));
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
        chat_id: chatId,
        text: String(text || '').slice(0, 4000),
        parse_mode: 'HTML'
    };
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    return await telegramRequest('sendMessage', payload);
}

async function handleMessage(msg) {
    if (!msg || !msg.chat || msg.chat.id == null || !msg.from || msg.from.id == null) return;
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Piloto';
    const text = String(msg.text || '').trim().slice(0, 1000);
    const command = text.split(/\s+/)[0].split('@')[0].toLowerCase();

    if (command === '/start') {
        const user = db.getUser(userId, username);
        const welcomeText = `🏁 <b>¡BIENVENIDO A APEX MOTORSPORT!</b> 🏁\n\n` +
            `Simulador arcade GT & Web3 en Telegram. Pilota superdeportivos, derrapa en circuitos mundiales y compite en torneos.\n\n` +
            `👤 <b>Piloto:</b> @${escapeHtml(username)}\n` +
            `💰 <b>Monedas:</b> ${safeNumber(user.coins)} CR\n` +
            `🏎️ <b>Vehículo:</b> ${escapeHtml(String(user.selectedCar || 'v8_interceptor').toUpperCase())}\n` +
            `🏆 <b>Carreras:</b> ${safeNumber(user.stats && user.stats.races)} | Mejor tiempo: ${user.stats && user.stats.bestTime ? safeNumber(user.stats.bestTime) + 's' : 'N/A'}\n\n` +
            `¡Presiona el botón de abajo para saltar a la pista y competir contra otros pilotos!`;

        const keyboard = {
            inline_keyboard: [
                [
                    {
                        text: '🎮 JUGAR AHORA (MINI APP)',
                        web_app: { url: WEBAPP_URL }
                    }
                ],
                [
                    { text: '🏎️ Mi Garaje', callback_data: 'cmd_garage' },
                    { text: '🏆 Clasificación', callback_data: 'cmd_leaderboard' }
                ],
                [
                    { text: '🏁 Circuitos', callback_data: 'cmd_tracks' },
                    { text: '💎 Web3 / TON', callback_data: 'cmd_web3' }
                ]
            ]
        };

        await sendMessage(chatId, welcomeText, keyboard);
        return;
    }

    if (command === '/garage') {
        await sendGarage(chatId, userId, username);
        return;
    }

    if (command === '/ranking' || command === '/leaderboard') {
        await sendLeaderboard(chatId);
        return;
    }

    if (command === '/circuits' || command === '/tracks') {
        await sendTracks(chatId);
        return;
    }
}

async function handleCallbackQuery(cq) {
    if (!cq || !cq.message || !cq.message.chat || cq.message.chat.id == null || !cq.from || cq.from.id == null) return;
    const chatId = cq.message.chat.id;
    const userId = cq.from.id;
    const username = cq.from.username || cq.from.first_name || 'Piloto';
    const data = String(cq.data || '').slice(0, 64);

    telegramRequest('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});

    if (data === 'cmd_garage') {
        await sendGarage(chatId, userId, username);
    } else if (data === 'cmd_leaderboard') {
        await sendLeaderboard(chatId);
    } else if (data === 'cmd_tracks') {
        await sendTracks(chatId);
    } else if (data === 'cmd_web3') {
        const text = `💎 <b>WEB3 & TON — SIMULACIÓN LOCAL</b>\n\n` +
            `• <b>Estado actual:</b> la billetera, los swaps y las retiradas dentro del juego son una simulación local sin fondos reales.\n` +
            `• <b>NFT Garage:</b> los vehículos son objetos del juego; todavía no se acuñan en cadena.\n` +
            `• <b>No envíes fondos</b> esperando una contrapartida automática hasta que se anuncie una integración verificada.`;
        await sendMessage(chatId, text);
    }
}

async function sendGarage(chatId, userId, username) {
    const user = db.getUser(userId, username);
    const cars = db.getCars();
    let text = `🏎️ <b>GARAJE Y VEHÍCULOS</b>\n\n` +
        `Saldo: 💰 <b>${safeNumber(user.coins)} Monedas</b>\n\n`;

    const unlockedCars = Array.isArray(user.unlockedCars) ? user.unlockedCars : [];
    cars.forEach(c => {
        const isUnlocked = unlockedCars.includes(c.id);
        const isSelected = user.selectedCar === c.id;
        const status = isSelected ? ' [EQUIPADO]' : (isUnlocked ? ' [DISPONIBLE]' : ` (Precio: ${safeNumber(c.price)} CR)`);
        text += `• <b>${escapeHtml(c.name)}</b>${status}\n` +
            `   Vel: ${safeNumber(c.speed)} | Agarre: ${safeNumber(c.handling)} | Accel: ${safeNumber(c.accel)}\n`;
    });

    await sendMessage(chatId, text, {
        inline_keyboard: [[{ text: '🎮 Entrar a la pista', web_app: { url: WEBAPP_URL } }]]
    });
}

async function sendLeaderboard(chatId) {
    const top = db.getLeaderboard();
    let text = `🏆 <b>TABLA GLOBAL DE CLASIFICACIÓN</b>\n\n`;
    top.slice(0, 10).forEach((entry, i) => {
        const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i + 1}.`));
        text += `${medal} <b>${escapeHtml(entry.username)}</b> - ${safeNumber(entry.time)}s\n   Pista: <i>${escapeHtml(entry.track)}</i> (${escapeHtml(entry.car)})\n`;
    });

    await sendMessage(chatId, text);
}

async function sendTracks(chatId) {
    let text = `🏁 <b>CIRCUITOS OFICIALES DISPONIBLES</b>\n\n`;
    PlayableTracksCatalog.forEach((c, idx) => {
        text += `${idx + 1}. <b>${escapeHtml(c.name)}</b> (${safeNumber(c.cols)}×${safeNumber(c.rows)})\n`;
    });

    await sendMessage(chatId, text, {
        inline_keyboard: [[{ text: '🎮 Elegir en el Juego', web_app: { url: WEBAPP_URL } }]]
    });
}

let lastUpdateId = 0;
async function startPolling() {
    console.log(`🤖 Bot de Telegram escuchando eventos con Polling...`);
    if (WEBAPP_URL && WEBAPP_URL.startsWith('https://')) {
        try {
            await telegramRequest('setChatMenuButton', {
                menu_button: {
                    type: 'web_app',
                    text: 'JUGAR APEX MOTORSPORT',
                    web_app: { url: WEBAPP_URL }
                }
            });
            console.log(`✅ Botón de menú de Telegram sincronizado automáticamente con: ${WEBAPP_URL}`);
        } catch (menuErr) {
            console.warn('Aviso: no se pudo sincronizar el botón de menú:', menuErr.message);
        }
    }
    let pollingBackoffMs = 1000;
    while (true) {
        try {
            const res = await telegramRequest('getUpdates', {
                offset: lastUpdateId + 1,
                timeout: 25,
                allowed_updates: ['message', 'callback_query']
            });

            if (!res || res.ok !== true || !Array.isArray(res.result)) {
                const description = escapeHtml(res && res.description ? res.description : 'Respuesta no válida de Telegram');
                const errorCode = safeNumber(res && res.error_code, 0);
                console.error(`Error en polling de Telegram (${errorCode || 'sin código'}): ${description}. Reintentando en ${Math.round(pollingBackoffMs / 1000)}s`);
                await new Promise(r => setTimeout(r, pollingBackoffMs));
                pollingBackoffMs = Math.min(60000, pollingBackoffMs * 2);
                continue;
            }

            pollingBackoffMs = 1000;
            for (const update of res.result) {
                if (!update || !Number.isFinite(Number(update.update_id))) continue;
                lastUpdateId = Number(update.update_id);
                try {
                    if (update.message) {
                        await handleMessage(update.message);
                    } else if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                } catch (updateError) {
                    console.error('Error procesando actualización de Telegram:', updateError.message);
                }
            }
        } catch (err) {
            console.error(`Error en polling: ${err.message}. Reintentando en ${Math.round(pollingBackoffMs / 1000)}s`);
            await new Promise(r => setTimeout(r, pollingBackoffMs));
            pollingBackoffMs = Math.min(60000, Math.max(4000, pollingBackoffMs * 2));
        }
    }
}

startPolling();
