// ════════════════════════════════════════════════════════════════
//  🕵️ TRAFFIC ANALYZER — IDOR/CSRF/JWT passif via mitm flows
//  Lit les flows capturees par mitmproxy (container aura-mitm) et
//  detecte passivement : IDOR (IDs sequentiels dans URLs/bodies),
//  JWT faibles (algo none, signature statique), CSRF manquants
//  sur POST/PUT/DELETE, cookies sans Secure/HttpOnly/SameSite,
//  secrets leakes dans reponses.
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER)) ? WIN_DOCKER : 'docker';
const MITM_CONTAINER = 'aura-mitm';
const FLOWS_PATH = '/flows/flows.mitm';

function _exec(container, cmd, timeoutMs = 30000) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', container, 'bash', '-lc', cmd], { windowsHide: true });
        let stdout = '', stderr = '';
        const to = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, timeoutMs);
        proc.stdout?.on('data', d => stdout += d.toString());
        proc.stderr?.on('data', d => stderr += d.toString());
        proc.on('close', code => { clearTimeout(to); resolve({ code, stdout, stderr }); });
        proc.on('error', err => { clearTimeout(to); resolve({ code: -1, stdout, stderr: err.message }); });
    });
}

// Script Python inline qui parse le dump mitm et sort un JSON par flow
const PARSE_SCRIPT = `
import sys, json
from mitmproxy import io, http

flows_out = []
try:
    with open("${FLOWS_PATH}", "rb") as f:
        reader = io.FlowReader(f)
        for flow in reader.stream():
            if not isinstance(flow, http.HTTPFlow): continue
            req = flow.request
            res = flow.response
            entry = {
                "method": req.method,
                "url": req.pretty_url,
                "host": req.host,
                "path": req.path,
                "req_headers": dict(req.headers),
                "req_body": req.get_text(strict=False)[:4000] if req.raw_content else "",
                "status": res.status_code if res else None,
                "res_headers": dict(res.headers) if res else {},
                "res_body": (res.get_text(strict=False)[:4000] if res and res.raw_content else ""),
                "cookies_set": [v for k, v in (res.headers.items() if res else []) if k.lower() == "set-cookie"],
            }
            flows_out.append(entry)
except FileNotFoundError:
    print(json.dumps({"error": "no-flows-file"}))
    sys.exit(0)

print(json.dumps({"count": len(flows_out), "flows": flows_out[-500:]}))
`;

async function loadFlows() {
    const b64 = Buffer.from(PARSE_SCRIPT).toString('base64');
    const cmd = `echo ${b64} | base64 -d > /tmp/parse_flows.py && python3 /tmp/parse_flows.py`;
    const res = await _exec(MITM_CONTAINER, cmd, 60000);
    if (res.code !== 0) return { ok: false, error: 'mitm-exec-failed', stderr: res.stderr.slice(0, 500) };
    try {
        const parsed = JSON.parse(res.stdout.trim().split('\n').pop());
        if (parsed.error) return { ok: false, error: parsed.error };
        return { ok: true, flows: parsed.flows || [], count: parsed.count };
    } catch (e) {
        return { ok: false, error: 'parse-failed', raw: res.stdout.slice(0, 500) };
    }
}

// ─── DETECTEURS ───────────────────────────────────────────────

function detectIDOR(flows) {
    const findings = [];
    // groupe URLs par pattern (remplace nombre par {id})
    const pathGroups = {};
    for (const f of flows) {
        if (!['GET', 'PUT', 'DELETE', 'PATCH'].includes(f.method)) continue;
        const pattern = f.path.replace(/\/\d+(?=\/|$|\?)/g, '/{id}');
        if (pattern === f.path) continue; // pas d'ID numerique
        pathGroups[pattern] = pathGroups[pattern] || [];
        pathGroups[pattern].push(f);
    }
    for (const [pattern, group] of Object.entries(pathGroups)) {
        const ids = new Set();
        for (const g of group) {
            const m = g.path.match(/\/(\d+)(?=\/|$|\?)/);
            if (m) ids.add(parseInt(m[1]));
        }
        if (ids.size >= 3) {
            const sorted = Array.from(ids).sort((a, b) => a - b);
            const successRate = group.filter(g => g.status && g.status < 400).length / group.length;
            findings.push({
                type: 'IDOR-candidate',
                severity: successRate > 0.7 ? 'high' : 'medium',
                pattern,
                observed_ids: sorted.slice(0, 10),
                samples: group.length,
                success_rate: successRate.toFixed(2),
                recommendation: `Tester IDs adjacents (min=${sorted[0]}, max=${sorted[sorted.length - 1]}) avec un autre user token.`,
            });
        }
    }
    return findings;
}

