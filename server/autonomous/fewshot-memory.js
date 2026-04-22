// ════════════════════════════════════════════════════════════════
//  🧠 FEW-SHOT MEMORY — Successful exploit chains as RAG examples
//  Stocke les kill chains prouvees, les indexe par tech fingerprint
//  + impact. Permet au planner de s'inspirer d'exploits passes.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_DIR = path.join(__dirname, '..', 'data', 'fewshot');
const INDEX_FILE = path.join(STORE_DIR, 'index.json');
try { fs.mkdirSync(STORE_DIR, { recursive: true }); } catch {}

let _index = [];
try { if (fs.existsSync(INDEX_FILE)) _index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch {}

function _persist() {
    try { fs.writeFileSync(INDEX_FILE, JSON.stringify(_index, null, 2)); } catch {}
}

function _normalize(arr) {
    return [...new Set((arr || []).map(x => String(x).toLowerCase().trim()).filter(Boolean))];
}

function _jaccard(a, b) {
    const A = new Set(a), B = new Set(b);
    if (A.size === 0 && B.size === 0) return 0;
    let inter = 0;
    for (const x of A) if (B.has(x)) inter++;
    return inter / (A.size + B.size - inter);
}

function record({ target, goal, chain, knowledge, impact, proven, rating = null }) {
    if (!proven) return { ok: false, reason: 'only-successful-chains-stored' };
    if (!chain || !chain.nodes?.length) return { ok: false, reason: 'empty-chain' };
    const tech = _normalize(knowledge?.hosts?.[target]?.tech || knowledge?.tech || []);
    const ports = _normalize(Object.keys(knowledge?.hosts?.[target]?.ports || {}));
    const hostMem = knowledge?.hosts?.[target] || {};
    const entry = {
        id: crypto.randomBytes(6).toString('hex'),
        ts: Date.now(),
        target,
        goal: goal || '',
        impact: impact || chain.impact || '',
        tech,
        ports,
        waf: hostMem.waf || null,
        chain: {
            summary: chain.summary,
            reason: chain.reason,
            nodes: (chain.nodes || []).map(n => ({ tool: n.tool, action: n.action, args: n.args, captures: n.captures })),
        },
        rating,
    };
    const p = path.join(STORE_DIR, `${entry.id}.json`);
    fs.writeFileSync(p, JSON.stringify(entry, null, 2));
    _index.push(entry);
    if (_index.length > 1000) _index = _index.slice(-800);
    _persist();
    return { ok: true, id: entry.id };
}

function search({ tech = [], ports = [], goal = '', waf = null, limit = 5 }) {
    const t = _normalize(tech);
    const p = _normalize(ports);
    const scored = _index.map(e => {
        const techScore = _jaccard(t, e.tech || []);
        const portScore = _jaccard(p, e.ports || []);
        const wafBonus = waf && e.waf && waf.toLowerCase() === e.waf.toLowerCase() ? 0.15 : 0;
        const goalBonus = goal && e.goal.toLowerCase().includes(goal.toLowerCase().split(' ')[0]) ? 0.1 : 0;
        const rating = e.rating ? (e.rating / 10) * 0.1 : 0;
        const score = techScore * 0.5 + portScore * 0.25 + wafBonus + goalBonus + rating;
        return { entry: e, score };
    });
    return scored
        .filter(s => s.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => ({ score: Number(s.score.toFixed(3)), ...s.entry }));
}

function asPromptExamples(matches) {
    if (!matches?.length) return '';
    let out = '# Exemples de chaines qui ont fonctionne sur des cibles similaires\n\n';
    matches.forEach((m, i) => {
        out += `## Exemple ${i + 1} (${m.impact})\n`;
        out += `Tech: ${m.tech.join(', ')} | Ports: ${m.ports.join(', ')}\n`;
        out += `Resume: ${m.chain.summary || ''}\n`;
        out += 'Etapes:\n';
        m.chain.nodes.forEach((n, idx) => {
            out += `  ${idx + 1}. [${n.tool}] ${n.action}\n`;
        });
        out += '\n';
    });
    return out;
}

function rate(id, rating) {
    const e = _index.find(x => x.id === id);
    if (!e) return { ok: false, error: 'not-found' };
    e.rating = Math.max(0, Math.min(10, rating));
    _persist();
    return { ok: true };
}

function all() { return _index; }

function remove(id) {
    const idx = _index.findIndex(e => e.id === id);
    if (idx < 0) return { ok: false, error: 'not-found' };
    try { fs.unlinkSync(path.join(STORE_DIR, `${id}.json`)); } catch {}
    _index.splice(idx, 1);
    _persist();
    return { ok: true };
}

module.exports = { record, search, asPromptExamples, rate, all, remove };
