// ════════════════════════════════════════════════════════════════
//  📋 ENGAGEMENTS — scope + findings + notes + journal
//  Persistance : JSON plat dans data/engagements.json
// ════════════════════════════════════════════════════════════════
const fs = require('fs/promises');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, 'data', 'engagements.json');

async function load() {
    try {
        const raw = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return { active: null, engagements: [] };
    }
}

async function save(data) {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

function slugify(s) {
    return String(s).toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 50) || 'engagement';
}

async function list() {
    const d = await load();
    return { active: d.active, engagements: d.engagements.map(summary) };
}

function summary(e) {
    return {
        slug: e.slug, name: e.name, kind: e.kind,
        scope: e.scope, findings: e.findings.length,
        activity: e.activity.length, createdAt: e.createdAt,
    };
}

async function get(slug) {
    const d = await load();
    return d.engagements.find(e => e.slug === slug) || null;
}

async function getActive() {
    const d = await load();
    if (!d.active) return null;
    return d.engagements.find(e => e.slug === d.active) || null;
}

async function setActive(slug) {
    const d = await load();
    if (slug && !d.engagements.find(e => e.slug === slug)) {
        throw new Error(`Engagement inconnu : ${slug}`);
    }
    d.active = slug || null;
    await save(d);
    return d.active;
}

async function create({ name, kind = 'ctf', scope = [], notes = '' }) {
    if (!name) throw new Error('Nom requis');
    const d = await load();
    let slug = slugify(name);
    let i = 1;
    while (d.engagements.find(e => e.slug === slug)) slug = `${slugify(name)}-${++i}`;
    const eng = {
        slug, name, kind,
        scope: Array.isArray(scope) ? scope : String(scope).split(/[\s,]+/).filter(Boolean),
        notes, findings: [], activity: [],
        createdAt: new Date().toISOString(),
    };
    d.engagements.push(eng);
    d.active = slug;
    await save(d);
    return eng;
}

async function update(slug, patch) {
    const d = await load();
    const e = d.engagements.find(x => x.slug === slug);
    if (!e) throw new Error('Engagement introuvable');
    const allowed = ['name', 'kind', 'scope', 'notes'];
    for (const k of allowed) if (k in patch) e[k] = patch[k];
    await save(d);
    return e;
}

async function remove(slug) {
    const d = await load();
    d.engagements = d.engagements.filter(e => e.slug !== slug);
    if (d.active === slug) d.active = null;
    await save(d);
    return { success: true };
}

async function addFinding(slug, { title, severity = 'info', description = '', evidence = '' }) {
    if (!title) throw new Error('Titre requis');
    const d = await load();
    const e = d.engagements.find(x => x.slug === slug);
    if (!e) throw new Error('Engagement introuvable');
    const finding = {
        id: Date.now().toString(36),
        title, severity, description, evidence,
        createdAt: new Date().toISOString(),
    };
    e.findings.push(finding);
    await save(d);
    return finding;
}

async function removeFinding(slug, findingId) {
    const d = await load();
    const e = d.engagements.find(x => x.slug === slug);
    if (!e) throw new Error('Engagement introuvable');
    e.findings = e.findings.filter(f => f.id !== findingId);
    await save(d);
    return { success: true };
}

async function appendActivity(slug, entry) {
    const d = await load();
    const e = d.engagements.find(x => x.slug === slug);
    if (!e) return;
    e.activity.push({ ...entry, at: new Date().toISOString() });
    if (e.activity.length > 500) e.activity = e.activity.slice(-500);
    await save(d);
}

// ── Scope check (optionnel, pour l'UI) ──
function isInScope(engagement, urlOrHost) {
    if (!engagement || !engagement.scope?.length) return null; // inconnu
    let host = urlOrHost;
    try { host = new URL(/^https?:/.test(urlOrHost) ? urlOrHost : `http://${urlOrHost}`).hostname; } catch {}
    return engagement.scope.some(s => {
        const pat = s.trim().toLowerCase();
        if (!pat) return false;
        if (pat.startsWith('*.')) return host.endsWith(pat.slice(1));
        return host === pat || host.endsWith('.' + pat);
    });
}

// ── Rapport Markdown ──
async function generateReport(slug) {
    const e = await get(slug);
    if (!e) throw new Error('Engagement introuvable');
    const out = [];
    out.push(`# Rapport — ${e.name}`);
    out.push('');
    out.push(`- **Type** : ${e.kind}`);
    out.push(`- **Cree le** : ${e.createdAt}`);
    out.push(`- **Scope** :`);
    for (const s of e.scope.length ? e.scope : ['_(aucun)_']) out.push(`  - \`${s}\``);
    out.push('');
    out.push('## Notes');
    out.push(e.notes || '_(aucune note)_');
    out.push('');
    out.push(`## Findings (${e.findings.length})`);
    if (!e.findings.length) out.push('_(aucun finding)_');
    for (const f of e.findings) {
        out.push('');
        out.push(`### [${f.severity.toUpperCase()}] ${f.title}`);
        out.push(`_${f.createdAt}_`);
        out.push('');
        out.push(f.description || '_(sans description)_');
        if (f.evidence) {
            out.push('');
            out.push('**Preuve :**');
            out.push('```');
            out.push(f.evidence);
            out.push('```');
        }
    }
    out.push('');
    out.push(`## Journal d'activite (${e.activity.length} entrees)`);
    for (const a of e.activity.slice(-100)) {
        const tgt = a.target ? ` \`${a.target}\`` : '';
        const sum = a.summary ? ` → ${a.summary}` : '';
        out.push(`- \`${a.at}\` — **${a.kind}**${tgt}${sum}`);
    }
    return out.join('\n');
}

module.exports = {
    list, get, getActive, setActive,
    create, update, remove,
    addFinding, removeFinding,
    appendActivity, isInScope,
    generateReport,
};
