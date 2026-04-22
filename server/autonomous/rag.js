// ════════════════════════════════════════════════════════════════
//  🧭 RAG — Hybrid dense (ollama) + BM25 retrieval avec RRF fusion
//  Indexe : hosts, findings, patterns des engagements precedents.
//  - Mode HYBRID (default) : embeddings nomic-embed-text via ollama
//    + BM25, fusion par Reciprocal Rank Fusion.
//  - Mode BM25-only : fallback si ollama indisponible.
//  Cache disque des embeddings (hash SHA1 → vecteur).
// ════════════════════════════════════════════════════════════════
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const DATA_DIR = path.resolve(__dirname, '..', 'data', 'memory');
const ENG_FILE = path.resolve(__dirname, '..', 'data', 'engagements.json');
const EMB_CACHE = path.resolve(__dirname, '..', 'data', 'embeddings.json');
const CACHE_TTL_MS = 30 * 1000;

const OLLAMA_HOST = process.env.AURA_OLLAMA_HOST || 'http://127.0.0.1:11434';
const EMBED_MODEL = process.env.AURA_EMBED_MODEL || 'nomic-embed-text';
const EMBED_TIMEOUT_MS = 8000;

function tokenize(s) {
    return String(s || '').toLowerCase()
        .replace(/[^a-z0-9\-_.:/]+/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 1 && t.length < 48);
}

function hash(s) {
    return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

// ─── Ollama embeddings ────────────────────────────────────────
let ollamaAvailable = null;
let lastOllamaCheck = 0;

function _httpPost(url, payload, timeoutMs = EMBED_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: timeoutMs,
        }, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(new Error('ollama-timeout')); });
        req.write(body);
        req.end();
    });
}

async function checkOllama() {
    const now = Date.now();
    if (ollamaAvailable !== null && (now - lastOllamaCheck) < 60_000) return ollamaAvailable;
    lastOllamaCheck = now;
    try {
        const r = await _httpPost(`${OLLAMA_HOST}/api/embeddings`, { model: EMBED_MODEL, prompt: 'ping' }, 3000);
        ollamaAvailable = r.status === 200 && Array.isArray(r.body?.embedding);
    } catch {
        ollamaAvailable = false;
    }
    return ollamaAvailable;
}

async function embed(text) {
    try {
        const r = await _httpPost(`${OLLAMA_HOST}/api/embeddings`, { model: EMBED_MODEL, prompt: text });
        if (r.status === 200 && Array.isArray(r.body?.embedding)) return r.body.embedding;
    } catch {}
    return null;
}

// ─── Embeddings cache disque ──────────────────────────────────
let embCache = null;

async function _loadEmbCache() {
    if (embCache) return embCache;
    try {
        embCache = JSON.parse(await fs.readFile(EMB_CACHE, 'utf8'));
    } catch {
        embCache = { model: EMBED_MODEL, entries: {} };
    }
    if (embCache.model !== EMBED_MODEL) {
        // modele change → invalider
        embCache = { model: EMBED_MODEL, entries: {} };
    }
    return embCache;
}

async function _saveEmbCache() {
    if (!embCache) return;
    try {
        await fs.mkdir(path.dirname(EMB_CACHE), { recursive: true });
        await fs.writeFile(EMB_CACHE, JSON.stringify(embCache));
    } catch {}
}

async function getOrEmbed(text) {
    const c = await _loadEmbCache();
    const h = hash(text);
    if (c.entries[h]) return c.entries[h];
    const vec = await embed(text);
    if (!vec) return null;
    c.entries[h] = vec;
    return vec;
}

function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom ? dot / denom : 0;
}

