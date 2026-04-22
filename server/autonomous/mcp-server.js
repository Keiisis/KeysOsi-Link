// ════════════════════════════════════════════════════════════════
//  🔌 MCP SERVER — Expose KeysOsi-Link as Model Context Protocol
//  Permet a Claude Desktop / Claude Code / Cursor de piloter l'agent
//  directement via MCP. Implementation stdio + HTTP SSE.
//  Ref: https://modelcontextprotocol.io/
// ════════════════════════════════════════════════════════════════
const crypto = require('crypto');

const TOOLS = [
    {
        name: 'recon_quick',
        description: 'Reconnaissance rapide sur une cible (whatweb, httpx, dns, headers). Renvoie tech, ports, headers, waf.',
        inputSchema: {
            type: 'object',
            properties: {
                target: { type: 'string', description: 'URL ou IP cible (doit etre autorisee)' },
            },
            required: ['target'],
        },
    },
    {
        name: 'cve_lookup',
        description: 'Cherche les CVEs publiees pour un produit/version via NVD + Vulners.',
        inputSchema: {
            type: 'object',
            properties: {
                product: { type: 'string' },
                version: { type: 'string' },
                vendor: { type: 'string' },
                limit: { type: 'number', default: 20 },
            },
            required: ['product'],
        },
    },
    {
        name: 'payloads_get',
        description: 'Renvoie une liste de payloads par type de vuln (xss,sqli,ssti,ssrf,xxe,lfi,cmd,ldap,openRedirect,crlf) et par WAF cible.',
        inputSchema: {
            type: 'object',
            properties: {
                vuln: { type: 'string', enum: ['xss', 'sqli', 'ssti', 'ssrf', 'xxe', 'lfi', 'cmd', 'ldap', 'openRedirect', 'crlf'] },
                waf: { type: 'string', enum: ['none', 'cloudflare', 'akamai', 'aws', 'modsecurity'] },
                limit: { type: 'number', default: 30 },
            },
            required: ['vuln'],
        },
    },
    {
        name: 'rag_search',
        description: 'Recherche hybride BM25 + embeddings dans la memoire de KeysOsi-Link (engagements, outputs, findings).',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                topK: { type: 'number', default: 10 },
            },
            required: ['query'],
        },
    },
    {
        name: 'chain_build',
        description: 'Construit une chaine d\'attaque (DAG) pour une cible donnee, basee sur les findings existants.',
        inputSchema: {
            type: 'object',
            properties: {
                target: { type: 'string' },
                goal: { type: 'string' },
            },
            required: ['target'],
        },
    },
    {
        name: 'osint_recon',
        description: 'OSINT passif : crt.sh (subdomains), VirusTotal, Shodan, Censys selon cles dispo.',
        inputSchema: {
            type: 'object',
            properties: {
                target: { type: 'string' },
            },
            required: ['target'],
        },
    },
    {
        name: 'js_secrets_scan',
        description: 'Scan des bundles JS d\'un site pour secrets (AWS/GH/Stripe/JWT/internal URLs).',
        inputSchema: {
            type: 'object',
            properties: {
                baseUrl: { type: 'string' },
            },
            required: ['baseUrl'],
        },
    },
    {
        name: 'oob_mint',
        description: 'Genere une URL callback unique (http/dns/xxe) pour detecter blind vulns. Necessite que le collaborateur OOB tourne.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'report_generate',
        description: 'Genere un rapport markdown + HTML depuis la knowledge et les findings d\'une engagement.',
        inputSchema: {
            type: 'object',
            properties: {
                engagement: { type: 'string' },
                target: { type: 'string' },
            },
            required: ['target'],
        },
    },
    {
        name: 'scope_check',
        description: 'Verifie si un target est dans le scope d\'un programme bug bounty (HackerOne/Bugcrowd/Intigriti).',
        inputSchema: {
            type: 'object',
            properties: {
                platform: { type: 'string', enum: ['hackerone', 'bugcrowd', 'intigriti'] },
                handle: { type: 'string' },
                target: { type: 'string' },
            },
            required: ['platform', 'handle', 'target'],
        },
    },
];

const PROTO_VERSION = '2024-11-05';

