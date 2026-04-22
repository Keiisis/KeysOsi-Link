// ════════════════════════════════════════════════════════════════
//  ⚡ KEYSOSI LAB SANDBOX — Docker lifecycle + PTY + targets stack
//  - Persistence: stop/start preserves apt installs (container kept)
//  - Network: aura-lab-net shared between sandbox & vulnerable targets
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Constants ──
const IMAGE = 'aura-lab:latest';
const CONTAINER = 'aura-lab';
const VOLUME = 'aura-lab-data';
const NETWORK = 'aura-lab-net';
const COMPOSE_FILE = path.resolve(__dirname, '..', '..', 'docker', 'docker-compose-targets.yml');
const TARGETS = ['dvwa', 'juice-shop', 'mutillidae', 'metasploitable', 'webgoat'];
const MITM_CONTAINER = 'aura-mitm';
const MITM_IMAGE = 'mitmproxy/mitmproxy:latest';
const MITM_PROXY_PORT = 8880;
const MITM_WEB_PORT = 8881;

// ── Docker binary resolution ──
const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (() => {
    if (process.platform === 'win32' && fs.existsSync(WIN_DOCKER)) return WIN_DOCKER;
    return 'docker';
})();

// ── node-pty lazy ──
let pty = null;
function loadPty() {
    if (pty) return pty;
    try { pty = require('node-pty'); } catch (e) {
        console.error('[SANDBOX] node-pty indisponible:', e.message);
        console.error('[SANDBOX]   -> cd server && npm install node-pty');
    }
    return pty;
}

// ─────────────────────────────────────────────────────────────
// Shell helpers
// ─────────────────────────────────────────────────────────────
function runDocker(args, opts = {}) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, args, { windowsHide: true, ...opts });
        let stdout = '', stderr = '';
        proc.stdout?.on('data', d => stdout += d.toString());
        proc.stderr?.on('data', d => stderr += d.toString());
        proc.on('close', code => resolve({ code, stdout, stderr }));
        proc.on('error', err => resolve({ code: -1, stdout, stderr: err.message }));
    });
}

async function dockerAvailable() {
    const { code } = await runDocker(['version', '--format', '{{.Server.Version}}']);
    return code === 0;
}

async function imageExists() {
    const { stdout } = await runDocker(['images', '-q', IMAGE]);
    return stdout.trim().length > 0;
}

async function containerStatus() {
    const { stdout } = await runDocker([
        'ps', '-a',
        '--filter', `name=^${CONTAINER}$`,
        '--format', '{{.Status}}'
    ]);
    const line = stdout.trim();
    if (!line) return 'absent';
    if (line.startsWith('Up')) return 'running';
    return 'stopped';
}

async function volumeExists() {
    const { stdout } = await runDocker(['volume', 'ls', '-q', '--filter', `name=^${VOLUME}$`]);
    return stdout.trim().length > 0;
}

async function networkExists() {
    const { stdout } = await runDocker(['network', 'ls', '-q', '--filter', `name=^${NETWORK}$`]);
    return stdout.trim().length > 0;
}

async function ensureNetwork() {
    if (await networkExists()) return;
    await runDocker(['network', 'create', '--driver', 'bridge', NETWORK]);
}

// ─────────────────────────────────────────────────────────────
// Sandbox lifecycle
// ─────────────────────────────────────────────────────────────
async function startSandbox({ persistent = true } = {}) {
    if (!await dockerAvailable()) {
        return { success: false, error: 'Docker daemon inaccessible. Demarre Docker Desktop.' };
    }
    if (!await imageExists()) {
        return {
            success: false,
            error: `Image "${IMAGE}" absente. Build : cd KeysOsi-Link/docker && build.bat`
        };
    }

    await ensureNetwork();

    const status = await containerStatus();

    // Container existe deja (stopped) → on le redemarre pour preserver l'etat
    if (status === 'stopped') {
        const { code, stderr } = await runDocker(['start', CONTAINER]);
        if (code !== 0) return { success: false, error: stderr || `exit ${code}` };
        return { success: true, message: 'Container redemarre (etat preserve)', status: 'running', persistent };
    }

    if (status === 'running') {
        return { success: true, message: 'Container deja en cours', status: 'running', persistent };
    }

    // Nouveau container
    const args = ['run', '-d', '--name', CONTAINER, '--network', NETWORK];
    if (persistent) args.push('-v', `${VOLUME}:/root`);
    args.push('--cap-add=NET_ADMIN', '--cap-add=NET_RAW');
    args.push('-it', IMAGE);

    const { code, stderr } = await runDocker(args);
    if (code !== 0) return { success: false, error: stderr || `exit ${code}` };
    return { success: true, message: 'Container cree', status: 'running', persistent };
}

