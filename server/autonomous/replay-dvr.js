// ════════════════════════════════════════════════════════════════
//  🎬 REPLAY DVR — Record every tool invocation for replay/audit
//  Chaque appel runTool produit une "tape" (stdout, exitCode, args,
//  duree, captures). Rejoue une tape pour debugger / re-demontrer.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TAPE_DIR = path.join(__dirname, '..', 'data', 'tapes');
const INDEX_FILE = path.join(TAPE_DIR, 'index.json');
try { fs.mkdirSync(TAPE_DIR, { recursive: true }); } catch {}

let _index = [];
try { if (fs.existsSync(INDEX_FILE)) _index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')); } catch {}

function _persist() {
    try { fs.writeFileSync(INDEX_FILE, JSON.stringify(_index, null, 2)); } catch {}
}

// Start a recording session ; returns { record(out), end(result) }
function startTape({ tool, target, args = {}, engagement = null, meta = {} }) {
    const id = crypto.randomBytes(6).toString('hex');
    const startedAt = Date.now();
    const buffer = [];
    const tape = {
        id,
        tool,
        target,
        args,
        engagement,
        meta,
        startedAt,
        chunks: buffer,
    };
    return {
        id,
        record(data) { buffer.push({ t: Date.now() - startedAt, data: String(data).slice(0, 50000) }); },
        end(result) {
            tape.endedAt = Date.now();
            tape.durationMs = tape.endedAt - startedAt;
            tape.ok = !!result?.ok;
            tape.exitCode = result?.exitCode;
            tape.output = String(result?.output || '').slice(0, 100000);
            tape.error = result?.error;
            const file = path.join(TAPE_DIR, `${id}.json`);
            fs.writeFileSync(file, JSON.stringify(tape, null, 2));
            _index.push({ id, tool, target, startedAt, durationMs: tape.durationMs, ok: tape.ok, engagement });
            if (_index.length > 5000) _index = _index.slice(-4000);
            _persist();
            return tape;
        },
    };
}

function list({ engagement = null, tool = null, target = null, limit = 100 } = {}) {
    let out = _index;
    if (engagement) out = out.filter(t => t.engagement === engagement);
    if (tool) out = out.filter(t => t.tool === tool);
    if (target) out = out.filter(t => t.target === target);
    return out.slice(-limit).sort((a, b) => b.startedAt - a.startedAt);
}

function read(id) {
    try {
        const p = path.join(TAPE_DIR, `${id}.json`);
        if (!fs.existsSync(p)) return null;
        return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch { return null; }
}

async function replay(id, runToolFn) {
    const tape = read(id);
    if (!tape) return { ok: false, error: 'tape-not-found' };
    if (!runToolFn) return { ok: false, error: 'no-run-fn', tape };
    const res = await runToolFn({ tool: tape.tool, args: tape.args });
    return { ok: true, original: { output: tape.output?.slice(0, 500), ok: tape.ok }, replayed: res };
}

function remove(id) {
    const idx = _index.findIndex(e => e.id === id);
    if (idx < 0) return { ok: false, error: 'not-found' };
    try { fs.unlinkSync(path.join(TAPE_DIR, `${id}.json`)); } catch {}
    _index.splice(idx, 1);
    _persist();
    return { ok: true };
}

function stats() {
    const byTool = {};
    const byEngagement = {};
    let totalDuration = 0;
    for (const t of _index) {
        byTool[t.tool] = (byTool[t.tool] || 0) + 1;
        if (t.engagement) byEngagement[t.engagement] = (byEngagement[t.engagement] || 0) + 1;
        totalDuration += t.durationMs || 0;
    }
    return {
        total: _index.length,
        byTool,
        byEngagement,
        avgDurationMs: _index.length ? Math.round(totalDuration / _index.length) : 0,
    };
}

module.exports = { startTape, list, read, replay, remove, stats };
