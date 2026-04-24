// ════════════════════════════════════════════════════════════════
//  🐝 SWARM MANAGER — Multi-agents paralleles avec knowledge partagee
//  Lance N agents sur une liste de cibles (ex: racine + sous-domaines),
//  mutualise la memoire par engagement et stream les events agreges.
//  Concurrency hard-limit pour eviter de saturer la sandbox.
// ════════════════════════════════════════════════════════════════

'use strict';

const EventEmitter = require('events');
const crypto = require('crypto');

// Concurrency max par swarm (hard limit pour eviter saturation sandbox)
const MAX_CONCURRENT = parseInt(process.env.KEYSOSI_SWARM_MAX_CONCURRENT || '4', 10);

const swarms = new Map(); // id -> Swarm

class Swarm extends EventEmitter {
    constructor({ id, engagementSlug, targets, mode, goal, orchestrated, exploitUnlocked, scopeOverride, concurrency }) {
        super();
        this.id = id;
        this.engagementSlug = engagementSlug || null;
        this.targets = Array.from(new Set(targets.filter(Boolean).map(t => String(t).trim())));
        this.mode = mode || 'recon-only';
        this.goal = goal || '';
        this.orchestrated = !!orchestrated;
        this.exploitUnlocked = !!exploitUnlocked;
        this.scopeOverride = !!scopeOverride;
        this.concurrency = Math.min(concurrency || 2, MAX_CONCURRENT);

        this.createdAt = Date.now();
        this.startedAt = null;
        this.endedAt = null;
        this.status = 'idle'; // idle | running | done | stopping

        this.agents = new Map();       // target -> agentId
        this.agentSnapshots = new Map(); // agentId -> last snapshot
        this.findings = [];
        this.stats = { started: 0, completed: 0, failed: 0, findings: 0 };
    }

    snapshot() {
        return {
            id: this.id,
            engagement: this.engagementSlug,
            mode: this.mode,
            goal: this.goal,
            concurrency: this.concurrency,
            status: this.status,
            targets: this.targets,
            agents: Array.from(this.agents.entries()).map(([target, agentId]) => ({
                target,
                agentId,
                snapshot: this.agentSnapshots.get(agentId) || null,
            })),
            stats: this.stats,
            findings: this.findings.slice(-20),
            createdAt: this.createdAt,
            startedAt: this.startedAt,
            endedAt: this.endedAt,
            durationMs: this.endedAt ? this.endedAt - (this.startedAt || this.createdAt) : null,
        };
    }

    stop() {
        this.status = 'stopping';
        this.emit('log', { level: 'warn', msg: 'Swarm stop requested' });
    }

    /**
     * Lance le swarm en pool de concurrence : au plus `concurrency` agents en parallele.
     * agentFactory : fonction (opts) -> Agent (depend de agent.js injecte via ctx)
     */
    async run(agentFactory) {
        if (this.status === 'running') return;
        this.status = 'running';
        this.startedAt = Date.now();
        this.emit('start', this.snapshot());

        const queue = [...this.targets];
        const workers = [];

        const worker = async () => {
            while (queue.length && this.status !== 'stopping') {
                const target = queue.shift();
                if (!target) break;
                await this._runOneAgent(target, agentFactory);
            }
        };

        for (let i = 0; i < this.concurrency; i++) workers.push(worker());
        await Promise.allSettled(workers);

        this.status = 'done';
        this.endedAt = Date.now();
        this.emit('end', this.snapshot());
    }

    async _runOneAgent(target, agentFactory) {
        this.stats.started++;
        let agent;
        try {
            agent = agentFactory({
                target,
                engagementSlug: this.engagementSlug,
                mode: this.mode,
                goal: this.goal,
                orchestrated: this.orchestrated,
                exploitUnlocked: this.exploitUnlocked,
                scopeOverride: this.scopeOverride,
            });
        } catch (e) {
            this.stats.failed++;
            this.emit('log', { level: 'error', target, msg: `agent-factory-error: ${e.message}` });
            return;
        }

        this.agents.set(target, agent.id);
        this.agentSnapshots.set(agent.id, agent.snapshot());

        // Relay des events importants
        agent.on('log', entry => {
            this.agentSnapshots.set(agent.id, agent.snapshot());
            this.emit('agent-log', { agentId: agent.id, target, entry });
        });
        agent.on('step', step => this.emit('agent-step', { agentId: agent.id, target, ...step }));
        agent.on('finding', finding => {
            this.findings.push({ agentId: agent.id, target, ...finding });
            this.stats.findings++;
            this.emit('finding', { agentId: agent.id, target, finding });
        });
        agent.on('tool-end', te => this.emit('agent-tool-end', { agentId: agent.id, target, ...te }));

        await new Promise((resolve) => {
            agent.on('end', () => {
                this.stats.completed++;
                this.agentSnapshots.set(agent.id, agent.snapshot());
                resolve();
            });
            try {
                agent.start();
            } catch (e) {
                this.stats.failed++;
                this.emit('log', { level: 'error', target, msg: `agent-start-error: ${e.message}` });
                resolve();
            }
        });
    }
}

// ── Registry API ──
function createSwarm(opts) {
    const id = opts.id || crypto.randomBytes(4).toString('hex');
    const s = new Swarm({ ...opts, id });
    swarms.set(id, s);
    // Cleanup 30 min apres la fin
    s.on('end', () => {
        setTimeout(() => swarms.delete(id), 30 * 60 * 1000);
    });
    return s;
}

function getSwarm(id) { return swarms.get(String(id)) || null; }

function listSwarms() {
    return Array.from(swarms.values()).map(s => s.snapshot());
}

function stopSwarm(id) {
    const s = swarms.get(String(id));
    if (!s) return { ok: false, error: 'swarm-not-found' };
    s.stop();
    return { ok: true };
}

module.exports = { createSwarm, getSwarm, listSwarms, stopSwarm, MAX_CONCURRENT };
