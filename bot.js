// ===== APEX MOTORSPORT - BOT DE TELEGRAM (v107) =====
// Usa long polling para no requerir túneles HTTPS en desarrollo local y el
// cliente compartido de Bot API para facturas/pagos Telegram Stars.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const telegramStars = require('./telegram_stars');
const { telegramBotApiRequest } = require('./telegram_api');

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
const WEBAPP_BASE_URL = String(WEBAPP_URL || '').replace(/\/+$/, '');
const SUPPORT_CONTACT = String(process.env.SUPPORT_CONTACT || '').trim().slice(0, 120);
const SUPPORT_URL = String(process.env.SUPPORT_URL || '').trim().slice(0, 300);
function parseTelegramUserIds(...values) {
    const ids = [];
    for (const value of values) {
        String(value || '').split(/[\s,;]+/).map(item => item.trim()).forEach(item => {
            if (/^\d{3,20}$/.test(item) && !ids.includes(item)) ids.push(item);
        });
    }
    return ids.slice(0, 5);
}
function parseSupportTicketCooldownMs() {
    const raw = process.env.SUPPORT_TICKET_COOLDOWN_SEC ?? process.env.SUPPORT_TICKET_COOLDOWN_SECONDS;
    if (raw == null || String(raw).trim() === '') return 10 * 1000;
    const seconds = Number(raw);
    if (!Number.isFinite(seconds) || seconds < 0) return 10 * 1000;
    return Math.floor(Math.min(3600, seconds)) * 1000;
}
const SUPPORT_OPERATOR_IDS = parseTelegramUserIds(
    process.env.SUPPORT_OPERATOR_TELEGRAM_IDS,
    process.env.SUPPORT_OPERATOR_TELEGRAM_ID
);
const SUPPORT_TICKET_CHAT_ID = /^-?\d{3,24}$/.test(String(process.env.SUPPORT_TICKET_CHAT_ID || '').trim())
    ? String(process.env.SUPPORT_TICKET_CHAT_ID).trim()
    : (SUPPORT_OPERATOR_IDS[0] || '');
const SUPPORT_TICKETS_ENABLED = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.ENABLE_SUPPORT_TICKETS || '').trim().toLowerCase()
) && SUPPORT_OPERATOR_IDS.length > 0 && Boolean(SUPPORT_TICKET_CHAT_ID);
const SUPPORT_TICKET_COOLDOWN_MS = parseSupportTicketCooldownMs();
const SUPPORT_TICKET_MAX_PER_DAY = 20;
const pendingSupportTicketPrompts = new Map();
const TELEGRAM_TON_PURCHASES_ENABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.TELEGRAM_TON_PURCHASES_ENABLED || '').trim().toLowerCase());
const TELEGRAM_STARS_PURCHASES_ENABLED = telegramStars.starsPurchasesEnabled();

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

function formatInt(value) {
    return Math.floor(safeNumber(value)).toLocaleString('es-ES');
}

function webUrl(pathname) {
    return WEBAPP_BASE_URL ? `${WEBAPP_BASE_URL}${pathname}` : pathname;
}

function getAuthoritativeGarage(userId, username) {
    try {
        const profile = db.getOrCreateEconomyProfile(String(userId), {
            pilotName: username ? `@${String(username).replace(/^@/, '')}` : undefined
        });
        return profile && profile.garage ? profile.garage : null;
    } catch (e) {
        return null;
    }
}

function supportContactLine() {
    const parts = [];
    if (SUPPORT_CONTACT) parts.push(escapeHtml(SUPPORT_CONTACT));
    if (SUPPORT_URL) parts.push(escapeHtml(SUPPORT_URL));
    return parts.length ? `\n📬 <b>Contacto adicional:</b> ${parts.join(' · ')}` : '';
}

function supportTicketsEnabled() {
    return SUPPORT_TICKETS_ENABLED;
}

function isSupportOperator(userId) {
    return SUPPORT_OPERATOR_IDS.includes(String(userId || ''));
}

function normalizeSupportTicketId(value) {
    const ticketId = String(value || '').trim().toUpperCase();
    return /^SUP-[0-9A-F]{8}$/.test(ticketId) ? ticketId : '';
}

function supportTicketMetaKey(ticketId) {
    return `supportTicket:${normalizeSupportTicketId(ticketId)}`;
}

function supportTicketUserMetaKey(userId) {
    return `supportTicketOpenByUser:${String(userId || '')}`;
}

function getSupportTicket(ticketId) {
    const normalized = normalizeSupportTicketId(ticketId);
    if (!normalized) return null;
    try {
        const ticket = db.getMetaValue(supportTicketMetaKey(normalized), null);
        return ticket && typeof ticket === 'object' && normalizeSupportTicketId(ticket.id) === normalized
            ? ticket
            : null;
    } catch (e) {
        return null;
    }
}

function saveSupportTicket(ticket) {
    db.setMetaValue(supportTicketMetaKey(ticket.id), ticket);
    const userKey = supportTicketUserMetaKey(ticket.userId);
    if (ticket.status === 'open') {
        db.setMetaValue(userKey, ticket.id);
    } else {
        try {
            if (normalizeSupportTicketId(db.getMetaValue(userKey, '')) === ticket.id) {
                db.setMetaValue(userKey, null);
            }
        } catch (e) {}
    }
    return ticket;
}

