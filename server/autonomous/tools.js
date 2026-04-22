// ════════════════════════════════════════════════════════════════
//  🛠️  TOOLS CATALOG — catalog + runners + output parsers
//  Chaque outil : description, intrusiveness, builder args,
//  parser de sortie qui enrichit la memoire de l'hote.
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');
const browser = require('./browser');
const exploit = require('./exploit');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER))
    ? WIN_DOCKER : 'docker';
const CONTAINER = 'aura-lab';

function parseArgs(args, defaults = {}) {
    if (args && typeof args === 'object') return { ...defaults, ...args };
    if (typeof args === 'string') {
        const trimmed = args.trim();
        if (trimmed.startsWith('{')) {
            try { return { ...defaults, ...JSON.parse(trimmed) }; } catch {}
        }
        return { ...defaults, target: trimmed };
    }
    return { ...defaults };
}

function shellEscape(s) {
    if (/^[a-zA-Z0-9_./:=?&@~+-]+$/.test(String(s))) return String(s);
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function execInSandbox(cmd, { timeoutMs = 10 * 60 * 1000 } = {}) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        let stdout = '', stderr = '';
        const to = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, timeoutMs);
        proc.stdout?.on('data', d => stdout += d.toString());
        proc.stderr?.on('data', d => stderr += d.toString());
        proc.on('close', code => { clearTimeout(to); resolve({ code, stdout, stderr }); });
        proc.on('error', err => { clearTimeout(to); resolve({ code: -1, stdout, stderr: err.message }); });
    });
}

