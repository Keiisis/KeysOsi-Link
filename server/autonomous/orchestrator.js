// ════════════════════════════════════════════════════════════════
//  🎭 ORCHESTRATOR — Planner + specialists (multi-agent)
//  Planner LLM emet un DAG de phases ; executor lance les tools
//  en parallele quand possible, puis bascule en ReAct pour la
//  synthese (findings + conclude).
// ════════════════════════════════════════════════════════════════
const tools = require('./tools');

const PLANNER_SYSTEM = `Tu es un PLANNER pentest multi-phases. Tu decomposes la mission en phases
(recon, enum, browser, vuln, exploit) avec outils specifiques pour chaque phase.

Contraintes:
- Recon d'abord (whatweb, httpx, headers, dnsx, wafw00f).
- Puis enum (nmap, subfinder si scope domaine).
- Puis browser (browser_crawl) si app web moderne / JS-rendered.
- Puis vuln (nuclei, nikto, wpscan si WordPress detecte, sqlmap si param).
- Exploit (sqlmap_dump, msfvenom, hydra, listener_start) UNIQUEMENT si exploitUnlocked=true.
- parallel=true uniquement pour recon / premier enum.
- Ne repete jamais un outil avec les memes args.

Reponds STRICTEMENT en JSON:
{
  "summary": "1 phrase sur le plan",
  "phases": [
    {
      "name": "recon|enum|browser|vuln|exploit",
      "parallel": true|false,
      "steps": [
        { "tool": "<nom>", "args": "<target ou JSON>", "why": "1 phrase" }
      ]
    }
  ]
}`;

async function buildPlan({ client, groq, model, target, goal, hostMem, mode, exploitUnlocked }) {
    client = client || groq; // retrocompat
    const context = `Cible: ${target}
Objectif: ${goal || 'audit complet'}
Mode: ${mode}
ExploitUnlocked: ${!!exploitUnlocked}

Connaissance actuelle (hostMem):
${JSON.stringify(hostMem, null, 2).slice(0, 2500)}

Catalogue d'outils:
${tools.listForPrompt()}

Fournis le plan optimal.`;
    const res = await client.chat.completions.create({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: PLANNER_SYSTEM },
            { role: 'user', content: context },
        ],
    });
    const raw = res.choices?.[0]?.message?.content || '{}';
    try {
        const plan = JSON.parse(raw);
        plan.phases = (plan.phases || []).filter(p => p && p.name && Array.isArray(p.steps));
        // Securite : strip phase exploit si non unlock
        if (!exploitUnlocked) {
            plan.phases = plan.phases.filter(p => p.name !== 'exploit');
        }
        return plan;
    } catch {
        return { summary: 'fallback plan', phases: [] };
    }
}

// Executor : parcours phases, lance runToolFn en parallele si phase.parallel
async function executePlan({ plan, agent, runToolFn }) {
    const phases = plan.phases || [];
    agent._log('info', `📋 Plan: ${phases.length} phases — ${plan.summary || ''}`);
    agent.emit('plan', { phases: phases.map(p => ({ name: p.name, parallel: !!p.parallel, steps: p.steps.length })) });

    for (const phase of phases) {
        if (!agent.running) break;
        agent._log('step', `▶ Phase ${phase.name} (${phase.steps.length} steps, parallel=${!!phase.parallel})`);
        agent.emit('phase-start', { name: phase.name, steps: phase.steps.length, parallel: !!phase.parallel });

        const actions = phase.steps.map(s => ({
            action: 'run_tool',
            tool: s.tool,
            args: s.args || agent.target,
            rationale: `[${phase.name}] ${s.why || ''}`,
        }));

        if (phase.parallel && actions.length > 1) {
            await Promise.allSettled(actions.map(a => runToolFn(a)));
        } else {
            for (const a of actions) {
                if (!agent.running) break;
                await runToolFn(a);
            }
        }

        agent.emit('phase-end', { name: phase.name });
    }
}

// ── Specialist prompts (synthese post-plan) ──
const VULN_SYNTHESIZER = `Tu es un SPECIALISTE vuln. A partir de la memoire de l'hote (tech, ports, endpoints,
vulns, headers, waf, niktoFindings), propose 1 a 4 findings de qualite (ignorer les bruits).
Reponds JSON:
{
  "findings": [
    { "title": "...", "severity": "info|low|medium|high|critical", "description": "...", "evidence": "..." }
  ],
  "nextActions": [{"tool":"...","args":"...","why":"..."}]
}
Sois precis : pas de faux positifs, titre < 80 chars, description exploitable.`;

async function synthesizeVulns({ client, groq, model, hostMem }) {
    client = client || groq;
    const res = await client.chat.completions.create({
        model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: VULN_SYNTHESIZER },
            { role: 'user', content: JSON.stringify(hostMem, null, 2).slice(0, 4000) },
        ],
    });
    try { return JSON.parse(res.choices?.[0]?.message?.content || '{}'); }
    catch { return { findings: [], nextActions: [] }; }
}

module.exports = { buildPlan, executePlan, synthesizeVulns };
