// ════════════════════════════════════════════════════════════════
//  📸 SCREENSHOT DVR — Timestamped visual record of target pages
//  Capture via Chrome (extension API) ou headless puppeteer.
//  Indexe + hash perceptuel simple pour detecter changements.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DVR_DIR = path.join(__dirname, '..', 'data', 'screenshots');
const INDEX_FILE = path.join(DVR_DIR, 'index.json');
try { fs.mkdirSync(DVR_DIR, { recursive: true }); } catch {}

let _index = [];
try { if (fs.existsSync(INDEX_FILE)) _index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch {}

function _persist() {
    try { fs.writeFileSync(INDEX_FILE, JSON.stringify(_index, null, 2)); } catch {}
}

function _key(target) {
    return String(target).replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]/gi, '_').slice(0, 80);
}

// dataUrl : "data:image/png;base64,XXXX"
function save({ target, dataUrl, note = '' }) {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return { ok: false, error: 'invalid-data-url' };
    const b64 = dataUrl.split(',')[1];
    if (!b64) return { ok: false, error: 'no-base64' };
    const buf = Buffer.from(b64, 'base64');
    const stamp = Date.now();
    const key = _key(target);
    const file = `${key}-${stamp}.png`;
    const full = path.join(DVR_DIR, file);
    fs.writeFileSync(full, buf);
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    const entry = { id: `${key}-${stamp}`, target, file, fullPath: full, size: buf.length, hash, ts: stamp, note };
    _index.push(entry);
    if (_index.length > 5000) _index = _index.slice(-4000);
    _persist();
    return { ok: true, ...entry };
}

async function captureUrl(url, opts = {}) {
    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setViewport({ width: opts.width || 1366, height: opts.height || 768 });
        await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeoutMs || 30000 });
        if (opts.waitFor) await new Promise(r => setTimeout(r, opts.waitFor));
        const buf = await page.screenshot({ fullPage: !!opts.fullPage });
        await browser.close();
        return save({ target: url, dataUrl: `data:image/png;base64,${buf.toString('base64')}`, note: opts.note || '' });
    } catch (e) {
        return { ok: false, error: `puppeteer-missing: ${e.message}` };
    }
}

function list({ target = null, limit = 100 } = {}) {
    let out = _index;
    if (target) {
        const k = _key(target);
        out = out.filter(e => e.id.startsWith(k));
    }
    return out.slice(-limit).sort((a, b) => b.ts - a.ts);
}

function diff(idA, idB) {
    const a = _index.find(e => e.id === idA);
    const b = _index.find(e => e.id === idB);
    if (!a || !b) return { ok: false, error: 'not-found' };
    return {
        ok: true,
        a: { target: a.target, ts: a.ts, hash: a.hash, size: a.size },
        b: { target: b.target, ts: b.ts, hash: b.hash, size: b.size },
        changed: a.hash !== b.hash,
        sizeDelta: b.size - a.size,
    };
}

function latest(target) {
    const k = _key(target);
    return [..._index].reverse().find(e => e.id.startsWith(k));
}

function remove(id) {
    const idx = _index.findIndex(e => e.id === id);
    if (idx < 0) return { ok: false, error: 'not-found' };
    try { fs.unlinkSync(_index[idx].fullPath); } catch {}
    _index.splice(idx, 1);
    _persist();
    return { ok: true };
}

module.exports = { save, captureUrl, list, diff, latest, remove };