// ── Catalog ──
// intrusive: true = active scan / brute / fuzz / exploit → demande confirmation en mode recon-only
// timeoutMs: limite d'execution
const CATALOG = {
    // ── passive / light ──
    whatweb: {
        desc: 'Fingerprint HTTP : CMS, framework, serveur',
        intrusive: false,
        build: (target) => `whatweb --color=never -a 3 ${shellEscape(target)}`,
        ingest: (out, host) => {
            // [200 OK] target [Title][X-Powered-By[PHP/8.1]][WordPress[6.4]]
            const techs = [];
            const matches = out.matchAll(/\[([^\[\]]+?)\[([^\[\]]+?)\]\]/g);
            for (const m of matches) techs.push(`${m[1]}: ${m[2]}`);
            const bare = out.matchAll(/\[([A-Z][A-Za-z0-9\-]+)\]/g);
            for (const m of bare) if (m[1].length > 2) techs.push(m[1]);
            host.tech = Array.from(new Set([...(host.tech || []), ...techs]));
        },
    },
    httpx: {
        desc: 'Probe HTTP + title + status + tech + IP',
        intrusive: false,
        build: (target) => `echo ${shellEscape(target)} | httpx -silent -title -status-code -tech-detect -ip -server`,
        ingest: (out, host) => {
            const line = out.trim().split('\n').find(l => l.includes('[')) || '';
            const techMatch = line.match(/\[([^\[\]]+)\]/g) || [];
            const techs = techMatch.map(t => t.slice(1, -1)).filter(t => !/^\d+$/.test(t));
            host.tech = Array.from(new Set([...(host.tech || []), ...techs]));
            const ipMatch = line.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
            if (ipMatch) host.ip = ipMatch[0];
        },
    },
    headers: {
        desc: 'Headers HTTP bruts (curl -I)',
        intrusive: false,
        build: (target) => `curl -sI -L --max-time 15 ${shellEscape(target)}`,
        ingest: (out, host) => {
            host.headers = host.headers || {};
            for (const line of out.split('\n')) {
                const m = line.match(/^([A-Za-z-]+):\s*(.+?)\r?$/);
                if (m) host.headers[m[1].toLowerCase()] = m[2];
            }
            const server = host.headers.server;
            if (server) host.tech = Array.from(new Set([...(host.tech || []), server]));
        },
    },
    wafw00f: {
        desc: 'Detection de WAF',
        intrusive: false,
        build: (target) => `wafw00f -a ${shellEscape(target)} 2>&1 | tail -50`,
        ingest: (out, host) => {
            const m = out.match(/is behind (.+?) (?:WAF|from)/i);
            if (m) host.waf = m[1].trim();
            else if (/No WAF detected/i.test(out)) host.waf = 'none';
        },
    },
    dnsx: {
        desc: 'Resolution DNS (A, CNAME, MX, NS, TXT)',
        intrusive: false,
        build: (target) => `echo ${shellEscape(target)} | dnsx -silent -a -cname -mx -ns -txt -resp`,
        ingest: (out, host) => {
            host.dns = host.dns || {};
            for (const line of out.split('\n')) {
                const m = line.match(/\[([A-Z]+)\]\s+(.+)/);
                if (m) {
                    host.dns[m[1]] = host.dns[m[1]] || [];
                    host.dns[m[1]].push(m[2]);
                }
            }
        },
    },
    subfinder: {
        desc: 'Enumeration passive de sous-domaines',
        intrusive: false,
        build: (target) => `subfinder -d ${shellEscape(target)} -silent`,
        ingest: (out, host) => {
            const subs = out.split('\n').map(s => s.trim()).filter(Boolean);
            host.subdomains = Array.from(new Set([...(host.subdomains || []), ...subs]));
        },
    },

    // ── active ──
    nmap: {
        desc: 'Scan ports (top-100, detection service)',
        intrusive: true,
        build: (target) => `nmap -Pn -T4 --top-ports 100 -sV ${shellEscape(target)}`,
        ingest: (out, host) => {
            host.ports = host.ports || {};
            for (const line of out.split('\n')) {
                const m = line.match(/^(\d+)\/tcp\s+(\w+)\s+(.+)$/);
                if (m && m[2] === 'open') host.ports[m[1]] = m[3].trim();
            }
        },
    },
    nuclei: {
        desc: 'Scan de vulnerabilites (templates communautaires)',
        intrusive: true,
        build: (target) => `nuclei -u ${shellEscape(target)} -severity low,medium,high,critical -silent -jsonl`,
        ingest: (out, host) => {
            host.vulns = host.vulns || [];
            for (const line of out.split('\n').filter(Boolean)) {
                try {
                    const j = JSON.parse(line);
                    host.vulns.push({
                        id: j['template-id'] || j.templateID,
                        severity: j.info?.severity,
                        name: j.info?.name,
                        url: j['matched-at'] || j.matched_at,
                    });
                } catch {}
            }
        },
    },
    katana: {
        desc: 'Crawler web (endpoints, parametres)',
        intrusive: true,
        build: (target) => `katana -u ${shellEscape(target)} -d 2 -silent -jc`,
        ingest: (out, host) => {
            const urls = out.split('\n').map(s => s.trim()).filter(Boolean);
            host.endpoints = Array.from(new Set([...(host.endpoints || []), ...urls])).slice(0, 500);
        },
    },
    gobuster: {
        desc: 'Brute force de repertoires',
        intrusive: true,
        build: (target) => `gobuster dir -u ${shellEscape(target)} -w /usr/share/wordlists/dirb/common.txt -q -t 30 -k`,
        ingest: (out, host) => {
            host.endpoints = host.endpoints || [];
            for (const line of out.split('\n')) {
                const m = line.match(/^(\/\S+)\s+\(Status:\s+(\d+)\)/);
                if (m) host.endpoints.push(`${m[1]} [${m[2]}]`);
            }
            host.endpoints = Array.from(new Set(host.endpoints)).slice(0, 500);
        },
    },
    ffuf: {
        desc: 'Fuzzing rapide (params, endpoints)',
        intrusive: true,
        build: (target) => `ffuf -u ${shellEscape(target.replace(/FUZZ/g, '') || target)}/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301,302,401,403 -s -t 40`,
        ingest: (out, host) => {
            host.endpoints = Array.from(new Set([
                ...(host.endpoints || []),
                ...out.split('\n').map(s => s.trim()).filter(Boolean),
            ])).slice(0, 500);
        },
    },
    nikto: {
        desc: 'Scanner web classique (checks serveur + configurations)',
        intrusive: true,
        build: (target) => `nikto -h ${shellEscape(target)} -ask no -maxtime 180`,
        ingest: (out, host) => {
            host.niktoFindings = host.niktoFindings || [];
            for (const line of out.split('\n')) {
                if (line.startsWith('+ ') && !/^\+ Target|^\+ Start|^\+ End|^\+ Server/.test(line)) {
                    host.niktoFindings.push(line.slice(2));
                }
            }
        },
    },
    wpscan: {
        desc: 'Audit WordPress (plugins, themes, users, vulns)',
        intrusive: true,
        build: (target) => `wpscan --url ${shellEscape(target)} --random-user-agent --no-banner --disable-tls-checks -e vp,vt,u1-5 --format cli-no-color 2>&1 | head -200`,
        ingest: (out, host) => {
            host.wordpress = host.wordpress || {};
            const ver = out.match(/WordPress version ([\d.]+)/);
            if (ver) host.wordpress.version = ver[1];
            const plugins = out.matchAll(/\[\+\] ([a-z0-9\-]+)\s*\|\s*Location/g);
            host.wordpress.plugins = Array.from(plugins).map(m => m[1]);
        },
    },
    sqlmap: {
        desc: 'Detection/exploit SQL injection (batch, non-destructif par defaut)',
        intrusive: true,
        build: (target) => `sqlmap -u ${shellEscape(target)} --batch --random-agent --level=2 --risk=1 --threads=5 --smart 2>&1 | tail -100`,
        ingest: (out, host) => {
            if (/is vulnerable|Parameter.*appears to be/i.test(out)) {
                host.sqlinjection = true;
            }
        },
    },

    // ── utilitaires ──
    exec: {
        desc: 'Shell arbitraire (echappatoire — usage judicieux)',
        intrusive: true,
        build: (cmd) => cmd, // passe tel quel
        ingest: () => {},
    },

    // ── Browser automation (Playwright headless in sandbox) ──
    browser_login: {
        desc: 'Headless Chromium: login auto, retourne cookies + URL finale (args JSON: {url,user,password,selectors?})',
        intrusive: true,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await browser.login(a);
            return { tool: 'browser_login', cmd: `browser_login ${a.url}`, exitCode: res.ok ? 0 : 1, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.ok && j.cookies) {
                    host.session = host.session || {};
                    host.session.cookies = j.cookies;
                    host.session.loginUrl = j.final_url;
                }
            } catch {}
        },
    },
    browser_crawl: {
        desc: 'Crawl JS-rendered: endpoints + forms + XHR (args JSON: {url,depth?,cookies?})',
        intrusive: true,
        custom: async (args) => {
            const a = parseArgs(args);
            if (!a.url) a.url = a.target;
            const res = await browser.crawl(a);
            return { tool: 'browser_crawl', cmd: `browser_crawl ${a.url}`, exitCode: res.ok ? 0 : 1, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.endpoints) host.endpoints = Array.from(new Set([...(host.endpoints || []), ...j.endpoints])).slice(0, 500);
                if (j.forms) host.forms = [...(host.forms || []), ...j.forms].slice(0, 80);
                if (j.xhr) host.xhr = [...(host.xhr || []), ...j.xhr].slice(0, 200);
            } catch {}
        },
    },
    browser_fuzz: {
        desc: 'Fuzz un champ de formulaire (args JSON: {url,field,payloads?,cookies?})',
        intrusive: true,
        custom: async (args) => {
            const a = parseArgs(args);
            if (!a.url) a.url = a.target;
            const res = await browser.fuzz(a);
            return { tool: 'browser_fuzz', cmd: `browser_fuzz ${a.url} ${a.field}`, exitCode: res.ok ? 0 : 1, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.results) {
                    const anomalies = j.results.filter(r => r.anomaly || r.reflected);
                    if (anomalies.length) {
                        host.vulns = host.vulns || [];
                        for (const a of anomalies) {
                            host.vulns.push({
                                id: `fuzz:${j.field}`,
                                severity: a.anomaly ? 'high' : 'medium',
                                name: `Fuzz ${a.reflected ? 'reflet' : 'anomalie'} sur ${j.field}`,
                                url: a.payload,
                            });
                        }
                    }
                }
            } catch {}
        },
    },

    // ── Exploit (require exploitUnlocked dans l'agent) ──
    sqlmap_dump: {
        desc: 'sqlmap --dump : extrait les donnees (DESTRUCTIF — exploit gated)',
        intrusive: true,
        exploit: true,
        custom: async (args) => {
            const a = parseArgs(args);
            if (!a.target) return { tool: 'sqlmap_dump', cmd: 'sqlmap_dump', exitCode: 1, output: JSON.stringify({ ok: false, error: 'target requis' }) };
            const res = await exploit.sqlmapDump(a);
            return { tool: 'sqlmap_dump', cmd: `sqlmap_dump ${a.target}`, exitCode: res.exitCode, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.tablesFound?.length) {
                    host.vulns = host.vulns || [];
                    host.vulns.push({ id: 'sqlmap-dump', severity: 'critical', name: `SQLi exploitable — ${j.tablesFound.length} tables dumpees`, url: j.dumpDir });
                }
            } catch {}
        },
    },
    msfvenom_payload: {
        desc: 'msfvenom : genere un payload (args JSON: {payload,lhost,lport,format?,out?})',
        intrusive: true,
        exploit: true,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await exploit.msfvenomPayload(a);
            return { tool: 'msfvenom_payload', cmd: `msfvenom ${a.payload}`, exitCode: res.exitCode, output: JSON.stringify(res, null, 2) };
        },
        ingest: () => {},
    },
    hydra_http: {
        desc: 'hydra brute HTTP form (args JSON: {target,urlPath,formData,failString,userlist?,passlist?})',
        intrusive: true,
        exploit: true,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await exploit.hydraHttpForm(a);
            return { tool: 'hydra_http', cmd: `hydra ${a.target}`, exitCode: res.exitCode, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.credsFound?.length) {
                    host.vulns = host.vulns || [];
                    host.vulns.push({ id: 'hydra', severity: 'high', name: `Creds bruteforce : ${j.credsFound.length} trouves`, url: j.credsFound[0]?.login });
                }
            } catch {}
        },
    },
    listener_start: {
        desc: 'Demarre un listener ncat dans la sandbox (args JSON: {port})',
        intrusive: true,
        exploit: true,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await exploit.listenerStart(a.port || a.target || 4444);
            return { tool: 'listener_start', cmd: `ncat -lvnp ${a.port}`, exitCode: res.ok ? 0 : 1, output: JSON.stringify(res, null, 2) };
        },
        ingest: () => {},
    },
    listener_tail: {
        desc: 'Affiche les logs du listener (args JSON: {port,lines?})',
        intrusive: false,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await exploit.listenerTail(a.port || a.target, a.lines || 80);
            return { tool: 'listener_tail', cmd: `tail ${a.port}`, exitCode: 0, output: JSON.stringify(res, null, 2) };
        },
        ingest: () => {},
    },
    msfconsole_run: {
        desc: 'Lance un script RC Metasploit (args JSON: {script})',
        intrusive: true,
        exploit: true,
        custom: async (args) => {
            const a = parseArgs(args);
            const res = await exploit.msfconsoleRun(a);
            return { tool: 'msfconsole_run', cmd: 'msfconsole -r', exitCode: res.exitCode, output: JSON.stringify(res, null, 2) };
        },
        ingest: (out, host) => {
            try {
                const j = JSON.parse(out);
                if (j.sessionOpened) {
                    host.vulns = host.vulns || [];
                    host.vulns.push({ id: 'msf-session', severity: 'critical', name: 'Session Metasploit ouverte (RCE)', url: '' });
                }
            } catch {}
        },
    },
};

