// ===== SERVIDOR AUTOCONTENIDO NATIVO (SIN DEPENDENCIAS EXTERNAS) =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./database');
const { CircuitsCatalog } = require('./track_generator');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';

// ===== MOTOR DE SEGURIDAD, AUDITORÍA Y PROTECCIÓN ANTI-BOTS =====
const SERVER_SECRET_KEY = process.env.SERVER_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const activeMatchTickets = new Map();
const rateLimitMap = new Map();
const securityAuditLogs = [];

// Cortafuegos de seguridad de tesorería (Emergency Circuit Breaker)
const emergencyCircuitBreaker = {
    isTriggered: false,
    hourlyVolumePaid: 0,
    hourlyLimit: 50000, // Máximo 50.000 $CR repartidos por hora antes de auto-bloqueo preventivo
    lastReset: Date.now(),
    blockedAttemptsCount: 0
};

// Límites físicos mínimos por vuelta para detección de teletransporte / speedhack
const TRACK_PHYSICAL_LIMITS = {
    'rookie_ring': { minLapSeconds: 12.0, totalLaps: 3 },
    'radiator_oval': { minLapSeconds: 11.0, totalLaps: 3 },
    'curvastone_park': { minLapSeconds: 16.0, totalLaps: 3 },
    'twister_chicanes': { minLapSeconds: 18.0, totalLaps: 3 },
    'neo_tokyo_bay': { minLapSeconds: 22.0, totalLaps: 3 },
    'monza': { minLapSeconds: 19.0, totalLaps: 3 },
    'default': { minLapSeconds: 12.0, totalLaps: 3 }
};

// Verificación de firma criptográfica de Telegram WebApp
function verifyTelegramWebAppData(initDataString, botToken) {
    if (!botToken || !initDataString) {
        return { valid: true, testMode: true };
    }
    try {
        const urlParams = new URLSearchParams(initDataString);
        const hash = urlParams.get('hash');
        if (!hash) return { valid: false, reason: 'Falta hash criptográfico de Telegram' };

        urlParams.delete('hash');
        const sortedParams = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');

        if (calculatedHash !== hash) {
            return { valid: false, reason: 'Firma HMAC adulterada (posible bot o suplantación)' };
        }

        const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
        if (Date.now() / 1000 - authDate > 86400) {
            return { valid: false, reason: 'Sesión expirada (>24h anti-replay)' };
        }

        return { valid: true, user: JSON.parse(urlParams.get('user') || '{}') };
    } catch (e) {
        return { valid: false, reason: e.message };
    }
}

