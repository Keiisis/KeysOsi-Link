// ════════════════════════════════════════════════════════════════
//  📚 WORDLIST GENERATOR — From mitm flows + JS bundles + wayback
//  Produit un wordlist target-specific pour fuzzing efficace :
//  endpoints, parametres, strings interessants, noms de fichiers.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'wordlists');
try { fs.mkdirSync(OUT_DIR, { recursive: true }); } catch {}

const COMMON_FILTERS = new Set(['http', 'https', 'www', 'localhost', 'api', 'true', 'false', 'null', 'undefined']);

function _uniqSorted(arr) {
    return Array.from(new Set(arr.filter(x => x && typeof x === 'string' && x.length > 1 && x.length < 100))).sort();
}

function extractFromText(text) {
    const out = { endpoints: [], params: [], strings: [], files: [] };
    if (!text) return out;
    const s = String(text);
    // endpoints (chemins URL)
    const epRe = /(?:["'`])(\/[a-zA-Z0-9_\-\.\/]{2,120})(?:["'`])/g;
    let m;
    while ((m = epRe.exec(s)) !== null) out.endpoints.push(m[1]);
    // URLs completes
    const urlRe = /https?:\/\/[a-zA-Z0-9\-\.]+(?:\/[^\s"'<>]*)?/g;
    const urls = s.match(urlRe) || [];
    for (const u of urls) {
        try {
            const p = new URL(u).pathname;
            if (p && p !== '/') out.endpoints.push(p);
        } catch {}
    }
    // params (noms via ?a=1&b=2 ou postForm)
    const paramRe = /[?&]([a-zA-Z_][a-zA-Z0-9_\-]{1,40})=/g;
    while ((m = paramRe.exec(s)) !== null) out.params.push(m[1]);
    // identifiants : cles JSON, noms de variables
    const idRe = /(?:["'`])([a-zA-Z_][a-zA-Z0-9_\-]{2,40})(?:["'`])\s*:/g;
    while ((m = idRe.exec(s)) !== null) {
        if (!COMMON_FILTERS.has(m[1])) out.params.push(m[1]);
    }
    // strings alphanumeriques isoles dans du code
    const strRe = /["'`]([a-zA-Z][a-zA-Z0-9_\-]{3,30})["'`]/g;
    while ((m = strRe.exec(s)) !== null) {
        if (!COMMON_FILTERS.has(m[1])) out.strings.push(m[1]);
    }
    // noms de fichiers
    const fileRe = /\b([a-zA-Z0-9_\-]{2,40}\.(?:php|aspx?|jsp|js|json|xml|yml|yaml|env|bak|sql|zip|tar|gz|log|conf|config|md|txt|html?))\b/g;
    while ((m = fileRe.exec(s)) !== null) out.files.push(m[1]);
    return out;
}

function _mergeInto(agg, extracted) {
    for (const k of ['endpoints', 'params', 'strings', 'files']) {
        agg[k] = agg[k] || [];
        agg[k].push(...(extracted[k] || []));
    }
}

async function buildFromFlows(flows = []) {
    const agg = {};
    for (const f of flows) {
        try {
            _mergeInto(agg, extractFromText(f.request?.url || f.url || ''));
            _mergeInto(agg, extractFromText(f.request?.body || ''));
            _mergeInto(agg, extractFromText(f.response?.body || ''));
        } catch {}
    }
    return {
        endpoints: _uniqSorted(agg.endpoints || []),
        params: _uniqSorted(agg.params || []),
        strings: _uniqSorted(agg.strings || []),
        files: _uniqSorted(agg.files || []),
    };
}

async function buildFromJsBundle(url) {
    try {
        const r = await fetch(url, { headers: { 'User-Agent': 'KeysOsi-Link/1.0' } });
        const body = await r.text();
        const ext = extractFromText(body);
        // Tente le sourcemap
        const mapMatch = body.match(/sourceMappingURL=([^\s*]+)/);
        if (mapMatch) {
            try {
                const mapUrl = new URL(mapMatch[1], url).toString();
                const mr = await fetch(mapUrl);
                if (mr.ok) {
                    const smap = await mr.text();
                    _mergeInto(ext, extractFromText(smap));
                }
            } catch {}
        }
        return {
            url,
            endpoints: _uniqSorted(ext.endpoints),
            params: _uniqSorted(ext.params),
            strings: _uniqSorted(ext.strings),
            files: _uniqSorted(ext.files),
        };
    } catch (e) {
        return { url, error: e.message };
    }
}

async function buildFromWayback(domain, limit = 1000) {
    try {
        const url = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&fl=original&collapse=urlkey&limit=${limit}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`wayback ${r.status}`);
        const rows = await r.json();
        const urls = rows.slice(1).map(row => row[0]).filter(Boolean);
        const agg = {};
        for (const u of urls) {
            try {
                const up = new URL(u);
                _mergeInto(agg, extractFromText(up.pathname + up.search));
            } catch {}
        }
        return {
            domain,
            endpoints: _uniqSorted(agg.endpoints || []),
            params: _uniqSorted(agg.params || []),
            files: _uniqSorted(agg.files || []),
            totalUrls: urls.length,
        };
    } catch (e) {
        return { domain, error: e.message };
    }
}

function save(name, words) {
    const p = path.join(OUT_DIR, `${name}.txt`);
    fs.writeFileSync(p, words.join('\n'));
    return { ok: true, path: p, count: words.length };
}

function saveAll(target, bundle) {
    const key = String(target).replace(/[^a-z0-9.-]/gi, '_').slice(0, 64);
    const files = {};
    for (const kind of ['endpoints', 'params', 'strings', 'files']) {
        if (bundle[kind]?.length) {
            const r = save(`${key}-${kind}`, bundle[kind]);
            files[kind] = r.path;
        }
    }
    return files;
}

module.exports = { extractFromText, buildFromFlows, buildFromJsBundle, buildFromWayback, save, saveAll };
