// ===== APEX MOTORSPORT - BOT DE TELEGRAM NATIVO (SIN DEPENDENCIAS) =====
// Utiliza Node.js https con long-polling para no requerir túneles HTTPS en desarrollo local.

const https = require('https');
const db = require('./database');
const { CircuitsCatalog } = require('./track_generator');

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
    process.exit(0);
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
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function sendMessage(chatId, text, replyMarkup = null) {
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    if (replyMarkup) {
        payload.reply_markup = replyMarkup;
    }
    return await telegramRequest('sendMessage', payload);
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Piloto';
    const text = (msg.text || '').trim();

    if (text === '/start' || text.startsWith('/start')) {
        const user = db.getUser(userId, username);
        const welcomeText = `🏁 <b>¡BIENVENIDO A APEX MOTORSPORT!</b> 🏁\n\n` +
            `Simulador arcade GT & Web3 en Telegram. Pilota superdeportivos, derrapa en circuitos mundiales y compite en torneos.\n\n` +
            `👤 <b>Piloto:</b> @${username}\n` +
            `💰 <b>Monedas:</b> ${user.coins} CR\n` +
            `🏎️ <b>Vehículo:</b> ${user.selectedCar.toUpperCase()}\n` +
            `🏆 <b>Carreras:</b> ${user.stats.races} | Mejor tiempo: ${user.stats.bestTime ? user.stats.bestTime + 's' : 'N/A'}\n\n` +
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

    if (text === '/garage') {
        await sendGarage(chatId, userId, username);
        return;
    }

    if (text === '/ranking' || text === '/leaderboard') {
        await sendLeaderboard(chatId);
        return;
    }

    if (text === '/circuits' || text === '/tracks') {
        await sendTracks(chatId);
        return;
    }
}

async function handleCallbackQuery(cq) {
    const chatId = cq.message.chat.id;
    const userId = cq.from.id;
    const username = cq.from.username || cq.from.first_name || 'Piloto';
    const data = cq.data;

    telegramRequest('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});

    if (data === 'cmd_garage') {
        await sendGarage(chatId, userId, username);
    } else if (data === 'cmd_leaderboard') {
        await sendLeaderboard(chatId);
    } else if (data === 'cmd_tracks') {
        await sendTracks(chatId);
    } else if (data === 'cmd_web3') {
        const text = `💎 <b>INTEGRACIÓN WEB3 & TON ECOSYSTEM</b>\n\n` +
            `• <b>TON Connect:</b> Conecta tu wallet Tonkeeper o Telegram Wallet dentro del juego.\n` +
            `• <b>NFT Garage:</b> Tus vehículos y skins únicos se podrán acuñar como coleccionables.\n` +
            `• <b>Monetización:</b> Soporte para torneos con recompensas y anuncios Adsgram.`;
        await sendMessage(chatId, text);
    }
}

async function sendGarage(chatId, userId, username) {
    const user = db.getUser(userId, username);
    const cars = db.getCars();
    let text = `🏎️ <b>GARAJE Y VEHÍCULOS</b>\n\n` +
        `Saldo: 💰 <b>${user.coins} Monedas</b>\n\n`;

    cars.forEach(c => {
        const isUnlocked = user.unlockedCars.includes(c.id);
        const isSelected = user.selectedCar === c.id;
        const status = isSelected ? ' [EQUIPADO]' : (isUnlocked ? ' [DISPONIBLE]' : ` (Precio: ${c.price} CR)`);
        text += `• <b>${c.name}</b>${status}\n` +
            `   Vel: ${c.speed} | Agarre: ${c.handling} | Accel: ${c.accel}\n`;
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
        text += `${medal} <b>${entry.username}</b> - ${entry.time}s\n   Pista: <i>${entry.track}</i> (${entry.car})\n`;
    });

    await sendMessage(chatId, text);
}

async function sendTracks(chatId) {
    let text = `🏁 <b>CIRCUITOS OFICIALES DISPONIBLES</b>\n\n`;
    CircuitsCatalog.forEach((c, idx) => {
        text += `${idx + 1}. <b>${c.name}</b>\n   Terreno: ${c.theme.toUpperCase()} | Curvas suaves Catmull-Rom | Puntos de control: ${c.controlPoints.length}\n\n`;
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
    while (true) {
        try {
            const res = await telegramRequest('getUpdates', {
                offset: lastUpdateId + 1,
                timeout: 25
            });

            if (res.ok && res.result) {
                for (const update of res.result) {
                    lastUpdateId = update.update_id;
                    if (update.message) {
                        await handleMessage(update.message);
                    } else if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                }
            }
        } catch (err) {
            console.error('Error en polling:', err.message);
            await new Promise(r => setTimeout(r, 4000));
        }
    }
}

startPolling();