function listForPrompt() {
    return Object.entries(CATALOG).map(([name, t]) =>
        `- ${name}${t.intrusive ? ' [intrusif]' : ''} : ${t.desc}`
    ).join('\n');
}

function isIntrusive(name) {
    return !!CATALOG[name]?.intrusive;
}

function isExploit(name) {
    return !!CATALOG[name]?.exploit;
}

function has(name) {
    return !!CATALOG[name];
}

async function run(name, argsOrTarget) {
    const t = CATALOG[name];
    if (!t) throw new Error(`Outil inconnu: ${name}`);
    if (typeof t.custom === 'function') {
        return await t.custom(argsOrTarget);
    }
    const cmd = t.build(argsOrTarget);
    const res = await execInSandbox(cmd, { timeoutMs: 10 * 60 * 1000 });
    return {
        tool: name,
        cmd,
        exitCode: res.code,
        output: (res.stdout || '') + (res.stderr ? '\n[stderr]\n' + res.stderr : ''),
    };
}

function ingest(name, output, hostMem) {
    const t = CATALOG[name];
    if (!t || !t.ingest) return;
    try { t.ingest(output, hostMem); } catch {}
}

module.exports = {
    CATALOG, listForPrompt, isIntrusive, isExploit, has, run, ingest,
};
