// ════════════════════════════════════════════════════════════════
//  🔐 AI CONFIG — Persistance provider + cles API + modeles
//  Stocke dans server/data/ai-config.json. Cles masquees en GET
//  public ; le vrai secret n'est relu que depuis disque.
// ════════════════════════════════════════════════════════════════
const fs = require('fs/promises');
const path = require('path');

const CFG_PATH = path.resolve(__dirname, 'data', 'ai-config.json');

const DEFAULT = {
    active: 'groq',
    providers: {
        groq:      { apiKey: '', models: { reasoning: 'llama-3.3-70b-versatile', cheap: 'llama-3.1-8b-instant' } },
        anthropic: { apiKey: '', models: { reasoning: 'claude-opus-4-7', cheap: 'claude-haiku-4-5-20251001' } },
        openai:    { apiKey: '', models: { reasoning: 'gpt-4o', cheap: 'gpt-4o-mini' }, baseURL: '' },
        google:    { apiKey: '', models: { reasoning: 'gemini-1.5-pro', cheap: 'gemini-1.5-flash' } },
    },
};

let cache = null;

async function load() {
    if (cache) return cache;
    try {
        const raw = await fs.readFile(CFG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        cache = { ...DEFAULT, ...parsed, providers: { ...DEFAULT.providers, ...(parsed.providers || {}) } };
        // Merge manquants
        for (const k of Object.keys(DEFAULT.providers)) {
            cache.providers[k] = { ...DEFAULT.providers[k], ...(cache.providers[k] || {}) };
            cache.providers[k].models = { ...DEFAULT.providers[k].models, ...(cache.providers[k].models || {}) };
        }
    } catch {
        cache = JSON.parse(JSON.stringify(DEFAULT));
    }
    return cache;
}

async function save(cfg) {
    const merged = { ...DEFAULT, ...cfg };
    merged.providers = { ...DEFAULT.providers };
    for (const [k, v] of Object.entries(cfg.providers || {})) {
        merged.providers[k] = {
            ...DEFAULT.providers[k],
            ...(cache?.providers?.[k] || {}),
            ...v,
        };
        merged.providers[k].models = { ...DEFAULT.providers[k].models, ...(v.models || {}) };
    }
    await fs.mkdir(path.dirname(CFG_PATH), { recursive: true });
    await fs.writeFile(CFG_PATH, JSON.stringify(merged, null, 2));
    cache = merged;
    return merged;
}

// Masque cles API pour exposition UI
function maskedView(cfg) {
    const out = JSON.parse(JSON.stringify(cfg));
    for (const p of Object.values(out.providers || {})) {
        if (p.apiKey) {
            const k = p.apiKey;
            p.apiKey = k.length > 12 ? k.slice(0, 6) + '...' + k.slice(-4) : '***';
            p._hasKey = true;
        } else {
            p._hasKey = false;
        }
    }
    return out;
}

function invalidate() { cache = null; }

module.exports = { load, save, maskedView, invalidate, DEFAULT };
