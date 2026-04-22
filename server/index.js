// ════════════════════════════════════════════════════════════════
//  ⚡ AURA HIVE v6.0 "PHANTOM" — CyberSec Meta-Agent Server
// ════════════════════════════════════════════════════════════════
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const https = require('https');
const http = require('http');

// ── Tiny .env loader (cherche server/.env puis frontend/.env.local) ──
(function loadEnv() {
    const candidates = [
        path.resolve(__dirname, '.env'),
        path.resolve(__dirname, '..', '..', 'frontend', '.env.local'),
    ];
    for (const file of candidates) {
        try {
            const raw = fsSync.readFileSync(file, 'utf8');
            for (const line of raw.split(/\r?\n/)) {
                if (!line || line.startsWith('#')) continue;
                const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
                if (m && !process.env[m[1]]) {
                    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
                }
            }
        } catch { /* fichier absent, on passe */ }
    }
})();

const app = express();
const PORT = 3666;
// ── Groq AI Configuration ──
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
app.use(cors());
app.use(express.json({ limit: '50mb' }));
// Racine du projet (3 niveaux au-dessus)
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

// ── v5.0 CyberSec Modules ──
const { knowledgeEngine } = require('./autonomous/knowledge');
const { VulnerabilityScanner } = require('./autonomous/scanner');
const { ReconEngine } = require('./autonomous/recon');
const { ExploitLab } = require('./autonomous/exploit-lab');
const { SecurityMonitor } = require('./autonomous/monitor');
const { AttackClient } = require('./autonomous/attack-client');
const { SwarmOrchestrator } = require('./autonomous/swarm');
const { MemoryStore } = require('./autonomous/memory');
const { ProjectCloner } = require('./autonomous/cloner');
const { EvolutionEngine } = require('./autonomous/evolution');
const { VoiceProcessor } = require('./autonomous/voice');
const sandbox = require('./autonomous/sandbox');
const engagements = require('./engagements');
const reconJobs = require('./recon');
const agentLib = require('./autonomous/agent');
const ragLib = require('./autonomous/rag');
const exploitLib = require('./autonomous/exploit');
const pentestSwarm = require('./autonomous/pentest-swarm');
const synthesize = require('./autonomous/synthesize');
const exploitChain = require('./autonomous/exploitchain');
const trafficAnalyzer = require('./autonomous/trafficAnalyzer');
const playbooks = require('./autonomous/playbooks');
const reflection = require('./autonomous/reflection');
const tools = require('./autonomous/tools');
const memoryLib = require('./autonomous/engagement-memory');
const aiProvider = require('./autonomous/ai-provider');
const aiConfigLib = require('./ai-config');
// ── v6 Phantom modules (15 new capabilities) ──
const cveMapper = require('./autonomous/cve-mapper');
const payloadsLib = require('./autonomous/payloads');
const sessionMgr = require('./autonomous/session-manager');
const oobCollab = require('./autonomous/oob-collaborator');
const wordlistGen = require('./autonomous/wordlist-gen');
const jsSecretScanner = require('./autonomous/js-secret-scanner');
const reportGen = require('./autonomous/report-gen');
const osintLib = require('./autonomous/osint');
const privescLib = require('./autonomous/privesc');
const rateLimiter = require('./autonomous/rate-limiter');
const bugbountyApi = require('./autonomous/bugbounty-api');
const screenshotDvr = require('./autonomous/screenshot-dvr');
const fewshotMemory = require('./autonomous/fewshot-memory');
const replayDvr = require('./autonomous/replay-dvr');
const mcpServer = require('./autonomous/mcp-server');

// Instantiate CyberSec modules
const scanner = new VulnerabilityScanner(PROJECT_ROOT);
const recon = new ReconEngine();
const exploitLab = new ExploitLab();
const securityMonitor = new SecurityMonitor(PROJECT_ROOT);
const attackClient = new AttackClient();
const swarm = new SwarmOrchestrator();
const memory = new MemoryStore({ memoryDir: path.join(PROJECT_ROOT, '.aura-memory') });
const cloner = new ProjectCloner();
const evolution = new EvolutionEngine(PROJECT_ROOT);
const voice = new VoiceProcessor();

// Initialize Memory
memory.init().catch(err => console.error('[MEMORY] Init failed:', err));