function createSupportTicketId() {
    for (let attempt = 0; attempt < 10; attempt++) {
        const ticketId = `SUP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        if (!getSupportTicket(ticketId)) return ticketId;
    }
    throw new Error('support_ticket_id_unavailable');
}

function getOpenSupportTicketForUser(userId) {
    let ticketId = '';
    try { ticketId = normalizeSupportTicketId(db.getMetaValue(supportTicketUserMetaKey(userId), '')); } catch (e) {}
    if (!ticketId) return null;
    const ticket = getSupportTicket(ticketId);
    if (!ticket || String(ticket.userId) !== String(userId) || ticket.status !== 'open') {
        try { db.setMetaValue(supportTicketUserMetaKey(userId), null); } catch (e) {}
        return null;
    }
    const createdAt = Date.parse(ticket.createdAt || '');
    if (Number.isFinite(createdAt) && Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) {
        ticket.status = 'expired';
        ticket.closedAt = new Date().toISOString();
        ticket.updatedAt = ticket.closedAt;
        try { saveSupportTicket(ticket); } catch (e) {}
        return null;
    }
    return ticket;
}

function consumeSupportTicketRate(userId) {
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const key = `supportTicketRate:${String(userId || '')}`;
    let state = null;
    try { state = db.getMetaValue(key, null); } catch (e) {}
    if (!state || typeof state !== 'object' || state.day !== day) {
        state = { day, count: 0, lastAt: 0 };
    }
    if (SUPPORT_TICKET_COOLDOWN_MS > 0 && now - Number(state.lastAt || 0) < SUPPORT_TICKET_COOLDOWN_MS) {
        return { ok: false, error: 'support_ticket_cooldown' };
    }
    if (Number(state.count || 0) >= SUPPORT_TICKET_MAX_PER_DAY) {
        return { ok: false, error: 'support_ticket_daily_limit' };
    }
    state.count = Number(state.count || 0) + 1;
    state.lastAt = now;
    db.setMetaValue(key, state);
    return { ok: true };
}

function telegramDisplayName(from) {
    if (from && from.username) return `@${String(from.username).replace(/^@/, '')}`;
    const name = [from && from.first_name, from && from.last_name].filter(Boolean).join(' ').trim();
    return name || 'Piloto';
}

function prunePendingSupportTicketPrompts(now = Date.now()) {
    for (const [userId, pending] of pendingSupportTicketPrompts.entries()) {
        if (!pending || Number(pending.expiresAt || 0) <= now) {
            pendingSupportTicketPrompts.delete(userId);
        }
    }
}

async function promptSupportTicket(chatId, userId, chatType = 'private') {
    if (!supportTicketsEnabled()) {
        await sendMessage(chatId,
            `✉️ El envío privado de tickets todavía no está activado en este servidor.` +
            supportContactLine());
        return false;
    }
    if (isSupportOperator(userId)) {
        await sendMessage(chatId,
            `🎫 <b>MODO OPERADOR DE SOPORTE</b>\n\n` +
            `Los tickets de los jugadores te llegarán a este chat con una referencia <code>SUP-XXXXXXXX</code>.\n` +
            `• Responder: <code>/reply SUP-XXXXXXXX tu respuesta</code>\n` +
            `• Cerrar: <code>/close SUP-XXXXXXXX</code>`);
        return false;
    }
    if (chatType !== 'private') {
        await sendMessage(chatId, '🔒 Por privacidad, abre un chat privado conmigo y usa allí <code>/ticket</code>.');
        return false;
    }
    prunePendingSupportTicketPrompts();
    const delivery = await sendMessage(chatId,
        `✉️ <b>ESCRIBIR A SOPORTE</b>\n\n` +
        `Escribe ahora tu problema en <b>un solo mensaje</b>. Incluye, si aplica, el ID del pedido <code>APEX-…</code>, el ID del anuncio <code>MKT-…</code> y la hora aproximada.\n\n` +
        `⛔ No envíes contraseñas, frase semilla, claves privadas, credenciales ni códigos de recuperación.`);
    if (!delivery || delivery.ok !== true) return false;
    pendingSupportTicketPrompts.set(String(userId), {
        chatId: String(chatId),
        expiresAt: Date.now() + 10 * 60 * 1000
    });
    return true;
}

async function submitSupportTicketMessage(msg, rawMessage) {
    const chatId = msg && msg.chat ? msg.chat.id : null;
    const userId = msg && msg.from ? String(msg.from.id) : '';
    if (chatId == null || !userId) return false;
    if (!supportTicketsEnabled()) {
        await sendMessage(chatId,
            `✉️ El envío privado de tickets todavía no está activado en este servidor.` +
            supportContactLine());
        return false;
    }
    if (isSupportOperator(userId)) {
        await promptSupportTicket(chatId, userId, msg.chat.type || 'private');
        return false;
    }
    if ((msg.chat.type || 'private') !== 'private') {
        await sendMessage(chatId, '🔒 Por privacidad, abre un chat privado conmigo y usa allí <code>/ticket</code>.');
        return false;
    }

    const message = String(rawMessage || '').trim().slice(0, 1000);
    if (message.length < 5) {
        await sendMessage(chatId, '✉️ Describe el problema con un poco más de detalle, por favor.');
        return false;
    }

    let rate;
    try {
        rate = consumeSupportTicketRate(userId);
    } catch (e) {
        rate = { ok: false, error: 'support_ticket_storage_unavailable' };
    }
    if (!rate.ok) {
        await sendMessage(chatId, rate.error === 'support_ticket_daily_limit'
            ? '🕐 Has alcanzado el límite diario de mensajes de soporte. Inténtalo mañana salvo que sea una incidencia de pago ya abierta.'
            : '🕐 Espera unos segundos antes de enviar otro mensaje de soporte.');
        return false;
    }

    const nowIso = new Date().toISOString();
    let ticket = null;
    let isNew = false;
    try {
        ticket = getOpenSupportTicketForUser(userId);
        if (!ticket) {
            isNew = true;
            ticket = {
                id: createSupportTicketId(),
                userId,
                playerChatId: String(chatId),
                status: 'open',
                createdAt: nowIso,
                updatedAt: nowIso,
                messageCount: 0
            };
        }
    } catch (e) {
        await sendMessage(chatId, '⚠️ No he podido crear el ticket ahora. Inténtalo de nuevo en unos minutos.');
        return false;
    }

    const operatorText = `${isNew ? '🎫 <b>NUEVO TICKET DE SOPORTE</b>' : '🎫 <b>NUEVO MENSAJE EN UN TICKET</b>'}\n\n` +
        `🧾 <b>Referencia:</b> <code>${escapeHtml(ticket.id)}</code>\n` +
        `👤 <b>Jugador:</b> ${escapeHtml(telegramDisplayName(msg.from))}\n` +
        `🆔 <b>ID de cuenta:</b> <code>${escapeHtml(userId)}</code>\n\n` +
        `💬 ${escapeHtml(message)}\n\n` +
        `↩️ Responder: <code>/reply ${escapeHtml(ticket.id)} tu respuesta</code>\n` +
        `✅ Cerrar: <code>/close ${escapeHtml(ticket.id)}</code>`;

    if (isNew) {
        try {
            saveSupportTicket(ticket);
        } catch (e) {
            await sendMessage(chatId, '⚠️ No he podido crear el ticket ahora. Inténtalo de nuevo en unos minutos.');
            return false;
        }
    }

    let delivery = null;
    try { delivery = await sendMessage(SUPPORT_TICKET_CHAT_ID, operatorText); } catch (e) {}
    if (!delivery || delivery.ok !== true) {
        if (isNew) {
            ticket.status = 'delivery_failed';
            ticket.updatedAt = new Date().toISOString();
            try { saveSupportTicket(ticket); } catch (e) {}
        }
        try { db.recordAuditEvent(userId, 'SUPPORT_TICKET_DELIVERY_FAILED', { ticketId: ticket.id }); } catch (e) {}
        await sendMessage(chatId, '⚠️ No he podido entregar tu mensaje a soporte ahora. Inténtalo de nuevo en unos minutos.');
        return false;
    }

    ticket.playerChatId = String(chatId);
    ticket.updatedAt = new Date().toISOString();
    ticket.lastPlayerMessageAt = ticket.updatedAt;
    ticket.messageCount = Number(ticket.messageCount || 0) + 1;
    try {
        saveSupportTicket(ticket);
        db.recordAuditEvent(userId, isNew ? 'SUPPORT_TICKET_CREATED' : 'SUPPORT_TICKET_FOLLOWUP', {
            ticketId: ticket.id,
            messageCount: ticket.messageCount
        });
    } catch (e) {}

    pendingSupportTicketPrompts.delete(userId);
    await sendMessage(chatId, isNew
        ? `✅ <b>Ticket creado: <code>${escapeHtml(ticket.id)}</code></b>\n\nTu mensaje ha llegado a soporte. Te responderemos en este mismo chat. Si necesitas añadir datos, usa de nuevo <code>/ticket</code>.`
        : `✅ <b>Mensaje añadido al ticket <code>${escapeHtml(ticket.id)}</code>.</b> Te responderemos en este mismo chat.`);
    return true;
}

async function supportTicketFromCommand(chatId, ticketId) {
    const ticket = getSupportTicket(ticketId);
    if (!ticket) {
        await sendMessage(chatId, `⚠️ No encuentro el ticket <code>${escapeHtml(ticketId || '')}</code>.`);
        return null;
    }
    return ticket;
}

function isSupportOperatorCommandChat(msg) {
    if (!msg || !msg.chat) return false;
    if ((msg.chat.type || 'private') === 'private') return true;
    return String(msg.chat.id) === String(SUPPORT_TICKET_CHAT_ID || '');
}

async function handleSupportReplyCommand(msg, text) {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    if (!isSupportOperator(userId)) {
        try { db.recordAuditEvent(userId, 'SUPPORT_TICKET_REPLY_UNAUTHORIZED', {}); } catch (e) {}
        await sendMessage(chatId, '🔒 Ese comando solo puede usarlo el operador de soporte.');
        return false;
    }
    if (!isSupportOperatorCommandChat(msg)) {
        await sendMessage(chatId, '🔒 Por privacidad, usa ese comando en tu chat privado conmigo o en el chat de tickets configurado.');
        return false;
    }
    const match = /^\/(?:reply|responder)(?:@\w+)?\s+(\S+)\s+([\s\S]+)$/i.exec(String(text || '').trim());
    if (!match) {
        await sendMessage(chatId, 'Uso: <code>/reply SUP-XXXXXXXX tu respuesta</code>');
        return false;
    }
    const ticketId = normalizeSupportTicketId(match[1]);
    const reply = String(match[2] || '').trim().slice(0, 1000);
    const ticket = ticketId ? await supportTicketFromCommand(chatId, ticketId) : null;
    if (!ticket) {
        if (!ticketId) await sendMessage(chatId, '⚠️ La referencia debe tener el formato <code>SUP-XXXXXXXX</code>.');
        return false;
    }
    if (ticket.status !== 'open') {
        await sendMessage(chatId, `⚠️ El ticket <code>${escapeHtml(ticket.id)}</code> ya no está abierto.`);
        return false;
    }

    let delivery = null;
    try {
        delivery = await sendMessage(ticket.playerChatId,
            `💬 <b>RESPUESTA DE SOPORTE</b> · <code>${escapeHtml(ticket.id)}</code>\n\n${escapeHtml(reply)}\n\n` +
            `Si necesitas añadir algo, usa <code>/ticket tu mensaje</code>.`);
    } catch (e) {}
    if (!delivery || delivery.ok !== true) {
        await sendMessage(chatId, `⚠️ No he podido entregar la respuesta del ticket <code>${escapeHtml(ticket.id)}</code>.`);
        return false;
    }

    ticket.updatedAt = new Date().toISOString();
    ticket.lastOperatorReplyAt = ticket.updatedAt;
    try {
        saveSupportTicket(ticket);
        db.recordAuditEvent(ticket.userId, 'SUPPORT_TICKET_REPLIED', { ticketId: ticket.id, operatorId: userId });
    } catch (e) {}
    await sendMessage(chatId, `✅ Respuesta enviada al jugador del ticket <code>${escapeHtml(ticket.id)}</code>.`);
    return true;
}

async function handleSupportCloseCommand(msg, text) {
    const chatId = msg.chat.id;
    const userId = String(msg.from.id);
    if (!isSupportOperator(userId)) {
        try { db.recordAuditEvent(userId, 'SUPPORT_TICKET_CLOSE_UNAUTHORIZED', {}); } catch (e) {}
        await sendMessage(chatId, '🔒 Ese comando solo puede usarlo el operador de soporte.');
        return false;
    }
    if (!isSupportOperatorCommandChat(msg)) {
        await sendMessage(chatId, '🔒 Por privacidad, usa ese comando en tu chat privado conmigo o en el chat de tickets configurado.');
        return false;
    }
    const match = /^\/(?:close|cerrar)(?:@\w+)?\s+(\S+)(?:\s+([\s\S]+))?$/i.exec(String(text || '').trim());
    if (!match) {
        await sendMessage(chatId, 'Uso: <code>/close SUP-XXXXXXXX [nota opcional]</code>');
        return false;
    }
    const ticketId = normalizeSupportTicketId(match[1]);
    const ticket = ticketId ? await supportTicketFromCommand(chatId, ticketId) : null;
    if (!ticket) {
        if (!ticketId) await sendMessage(chatId, '⚠️ La referencia debe tener el formato <code>SUP-XXXXXXXX</code>.');
        return false;
    }
    if (ticket.status !== 'open') {
        await sendMessage(chatId, `ℹ️ El ticket <code>${escapeHtml(ticket.id)}</code> ya estaba cerrado.`);
        return false;
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.updatedAt = ticket.closedAt;
    try {
        saveSupportTicket(ticket);
        db.recordAuditEvent(ticket.userId, 'SUPPORT_TICKET_CLOSED', { ticketId: ticket.id, operatorId: userId });
    } catch (e) {}

    const note = String(match[2] || '').trim().slice(0, 500);
    let notified = false;
    try {
        const delivery = await sendMessage(ticket.playerChatId,
            `✅ <b>TICKET CERRADO</b> · <code>${escapeHtml(ticket.id)}</code>` +
            `${note ? `\n\n${escapeHtml(note)}` : ''}\n\nSi el problema vuelve, abre un ticket nuevo con <code>/ticket</code>.`);
        notified = Boolean(delivery && delivery.ok === true);
    } catch (e) {}
    await sendMessage(chatId, notified
        ? `✅ Ticket <code>${escapeHtml(ticket.id)}</code> cerrado y jugador avisado.`
        : `✅ Ticket <code>${escapeHtml(ticket.id)}</code> cerrado; no pude avisar al jugador.`);
    return true;
}

function telegramRequest(method, data = {}) {
    return telegramBotApiRequest(method, data);
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

async function handlePreCheckoutQuery(query) {
    if (!query || !query.id || !query.from || query.from.id == null) return;
    let validation;
    try {
        validation = TELEGRAM_STARS_PURCHASES_ENABLED
            ? db.validateTelegramStarsPreCheckout({
                queryId: query.id,
                userId: query.from.id,
                currency: query.currency,
                totalAmount: query.total_amount,
                invoicePayload: query.invoice_payload
            })
            : { ok: false, error: 'telegram_stars_purchases_disabled', message: 'Las compras con Telegram Stars están pausadas temporalmente.' };
    } catch (error) {
        validation = { ok: false, error: 'pre_checkout_validation_failed', message: 'No hemos podido validar el pedido ahora. No se ha cobrado nada; inténtalo de nuevo.' };
        console.error('Error validando pre-checkout de Telegram Stars:', error.message);
    }

    const payload = {
        pre_checkout_query_id: query.id,
        ok: validation.ok === true
    };
    if (!validation.ok) {
        payload.error_message = String(validation.message || 'No hemos podido validar este pedido.').slice(0, 240);
    }
    const response = await telegramRequest('answerPreCheckoutQuery', payload);
    if (!response || response.ok !== true) {
        console.warn('Telegram no aceptó answerPreCheckoutQuery:', response && response.description ? response.description : 'sin descripción');
    }
    db.recordAuditEvent(String(query.from.id), validation.ok ? 'TELEGRAM_STARS_PRECHECKOUT_APPROVED' : 'TELEGRAM_STARS_PRECHECKOUT_REJECTED', {
        orderId: validation.order ? validation.order.id : undefined,
        error: validation.error || undefined
    });
}

async function handleSuccessfulStarsPayment(msg) {
    const payment = msg && msg.successful_payment;
    if (!payment || !msg.from || msg.from.id == null || !msg.chat || msg.chat.id == null) return;
    const outcome = await telegramStars.processSuccessfulPayment({
        userId: msg.from.id,
        currency: payment.currency,
        totalAmount: payment.total_amount,
        invoicePayload: payment.invoice_payload,
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
        providerPaymentChargeId: payment.provider_payment_charge_id
    });
    const order = outcome.order || null;
    const orderLine = order ? `\n🧾 <b>Pedido:</b> <code>${escapeHtml(order.id)}</code>` : '';
    const keyboard = { inline_keyboard: [[{ text: '🎮 Abrir Apex Motorsport', web_app: { url: WEBAPP_URL } }]] };
    let text;
    if (outcome.disposition === 'fulfilled' && order) {
        const profile = outcome.profile || (() => { try { return db.getEconomyProfile(String(msg.from.id)); } catch (e) { return null; } })();
        const balance = profile && profile.garage ? formatInt(profile.garage.credits) : null;
        text = `⭐🎉 <b>COMPRA CON TELEGRAM STARS CONFIRMADA</b>\n\n` +
            `Has recibido <b>+${formatInt(order.cr)} $CR</b> en tu garaje de servidor.${orderLine}` +
            (balance != null ? `\n🪙 <b>Saldo actual:</b> ${balance} $CR` : '') +
            `\n\nAbre el juego para ver el saldo sincronizado. No necesitas reclamar nada más.`;
    } else if (outcome.disposition === 'paid_unfulfilled' && order) {
        text = `⭐✅ <b>PAGO RECIBIDO</b>\n\n` +
            `Telegram ha confirmado el cargo, pero estamos terminando de aplicar tus $CR.${orderLine}\n\n` +
            `Abre la billetera del juego y pulsa comprobar en unos segundos. <b>No vuelvas a pagar este pedido.</b>`;
    } else if (outcome.disposition === 'refunded') {
        text = `⭐↩️ <b>PAGO DEVUELTO</b>\n\n` +
            `Ese cargo no podía aplicarse una segunda vez o no coincidía con un pedido válido, así que hemos solicitado su devolución en Stars.${orderLine}\n\n` +
            `Si no ves el reembolso en Telegram, usa <code>/paysupport${order ? ' ' + escapeHtml(order.id) : ''}</code>.`;
    } else if (outcome.disposition === 'refund_required') {
        text = `⭐⚠️ <b>PAGO EN REVISIÓN</b>\n\n` +
            `El cargo no se ha aplicado al juego y ha quedado marcado para reembolso.${orderLine}\n\n` +
            `<b>No vuelvas a pagar.</b> Conserva el recibo de Telegram y usa <code>/paysupport${order ? ' ' + escapeHtml(order.id) : ''}</code>.`;
    } else {
        text = `⭐⚠️ <b>NO HEMOS PODIDO APLICAR EL PAGO TODAVÍA</b>\n\n` +
            `Conserva el recibo de Telegram y no repitas la compra.${orderLine}\n\n` +
            `Abre el juego en unos segundos o usa <code>/paysupport${order ? ' ' + escapeHtml(order.id) : ''}</code>.`;
    }
    await sendMessage(msg.chat.id, text, keyboard);
}

async function handleRefundedStarsPayment(msg) {
    const payment = msg && msg.refunded_payment;
    if (!payment || !msg.from || msg.from.id == null || !msg.chat || msg.chat.id == null) return;
    const outcome = telegramStars.processRefundedPayment({
        userId: msg.from.id,
        currency: payment.currency,
        totalAmount: payment.total_amount,
        invoicePayload: payment.invoice_payload,
        telegramPaymentChargeId: payment.telegram_payment_charge_id,
        providerPaymentChargeId: payment.provider_payment_charge_id,
        source: 'telegram_update'
    });
    const order = outcome.order || null;
    await sendMessage(msg.chat.id,
        `⭐↩️ <b>REEMBOLSO DE TELEGRAM STARS REGISTRADO</b>\n\n` +
        `Hemos vinculado el reembolso al pedido correspondiente.${order ? `\n🧾 <b>Pedido:</b> <code>${escapeHtml(order.id)}</code>` : ''}\n\n` +
        `Si el reembolso corresponde a una compra ya entregada, el equipo puede revisar la cuenta según los términos y el historial del pedido.`, {
            inline_keyboard: [[{ text: '🎮 Abrir Apex Motorsport', web_app: { url: WEBAPP_URL } }]]
        });
}

async function sendSupport(chatId, userId) {
    const ticketLine = isSupportOperator(userId)
        ? (supportTicketsEnabled()
            ? `• <b>Operador:</b> los tickets nuevos te llegarán a este chat; responde con <code>/reply SUP-XXXXXXXX texto</code>.\n`
            : `• <b>Operador:</b> tu cuenta está configurada, pero los tickets privados están desactivados en este servidor.\n`)
        : (supportTicketsEnabled()
            ? `• <b>Hablar con soporte:</b> pulsa “Escribir a soporte” o usa <code>/ticket tu problema</code>. Tu mensaje llega en privado al operador y la respuesta volverá a este chat.\n`
            : `• <b>Tickets privados:</b> todavía no están activados en este servidor.\n`);
    const text = `🆘 <b>SOPORTE APEX MOTORSPORT</b>\n\n` +
        `👤 <b>Tu ID de cuenta de Telegram:</b> <code>${escapeHtml(userId)}</code>\n\n` +
        ticketLine +
        `• <b>Compra con Stars:</b> se crea desde la billetera dentro del juego; usa <code>/paysupport APEX-ID-DEL-PEDIDO</code> y conserva el recibo de Telegram.\n` +
        `• <b>Compra TON web:</b> usa el mismo comando y conserva el hash público de la transacción.\n` +
        `• <b>Recuperar pedidos:</b> entra con esta misma cuenta, abre la billetera del juego y comprueba el pedido pendiente.\n` +
        `• <b>Cuenta de navegador:</b> crea el código de recuperación en Ajustes antes de cambiar de dispositivo.\n` +
        `• <b>Anuncios:</b> la recompensa se acredita solo tras la confirmación de Adsgram en servidor.\n\n` +
        `⛔ Nunca envíes tu frase semilla, claves privadas, contraseñas, credencial de dispositivo ni código de recuperación.` +
        supportContactLine();
    const keyboard = [
        [{ text: '🎮 Abrir el juego', web_app: { url: WEBAPP_URL } }]
    ];
    if (supportTicketsEnabled() && !isSupportOperator(userId)) {
        keyboard.push([{ text: '✉️ Escribir a soporte', callback_data: 'cmd_ticket' }]);
    }
    keyboard.push(
        [
            { text: '🆘 Soporte web', url: webUrl('/support.html') },
            { text: '📜 Términos', url: webUrl('/terms.html') }
        ],
        [{ text: '🔐 Privacidad', url: webUrl('/privacy.html') }]
    );
    await sendMessage(chatId, text, { inline_keyboard: keyboard });
}

async function sendPaySupport(chatId, userId, rawOrderId) {
    const orderId = String(rawOrderId || '').trim().toUpperCase();
    if (!/^APEX-[0-9A-F]{12}$/.test(orderId)) {
        await sendMessage(chatId,
            `🧾 <b>SOPORTE DE COMPRAS</b>\n\n` +
            `Usa: <code>/paysupport APEX-XXXXXXXXXXXX</code>\n\n` +
            `El ID aparece en la pantalla del pedido; en compras TON web también es el comentario exacto de la transferencia. ` +
            `Antes de escribir, abre la billetera del juego con esta misma cuenta y comprueba el pedido pendiente. ` +
            `No vuelvas a pagar el mismo pedido.\n\n` +
            `⛔ Nunca compartas tu frase semilla ni claves privadas.`);
        return;
    }

    let order = null;
    try { order = db.getPurchaseOrder(orderId); } catch (e) {}
    if (!order || String(order.userId) !== String(userId)) {
        await sendMessage(chatId,
            `🧾 <b>Pedido ${escapeHtml(orderId)}</b>\n\n` +
            `No puedo confirmar ese pedido desde esta cuenta de Telegram. Si lo creaste en un navegador con una cuenta <code>usr_…</code>, ` +
            `entra con ese mismo dispositivo/cuenta y usa la billetera. Conserva el recibo de Telegram Stars o el hash público TON para soporte.\n\n` +
            `⛔ Nunca compartas tu frase semilla, claves privadas ni código de recuperación.`);
        return;
    }

    const isStars = order.paymentProvider === 'telegram_stars';
    if (isStars && order.status === 'paid_unfulfilled') {
        try {
            const checked = telegramStars.getStarsOrderForUser(order.id, userId);
            if (checked.ok) order = checked.order;
        } catch (e) {}
    }
    const statusText = (isStars ? {
        pending: '⏳ Pendiente: todavía no consta un successful_payment de Telegram para este pedido. Si se cobraron Stars, conserva el recibo y no pagues otra vez.',
        paid_unfulfilled: '✅ Pago confirmado por Telegram: estamos aplicando los $CR. Abre la billetera del juego y pulsa comprobar.',
        claimed: '🎉 Entregado: el servidor ya acreditó este pedido una sola vez en tu garaje.',
        expired: '⌛ Pedido caducado: no reutilices esta factura; crea un pedido nuevo solo si aún quieres comprar.',
        invoice_failed: 'Telegram no llegó a crear la factura, así que no debería existir ningún cargo por este pedido.',
        refunded: '↩️ Reembolsado: este pedido ya no entregará $CR.',
        refund_required: '⚠️ Cargo marcado para reembolso/revisión. No vuelvas a pagar.'
    } : {
        pending: '⏳ Pendiente: todavía no consta un pago válido para este pedido. Revisa importe, comentario exacto y ventana de cotización; no pagues dos veces sin comprobar tu wallet.',
        paid: '✅ Pago verificado: abre la billetera del juego y pulsa “Recuperar pedidos” para reclamarlo.',
        claimed: '🎉 Entregado: el servidor ya aplicó este pedido una vez a tu garaje.',
        expired: '⌛ Cotización caducada: no reutilices este pedido para un pago nuevo.',
        cancelled: 'Cancelado: crea un pedido nuevo solo si aún quieres comprar.'
    })[order.status] || 'Estado registrado en servidor.';
    const product = order.productType === 'crate'
        ? `Cofre ${escapeHtml(order.crateId || '')}`
        : `${formatInt(order.cr)} $CR`;
    const txLine = isStars
        ? (order.telegramPaymentChargeId ? `\n⭐ <b>Cargo Telegram:</b> <code>${escapeHtml(String(order.telegramPaymentChargeId).slice(0, 90))}</code>` : '')
        : (order.txHash ? `\n🔗 <b>Tx:</b> <code>${escapeHtml(String(order.txHash).slice(0, 90))}</code>` : '');
    const amountLine = isStars
        ? `⭐ <b>Importe:</b> ${formatInt(order.priceStars)} Telegram Stars (XTR)`
        : `💎 <b>Importe:</b> ${escapeHtml(order.amountTon || '')} TON`;
    const reviewLine = isStars
        ? 'Si necesitas revisión manual, conserva este ID y el recibo de Telegram del cargo.'
        : 'Si necesitas revisión manual, conserva este ID y el hash público de la transacción.';
    await sendMessage(chatId,
        `🧾 <b>PEDIDO ${escapeHtml(order.id)}</b>\n\n` +
        `📦 <b>Producto:</b> ${product}\n` +
        `${amountLine}\n` +
        `📌 <b>Estado:</b> <code>${escapeHtml(order.status || 'unknown')}</code>${txLine}\n\n` +
        `${statusText}\n\n` +
        `${reviewLine}` + supportContactLine(), {
            inline_keyboard: [[{ text: '🎮 Abrir billetera en el juego', web_app: { url: WEBAPP_URL } }]]
        });
}

async function handleMessage(msg) {
    if (!msg || !msg.chat || msg.chat.id == null || !msg.from || msg.from.id == null) return;
    if (msg.successful_payment) {
        await handleSuccessfulStarsPayment(msg);
        return;
    }
    if (msg.refunded_payment) {
        await handleRefundedStarsPayment(msg);
        return;
    }
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name || 'Piloto';
    const text = String(msg.text || '').trim().slice(0, 1000);
    const command = text.split(/\s+/)[0].split('@')[0].toLowerCase();

    if (command === '/reply' || command === '/responder') {
        await handleSupportReplyCommand(msg, text);
        return;
    }

    if (command === '/close' || command === '/cerrar') {
        await handleSupportCloseCommand(msg, text);
        return;
    }

    if (command === '/ticket' || command === '/soporte') {
        const body = text.replace(/^\/\w+(?:@\w+)?\s*/, '').trim();
        if (!body) await promptSupportTicket(chatId, userId, msg.chat.type || 'private');
        else await submitSupportTicketMessage(msg, body);
        return;
    }

    if (text && !text.startsWith('/')) {
        const chatType = msg.chat.type || 'private';
        if (chatType === 'private' && !isSupportOperator(userId)) {
            prunePendingSupportTicketPrompts();
            const pending = pendingSupportTicketPrompts.get(String(userId));
            if (pending && String(pending.chatId) === String(chatId) && pending.expiresAt > Date.now()) {
                pendingSupportTicketPrompts.delete(String(userId));
                await submitSupportTicketMessage(msg, text);
            } else if (supportTicketsEnabled()) {
                await sendMessage(chatId,
                    `👋 Si necesitas ayuda, usa <code>/ticket tu problema</code> o pulsa Soporte y después “Escribir a soporte”.`);
            }
        }
        return;
    }

    if (command === '/start') {
        const user = db.getUser(userId, username);
        const garage = getAuthoritativeGarage(userId, username) || {};
        const cars = Array.isArray(garage.garage) ? garage.garage : [];
        const equipped = cars.find(car => car.instanceId === garage.equippedInstanceId) || cars[0] || null;
        const tonLine = TELEGRAM_STARS_PURCHASES_ENABLED
            ? 'Dentro de Telegram, los $CR se compran con Telegram Stars desde la billetera del juego; no envíes TON para comprar $CR desde la Mini App.'
            : (TELEGRAM_TON_PURCHASES_ENABLED
                ? 'Las compras dentro de Telegram siguen el flujo habilitado por el operador.'
                : 'Las compras dentro de Telegram están en pausa; no envíes TON desde la Mini App.');
        const welcomeText = `🏁 <b>¡BIENVENIDO A APEX MOTORSPORT!</b> 🏁\n\n` +
            `Juego arcade GT en Telegram. Derrapa en circuitos reales del catálogo, mejora tu coche y registra tiempos por pista.\n\n` +
            `👤 <b>Piloto:</b> @${escapeHtml(username)}\n` +
            `🆔 <b>ID de cuenta:</b> <code>${escapeHtml(userId)}</code>\n` +
            `🪙 <b>$CR (saldo interno):</b> ${formatInt(garage.credits)}\n` +
            `🧪 <b>Nitros:</b> ${formatInt(garage.nitros)}\n` +
            `🏎️ <b>Vehículo equipado:</b> ${escapeHtml(equipped ? equipped.name : 'Apex Cadet 1.0')}\n` +
            `🏆 <b>Carreras registradas:</b> ${safeNumber(user.stats && user.stats.races)}\n\n` +
            `Los $CR y coches son objetos virtuales sin retirada a TON. ${tonLine}\n\n` +
            `Pulsa el botón de abajo para saltar a la pista.`;

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
                    { text: '💎 $CR y compras', callback_data: 'cmd_web3' }
                ],
                [
                    { text: '🆘 Soporte', callback_data: 'cmd_support' }
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

    if (command === '/support' || command === '/help' || command === '/ayuda') {
        await sendSupport(chatId, userId);
        return;
    }

    if (command === '/paysupport') {
        const orderId = text.split(/\s+/)[1] || '';
        await sendPaySupport(chatId, userId, orderId);
        return;
    }

    if (command === '/terms') {
        await sendMessage(chatId, `📜 <b>Términos del juego:</b> ${escapeHtml(webUrl('/terms.html'))}`);
        return;
    }

    if (command === '/privacy') {
        await sendMessage(chatId, `🔐 <b>Política de privacidad:</b> ${escapeHtml(webUrl('/privacy.html'))}`);
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
        const telegramTonText = TELEGRAM_STARS_PURCHASES_ENABLED
            ? 'compra $CR con Telegram Stars desde la billetera del juego (100 ⭐ = 1.000 $CR, sin descuentos). El servidor acredita solo tras el successful_payment del bot.'
            : (TELEGRAM_TON_PURCHASES_ENABLED
                ? 'sigue solo las pantallas oficiales de compra habilitadas por el operador.'
                : 'las compras están en pausa; no envíes TON desde esta Mini App.');
        const text = `💎 <b>$CR, COCHES Y COMPRAS</b>\n\n` +
            `• <b>$CR:</b> moneda interna del juego, sin valor monetario garantizado y sin retirada a TON.\n` +
            `• <b>Coches:</b> objetos virtuales jugables con registro global en servidor. Convertirlos a NFT de TON será opcional desde el garaje; aún no se acuñan automáticamente en cadena.\n` +
            `• <b>Web externa:</b> cuando esté habilitado, el servidor crea un pedido y solo entrega tras verificar el pago TON con su comentario exacto.\n` +
            `• <b>Telegram:</b> ${telegramTonText}\n` +
            `• <b>Sin wallet conectada:</b> el juego no te pide frase semilla ni claves privadas. Para un pedido usa <code>/paysupport APEX-ID</code>.`;
        await sendMessage(chatId, text);
    } else if (data === 'cmd_support') {
        await sendSupport(chatId, userId);
    } else if (data === 'cmd_ticket') {
        await promptSupportTicket(chatId, userId, cq.message.chat.type || 'private');
    }
}

async function sendGarage(chatId, userId, username) {
    const garage = getAuthoritativeGarage(userId, username);
    if (!garage) {
        await sendMessage(chatId, '⚠️ No he podido leer tu garaje de servidor ahora. Abre el juego con conexión e inténtalo de nuevo.');
        return;
    }
    const cars = Array.isArray(garage.garage) ? garage.garage : [];
    let text = `🏎️ <b>TU GARAJE EN SERVIDOR</b>\n\n` +
        `🪙 <b>$CR:</b> ${formatInt(garage.credits)} · 💎 <b>Gemas:</b> ${formatInt(garage.gems)} · 🧪 <b>Nitros:</b> ${formatInt(garage.nitros)}\n` +
        `👥 <b>Tu código de invitación:</b> <code>${escapeHtml(garage.referralCode || 'APEX-CÓDIGO')}</code>\n\n`;

    if (!cars.length) {
        text += 'Todavía no consta ningún coche en el perfil.';
    } else {
        cars.slice(0, 20).forEach(car => {
            const equippedMark = car.instanceId === garage.equippedInstanceId ? ' ⭐ EQUIPADO' : '';
            text += `• <b>${escapeHtml(car.name || 'Coche')}</b>${equippedMark}\n` +
                `   ${escapeHtml(String(car.rarity || 'starter').toUpperCase())} · Niv. ${formatInt(car.level || 1)} · Energía ${formatInt(car.energy)}/${formatInt(car.maxEnergy || 10)}\n`;
        });
        if (cars.length > 20) text += `\n…y ${cars.length - 20} coches más en el juego.`;
    }
    text += `\n\nLos coches y $CR son virtuales y no pueden retirarse a TON.`;

    await sendMessage(chatId, text, {
        inline_keyboard: [[{ text: '🎮 Abrir mi garaje', web_app: { url: WEBAPP_URL } }]]
    });
}

async function sendLeaderboard(chatId) {
    const top = db.getLeaderboard({ trackId: 'rookie_ring', limit: 10 });
    let text = `🏆 <b>MEJORES TIEMPOS — ROOKIE RING</b>\n\n`;
    if (!top.length) text += 'Todavía no hay tiempos oficiales en este circuito. Sé el primero en marcar uno.\n';
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
try {
    const storedUpdateId = Number(db.getMetaValue('telegramBotLastUpdateId', 0));
    if (Number.isFinite(storedUpdateId) && storedUpdateId > 0) lastUpdateId = Math.floor(storedUpdateId);
} catch (e) {}

function persistLastUpdateId() {
    try { db.setMetaValue('telegramBotLastUpdateId', lastUpdateId); } catch (e) {}
}

const botHealth = {
    startedAt: new Date().toISOString(),
    commandsSyncedAt: null,
    lastPollStartedAt: null,
    lastSuccessAt: null,
    lastUpdateId,
    lastErrorAt: null,
    lastError: null,
    consecutiveFailures: 0
};
global.__APEX_TELEGRAM_BOT_HEALTH__ = botHealth;

function markBotPollSuccess(updateCount) {
    botHealth.lastSuccessAt = new Date().toISOString();
    botHealth.lastUpdateId = lastUpdateId;
    botHealth.lastUpdateCount = Number(updateCount) || 0;
    botHealth.consecutiveFailures = 0;
    botHealth.lastError = null;
    try { db.setMetaValue('telegramBotLastPollSuccessAt', botHealth.lastSuccessAt); } catch (e) {}
}

function markBotPollError(error) {
    botHealth.lastErrorAt = new Date().toISOString();
    botHealth.lastError = String(error && error.message ? error.message : error || 'telegram_polling_error').slice(0, 240);
    botHealth.consecutiveFailures += 1;
    try { db.setMetaValue('telegramBotLastPollErrorAt', botHealth.lastErrorAt); } catch (e) {}
}

function isPaymentUpdate(update) {
    return Boolean(update && (
        update.pre_checkout_query
        || (update.message && (update.message.successful_payment || update.message.refunded_payment))
    ));
}

async function startPolling() {
    console.log(`🤖 Bot de Telegram escuchando eventos con Polling...`);
    try {
        await telegramRequest('setMyCommands', {
            commands: [
                { command: 'start', description: 'Abrir Apex Motorsport' },
                { command: 'garage', description: 'Ver mi garaje de servidor' },
                { command: 'ranking', description: 'Mejores tiempos en Rookie Ring' },
                { command: 'tracks', description: 'Circuitos oficiales' },
                { command: 'support', description: 'Ayuda y recuperación' },
                { command: 'ticket', description: 'Enviar un mensaje privado a soporte' },
                { command: 'paysupport', description: 'Estado de un pedido Stars o TON: /paysupport APEX-ID' },
                { command: 'terms', description: 'Términos del juego' },
                { command: 'privacy', description: 'Política de privacidad' }
            ]
        });
        botHealth.commandsSyncedAt = new Date().toISOString();
    } catch (commandsErr) {
        console.warn('Aviso: no se pudieron sincronizar los comandos del bot:', commandsErr.message);
    }
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
            botHealth.lastPollStartedAt = new Date().toISOString();
            const res = await telegramRequest('getUpdates', {
                offset: lastUpdateId + 1,
                timeout: 25,
                allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
            });

            if (!res || res.ok !== true || !Array.isArray(res.result)) {
                const description = escapeHtml(res && res.description ? res.description : 'Respuesta no válida de Telegram');
                const errorCode = safeNumber(res && res.error_code, 0);
                markBotPollError(new Error(`${errorCode || 'telegram'}: ${description}`));
                console.error(`Error en polling de Telegram (${errorCode || 'sin código'}): ${description}. Reintentando en ${Math.round(pollingBackoffMs / 1000)}s`);
                await new Promise(r => setTimeout(r, pollingBackoffMs));
                pollingBackoffMs = Math.min(60000, pollingBackoffMs * 2);
                continue;
            }

            pollingBackoffMs = 1000;
            markBotPollSuccess(res.result.length);
            let retryPaymentUpdate = false;
            for (const update of res.result) {
                if (!update || !Number.isFinite(Number(update.update_id))) continue;
                const updateId = Number(update.update_id);
                try {
                    if (update.pre_checkout_query) {
                        await handlePreCheckoutQuery(update.pre_checkout_query);
                    } else if (update.message) {
                        await handleMessage(update.message);
                    } else if (update.callback_query) {
                        await handleCallbackQuery(update.callback_query);
                    }
                    lastUpdateId = updateId;
                    persistLastUpdateId();
                } catch (updateError) {
                    console.error('Error procesando actualización de Telegram:', updateError.message);
                    if (isPaymentUpdate(update)) {
                        // No avances el offset si el pago no quedó registrado:
                        // Telegram puede volver a entregar la actualización.
                        retryPaymentUpdate = true;
                        break;
                    }
                    // Comandos/callbacks normales sí avanzan para que una
                    // actualización envenenada no congele el bot.
                    lastUpdateId = updateId;
                    persistLastUpdateId();
                }
            }
            if (retryPaymentUpdate) {
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (err) {
            markBotPollError(err);
            console.error(`Error en polling: ${err.message}. Reintentando en ${Math.round(pollingBackoffMs / 1000)}s`);
            await new Promise(r => setTimeout(r, pollingBackoffMs));
            pollingBackoffMs = Math.min(60000, Math.max(4000, pollingBackoffMs * 2));
        }
    }
}

module.exports = {
    started: true,
    __test: {
        handlePreCheckoutQuery,
        handleSuccessfulStarsPayment,
        handleRefundedStarsPayment,
        sendPaySupport,
        handleMessage,
        handleCallbackQuery,
        submitSupportTicketMessage,
        handleSupportReplyCommand,
        handleSupportCloseCommand,
        supportTicketsEnabled,
        isPaymentUpdate,
        botHealth,
        markBotPollSuccess,
        markBotPollError
    }
};

startPolling();