// Stop ≠ destroy : preserve l'etat (apt installs, git clones, sessions)
async function stopSandbox() {
    const { code, stderr } = await runDocker(['stop', CONTAINER]);
    return { success: code === 0, error: code === 0 ? null : stderr, note: 'Etat preserve. Start pour reprendre.' };
}

// Reset = wipe total (container + volume + network)
async function resetSandbox() {
    await runDocker(['rm', '-f', CONTAINER]);
    await runDocker(['volume', 'rm', '-f', VOLUME]);
    // Ne pas supprimer le reseau s'il est utilise par les targets
    const targets = await targetsStatus();
    if (!targets.anyRunning) {
        await runDocker(['network', 'rm', NETWORK]);
    }
    return { success: true, message: 'Volume + container supprimes' };
}

async function getStatus() {
    const docker = await dockerAvailable();
    if (!docker) {
        return {
            docker: false, image: false, container: 'absent',
            volume: false, network: false, ready: false,
            hint: 'Docker daemon inaccessible.'
        };
    }
    const [img, cont, vol, net] = await Promise.all([
        imageExists(), containerStatus(), volumeExists(), networkExists()
    ]);
    return {
        docker: true, image: img, container: cont,
        volume: vol, network: net, ready: img,
        hint: img ? null : 'Image absente. Build: docker/build.bat'
    };
}

// ─────────────────────────────────────────────────────────────
// Vulnerable targets stack (docker compose)
// ─────────────────────────────────────────────────────────────
function runCompose(args) {
    return runDocker(['compose', '-f', COMPOSE_FILE, ...args]);
}

async function targetsStatus() {
    const out = {};
    let anyRunning = false;
    for (const t of TARGETS) {
        const { stdout } = await runDocker([
            'ps', '-a',
            '--filter', `name=^aura-${t.replace('-shop', '').replace('-', '')}`,
            '--format', '{{.Names}} {{.Status}}'
        ]);
        const cname = `aura-${t.replace('juice-shop', 'juice').replace('-', '')}`;
        // Resolution plus robuste : on cherche par label/compose
        const { stdout: byName } = await runDocker([
            'ps', '-a',
            '--filter', `name=aura-`,
            '--format', '{{.Names}}|{{.Status}}'
        ]);
        const lines = byName.split('\n').filter(Boolean);
        const match = lines.find(l => {
            const [name] = l.split('|');
            return name === cname || name.includes(t.split('-')[0]);
        });
        if (match) {
            const [, status] = match.split('|');
            out[t] = status.startsWith('Up') ? 'running' : 'stopped';
            if (status.startsWith('Up')) anyRunning = true;
        } else {
            out[t] = 'absent';
        }
    }
    return { targets: out, anyRunning };
}

async function startTargets() {
    if (!fs.existsSync(COMPOSE_FILE)) {
        return { success: false, error: `Fichier absent: ${COMPOSE_FILE}` };
    }
    const { code, stderr, stdout } = await runCompose(['up', '-d']);
    if (code !== 0) return { success: false, error: stderr || stdout || `exit ${code}` };
    return { success: true, message: 'Targets demarrees (1er lancement : pull images ~5min)' };
}

async function stopTargets() {
    const { code, stderr } = await runCompose(['down']);
    return { success: code === 0, error: code === 0 ? null : stderr };
}

// ─────────────────────────────────────────────────────────────
// MITM proxy (intercept + replay)
//   Proxy HTTP : 127.0.0.1:8880 (browser point vers ici)
//   Web UI     : http://127.0.0.1:8881
// ─────────────────────────────────────────────────────────────
async function proxyStatus() {
    const { stdout } = await runDocker([
        'ps', '-a',
        '--filter', `name=^${MITM_CONTAINER}$`,
        '--format', '{{.Status}}'
    ]);
    const line = stdout.trim();
    if (!line) return { status: 'absent' };
    return {
        status: line.startsWith('Up') ? 'running' : 'stopped',
        proxy: `127.0.0.1:${MITM_PROXY_PORT}`,
        webUi: `http://127.0.0.1:${MITM_WEB_PORT}`,
    };
}