function detectJWT(flows) {
    const findings = [];
    const seen = new Set();
    const jwtRe = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/;
    for (const f of flows) {
        const blobs = [JSON.stringify(f.req_headers || {}), f.req_body || '', JSON.stringify(f.res_headers || {}), f.res_body || ''];
        for (const b of blobs) {
            const m = b.match(jwtRe);
            if (!m) continue;
            const jwt = m[0];
            if (seen.has(jwt.slice(0, 40))) continue;
            seen.add(jwt.slice(0, 40));
            try {
                const [h, p] = jwt.split('.');
                const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
                const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
                const issues = [];
                if ((header.alg || '').toLowerCase() === 'none') issues.push('alg=none (signature optionnelle)');
                if (['HS256', 'HS384', 'HS512'].includes(header.alg)) issues.push(`alg=${header.alg} (HMAC — tester secrets faibles)`);
                if (payload.exp && payload.exp * 1000 < Date.now()) issues.push('token expire');
                if (!payload.exp) issues.push('pas de claim exp (token eternel)');
                if (payload.iat && payload.exp && (payload.exp - payload.iat) > 60 * 60 * 24 * 30) issues.push('duree vie > 30j');
                if (issues.length) {
                    findings.push({
                        type: 'JWT-weak',
                        severity: issues.some(i => i.includes('none') || i.includes('HMAC')) ? 'high' : 'medium',
                        alg: header.alg,
                        issues,
                        host: f.host,
                        sample_path: f.path,
                        payload_claims: Object.keys(payload),
                        recommendation: 'Tester alg=none bypass, forcer kid injection, bruteforce secret HMAC avec jwt_tool ou hashcat -m 16500.',
                    });
                }
            } catch {}
        }
    }
    return findings;
}

function detectCSRF(flows) {
    const findings = [];
    const vulnerable = [];
    for (const f of flows) {
        if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(f.method)) continue;
        if (!f.status || f.status >= 400) continue;
        const headers = f.req_headers || {};
        const lowerKeys = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
        const hasCsrfHeader = ['x-csrf-token', 'x-xsrf-token', 'csrf-token', 'x-requested-with'].some(k => lowerKeys[k]);
        const bodyHasCsrf = (f.req_body || '').match(/csrf|xsrf|authenticity_token/i);
        const ct = lowerKeys['content-type'] || '';
        const isJson = ct.includes('json');
        // JSON sans custom header + sans CORS preflight header → candidat CSRF
        if (!hasCsrfHeader && !bodyHasCsrf) {
            vulnerable.push({
                method: f.method,
                url: f.url,
                content_type: ct,
                isJson,
            });
        }
    }
    if (vulnerable.length) {
        // groupe par path
        const byPath = {};
        for (const v of vulnerable) {
            const key = v.method + ' ' + v.url.split('?')[0];
            byPath[key] = (byPath[key] || 0) + 1;
        }
        findings.push({
            type: 'CSRF-candidate',
            severity: 'medium',
            count: vulnerable.length,
            unique_endpoints: Object.keys(byPath).length,
            samples: Object.keys(byPath).slice(0, 10),
            recommendation: 'Tester POST cross-origin via form HTML auto-submit ou fetch no-cors. Si JSON accepte sans header custom, CSRF exploitable.',
        });
    }
    return findings;
}

