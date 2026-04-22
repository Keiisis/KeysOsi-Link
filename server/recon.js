// ════════════════════════════════════════════════════════════════
//  🎯 RECON — jobs subfinder/httpx/nuclei/headers/screenshot
//  Execution dans le container aura-lab, sortie sauvee dans
//  /root/sessions/<engagement>/ + activite loggee
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');
const engagements = require('./engagements');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER))
    ? WIN_DOCKER : 'docker';
const CONTAINER = 'aura-lab';

const jobs = new Map();
let jobCounter = 0;

function hostOf(urlOrHost) {
    try {
        return new URL(/^https?:/.test(urlOrHost) ? urlOrHost : `http://${urlOrHost}`).hostname;
    } catch {
        return String(urlOrHost).replace(/^https?:\/\//, '').split('/')[0];
    }
}

function safeName(s) {
    return String(s).replace(/[^a-z0-9.-]/gi, '_').slice(0, 80);
}

function shellEscape(s) {
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function execInSandbox(cmd, { timeoutMs = 5 * 60 * 1000 } = {}) {
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

function writeFileInSandbox(filepath, content) {
    return new Promise((resolve) => {
        const cmd = `mkdir -p "$(dirname ${shellEscape(filepath)})" && cat > ${shellEscape(filepath)}`;
        const proc = spawn(DOCKER_BIN, ['exec', '-i', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        proc.stdin.write(content);
        proc.stdin.end();
        proc.on('close', code => resolve(code === 0));
        proc.on('error', () => resolve(false));
    });
}

// ── Runners : renvoient la commande shell a executer dans aura-lab ──
const RUNNERS = {
    subfinder: (t) => `subfinder -d ${shellEscape(hostOf(t))} -silent 2>&1`,
    httpx:     (t) => `echo ${shellEscape(hostOf(t))} | httpx -silent -title -status-code -tech-detect -ip 2>&1`,
    nuclei:    (t) => `nuclei -u ${shellEscape(t)} -severity low,medium,high,critical -silent 2>&1`,
    headers:   (t) => `curl -sI -L --max-time 15 ${shellEscape(t)}`,
    whatweb:   (t) => `whatweb --color never ${shellEscape(t)} 2>&1`,
    nmap:      (t) => `nmap -Pn -T4 --top-ports 100 ${shellEscape(hostOf(t))} 2>&1`,
};

async function startJob({ type, target, engagementSlug }) {
    if (!RUNNERS[type]) throw new Error(`Type recon inconnu : ${type}`);
    if (!target) throw new Error('Target requis');

    const id = String(++jobCounter);
    const startedAt = new Date().toISOString();
    const job = {
        id, type, target,
        status: 'running',
        output: '',
        startedAt, finishedAt: null,
        engagement: engagementSlug || null,
        file: null,
    };
    jobs.set(id, job);

    (async () => {
        try {
            const res = await execInSandbox(RUNNERS[type](target));
            job.output = (res.stdout || '') + (res.stderr ? '\n[stderr]\n' + res.stderr : '');
            job.exitCode = res.code;
            job.status = res.code === 0 ? 'done' : (job.output.trim() ? 'done' : 'error');
        } catch (e) {
            job.output = String(e.message || e);
            job.status = 'error';
        } finally {
            job.finishedAt = new Date().toISOString();
            if (engagementSlug) {
                const ts = Date.now();
                const filename = `${type}-${safeName(hostOf(target))}-${ts}.txt`;
                const filepath = `/root/sessions/${engagementSlug}/${filename}`;
                const header = `# ${type} — ${target}\n# ${job.startedAt} → ${job.finishedAt}\n# exit=${job.exitCode}\n\n`;
                const ok = await writeFileInSandbox(filepath, header + job.output);
                if (ok) job.file = filepath;
                const lines = (job.output || '').split('\n').filter(Boolean).length;
                await engagements.appendActivity(engagementSlug, {
                    kind: type,
                    target,
                    summary: `${lines} ligne(s) → ${filepath}`,
                }).catch(() => {});
            }
        }
    })();

    return job;
}

async function saveScreenshot({ target, dataUrl, engagementSlug }) {
    if (!dataUrl?.startsWith('data:image/')) throw new Error('dataUrl invalide');
    const base64 = dataUrl.split(',')[1];
    const ts = Date.now();
    const host = safeName(hostOf(target));
    const filename = `screenshot-${host}-${ts}.png`;
    const engSlug = engagementSlug || 'default';
    const filepath = `/root/sessions/${engSlug}/${filename}`;
    // Ecrit via base64 pour preserver les bytes binaires
    const cmd = `mkdir -p "$(dirname ${shellEscape(filepath)})" && base64 -d > ${shellEscape(filepath)}`;
    const ok = await new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', '-i', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        proc.stdin.write(base64);
        proc.stdin.end();
        proc.on('close', c => resolve(c === 0));
        proc.on('error', () => resolve(false));
    });
    if (!ok) throw new Error('Echec ecriture screenshot dans sandbox');
    if (engagementSlug) {
        await engagements.appendActivity(engagementSlug, {
            kind: 'screenshot', target, summary: filepath,
        }).catch(() => {});
    }
    return { success: true, file: filepath };
}

function getJob(id) { return jobs.get(String(id)) || null; }

function listJobs({ limit = 50, engagementSlug = null } = {}) {
    const all = Array.from(jobs.values());
    const filtered = engagementSlug
        ? all.filter(j => j.engagement === engagementSlug)
        : all;
    return filtered.slice(-limit).reverse();
}

module.exports = {
    startJob, saveScreenshot,
    getJob, listJobs,
    RUNNERS_TYPES: Object.keys(RUNNERS),
};
