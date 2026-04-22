// ════════════════════════════════════════════════════════════════
//  🛰️ OSINT GATHERER — Passive recon sans toucher la cible
//  crt.sh (subs via CT logs), DNSDumpster, Shodan, Censys, HIBP,
//  theHarvester-compat. Les clefs API sont dans env ou ai-config.
// ════════════════════════════════════════════════════════════════

const SHODAN_KEY = process.env.SHODAN_API_KEY || '';
const CENSYS_ID = process.env.CENSYS_API_ID || '';
const CENSYS_SECRET = process.env.CENSYS_API_SECRET || '';
const HIBP_KEY = process.env.HIBP_API_KEY || '';
const VT_KEY = process.env.VT_API_KEY || '';

async function crtSh(domain) {
    try {
        const url = `https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`;
        const r = await fetch(url, { headers: { 'User-Agent': 'KeysOsi-Link/1.0' } });
        if (!r.ok) return { ok: false, error: `crt.sh-${r.status}` };
        const j = await r.json();
        const subs = new Set();
        for (const row of j) {
            const name = row.name_value || row.common_name || '';
            for (const s of String(name).split('\n')) {
                const clean = s.trim().toLowerCase().replace(/^\*\./, '');
                if (clean && !clean.includes(' ')) subs.add(clean);
            }
        }
        return { ok: true, domain, count: subs.size, subdomains: [...subs].sort() };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function shodanHost(ip) {
    if (!SHODAN_KEY) return { ok: false, error: 'no-shodan-key' };
    try {
        const r = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${SHODAN_KEY}`);
        if (!r.ok) return { ok: false, error: `shodan-${r.status}` };
        const j = await r.json();
        return {
            ok: true,
            ip,
            org: j.org,
            os: j.os,
            hostnames: j.hostnames,
            ports: j.ports,
            vulns: j.vulns || [],
            tags: j.tags || [],
            last_update: j.last_update,
            services: (j.data || []).map(s => ({
                port: s.port,
                transport: s.transport,
                product: s.product,
                version: s.version,
                cpe: s.cpe23,
                banner: (s.data || '').slice(0, 500),
            })),
        };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function shodanSearch(query, { limit = 50 } = {}) {
    if (!SHODAN_KEY) return { ok: false, error: 'no-shodan-key' };
    try {
        const r = await fetch(`https://api.shodan.io/shodan/host/search?key=${SHODAN_KEY}&query=${encodeURIComponent(query)}&limit=${limit}`);
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error || `shodan-${r.status}` };
        return {
            ok: true,
            query,
            total: j.total,
            matches: (j.matches || []).map(m => ({ ip: m.ip_str, port: m.port, org: m.org, product: m.product, version: m.version })),
        };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function censysHost(ip) {
    if (!CENSYS_ID || !CENSYS_SECRET) return { ok: false, error: 'no-censys-creds' };
    try {
        const auth = Buffer.from(`${CENSYS_ID}:${CENSYS_SECRET}`).toString('base64');
        const r = await fetch(`https://search.censys.io/api/v2/hosts/${ip}`, { headers: { Authorization: `Basic ${auth}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error || `censys-${r.status}` };
        return { ok: true, data: j.result };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function hibpBreaches(email) {
    if (!HIBP_KEY) return { ok: false, error: 'no-hibp-key' };
    try {
        const r = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`, {
            headers: { 'hibp-api-key': HIBP_KEY, 'User-Agent': 'KeysOsi-Link' },
        });
        if (r.status === 404) return { ok: true, email, breaches: [] };
        if (!r.ok) return { ok: false, error: `hibp-${r.status}` };
        const j = await r.json();
        return { ok: true, email, count: j.length, breaches: j.map(b => ({ name: b.Name, date: b.BreachDate, dataClasses: b.DataClasses })) };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function vtDomain(domain) {
    if (!VT_KEY) return { ok: false, error: 'no-vt-key' };
    try {
        const r = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, { headers: { 'x-apikey': VT_KEY } });
        if (!r.ok) return { ok: false, error: `vt-${r.status}` };
        const j = await r.json();
        const a = j.data?.attributes || {};
        return {
            ok: true,
            domain,
            reputation: a.reputation,
            last_analysis_stats: a.last_analysis_stats,
            categories: a.categories,
            subdomains: a.popularity_ranks ? Object.keys(a.popularity_ranks) : [],
        };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function emailsForDomain(domain) {
    // Simple google-dorks via proxy or brave search (fallback crt.sh for subs then scrape home)
    const subs = await crtSh(domain);
    return {
        ok: true,
        domain,
        subdomains: subs.ok ? subs.subdomains.slice(0, 200) : [],
        note: 'Pour emails/employes : utiliser theHarvester dans la sandbox Kali (apt: theharvester).',
    };
}

async function fullRecon(target) {
    const domain = String(target).replace(/^https?:\/\//, '').split('/')[0];
    const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(domain);
    const tasks = {};
    if (isIp) {
        const [sh, cs] = await Promise.allSettled([shodanHost(domain), censysHost(domain)]);
        tasks.shodan = sh.status === 'fulfilled' ? sh.value : { ok: false, error: sh.reason?.message };
        tasks.censys = cs.status === 'fulfilled' ? cs.value : { ok: false, error: cs.reason?.message };
    } else {
        const [crt, vt] = await Promise.allSettled([crtSh(domain), vtDomain(domain)]);
        tasks.crtsh = crt.status === 'fulfilled' ? crt.value : { ok: false, error: crt.reason?.message };
        tasks.virustotal = vt.status === 'fulfilled' ? vt.value : { ok: false, error: vt.reason?.message };
    }
    return { ok: true, target, kind: isIp ? 'ip' : 'domain', tasks };
}

module.exports = { crtSh, shodanHost, shodanSearch, censysHost, hibpBreaches, vtDomain, emailsForDomain, fullRecon };
