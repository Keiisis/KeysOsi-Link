// ════════════════════════════════════════════════════════════════
//  🧠 ENGAGEMENT MEMORY — KB persistante par engagement + patterns
//   hosts : { [host] : { tech, ports, endpoints, vulns, ... } }
//   decisions : historique des actions de l'agent (traçabilite)
//   patterns : regles apprises (global, cross-engagement)
// ════════════════════════════════════════════════════════════════
const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data', 'memory');
const PATTERNS_FILE = path.join(DATA_DIR, '_patterns.json');

async function ensureDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

function fileFor(slug) {
    const safe = String(slug || 'default').replace(/[^a-z0-9._-]/gi, '_');
    return path.join(DATA_DIR, `${safe}.json`);
}

async function load(slug) {
    await ensureDir();
    try {
        const raw = await fs.readFile(fileFor(slug), 'utf8');
        return JSON.parse(raw);
    } catch {
        return {
            slug: slug || 'default',
            hosts: {},
            decisions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
}

async function save(slug, data) {
    await ensureDir();
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(fileFor(slug), JSON.stringify(data, null, 2));
}

async function summary(slug) {
    const mem = await load(slug);
    const hosts = Object.entries(mem.hosts || {}).map(([h, m]) => ({
        host: h,
        tech: (m.tech || []).slice(0, 5),
        ports: Object.keys(m.ports || {}).length,
        endpoints: (m.endpoints || []).length,
        vulns: (m.vulns || []).length,
        waf: m.waf,
    }));
    return {
        slug: mem.slug,
        hosts,
        decisions: (mem.decisions || []).length,
        updatedAt: mem.updatedAt,
    };
}

async function recordDecision(slug, decision) {
    const mem = await load(slug);
    mem.decisions = mem.decisions || [];
    mem.decisions.push({ ...decision, at: new Date().toISOString() });
    if (mem.decisions.length > 500) mem.decisions = mem.decisions.slice(-500);
    await save(slug, mem);
}

// ── Patterns appris (globaux) ──
async function loadPatterns() {
    try {
        const raw = await fs.readFile(PATTERNS_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { patterns: [] };
    }
}

async function addPattern(pattern) {
    await ensureDir();
    const p = await loadPatterns();
    p.patterns = p.patterns || [];
    p.patterns.push({
        ...pattern,
        id: Date.now().toString(36),
        at: new Date().toISOString(),
    });
    if (p.patterns.length > 200) p.patterns = p.patterns.slice(-200);
    await fs.writeFile(PATTERNS_FILE, JSON.stringify(p, null, 2));
}

async function getRelevantPatterns(context) {
    const p = await loadPatterns();
    const ctxStr = JSON.stringify(context).toLowerCase();
    return (p.patterns || []).filter(pat => {
        const tags = (pat.tags || []).map(t => t.toLowerCase());
        return tags.some(t => ctxStr.includes(t));
    }).slice(-10);
}

module.exports = {
    load, save, summary,
    recordDecision,
    addPattern, getRelevantPatterns,
};
