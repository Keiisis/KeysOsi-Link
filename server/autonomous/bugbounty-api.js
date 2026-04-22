// ════════════════════════════════════════════════════════════════
//  🏅 BUG BOUNTY API — HackerOne / Bugcrowd / Intigriti scope pull
//  Recupere scope autorise pour eviter toute sortie de perimetre.
//  Clefs API optionnelles ; fallback sur endpoints publics.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', 'data', 'bugbounty');
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

const H1_USERNAME = process.env.HACKERONE_USERNAME || '';
const H1_TOKEN = process.env.HACKERONE_TOKEN || '';
const BUGCROWD_TOKEN = process.env.BUGCROWD_TOKEN || '';
const INTIGRITI_TOKEN = process.env.INTIGRITI_TOKEN || '';

function _cache(platform, handle) {
    return path.join(CACHE_DIR, `${platform}-${String(handle).replace(/[^a-z0-9-]/gi, '_')}.json`);
}

async function hackeroneProgram(handle) {
    if (!H1_USERNAME || !H1_TOKEN) return { ok: false, error: 'no-h1-creds' };
    try {
        const auth = Buffer.from(`${H1_USERNAME}:${H1_TOKEN}`).toString('base64');
        const r = await fetch(`https://api.hackerone.com/v1/hackers/programs/${handle}`, {
            headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
        });
        if (!r.ok) return { ok: false, error: `h1-${r.status}` };
        const j = await r.json();
        const scope = (j.relationships?.structured_scopes?.data || []).map(s => ({
            identifier: s.attributes?.asset_identifier,
            type: s.attributes?.asset_type,
            eligibility: s.attributes?.eligible_for_bounty,
            severity: s.attributes?.max_severity,
        }));
        const result = {
            ok: true,
            platform: 'hackerone',
            handle,
            name: j.attributes?.name,
            scope: scope.filter(s => s.eligibility),
            outOfScope: scope.filter(s => !s.eligibility),
        };
        try { fs.writeFileSync(_cache('h1', handle), JSON.stringify(result, null, 2)); } catch {}
        return result;
    } catch (e) { return { ok: false, error: e.message }; }
}

async function bugcrowdProgram(handle) {
    try {
        const url = `https://bugcrowd.com/${handle}/target_groups.json`;
        const headers = BUGCROWD_TOKEN ? { Authorization: `Token ${BUGCROWD_TOKEN}` } : {};
        const r = await fetch(url, { headers });
        if (!r.ok) return { ok: false, error: `bugcrowd-${r.status}` };
        const j = await r.json();
        const targets = (j.groups || j || []).flatMap(g => (g.targets || []).map(t => ({
            name: t.name,
            category: t.category,
            in_scope: t.in_scope !== false,
            uri: t.uri,
        })));
        return { ok: true, platform: 'bugcrowd', handle, scope: targets.filter(t => t.in_scope), outOfScope: targets.filter(t => !t.in_scope) };
    } catch (e) { return { ok: false, error: e.message }; }
}

async function intigritiProgram(handle) {
    if (!INTIGRITI_TOKEN) return { ok: false, error: 'no-intigriti-token' };
    try {
        const r = await fetch(`https://api.intigriti.com/external/researcher/v1/programs/${handle}`, {
            headers: { Authorization: `Bearer ${INTIGRITI_TOKEN}` },
        });
        if (!r.ok) return { ok: false, error: `intigriti-${r.status}` };
        const j = await r.json();
        return {
            ok: true,
            platform: 'intigriti',
            handle,
            name: j.name,
            scope: (j.domains || []).map(d => ({ identifier: d.endpoint, type: d.type, tier: d.tier })),
            outOfScope: (j.outOfScope || []).map(d => ({ identifier: d.endpoint })),
        };
    } catch (e) { return { ok: false, error: e.message }; }
}

// Verifie qu'un target est bien dans le scope d'un programme
function isInScope(target, scope = [], outOfScope = []) {
    const norm = String(target).toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    const match = entry => {
        const id = String(entry.identifier || entry.uri || entry.name || '').toLowerCase();
        if (!id) return false;
        if (id === norm) return true;
        if (id.startsWith('*.')) {
            const domain = id.slice(2);
            return norm === domain || norm.endsWith('.' + domain);
        }
        if (id.startsWith('http')) {
            try { return new URL(id).hostname === norm; } catch { return false; }
        }
        return norm.endsWith(id) || id.endsWith(norm);
    };
    const oo = outOfScope.some(match);
    if (oo) return { inScope: false, reason: 'out-of-scope' };
    const ok = scope.some(match);
    return { inScope: ok, reason: ok ? 'matched' : 'not-listed' };
}

function cached(platform, handle) {
    try {
        const p = _cache(platform, handle);
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
    return null;
}

async function getProgram(platform, handle) {
    const c = cached(platform, handle);
    if (c) return { ...c, cached: true };
    if (platform === 'hackerone' || platform === 'h1') return hackeroneProgram(handle);
    if (platform === 'bugcrowd') return bugcrowdProgram(handle);
    if (platform === 'intigriti') return intigritiProgram(handle);
    return { ok: false, error: `unknown-platform:${platform}` };
}

module.exports = { hackeroneProgram, bugcrowdProgram, intigritiProgram, isInScope, getProgram };
