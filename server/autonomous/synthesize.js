// ════════════════════════════════════════════════════════════════
//  🔨 SYNTHESIZE — Tool synthesis on demand
//  L'agent decrit un besoin → LLM ecrit un script Python/bash cible,
//  filtres de securite, execution en sandbox avec timeout strict.
//  Usage : quand le catalog ne couvre pas un cas (auth exotique,
//  protocole custom, API GraphQL particuliere, etc.)
// ════════════════════════════════════════════════════════════════
const { spawn } = require('child_process');
const fs = require('fs');

const WIN_DOCKER = 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
const DOCKER_BIN = (process.platform === 'win32' && fs.existsSync(WIN_DOCKER)) ? WIN_DOCKER : 'docker';
const CONTAINER = 'aura-lab';

const aiProvider = require('./ai-provider');

// Denylist — patterns destructifs / exfil non-sandbox / escape
const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//i,
    /:\s*\(\s*\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/, // fork bomb
    /mkfs\./i,
    /dd\s+if=\/dev\/(zero|urandom)\s+of=\/dev\/[a-z]+/i,
    /\/dev\/sd[a-z]/i,
    /chmod\s+-R\s+777\s+\//,
    /curl\s+[^|]*\|\s*(bash|sh)\s*$/i, // pipe-to-shell d'internet (pas dans sandbox, juste filtre)
    /nc\s+[0-9.]+\s+\d+\s+-e/i, // nc reverse shell vers exterieur (l'agent doit utiliser listener_start)
    />\s*\/etc\/(passwd|shadow|hosts)/i,
    /cat\s+\/etc\/shadow/i, // dans sandbox root OK mais on laisse quand meme a l'agent officiel
];

function isDangerous(code) {
    return DANGEROUS_PATTERNS.some(re => re.test(code));
}

const SYNTH_SYSTEM = `Tu es un SYNTHETISEUR d'outils pentest. A partir d'un besoin, tu ecris un SCRIPT
autonome (Python3 ou bash) qui tourne dans une sandbox Kali isolee.

Regles :
- Script TOUJOURS self-contained, stdlib + outils Kali/apt (requests, subprocess, beautifulsoup4, dns, socket...)
- Si un package manque : installe-le d'abord dans le script (pip3 install --break-system-packages ...)
- OUTPUT STRUCTURE : le script DOIT imprimer un JSON valide sur la derniere ligne avec les resultats.
- PAS de rm -rf /, pas de fork bomb, pas de reverse shell vers l'exterieur.
- Timeout implicite 3 minutes, sois efficace.
- Limite la sortie a ~100 lignes avant le JSON final.

Reponds STRICTEMENT en JSON :
{
  "language": "python" | "bash",
  "script": "<code complet, '\\n' echappe>",
  "explanation": "1-2 phrases : ce que fait le script",
  "expected_output": "description breve du JSON emis"
}`;

async function generate({ need, context = {}, agent = null }) {
    let client, model;
    try {
        if (agent?.ai) { client = agent.ai; model = agent.models?.reasoning; }
        else {
            const a = await aiProvider.getActive();
            client = a.client; model = a.models.reasoning;
        }
    } catch (e) { return { ok: false, error: 'no-provider', detail: e.message }; }

    const userMsg = `Besoin : ${need}

Contexte (extrait) :
${JSON.stringify(context, null, 2).slice(0, 2000)}

Genere le script qui repond a ce besoin.`;
    const res = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYNTH_SYSTEM },
            { role: 'user', content: userMsg },
        ],
    });
    const raw = res.choices?.[0]?.message?.content || '{}';
    try {
        const parsed = JSON.parse(raw);
        if (!parsed.script || !parsed.language) return { ok: false, error: 'invalid response' };
        return { ok: true, ...parsed };
    } catch (e) {
        return { ok: false, error: 'parse-failed', raw: raw.slice(0, 500) };
    }
}

function execInSandbox(cmd, { timeoutMs = 3 * 60 * 1000, onData } = {}) {
    return new Promise((resolve) => {
        const proc = spawn(DOCKER_BIN, ['exec', CONTAINER, 'bash', '-lc', cmd], { windowsHide: true });
        let stdout = '', stderr = '';
        const to = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, timeoutMs);
        proc.stdout?.on('data', d => { const s = d.toString(); stdout += s; onData?.(s); });
        proc.stderr?.on('data', d => { const s = d.toString(); stderr += s; onData?.(s); });
        proc.on('close', code => { clearTimeout(to); resolve({ code, stdout, stderr }); });
        proc.on('error', err => { clearTimeout(to); resolve({ code: -1, stdout, stderr: err.message }); });
    });
}

async function run({ script, language = 'python', timeoutMs = 3 * 60 * 1000, onData } = {}) {
    if (!script) return { ok: false, error: 'script requis' };
    if (isDangerous(script)) {
        return { ok: false, error: 'script bloque par filtre securite', blocked: true };
    }
    const ext = language === 'bash' ? 'sh' : 'py';
    const runner = language === 'bash' ? 'bash' : 'python3';
    const b64 = Buffer.from(script).toString('base64');
    const path = `/tmp/aura-synth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const cmd = `echo ${b64} | base64 -d > ${path} && ${runner} ${path}; rc=$?; rm -f ${path}; exit $rc`;
    const res = await execInSandbox(cmd, { timeoutMs, onData });

    const lines = (res.stdout || '').trim().split('\n').filter(Boolean);
    let parsedJson = null;
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
        const l = lines[i].trim();
        if (l.startsWith('{') && l.endsWith('}')) {
            try { parsedJson = JSON.parse(l); break; } catch {}
        }
    }
    return {
        ok: res.code === 0,
        exitCode: res.code,
        language,
        output: (res.stdout + (res.stderr ? '\n[stderr]\n' + res.stderr : '')).slice(-4000),
        json: parsedJson,
    };
}

async function generateAndRun({ need, context, timeoutMs, onData } = {}) {
    const gen = await generate({ need, context });
    if (!gen.ok) return { ok: false, stage: 'generate', ...gen };
    onData?.(`[synth] generated ${gen.language} (${gen.script.length} chars)\n`);
    const exec = await run({ script: gen.script, language: gen.language, timeoutMs, onData });
    return {
        ok: exec.ok,
        need,
        language: gen.language,
        explanation: gen.explanation,
        scriptPreview: gen.script.slice(0, 600),
        exitCode: exec.exitCode,
        output: exec.output,
        json: exec.json,
    };
}

module.exports = { generate, run, generateAndRun, isDangerous };
