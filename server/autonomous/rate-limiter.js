// ════════════════════════════════════════════════════════════════
//  🚦 ADAPTIVE RATE LIMITER — Detect 429/403/WAF block & backoff
//  Monitore les reponses, ajuste concurrency + delay, tourne UA
//  et liste proxy au besoin. Partage l'etat par host.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '..', 'data', 'rate-limiter.json');
try { fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true }); } catch {}

const UA_POOL = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

const BLOCK_SIGNATURES = [
    { name: 'Cloudflare', re: /cloudflare|cf-ray|attention required|__cf_bm/i },
    { name: 'Akamai', re: /ak_bmsc|reference #18\.|akamai/i },
    { name: 'AWS WAF', re: /aws waf|x-amzn-requestid.*waf/i },
    { name: 'Imperva', re: /incapsula|imperva|incap_ses/i },
    { name: 'F5', re: /bigip|TS[0-9a-f]{8,}=/ },
    { name: 'ModSecurity', re: /mod_security|modsecurity/i },
    { name: 'Sucuri', re: /sucuri|x-sucuri-id/i },
];

let _state = {};
try { if (fs.existsSync(STORE_FILE)) _state = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); } catch {}

function _persist() {
    try { fs.writeFileSync(STORE_FILE, JSON.stringify(_state, null, 2)); } catch {}
}

function _key(target) {
    try { return new URL(String(target).startsWith('http') ? target : `http://${target}`).hostname; } catch { return String(target); }
}

function getState(target) {
    const k = _key(target);
    if (!_state[k]) _state[k] = { host: k, requests: 0, blocked: 0, rate429: 0, rate403: 0, currentDelayMs: 0, concurrency: 10, ua: UA_POOL[0], waf: null };
    return _state[k];
}

function record(target, { status = 0, headers = {}, body = '' } = {}) {
    const s = getState(target);
    s.requests++;
    s.lastStatus = status;
    s.lastAt = Date.now();
    if (status === 429) {
        s.rate429++;
        s.blocked++;
        s.currentDelayMs = Math.min((s.currentDelayMs || 500) * 2, 60000);
        s.concurrency = Math.max(1, Math.floor(s.concurrency / 2));
        s.lastSignal = '429';
    } else if (status === 403) {
        s.rate403++;
        s.blocked++;
        s.currentDelayMs = Math.min((s.currentDelayMs || 1000) * 1.5, 30000);
    } else if (status >= 200 && status < 400) {
        // recovery
        s.currentDelayMs = Math.max(0, Math.floor(s.currentDelayMs * 0.8));
        if (s.concurrency < 10 && s.rate429 === 0) s.concurrency = Math.min(10, s.concurrency + 1);
    }
    // Detect WAF
    const blob = JSON.stringify(headers) + '\n' + String(body).slice(0, 2000);
    for (const sig of BLOCK_SIGNATURES) {
        if (sig.re.test(blob)) { s.waf = sig.name; break; }
    }
    _persist();
    return s;
}

function shouldBackoff(target) {
    const s = getState(target);
    return {
        delayMs: s.currentDelayMs || 0,
        concurrency: s.concurrency,
        ua: s.ua,
        waf: s.waf,
        advice: s.currentDelayMs > 5000 ? 'lower-concurrency-rotate-proxy' : s.currentDelayMs > 0 ? 'throttle' : 'ok',
    };
}

function rotateUa(target) {
    const s = getState(target);
    const idx = Math.floor(Math.random() * UA_POOL.length);
    s.ua = UA_POOL[idx];
    _persist();
    return s.ua;
}

function reset(target) {
    const k = _key(target);
    delete _state[k];
    _persist();
    return { ok: true };
}

function all() {
    return Object.values(_state);
}

async function wait(target) {
    const s = getState(target);
    if (s.currentDelayMs > 0) await new Promise(r => setTimeout(r, s.currentDelayMs));
}

module.exports = { record, shouldBackoff, rotateUa, reset, getState, all, wait, UA_POOL, BLOCK_SIGNATURES };
