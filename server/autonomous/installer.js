// ════════════════════════════════════════════════════════════════
//  📦 INSTALLER — Auto-install d'outils dans aura-lab
//  Methodes : apt, pip, go, git (clone dans /root/tools)
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER))
    ? WIN_DOCKER : 'docker';
const CONTAINER = 'aura-lab';

function shellEscape(s) {
    if (/^[a-zA-Z0-9_./:=?&@~+-]+$/.test(String(s))) return String(s);
    return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function execInSandbox(cmd, { timeoutMs = 10 * 60 * 1000, onData } = {}) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        let stdout = '', stderr = '';
        const to = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, timeoutMs);
        proc.stdout?.on('data', d => {
            const s = d.toString();
            stdout += s;
            onData?.(s, 'stdout');
        });
        proc.stderr?.on('data', d => {
            const s = d.toString();
            stderr += s;
            onData?.(s, 'stderr');
        });
        proc.on('close', code => { clearTimeout(to); resolve({ code, stdout, stderr }); });
        proc.on('error', err => { clearTimeout(to); resolve({ code: -1, stdout, stderr: err.message }); });
    });
}

const METHODS = {
    apt: (pkg) => `apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ${shellEscape(pkg)}`,
    pip: (pkg) => `pip3 install --break-system-packages ${shellEscape(pkg)}`,
    go:  (pkg) => `go install -v ${shellEscape(pkg)}@latest`,
    git: (url) => {
        const name = String(url).replace(/\.git$/, '').split('/').pop() || 'tool';
        return `mkdir -p /root/tools && cd /root/tools && (test -d ${shellEscape(name)} && cd ${shellEscape(name)} && git pull) || git clone --depth 1 ${shellEscape(url)} ${shellEscape(name)}`;
    },
};

async function install(method, pkg, { onData } = {}) {
    const builder = METHODS[method];
    if (!builder) return { success: false, error: `Methode inconnue : ${method}` };
    if (!pkg) return { success: false, error: 'Package/URL manquant' };
    const cmd = builder(pkg);
    const res = await execInSandbox(cmd, { timeoutMs: 15 * 60 * 1000, onData });
    return {
        success: res.code === 0,
        method,
        package: pkg,
        exitCode: res.code,
        log: (res.stdout + res.stderr).slice(-4000),
        error: res.code === 0 ? null : `exit ${res.code}`,
    };
}

// Detecte si un binaire existe deja dans la sandbox
async function has(binary) {
    const res = await execInSandbox(`command -v ${shellEscape(binary)} 2>/dev/null`);
    return res.code === 0 && res.stdout.trim().length > 0;
}

module.exports = { install, has, METHODS: Object.keys(METHODS) };
