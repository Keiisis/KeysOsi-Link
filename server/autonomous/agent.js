// ════════════════════════════════════════════════════════════════
//  🤖 AGENT — Autonomous pentest orchestrator (ReAct loop)
//  - Groq LLaMA 3.3 70B pour le raisonnement
//  - Actions : run_tool | install_tool | ask_user | add_finding | conclude
//  - Scope enforcement + mode recon-only par defaut
//  - Memoire persistante par engagement + patterns globaux
// ════════════════════════════════════════════════════════════════
const EventEmitter = require('events');
const tools = require('./tools');
const installer = require('./installer');
const memory = require('./engagement-memory');
const engagements = require('../engagements');
const rag = require('./rag');
const orchestrator = require('./orchestrator');
const reflection = require('./reflection');
const aiProvider = require('./ai-provider');

// ── v6 Phantom modules (tolerant si absents, non-blocant) ──
function _opt(p) { try { return require(p); } catch { return null; } }
const cveMapper = _opt('./cve-mapper');
const payloadsLib = _opt('./payloads');
const sessionMgr = _opt('./session-manager');
const oobCollab = _opt('./oob-collaborator');
const jsSecretScanner = _opt('./js-secret-scanner');
const osintLib = _opt('./osint');
const rateLimiter = _opt('./rate-limiter');
const bugbountyApi = _opt('./bugbounty-api');
const fewshotMemory = _opt('./fewshot-memory');
const replayDvr = _opt('./replay-dvr');
const reportGen = _opt('./report-gen');
const notifications = _opt('./notifications');

// Model routing — resolu dynamiquement depuis ai-config
// (reasoning = 70B/Opus/GPT-4o ; cheap = 8B/Haiku/GPT-4o-mini)

// Budget tokens par agent — hard stop quand atteint
const TOKEN_BUDGET = parseInt(process.env.AURA_TOKEN_BUDGET || '500000', 10);
const TOKEN_WARN_RATIO = 0.8;

const MAX_STEPS = 40;
const QUESTION_TIMEOUT_MS = 5 * 60 * 1000; // 5 min sinon skip

// Approx 4 chars ≈ 1 token (suffit pour tracking budget)
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(String(text).length / 4);
}

const agents = new Map(); // id -> Agent
let agentCounter = 0;