// ─── Corpus build ─────────────────────────────────────────────
async function buildCorpus() {
    const docs = [];

    try {
        const files = await fs.readdir(DATA_DIR).catch(() => []);
        for (const f of files.filter(x => x.endsWith('.json') && !x.startsWith('_') && x !== 'embeddings.json')) {
            try {
                const mem = JSON.parse(await fs.readFile(path.join(DATA_DIR, f), 'utf8'));
                for (const [host, h] of Object.entries(mem.hosts || {})) {
                    const vulnsTxt = (h.vulns || []).map(v => `${v.severity || ''} ${v.name || ''} ${v.id || ''} ${v.title || ''}`).join(' ');
                    const text = [
                        host,
                        (h.tech || []).join(' '),
                        Object.entries(h.ports || {}).map(([p, s]) => `${p}/${s}`).join(' '),
                        vulnsTxt,
                        h.waf ? `waf:${h.waf}` : '',
                        (h.subdomains || []).slice(0, 20).join(' '),
                    ].join(' ');
                    docs.push({
                        source: `engagement:${mem.slug}:host:${host}`,
                        text,
                        meta: { kind: 'host', engagement: mem.slug, host, tech: h.tech || [], vulns: h.vulns || [], waf: h.waf },
                    });
                }
            } catch {}
        }
    } catch {}

    try {
        const p = JSON.parse(await fs.readFile(path.join(DATA_DIR, '_patterns.json'), 'utf8'));
        for (const pat of p.patterns || []) {
            docs.push({
                source: `pattern:${pat.id}`,
                text: `${pat.rule || ''} ${(pat.tags || []).join(' ')}`,
                meta: { kind: 'pattern', rule: pat.rule, tags: pat.tags || [] },
            });
        }
    } catch {}

    try {
        const eng = JSON.parse(await fs.readFile(ENG_FILE, 'utf8'));
        for (const e of eng.engagements || []) {
            for (const f of e.findings || []) {
                docs.push({
                    source: `finding:${e.slug}:${f.id}`,
                    text: `${f.severity || ''} ${f.title || ''} ${f.description || ''} ${f.evidence || ''}`,
                    meta: { kind: 'finding', engagement: e.slug, severity: f.severity, title: f.title },
                });
            }
        }
    } catch {}

    return docs;
}

// ─── BM25 ranker ──────────────────────────────────────────────
function bm25(docs, qTokens, { k1 = 1.5, b = 0.75 } = {}) {
    const N = docs.length || 1;
    const avgDL = docs.reduce((s, d) => s + d._tokens.length, 0) / N || 1;
    const df = new Map();
    for (const d of docs) {
        for (const t of new Set(d._tokens)) df.set(t, (df.get(t) || 0) + 1);
    }
    const idf = (t) => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));

    return docs.map(d => {
        const tf = Object.create(null);
        for (const t of d._tokens) tf[t] = (tf[t] || 0) + 1;
        let score = 0;
        const dl = d._tokens.length || 1;
        for (const q of qTokens) {
            const f = tf[q] || 0;
            if (!f) continue;
            score += idf(q) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * dl / avgDL));
        }
        return { ...d, _bm25: score };
    });
}

// ─── Corpus cache ─────────────────────────────────────────────
let CACHE = { corpus: null, ts: 0, embedded: false };

async function getCorpus({ force = false, tryEmbed = true } = {}) {
    const now = Date.now();
    if (!force && CACHE.corpus && (now - CACHE.ts) < CACHE_TTL_MS) return CACHE.corpus;
    const docs = await buildCorpus();
    for (const d of docs) d._tokens = tokenize(d.text);

    let embedded = false;
    if (tryEmbed && await checkOllama()) {
        let changed = false;
        await _loadEmbCache();
        for (const d of docs) {
            const h = hash(d.text);
            if (embCache.entries[h]) {
                d._vec = embCache.entries[h];
            } else {
                const v = await embed(d.text);
                if (v) {
                    d._vec = v;
                    embCache.entries[h] = v;
                    changed = true;
                }
            }
        }
        embedded = docs.some(d => d._vec);
        if (changed) await _saveEmbCache();
    }

    CACHE = { corpus: docs, ts: now, embedded };
    return docs;
}

