// ════════════════════════════════════════════════════════════════
//  📄 REPORT GENERATOR — Markdown + HTML pentest report
//  Agrege knowledge + findings + chains + PoC en un rapport
//  client-ready. PDF optionnel via puppeteer si installe.
// ════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'data', 'reports');
try { fs.mkdirSync(OUT_DIR, { recursive: true }); } catch {}

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4, unknown: 5 };
const SEVERITY_EMOJI = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪', unknown: '⚫' };

function _escape(s) {
    return String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

function _sortBySeverity(arr) {
    return [...arr].sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9));
}

function _stats(findings) {
    const s = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: findings.length };
    for (const f of findings) s[f.severity] = (s[f.severity] || 0) + 1;
    return s;
}

function buildMarkdown({ engagement = 'audit', target, knowledge = {}, findings = [], chains = [], meta = {} }) {
    const hosts = knowledge.hosts || {};
    const hostKeys = Object.keys(hosts);
    const allFindings = findings.length ? findings : hostKeys.flatMap(h => (hosts[h].vulns || []).map(v => ({ ...v, host: h })));
    const sorted = _sortBySeverity(allFindings);
    const stats = _stats(sorted);
    const date = new Date().toISOString().slice(0, 10);

    let md = `# 🎯 Rapport de pentest — ${engagement}\n\n`;
    md += `**Target** : \`${target || '(non specifie)'}\`  \n`;
    md += `**Date** : ${date}  \n`;
    md += `**Outil** : KeysOsi-Link v6.0 Phantom  \n`;
    if (meta.operator) md += `**Operateur** : ${meta.operator}  \n`;
    md += '\n---\n\n';

    // Executive summary
    md += '## 📋 Resume executif\n\n';
    md += `Cet audit a identifie **${stats.total}** vulnerabilite(s) reparties comme suit :\n\n`;
    md += `| Severite | Nombre |\n|----------|--------|\n`;
    for (const sev of ['critical', 'high', 'medium', 'low', 'info']) {
        md += `| ${SEVERITY_EMOJI[sev]} ${sev.toUpperCase()} | ${stats[sev] || 0} |\n`;
    }
    md += `| **TOTAL** | **${stats.total}** |\n\n`;

    // Hosts
    if (hostKeys.length) {
        md += '## 🖥️ Hosts audites\n\n';
        for (const h of hostKeys) {
            const hm = hosts[h];
            md += `### ${h}\n\n`;
            if (hm.tech?.length) md += `- **Tech** : ${hm.tech.slice(0, 20).map(t => `\`${t}\``).join(', ')}\n`;
            if (hm.ports && Object.keys(hm.ports).length) md += `- **Ports** : ${Object.keys(hm.ports).join(', ')}\n`;
            if (hm.waf) md += `- **WAF** : ${hm.waf}\n`;
            if (hm.endpoints?.length) md += `- **Endpoints** : ${hm.endpoints.length} decouverts\n`;
            md += '\n';
        }
    }

    // Findings
    md += '## 🔍 Vulnerabilites detaillees\n\n';
    if (!sorted.length) {
        md += '_Aucune vulnerabilite confirmee._\n\n';
    } else {
        for (let i = 0; i < sorted.length; i++) {
            const f = sorted[i];
            md += `### ${i + 1}. ${SEVERITY_EMOJI[f.severity] || '⚫'} ${f.title || f.type || 'Finding'} [${(f.severity || 'unknown').toUpperCase()}]\n\n`;
            if (f.host) md += `**Host** : \`${f.host}\`  \n`;
            if (f.endpoint) md += `**Endpoint** : \`${f.endpoint}\`  \n`;
            if (f.cve) md += `**CVE** : ${f.cve}  \n`;
            if (f.cvss) md += `**CVSS** : ${f.cvss}  \n`;
            if (f.source) md += `**Source** : ${f.source}  \n`;
            md += '\n';
            if (f.description) md += `**Description** :\n\n${f.description}\n\n`;
            if (f.evidence) md += `**Preuve** :\n\n\`\`\`\n${String(f.evidence).slice(0, 2000)}\n\`\`\`\n\n`;
            if (f.remediation) md += `**Remediation** :\n\n${f.remediation}\n\n`;
            md += '---\n\n';
        }
    }

    // Exploit chains
    if (chains?.length) {
        md += '## ⛓️ Chaines d\'exploitation\n\n';
        for (let i = 0; i < chains.length; i++) {
            const c = chains[i];
            md += `### Chaine ${i + 1} : ${c.summary || c.impact || 'kill chain'}\n\n`;
            if (c.impact) md += `**Impact** : ${c.impact}\n\n`;
            if (c.reason) md += `**Rationale** : ${c.reason}\n\n`;
            md += `**Statut** : ${c.proven ? '✅ prouvee' : '⚠️ partielle'}  \n\n`;
            if (c.nodes?.length) {
                md += '| # | Outil | Action | Resultat |\n|---|-------|--------|----------|\n';
                c.nodes.forEach((n, idx) => {
                    const r = c.results?.[n.id];
                    const status = r?.ok ? '✅' : r?.skipped ? '⏭️' : '❌';
                    md += `| ${idx + 1} | \`${n.tool}\` | ${_escape(n.action)} | ${status} |\n`;
                });
                md += '\n';
            }
        }
    }

    // Recommandations
    md += '## 💡 Recommandations\n\n';
    if (stats.critical > 0) md += '- **URGENT** : Patcher immediatement les vulnerabilites critiques listees ci-dessus.\n';
    if (stats.high > 0) md += '- Prioriser les findings HIGH dans le prochain sprint securite.\n';
    md += '- Mettre en place un scan regulier (nuclei, SCA) en CI/CD.\n';
    md += '- Implementer un WAF si absent, ou tuner les regles si bypass demontre.\n';
    md += '- Former les developpeurs sur OWASP Top 10 et secure coding.\n';

    md += '\n---\n\n';
    md += `_Rapport genere automatiquement par KeysOsi-Link le ${new Date().toISOString()}._\n`;
    return md;
}

