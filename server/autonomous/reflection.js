// ════════════════════════════════════════════════════════════════
//  🧬 REFLECTION — Self-improving critic loop
//  Apres chaque run d'agent, un LLM-critique analyse transcript +
//  knowledge + findings et extrait des LECONS reutilisables
//  (patterns) qui enrichissent la base de connaissance globale.
// ════════════════════════════════════════════════════════════════
const memory = require('./engagement-memory');
const aiProvider = require('./ai-provider');

const CRITIC_SYSTEM = `Tu es un CRITIQUE pentest. Tu analyses un run d'agent deja termine
et tu extrais des LECONS (patterns) reutilisables pour les prochains runs.

Une bonne lecon :
- Est specifique (pas "toujours faire du recon")
- Capture un lien CAUSE → ACTION efficace
- Est taggable (WordPress, SQLi, WAF, etc.)

Reponds STRICTEMENT en JSON :
{
  "summary": "1 phrase sur ce qui s'est passe (bien/mal)",
  "successes": ["ce qui a marche"],
  "failures": ["ce qui a echoue ou a perdu du temps"],
  "patterns": [
    {
      "rule": "Si <condition observee>, alors <action efficace>",
      "tags": ["wordpress", "xmlrpc", ...],
      "confidence": 0.0-1.0
    }
  ],
  "nextRunHints": ["conseils pour futurs runs sur cible similaire"]
}`;

function compressTranscript(transcript, { max = 40 } = {}) {
    const important = transcript.filter(t =>
        t.level === 'warn' || t.level === 'error' ||
        /^(Run |Fin |Install|Finding|Phase|Plan)/.test(t.msg) ||
        /finding|vulnerable|error|timeout|unlock/i.test(t.msg)
    );
    return important.slice(-max).map(t => `[${t.level}] ${t.msg}`).join('\n');
}

async function debrief({ agent, knowledge, findings = [] }) {
    let client, model;
    try {
        if (agent?.ai) {
            client = agent.ai;
            model = agent.models?.reasoning;
        } else {
            const active = await aiProvider.getActive();
            client = active.client;
            model = active.models.reasoning;
        }
    } catch (e) {
        return { ok: false, error: 'no-provider', detail: e.message };
    }

    const hostsSummary = Object.entries(knowledge.hosts || {}).map(([h, m]) => ({
        host: h,
        tech: (m.tech || []).slice(0, 10),
        ports: Object.keys(m.ports || {}),
        vulnsCount: (m.vulns || []).length,
        waf: m.waf || null,
    }));

    const userPayload = `Run : agent ${agent.id}, target=${agent.target}, mode=${agent.mode}, orchestrated=${!!agent.orchestrated}
Steps executes : ${agent.steps}
Status final : ${agent.status}
Goal : ${agent.goal || '(aucun)'}

Hosts recolte :
${JSON.stringify(hostsSummary, null, 2)}

Findings (${findings.length}) :
${findings.slice(0, 10).map(f => `- [${f.severity}] ${f.title}`).join('\n') || '(aucun)'}

Transcript compresse :
${compressTranscript(agent.transcript || [])}

Extrais les lecons reutilisables.`;

    try {
        const res = await client.chat.completions.create({
            model,
            temperature: 0.2,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: CRITIC_SYSTEM },
                { role: 'user', content: userPayload },
            ],
        });
        const raw = res.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        const patterns = (parsed.patterns || []).filter(p => p.rule && (p.confidence ?? 0.5) >= 0.5);
        for (const p of patterns) {
            await memory.addPattern({
                rule: p.rule,
                tags: p.tags || [],
                source: `critic:${agent.id}`,
                confidence: p.confidence ?? 0.6,
            });
        }
        agent._log?.('info', `🧬 Debrief : ${patterns.length} patterns appris, ${parsed.successes?.length || 0} succes, ${parsed.failures?.length || 0} echecs`);
        agent.emit?.('debrief', { ...parsed, patternsSaved: patterns.length });
        return { ok: true, patternsSaved: patterns.length, ...parsed };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

module.exports = { debrief };
