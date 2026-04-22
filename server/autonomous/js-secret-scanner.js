// ════════════════════════════════════════════════════════════════
//  🔑 JS SECRET SCANNER — Regex scan on JS bundles + sourcemaps
//  Cherche AWS/GH/Stripe/Slack/Twilio/JWT/Firebase/API keys, URLs
//  internes, et secrets oublies dans les bundles front.
// ════════════════════════════════════════════════════════════════

const PATTERNS = [
    { name: 'AWS Access Key', severity: 'critical', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
    { name: 'AWS Secret Key', severity: 'critical', re: /\b(?:aws)?_?(?:secret)?_?access_?key[^=]{0,10}=[^a-zA-Z0-9/+=]{0,5}([A-Za-z0-9/+=]{40})/gi },
    { name: 'GitHub Token', severity: 'critical', re: /\bghp_[A-Za-z0-9]{36}\b|\bgho_[A-Za-z0-9]{36}\b|\bghu_[A-Za-z0-9]{36}\b|\bghs_[A-Za-z0-9]{36}\b|\bghr_[A-Za-z0-9]{36}\b/g },
    { name: 'GitLab Token', severity: 'critical', re: /\bglpat-[A-Za-z0-9\-_]{20}\b/g },
    { name: 'Stripe Live Key', severity: 'critical', re: /\bsk_live_[A-Za-z0-9]{24,}\b/g },
    { name: 'Stripe Restricted', severity: 'high', re: /\brk_live_[A-Za-z0-9]{24,}\b/g },
    { name: 'Slack Token', severity: 'high', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
    { name: 'Slack Webhook', severity: 'high', re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g },
    { name: 'Google API Key', severity: 'high', re: /\bAIza[0-9A-Za-z_\-]{35}\b/g },
    { name: 'Firebase Key', severity: 'medium', re: /\bAAAA[A-Za-z0-9_\-]{7}:APA91[A-Za-z0-9_\-]{20,}/g },
    { name: 'Twilio SID', severity: 'high', re: /\bAC[a-f0-9]{32}\b/g },
    { name: 'SendGrid API Key', severity: 'high', re: /\bSG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}\b/g },
    { name: 'Mailgun Key', severity: 'high', re: /\bkey-[a-f0-9]{32}\b/g },
    { name: 'Mapbox Token', severity: 'medium', re: /\bpk\.eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g },
    { name: 'Heroku API Key', severity: 'high', re: /\b[hH]eroku[^a-zA-Z0-9]{0,10}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g },
    { name: 'JWT Token', severity: 'medium', re: /\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/g },
    { name: 'Private Key', severity: 'critical', re: /-----BEGIN (?:RSA|DSA|EC|OPENSSH|PGP|PRIVATE) PRIVATE KEY-----/g },
    { name: 'Generic Bearer', severity: 'low', re: /\b[Bb]earer\s+[A-Za-z0-9_\-\.=]{20,}/g },
    { name: 'Generic API Key', severity: 'low', re: /\b(?:api[_-]?key|apikey|x-api-key)["'\s:=]{1,5}["']([A-Za-z0-9_\-]{20,64})["']/gi },
    { name: 'Password in URL', severity: 'high', re: /\b[a-z]+:\/\/[^\/\s:@]+:[^\/\s:@]{3,}@[a-z0-9\.-]+/gi },
    { name: 'Basic Auth Header', severity: 'high', re: /[Bb]asic\s+[A-Za-z0-9+\/=]{12,}/g },
    { name: 'Internal URL', severity: 'low', re: /\bhttps?:\/\/(?:[a-z0-9\-]+\.)?(?:local|internal|dev|staging|test|corp|intra)(?:\.[a-z]+)?(?::\d+)?(?:\/[^\s"'<>]*)?/gi },
    { name: 'AWS S3 Bucket', severity: 'low', re: /\bs3:\/\/[a-z0-9\-\.]{3,63}|\bhttps?:\/\/[a-z0-9\-\.]{3,63}\.s3\.amazonaws\.com/gi },
];

function scanText(text, sourceName = 'inline') {
    const findings = [];
    const s = String(text);
    for (const p of PATTERNS) {
        let m;
        const r = new RegExp(p.re.source, p.re.flags);
        while ((m = r.exec(s)) !== null) {
            const idx = m.index;
            const ctxStart = Math.max(0, idx - 40);
            const ctxEnd = Math.min(s.length, idx + m[0].length + 40);
            findings.push({
                type: p.name,
                severity: p.severity,
                match: m[0].slice(0, 120),
                context: s.slice(ctxStart, ctxEnd).replace(/\s+/g, ' '),
                source: sourceName,
            });
            if (findings.length > 500) return findings;
        }
    }
    return findings;
}

async function scanUrl(url, { includeSourcemap = true } = {}) {
    try {
        const r = await fetch(url, { headers: { 'User-Agent': 'KeysOsi-Link/1.0' } });
        if (!r.ok) return { url, error: `http-${r.status}`, findings: [] };
        const body = await r.text();
        const findings = scanText(body, url);
        // sourcemap
        if (includeSourcemap) {
            const m = body.match(/sourceMappingURL=([^\s*]+)/);
            if (m) {
                try {
                    const mapUrl = new URL(m[1], url).toString();
                    const mr = await fetch(mapUrl);
                    if (mr.ok) {
                        const sm = await mr.text();
                        findings.push(...scanText(sm, mapUrl));
                    }
                } catch {}
            }
        }
        return { url, findings, size: body.length };
    } catch (e) {
        return { url, error: e.message, findings: [] };
    }
}

async function scanUrls(urls = [], concurrency = 4) {
    const results = [];
    const queue = [...urls];
    const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length) {
            const u = queue.shift();
            if (!u) break;
            results.push(await scanUrl(u));
        }
    });
    await Promise.all(workers);
    return {
        scanned: results.length,
        totalFindings: results.reduce((s, r) => s + (r.findings?.length || 0), 0),
        results,
    };
}

// Extrait les URLs .js/.mjs a partir d'un HTML
function extractScriptsFromHtml(html, baseUrl) {
    const scripts = [];
    const re = /<script[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        try { scripts.push(new URL(m[1], baseUrl).toString()); } catch {}
    }
    return [...new Set(scripts)];
}

async function scanSite(baseUrl) {
    try {
        const r = await fetch(baseUrl, { headers: { 'User-Agent': 'KeysOsi-Link/1.0' } });
        const html = await r.text();
        const scripts = extractScriptsFromHtml(html, baseUrl);
        const selfFindings = scanText(html, baseUrl);
        const scan = await scanUrls(scripts);
        return {
            baseUrl,
            htmlFindings: selfFindings,
            scripts: scripts.length,
            scriptResults: scan,
            summary: {
                critical: scan.results.flatMap(r => r.findings || []).concat(selfFindings).filter(f => f.severity === 'critical').length,
                high: scan.results.flatMap(r => r.findings || []).concat(selfFindings).filter(f => f.severity === 'high').length,
                total: scan.totalFindings + selfFindings.length,
            },
        };
    } catch (e) {
        return { baseUrl, error: e.message };
    }
}

module.exports = { scanText, scanUrl, scanUrls, scanSite, extractScriptsFromHtml, PATTERNS };
