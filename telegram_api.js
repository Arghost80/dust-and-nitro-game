// ===== CLIENTE MÍNIMO DE TELEGRAM BOT API (v105) =====
// Lo comparten server.js (facturas Stars) y bot.js (long polling). El token
// solo se lee del entorno y nunca se registra en logs. TELEGRAM_BOT_API_BASE_URL
// existe para las pruebas locales con un mock; en producción se fuerza el
// host oficial para que una variable mal puesta no desvíe el token.
const OFFICIAL_TELEGRAM_API_BASE_URL = 'https://api.telegram.org';

function isProductionEnv() {
    return process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER_EXTERNAL_URL);
}

function getTelegramBotToken() {
    return String(process.env.BOT_TOKEN || '').trim();
}

function getTelegramApiBaseUrl() {
    const configured = String(process.env.TELEGRAM_BOT_API_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!configured) return OFFICIAL_TELEGRAM_API_BASE_URL;
    if (isProductionEnv()) return OFFICIAL_TELEGRAM_API_BASE_URL;
    try {
        const parsed = new URL(configured);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return configured;
    } catch (e) {}
    return OFFICIAL_TELEGRAM_API_BASE_URL;
}

async function telegramBotApiRequest(method, params = {}, options = {}) {
    const token = getTelegramBotToken();
    if (!token) throw new Error('telegram_bot_token_not_configured');
    if (!/^[A-Za-z]+$/.test(String(method || ''))) throw new Error('invalid_telegram_method');
    if (typeof fetch !== 'function') throw new Error('fetch_not_available');

    const longPollSeconds = method === 'getUpdates' ? Math.max(0, Number(params && params.timeout) || 0) : 0;
    const timeoutMs = Math.max(
        1000,
        Math.min(45000, Number(options.timeoutMs) || (longPollSeconds ? (longPollSeconds + 10) * 1000 : 10000))
    );
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
        const response = await fetch(`${getTelegramApiBaseUrl()}/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(params || {}),
            signal: controller ? controller.signal : undefined
        });
        const text = await response.text();
        if (text.length > 1024 * 1024) throw new Error('telegram_response_too_large');
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (e) {}
        if (!parsed || typeof parsed !== 'object') {
            throw new Error(`telegram_http_${response.status}`);
        }
        return parsed;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function telegramBotApiResult(method, params = {}, options = {}) {
    const response = await telegramBotApiRequest(method, params, options);
    if (!response || response.ok !== true) {
        const description = response && response.description ? String(response.description).slice(0, 240) : 'telegram_api_error';
        const error = new Error(description);
        error.code = 'telegram_api_error';
        error.telegramErrorCode = response && response.error_code ? Number(response.error_code) : null;
        throw error;
    }
    return response.result;
}

module.exports = {
    OFFICIAL_TELEGRAM_API_BASE_URL,
    getTelegramApiBaseUrl,
    getTelegramBotToken,
    telegramBotApiRequest,
    telegramBotApiResult
};