function targetHost(target) {
    try {
        return new URL(/^https?:/.test(target) ? target : `http://${target}`).hostname;
    } catch {
        return String(target).replace(/^https?:\/\//, '').split('/')[0];
    }
}

class Agent extends EventEmitter {
    constructor({ target, engagementSlug, mode = 'recon-only', goal = '', orchestrated = false, exploitUnlocked = false, scopeOverride = false }) {
        super();
        this.id = String(++agentCounter);
        this.target = target;
        this.engagementSlug = engagementSlug || null;
        this.mode = mode; // 'recon-only' | 'full' | 'exploit'
        this.goal = goal;
        this.orchestrated = !!orchestrated; // Planner + multi-phase execution
        this.exploitUnlocked = !!exploitUnlocked;
        // scopeOverride : autorise les cibles hors-scope apres deverrouillage explicite.
        // Chaque cible hors-scope est loggee (auditabilite). Supprime UNIQUEMENT le hard block,
        // pas les verifications de mandat / bug bounty platform qui restent pour info utilisateur.
        this.scopeOverride = !!scopeOverride;
        this._scopeOverrideTargets = new Set(); // cibles hors-scope deja autorisees dans cette session
        this.steps = 0;
        this.running = false;
        this.status = 'idle';
        this.transcript = [];
        this.pendingQuestion = null;
        this.knowledge = null;
        this._allowed = new Set();

        // Budget tracking
        this.tokens = { prompt: 0, completion: 0, total: 0, budget: TOKEN_BUDGET, calls: 0, byModel: {} };
        this._budgetWarned = false;
    }

    // LLM wrapper : routing + token tracking + hard stop
    async _llm({ messages, model, response_format, temperature = 0.2, purpose = 'decide' }) {
        model = model || this.models?.reasoning;
        if (this.tokens.total >= this.tokens.budget) {
            this._log('error', `💸 Budget tokens epuise (${this.tokens.total}/${this.tokens.budget}) — arret agent`);
            this.running = false;
            throw new Error('token-budget-exceeded');
        }
        const approxIn = messages.reduce((s, m) => s + estimateTokens(m.content), 0);
        const res = await this.ai.chat.completions.create({
            model, temperature, response_format, messages,
        });
        const u = res.usage || {};
        const inTok = u.prompt_tokens || approxIn;
        const outTok = u.completion_tokens || estimateTokens(res.choices?.[0]?.message?.content || '');
        this.tokens.prompt += inTok;
        this.tokens.completion += outTok;
        this.tokens.total = this.tokens.prompt + this.tokens.completion;
        this.tokens.calls++;
        this.tokens.byModel[model] = (this.tokens.byModel[model] || 0) + inTok + outTok;
        this.emit('tokens', { ...this.tokens, purpose, model });

        if (!this._budgetWarned && this.tokens.total >= this.tokens.budget * TOKEN_WARN_RATIO) {
            this._budgetWarned = true;
            this._log('warn', `💸 Token budget a ${Math.round(100 * this.tokens.total / this.tokens.budget)}% (${this.tokens.total}/${this.tokens.budget})`);
        }
        return res;
    }

    // Helper pour tache simple/classification → cheap model
    async _llmCheap({ messages, response_format, purpose = 'classify' }) {
        return this._llm({ messages, model: this.models?.cheap, response_format, purpose });
    }

    unlockExploit() {
        this.exploitUnlocked = true;
        this._log('warn', '🔓 Exploit mode unlocked by user');
        this.emit('unlock', { at: new Date().toISOString() });
    }

    /**
     * Active le scope-override : les cibles hors-scope engagement/bug-bounty ne seront
     * plus hard-bloquees mais loggees comme WARN. Chaque cible est tracee dans
     * _scopeOverrideTargets pour audit.
     * L'utilisateur declare explicitement avoir l'autorisation ecrite necessaire.
     */
    overrideScope(reason = 'user-declared-authorization') {
        this.scopeOverride = true;
        this._log('warn', `🔓 SCOPE-OVERRIDE active — raison: ${reason}. Toute cible hors-scope sera loggee.`);
        this.emit('scope-override', { at: new Date().toISOString(), reason });
    }

    _log(level, msg, extra) {
        const entry = { at: new Date().toISOString(), level, msg, extra };
        this.transcript.push(entry);
        if (this.transcript.length > 400) this.transcript = this.transcript.slice(-400);
        this.emit('log', entry);
    }

    snapshot() {
        return {
            id: this.id,
            target: this.target,
            engagement: this.engagementSlug,
            mode: this.mode,
            orchestrated: this.orchestrated,
            exploitUnlocked: this.exploitUnlocked,
            scopeOverride: this.scopeOverride,
            scopeOverrideTargets: [...this._scopeOverrideTargets],
            goal: this.goal,
            status: this.status,
            steps: this.steps,
            pendingQuestion: this.pendingQuestion,
            tokens: this.tokens,
            transcript: this.transcript.slice(-80),
        };
    }

    answer(questionId, value) {
        this.emit('answer', { id: questionId, value });
    }

    ask(question, choices = ['oui', 'non']) {
        return new Promise((resolve) => {
            const qid = Math.random().toString(36).slice(2, 10);
            this.pendingQuestion = { id: qid, question, choices, at: new Date().toISOString() };
            this.emit('question', this.pendingQuestion);
            const timeout = setTimeout(() => {
                this.off('answer', handler);
                this.pendingQuestion = null;
                this._log('warn', `Question sans reponse (timeout): ${question}`);
                resolve(null);
            }, QUESTION_TIMEOUT_MS);
            const handler = (a) => {
                if (a.id !== qid) return;
                clearTimeout(timeout);
                this.off('answer', handler);
                this.pendingQuestion = null;
                resolve(a.value);
            };
            this.on('answer', handler);
        });
    }

    stop() {
        this.running = false;
        this.status = 'stopping';
        this._log('info', 'Arret demande par utilisateur');
    }

    async start() {
        if (this.running) return;
        try {
            const active = await aiProvider.getActive();
            this.ai = active.client;
            this.provider = active.provider;
            this.models = active.models;
            this._log('info', `🧠 Provider=${this.provider} · reasoning=${this.models.reasoning} · cheap=${this.models.cheap}`);
        } catch (e) {
            this._log('error', `Provider IA non configure : ${e.message}. Configure via /ai/config.`);
            this.status = 'error';
            this.emit('end', { reason: 'no-provider' });
            return;
        }
        this.running = true;
        this.status = 'running';
        this.emit('start', this.snapshot());

        // Scope enforcement
        const eng = this.engagementSlug ? await engagements.get(this.engagementSlug) : null;
        if (eng) {
            const inScope = engagements.isInScope(eng, this.target);
            if (inScope === false) {
                if (this.scopeOverride) {
                    this._scopeOverrideTargets.add(targetHost(this.target));
                    this._log('warn', `⚠️  SCOPE-OVERRIDE : ${this.target} HORS du scope "${eng.name}" mais autorise par override utilisateur`);
                } else {
                    const ans = await this.ask(
                        `⚠ ${this.target} est HORS du scope "${eng.name}". Continuer ?`,
                        ['oui, etendre le scope', 'oui, activer scope-override', 'non, arreter']
                    );
                    if (!ans || ans.startsWith('non')) {
                        this._log('warn', 'Arret : cible hors scope');
                        this.running = false;
                        this.status = 'done';
                        this.emit('end', { reason: 'out-of-scope' });
                        return;
                    }
                    if (ans.includes('scope-override')) {
                        this.overrideScope('user-accepted-at-start');
                        this._scopeOverrideTargets.add(targetHost(this.target));
                    } else {
                        const newScope = [...eng.scope, targetHost(this.target)];
                        await engagements.update(this.engagementSlug, { scope: newScope });
                        this._log('info', `Scope etendu : ${targetHost(this.target)}`);
                    }
                }
            }
        } else {
            this._log('warn', 'Aucun engagement actif — scope check desactive.');
        }

        // Memoire
        this.knowledge = await memory.load(this.engagementSlug || 'default');
        const host = targetHost(this.target);
        this.knowledge.hosts[host] = this.knowledge.hosts[host] || { tech: [], ports: {}, endpoints: [] };

        // ── v6 Phantom : preload side-services (non-blocant, best-effort) ──
        // 1) OOB collaborator : start si pas deja running
        if (oobCollab?.start) {
            try {
                const st = oobCollab.status?.();
                if (!st?.running) await oobCollab.start();
                this._log('info', '📡 OOB collaborator pret pour blind vulns');
            } catch (e) { this._log('warn', `OOB skip: ${e.message}`); }
        }
        // 2) Bug bounty scope auto-check (si engagement a platform+handle)
        if (bugbountyApi?.getProgram && eng?.platform && eng?.handle) {
            try {
                const prog = await bugbountyApi.getProgram(eng.platform, eng.handle);
                if (prog?.ok) {
                    const chk = bugbountyApi.isInScope(host, prog.scope, prog.outOfScope);
                    if (chk && chk.inScope === false) {
                        if (this.scopeOverride) {
                            this._scopeOverrideTargets.add(host);
                            this._log('warn', `⚠️  SCOPE-OVERRIDE : ${host} OUT-OF-SCOPE sur ${eng.platform}/${eng.handle} mais autorise par override`);
                        } else {
                            this._log('error', `🚫 Target ${host} OUT-OF-SCOPE sur ${eng.platform}/${eng.handle}`);
                            this.running = false; this.status = 'done';
                            this.emit('end', { reason: 'bb-out-of-scope' });
                            return;
                        }
                    } else {
                        this._log('info', `✅ Scope check ${eng.platform}/${eng.handle} OK`);
                    }
                }
            } catch (e) { this._log('warn', `BB scope check skip: ${e.message}`); }
        }
        // 3) OSINT passif : crt.sh + VT si cible est un domaine (non-IP)
        if (osintLib?.fullRecon && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            try {
                const osintRes = await osintLib.fullRecon(this.target);
                if (osintRes) {
                    this.knowledge.hosts[host].osint = osintRes;
                    const subs = osintRes?.subdomains?.length || 0;
                    this._log('info', `🛰️  OSINT : ${subs} sous-domaines · ${Object.keys(osintRes || {}).filter(k => osintRes[k]?.ok).length} sources ok`);
                }
            } catch (e) { this._log('warn', `OSINT skip: ${e.message}`); }
        }
        // 4) Fewshot : charger chaines similaires pour inspirer le planner
        this._fewshotExamples = '';
        if (fewshotMemory?.search) {
            try {
                const matches = fewshotMemory.search({
                    tech: this.knowledge.hosts[host].tech || [],
                    ports: Object.keys(this.knowledge.hosts[host].ports || {}),
                    goal: this.goal,
                    waf: this.knowledge.hosts[host].waf,
                    limit: 3,
                });
                if (matches?.length && fewshotMemory.asPromptExamples) {
                    this._fewshotExamples = fewshotMemory.asPromptExamples(matches);
                    this._log('info', `🧬 Fewshot : ${matches.length} chaines similaires chargees`);
                }
            } catch (e) { this._log('warn', `Fewshot skip: ${e.message}`); }
        }

        // Mode orchestrated : construire un plan + l'executer, puis basculer en ReAct pour la synthese
        if (this.orchestrated) {
            try {
                this._log('info', '🎭 Mode orchestrated — construction du plan...');
                const plan = await orchestrator.buildPlan({
                    client: this.ai, model: this.models.reasoning,
                    target: this.target, goal: this.goal,
                    hostMem: this.knowledge.hosts[host],
                    mode: this.mode, exploitUnlocked: this.exploitUnlocked,
                });
                await orchestrator.executePlan({
                    plan, agent: this,
                    runToolFn: async (action) => {
                        this.steps++;
                        this.emit('step', { step: this.steps, action });
                        await this._runTool(action);
                    },
                });
                // Synthese findings
                const synth = await orchestrator.synthesizeVulns({
                    client: this.ai, model: this.models.reasoning,
                    hostMem: this.knowledge.hosts[host],
                });
                for (const f of synth.findings || []) {
                    await this._addFinding({ action: 'add_finding', ...f });
                }
                this._log('info', `✓ Plan execute (${this.steps} steps) — bascule en ReAct pour suivi`);
            } catch (e) {
                this._log('error', 'Plan exec error: ' + (e.message || e));
            }
        }

        // Loop ReAct (suivi adaptatif)
        try {
            while (this.running && this.steps < MAX_STEPS) {
                this.steps++;
                let action;
                try {
                    action = await this._decide();
                } catch (e) {
                    this._log('error', 'LLM decide error: ' + (e.message || e));
                    break;
                }
                if (!action || !action.action) {
                    this._log('warn', 'Action indefinie, arret');
                    break;
                }
                this._log('info', `[step ${this.steps}] ${action.action}${action.tool ? ' · ' + action.tool : ''} — ${action.rationale || ''}`);
                this.emit('step', { step: this.steps, action });
                await memory.recordDecision(this.engagementSlug || 'default', action);
                const terminal = await this._execute(action);
                if (terminal) break;
            }
            if (this.steps >= MAX_STEPS) this._log('warn', `Limite de ${MAX_STEPS} steps atteinte`);
        } catch (e) {
            this._log('error', 'Agent loop error: ' + (e.message || e));
        } finally {
            this.running = false;
            this.status = 'done';
            await memory.save(this.engagementSlug || 'default', this.knowledge);

            // Self-improving critic : debrief + extraction patterns reutilisables
            let engFindings = [];
            try {
                engFindings = this.engagementSlug
                    ? (await engagements.get(this.engagementSlug))?.findings?.filter(f => f.source?.includes?.(`agent:${this.id}`) || true) || []
                    : [];
                const dbRes = await reflection.debrief({ agent: this, knowledge: this.knowledge, findings: engFindings });
                if (dbRes.ok) this._log('info', `🧬 Debrief OK : ${dbRes.patternsSaved} patterns sauves`);
            } catch (e) {
                this._log('warn', 'Debrief skip: ' + (e.message || e));
            }

            // ── v6 Phantom : auto-generation rapport final ──
            if (reportGen?.generate && this.engagementSlug) {
                try {
                    const rep = await reportGen.generate({
                        engagement: this.engagementSlug,
                        target: this.target,
                        knowledge: this.knowledge,
                        findings: engFindings,
                        format: 'both',
                        meta: { agentId: this.id, steps: this.steps, tokens: this.tokens },
                    });
                    if (rep?.ok) this._log('info', `📄 Rapport genere : ${rep.mdPath || rep.htmlPath || '(inline)'}`);
                } catch (e) { this._log('warn', `Report-gen skip: ${e.message}`); }
            }

            // ── v6 Phantom : record chain si une high+ finding a ete prouvee ──
            if (fewshotMemory?.record && this.engagementSlug) {
                try {
                    const proven = engFindings.some(f => ['high', 'critical'].includes((f.severity || '').toLowerCase()) && f.evidence);
                    if (proven) {
                        const host = targetHost(this.target);
                        const chainNodes = this.transcript
                            .filter(t => t.level === 'info' && t.msg?.startsWith?.('Run '))
                            .slice(-12)
                            .map(t => {
                                const m = t.msg.match(/^Run (\S+)\s+(.*)$/);
                                return m ? { tool: m[1], action: 'recon/exploit', args: m[2] } : null;
                            })
                            .filter(Boolean);
                        if (chainNodes.length) {
                            const impact = engFindings.find(f => ['high', 'critical'].includes((f.severity || '').toLowerCase()))?.title || 'impact';
                            fewshotMemory.record({
                                target: host,
                                goal: this.goal,
                                chain: { summary: `Auto-recorded from agent ${this.id}`, reason: 'proven-finding', nodes: chainNodes },
                                knowledge: this.knowledge,
                                impact,
                                proven: true,
                            });
                            this._log('info', `🧬 Fewshot : chaine prouvee sauvegardee (${chainNodes.length} etapes)`);
                        }
                    }
                } catch (e) { this._log('warn', `Fewshot record skip: ${e.message}`); }
            }

            this.emit('end', { reason: 'done', steps: this.steps, tokens: this.tokens });
        }
    }

    async _decide() {
        const host = targetHost(this.target);
        const hostMem = this.knowledge.hosts[host] || {};
        const system = this._systemPrompt();
        const patterns = await memory.getRelevantPatterns(hostMem);
        let ragBrief = '';
        try {
            ragBrief = await rag.briefFor({
                target: this.target, goal: this.goal, hostMem,
                engagementSlug: this.engagementSlug,
            });
        } catch {}
        // ── v6 Phantom : hints WAF + CVE + secrets detectes ──
        const wafHint = hostMem.waf ? `⚠️  WAF detecte : ${hostMem.waf} — privilegier payloads bypass (cf. /payloads/get?waf=${hostMem.waf}).` : '';
        const cveHint = hostMem.cves?.length ? `🛡️  CVEs mappees (${hostMem.cves.length}) : ${hostMem.cves.slice(0, 5).map(c => c.id || c.cve).filter(Boolean).join(', ')}` : '';
        const secretsHint = hostMem.jsSecrets?.length ? `🔑 ${hostMem.jsSecrets.length} secrets JS potentiels detectes — envisager add_finding.` : '';
        const fewshotHint = this._fewshotExamples ? `\n${this._fewshotExamples}` : '';

        const context = `Cible: ${this.target} (host: ${host})
Goal: ${this.goal || '(audit general)'}
Step ${this.steps}/${MAX_STEPS} · Mode: ${this.mode} · ExploitUnlocked: ${this.exploitUnlocked}

Connaissance actuelle:
${JSON.stringify(hostMem, null, 2).slice(0, 3000)}

${wafHint}
${cveHint}
${secretsHint}
${ragBrief ? `📚 RAG (experiences passees similaires):\n${ragBrief}\n` : ''}${fewshotHint}
${patterns.length ? `Patterns pertinents appris :\n${patterns.map(p => `- ${p.rule}`).join('\n')}\n` : ''}
10 dernieres actions:
${this.transcript.filter(t => t.level === 'info').slice(-10).map(t => '- ' + t.msg).join('\n') || '(aucune)'}

Decide ta prochaine action en JSON.`;

        const res = await this._llm({
            model: this.models?.reasoning,
            response_format: { type: 'json_object' },
            purpose: 'decide',
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: context },
            ],
        });
        const raw = res.choices?.[0]?.message?.content || '{}';
        try { return JSON.parse(raw); }
        catch {
            this._log('warn', 'Reponse LLM non-JSON : ' + raw.slice(0, 200));
            return null;
        }
    }

    // Parse/classify rapide via cheap model — utile pour extraire tags, severites, tech
    async classify({ text, schema, instruction = 'Extrait les informations demandees.' }) {
        try {
            const res = await this._llmCheap({
                response_format: { type: 'json_object' },
                purpose: 'classify',
                messages: [
                    { role: 'system', content: `${instruction}\nSchema attendu: ${schema}\nReponds STRICTEMENT en JSON.` },
                    { role: 'user', content: String(text).slice(0, 4000) },
                ],
            });
            return JSON.parse(res.choices?.[0]?.message?.content || '{}');
        } catch {
            return null;
        }
    }

    _systemPrompt() {
        return `Tu es un agent pentest autonome dans un sandbox Kali Linux isole.
Mandat strict: audit de securite autorise (CTF / bug bounty avec scope ecrit / propre infra).
Refuse toute action hors scope, DoS, supply-chain, ou destructive.

A chaque tour, reponds STRICTEMENT en JSON valide:
{
  "action": "run_tool" | "install_tool" | "ask_user" | "add_finding" | "conclude",
  "rationale": "pourquoi (1 phrase max)",
  // si run_tool:
  "tool": "<nom du catalog>",
  "args": "<target ou argument unique>",
  // si install_tool:
  "method": "apt" | "pip" | "go" | "git",
  "package": "<nom du package ou URL git>",
  "binary": "<binaire a verifier apres install>",
  // si ask_user:
  "question": "...",
  "choices": ["option1", "option2"],
  // si add_finding:
  "title": "...",
  "severity": "info" | "low" | "medium" | "high" | "critical",
  "description": "...",
  "evidence": "..."
}

Outils catalog disponibles (args = target sauf exec):
${tools.listForPrompt()}

Methode recommandee :
1. Recon passif : whatweb, httpx, headers, wafw00f, dnsx
2. Enum : subfinder (si scope le permet), katana
3. Scan actif : nmap, nuclei
4. Ciblage par tech : wpscan si WordPress, sqlmap si param suspect, gobuster/ffuf si exploration
5. add_finding des decouvertes avec preuves
6. conclude quand audit suffisant (ou 3-4 findings)

En mode "recon-only", tout outil intrusif doit passer par ask_user d'abord.
En mode "full", les exploits (sqlmap exploit, metasploit) demandent ask_user.
Si un binaire manque dans la sandbox, install_tool avec methode adaptee.
Ne jamais relancer le meme outil avec les memes args consecutivement.`;
    }

    async _execute(action) {
        try {
            switch (action.action) {
                case 'run_tool': return await this._runTool(action);
                case 'install_tool': return await this._installTool(action);
                case 'ask_user': return await this._askUser(action);
                case 'add_finding': return await this._addFinding(action);
                case 'conclude':
                    this._log('info', '✓ Audit termine par l\'agent');
                    return true; // terminal
                default:
                    this._log('warn', `Action inconnue: ${action.action}`);
                    return false;
            }
        } catch (e) {
            this._log('error', `Execute error: ${e.message || e}`);
            return false;
        }
    }

    async _runTool(action) {
        const { tool, args } = action;
        if (!tools.has(tool)) {
            this._log('warn', `Outil absent du catalog: ${tool}. L'agent peut proposer install_tool.`);
            return false;
        }
        const target = args || this.target;
        const host = targetHost(target);

        // Scope check
        const eng = this.engagementSlug ? await engagements.get(this.engagementSlug) : null;
        if (eng) {
            const inScope = engagements.isInScope(eng, host);
            if (inScope === false) {
                if (this.scopeOverride) {
                    if (!this._scopeOverrideTargets.has(host)) {
                        this._scopeOverrideTargets.add(host);
                        this._log('warn', `⚠️  SCOPE-OVERRIDE : nouvelle cible hors-scope autorisee → ${host} (tool: ${tool})`);
                    }
                } else {
                    this._log('error', `SCOPE BLOCK: ${host} hors scope, action refusee`);
                    return false;
                }
            }
        }

        // Exploit gate (double-check)
        if (tools.isExploit(tool)) {
            if (!this.exploitUnlocked) {
                const ans = await this.ask(
                    `🔓 EXPLOIT : ${tool} peut causer un impact (dump/session/brute). Deverrouiller le mode exploit pour cette session ?`,
                    ['oui, deverrouiller', 'non, annuler']
                );
                if (!ans || ans.startsWith('non')) {
                    this._log('warn', `Exploit ${tool} refuse par l'utilisateur`);
                    return false;
                }
                this.exploitUnlocked = true;
                this._log('warn', '🔓 Exploit unlocked');
                this.emit('unlock', { at: new Date().toISOString() });
            }
            // Confirmation par-outil (sauf si deja dans _allowed)
            if (!this._allowed.has(tool)) {
                const ans2 = await this.ask(
                    `Exploit ${tool} sur ${host} — confirmer l'execution ?`,
                    ['oui', 'non', 'oui et ne plus demander pour cet outil']
                );
                if (!ans2 || ans2 === 'non') {
                    this._log('info', `Skip ${tool}`);
                    return false;
                }
                if (ans2.startsWith('oui et ne plus demander')) this._allowed.add(tool);
            }
        }
        // Intrusive confirmation (si recon-only et non exploit)
        else if (this.mode === 'recon-only' && tools.isIntrusive(tool) && !this._allowed.has(tool)) {
            const ans = await this.ask(
                `Outil intrusif : ${tool} sur ${host}. Lancer ?`,
                ['oui', 'non', 'oui et ne plus demander pour cet outil']
            );
            if (!ans || ans === 'non') {
                this._log('info', `Skip ${tool} (refus utilisateur)`);
                return false;
            }
            if (ans.startsWith('oui et ne plus demander')) this._allowed.add(tool);
        }

        // ── v6 Phantom : rate-limiter pre-call (wait si backoff requis) ──
        if (rateLimiter?.wait) {
            try {
                const advice = rateLimiter.shouldBackoff?.(host);
                if (advice?.backoff) this._log('warn', `⏳ Rate-limit : attente ${advice.waitMs}ms avant ${tool}`);
                await rateLimiter.wait(host);
            } catch {}
        }

        this.emit('tool-start', { tool, target });
        this._log('info', `Run ${tool} ${target}`);

        // ── v6 Phantom : replay-dvr (enregistre chaque invocation) ──
        let tape = null;
        if (replayDvr?.startTape) {
            try {
                tape = replayDvr.startTape({
                    tool, target, args: { args: target },
                    engagement: this.engagementSlug || null,
                    meta: { agentId: this.id, step: this.steps },
                });
            } catch {}
        }

        const res = await tools.run(tool, target);

        try { tape?.record?.(res.output?.slice(0, 5000) || ''); } catch {}
        try { tape?.end?.({ ok: res.exitCode === 0, exitCode: res.exitCode, output: res.output }); } catch {}

        this._log('info', `Fin ${tool} (exit ${res.exitCode}, ${res.output.length} chars)`);
        this.emit('tool-end', {
            tool, target,
            exitCode: res.exitCode,
            outputPreview: res.output.slice(0, 1500),
        });

        this.knowledge.hosts[host] = this.knowledge.hosts[host] || { tech: [], ports: {}, endpoints: [] };
        tools.ingest(tool, res.output, this.knowledge.hosts[host]);

        // ── v6 Phantom : rate-limiter record (detecte 429/403/WAF block) ──
        if (rateLimiter?.record) {
            try {
                const statusMatch = res.output.match(/HTTP\/[\d.]+\s+(\d{3})/);
                const status = statusMatch ? parseInt(statusMatch[1], 10) : (res.exitCode === 0 ? 200 : 0);
                rateLimiter.record(host, { status, headers: {}, body: res.output.slice(0, 2000) });
            } catch {}
        }

        // ── v6 Phantom : session-manager capture cookies depuis output ──
        if (sessionMgr?.setCookiesFromHeader) {
            try {
                const setCookies = [...res.output.matchAll(/[Ss]et-[Cc]ookie:\s*([^\r\n]+)/g)].map(m => m[1]);
                for (const c of setCookies) sessionMgr.setCookiesFromHeader(host, c);
            } catch {}
        }

        // ── v6 Phantom : CVE enrichment auto apres recon (whatweb/httpx/nmap) ──
        if (cveMapper?.enrichTech && ['whatweb', 'httpx', 'nmap'].includes(tool)) {
            try {
                const techList = this.knowledge.hosts[host].tech || [];
                if (techList.length) {
                    const cves = await cveMapper.enrichTech(techList);
                    if (cves?.length) {
                        this.knowledge.hosts[host].cves = (this.knowledge.hosts[host].cves || []).concat(cves).slice(0, 50);
                        this._log('info', `🛡️  CVE : ${cves.length} vulnerabilites mappees depuis tech fingerprint`);
                    }
                }
            } catch (e) { this._log('warn', `CVE enrich skip: ${e.message}`); }
        }

        // ── v6 Phantom : JS secrets scan apres crawl (katana/gobuster) ──
        if (jsSecretScanner?.scanSite && ['katana', 'http_curl', 'httpx'].includes(tool) && !this.knowledge.hosts[host]._jsScanned) {
            try {
                const baseUrl = /^https?:/.test(target) ? target : `https://${target}`;
                const secrets = await jsSecretScanner.scanSite(baseUrl);
                this.knowledge.hosts[host]._jsScanned = true;
                if (secrets?.hits?.length) {
                    this.knowledge.hosts[host].jsSecrets = secrets.hits;
                    this._log('warn', `🔑 JS Secrets : ${secrets.hits.length} potentiels secrets detectes dans bundles`);
                }
            } catch (e) { this._log('warn', `JS scan skip: ${e.message}`); }
        }

        await memory.save(this.engagementSlug || 'default', this.knowledge);

        if (this.engagementSlug) {
            await engagements.appendActivity(this.engagementSlug, {
                kind: `agent:${tool}`, target, summary: `exit ${res.exitCode}, ${res.output.split('\n').length} lignes`,
            }).catch(() => {});
        }
        return false;
    }

    async _installTool(action) {
        const { method, package: pkg, binary } = action;
        if (binary && await installer.has(binary)) {
            this._log('info', `${binary} deja installe, skip`);
            return false;
        }
        this.emit('install-start', { method, package: pkg });
        this._log('info', `Install ${method} : ${pkg}`);
        const res = await installer.install(method, pkg, {
            onData: (chunk) => this.emit('install-log', { chunk: chunk.slice(-500) }),
        });
        this.emit('install-end', { method, package: pkg, success: res.success });
        if (res.success) {
            this._log('info', `✓ Install OK : ${pkg}`);
            await memory.addPattern({
                rule: `install ${method} ${pkg} pour ${binary || pkg}`,
                tags: [method, pkg, binary].filter(Boolean),
            });
        } else {
            this._log('error', `✗ Install echec : ${pkg} — ${res.error}`);
        }
        return false;
    }

    async _askUser(action) {
        const ans = await this.ask(action.question, action.choices || ['oui', 'non']);
        this._log('info', `Reponse: ${ans}`);
        return false;
    }

    async _addFinding(action) {
        if (!this.engagementSlug) {
            this._log('warn', 'Finding ignore : aucun engagement actif');
            return false;
        }
        const finding = await engagements.addFinding(this.engagementSlug, {
            title: action.title || 'Finding sans titre',
            severity: action.severity || 'info',
            description: action.description || '',
            evidence: action.evidence || '',
        });
        this._log('info', `📋 Finding [${finding.severity.toUpperCase()}] ${finding.title}`);
        this.emit('finding', finding);

        // ── v6 Phantom : notif push si severity >= high (Slack/Discord/Telegram) ──
        if (notifications?.notifyFinding && ['high', 'critical'].includes((finding.severity || '').toLowerCase())) {
            notifications.notifyFinding({ target: this.target, finding }).catch(() => {});
        }
        return false;
    }
}

// ── Registry ──
function createAgent(opts) {
    const a = new Agent(opts);
    agents.set(a.id, a);
    a.on('end', () => {
        setTimeout(() => agents.delete(a.id), 10 * 60 * 1000); // cleanup apres 10 min
    });
    return a;
}

function getAgent(id) { return agents.get(String(id)) || null; }

function listAgents() {
    return Array.from(agents.values()).map(a => a.snapshot());
}

module.exports = { createAgent, getAgent, listAgents };