function buildHtml(md) {
    const title = (md.match(/^# (.+)$/m) || [, 'Rapport'])[1];
    // converter minimaliste (pas de lib externe)
    let html = _escape(md)
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/---/g, '<hr/>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^- (.+)$/gm, '<li>$1</li>');
    html = `<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:-apple-system,Segoe UI,sans-serif;max-width:900px;margin:2em auto;padding:2em;background:#0b1015;color:#e6edf3}
h1{color:#f85149}h2{color:#ff7b72;border-bottom:1px solid #30363d;padding-bottom:.3em}
h3{color:#ffa657}code{background:#161b22;padding:.2em .4em;border-radius:3px;color:#79c0ff}
pre{background:#161b22;padding:1em;border-radius:6px;overflow:auto}
pre code{background:transparent;padding:0}
table{border-collapse:collapse;margin:1em 0}th,td{border:1px solid #30363d;padding:.5em 1em}th{background:#161b22}
hr{border:none;border-top:1px solid #30363d;margin:2em 0}
strong{color:#ffa657}
li{margin:.3em 0}
</style></head><body><p>${html}</p></body></html>`;
    return html;
}

async function generate({ engagement, target, knowledge, findings, chains, meta, format = 'both' }) {
    const md = buildMarkdown({ engagement, target, knowledge, findings, chains, meta });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeName = String(engagement || 'report').replace(/[^a-z0-9-]/gi, '_');
    const base = `${safeName}-${stamp}`;
    const files = {};
    if (format === 'md' || format === 'both') {
        const p = path.join(OUT_DIR, `${base}.md`);
        fs.writeFileSync(p, md);
        files.markdown = p;
    }
    if (format === 'html' || format === 'both') {
        const html = buildHtml(md);
        const p = path.join(OUT_DIR, `${base}.html`);
        fs.writeFileSync(p, html);
        files.html = p;
    }
    return { ok: true, files, preview: md.slice(0, 2000) };
}

async function generatePdf(htmlPath) {
    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({ headless: 'new' });
        const page = await browser.newPage();
        await page.goto('file://' + htmlPath);
        const pdfPath = htmlPath.replace(/\.html$/, '.pdf');
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        await browser.close();
        return { ok: true, path: pdfPath };
    } catch (e) {
        return { ok: false, error: `puppeteer-missing: ${e.message}. Install: npm install puppeteer` };
    }
}

function list() {
    try {
        return fs.readdirSync(OUT_DIR).sort().reverse().slice(0, 50);
    } catch { return []; }
}

module.exports = { generate, generatePdf, buildMarkdown, buildHtml, list };