function detectCookieFlags(flows) {
    const findings = [];
    const seen = new Set();
    for (const f of flows) {
        for (const setCookie of (f.cookies_set || [])) {
            const name = setCookie.split('=')[0];
            const key = f.host + ':' + name;
            if (seen.has(key)) continue;
            seen.add(key);
            const lower = setCookie.toLowerCase();
            const issues = [];
            if (!lower.includes('secure')) issues.push('Secure absent');
            if (!lower.includes('httponly')) issues.push('HttpOnly absent');
            if (!lower.includes('samesite')) issues.push('SameSite absent');
            if (/session|auth|token|jwt|sid/i.test(name) && issues.length) {
                findings.push({
                    type: 'Cookie-insecure',
                    severity: issues.includes('HttpOnly absent') ? 'high' : 'medium',
                    cookie: name,
                    host: f.host,
                    issues,
                    recommendation: 'Ajouter Secure + HttpOnly + SameSite=Strict/Lax. Cookie de session sans HttpOnly est volable via XSS.',
                });
            }
        }
    }
    return findings;
}

function detectSecrets(flows) {
    const findings = [];
    const patterns = [
        { name: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
        { name: 'AWS Secret', re: /aws[_-]?secret[_-]?access[_-]?key['":\s]+([A-Za-z0-9\/+=]{40})/i },
        { name: 'GitHub PAT', re: /ghp_[A-Za-z0-9]{36}/ },
        { name: 'Google API Key', re: /AIza[0-9A-Za-z_-]{35}/ },
        { name: 'Slack Token', re: /xox[bpars]-[0-9A-Za-z-]{10,}/ },
        { name: 'Stripe Secret', re: /sk_live_[0-9a-zA-Z]{24}/ },
        { name: 'Generic Password', re: /"password"\s*:\s*"([^"]{6,})"/i },
        { name: 'Private Key', re: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
    ];
    const seen = new Set();
    for (const f of flows) {
        const hay = (f.res_body || '') + '\n' + JSON.stringify(f.res_headers || {});
        for (const p of patterns) {
            const m = hay.match(p.re);
            if (!m) continue;
            const key = p.name + ':' + (m[0] || '').slice(0, 20);
            if (seen.has(key)) continue;
            seen.add(key);
            findings.push({
                type: 'Secret-leak',
                severity: 'critical',
                kind: p.name,
                host: f.host,
                path: f.path,
                preview: m[0].slice(0, 40) + '...',
                recommendation: 'Exfil a valider hors-scope ; remonter au client en priorite 1.',
            });
        }
    }
    return findings;
}

function detectOpenRedirect(flows) {
    const findings = [];
    for (const f of flows) {
        if (![301, 302, 303, 307, 308].includes(f.status)) continue;
        const loc = (f.res_headers?.Location || f.res_headers?.location || '').trim();
        if (!loc) continue;
        const reqParams = (f.url.split('?')[1] || '');
        // user-controlled redirect ?
        const urlMatch = reqParams.match(/(?:url|redirect|next|return|target|goto|r)=([^&]+)/i);
        if (!urlMatch) continue;
        const paramVal = decodeURIComponent(urlMatch[1]);
        if (loc.includes(paramVal.replace(/^https?:\/\//, '')) || loc === paramVal) {
            findings.push({
                type: 'Open-redirect',
                severity: 'medium',
                url: f.url,
                redirect_to: loc,
                param: urlMatch[0].split('=')[0],
                recommendation: 'Tester redirect vers attacker.com — enchainer avec phishing ou OAuth token theft.',
            });
        }
    }
    return findings;
}

async function analyze({ flowsData = null } = {}) {
    let flows = flowsData;
    if (!flows) {
        const loaded = await loadFlows();
        if (!loaded.ok) return { ok: false, ...loaded };
        flows = loaded.flows;
    }
    if (!flows?.length) return { ok: true, flows_count: 0, findings: [] };

    const findings = [
        ...detectIDOR(flows),
        ...detectJWT(flows),
        ...detectCSRF(flows),
        ...detectCookieFlags(flows),
        ...detectSecrets(flows),
        ...detectOpenRedirect(flows),
    ];
    // rank par severity
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    findings.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
    return {
        ok: true,
        flows_count: flows.length,
        findings,
        summary: {
            total: findings.length,
            by_severity: findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc; }, {}),
            by_type: findings.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + 1; return acc; }, {}),
        },
    };
}

module.exports = { analyze, loadFlows, detectIDOR, detectJWT, detectCSRF, detectCookieFlags, detectSecrets, detectOpenRedirect };