function _result(id, result) {
    return { jsonrpc: '2.0', id, result };
}
function _error(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleRequest(msg, ctx = {}) {
    const { id, method, params = {} } = msg;
    try {
        if (method === 'initialize') {
            return _result(id, {
                protocolVersion: PROTO_VERSION,
                capabilities: { tools: { listChanged: false } },
                serverInfo: { name: 'keysosi-link', version: '6.0.0' },
            });
        }
        if (method === 'initialized' || method === 'notifications/initialized') return null;
        if (method === 'tools/list') {
            return _result(id, { tools: TOOLS });
        }
        if (method === 'tools/call') {
            const { name, arguments: args = {} } = params;
            const res = await invokeTool(name, args, ctx);
            return _result(id, {
                content: [{ type: 'text', text: typeof res === 'string' ? res : JSON.stringify(res, null, 2) }],
                isError: !!res?.error,
            });
        }
        if (method === 'ping') return _result(id, {});
        return _error(id, -32601, `Method not found: ${method}`);
    } catch (e) {
        return _error(id, -32000, e.message);
    }
}

async function invokeTool(name, args, ctx) {
    const modules = ctx.modules || {};
    switch (name) {
        case 'recon_quick': {
            if (!modules.tools) return { error: 'tools-module-unavailable' };
            const out = {};
            for (const t of ['whatweb', 'httpx', 'http_headers', 'dnsx']) {
                try { out[t] = await modules.tools.run(t, args.target); } catch (e) { out[t] = { error: e.message }; }
            }
            return out;
        }
        case 'cve_lookup':
            if (!modules.cveMapper) return { error: 'cve-mapper-unavailable' };
            return modules.cveMapper.lookup(args);
        case 'payloads_get':
            if (!modules.payloads) return { error: 'payloads-unavailable' };
            return modules.payloads.getPayloads(args);
        case 'rag_search':
            if (!modules.rag) return { error: 'rag-unavailable' };
            return modules.rag.search(args.query, { topK: args.topK || 10 });
        case 'chain_build':
            if (!modules.exploitChain || !modules.knowledge) return { error: 'chain-unavailable' };
            return modules.exploitChain.buildChain({ knowledge: modules.knowledge, target: args.target, goal: args.goal });
        case 'osint_recon':
            if (!modules.osint) return { error: 'osint-unavailable' };
            return modules.osint.fullRecon(args.target);
        case 'js_secrets_scan':
            if (!modules.jsSecret) return { error: 'js-secret-unavailable' };
            return modules.jsSecret.scanSite(args.baseUrl);
        case 'oob_mint':
            if (!modules.oob) return { error: 'oob-unavailable' };
            return modules.oob.mintPayload();
        case 'report_generate': {
            if (!modules.reportGen) return { error: 'report-gen-unavailable' };
            const knowledge = modules.knowledge || { hosts: {} };
            return modules.reportGen.generate({ engagement: args.engagement, target: args.target, knowledge });
        }
        case 'scope_check': {
            if (!modules.bugbounty) return { error: 'bugbounty-unavailable' };
            const prog = await modules.bugbounty.getProgram(args.platform, args.handle);
            if (!prog.ok) return prog;
            return modules.bugbounty.isInScope(args.target, prog.scope, prog.outOfScope);
        }
        default:
            return { error: `unknown-tool:${name}` };
    }
}

// Mode stdio (pour Claude Desktop config)
function runStdio(ctx) {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async chunk => {
        buf += chunk;
        while (true) {
            const nl = buf.indexOf('\n');
            if (nl < 0) break;
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!line) continue;
            try {
                const msg = JSON.parse(line);
                const res = await handleRequest(msg, ctx);
                if (res) process.stdout.write(JSON.stringify(res) + '\n');
            } catch (e) {
                process.stderr.write(`mcp parse-err: ${e.message}\n`);
            }
        }
    });
    process.stderr.write('KeysOsi-Link MCP server ready (stdio)\n');
}

// Mode HTTP : route JSON-RPC au serveur Express
function httpHandler(ctx) {
    return async (req, res) => {
        try {
            const body = req.body;
            const msgs = Array.isArray(body) ? body : [body];
            const results = [];
            for (const m of msgs) {
                const r = await handleRequest(m, ctx);
                if (r) results.push(r);
            }
            res.json(Array.isArray(body) ? results : (results[0] || {}));
        } catch (e) {
            res.status(500).json({ jsonrpc: '2.0', error: { code: -32000, message: e.message } });
        }
    };
}

function listTools() { return TOOLS; }

module.exports = { runStdio, httpHandler, handleRequest, invokeTool, listTools, TOOLS };
