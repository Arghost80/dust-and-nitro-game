// ===== SERVIDOR AUTOCONTENIDO NATIVO (SIN DEPENDENCIAS EXTERNAS) =====
const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./database');
const { CircuitsCatalog } = require('./track_generator');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || '';

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

    // ===== RUTAS DE API =====
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

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🏁 DUST & NITRO - Servidor y Bot Telegram listo`);
    console.log(`📡 URL Local: http://localhost:${PORT}`);
    console.log(`📡 URL IPv4:  http://127.0.0.1:${PORT}`);
    console.log(`=======================================================`);
});
