// ════════════════════════════════════════════════════════════════
//  📢 NOTIFICATIONS — Slack / Discord / Telegram webhooks
//  Push events critiques (finding high/critical, fin d'engagement,
//  blocage scope, agent error) vers les canaux configures.
//  Config via env : KEYSOSI_SLACK_URL / KEYSOSI_DISCORD_URL /
//  KEYSOSI_TELEGRAM_BOT_TOKEN + KEYSOSI_TELEGRAM_CHAT_ID.
//  Les webhooks sont optionnels : module silencieux si rien configure.
// ════════════════════════════════════════════════════════════════

'use strict';

const SLACK_URL = process.env.KEYSOSI_SLACK_URL || '';
const DISCORD_URL = process.env.KEYSOSI_DISCORD_URL || '';
const TELEGRAM_TOKEN = process.env.KEYSOSI_TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT = process.env.KEYSOSI_TELEGRAM_CHAT_ID || '';

const SEVERITY_COLORS = {
    critical: 0xE8112D,  // Rouge Benin
    high:     0xFF6B00,  // Orange vif
    medium:   0xFCD116,  // Jaune Benin
    low:      0x0088CC,  // Bleu info
    info:     0x008751,  // Vert Benin
};

const SEVERITY_EMOJI = {
    critical: '🔥',
    high:     '🚨',
    medium:   '⚠️',
    low:      'ℹ️',
    info:     '✅',
};

/**
 * Envoie un payload JSON POST avec timeout + catch silencieux.
 * Chaque webhook est non-bloquant et ne doit jamais casser l'agent.
 */
async function _post(url, payload, timeoutMs = 5000) {
    if (!url) return { ok: false, skipped: true };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: ctrl.signal,
        });
        clearTimeout(timer);
        return { ok: res.ok, status: res.status };
    } catch (e) {
        clearTimeout(timer);
        return { ok: false, error: e.message };
    }
}

// ── SLACK — format blocks simple ──
function _slackPayload({ title, severity = 'info', target, message, fields = [] }) {
    const emoji = SEVERITY_EMOJI[severity] || 'ℹ️';
    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `${emoji} ${title}` },
        },
    ];
    if (target) {
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `*Cible :* \`${target}\`` },
        });
    }
    if (message) {
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: message.slice(0, 2500) },
        });
    }
    if (fields.length) {
        blocks.push({
            type: 'section',
            fields: fields.slice(0, 10).map(f => ({
                type: 'mrkdwn',
                text: `*${f.label}*\n${String(f.value).slice(0, 200)}`,
            })),
        });
    }
    blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `_KeysOsi-Link · ${new Date().toISOString()}_` }],
    });
    return { blocks };
}

// ── DISCORD — format embeds ──
function _discordPayload({ title, severity = 'info', target, message, fields = [] }) {
    const emoji = SEVERITY_EMOJI[severity] || 'ℹ️';
    const embed = {
        title: `${emoji} ${title}`,
        color: SEVERITY_COLORS[severity] || SEVERITY_COLORS.info,
        timestamp: new Date().toISOString(),
        footer: { text: 'KeysOsi-Link v6' },
        fields: [],
    };
    if (target) embed.fields.push({ name: 'Cible', value: '`' + target + '`', inline: true });
    if (severity) embed.fields.push({ name: 'Severite', value: severity.toUpperCase(), inline: true });
    if (message) embed.description = message.slice(0, 3800);
    for (const f of fields.slice(0, 20)) {
        embed.fields.push({ name: f.label, value: String(f.value).slice(0, 1000), inline: !!f.inline });
    }
    return { embeds: [embed] };
}

// ── TELEGRAM — format markdown v2 ──
function _telegramUrl() {
    return TELEGRAM_TOKEN && TELEGRAM_CHAT
        ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
        : '';
}
function _telegramPayload({ title, severity = 'info', target, message, fields = [] }) {
    const emoji = SEVERITY_EMOJI[severity] || 'ℹ️';
    const lines = [`*${emoji} ${title}*`];
    if (target) lines.push(`\`${target}\``);
    if (severity) lines.push(`_Severite : ${severity.toUpperCase()}_`);
    if (message) lines.push('', message.slice(0, 2000));
    for (const f of fields.slice(0, 10)) lines.push(`*${f.label} :* ${f.value}`);
    return {
        chat_id: TELEGRAM_CHAT,
        parse_mode: 'Markdown',
        text: lines.join('\n').slice(0, 4000),
    };
}

/**
 * API publique — envoie une notif vers TOUS les canaux configures en parallele.
 * @param {object} event
 * @param {string} event.title   - Titre court
 * @param {string} [event.severity] - info|low|medium|high|critical
 * @param {string} [event.target] - Cible concernee
 * @param {string} [event.message] - Body markdown
 * @param {Array<{label:string,value:string,inline?:boolean}>} [event.fields]
 */
async function notify(event) {
    const [slackRes, discordRes, telegramRes] = await Promise.all([
        _post(SLACK_URL, _slackPayload(event)),
        _post(DISCORD_URL, _discordPayload(event)),
        _post(_telegramUrl(), _telegramPayload(event)),
    ]);
    return {
        ok: slackRes.ok || discordRes.ok || telegramRes.ok,
        slack: slackRes,
        discord: discordRes,
        telegram: telegramRes,
    };
}

// ── Helpers contextuels (utilises par l'agent) ──
async function notifyFinding({ target, finding }) {
    return notify({
        title: `Nouveau finding : ${finding.title || 'Sans titre'}`,
        severity: finding.severity || 'info',
        target,
        message: finding.description,
        fields: [
            ...(finding.evidence ? [{ label: 'Evidence', value: finding.evidence.slice(0, 500) }] : []),
            ...(finding.cve ? [{ label: 'CVE', value: finding.cve, inline: true }] : []),
        ],
    });
}

async function notifyEngagementStart({ engagement, target, mode }) {
    return notify({
        title: `🚀 Engagement demarre : ${engagement}`,
        severity: 'info',
        target,
        fields: [
            { label: 'Mode', value: mode || 'recon-only', inline: true },
            { label: 'Demarre', value: new Date().toLocaleString('fr-FR'), inline: true },
        ],
    });
}

async function notifyEngagementEnd({ engagement, target, summary, findings = [], steps, duration }) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
        const sev = (f.severity || 'info').toLowerCase();
        if (counts[sev] !== undefined) counts[sev]++;
    }
    const maxSev = counts.critical ? 'critical' : counts.high ? 'high' : counts.medium ? 'medium' : 'info';
    return notify({
        title: `🏁 Engagement termine : ${engagement}`,
        severity: maxSev,
        target,
        message: summary,
        fields: [
            { label: 'Findings', value: `${findings.length} (${counts.critical}C · ${counts.high}H · ${counts.medium}M · ${counts.low}L)`, inline: true },
            ...(steps ? [{ label: 'Etapes', value: String(steps), inline: true }] : []),
            ...(duration ? [{ label: 'Duree', value: duration, inline: true }] : []),
        ],
    });
}

async function notifyError({ target, error, context }) {
    return notify({
        title: `❌ Erreur agent : ${context || 'unknown'}`,
        severity: 'high',
        target,
        message: '```\n' + String(error).slice(0, 1500) + '\n```',
    });
}

function status() {
    return {
        slack:    { configured: !!SLACK_URL },
        discord:  { configured: !!DISCORD_URL },
        telegram: { configured: !!(TELEGRAM_TOKEN && TELEGRAM_CHAT) },
    };
}

module.exports = {
    notify,
    notifyFinding,
    notifyEngagementStart,
    notifyEngagementEnd,
    notifyError,
    status,
};
