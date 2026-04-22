// ════════════════════════════════════════════════════════════════
//  🍪 SESSION MANAGER — Persistent cookies/tokens/headers per target
//  Permet aux outils de la chaine (curl, sqlmap, nuclei, browser)
//  de partager un meme etat d'authentification. Stocke par target.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(__dirname, '..', 'data', 'sessions');
try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch {}

function _key(target) {
    return String(target).replace(/[^a-z0-9.-]/gi, '_').slice(0, 128);
}

function _file(target) { return path.join(STORE_DIR, `${_key(target)}.json`); }

function load(target) {
    try {
        const p = _file(target);
        if (!fs.existsSync(p)) return { target, cookies: {}, headers: {}, tokens: {}, created: Date.now() };
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {
        return { target, cookies: {}, headers: {}, tokens: {}, created: Date.now() };
    }
}

function save(session) {
    session.updated = Date.now();
    try { fs.writeFileSync(_file(session.target), JSON.stringify(session, null, 2)); } catch {}
    return session;
}

function setCookie(target, name, value, opts = {}) {
    const s = load(target);
    s.cookies[name] = { value, path: opts.path || '/', domain: opts.domain || '', secure: !!opts.secure, httpOnly: !!opts.httpOnly, expires: opts.expires || null };
    return save(s);
}

function setCookiesFromHeader(target, setCookieHeaderArr) {
    const s = load(target);
    const arr = Array.isArray(setCookieHeaderArr) ? setCookieHeaderArr : [setCookieHeaderArr];
    for (const line of arr) {
        if (!line) continue;
        const parts = String(line).split(';').map(x => x.trim());
        const [kv, ...attrs] = parts;
        const eq = kv.indexOf('=');
        if (eq < 0) continue;
        const name = kv.slice(0, eq);
        const value = kv.slice(eq + 1);
        const opts = {};
        for (const a of attrs) {
            const [k, v = ''] = a.split('=').map(x => x.trim());
            const kl = k.toLowerCase();
            if (kl === 'path') opts.path = v;
            else if (kl === 'domain') opts.domain = v;
            else if (kl === 'secure') opts.secure = true;
            else if (kl === 'httponly') opts.httpOnly = true;
            else if (kl === 'expires') opts.expires = v;
        }
        s.cookies[name] = { value, ...opts };
    }
    return save(s);
}

function setHeader(target, name, value) {
    const s = load(target);
    s.headers[name] = value;
    return save(s);
}

function setToken(target, kind, value) {
    const s = load(target);
    s.tokens[kind] = value;
    if (kind === 'bearer') s.headers['Authorization'] = `Bearer ${value}`;
    else if (kind === 'basic') s.headers['Authorization'] = `Basic ${value}`;
    else if (kind === 'csrf') s.headers['X-CSRF-Token'] = value;
    return save(s);
}

function clear(target) {
    try { fs.unlinkSync(_file(target)); return true; } catch { return false; }
}

function list() {
    try {
        return fs.readdirSync(STORE_DIR).filter(f => f.endsWith('.json')).map(f => {
            const s = JSON.parse(fs.readFileSync(path.join(STORE_DIR, f), 'utf8'));
            return { target: s.target, cookies: Object.keys(s.cookies || {}).length, hasAuth: !!(s.headers?.Authorization), updated: s.updated };
        });
    } catch { return []; }
}

function asCookieHeader(target) {
    const s = load(target);
    return Object.entries(s.cookies || {}).map(([k, v]) => `${k}=${v.value}`).join('; ');
}

function asCurl(target) {
    const s = load(target);
    const parts = [];
    const cookie = asCookieHeader(target);
    if (cookie) parts.push(`-b '${cookie.replace(/'/g, "'\\''")}'`);
    for (const [k, v] of Object.entries(s.headers || {})) {
        parts.push(`-H '${k}: ${String(v).replace(/'/g, "'\\''")}'`);
    }
    return parts.join(' ');
}

function asHttpxHeaders(target) {
    const s = load(target);
    const out = [];
    const cookie = asCookieHeader(target);
    if (cookie) out.push(`Cookie: ${cookie}`);
    for (const [k, v] of Object.entries(s.headers || {})) out.push(`${k}: ${v}`);
    return out;
}

function merge(target, partial = {}) {
    const s = load(target);
    if (partial.cookies) for (const [k, v] of Object.entries(partial.cookies)) s.cookies[k] = typeof v === 'object' ? v : { value: v };
    if (partial.headers) Object.assign(s.headers, partial.headers);
    if (partial.tokens) Object.assign(s.tokens, partial.tokens);
    return save(s);
}

module.exports = { load, save, setCookie, setCookiesFromHeader, setHeader, setToken, clear, list, asCookieHeader, asCurl, asHttpxHeaders, merge };