// Wire monitor events to terminal log
securityMonitor.on('alert', (alert) => {
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        console.log(`[SECURITY] ${alert.severity}: ${alert.description}`);
    }
});
// ── Puppeteer (optionnel) ──
let puppeteer = null;
try {
    puppeteer = require('puppeteer-core');
} catch (e) { /* Puppeteer non installé — /snapshot dégradé */ }
// ────────────────────────────────────────────
// Commandes whitelistées pour /exec
// ────────────────────────────────────────────
const WHITELISTED_COMMANDS = ['npm', 'npx', 'git', 'ls', 'cat', 'pwd', 'echo', 'node', 'tsc'];
// ────────────────────────────────────────────
// Dossiers/fichiers ignorés pour /tree
// ────────────────────────────────────────────
const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.next', '.turbo', '.vercel',
    '.cache', '.husky', 'dist', 'build', '.output',
    '__pycache__', '.svn', 'coverage', '.nyc_output',
    '.parcel-cache', '.DS_Store', '.aura'
]);
const IGNORED_FILES = new Set([
    '.DS_Store', 'Thumbs.db', '.env', '.env.local',
    '.env.production', '.env.development',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
]);
// ════════════════════════════════════════════
// TERMINAL MANAGEMENT
// ════════════════════════════════════════════
let terminalProcess = null;
let terminalLogs = [];
const MAX_TERMINAL_LOGS = 1000;
let sseClients = [];
function addTerminalLog(text, type = 'info') {
    const lines = text.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
        let logType = type;
        const lower = line.toLowerCase();
        if (lower.includes('error') || lower.includes('failed') || lower.includes('⨯')) logType = 'error';
        else if (lower.includes('warning') || lower.includes('⚠')) logType = 'warning';
        else if (lower.includes('✓') || lower.includes('ready') || lower.includes('compiled') || lower.includes('200')) logType = 'success';
        else if (lower.startsWith('$') || lower.startsWith('>')) logType = 'system';
        const entry = {
            id: Date.now() + Math.random(),
            text: line,
            type: logType,
            timestamp: new Date().toISOString()
        };
        terminalLogs.push(entry);
        if (terminalLogs.length > MAX_TERMINAL_LOGS) {
            terminalLogs = terminalLogs.slice(-MAX_TERMINAL_LOGS);
        }
        // Envoyer aux clients SSE
        sseClients.forEach(client => {
            try { client.write(`data: ${JSON.stringify(entry)}\n\n`); } catch (e) { }
        });
    }
}
// ════════════════════════════════════════════
// DEPENDENCY ANALYSIS
// ════════════════════════════════════════════
async function analyzeDependencies(content, filePath) {
    const deps = new Set();
    const dir = path.dirname(filePath);
    // ES6 import ... from '...'
    const importFromRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"](\.[^'"]+)['"]/g;
    // require('...')
    const requireRegex = /require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
    // CSS @import '...'
    const cssImportRegex = /@import\s+['"](\.[^'"]+)['"]/g;
    const regexes = [importFromRegex, requireRegex, cssImportRegex];
    for (const regex of regexes) {
        let match;
        while ((match = regex.exec(content)) !== null) {
            const depRaw = match[1];
            let resolved = path.normalize(path.join(dir, depRaw)).replace(/\\/g, '/');
            if (path.extname(resolved)) {
                deps.add(resolved);
            } else {
                // Essayer les extensions courantes
                const exts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.mjs'];
                let found = false;
                for (const ext of exts) {
                    try {
                        await fs.access(path.join(PROJECT_ROOT, resolved + ext));
                        deps.add(resolved + ext);
                        found = true;
                        break;
                    } catch { }
                }
                if (!found) {
                    // Essayer /index.*
                    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
                        try {
                            await fs.access(path.join(PROJECT_ROOT, resolved + '/index' + ext));
                            deps.add(resolved + '/index' + ext);
                            break;
                        } catch { }
                    }
                }
            }
        }
    }
    return [...deps];
}
// ════════════════════════════════════════════
// HTML TO MARKDOWN CONVERTER
// ════════════════════════════════════════════
function htmlToMarkdown(html) {
    let md = html;
    md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    md = md.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
    md = md.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
    md = md.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
    md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n');
    md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
    md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
    md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
    md = md.replace(/<\/?[uo]l[^>]*>/gi, '\n');
    md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n');
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<div[^>]*>/gi, '\n');
    md = md.replace(/<\/div>/gi, '');
    md = md.replace(/<[^>]+>/g, '');
    md = md.replace(/&nbsp;/g, ' ');
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    md = md.replace(/&#39;/g, "'");
    md = md.replace(/\n{3,}/g, '\n\n');
    return md.trim();
}
// ════════════════════════════════════════════
// GROQ AI HELPER
// ════════════════════════════════════════════
function groqRequest(messages, model) {
    model = model || GROQ_MODEL;
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 4096,
            stream: false
        });
        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GROQ_API_KEY,
                'Content-Length': Buffer.byteLength(payload)
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('Groq parse error: ' + body.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.setTimeout(60000, () => { req.destroy(); reject(new Error('Groq timeout')); });
        req.write(payload);
        req.end();
    });
}
// ════════════════════════════════════════════
// URL FETCHER
// ════════════════════════════════════════════
function fetchUrlContent(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'AuraLink/3.0' }, timeout: 15000 }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchUrlContent(res.headers.location).then(resolve).catch(reject);
                return;
            }
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}
// ════════════════════════════════════════════
// BANNIÈRE DE DÉMARRAGE
// ════════════════════════════════════════════
function printBanner() {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════════════╗');
    console.log('  ║                                                      ║');
    console.log('  ║   ⚡  KEYSOSI-LINK v6.0 Phantom — Elite Pentester ⚡ ║');
    console.log('  ║                                                      ║');
    console.log('  ╠══════════════════════════════════════════════════════╣');
    console.log(`  ║  🔌  Port      : ${PORT}                                 ║`);
    console.log(`  ║  📂  Projet    : ${(PROJECT_ROOT.length > 30 ? '...' + PROJECT_ROOT.slice(-27) : PROJECT_ROOT).padEnd(30)}    ║`);
    console.log('  ║  🤖  AI        : Groq llama-3.3-70b-versatile        ║');
    console.log('  ║  🛡️   Sécurité  : Whitelist active                    ║');
    console.log(`  ║  📸  Snapshot  : ${puppeteer ? 'Puppeteer ready' : 'Dégradé (pas de puppeteer)'}       ║`);
    console.log('  ║                                                      ║');
    console.log('  ║  Endpoints v3.0 :                                    ║');
    console.log('  ║    POST /read            — Lire + dépendances        ║');
    console.log('  ║    POST /write           — Écrire un fichier         ║');
    console.log('  ║    GET  /tree            — Arborescence              ║');
    console.log('  ║    POST /exec            — Exécuter commande         ║');
    console.log('  ║    POST /read-multiple   — Lecture batch             ║');
    console.log('  ║    POST /dependency-scan — Analyse imports           ║');
    console.log('  ║    GET  /terminal/stream — Terminal SSE              ║');
    console.log('  ║    POST /terminal/start  — Lancer processus          ║');
    console.log('  ║    POST /terminal/stop   — Arrêter processus         ║');
    console.log('  ║    POST /ai/chat         — Groq AI proxy            ║');
    console.log('  ║    POST /fetch-url       — Web-to-Markdown          ║');
    console.log('  ║    GET  /memory          — Project Memory            ║');
    console.log('  ║    POST /memory          — Sauver Memory            ║');
    console.log('  ║    GET  /tasks           — Task Sync                ║');
    console.log('  ║    POST /tasks           — Update Tasks             ║');
    console.log('  ║    POST /snapshot        — Screenshot               ║');
    console.log('  ║                                                      ║');
    console.log('  ╚══════════════════════════════════════════════════════╝');
    console.log('');
}
// ════════════════════════════════════════════
// SCAN DIRECTORY (pour /tree)
// ════════════════════════════════════════════
async function scanDirectory(dirPath, relativePath = '', depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];
    const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });
    for (const entry of sorted) {
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
            if (IGNORED_DIRS.has(entry.name)) continue;
            const children = await scanDirectory(path.join(dirPath, entry.name), entryRelPath, depth + 1, maxDepth);
            result.push({ name: entry.name, path: entryRelPath, type: 'directory', children });
        } else {
            if (IGNORED_FILES.has(entry.name)) continue;
            const ext = path.extname(entry.name).slice(1);
            let size = 0;
            try { const s = await fs.stat(path.join(dirPath, entry.name)); size = s.size; } catch { }
            result.push({ name: entry.name, path: entryRelPath, type: 'file', extension: ext, size });
        }
    }
    return result;
}
// ════════════════════════════════════════════════════════════════
// 1. LIRE UN FICHIER (ENHANCED avec dépendances)
// ════════════════════════════════════════════════════════════════
app.post('/read', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) return res.status(400).json({ success: false, error: 'filePath requis' });
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath))
            return res.status(403).json({ success: false, error: 'Chemin interdit' });
        const fullPath = path.join(PROJECT_ROOT, normalizedPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);
        const ext = path.extname(filePath).slice(1);
        const lines = content.split('\n').length;
        // Analyse des dépendances
        let suggestedFilePaths = [];
        try {
            suggestedFilePaths = await analyzeDependencies(content, normalizedPath);
        } catch (e) { /* ignore */ }
        res.json({
            success: true,
            content,
            suggestedFilePaths,
            meta: {
                path: filePath,
                extension: ext,
                lines,
                size: stats.size,
                modified: stats.mtime.toISOString()
            }
        });
        console.log(`  📖  Lu : ${filePath} (${lines} lignes, ${suggestedFilePaths.length} deps)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  Erreur lecture : ${e.message}`);
    }
});
// ════════════════════════════════════════════
// 2. ÉCRIRE UN FICHIER
// ════════════════════════════════════════════
app.post('/write', async (req, res) => {
    try {
        const { filePath, content } = req.body;
        if (!filePath || content === undefined)
            return res.status(400).json({ success: false, error: 'filePath et content requis' });
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath))
            return res.status(403).json({ success: false, error: 'Chemin interdit' });
        const fullPath = path.join(PROJECT_ROOT, normalizedPath);
        let isNew = true;
        try { await fs.access(fullPath); isNew = false; } catch { }
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
        const lines = content.split('\n').length;
        res.json({
            success: true,
            meta: { path: filePath, lines, size: Buffer.byteLength(content, 'utf-8'), action: isNew ? 'created' : 'updated' }
        });
        console.log(`  ✍️  ${isNew ? 'Créé' : 'Modifié'} : ${filePath} (${lines} lignes)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 3. ARBORESCENCE — /tree
// ════════════════════════════════════════════
app.get('/tree', async (req, res) => {
    try {
        const maxDepth = parseInt(req.query.depth) || 8;
        const subPath = req.query.path || '';
        const normalizedSub = path.normalize(subPath);
        if (normalizedSub.startsWith('..') || path.isAbsolute(normalizedSub))
            return res.status(403).json({ success: false, error: 'Chemin interdit' });
        const targetDir = subPath ? path.join(PROJECT_ROOT, normalizedSub) : PROJECT_ROOT;
        const tree = await scanDirectory(targetDir, subPath, 0, maxDepth);
        function countEntries(nodes) {
            let files = 0, dirs = 0;
            for (const n of nodes) {
                if (n.type === 'directory') { dirs++; const sub = countEntries(n.children); files += sub.files; dirs += sub.dirs; }
                else files++;
            }
            return { files, dirs };
        }
        const stats = countEntries(tree);
        res.json({ success: true, root: PROJECT_ROOT, stats: { totalFiles: stats.files, totalDirectories: stats.dirs, maxDepth }, tree });
        console.log(`  🌳  Arborescence : ${stats.files} fichiers, ${stats.dirs} dossiers`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 4. EXÉCUTER UNE COMMANDE — /exec
// ════════════════════════════════════════════
app.post('/exec', async (req, res) => {
    try {
        const { command } = req.body;
        if (!command || typeof command !== 'string')
            return res.status(400).json({ success: false, error: 'command (string) requis' });
        const parts = command.trim().split(/\s+/);
        const binary = parts[0];
        if (!WHITELISTED_COMMANDS.includes(binary))
            return res.status(403).json({ success: false, error: `"${binary}" non autorisée. Whitelist : ${WHITELISTED_COMMANDS.join(', ')}` });
        const dangerous = ['&&', '||', ';', '|', '`', '$(', 'rm -rf', 'sudo', '>', '>>'];
        for (const p of dangerous) {
            if (command.includes(p))
                return res.status(403).json({ success: false, error: `Pattern dangereux : "${p}"` });
        }
        console.log(`  🚀  Exécution : ${command}`);
        exec(command, { cwd: PROJECT_ROOT, timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
            res.json({ success: !error, command, stdout: stdout || '', stderr: stderr || '', exitCode: error ? error.code || 1 : 0 });
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 5. LECTURE MULTIPLE — /read-multiple
// ════════════════════════════════════════════
app.post('/read-multiple', async (req, res) => {
    try {
        const { filePaths } = req.body;
        if (!Array.isArray(filePaths) || filePaths.length === 0)
            return res.status(400).json({ success: false, error: 'filePaths (array) requis' });
        if (filePaths.length > 30)
            return res.status(400).json({ success: false, error: 'Maximum 30 fichiers' });
        const results = await Promise.allSettled(
            filePaths.map(async (filePath) => {
                const np = path.normalize(filePath);
                if (np.startsWith('..') || path.isAbsolute(np)) throw new Error(`Chemin interdit : ${filePath}`);
                const fullPath = path.join(PROJECT_ROOT, np);
                const content = await fs.readFile(fullPath, 'utf-8');
                const stats = await fs.stat(fullPath);
                return { path: filePath, content, extension: path.extname(filePath).slice(1), lines: content.split('\n').length, size: stats.size };
            })
        );
        const files = results.map((r, i) => r.status === 'fulfilled' ? { success: true, ...r.value } : { success: false, path: filePaths[i], error: r.reason?.message });
        const ok = files.filter(f => f.success).length;
        res.json({ success: true, totalRequested: filePaths.length, totalRead: ok, totalFailed: filePaths.length - ok, files });
        console.log(`  📚  Lecture multiple : ${ok}/${filePaths.length}`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 6. DEPENDENCY SCAN — /dependency-scan
// ════════════════════════════════════════════
app.post('/dependency-scan', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) return res.status(400).json({ success: false, error: 'filePath requis' });
        const np = path.normalize(filePath);
        if (np.startsWith('..') || path.isAbsolute(np))
            return res.status(403).json({ success: false, error: 'Chemin interdit' });
        const fullPath = path.join(PROJECT_ROOT, np);
        const content = await fs.readFile(fullPath, 'utf-8');
        const dependencies = await analyzeDependencies(content, np);
        // Scan recursif profondeur 2
        const deepDeps = new Set(dependencies);
        for (const dep of dependencies) {
            try {
                const depContent = await fs.readFile(path.join(PROJECT_ROOT, dep), 'utf-8');
                const subDeps = await analyzeDependencies(depContent, dep);
                subDeps.forEach(d => deepDeps.add(d));
            } catch { }
        }
        res.json({
            success: true,
            filePath,
            directDependencies: dependencies,
            allDependencies: [...deepDeps],
            totalDirect: dependencies.length,
            totalDeep: deepDeps.size
        });
        console.log(`  🧠  Scan deps : ${filePath} → ${dependencies.length} direct, ${deepDeps.size} total`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 7. TERMINAL SSE — /terminal/stream
// ════════════════════════════════════════════
app.get('/terminal/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    // Envoyer les logs existants
    terminalLogs.forEach(log => {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
    });
    sseClients.push(res);
    console.log(`  📡  SSE client connecté (total: ${sseClients.length})`);
    req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
        console.log(`  📡  SSE client déconnecté (total: ${sseClients.length})`);
    });
});
// ════════════════════════════════════════════
// 8. TERMINAL START — /terminal/start
// ════════════════════════════════════════════
app.post('/terminal/start', (req, res) => {
    try {
        const { command } = req.body;
        const cmd = command || 'npm run dev';
        if (terminalProcess) {
            return res.status(400).json({ success: false, error: 'Un processus tourne déjà. Stoppez-le d\'abord.' });
        }
        const parts = cmd.split(/\s+/);
        const binary = parts[0];
        if (!WHITELISTED_COMMANDS.includes(binary)) {
            return res.status(403).json({ success: false, error: `"${binary}" non autorisée` });
        }
        addTerminalLog(`$ ${cmd}`, 'system');
        const isWindows = process.platform === 'win32';
        terminalProcess = spawn(isWindows ? 'cmd' : 'sh', [isWindows ? '/c' : '-c', cmd], {
            cwd: PROJECT_ROOT,
            env: { ...process.env, FORCE_COLOR: '0' }
        });
        terminalProcess.stdout.on('data', (data) => addTerminalLog(data.toString()));
        terminalProcess.stderr.on('data', (data) => addTerminalLog(data.toString(), 'error'));
        terminalProcess.on('close', (code) => {
            addTerminalLog(`Processus terminé (code ${code})`, code === 0 ? 'success' : 'error');
            terminalProcess = null;
        });
        terminalProcess.on('error', (err) => {
            addTerminalLog(`Erreur processus: ${err.message}`, 'error');
            terminalProcess = null;
        });
        res.json({ success: true, message: `Processus "${cmd}" lancé`, pid: terminalProcess.pid });
        console.log(`  🖥️  Terminal lancé : ${cmd} (PID: ${terminalProcess.pid})`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 9. TERMINAL STOP — /terminal/stop
// ════════════════════════════════════════════
app.post('/terminal/stop', (req, res) => {
    if (!terminalProcess) {
        return res.json({ success: true, message: 'Aucun processus en cours' });
    }
    try {
        terminalProcess.kill('SIGTERM');
        addTerminalLog('Processus arrêté par l\'utilisateur', 'system');
        terminalProcess = null;
        res.json({ success: true, message: 'Processus arrêté' });
        console.log('  🛑  Terminal arrêté');
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 10. TERMINAL LOGS (polling fallback) — /terminal/logs
// ════════════════════════════════════════════
app.get('/terminal/logs', (req, res) => {
    const since = parseInt(req.query.since) || 0;
    const logs = since ? terminalLogs.filter(l => l.id > since) : terminalLogs.slice(-100);
    res.json({
        success: true,
        running: !!terminalProcess,
        totalLogs: terminalLogs.length,
        logs
    });
});
// ════════════════════════════════════════════
// 11. GROQ AI CHAT — /ai/chat
// ════════════════════════════════════════════
app.post('/ai/chat', async (req, res) => {
    try {
        const { messages, model, context } = req.body;
        if (!messages || !Array.isArray(messages))
            return res.status(400).json({ success: false, error: 'messages (array) requis' });
        // Construire les messages avec contexte optionnel
        let systemMessages = [];
        if (context) {
            systemMessages.push({
                role: 'system',
                content: `Tu es un assistant développeur expert intégré dans KeysOsi-Link, un outil de développement. Voici le contexte du projet :\n\n${context}\n\nRéponds de manière concise, technique et actionnable. Utilise du markdown avec des blocs de code quand pertinent.`
            });
        } else {
            systemMessages.push({
                role: 'system',
                content: 'Tu es un assistant développeur expert intégré dans KeysOsi-Link. Réponds de manière concise, technique et actionnable. Utilise du markdown avec des blocs de code quand pertinent.'
            });
        }
        const allMessages = [...systemMessages, ...messages];
        const result = await groqRequest(allMessages, model);
        if (result.error) {
            return res.status(500).json({ success: false, error: result.error.message || 'Groq API error' });
        }
        const reply = result.choices?.[0]?.message?.content || 'Pas de réponse';
        res.json({
            success: true,
            reply,
            model: result.model,
            usage: result.usage
        });
        console.log(`  🤖  AI Chat : ${messages.length} msgs → ${reply.length} chars`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  AI Error : ${e.message}`);
    }
});
// ════════════════════════════════════════════
// 12. FETCH URL — /fetch-url
// ════════════════════════════════════════════
app.post('/fetch-url', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, error: 'url requis' });
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
        console.log(`  🌐  Fetching : ${cleanUrl}`);
        const html = await fetchUrlContent(cleanUrl);
        const markdown = htmlToMarkdown(html);
        // Extraire le titre
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : new URL(cleanUrl).hostname;
        res.json({
            success: true,
            url: cleanUrl,
            title,
            markdown,
            rawLength: html.length,
            markdownLength: markdown.length
        });
        console.log(`  🌐  Converti : ${title} (${html.length} → ${markdown.length} chars)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 13. PROJECT MEMORY — /memory
// ════════════════════════════════════════════
const MEMORY_PATH = path.join(PROJECT_ROOT, '.aura', 'memory.md');
const DEFAULT_MEMORY = `# 🧠 KeysOsi-Link — Project Memory
## Stack Technique
- **Framework**: [À compléter]
- **Styling**: [À compléter]
- **Language**: [À compléter]
## Architecture
- Décrivez la structure de votre projet ici.
## Conventions
- Décrivez vos conventions de code ici.
## Notes
- Ajoutez des notes importantes pour l'IA ici.
`;
app.get('/memory', async (req, res) => {
    try {
        let content;
        try {
            content = await fs.readFile(MEMORY_PATH, 'utf-8');
        } catch {
            // Créer le fichier par défaut
            await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
            await fs.writeFile(MEMORY_PATH, DEFAULT_MEMORY, 'utf-8');
            content = DEFAULT_MEMORY;
        }
        res.json({ success: true, content, path: '.aura/memory.md' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
app.post('/memory', async (req, res) => {
    try {
        const { content } = req.body;
        if (content === undefined) return res.status(400).json({ success: false, error: 'content requis' });
        await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
        await fs.writeFile(MEMORY_PATH, content, 'utf-8');
        res.json({ success: true, message: 'Memory sauvegardée', lines: content.split('\n').length });
        console.log(`  🧠  Memory sauvegardée (${content.split('\n').length} lignes)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 14. TASK SYNC — /tasks
// ════════════════════════════════════════════
const TASK_PATH = path.join(PROJECT_ROOT, 'task.md');
app.get('/tasks', async (req, res) => {
    try {
        let content;
        try {
            content = await fs.readFile(TASK_PATH, 'utf-8');
        } catch {
            content = '# Tasks\n\n- [ ] Première tâche\n';
            await fs.writeFile(TASK_PATH, content, 'utf-8');
        }
        // Parser les tâches markdown
        const tasks = [];
        const lines = content.split('\n');
        for (const line of lines) {
            const taskMatch = line.match(/^-\s*\[([ xX])\]\s*(.+)$/);
            if (taskMatch) {
                tasks.push({
                    id: tasks.length.toString(),
                    done: taskMatch[1] !== ' ',
                    text: taskMatch[2].trim(),
                    raw: line
                });
            }
        }
        res.json({ success: true, content, tasks, totalTasks: tasks.length, completedTasks: tasks.filter(t => t.done).length });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
app.post('/tasks', async (req, res) => {
    try {
        const { content } = req.body;
        if (content === undefined) return res.status(400).json({ success: false, error: 'content requis' });
        await fs.writeFile(TASK_PATH, content, 'utf-8');
        res.json({ success: true, message: 'Tasks sauvegardées' });
        console.log(`  ✅  Tasks sauvegardées`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 15. SNAPSHOT — /snapshot
// ════════════════════════════════════════════
app.post('/snapshot', async (req, res) => {
    try {
        const { url, viewport } = req.body;
        const targetUrl = url || 'http://localhost:3000';
        const vp = viewport || { width: 1920, height: 1080 };
        if (!puppeteer) {
            return res.status(501).json({
                success: false,
                error: 'Puppeteer non installé. Exécutez: npm install puppeteer-core',
                fallback: true
            });
        }
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport(vp);
        await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
        const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
        await browser.close();
        res.json({
            success: true,
            screenshot: `data:image/png;base64,${screenshot}`,
            url: targetUrl,
            viewport: vp,
            timestamp: new Date().toISOString()
        });
        console.log(`  📸  Screenshot : ${targetUrl} (${vp.width}x${vp.height})`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
// ════════════════════════════════════════════
// 16. HEALTH CHECK — /status
// ════════════════════════════════════════════
app.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'KeysOsi-Link — Elite Autonomous Pentester',
        version: '3.0.0',
        port: PORT,
        projectRoot: PROJECT_ROOT,
        uptime: Math.floor(process.uptime()),
        features: {
            ai: 'Groq ' + GROQ_MODEL,
            terminal: !!terminalProcess ? 'running' : 'stopped',
            terminalLogs: terminalLogs.length,
            sseClients: sseClients.length,
            snapshot: !!puppeteer
        },
        whitelistedCommands: WHITELISTED_COMMANDS
    });
});
// ════════════════════════════════════════════
// 17. REMOTE CONTROL (PROJECT PUPPETEER)
// ════════════════════════════════════════════
let remoteStreamClients = [];
let commandQueue = [];

// SSE Stream for Extension
app.get('/remote/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    remoteStreamClients.push(res);
    console.log(`  🎮  Remote Client Connected (Total: ${remoteStreamClients.length})`);

    // Send keepalive
    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 15000);

    req.on('close', () => {
        clearInterval(keepAlive);
        remoteStreamClients = remoteStreamClients.filter(c => c !== res);
        console.log(`  🎮  Remote Client Disconnected`);
    });
});

// Push Command (from IDE/Antigravity)
app.post('/remote/push', (req, res) => {
    try {
        const { action, selector, value, id } = req.body;
        if (!action) return res.status(400).json({ success: false, error: 'action required' });

        const command = {
            id: id || Date.now().toString(),
            action,
            selector,
            value,
            timestamp: Date.now()
        };

        // Broadcast to all connected extensions
        remoteStreamClients.forEach(client => {
            client.write(`event: command\n`);
            client.write(`data: ${JSON.stringify(command)}\n\n`);
        });

        console.log(`  🚀  Command Pushed: ${action} -> [Extension]`);
        res.json({ success: true, message: 'Command pushed', command });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Receive Result (from Extension)
app.post('/remote/result', (req, res) => {
    const { id, result, status, error } = req.body;
    console.log(`  📬  Result [${id}] (${status}): ${status === 'success' ? (result ? result.substring(0, 50) + '...' : 'OK') : error}`);
    // Here we could store results in a buffer for polling, but for now just logging is fine
    // or broadcasting to a 'control' stream if we had one for the IDE.
    res.json({ success: true });
});

// ════════════════════════════════════════════
// ════════════════════════════════════════════
// 19. AURA HIVE v4.0 (META-AGENT MANAGER)
// ════════════════════════════════════════════
console.log('Loading Brain module...');
const brainModule = require('./autonomous/brain');
console.log('Brain Module Type:', typeof brainModule);
console.log('Brain Module Keys:', Object.keys(brainModule));
const { decideNextStep } = brainModule;
const { executeCode } = require('./autonomous/executor');

const LOOP_STATE = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    STOPPED: 'STOPPED'
};

let loopContext = {
    state: LOOP_STATE.IDLE,
    goal: '',
    currentStep: 0,
    maxSteps: 10,
    history: [],
    lastActionTime: 0
};

// Start Hive
app.post('/autonomous/start', async (req, res) => {
    const { goal, maxSteps } = req.body;
    if (!goal) return res.status(400).json({ success: false, error: 'goal required' });

    loopContext = {
        state: LOOP_STATE.RUNNING,
        goal,
        currentStep: 1,
        maxSteps: maxSteps || 10,
        history: [],
        lastActionTime: Date.now()
    };

    console.log(`  🧠  Hive Activated: "${goal}"`);

    // Initial Brain Decision
    const decision = await decideNextStep({
        goal,
        currentStep: 0,
        history: [],
        lastCode: null,
        lastError: null
    });

    if (decision.next_action === 'INPUT') {
        pushCommandToExtension('input', decision.prompt_for_drone);
        res.json({ success: true, message: 'Hive Started', decision });
    } else {
        res.json({ success: false, message: 'Brain refused to start', decision });
    }
});

// Stop Hive
app.post('/autonomous/stop', (req, res) => {
    loopContext.state = LOOP_STATE.STOPPED;
    console.log(`  ⏹️  Hive STOPPED`);
    res.json({ success: true, message: 'Hive stopped' });
});

// Hive Feedback Loop
app.post('/autonomous/feedback', async (req, res) => {
    const { code, logs, status, id } = req.body; // id from cmd to track steps

    if (loopContext.state !== LOOP_STATE.RUNNING) {
        return res.json({ success: false, message: 'Hive not running' });
    }

    console.log(`  🐝  Drone Returned (Step ${loopContext.currentStep})`);

    // 1. Save File
    let lastError = null;
    let savedFile = null;

    if (code) {
        const targetFile = extractFileName(code) || `hive_step_${loopContext.currentStep}.js`;
        savedFile = targetFile;
        const fullPath = path.join(PROJECT_ROOT, targetFile);

        try {
            await fs.writeFile(fullPath, code, 'utf-8');
            console.log(`  💾  Saved: ${targetFile}`);

            // 2. Execute (The Reality Check)
            console.log(`  ⚙️  Verifying...`);
            const execResult = await executeCode(fullPath);

            if (!execResult.success) {
                lastError = execResult.logs;
                console.log(`  ❌  Verification Failed: ${lastError.substring(0, 50)}...`);
            } else {
                console.log(`  ✅  Verification Passed`);
            }

        } catch (e) {
            lastError = `Save Error: ${e.message}`;
        }
    } else {
        lastError = "No code extracted from response.";
    }

    // 3. Update History
    loopContext.history.push({
        step: loopContext.currentStep,
        file: savedFile,
        status: lastError ? 'error' : 'success',
        error: lastError
    });

    // 4. Brain Decides Next Move
    loopContext.currentStep++;

    if (loopContext.currentStep > loopContext.maxSteps) {
        loopContext.state = LOOP_STATE.STOPPED;
        return res.json({ success: true, action: 'stop', message: 'Max steps reached' });
    }

    // Brain needs recent context
    const decision = await decideNextStep({
        goal: loopContext.goal,
        currentStep: loopContext.currentStep,
        history: loopContext.history,
        lastCode: code,
        lastError: lastError
    });

    console.log(`  🧠  Brain Decision: ${decision.next_action.toUpperCase()} -> "${decision.analysis}"`);

    if (decision.next_action === 'INPUT') {
        const nextPrompt = decision.prompt_for_drone;
        // Safety delay
        setTimeout(() => {
            pushCommandToExtension('input', nextPrompt);
        }, 1000);
    } else {
        loopContext.state = LOOP_STATE.STOPPED;
        console.log("  🛑  Brain decided to STOP.");
    }

    res.json({ success: true, context: loopContext, decision });
});

function pushCommandToExtension(action, value) {
    const command = {
        id: `hive-${Date.now()}`,
        action,
        value,
        timestamp: Date.now()
    };
    remoteStreamClients.forEach(client => {
        client.write(`event: command\n`);
        client.write(`data: ${JSON.stringify(command)}\n\n`);
    });
}

function extractFileName(code) {
    const match = code.match(/\/\/\s*(?:file|filename|path):\s*([^\n]+)/i);
    return match ? match[1].trim() : null;
}

// ════════════════════════════════════════════
// 20. ROOT — /
// ════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// 🔐 v5.0 — CYBERSEC ENDPOINTS
// ════════════════════════════════════════════════════════════════

// ── KNOWLEDGE ENGINE ──
app.get('/knowledge/search', (req, res) => {
    const results = knowledgeEngine.search(req.query.q || '');
    res.json({ success: true, query: req.query.q, results });
});
app.get('/knowledge/owasp/:id', (req, res) => {
    const entry = knowledgeEngine.getOWASP(req.params.id);
    res.json(entry ? { success: true, data: entry } : { success: false, error: 'Not found' });
});
app.get('/knowledge/mitre/:id', (req, res) => {
    const entry = knowledgeEngine.getMITRE(req.params.id);
    res.json(entry ? { success: true, data: entry } : { success: false, error: 'Not found' });
});
app.get('/knowledge/checklist/:type', (req, res) => {
    const checklist = knowledgeEngine.getChecklist(req.params.type);
    res.json(checklist ? { success: true, data: checklist } : { success: false, error: 'Not found' });
});
app.get('/knowledge/cheatsheet/:name', (req, res) => {
    const sheet = knowledgeEngine.getCheatsheet(req.params.name);
    res.json(sheet ? { success: true, data: sheet } : { success: false, error: 'Not found' });
});
app.get('/knowledge/stats', (req, res) => {
    res.json({ success: true, stats: knowledgeEngine.getStats() });
});
app.post('/knowledge/enrich', (req, res) => {
    const enrichments = knowledgeEngine.enrichContext(req.body.context || {});
    res.json({ success: true, enrichments });
});

// ── VULNERABILITY SCANNER ──
app.post('/security/scan', async (req, res) => {
    try {
        const options = req.body || {};
        const report = await scanner.scanProject(options);
        res.json({ success: true, report });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/security/scan-file', async (req, res) => {
    try {
        const filePath = path.join(PROJECT_ROOT, req.body.file);
        const findings = await scanner.scanFile(filePath);
        res.json({ success: true, file: req.body.file, findings, count: findings.length });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.get('/security/report', (req, res) => {
    const report = scanner.getLastReport();
    res.json(report ? { success: true, report } : { success: false, error: 'No scan reports yet' });
});
app.get('/security/history', (req, res) => {
    res.json({ success: true, history: scanner.getHistory() });
});

// ── OSINT RECON ──
app.post('/recon/scan', async (req, res) => {
    try {
        const { target, modules, ports, timeout, maxSubdomains } = req.body;
        if (!target) return res.json({ success: false, error: 'Target required' });
        const report = await recon.fullScan(target, { modules, ports, timeout, maxSubdomains });
        res.json({ success: true, report });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/dns', async (req, res) => {
    try {
        const result = await recon.dnsEnum(req.body.target);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/portscan', async (req, res) => {
    try {
        const { target, ports, timeout } = req.body;
        const result = await recon.portScan(target, ports, timeout);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/headers', async (req, res) => {
    try {
        const result = await recon.analyzeHeaders(req.body.target);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/ssl', async (req, res) => {
    try {
        const result = await recon.analyzeSsl(req.body.target);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/tech', async (req, res) => {
    try {
        const result = await recon.detectTech(req.body.target);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/recon/subdomains', async (req, res) => {
    try {
        const { target, max } = req.body;
        const result = await recon.enumerateSubdomains(target, max);
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.get('/recon/history', (req, res) => {
    res.json({ success: true, history: recon.getHistory() });
});

// ── EXPLOIT LAB ──
app.post('/exploit/generate', (req, res) => {
    try {
        const { type, subcategory, context } = req.body;
        if (!type) return res.json({ success: false, error: 'Type required (xss, sqli, ssrf, cmdi, csrf, jwt, ssti, redirect)' });
        const result = exploitLab.generate(type, { subcategory, context });
        res.json({ success: true, result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.get('/exploit/library', (req, res) => {
    res.json({ success: true, library: exploitLab.getLibrary() });
});
app.get('/exploit/report/:id', (req, res) => {
    const report = exploitLab.generateReport(req.params.id);
    res.json(report ? { success: true, report } : { success: false, error: 'Exploit not found' });
});
app.get('/exploit/history', (req, res) => {
    res.json({ success: true, history: exploitLab.getHistory() });
});

// ── SECURITY MONITOR ──
app.post('/monitor/start', async (req, res) => {
    try {
        const result = await securityMonitor.start();
        res.json({ success: true, ...result });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});
app.post('/monitor/stop', (req, res) => {
    const result = securityMonitor.stop();
    res.json({ success: true, ...result });
});
app.get('/monitor/status', (req, res) => {
    res.json({ success: true, ...securityMonitor.getStats() });
});
app.get('/monitor/alerts', (req, res) => {
    const { severity, type, limit, since } = req.query;
    const alerts = securityMonitor.getAlerts({ severity, type, limit: parseInt(limit) || 100, since });
    res.json({ success: true, alerts, count: alerts.length });
});
app.get('/monitor/dashboard', (req, res) => {
    res.json({ success: true, ...securityMonitor.getDashboard() });
});
app.get('/monitor/stream', (req, res) => {
    securityMonitor.addSSEClient(res);
});

// ════════════════════════════════════════════
// ROOT — v5.0 Dashboard
// ════════════════════════════════════════════
app.get('/', (req, res) => {
    const monitorStats = securityMonitor.getStats();
    res.send(`
        <html>
        <body style="background:#0d0d12;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;">
            <div style="font-size:50px;">🔐</div>
            <h1 style="margin:10px 0;background:linear-gradient(135deg,#e11d48,#ff6b3c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Aura Hive v5.0 — Shadow Ops</h1>
            <p style="opacity:0.3;">CyberSec Meta-Agent • Port ${PORT}</p>
            <div style="margin-top:20px;padding:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;font-family:monospace;font-size:12px;line-height:2;">
                STATUS: <span style="color:#22c55e;">ONLINE</span><br>
                VERSION: 5.0.0 (Shadow Ops)<br>
                AI: Groq ${GROQ_MODEL}<br>
                TERMINAL: ${terminalProcess ? '<span style="color:#22c55e;">RUNNING</span>' : '<span style="color:#666;">STOPPED</span>'}<br>
                MONITOR: ${monitorStats.is_running ? '<span style="color:#22c55e;">ACTIVE</span>' : '<span style="color:#e11d48;">INACTIVE</span>'}<br>
                ALERTS: ${monitorStats.total_alerts} | ATTACKS: ${monitorStats.attacks_detected}<br>
                SSE CLIENTS: ${sseClients.length}
            </div>
            <div style="margin-top:10px;padding:15px;background:rgba(225,29,72,0.05);border:1px solid rgba(225,29,72,0.15);border-radius:10px;font-family:monospace;font-size:11px;line-height:1.8;color:#f87171;">
                🛡️ Scanner • 🕷️ Recon • 🧬 Exploit Lab • 🔐 Monitor • 📚 Knowledge
            </div>
        </body>
        </html>
    `);
});
// ════════════════════════════════════════════════════════════════
//  🚀 v6.0 PHANTOM ENDPOINTS
// ════════════════════════════════════════════════════════════════

// ── ONLINE ATTACK CLIENT ──
app.post('/attack/start', async (req, res) => {
    try {
        const { target, type, options } = req.body;
        if (!target) return res.json({ success: false, error: 'Target required' });

        let result;
        if (type === 'fuzz') result = await attackClient.fuzzParams(target, options);
        else if (type === 'crawl') result = await attackClient.deepCrawl(target, options);
        else if (type === 'brute') result = await attackClient.bruteForceDirs(target, options);
        else if (type === 'auto') result = await attackClient.autoExploit(target, options);
        else result = await attackClient.detectWAF(target);

        res.json({ success: true, result });
    } catch (err) { res.json({ success: false, error: err.message }); }
});

// ── SWARM AI ──
app.post('/swarm/mission', (req, res) => {
    const { goal, strategy, features, code } = req.body;
    const mission = swarm.createMission(goal, { strategy, features, code });
    const start = swarm.startMission(mission.id);
    res.json({ success: true, mission, start });
});
app.post('/swarm/result', (req, res) => {
    const { taskId, result } = req.body; // Drones call this
    const status = swarm.reportResult(taskId, result);
    res.json(status);
});
app.get('/swarm/status', (req, res) => res.json(swarm.getStatus()));
app.get('/swarm/register', (req, res) => {
    const { id, platform } = req.query;
    const drone = swarm.registerDrone(id, platform);
    res.json({ success: true, drone });
});

// ── PERSISTENT MEMORY ──
app.post('/memory/query', (req, res) => {
    const { q } = req.body;
    const results = memory.search(q);
    res.json({ success: true, results });
});
app.post('/memory/learn', async (req, res) => {
    const { type, data } = req.body;
    if (type === 'error') await memory.rememberError(data.error, data.fix, data.context);
    else if (type === 'solution') await memory.rememberSolution(data.problem, data.solution, data.meta);
    res.json({ success: true });
});
app.get('/memory/stats', (req, res) => res.json(memory.getStats()));

// ── PROJECT CLONER (REVERSE ENGINEER) ──
app.post('/cloner/analyze', async (req, res) => {
    const { url, maxPages } = req.body;
    const analysis = await cloner.analyzeWebsite(url, { maxPages });
    res.json({ success: true, analysis });
});

// ── AUTO-CODE EVOLUTION ──
app.get('/evolution/health', async (req, res) => {
    const report = await evolution.analyzeHealth();
    const improvements = await evolution.generateImprovements(report);
    res.json({ success: true, report, improvements });
});
app.post('/evolution/benchmark', async (req, res) => {
    const { script } = req.body;
    const result = await evolution.benchmark(script);
    res.json({ success: true, result });
});

// ── VOICE COMMANDS ──
app.post('/voice/command', (req, res) => {
    const { text } = req.body;
    const result = voice.process(text);

    // Execute command if simple
    if (result.success && result.intent === 'START_HIVE') {
        console.log('VOICE: Starting Hive Mission...');
    }

    res.json(result);
});

// ════════════════════════════════════════════
// SANDBOX LAB — Kali Docker terminal
// ════════════════════════════════════════════

// Terminal HTML page — embedded in an iframe by the Chrome extension.
// Loads xterm.js from CDN (localhost origin = no CSP conflict with host pages).
const TERMINAL_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"/>
<title>Aura Lab — Terminal</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css"/>
<style>
 html,body{margin:0;padding:0;height:100%;background:#0a0d14;color:#e8eaed;font-family:'JetBrains Mono',Menlo,Consolas,monospace;overflow:hidden}
 #bar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:linear-gradient(180deg,#131826,#0e1320);border-bottom:1px solid rgba(255,255,255,0.06);font-size:11px}
 #bar b{color:#ffb86b;letter-spacing:1px}
 #dot{width:9px;height:9px;border-radius:50%;background:#d32f2f;box-shadow:0 0 8px rgba(211,47,47,0.6)}
 #dot.ok{background:#3ddc84;box-shadow:0 0 8px rgba(61,220,132,0.7)}
 #bar .spacer{flex:1}
 #bar button{background:transparent;border:1px solid rgba(255,255,255,0.1);color:#cfd3da;border-radius:6px;padding:4px 10px;font:inherit;font-size:10px;cursor:pointer;letter-spacing:0.5px}
 #bar button:hover{border-color:#ffb86b;color:#ffb86b}
 #term{width:100vw;height:calc(100vh - 35px)}
 .msg{padding:20px;color:#ff9a6b;font-size:12px;line-height:1.6}
 .msg code{color:#ffd86b;background:rgba(255,216,107,0.08);padding:1px 6px;border-radius:3px;font-size:11px}
</style>
</head><body>
<div id="bar">
  <span id="dot"></span>
  <b>KEYSOSI LAB</b>
  <span id="hint" style="color:#8a90a0">Connexion...</span>
  <span class="spacer"></span>
  <button onclick="window.parent.postMessage({type:'aura-lab-close'},'*')">Fermer</button>
</div>
<div id="term"></div>
<script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js"></script>
<script>
(() => {
  const dot = document.getElementById('dot');
  const hint = document.getElementById('hint');
  const termEl = document.getElementById('term');

  if (!window.Terminal) {
    termEl.innerHTML = '<div class="msg">Chargement xterm.js impossible (hors ligne ?). Relance le serveur avec connexion internet pour la premiere utilisation.</div>';
    return;
  }

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 13,
    fontFamily: "'JetBrains Mono', Menlo, Consolas, monospace",
    theme: {
      background: '#0a0d14',
      foreground: '#e8eaed',
      cursor: '#ffb86b',
      black: '#1a1f2e', red: '#ff5f6d', green: '#3ddc84',
      yellow: '#ffd86b', blue: '#6bb2ff', magenta: '#c678dd',
      cyan: '#56b6c2', white: '#cfd3da'
    }
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(termEl);
  fit.fit();
  term.focus();

  const wsUrl = 'ws://' + location.host + '/sandbox/ws?cols=' + term.cols + '&rows=' + term.rows;
  let ws = null;

  function connect() {
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      dot.classList.add('ok');
      hint.textContent = 'Connecte';
      hint.style.color = '#3ddc84';
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'data') term.write(msg.data);
        else if (msg.type === 'error') term.write('\\r\\n\\x1b[31m[ERREUR] ' + msg.data + '\\x1b[0m\\r\\n');
        else if (msg.type === 'exit') term.write('\\r\\n\\x1b[33m[Session terminee — code ' + msg.exitCode + ']\\x1b[0m\\r\\n');
      } catch {}
    };
    ws.onclose = () => {
      dot.classList.remove('ok');
      hint.textContent = 'Deconnecte — rafraichir pour reconnecter';
      hint.style.color = '#ff8a7a';
    };
    ws.onerror = () => {
      hint.textContent = 'Erreur WebSocket';
      hint.style.color = '#ff5f6d';
    };
  }

  term.onData(data => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });

  window.addEventListener('resize', () => {
    fit.fit();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  });

  connect();
})();
</script>
</body></html>`;

app.get('/terminal.html', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(TERMINAL_HTML);
});

app.get('/sandbox/status', async (_req, res) => {
    try {
        const status = await sandbox.getStatus();
        res.json({ success: true, ...status });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/start', async (req, res) => {
    try {
        const persistent = req.body?.persistent !== false;
        const result = await sandbox.startSandbox({ persistent });
        res.json(result);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/stop', async (_req, res) => {
    try { res.json(await sandbox.stopSandbox()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/reset', async (_req, res) => {
    try { res.json(await sandbox.resetSandbox()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── Vulnerable targets stack (DVWA, Juice Shop, Mutillidae, Metasploitable, WebGoat) ──
app.get('/sandbox/targets/status', async (_req, res) => {
    try { res.json({ success: true, ...(await sandbox.targetsStatus()) }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/targets/up', async (_req, res) => {
    try { res.json(await sandbox.startTargets()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/targets/down', async (_req, res) => {
    try { res.json(await sandbox.stopTargets()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── MITM proxy ──
app.get('/sandbox/proxy/status', async (_req, res) => {
    try { res.json({ success: true, ...(await sandbox.proxyStatus()) }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/proxy/start', async (_req, res) => {
    try { res.json(await sandbox.startProxy()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/sandbox/proxy/stop', async (_req, res) => {
    try { res.json(await sandbox.stopProxy()); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ══════════════════════════════════════════════
// ENGAGEMENTS — scope + findings + notes
// ══════════════════════════════════════════════
app.get('/engagements', async (_req, res) => {
    try { res.json({ success: true, ...(await engagements.list()) }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/engagements', async (req, res) => {
    try { res.json({ success: true, engagement: await engagements.create(req.body || {}) }); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.get('/engagements/active', async (_req, res) => {
    try { res.json({ success: true, engagement: await engagements.getActive() }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/engagements/active', async (req, res) => {
    try { res.json({ success: true, active: await engagements.setActive(req.body?.slug || null) }); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.get('/engagements/:slug', async (req, res) => {
    try {
        const e = await engagements.get(req.params.slug);
        if (!e) return res.status(404).json({ success: false, error: 'Introuvable' });
        res.json({ success: true, engagement: e });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.put('/engagements/:slug', async (req, res) => {
    try { res.json({ success: true, engagement: await engagements.update(req.params.slug, req.body || {}) }); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.delete('/engagements/:slug', async (req, res) => {
    try { res.json(await engagements.remove(req.params.slug)); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.post('/engagements/:slug/findings', async (req, res) => {
    try { res.json({ success: true, finding: await engagements.addFinding(req.params.slug, req.body || {}) }); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.delete('/engagements/:slug/findings/:id', async (req, res) => {
    try { res.json(await engagements.removeFinding(req.params.slug, req.params.id)); }
    catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.get('/engagements/:slug/report', async (req, res) => {
    try {
        const md = await engagements.generateReport(req.params.slug);
        if (req.query.download === '1') {
            res.set('Content-Type', 'text/markdown; charset=utf-8');
            res.set('Content-Disposition', `attachment; filename="${req.params.slug}-report.md"`);
            return res.send(md);
        }
        res.json({ success: true, markdown: md });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ══════════════════════════════════════════════
// RECON — jobs (subfinder, httpx, nuclei, headers, whatweb, nmap, screenshot)
// ══════════════════════════════════════════════
app.post('/recon/start', async (req, res) => {
    try {
        const { type, target, engagement } = req.body || {};
        let engSlug = engagement;
        if (!engSlug) {
            const active = await engagements.getActive();
            engSlug = active?.slug || null;
        }
        const job = await reconJobs.startJob({ type, target, engagementSlug: engSlug });
        res.json({ success: true, job });
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});
app.get('/recon/jobs', (req, res) => {
    try {
        const engSlug = req.query.engagement || null;
        res.json({ success: true, jobs: reconJobs.listJobs({ engagementSlug: engSlug }) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.get('/recon/jobs/:id', (req, res) => {
    const job = reconJobs.getJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job introuvable' });
    res.json({ success: true, job });
});
app.post('/recon/screenshot', async (req, res) => {
    try {
        const { target, dataUrl, engagement } = req.body || {};
        let engSlug = engagement;
        if (!engSlug) {
            const active = await engagements.getActive();
            engSlug = active?.slug || null;
        }
        const result = await reconJobs.saveScreenshot({ target, dataUrl, engagementSlug: engSlug });
        res.json(result);
    } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// ══════════════════════════════════════════════
// AGENT — orchestrateur pentest autonome (LLM + tools + memoire)
// ══════════════════════════════════════════════
app.post('/agent/start', async (req, res) => {
    try {
        const { target, mode = 'recon-only', goal = '', engagement, orchestrated = false, exploitUnlocked = false } = req.body || {};
        if (!target) return res.status(400).json({ success: false, error: 'target requis' });
        let engSlug = engagement;
        if (!engSlug) {
            const active = await engagements.getActive();
            engSlug = active?.slug || null;
        }
        const agent = agentLib.createAgent({ target, engagementSlug: engSlug, mode, goal, orchestrated, exploitUnlocked });
        // Lance en background (la boucle est async)
        agent.start().catch(e => console.error('[AGENT]', e));
        res.json({ success: true, id: agent.id, snapshot: agent.snapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Deverrouille le mode exploit pour un agent en cours
app.post('/agent/:id/unlock-exploit', (req, res) => {
    const a = agentLib.getAgent(req.params.id);
    if (!a) return res.status(404).json({ success: false, error: 'Agent introuvable' });
    a.unlockExploit();
    res.json({ success: true, snapshot: a.snapshot() });
});

app.get('/agent/list', (_req, res) => {
    res.json({ success: true, agents: agentLib.listAgents() });
});

app.get('/agent/:id', (req, res) => {
    const a = agentLib.getAgent(req.params.id);
    if (!a) return res.status(404).json({ success: false, error: 'Agent introuvable' });
    res.json({ success: true, snapshot: a.snapshot() });
});

app.post('/agent/:id/stop', (req, res) => {
    const a = agentLib.getAgent(req.params.id);
    if (!a) return res.status(404).json({ success: false, error: 'Agent introuvable' });
    a.stop();
    res.json({ success: true });
});

app.post('/agent/:id/answer', (req, res) => {
    const a = agentLib.getAgent(req.params.id);
    if (!a) return res.status(404).json({ success: false, error: 'Agent introuvable' });
    const { questionId, value } = req.body || {};
    a.answer(questionId, value);
    res.json({ success: true });
});

// ── SSE stream : log/step/question/tool/install/finding/end ──
app.get('/agent/:id/stream', (req, res) => {
    const a = agentLib.getAgent(req.params.id);
    if (!a) return res.status(404).end();
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    const send = (event, data) => {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {}
    };
    // Snapshot initial (pour clients qui arrivent en cours)
    send('snapshot', a.snapshot());
    const relay = (ev) => (data) => send(ev, data);
    const handlers = {
        log: relay('log'),
        step: relay('step'),
        question: relay('question'),
        'tool-start': relay('tool-start'),
        'tool-end': relay('tool-end'),
        'install-start': relay('install-start'),
        'install-log': relay('install-log'),
        'install-end': relay('install-end'),
        finding: relay('finding'),
        plan: relay('plan'),
        'phase-start': relay('phase-start'),
        'phase-end': relay('phase-end'),
        unlock: relay('unlock'),
        tokens: relay('tokens'),
        debrief: relay('debrief'),
        'chain-start': relay('chain-start'),
        'chain-plan': relay('chain-plan'),
        'chain-node-start': relay('chain-node-start'),
        'chain-node-end': relay('chain-node-end'),
        'chain-node-skip': relay('chain-node-skip'),
        'chain-end': relay('chain-end'),
        start: relay('start'),
        end: (d) => { relay('end')(d); try { res.end(); } catch {} },
    };
    for (const [ev, fn] of Object.entries(handlers)) a.on(ev, fn);
    req.on('close', () => {
        for (const [ev, fn] of Object.entries(handlers)) a.off(ev, fn);
    });
});

// ════════════════════════════════════════════
// RAG — recherche dans la base d'engagements
// ════════════════════════════════════════════
app.get('/rag/search', async (req, res) => {
    try {
        const { q = '', topK = 5, excludeEngagement, kinds } = req.query;
        const results = await ragLib.search(String(q), {
            topK: parseInt(topK, 10) || 5,
            excludeEngagement: excludeEngagement || null,
            kinds: kinds ? String(kinds).split(',') : null,
        });
        res.json({ success: true, results });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/rag/reindex', (_req, res) => {
    ragLib.invalidate();
    res.json({ success: true });
});

// ════════════════════════════════════════════
// Listener ncat (post-exploit)
// ════════════════════════════════════════════
app.post('/listener/start', async (req, res) => {
    try {
        const { port } = req.body || {};
        const r = await exploitLib.listenerStart(port || 4444);
        res.json({ success: r.ok, ...r });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/listener/list', async (_req, res) => {
    const r = await exploitLib.listenerList();
    res.json({ success: true, ...r });
});

app.get('/listener/:port/tail', async (req, res) => {
    const { port } = req.params;
    const { lines = 80 } = req.query;
    const r = await exploitLib.listenerTail(port, parseInt(lines, 10) || 80);
    res.json({ success: true, ...r });
});

app.post('/listener/:port/stop', async (req, res) => {
    const { port } = req.params;
    const r = await exploitLib.listenerStop(port);
    res.json({ success: true, ...r });
});

// ════════════════════════════════════════════
// AI CONFIG — provider + cles API + modeles
// ════════════════════════════════════════════
app.get('/ai/providers', (_req, res) => {
    res.json({ success: true, providers: aiProvider.listProviders() });
});

app.get('/ai/config', async (_req, res) => {
    try {
        const cfg = await aiConfigLib.load();
        res.json({ success: true, config: aiConfigLib.maskedView(cfg) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/ai/config', async (req, res) => {
    try {
        const { active, providers, provider, apiKey, models } = req.body || {};
        const current = await aiConfigLib.load();
        // Forme 1 : set complet via { active, providers: {...} }
        let next = { ...current };
        if (active) next.active = active;
        if (providers) next.providers = { ...current.providers, ...providers };
        // Forme 2 : set d'un seul provider via { provider, apiKey, models }
        if (provider) {
            next.providers = next.providers || {};
            const prev = next.providers[provider] || {};
            next.providers[provider] = {
                ...prev,
                ...(apiKey !== undefined ? { apiKey } : {}),
                ...(models ? { models: { ...prev.models, ...models } } : {}),
            };
            if (!next.active) next.active = provider;
        }
        const saved = await aiConfigLib.save(next);
        res.json({ success: true, config: aiConfigLib.maskedView(saved) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/ai/test', async (req, res) => {
    try {
        const { provider, apiKey, model } = req.body || {};
        if (!provider) return res.status(400).json({ success: false, error: 'provider requis' });
        // Si apiKey absent, on prend la cle en config
        let key = apiKey;
        if (!key) {
            const cfg = await aiConfigLib.load();
            key = cfg.providers?.[provider]?.apiKey;
        }
        if (!key) return res.status(400).json({ success: false, error: 'cle API absente' });
        const r = await aiProvider.testProvider({ provider, apiKey: key, model });
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/ai/active', async (req, res) => {
    try {
        const { provider } = req.body || {};
        if (!provider) return res.status(400).json({ success: false, error: 'provider requis' });
        const cfg = await aiConfigLib.load();
        if (!cfg.providers?.[provider]) return res.status(400).json({ success: false, error: 'provider inconnu' });
        cfg.active = provider;
        await aiConfigLib.save(cfg);
        res.json({ success: true, active: provider });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// RAG — stats (corpus, embeddings, mode)
// ════════════════════════════════════════════
app.get('/rag/stats', async (_req, res) => {
    try {
        const s = await ragLib.stats();
        res.json({ success: true, ...s });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// PENTEST SWARM — multi-targets + blackboard
// ════════════════════════════════════════════
app.post('/swarm/pentest/start', async (req, res) => {
    try {
        const { targets, mode = 'recon-only', goal = '', engagement, orchestrated = false, exploitUnlocked = false } = req.body || {};
        if (!Array.isArray(targets) || !targets.length) {
            return res.status(400).json({ success: false, error: 'targets[] requis' });
        }
        let engSlug = engagement;
        if (!engSlug) {
            const active = await engagements.getActive();
            engSlug = active?.slug || null;
        }
        const swarm = pentestSwarm.createSwarm({
            targets, createAgent: agentLib.createAgent,
            engagementSlug: engSlug, mode, goal, orchestrated, exploitUnlocked,
        });
        swarm.start().catch(e => console.error('[PENTEST-SWARM]', e));
        res.json({ success: true, id: swarm.id, snapshot: swarm.snapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/swarm/pentest/list', (_req, res) => {
    res.json({ success: true, swarms: pentestSwarm.listSwarms() });
});

app.get('/swarm/pentest/:id', (req, res) => {
    const s = pentestSwarm.getSwarm(req.params.id);
    if (!s) return res.status(404).json({ success: false, error: 'swarm introuvable' });
    res.json({ success: true, snapshot: s.snapshot() });
});

app.post('/swarm/pentest/:id/stop', (req, res) => {
    const s = pentestSwarm.getSwarm(req.params.id);
    if (!s) return res.status(404).json({ success: false, error: 'swarm introuvable' });
    s.stop();
    res.json({ success: true });
});

app.get('/swarm/pentest/:id/stream', (req, res) => {
    const s = pentestSwarm.getSwarm(req.params.id);
    if (!s) return res.status(404).end();
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();
    const send = (ev, d) => { try { res.write(`event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`); } catch {} };
    send('snapshot', s.snapshot());
    const relay = (ev) => (d) => send(ev, d);
    const handlers = {
        start: relay('start'),
        'child-spawn': relay('child-spawn'),
        finding: relay('finding'),
        end: (d) => { relay('end')(d); try { res.end(); } catch {} },
    };
    for (const [ev, fn] of Object.entries(handlers)) s.on(ev, fn);
    // relay blackboard entries
    const onEntry = (entry) => send('blackboard', entry);
    s.blackboard.on('entry', onEntry);
    req.on('close', () => {
        for (const [ev, fn] of Object.entries(handlers)) s.off(ev, fn);
        s.blackboard.off('entry', onEntry);
    });
});

// ════════════════════════════════════════════
// SYNTHESIZE — generate+run custom script sandbox
// ════════════════════════════════════════════
app.post('/synth/generate', async (req, res) => {
    try {
        const { need, context = {} } = req.body || {};
        if (!need) return res.status(400).json({ success: false, error: 'need requis' });
        const r = await synthesize.generate({ need, context });
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/synth/run', async (req, res) => {
    try {
        const { need, context = {}, timeoutMs } = req.body || {};
        if (!need) return res.status(400).json({ success: false, error: 'need requis' });
        const r = await synthesize.generateAndRun({ need, context, timeoutMs });
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// EXPLOIT CHAIN — attack graph build+execute
// ════════════════════════════════════════════
app.post('/chain/build', async (req, res) => {
    try {
        const { target, goal = '', engagement } = req.body || {};
        if (!target) return res.status(400).json({ success: false, error: 'target requis' });
        const engSlug = engagement || (await engagements.getActive())?.slug || 'default';
        const knowledge = await memoryLib.load(engSlug);
        const r = await exploitChain.buildChain({ knowledge, target, goal });
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/chain/execute', async (req, res) => {
    try {
        const { agentId } = req.body || {};
        const a = agentLib.getAgent(agentId);
        if (!a) return res.status(404).json({ success: false, error: 'agent introuvable' });
        if (!a.exploitUnlocked) return res.status(403).json({ success: false, error: 'agent doit etre exploit-unlocked' });
        if (!a.knowledge) return res.status(400).json({ success: false, error: 'agent sans knowledge (non demarre?)' });

        const host = (() => { try { return new URL(/^https?:/.test(a.target) ? a.target : `http://${a.target}`).hostname; } catch { return a.target; } })();
        const r = await exploitChain.buildAndExecute({
            knowledge: a.knowledge,
            target: host,
            goal: a.goal,
            agent: a,
            runTool: async (toolName, args, opts = {}) => {
                if (!tools.has(toolName)) return { ok: false, error: `tool ${toolName} absent` };
                const arg = args.target || args.url || args.host || a.target;
                return tools.run(toolName, arg, opts);
            },
        });
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// TRAFFIC ANALYZER — passive IDOR/CSRF/JWT
// ════════════════════════════════════════════
app.get('/traffic/analyze', async (_req, res) => {
    try {
        const r = await trafficAnalyzer.analyze();
        res.json(r);
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// PLAYBOOKS — tech-specific attack sequences
// ════════════════════════════════════════════
app.get('/playbooks', (_req, res) => {
    res.json({ success: true, playbooks: playbooks.listPlaybooks() });
});

app.post('/playbooks/match', (req, res) => {
    try {
        const { hostData = {} } = req.body || {};
        const matches = playbooks.matchPlaybooks(hostData);
        res.json({ success: true, matches });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/playbooks/:key', (req, res) => {
    const pb = playbooks.getPlaybook(req.params.key);
    if (!pb) return res.status(404).json({ success: false, error: 'playbook introuvable' });
    res.json({ success: true, playbook: pb });
});

app.post('/playbooks/:key/render', (req, res) => {
    try {
        const { target } = req.body || {};
        if (!target) return res.status(400).json({ success: false, error: 'target requis' });
        const steps = playbooks.renderSteps(req.params.key, target);
        if (!steps.length) return res.status(404).json({ success: false, error: 'playbook introuvable' });
        res.json({ success: true, steps });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
// v6 PHANTOM ROUTES — 15 new capabilities
// ════════════════════════════════════════════

// --- CVE mapper ---
app.post('/cve/lookup', async (req, res) => {
    try { res.json(await cveMapper.lookup(req.body || {})); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/cve/enrich-tech', async (req, res) => {
    try { res.json({ ok: true, enriched: await cveMapper.enrichTech(req.body?.tech || []) }); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// --- Payload library ---
app.get('/payloads/categories', (_req, res) => {
    res.json({ ok: true, categories: payloadsLib.listCategories() });
});
app.get('/payloads/wafs/:vuln', (req, res) => {
    res.json({ ok: true, wafs: payloadsLib.listWafs(req.params.vuln) });
});
app.post('/payloads/get', (req, res) => {
    res.json(payloadsLib.getPayloads(req.body || {}));
});
app.post('/payloads/render', (req, res) => {
    const { payloads = [], vars = {} } = req.body || {};
    res.json({ ok: true, rendered: payloadsLib.renderPayloads(payloads, vars) });
});

// --- Session manager ---
app.get('/session/list', (_req, res) => {
    res.json({ ok: true, sessions: sessionMgr.list() });
});
app.get('/session/:target', (req, res) => {
    res.json({ ok: true, session: sessionMgr.load(decodeURIComponent(req.params.target)) });
});
app.post('/session/:target/cookie', (req, res) => {
    const { name, value, opts } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    res.json({ ok: true, session: sessionMgr.setCookie(decodeURIComponent(req.params.target), name, value, opts) });
});
app.post('/session/:target/header', (req, res) => {
    const { name, value } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: 'name required' });
    res.json({ ok: true, session: sessionMgr.setHeader(decodeURIComponent(req.params.target), name, value) });
});
app.post('/session/:target/token', (req, res) => {
    const { kind, value } = req.body || {};
    if (!kind) return res.status(400).json({ ok: false, error: 'kind required' });
    res.json({ ok: true, session: sessionMgr.setToken(decodeURIComponent(req.params.target), kind, value) });
});
app.post('/session/:target/merge', (req, res) => {
    res.json({ ok: true, session: sessionMgr.merge(decodeURIComponent(req.params.target), req.body || {}) });
});
app.delete('/session/:target', (req, res) => {
    res.json({ ok: sessionMgr.clear(decodeURIComponent(req.params.target)) });
});
app.get('/session/:target/curl', (req, res) => {
    res.json({ ok: true, curlFlags: sessionMgr.asCurl(decodeURIComponent(req.params.target)) });
});

// --- OOB collaborator ---
app.post('/oob/start', async (req, res) => {
    try { res.json(await oobCollab.start(req.body || {})); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/oob/stop', async (_req, res) => {
    try { res.json(await oobCollab.stop()); }
    catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.get('/oob/status', (_req, res) => {
    res.json({ ok: true, ...oobCollab.status() });
});
app.get('/oob/events', (req, res) => {
    const { token, since, limit } = req.query;
    res.json({ ok: true, events: oobCollab.events({ token, since: Number(since) || 0, limit: Number(limit) || 100 }) });
});
app.post('/oob/mint', (_req, res) => {
    res.json({ ok: true, payload: oobCollab.mintPayload() });
});
app.post('/oob/wait/:token', async (req, res) => {
    const timeoutMs = parseInt(req.query.timeoutMs || '60000', 10);
    res.json(await oobCollab.waitForCallback(req.params.token, timeoutMs));
});

// --- Wordlist generator ---
app.post('/wordlist/from-flows', async (req, res) => {
    const bundle = await wordlistGen.buildFromFlows(req.body?.flows || []);
    const saved = req.body?.target ? wordlistGen.saveAll(req.body.target, bundle) : null;
    res.json({ ok: true, bundle, saved });
});
app.post('/wordlist/from-js', async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    res.json({ ok: true, bundle: await wordlistGen.buildFromJsBundle(url) });
});
app.post('/wordlist/from-wayback', async (req, res) => {
    const { domain, limit } = req.body || {};
    if (!domain) return res.status(400).json({ ok: false, error: 'domain required' });
    res.json({ ok: true, bundle: await wordlistGen.buildFromWayback(domain, limit) });
});

// --- JS secret scanner ---
app.post('/js-secrets/scan-site', async (req, res) => {
    const { baseUrl } = req.body || {};
    if (!baseUrl) return res.status(400).json({ ok: false, error: 'baseUrl required' });
    res.json({ ok: true, result: await jsSecretScanner.scanSite(baseUrl) });
});
app.post('/js-secrets/scan-url', async (req, res) => {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    res.json({ ok: true, result: await jsSecretScanner.scanUrl(url) });
});
app.post('/js-secrets/scan-text', (req, res) => {
    const { text, source } = req.body || {};
    res.json({ ok: true, findings: jsSecretScanner.scanText(text || '', source || 'inline') });
});

// --- Report generator ---
app.post('/report/generate', async (req, res) => {
    try {
        const knowledge = req.body?.knowledge || (memory?.getStats ? { hosts: {} } : { hosts: {} });
        res.json(await reportGen.generate({
            engagement: req.body?.engagement,
            target: req.body?.target,
            knowledge,
            findings: req.body?.findings || [],
            chains: req.body?.chains || [],
            meta: req.body?.meta || {},
            format: req.body?.format || 'both',
        }));
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.get('/report/list', (_req, res) => {
    res.json({ ok: true, reports: reportGen.list() });
});
app.post('/report/pdf', async (req, res) => {
    const { htmlPath } = req.body || {};
    if (!htmlPath) return res.status(400).json({ ok: false, error: 'htmlPath required' });
    res.json(await reportGen.generatePdf(htmlPath));
});

// --- OSINT ---
app.post('/osint/recon', async (req, res) => {
    const { target } = req.body || {};
    if (!target) return res.status(400).json({ ok: false, error: 'target required' });
    res.json(await osintLib.fullRecon(target));
});
app.post('/osint/crtsh', async (req, res) => {
    res.json(await osintLib.crtSh(req.body?.domain));
});
app.post('/osint/shodan/host', async (req, res) => {
    res.json(await osintLib.shodanHost(req.body?.ip));
});
app.post('/osint/shodan/search', async (req, res) => {
    res.json(await osintLib.shodanSearch(req.body?.query, { limit: req.body?.limit }));
});
app.post('/osint/censys', async (req, res) => {
    res.json(await osintLib.censysHost(req.body?.ip));
});
app.post('/osint/hibp', async (req, res) => {
    res.json(await osintLib.hibpBreaches(req.body?.email));
});
app.post('/osint/virustotal', async (req, res) => {
    res.json(await osintLib.vtDomain(req.body?.domain));
});

// --- Privesc ---
app.get('/privesc/enum-script', (req, res) => {
    const { os = 'linux', kind = 'quick' } = req.query;
    res.json({ ok: true, os, kind, script: privescLib.getEnumScript(os, kind) });
});
app.post('/privesc/analyze', (req, res) => {
    const { output, os = 'linux', host } = req.body || {};
    const analysis = privescLib.analyze(output || '', os);
    if (host) privescLib.saveEnum(host, output, analysis);
    res.json({ ok: true, analysis });
});
app.get('/privesc/gtfobins', (_req, res) => {
    res.json({ ok: true, gtfobins: privescLib.GTFOBINS });
});

// --- Rate limiter ---
app.post('/ratelimit/record', (req, res) => {
    const { target, status, headers, body } = req.body || {};
    if (!target) return res.status(400).json({ ok: false, error: 'target required' });
    res.json({ ok: true, state: rateLimiter.record(target, { status, headers, body }) });
});
app.get('/ratelimit/state/:target', (req, res) => {
    res.json({ ok: true, state: rateLimiter.getState(decodeURIComponent(req.params.target)) });
});
app.get('/ratelimit/advice/:target', (req, res) => {
    res.json({ ok: true, ...rateLimiter.shouldBackoff(decodeURIComponent(req.params.target)) });
});
app.post('/ratelimit/rotate-ua/:target', (req, res) => {
    res.json({ ok: true, ua: rateLimiter.rotateUa(decodeURIComponent(req.params.target)) });
});
app.delete('/ratelimit/state/:target', (req, res) => {
    res.json(rateLimiter.reset(decodeURIComponent(req.params.target)));
});
app.get('/ratelimit/all', (_req, res) => {
    res.json({ ok: true, hosts: rateLimiter.all() });
});

// --- Bug bounty API ---
app.post('/bugbounty/program', async (req, res) => {
    const { platform, handle } = req.body || {};
    if (!platform || !handle) return res.status(400).json({ ok: false, error: 'platform + handle required' });
    res.json(await bugbountyApi.getProgram(platform, handle));
});
app.post('/bugbounty/scope-check', (req, res) => {
    const { target, scope = [], outOfScope = [] } = req.body || {};
    if (!target) return res.status(400).json({ ok: false, error: 'target required' });
    res.json({ ok: true, ...bugbountyApi.isInScope(target, scope, outOfScope) });
});

// --- Screenshot DVR ---
app.post('/dvr/save', (req, res) => {
    res.json(screenshotDvr.save(req.body || {}));
});
app.post('/dvr/capture', async (req, res) => {
    const { url, opts } = req.body || {};
    if (!url) return res.status(400).json({ ok: false, error: 'url required' });
    res.json(await screenshotDvr.captureUrl(url, opts || {}));
});
app.get('/dvr/list', (req, res) => {
    res.json({ ok: true, screenshots: screenshotDvr.list({ target: req.query.target, limit: Number(req.query.limit) || 100 }) });
});
app.post('/dvr/diff', (req, res) => {
    const { idA, idB } = req.body || {};
    res.json(screenshotDvr.diff(idA, idB));
});
app.get('/dvr/latest/:target', (req, res) => {
    const entry = screenshotDvr.latest(decodeURIComponent(req.params.target));
    res.json({ ok: !!entry, entry });
});
app.delete('/dvr/:id', (req, res) => {
    res.json(screenshotDvr.remove(req.params.id));
});

// --- Few-shot memory (successful chains) ---
app.post('/fewshot/record', (req, res) => {
    res.json(fewshotMemory.record(req.body || {}));
});
app.post('/fewshot/search', (req, res) => {
    res.json({ ok: true, matches: fewshotMemory.search(req.body || {}) });
});
app.post('/fewshot/rate/:id', (req, res) => {
    res.json(fewshotMemory.rate(req.params.id, Number(req.body?.rating) || 0));
});
app.get('/fewshot/all', (_req, res) => {
    res.json({ ok: true, entries: fewshotMemory.all() });
});
app.delete('/fewshot/:id', (req, res) => {
    res.json(fewshotMemory.remove(req.params.id));
});

// --- Replay DVR (tapes) ---
app.get('/replay/list', (req, res) => {
    res.json({ ok: true, tapes: replayDvr.list(req.query || {}) });
});
app.get('/replay/stats', (_req, res) => {
    res.json({ ok: true, stats: replayDvr.stats() });
});
app.get('/replay/:id', (req, res) => {
    const tape = replayDvr.read(req.params.id);
    res.json({ ok: !!tape, tape });
});
app.post('/replay/:id/rerun', async (req, res) => {
    const tape = replayDvr.read(req.params.id);
    if (!tape) return res.status(404).json({ ok: false, error: 'tape-not-found' });
    try {
        const out = await tools.run(tape.tool, tape.args);
        res.json({ ok: true, original: { ok: tape.ok, output: (tape.output || '').slice(0, 500) }, replayed: out });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.delete('/replay/:id', (req, res) => {
    res.json(replayDvr.remove(req.params.id));
});

// --- MCP server bridge (HTTP JSON-RPC) ---
app.post('/mcp', mcpServer.httpHandler({
    modules: {
        tools,
        cveMapper,
        payloads: payloadsLib,
        rag: ragLib,
        exploitChain,
        osint: osintLib,
        jsSecret: jsSecretScanner,
        oob: oobCollab,
        reportGen,
        bugbounty: bugbountyApi,
        knowledge: { hosts: {} }, // snapshot injected per-call would be better; MVP passes empty
    },
}));
app.get('/mcp/tools', (_req, res) => {
    res.json({ ok: true, tools: mcpServer.listTools() });
});

// ════════════════════════════════════════════
// DÉMARRAGE — HTTP + WebSocket (sandbox terminal)
// ════════════════════════════════════════════
const httpServer = http.createServer(app);

// ── WebSocket /sandbox/ws → PTY inside Kali container ──
let WebSocketServer = null;
try { ({ WebSocketServer } = require('ws')); } catch (e) {
    console.warn('[SANDBOX] module "ws" absent — terminal WebSocket desactive.');
    console.warn('[SANDBOX]   → cd server && npm install ws node-pty');
}
if (WebSocketServer) {
    const wss = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (req, socket, head) => {
        if (req.url && req.url.startsWith('/sandbox/ws')) {
            wss.handleUpgrade(req, socket, head, (ws) => {
                const url = new URL(req.url, 'http://localhost');
                const cols = parseInt(url.searchParams.get('cols') || '120', 10);
                const rows = parseInt(url.searchParams.get('rows') || '30', 10);
                sandbox.attachPty(ws, { cols, rows });
            });
        } else {
            socket.destroy();
        }
    });
}

httpServer.listen(PORT, () => {
    console.log(`
  ╔════════════════════════════════════════════════════════╗
  ║   ⚡ KEYSOSI-LINK v6.0 "PHANTOM" IS ONLINE ⚡         ║
  ╠════════════════════════════════════════════════════════╣
  ║  📡 Port: ${PORT}                                     ║
  ║  🤖 Multi-provider AI: Groq / Claude / OpenAI / Gemini║
  ║  🎯 CVE · Payloads · Session · OOB · MCP              ║
  ║  🧬 Fewshot · Replay-DVR · Screenshot-DVR · OSINT     ║
  ║  🧪 Sandbox Lab: /sandbox/* + ws://.../sandbox/ws     ║
  ╚════════════════════════════════════════════════════════╝
    `);
    console.log('  🔐 CyberSec Modules: Knowledge | Scanner | Recon | Exploit Lab | Monitor');
});