// Reciprocal Rank Fusion : combine rankings BM25 + dense
function rrfFuse(rankings, { k = 60 } = {}) {
    const scores = new Map();
    for (const ranking of rankings) {
        ranking.forEach((doc, idx) => {
            const key = doc.source;
            scores.set(key, (scores.get(key) || 0) + 1 / (k + idx + 1));
        });
    }
    return scores;
}

async function search(query, {
    topK = 5,
    excludeEngagement = null,
    kinds = null,
    mode = 'hybrid',  // 'hybrid' | 'bm25' | 'dense'
} = {}) {
    const docs = await getCorpus({ tryEmbed: mode !== 'bm25' });
    if (!docs.length) return [];
    const qTokens = tokenize(query);
    if (!qTokens.length) return [];

    let pool = docs.filter(d => !excludeEngagement || d.meta.engagement !== excludeEngagement);
    if (kinds?.length) pool = pool.filter(d => kinds.includes(d.meta.kind));
    if (!pool.length) return [];

    // BM25
    const bm25Ranked = bm25(pool, qTokens).sort((a, b) => b._bm25 - a._bm25).filter(d => d._bm25 > 0);

    let finalRanked;
    if (mode === 'bm25' || !CACHE.embedded) {
        finalRanked = bm25Ranked.map(d => ({ ...d, _score: d._bm25 }));
    } else {
        // Dense : embed query, cosine avec docs
        const qVec = await getOrEmbed(query);
        if (!qVec) {
            finalRanked = bm25Ranked.map(d => ({ ...d, _score: d._bm25 }));
        } else {
            const denseRanked = pool
                .filter(d => d._vec)
                .map(d => ({ ...d, _cos: cosine(qVec, d._vec) }))
                .sort((a, b) => b._cos - a._cos)
                .filter(d => d._cos > 0.15); // seuil

            if (mode === 'dense') {
                finalRanked = denseRanked.map(d => ({ ...d, _score: d._cos }));
            } else {
                // HYBRID via RRF
                const rrf = rrfFuse([bm25Ranked, denseRanked]);
                const byKey = new Map();
                for (const d of pool) byKey.set(d.source, d);
                finalRanked = Array.from(rrf.entries())
                    .map(([key, score]) => ({ ...byKey.get(key), _score: score, _mode: 'hybrid' }))
                    .sort((a, b) => b._score - a._score);
            }
        }
    }

    return finalRanked.slice(0, topK).map(d => ({
        source: d.source,
        score: +d._score.toFixed(4),
        text: d.text.slice(0, 300),
        meta: d.meta,
        mode: d._mode || mode,
    }));
}

async function briefFor({ target, goal, hostMem, engagementSlug }) {
    const parts = [];
    if (target) parts.push(target);
    if (goal) parts.push(goal);
    if (hostMem?.tech) parts.push(...hostMem.tech);
    if (hostMem?.waf) parts.push(hostMem.waf);
    const q = parts.join(' ');
    if (!q.trim()) return '';
    const results = await search(q, { topK: 5, excludeEngagement: engagementSlug });
    if (!results.length) return '';
    return results
        .map(r => `• [${r.meta.kind}${r.meta.engagement ? '/' + r.meta.engagement : ''}] ${r.text.slice(0, 180)}`)
        .join('\n');
}

function invalidate() {
    CACHE = { corpus: null, ts: 0, embedded: false };
    ollamaAvailable = null;
}

async function stats() {
    const docs = await getCorpus();
    return {
        docs: docs.length,
        by_kind: docs.reduce((a, d) => { a[d.meta.kind] = (a[d.meta.kind] || 0) + 1; return a; }, {}),
        embeddings: docs.filter(d => d._vec).length,
        ollama: await checkOllama(),
        embed_model: EMBED_MODEL,
        mode: CACHE.embedded ? 'hybrid' : 'bm25-only',
    };
}

module.exports = { search, briefFor, getCorpus, invalidate, stats, checkOllama };