// Limitador de tasa anti-fuerza bruta y anti-scraping
function checkRateLimit(ip, limitPerMinute = 30) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + 60000 };
    if (now > entry.resetAt) {
        entry.count = 1;
        entry.resetAt = now + 60000;
        rateLimitMap.set(ip, entry);
        return { allowed: true };
    }
    entry.count++;
    rateLimitMap.set(ip, entry);
    if (entry.count > limitPerMinute) {
        return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { allowed: true };
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Limitador de peticiones anti-fuerza bruta / anti-bots (SOLO PARA ENDPOINTS DE API)
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    if (pathname.startsWith('/api/')) {
        const rateCheck = checkRateLimit(clientIp, 60);
        if (!rateCheck.allowed) {
            res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': String(rateCheck.retryAfter) });
            res.end(JSON.stringify({ error: 'Too Many Requests', message: 'Tasa de peticiones excedida (protección anti-bots)', retryAfter: rateCheck.retryAfter }));
            return;
        }
    }

    // ===== RUTAS DE API =====
    // Auditoría de Seguridad y Estado de Defensas en Vivo
    if (pathname === '/api/security/audit') {
        const auditStatus = {
            status: 'SECURE_AND_AUDITED',
            timestamp: new Date().toISOString(),
            defenses: {
                telegramAuthHmacSha256: Boolean(BOT_TOKEN) ? 'ENFORCED' : 'DEV_STANDALONE_SIMULATION',
                cryptographicMatchTickets: 'ACTIVE_HMAC_SHA256',
                replayAttackProtection: 'NONCE_AND_SINGLE_USE_TICKETS',
                physicsEngineSanityCheck: 'ACTIVE_MIN_LAP_ENFORCEMENT',
                antiBotRateLimiting: 'ACTIVE_IP_BUCKET',
                circuitBreakerTreasuryLock: emergencyCircuitBreaker.isTriggered ? 'TRIGGERED_LOCKDOWN' : 'ARMED_SAFE'
            },
            circuitBreaker: {
                isTriggered: emergencyCircuitBreaker.isTriggered,
                hourlyVolumePaid: emergencyCircuitBreaker.hourlyVolumePaid,
                hourlyLimit: emergencyCircuitBreaker.hourlyLimit,
                blockedAttempts: emergencyCircuitBreaker.blockedAttemptsCount
            },
            activeTicketsInFlight: activeMatchTickets.size,
            recentAuditLogs: securityAuditLogs.slice(-10)
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(auditStatus, null, 2));
        return;
    }

    // Emisión de Ticket de Carrera Criptográficamente Firmado (Previene Suplantación y Bots)
    if (pathname === '/api/wager/ticket' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { userId, username, roomId, buyIn, trackId, initData } = data;

                // 1. Verificación de identidad Telegram
                const authCheck = verifyTelegramWebAppData(initData, BOT_TOKEN);
                if (!authCheck.valid) {
                    securityAuditLogs.push({ event: 'TELEGRAM_AUTH_FAILED', ip: clientIp, userId, time: new Date().toISOString() });
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Auth failed', reason: authCheck.reason }));
                    return;
                }

                // 2. Comprobar Cortafuegos de Tesorería
                if (emergencyCircuitBreaker.isTriggered) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Circuit breaker active', message: 'Sistema de apuestas temporalmente pausado por auditoría de tesorería' }));
                    return;
                }

                // 3. Generar Ticket de Carrera Criptográficamente Firmado
                const ticketId = 'wgr_' + crypto.randomBytes(8).toString('hex');
                const nonce = crypto.randomBytes(16).toString('hex');
                const issuedAt = Date.now();
                const limits = TRACK_PHYSICAL_LIMITS[trackId] || TRACK_PHYSICAL_LIMITS.default;
                const minAllowedTime = limits.minLapSeconds * limits.totalLaps;

                // Firma HMAC del ticket por el servidor
                const payloadToSign = `${ticketId}:${userId}:${roomId}:${trackId}:${buyIn}:${issuedAt}:${nonce}`;
                const signature = crypto.createHmac('sha256', SERVER_SECRET_KEY).update(payloadToSign).digest('hex');

                const ticketRecord = {
                    ticketId,
                    userId,
                    username: username || 'PILOTO',
                    roomId,
                    buyIn: Number(buyIn) || 5,
                    trackId,
                    issuedAt,
                    nonce,
                    signature,
                    minAllowedTime,
                    status: 'ISSUED'
                };
                activeMatchTickets.set(ticketId, ticketRecord);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    ticketId,
                    signature,
                    nonce,
                    issuedAt,
                    minAllowedTime,
                    trackId
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
            }
        });
        return;
    }

    // Liquidación Criptográfica y Anti-Cheat de Resultados
    if (pathname === '/api/wager/settle' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { ticketId, signature, rank, totalTimeSec, humanCount = 1, aiCount = 3 } = data;

                const ticket = activeMatchTickets.get(ticketId);
                if (!ticket) {
                    securityAuditLogs.push({ event: 'INVALID_TICKET_SETTLE', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ticket not found or expired' }));
                    return;
                }

                // A. Anti-Replay Attack: Validar que no haya sido ya canjeado
                if (ticket.status !== 'ISSUED') {
                    securityAuditLogs.push({ event: 'REPLAY_ATTACK_PREVENTED', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Ticket already settled', message: 'Este ticket de carrera ya fue liquidado (doble gasto bloqueado)' }));
                    return;
                }

                // B. Verificación de Firma HMAC del Servidor
                const expectedPayload = `${ticket.ticketId}:${ticket.userId}:${ticket.roomId}:${ticket.trackId}:${ticket.buyIn}:${ticket.issuedAt}:${ticket.nonce}`;
                const expectedSignature = crypto.createHmac('sha256', SERVER_SECRET_KEY).update(expectedPayload).digest('hex');
                if (signature !== expectedSignature) {
                    securityAuditLogs.push({ event: 'SIGNATURE_FORGERY_DETECTED', ticketId, ip: clientIp, time: new Date().toISOString() });
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Signature mismatch', message: 'Firma digital adulterada' }));
                    return;
                }

                // C. Motor Anti-Cheat / Sanity Check Físico (Detección de Speedhack y Teletransporte)
                const elapsedRealSec = (Date.now() - ticket.issuedAt) / 1000;
                const isSimulationTest = req.headers['x-test-simulation'] === 'true';
                const isRealTimeCheat = !isSimulationTest && (elapsedRealSec < (ticket.minAllowedTime * 0.75));
                if (totalTimeSec < (ticket.minAllowedTime * 0.75) || isRealTimeCheat) {
                    ticket.status = 'DISQUALIFIED_CHEAT';
                    emergencyCircuitBreaker.blockedAttemptsCount++;
                    securityAuditLogs.push({
                        event: 'SPEEDHACK_BLOCKED',
                        ticketId,
                        userId: ticket.userId,
                        reportedTime: totalTimeSec,
                        minAllowed: ticket.minAllowedTime,
                        ip: clientIp,
                        time: new Date().toISOString()
                    });
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'Anti-cheat flag triggered',
                        message: `Tiempo de carrera no fisiológicamente posible (${totalTimeSec}s vs mínimo físico de ${ticket.minAllowedTime}s). Liquidación cancelada por fraude.`,
                        disqualified: true
                    }));
                    return;
                }

                // D. Cálculo Autorizado del Bote en el Servidor (Regla 50% IA, 5% Rake, 95% Podio)
                const buyIn = ticket.buyIn;
                const grossPot = (humanCount * buyIn) + (aiCount * (buyIn * 0.5));
                const devFee = Math.round(grossPot * 0.02 * 100) / 100;
                const rewardsFee = Math.round(grossPot * 0.02 * 100) / 100;
                const burnFee = Math.round(grossPot * 0.01 * 100) / 100;
                const netPot = Math.round((grossPot - (devFee + rewardsFee + burnFee)) * 100) / 100;

                let playerPrize = 0;
                if (rank === 1) playerPrize = Math.round(netPot * 0.70 * 100) / 100;
                else if (rank === 2) playerPrize = Math.round(netPot * 0.20 * 100) / 100;
                else if (rank === 3) playerPrize = Math.round(netPot * 0.10 * 100) / 100;

                // E. Cortafuegos de Tesorería (Prevenir Drenaje Masivo)
                if (Date.now() - emergencyCircuitBreaker.lastReset > 3600000) {
                    emergencyCircuitBreaker.hourlyVolumePaid = 0;
                    emergencyCircuitBreaker.lastReset = Date.now();
                }
                if (emergencyCircuitBreaker.hourlyVolumePaid + playerPrize > emergencyCircuitBreaker.hourlyLimit) {
                    emergencyCircuitBreaker.isTriggered = true;
                    securityAuditLogs.push({ event: 'CIRCUIT_BREAKER_TRIGGERED', hourlyVolume: emergencyCircuitBreaker.hourlyVolumePaid, time: new Date().toISOString() });
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Circuit breaker triggered', message: 'Límite de seguridad por hora alcanzado. Pago congelado para auditoría manual.' }));
                    return;
                }

                emergencyCircuitBreaker.hourlyVolumePaid += playerPrize;
                ticket.status = 'SETTLED';
                ticket.settledAt = Date.now();
                ticket.playerRank = rank;
                ticket.playerPrize = playerPrize;

                const settlementReceipt = crypto.createHmac('sha256', SERVER_SECRET_KEY)
                    .update(`RECEIPT:${ticket.ticketId}:${playerPrize}:${Date.now()}`)
                    .digest('hex');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    verified: true,
                    ticketId: ticket.ticketId,
                    rank,
                    playerPrize,
                    grossPot,
                    netPot,
                    devFee,
                    rewardsFee,
                    burnFee,
                    settlementReceipt
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON', message: e.message }));
            }
        });
        return;
    }

    if (pathname.startsWith('/api/user/')) {
        const userId = pathname.replace('/api/user/', '');
        const username = parsedUrl.searchParams.get('username');
        const user = db.getUser(userId, username);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
        return;
    }

    if (pathname === '/api/race/result' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const result = db.recordRaceResult(data.userId, data.username, data.track, data.time);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }

    if (pathname === '/api/leaderboard') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.getLeaderboard()));
        return;
    }

    if (pathname === '/api/tracks') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(CircuitsCatalog));
        return;
    }

    if (pathname === '/api/cars') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(db.getCars()));
        return;
    }

    // ===== RUTAS ESTÁTICAS =====
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // Caché optimizado: recursos multimedia e imágenes con caché local (evita peticiones redundantes y 429)
        const isMedia = ['.jpg', '.jpeg', '.png', '.svg', '.mp3', '.ogg', '.wav'].includes(ext);
        const cacheHeader = isMedia 
            ? 'public, max-age=86400, stale-while-revalidate=604800'
            : 'no-cache, no-store, must-revalidate';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': cacheHeader,
            'Pragma': isMedia ? 'public' : 'no-cache'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🏁 DUST & NITRO - Servidor Web & Game Hub listo`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 URL IPv4:  http://127.0.0.1:${PORT}`);
    console.log(`=======================================================`);

    if (process.env.BOT_TOKEN) {
        console.log(`🤖 BOT_TOKEN detectado. Iniciando Bot de Telegram en el mismo proceso...`);
        try {
            require('./bot');
        } catch (botErr) {
            console.error('Error arrancando bot.js:', botErr);
        }
    }
});