async function startProxy() {
    if (!await dockerAvailable()) {
        return { success: false, error: 'Docker inaccessible' };
    }
    await ensureNetwork();
    const s = await proxyStatus();
    if (s.status === 'running') {
        return { success: true, message: 'Proxy deja actif', proxy: s.proxy, webUi: s.webUi };
    }
    if (s.status === 'stopped') {
        const { code, stderr } = await runDocker(['start', MITM_CONTAINER]);
        return code === 0
            ? { success: true, message: 'Proxy redemarre', proxy: `127.0.0.1:${MITM_PROXY_PORT}`, webUi: `http://127.0.0.1:${MITM_WEB_PORT}` }
            : { success: false, error: stderr };
    }
    const args = [
        'run', '-d',
        '--name', MITM_CONTAINER,
        '--network', NETWORK,
        '-p', `127.0.0.1:${MITM_PROXY_PORT}:8080`,
        '-p', `127.0.0.1:${MITM_WEB_PORT}:8081`,
        '--restart', 'unless-stopped',
        MITM_IMAGE,
        'mitmweb',
        '--listen-host', '0.0.0.0', '--listen-port', '8080',
        '--web-host', '0.0.0.0', '--web-port', '8081',
        '--no-web-open-browser',
        '--set', 'block_global=false',
    ];
    const { code, stderr } = await runDocker(args);
    if (code !== 0) return { success: false, error: stderr || `exit ${code}` };
    return {
        success: true,
        message: 'Proxy cree — install cert: http://mitm.it',
        proxy: `127.0.0.1:${MITM_PROXY_PORT}`,
        webUi: `http://127.0.0.1:${MITM_WEB_PORT}`,
    };
}

async function stopProxy() {
    const { code, stderr } = await runDocker(['rm', '-f', MITM_CONTAINER]);
    return { success: code === 0, error: code === 0 ? null : stderr };
}

// ─────────────────────────────────────────────────────────────
// PTY attach via WebSocket
// ─────────────────────────────────────────────────────────────
function attachPty(ws, { cols = 120, rows = 30 } = {}) {
    const ptyLib = loadPty();
    if (!ptyLib) {
        try {
            ws.send(JSON.stringify({ type: 'error', data: 'node-pty non installe cote serveur.' }));
            ws.close();
        } catch { /* noop */ }
        return null;
    }

    const ptyProc = ptyLib.spawn(DOCKER_BIN, ['exec', '-it', CONTAINER, 'bash', '-l'], {
        name: 'xterm-256color',
        cols, rows,
        cwd: process.env.HOME || process.env.USERPROFILE || '/',
        env: { ...process.env, TERM: 'xterm-256color' },
        useConpty: process.platform === 'win32',
    });

    let closed = false;
    const safeSend = (obj) => {
        if (closed) return;
        try { ws.send(JSON.stringify(obj)); } catch { /* noop */ }
    };

    ptyProc.onData(data => safeSend({ type: 'data', data }));
    ptyProc.onExit(({ exitCode }) => {
        safeSend({ type: 'exit', exitCode });
        try { ws.close(); } catch { /* noop */ }
    });

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }
        if (msg.type === 'input' && typeof msg.data === 'string') {
            ptyProc.write(msg.data);
        } else if (msg.type === 'resize' && Number.isFinite(msg.cols) && Number.isFinite(msg.rows)) {
            try { ptyProc.resize(msg.cols, msg.rows); } catch { /* noop */ }
        }
    });

    ws.on('close', () => { closed = true; try { ptyProc.kill(); } catch {} });
    ws.on('error', () => { closed = true; try { ptyProc.kill(); } catch {} });

    return ptyProc;
}

module.exports = {
    IMAGE, CONTAINER, VOLUME, NETWORK, TARGETS,
    MITM_CONTAINER, MITM_PROXY_PORT, MITM_WEB_PORT,
    dockerAvailable,
    startSandbox,
    stopSandbox,
    resetSandbox,
    getStatus,
    attachPty,
    startTargets,
    stopTargets,
    targetsStatus,
    startProxy,
    stopProxy,
    proxyStatus,
};
