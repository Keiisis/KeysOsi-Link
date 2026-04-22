// ════════════════════════════════════════════════════════════════
//  ⚡ AURA HIVE v4.0 — Meta-Agent Extension — Content Script
//  Rewritten: Hive Control Panel, Multi-Platform Code Extraction,
//  SSE Terminal Streaming, Smart Auto-Send, Response Detection
// ════════════════════════════════════════════════════════════════

(() => {
    "use strict";

    const API_URL = "http://localhost:3666";
    const VERSION = "4.0.0";

    // ── State ──
    let treeCache = null;
    let treeCacheTime = 0;
    const TREE_CACHE_TTL = 10000;

    let selectedFiles = new Set();
    let expandedFolders = new Set();
    let currentFilter = '';
    let isModalOpen = false;
    let treeData = [];

    // ── Hive State (mirrored from server) ──
    let hiveState = {
        status: 'IDLE',
        goal: '',
        step: 0,
        maxSteps: 10,
        history: []
    };

    // ── Platform Detection ──
    const PLATFORM = detectPlatform();

    function detectPlatform() {
        const host = window.location.hostname;
        if (host.includes('claude.ai')) return 'claude';
        if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
        if (host.includes('gemini.google.com')) return 'gemini';
        if (host.includes('copilot.microsoft.com')) return 'copilot';
        if (host.includes('arena') || host.includes('lmsys')) return 'arena';
        return 'unknown';
    }

    // ════════════════════════════════════════════
    // 1. UTILS
    // ════════════════════════════════════════════
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getFileIcon(ext) {
        const map = {
            js: '🟨', ts: '🟦', jsx: '⚛️', tsx: '⚛️',
            css: '🎨', scss: '🎨', html: '🌐',
            json: '📋', md: '📝', py: '🐍',
            go: '🐹', rs: '🦀', c: '🇨', cpp: '🇨',
            java: '☕', php: '🐘', rb: '💎',
            sql: '🗃️', prisma: '💎', env: '🔒',
            yml: '⚙️', yaml: '⚙️', toml: '⚙️',
            xml: '📰', sh: '🐚', bat: '🦇',
            png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
            pdf: '📕', txt: '📄'
        };
        return map[ext] || '📄';
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelectorAll('.aura-toast');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `aura-toast aura-toast-${type}`;
        toast.innerHTML = `
            <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.style.transform = 'translateY(0)');

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function truncate(str, max = 80) {
        if (!str) return '';
        return str.length > max ? str.substring(0, max) + '…' : str;
    }

    // ════════════════════════════════════════════
    // 2. API CLIENT
    // ════════════════════════════════════════════
    async function apiRequest(endpoint, method = "GET", body = null) {
        try {
            const options = {
                method,
                headers: { "Content-Type": "application/json" }
            };
            if (body) options.body = JSON.stringify(body);

            const res = await fetch(`${API_URL}${endpoint}`, options);
            if (!res.ok) {
                const text = await res.text();
                console.error(`[AuraHive] HTTP ${res.status}: ${text}`);
                return { success: false, error: `HTTP ${res.status}` };
            }
            return await res.json();
        } catch (e) {
            console.error(`[AuraHive] API Error (${endpoint}):`, e);
            return { success: false, error: "Server disconnected" };
        }
    }

    // ════════════════════════════════════════════
    // 3. UI COMPONENTS
    // ════════════════════════════════════════════

    // FAB (Floating Action Button)
    function createFAB() {
        if (document.getElementById('aura-fab')) return;

        const isAi = PLATFORM !== 'unknown';
        const fab = document.createElement('div');
        fab.id = 'aura-fab';
        fab.innerHTML = `
            ${isAi ? `<button class="aura-fab-btn" id="aura-fab-save" title="Save Code Block">
                <span>💾</span> <span>SAVE</span>
            </button>` : ''}
            <button class="aura-fab-btn" id="aura-fab-lab" title="Aura Lab — Kali Sandbox">
                <span>🧪</span> <span>LAB</span>
            </button>
            ${isAi ? `<button class="aura-fab-btn aura-fab-main" id="aura-fab-inject" title="Open Aura Hive">
                <span>⚡</span> <span>HIVE</span>
            </button>` : ''}
        `;
        document.body.appendChild(fab);

        const injectBtn = document.getElementById('aura-fab-inject');
        if (injectBtn) injectBtn.addEventListener('click', toggleModal);
        const saveBtn = document.getElementById('aura-fab-save');
        if (saveBtn) saveBtn.addEventListener('click', handleQuickSave);
        document.getElementById('aura-fab-lab').addEventListener('click', toggleLabPanel);
    }

    // ════════════════════════════════════════════
    // KEYSOSI LAB — Kali sandbox panel + terminal iframe
    // ════════════════════════════════════════════
    let labPanelOpen = false;

    function toggleLabPanel() {
        if (labPanelOpen) closeLabPanel();
        else openLabPanel();
    }

    async function openLabPanel() {
        if (document.getElementById('aura-lab-panel')) return;
        labPanelOpen = true;

        const panel = document.createElement('div');
        panel.id = 'aura-lab-panel';
        panel.innerHTML = `
            <div class="aura-lab-head">
                <div class="aura-lab-title">
                    <span class="aura-lab-icon">🧪</span>
                    <div>
                        <div class="aura-lab-name">KEYSOSI LAB</div>
                        <div class="aura-lab-sub">Kali Sandbox · Offensive Toolkit</div>
                    </div>
                </div>
                <div class="aura-lab-actions">
                    <label class="aura-lab-toggle" title="Volume persistant : conserve installs entre sessions">
                        <input type="checkbox" id="aura-lab-persist" checked/>
                        <span>Persistant</span>
                    </label>
                    <button class="aura-lab-btn aura-lab-btn-go" id="aura-lab-start">▶ Start</button>
                    <button class="aura-lab-btn" id="aura-lab-stop">⏹ Stop</button>
                    <button class="aura-lab-btn aura-lab-btn-danger" id="aura-lab-reset" title="Wipe container + volume (tout efface)">⟲ Reset</button>
                    <button class="aura-lab-btn" id="aura-lab-popout" title="Ouvrir terminal dans une fenetre separee">⧉ Popout</button>
                    <button class="aura-lab-btn aura-lab-btn-close" id="aura-lab-close" title="Fermer">✕</button>
                </div>
            </div>
            <div class="aura-lab-engagement" id="aura-lab-engagement">
                <div class="aura-lab-eng-row">
                    <span class="aura-lab-eng-label">📋 Engagement :</span>
                    <select id="aura-lab-eng-select" class="aura-lab-eng-select"></select>
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-eng-new" title="Nouvel engagement">+ New</button>
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-eng-open" title="Details (findings, notes)">Open</button>
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-eng-report" title="Telecharger rapport Markdown">📄 Report</button>
                    <span class="aura-lab-eng-sep">·</span>
                    <button class="aura-lab-btn aura-lab-btn-mini aura-lab-btn-go" id="aura-lab-agent" title="Lancer l'agent autonome sur la page/cible">🤖 Agent</button>
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-ai-config" title="Configurer provider IA + cle API (Groq, Claude Opus, GPT-4o, Gemini)">🧠 IA</button>
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-proxy-toggle" title="Route le navigateur via mitmproxy du sandbox">🔀 Proxy OFF</button>
                </div>
                <div class="aura-lab-eng-scope" id="aura-lab-eng-scope"></div>
            </div>
            <div class="aura-lab-status" id="aura-lab-status">Verification de l'etat...</div>
            <div class="aura-lab-targets" id="aura-lab-targets">
                <div class="aura-lab-targets-head">
                    <span class="aura-lab-targets-title">🎯 Cibles vulnerables</span>
                    <div class="aura-lab-targets-actions">
                        <button class="aura-lab-btn aura-lab-btn-mini aura-lab-btn-go" id="aura-lab-targets-up" title="Demarre DVWA + Juice Shop + Mutillidae + Metasploitable + WebGoat">▶ Up</button>
                        <button class="aura-lab-btn aura-lab-btn-mini" id="aura-lab-targets-down">⏹ Down</button>
                    </div>
                </div>
                <div class="aura-lab-targets-grid" id="aura-lab-targets-grid">
                    <span class="aura-lab-targets-loading">…</span>
                </div>
            </div>
            <div class="aura-lab-body" id="aura-lab-body">
                <div class="aura-lab-placeholder">
                    <div class="aura-lab-emoji">🔒</div>
                    <div class="aura-lab-ph-title">Lab non demarre</div>
                    <div class="aura-lab-ph-hint">Clique sur <b>▶ Start</b> pour lancer le container Kali isole.</div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('#aura-lab-close').addEventListener('click', closeLabPanel);
        panel.querySelector('#aura-lab-start').addEventListener('click', startLab);
        panel.querySelector('#aura-lab-stop').addEventListener('click', stopLab);
        panel.querySelector('#aura-lab-reset').addEventListener('click', resetLab);
        panel.querySelector('#aura-lab-popout').addEventListener('click', () => {
            window.open(`${API_URL}/terminal.html`, 'aura-lab-terminal', 'width=1100,height=720,resizable=yes');
        });
        panel.querySelector('#aura-lab-targets-up').addEventListener('click', startTargets);
        panel.querySelector('#aura-lab-targets-down').addEventListener('click', stopTargets);

        // Engagements + proxy
        panel.querySelector('#aura-lab-eng-select').addEventListener('change', onEngagementChange);
        panel.querySelector('#aura-lab-eng-new').addEventListener('click', createEngagementPrompt);
        panel.querySelector('#aura-lab-eng-open').addEventListener('click', openEngagementModal);
        panel.querySelector('#aura-lab-eng-report').addEventListener('click', downloadReport);
        panel.querySelector('#aura-lab-agent').addEventListener('click', openAgentModal);
        panel.querySelector('#aura-lab-ai-config').addEventListener('click', openAIConfigModal);
        panel.querySelector('#aura-lab-proxy-toggle').addEventListener('click', toggleProxy);

        // Listen for close from inside iframe
        window.addEventListener('message', onLabFrameMessage);

        // Initial status check
        await refreshLabStatus();
        refreshTargetsStatus();
        refreshEngagements();
        refreshProxyState();
    }

    function closeLabPanel() {
        labPanelOpen = false;
        const panel = document.getElementById('aura-lab-panel');
        if (panel) panel.remove();
        window.removeEventListener('message', onLabFrameMessage);
    }

    function onLabFrameMessage(ev) {
        if (ev.data && ev.data.type === 'aura-lab-close') closeLabPanel();
    }

    async function refreshLabStatus() {
        const statusEl = document.getElementById('aura-lab-status');
        if (!statusEl) return;
        try {
            const res = await fetch(`${API_URL}/sandbox/status`);
            const s = await res.json();
            if (!s.docker) {
                statusEl.className = 'aura-lab-status aura-lab-status-err';
                statusEl.innerHTML = `⚠ Docker indisponible. Demarre Docker Desktop (installe WSL2 si besoin : <code>wsl --install</code>).`;
                return;
            }
            if (!s.image) {
                statusEl.className = 'aura-lab-status aura-lab-status-warn';
                statusEl.innerHTML = `Image <code>aura-lab:latest</code> absente. Build : <code>cd KeysOsi-Link/docker && build.bat</code>`;
                return;
            }
            if (s.container === 'running') {
                statusEl.className = 'aura-lab-status aura-lab-status-ok';
                statusEl.innerHTML = `● Container actif · Volume persistant : <b>${s.volume ? 'OUI' : 'non'}</b> · Terminal pret`;
                mountTerminal();
            } else {
                statusEl.className = 'aura-lab-status';
                statusEl.innerHTML = `Image prete. Container : <b>${s.container}</b>. Clique <b>Start</b>.`;
            }
        } catch (e) {
            statusEl.className = 'aura-lab-status aura-lab-status-err';
            statusEl.textContent = `Serveur KeysOsi-Link injoignable (${API_URL}). Lance-le : node server/index.js`;
        }
    }

    function mountTerminal() {
        const body = document.getElementById('aura-lab-body');
        if (!body) return;
        if (body.querySelector('iframe')) return; // already mounted
        body.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = `${API_URL}/terminal.html`;
        iframe.className = 'aura-lab-iframe';
        iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
        body.appendChild(iframe);
    }

    function setLabBusy(msg) {
        const body = document.getElementById('aura-lab-body');
        if (!body) return;
        body.innerHTML = `
            <div class="aura-lab-placeholder">
                <div class="aura-lab-spinner"></div>
                <div class="aura-lab-ph-title">${msg}</div>
            </div>
        `;
    }

    async function startLab() {
        const persistent = document.getElementById('aura-lab-persist').checked;
        setLabBusy('Demarrage du container Kali...');
        try {
            const res = await fetch(`${API_URL}/sandbox/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ persistent })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Lab demarre', 'success');
                await refreshLabStatus();
            } else {
                showToast(data.error || 'Echec demarrage', 'error');
                const statusEl = document.getElementById('aura-lab-status');
                if (statusEl) {
                    statusEl.className = 'aura-lab-status aura-lab-status-err';
                    statusEl.textContent = data.error || 'Echec demarrage';
                }
                const body = document.getElementById('aura-lab-body');
                if (body) body.innerHTML = `<div class="aura-lab-placeholder"><div class="aura-lab-emoji">⚠</div><div class="aura-lab-ph-title">Echec</div><div class="aura-lab-ph-hint">${data.error || ''}</div></div>`;
            }
        } catch (e) {
            showToast('Erreur reseau', 'error');
        }
    }

    async function stopLab() {
        setLabBusy('Arret du container...');
        try {
            await fetch(`${API_URL}/sandbox/stop`, { method: 'POST' });
            showToast('Lab arrete', 'info');
            const body = document.getElementById('aura-lab-body');
            if (body) body.innerHTML = `<div class="aura-lab-placeholder"><div class="aura-lab-emoji">💤</div><div class="aura-lab-ph-title">Lab arrete</div><div class="aura-lab-ph-hint">Clique ▶ Start pour relancer.</div></div>`;
            await refreshLabStatus();
        } catch { showToast('Erreur arret', 'error'); }
    }

    async function resetLab() {
        if (!confirm('Wipe total du Lab ?\nContainer + volume persistant seront supprimes.\nApt installs, git clones, sessions CTF = perdus.')) return;
        setLabBusy('Reset complet du Lab...');
        try {
            await fetch(`${API_URL}/sandbox/reset`, { method: 'POST' });
            showToast('Lab efface', 'success');
            await refreshLabStatus();
        } catch { showToast('Erreur reset', 'error'); }
    }

    // ── Vulnerable targets stack ──
    const TARGET_META = {
        'dvwa':           { label: 'DVWA',         port: 8080, path: '/' },
        'juice-shop':     { label: 'Juice Shop',   port: 8081, path: '/' },
        'mutillidae':     { label: 'Mutillidae',   port: 8082, path: '/' },
        'metasploitable': { label: 'Metasploitable', port: null, path: null },
        'webgoat':        { label: 'WebGoat',      port: 8083, path: '/WebGoat' }
    };

    async function refreshTargetsStatus() {
        const grid = document.getElementById('aura-lab-targets-grid');
        if (!grid) return;
        try {
            const res = await fetch(`${API_URL}/sandbox/targets/status`);
            const data = await res.json();
            const targets = data.targets || {};
            grid.innerHTML = Object.entries(TARGET_META).map(([key, meta]) => {
                const status = targets[key] || 'absent';
                const dot = status === 'running' ? 'ok' : status === 'stopped' ? 'warn' : 'off';
                const link = (status === 'running' && meta.port)
                    ? `<a href="http://127.0.0.1:${meta.port}${meta.path}" target="_blank" rel="noopener" class="aura-lab-target-link">:${meta.port}</a>`
                    : meta.port
                        ? `<span class="aura-lab-target-port">:${meta.port}</span>`
                        : `<span class="aura-lab-target-port">lab-only</span>`;
                return `
                    <div class="aura-lab-target" data-status="${status}">
                        <span class="aura-lab-target-dot aura-lab-target-dot-${dot}"></span>
                        <span class="aura-lab-target-name">${meta.label}</span>
                        ${link}
                    </div>
                `;
            }).join('');
        } catch {
            grid.innerHTML = `<span class="aura-lab-targets-loading">serveur injoignable</span>`;
        }
    }

    async function startTargets() {
        const grid = document.getElementById('aura-lab-targets-grid');
        if (grid) grid.innerHTML = `<span class="aura-lab-targets-loading">Pull + demarrage (1er run ~5 min)...</span>`;
        try {
            const res = await fetch(`${API_URL}/sandbox/targets/up`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                showToast('Cibles demarrees', 'success');
            } else {
                showToast(data.error || 'Echec targets', 'error');
            }
        } catch { showToast('Erreur reseau targets', 'error'); }
        refreshTargetsStatus();
    }

    async function stopTargets() {
        const grid = document.getElementById('aura-lab-targets-grid');
        if (grid) grid.innerHTML = `<span class="aura-lab-targets-loading">Arret des cibles...</span>`;
        try {
            await fetch(`${API_URL}/sandbox/targets/down`, { method: 'POST' });
            showToast('Cibles arretees', 'info');
        } catch { showToast('Erreur arret targets', 'error'); }
        refreshTargetsStatus();
    }

    // ── Engagements ──
    let currentEngagements = { active: null, engagements: [] };

    async function refreshEngagements() {
        try {
            const res = await fetch(`${API_URL}/engagements`);
            currentEngagements = await res.json();
        } catch { return; }
        const sel = document.getElementById('aura-lab-eng-select');
        if (!sel) return;
        sel.innerHTML = '';
        const none = document.createElement('option');
        none.value = ''; none.textContent = '— aucun —';
        sel.appendChild(none);
        for (const e of (currentEngagements.engagements || [])) {
            const opt = document.createElement('option');
            opt.value = e.slug;
            opt.textContent = `${e.name} (${e.kind}${e.findings ? ` · ${e.findings}F` : ''})`;
            if (e.slug === currentEngagements.active) opt.selected = true;
            sel.appendChild(opt);
        }
        renderEngagementScope();
    }

    function renderEngagementScope() {
        const box = document.getElementById('aura-lab-eng-scope');
        if (!box) return;
        const active = (currentEngagements.engagements || []).find(e => e.slug === currentEngagements.active);
        if (!active || !active.scope?.length) {
            box.innerHTML = '<span class="aura-lab-eng-hint">Choisis ou cree un engagement pour scoper tes actions.</span>';
            return;
        }
        box.innerHTML = active.scope.map(s => `<code class="aura-lab-eng-chip">${escapeHtml(s)}</code>`).join(' ');
    }

    async function onEngagementChange(e) {
        const slug = e.target.value || null;
        try {
            await fetch(`${API_URL}/engagements/active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug }),
            });
            currentEngagements.active = slug;
            renderEngagementScope();
            showToast(slug ? `Engagement : ${slug}` : 'Aucun engagement actif', 'info');
        } catch { showToast('Erreur selection', 'error'); }
    }

    async function createEngagementPrompt() {
        const name = prompt('Nom de l\'engagement (ex: "HTB Box Lame", "BugBounty Acme") :');
        if (!name) return;
        const kind = prompt('Type (ctf / bug-bounty / own-lab / pentest) :', 'ctf') || 'ctf';
        const scopeRaw = prompt('Scope (domaines separes par espaces ou virgules, ex: *.acme.com target.tld 10.0.0.0/24) :', '');
        try {
            const res = await fetch(`${API_URL}/engagements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, kind, scope: scopeRaw || '' }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Engagement "${data.engagement.name}" cree`, 'success');
                await refreshEngagements();
            } else {
                showToast(data.error || 'Echec creation', 'error');
            }
        } catch { showToast('Erreur reseau', 'error'); }
    }

    async function openEngagementModal() {
        const slug = currentEngagements.active;
        if (!slug) { showToast('Aucun engagement actif', 'warning'); return; }
        let data;
        try {
            const res = await fetch(`${API_URL}/engagements/${slug}`);
            data = await res.json();
            if (!data.success) throw new Error(data.error);
        } catch { showToast('Erreur chargement', 'error'); return; }
        showEngagementModal(data.engagement);
    }

    function showEngagementModal(e) {
        const prev = document.getElementById('aura-lab-eng-modal');
        if (prev) prev.remove();
        const wrap = document.createElement('div');
        wrap.id = 'aura-lab-eng-modal';
        wrap.innerHTML = `
            <div class="aura-lab-eng-modal-inner">
                <div class="aura-lab-eng-modal-head">
                    <div>
                        <div class="aura-lab-eng-modal-title">📋 ${escapeHtml(e.name)}</div>
                        <div class="aura-lab-eng-modal-sub">${e.kind} · ${e.findings.length} finding(s) · cree ${new Date(e.createdAt).toLocaleString()}</div>
                    </div>
                    <button class="aura-lab-btn aura-lab-btn-close" id="aura-lab-eng-modal-close">✕</button>
                </div>
                <div class="aura-lab-eng-modal-body">
                    <label class="aura-lab-eng-fieldlabel">Scope</label>
                    <textarea id="aura-lab-eng-scope-in" class="aura-lab-eng-textarea" rows="2">${escapeHtml((e.scope || []).join('\n'))}</textarea>

                    <label class="aura-lab-eng-fieldlabel">Notes</label>
                    <textarea id="aura-lab-eng-notes-in" class="aura-lab-eng-textarea" rows="4">${escapeHtml(e.notes || '')}</textarea>

                    <div class="aura-lab-eng-row" style="justify-content:flex-end">
                        <button class="aura-lab-btn aura-lab-btn-go aura-lab-btn-mini" id="aura-lab-eng-save">💾 Sauver scope/notes</button>
                    </div>

                    <div class="aura-lab-eng-sectiontitle">Findings</div>
                    <div id="aura-lab-eng-findings" class="aura-lab-eng-findings">
                        ${e.findings.length ? e.findings.map(renderFinding).join('') : '<div class="aura-lab-eng-hint">Aucun finding. Ajoute-en via le formulaire ci-dessous.</div>'}
                    </div>

                    <div class="aura-lab-eng-addfinding">
                        <input id="aura-lab-f-title" placeholder="Titre du finding" class="aura-lab-eng-input"/>
                        <select id="aura-lab-f-sev" class="aura-lab-eng-select">
                            <option value="info">info</option>
                            <option value="low">low</option>
                            <option value="medium" selected>medium</option>
                            <option value="high">high</option>
                            <option value="critical">critical</option>
                        </select>
                        <button class="aura-lab-btn aura-lab-btn-go aura-lab-btn-mini" id="aura-lab-f-add">+ Add</button>
                    </div>
                    <textarea id="aura-lab-f-desc" placeholder="Description / reproduction / evidence" class="aura-lab-eng-textarea" rows="3"></textarea>

                    <div class="aura-lab-eng-sectiontitle">Activite recente</div>
                    <div class="aura-lab-eng-activity">
                        ${(e.activity || []).slice(-10).reverse().map(a => `
                            <div class="aura-lab-eng-act">
                                <span class="aura-lab-eng-act-kind">${escapeHtml(a.kind)}</span>
                                <span class="aura-lab-eng-act-target">${escapeHtml(a.target || '')}</span>
                                <span class="aura-lab-eng-act-sum">${escapeHtml(a.summary || '')}</span>
                            </div>
                        `).join('') || '<div class="aura-lab-eng-hint">Aucune activite pour le moment.</div>'}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);

        wrap.querySelector('#aura-lab-eng-modal-close').addEventListener('click', () => wrap.remove());
        wrap.addEventListener('click', (ev) => { if (ev.target === wrap) wrap.remove(); });

        wrap.querySelector('#aura-lab-eng-save').addEventListener('click', async () => {
            const scope = wrap.querySelector('#aura-lab-eng-scope-in').value.split('\n').map(x => x.trim()).filter(Boolean);
            const notes = wrap.querySelector('#aura-lab-eng-notes-in').value;
            try {
                await fetch(`${API_URL}/engagements/${e.slug}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scope, notes }),
                });
                showToast('Sauvegarde', 'success');
                await refreshEngagements();
            } catch { showToast('Echec sauvegarde', 'error'); }
        });

        wrap.querySelector('#aura-lab-f-add').addEventListener('click', async () => {
            const title = wrap.querySelector('#aura-lab-f-title').value.trim();
            const severity = wrap.querySelector('#aura-lab-f-sev').value;
            const description = wrap.querySelector('#aura-lab-f-desc').value;
            if (!title) { showToast('Titre requis', 'warning'); return; }
            try {
                await fetch(`${API_URL}/engagements/${e.slug}/findings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, severity, description }),
                });
                showToast('Finding ajoute', 'success');
                wrap.remove();
                openEngagementModal();
                refreshEngagements();
            } catch { showToast('Echec ajout', 'error'); }
        });
    }

    function renderFinding(f) {
        return `
            <div class="aura-lab-eng-finding aura-lab-eng-sev-${f.severity}">
                <span class="aura-lab-eng-sev-badge">${f.severity.toUpperCase()}</span>
                <span class="aura-lab-eng-finding-title">${escapeHtml(f.title)}</span>
                <span class="aura-lab-eng-finding-date">${new Date(f.createdAt).toLocaleDateString()}</span>
            </div>
        `;
    }

    async function downloadReport() {
        const slug = currentEngagements.active;
        if (!slug) { showToast('Aucun engagement actif', 'warning'); return; }
        const url = `${API_URL}/engagements/${slug}/report?download=1`;
        window.open(url, '_blank');
    }

    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    // ── Proxy toggle (bridge vers background.js) ──
    async function refreshProxyState() {
        const btn = document.getElementById('aura-lab-proxy-toggle');
        if (!btn) return;
        try {
            const state = await chrome.runtime.sendMessage({ type: 'aura-proxy-state' });
            const active = !!state?.active;
            btn.textContent = active ? '🔀 Proxy ON' : '🔀 Proxy OFF';
            btn.classList.toggle('aura-lab-btn-go', active);
        } catch {}
    }

    async function toggleProxy() {
        const btn = document.getElementById('aura-lab-proxy-toggle');
        if (!btn) return;
        const isOn = btn.textContent.includes('ON');
        try {
            await chrome.runtime.sendMessage({ type: isOn ? 'aura-proxy-disable' : 'aura-proxy-enable' });
            setTimeout(refreshProxyState, 500);
        } catch { showToast('Background script indisponible', 'error'); }
    }

    // ── Autonomous Agent modal ──
    let currentAgentId = null;
    let currentEventSource = null;

    function openAgentModal() {
        const prev = document.getElementById('aura-agent-modal');
        if (prev) { prev.remove(); }
        const defaultTarget = window.location.origin;
        const wrap = document.createElement('div');
        wrap.id = 'aura-agent-modal';
        wrap.innerHTML = `
            <div class="aura-agent-inner">
                <div class="aura-agent-head">
                    <div>
                        <div class="aura-agent-title">🤖 Agent Autonome Pentest</div>
                        <div class="aura-agent-sub">Orchestration LLM · recon → enum → vuln → findings</div>
                    </div>
                    <button class="aura-lab-btn aura-lab-btn-close" id="aura-agent-close">✕</button>
                </div>

                <div class="aura-agent-setup" id="aura-agent-setup">
                    <label class="aura-agent-field">
                        <span>Cible</span>
                        <input id="aura-agent-target" class="aura-lab-eng-input" value="${escapeHtml(defaultTarget)}"/>
                    </label>
                    <label class="aura-agent-field">
                        <span>Objectif (optionnel)</span>
                        <input id="aura-agent-goal" class="aura-lab-eng-input" placeholder="ex: trouver XSS/SQLi, enum subdomains, fingerprint stack"/>
                    </label>
                    <label class="aura-agent-field">
                        <span>Mode</span>
                        <select id="aura-agent-mode" class="aura-lab-eng-select">
                            <option value="recon-only">recon-only (demande avant intrusif)</option>
                            <option value="full">full (exploits proposés, confirmation requise)</option>
                        </select>
                    </label>
                    <label class="aura-agent-field aura-agent-checkfield">
                        <input type="checkbox" id="aura-agent-orchestrated" checked/>
                        <span>🎭 Mode orchestré (Planner + phases parallèles — recommandé)</span>
                    </label>
                    <label class="aura-agent-field aura-agent-checkfield">
                        <input type="checkbox" id="aura-agent-exploit-unlock"/>
                        <span>🔓 Pré-déverrouiller le mode exploit (sqlmap-dump, msfvenom, hydra, listener)</span>
                    </label>
                    <div class="aura-agent-hint">
                        Engagement actif : <b id="aura-agent-eng">${currentEngagements.active || '(aucun — scope non verifie)'}</b>
                    </div>
                    <div class="aura-agent-setup-actions">
                        <button class="aura-lab-btn aura-lab-btn-go" id="aura-agent-launch">🚀 Lancer l'agent</button>
                    </div>
                </div>

                <div class="aura-agent-live" id="aura-agent-live" style="display:none">
                    <div class="aura-agent-toolbar">
                        <span class="aura-agent-status" id="aura-agent-status">démarrage...</span>
                        <span class="aura-agent-step" id="aura-agent-step">step 0</span>
                        <span class="aura-agent-phase" id="aura-agent-phase" style="display:none"></span>
                        <span class="aura-agent-unlock-badge" id="aura-agent-unlock-badge" style="display:none">🔓 EXPLOIT</span>
                        <button class="aura-lab-btn aura-lab-btn-mini" id="aura-agent-unlock" title="Déverrouiller exploit">🔓</button>
                        <button class="aura-lab-btn aura-lab-btn-mini aura-lab-btn-danger" id="aura-agent-stop">⏹ Stop</button>
                    </div>
                    <div class="aura-agent-feed" id="aura-agent-feed"></div>
                    <div class="aura-agent-question" id="aura-agent-question" style="display:none"></div>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        wrap.querySelector('#aura-agent-close').addEventListener('click', () => closeAgentModal());
        wrap.addEventListener('click', (ev) => { if (ev.target === wrap) closeAgentModal(); });
        wrap.querySelector('#aura-agent-launch').addEventListener('click', launchAgent);
        wrap.querySelector('#aura-agent-stop').addEventListener('click', stopAgent);
        wrap.querySelector('#aura-agent-unlock').addEventListener('click', unlockAgentExploit);
    }

    function closeAgentModal() {
        if (currentEventSource) {
            try { currentEventSource.close(); } catch {}
            currentEventSource = null;
        }
        const m = document.getElementById('aura-agent-modal');
        if (m) m.remove();
    }

    async function launchAgent() {
        const target = document.getElementById('aura-agent-target').value.trim();
        const goal = document.getElementById('aura-agent-goal').value.trim();
        const mode = document.getElementById('aura-agent-mode').value;
        const orchestrated = document.getElementById('aura-agent-orchestrated').checked;
        const exploitUnlocked = document.getElementById('aura-agent-exploit-unlock').checked;
        if (!target) { showToast('Cible requise', 'warning'); return; }
        try {
            const res = await fetch(`${API_URL}/agent/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target, goal, mode, orchestrated, exploitUnlocked, engagement: currentEngagements.active }),
            });
            const data = await res.json();
            if (!data.success) { showToast(data.error || 'Echec lancement', 'error'); return; }
            currentAgentId = data.id;
            document.getElementById('aura-agent-setup').style.display = 'none';
            document.getElementById('aura-agent-live').style.display = 'flex';
            connectAgentStream(currentAgentId);
        } catch (e) {
            showToast('Serveur injoignable', 'error');
        }
    }

    function connectAgentStream(id) {
        if (currentEventSource) try { currentEventSource.close(); } catch {}
        const es = new EventSource(`${API_URL}/agent/${id}/stream`);
        currentEventSource = es;

        const feed = document.getElementById('aura-agent-feed');
        const pushFeed = (cls, html) => {
            if (!feed) return;
            const row = document.createElement('div');
            row.className = `aura-agent-row aura-agent-row-${cls}`;
            row.innerHTML = html;
            feed.appendChild(row);
            feed.scrollTop = feed.scrollHeight;
        };

        es.addEventListener('snapshot', (ev) => {
            const s = JSON.parse(ev.data);
            setAgentStatus(s.status || 'running', s.steps || 0);
            setUnlockBadge(!!s.exploitUnlocked);
        });
        es.addEventListener('start', () => setAgentStatus('running', 0));
        es.addEventListener('plan', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed('plan', `🎭 <b>Plan</b> · ${d.phases.length} phases : ${d.phases.map(p => `<code>${escapeHtml(p.name)}${p.parallel ? '∥' : ''}:${p.steps}</code>`).join(' → ')}`);
        });
        es.addEventListener('phase-start', (ev) => {
            const d = JSON.parse(ev.data);
            const el = document.getElementById('aura-agent-phase');
            if (el) { el.style.display = 'inline-block'; el.textContent = `▶ ${d.name}${d.parallel ? ' ∥' : ''}`; }
            pushFeed('phase', `▶ Phase <b>${escapeHtml(d.name)}</b> (${d.steps} steps${d.parallel ? ', parallèles' : ''})`);
        });
        es.addEventListener('phase-end', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed('phase-end', `✓ Phase <b>${escapeHtml(d.name)}</b> terminée`);
        });
        es.addEventListener('unlock', () => {
            setUnlockBadge(true);
            pushFeed('warn', `🔓 <b>Exploit mode unlocked</b>`);
        });
        es.addEventListener('log', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed(d.level, `<span class="aura-agent-ts">${new Date(d.at).toLocaleTimeString()}</span> ${escapeHtml(d.msg)}`);
        });
        es.addEventListener('step', (ev) => {
            const d = JSON.parse(ev.data);
            setAgentStatus('running', d.step);
            pushFeed('step', `<b>STEP ${d.step}</b> · <code>${escapeHtml(d.action.action)}</code>${d.action.tool ? ` <code>${escapeHtml(d.action.tool)}</code>` : ''} — ${escapeHtml(d.action.rationale || '')}`);
        });
        es.addEventListener('tool-start', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed('tool', `▶ <b>${escapeHtml(d.tool)}</b> · <code>${escapeHtml(d.target)}</code>`);
        });
        es.addEventListener('tool-end', (ev) => {
            const d = JSON.parse(ev.data);
            const preview = (d.outputPreview || '').split('\n').slice(0, 8).join('\n');
            pushFeed('tool-end', `✓ <b>${escapeHtml(d.tool)}</b> exit=${d.exitCode}<pre class="aura-agent-output">${escapeHtml(preview)}</pre>`);
        });
        es.addEventListener('install-start', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed('install', `📦 install <code>${escapeHtml(d.method)}:${escapeHtml(d.package)}</code>...`);
        });
        es.addEventListener('install-end', (ev) => {
            const d = JSON.parse(ev.data);
            pushFeed(d.success ? 'install-ok' : 'error', `${d.success ? '✓' : '✗'} install <code>${escapeHtml(d.package)}</code>`);
        });
        es.addEventListener('finding', (ev) => {
            const f = JSON.parse(ev.data);
            pushFeed('finding', `📋 <b>[${f.severity.toUpperCase()}]</b> ${escapeHtml(f.title)}`);
        });
        es.addEventListener('question', (ev) => {
            const q = JSON.parse(ev.data);
            showAgentQuestion(q);
        });
        es.addEventListener('end', (ev) => {
            const d = JSON.parse(ev.data);
            setAgentStatus('termine', null);
            pushFeed('end', `━ Fin · raison=${escapeHtml(d.reason || '')} · ${d.steps || 0} steps`);
            try { es.close(); } catch {}
        });
        es.onerror = () => { setAgentStatus('deconnecte', null); };
    }

    function setAgentStatus(status, step) {
        const s = document.getElementById('aura-agent-status');
        const st = document.getElementById('aura-agent-step');
        if (s) s.textContent = status;
        if (st && step !== null && step !== undefined) st.textContent = `step ${step}`;
    }

    function setUnlockBadge(on) {
        const b = document.getElementById('aura-agent-unlock-badge');
        if (b) b.style.display = on ? 'inline-block' : 'none';
        const btn = document.getElementById('aura-agent-unlock');
        if (btn) btn.style.display = on ? 'none' : 'inline-block';
    }

    async function unlockAgentExploit() {
        if (!currentAgentId) return;
        if (!confirm('Déverrouiller le mode EXPLOIT ?\n\nCela autorisera : sqlmap --dump, msfvenom, hydra brute-force, listeners ncat.\nCible et scope doivent être explicitement autorisés.')) return;
        try {
            const res = await fetch(`${API_URL}/agent/${currentAgentId}/unlock-exploit`, { method: 'POST' });
            const d = await res.json();
            if (d.success) { setUnlockBadge(true); showToast('🔓 Exploit déverrouillé', 'success'); }
            else showToast(d.error || 'Echec', 'error');
        } catch { showToast('Serveur injoignable', 'error'); }
    }

    function showAgentQuestion(q) {
        const box = document.getElementById('aura-agent-question');
        if (!box) return;
        box.style.display = 'block';
        box.innerHTML = `
            <div class="aura-agent-q-text">❓ ${escapeHtml(q.question)}</div>
            <div class="aura-agent-q-choices">
                ${(q.choices || ['oui', 'non']).map(c =>
                    `<button class="aura-lab-btn aura-lab-btn-mini" data-choice="${escapeHtml(c)}">${escapeHtml(c)}</button>`
                ).join('')}
            </div>
        `;
        box.querySelectorAll('button[data-choice]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const value = btn.getAttribute('data-choice');
                try {
                    await fetch(`${API_URL}/agent/${currentAgentId}/answer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ questionId: q.id, value }),
                    });
                    box.style.display = 'none';
                    box.innerHTML = '';
                } catch { showToast('Echec envoi reponse', 'error'); }
            });
        });
    }

    async function stopAgent() {
        if (!currentAgentId) return;
        try {
            await fetch(`${API_URL}/agent/${currentAgentId}/stop`, { method: 'POST' });
            showToast('Stop demande', 'info');
        } catch { showToast('Echec stop', 'error'); }
    }

    // Main Modal
    function toggleModal() {
        if (isModalOpen) closeModal();
        else openModal();
    }

    function openModal() {
        if (document.getElementById('aura-modal')) return;
        isModalOpen = true;

        const overlay = document.createElement('div');
        overlay.id = 'aura-modal-overlay';

        const modal = document.createElement('div');
        modal.id = 'aura-modal';
        modal.innerHTML = `
            <!-- Header -->
            <div class="aura-header">
                <div class="aura-header-left">
                    <div class="aura-logo">⚡</div>
                    <div>
                        <div class="aura-title">Aura Hive v${VERSION}</div>
                        <div class="aura-subtitle" id="aura-connection-status">CONNECTING...</div>
                    </div>
                </div>
                <div class="aura-header-actions">
                    <span style="font-size:9px;color:rgba(255,255,255,0.2);font-weight:700;letter-spacing:1px;">${PLATFORM.toUpperCase()}</span>
                    <button class="aura-close-btn" id="aura-close">✕</button>
                </div>
            </div>

            <!-- Tabs -->
            <div class="aura-tab-bar">
                <button class="aura-tab aura-tab-active" data-tab="files">
                    <span class="aura-tab-icon">📂</span> FILES
                </button>
                <button class="aura-tab" data-tab="terminal">
                    <span class="aura-tab-icon">💻</span> TERMINAL
                </button>
                <button class="aura-tab" data-tab="hive">
                    <span class="aura-tab-icon">🐝</span> HIVE
                </button>
                <button class="aura-tab" data-tab="memory">
                    <span class="aura-tab-icon">🧠</span> MEMORY
                </button>
                <div style="flex:1"></div>
                <button class="aura-tab" id="aura-refresh-btn">
                    <span class="aura-tab-icon">↻</span>
                </button>
            </div>

            <!-- Content: FILES -->
            <div id="aura-tab-content-files" class="aura-tab-content">
                <div class="aura-search-wrapper">
                    <span class="aura-search-icon">🔍</span>
                    <input type="text" class="aura-search" id="aura-search-input" placeholder="Search files (regex allowed)...">
                </div>
                <div class="aura-stats-bar" id="aura-stats-bar">Loading tree...</div>
                <div class="aura-scroll-area" id="aura-tree-container">
                    <div class="aura-skeleton" style="width:60%"></div>
                    <div class="aura-skeleton" style="width:40%"></div>
                    <div class="aura-skeleton" style="width:70%"></div>
                </div>
                <div class="aura-footer">
                    <span class="aura-footer-info" id="aura-selection-info">0 files selected</span>
                    <div class="aura-footer-actions">
                        <button class="aura-btn aura-btn-secondary" id="aura-btn-clear">Clear</button>
                        <button class="aura-btn aura-btn-primary" id="aura-btn-inject-action" disabled>
                            ⚡ INJECT
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content: TERMINAL -->
            <div id="aura-tab-content-terminal" class="aura-tab-content" style="display:none;">
                <div class="aura-terminal-header">
                    <div class="aura-terminal-dots">
                        <span style="background:#ef4444"></span>
                        <span style="background:#eab308"></span>
                        <span style="background:#22c55e"></span>
                    </div>
                    <div class="aura-live-badge">
                        <div class="aura-live-dot"></div>
                        <span class="aura-live-text">LIVE</span>
                    </div>
                </div>
                <div class="aura-terminal-output" id="aura-terminal-output">
                    <div class="aura-terminal-line">
                        <span class="aura-terminal-time">[SYSTEM]</span>
                        <span class="aura-terminal-text aura-term-info">Connecting to local terminal...</span>
                    </div>
                </div>
                <div class="aura-terminal-footer">
                    <input type="text" class="aura-ai-input" id="aura-cmd-input" placeholder="Enter command...">
                    <button class="aura-btn aura-btn-primary" id="aura-btn-run">RUN</button>
                </div>
            </div>

            <!-- Content: HIVE (NEW v4.0) -->
            <div id="aura-tab-content-hive" class="aura-tab-content" style="display:none;">
                <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span style="font-size:20px;">🐝</span>
                        <div>
                            <div style="font-size:13px;font-weight:800;color:#fff;">Autonomous Hive</div>
                            <div style="font-size:9px;color:rgba(255,255,255,0.3);font-weight:700;letter-spacing:1px;" id="aura-hive-status-label">STATUS: IDLE</div>
                        </div>
                        <div style="flex:1;"></div>
                        <div id="aura-hive-step-badge" style="padding:3px 10px;background:rgba(254,117,1,0.1);border:1px solid rgba(254,117,1,0.2);border-radius:8px;font-size:10px;font-weight:800;color:#FE7501;">
                            STEP 0/10
                        </div>
                    </div>
                    <input type="text" class="aura-search" id="aura-hive-goal-input" placeholder="Enter the goal... (e.g. Build a Todo app with React)" style="margin-bottom:8px;">
                    <div style="display:flex;gap:6px;">
                        <input type="number" class="aura-search" id="aura-hive-max-steps" value="10" min="1" max="50" style="width:80px;text-align:center;" title="Max Steps">
                        <button class="aura-btn aura-btn-primary" id="aura-hive-start" style="flex:1;">
                            🚀 START HIVE
                        </button>
                        <button class="aura-btn aura-btn-danger" id="aura-hive-stop" style="display:none;">
                            ⏹ STOP
                        </button>
                    </div>
                </div>
                <div class="aura-scroll-area" id="aura-hive-log" style="font-family:monospace;font-size:11px;line-height:1.8;">
                    <div style="color:rgba(255,255,255,0.15);text-align:center;padding:30px;">
                        No activity yet. Set a goal and press START.
                    </div>
                </div>
            </div>

            <!-- Content: MEMORY -->
            <div id="aura-tab-content-memory" class="aura-tab-content" style="display:none;">
                 <div class="aura-memory-header">
                    <div class="aura-title">Project Context</div>
                 </div>
                 <div class="aura-scroll-area">
                    <textarea class="aura-memory-editor" id="aura-memory-area" placeholder="Notes, tasks, code snippets... (Auto-saved)"></textarea>
                 </div>
            </div>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        requestAnimationFrame(() => {
            overlay.classList.add('aura-visible');
        });

        // Toggle Tabs
        modal.querySelectorAll('.aura-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Close Handlers
        overlay.addEventListener('click', closeModal);
        document.getElementById('aura-close').addEventListener('click', closeModal);

        // Inject Handler
        document.getElementById('aura-btn-inject-action').addEventListener('click', handleInjectFiles);

        // Search
        document.getElementById('aura-search-input').addEventListener('input', (e) => {
            currentFilter = e.target.value.toLowerCase();
            renderTree();
        });

        // Clear Selection
        document.getElementById('aura-btn-clear').addEventListener('click', () => {
            selectedFiles.clear();
            renderTree();
            updateSelectionUI();
        });

        // Refresh
        document.getElementById('aura-refresh-btn').addEventListener('click', () => {
            treeCache = null;
            loadTree();
        });

        // Terminal command run
        const cmdInput = document.getElementById('aura-cmd-input');
        const runBtn = document.getElementById('aura-btn-run');
        if (cmdInput && runBtn) {
            runBtn.addEventListener('click', () => runTerminalCommand(cmdInput.value));
            cmdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') runTerminalCommand(cmdInput.value);
            });
        }

        // Hive Controls
        document.getElementById('aura-hive-start').addEventListener('click', startHive);
        document.getElementById('aura-hive-stop').addEventListener('click', stopHive);

        // Load Initial Data
        checkServerStatus();
        loadTree();
        connectTerminalSSE();
    }

    function closeModal() {
        const overlay = document.getElementById('aura-modal-overlay');
        const modal = document.getElementById('aura-modal');
        if (overlay) {
            overlay.classList.remove('aura-visible');
            setTimeout(() => overlay.remove(), 200);
        }
        if (modal) {
            modal.style.transform = "translate(-50%, -48%) scale(0.95)";
            modal.style.opacity = "0";
            setTimeout(() => modal.remove(), 200);
        }
        isModalOpen = false;
    }

    function switchTab(tabName) {
        document.querySelectorAll('.aura-tab').forEach(t => t.classList.remove('aura-tab-active'));
        const activeTab = document.querySelector(`.aura-tab[data-tab="${tabName}"]`);
        if (activeTab) activeTab.classList.add('aura-tab-active');

        document.querySelectorAll('.aura-tab-content').forEach(c => c.style.display = 'none');
        const content = document.getElementById(`aura-tab-content-${tabName}`);
        if (content) content.style.display = 'flex';
    }

    // ════════════════════════════════════════════
    // 4. FILES TAB LOGIC
    // ════════════════════════════════════════════

    async function checkServerStatus() {
        const lbl = document.getElementById('aura-connection-status');
        if (!lbl) return;

        try {
            const res = await apiRequest('/tree?depth=1');
            if (res.success) {
                lbl.innerHTML = `<span style="color:#22c55e">● CONNECTED</span>`;
            } else {
                lbl.innerHTML = `<span style="color:#ef4444">● OFFLINE</span>`;
            }
        } catch {
            lbl.innerHTML = `<span style="color:#ef4444">● OFFLINE</span>`;
        }
    }

    async function loadTree() {
        const res = await apiRequest('/tree?depth=5');
        if (res.success) {
            treeData = res.tree;
            updateStats(res.stats);
            renderTree();
        } else {
            const container = document.getElementById('aura-tree-container');
            if (container) {
                container.innerHTML = `
                    <div class="aura-empty">
                        <span class="aura-empty-text" style="color:#ef4444">Server Offline</span>
                        <button class="aura-btn aura-btn-secondary" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    function updateStats(stats) {
        const bar = document.getElementById('aura-stats-bar');
        if (bar) bar.innerHTML = `${stats.totalFiles} files · ${stats.totalDirectories} folders`;
    }

    function renderTree() {
        const container = document.getElementById('aura-tree-container');
        if (!container) return;
        container.innerHTML = '';

        if (treeData.length === 0) return;

        function buildNode(node, depth, parentEl) {
            const isFile = node.type === 'file';
            if (isFile && currentFilter && !node.path.toLowerCase().includes(currentFilter)) return;

            const el = document.createElement('div');
            el.className = 'aura-tree-node';

            const isExpanded = expandedFolders.has(node.path) || !!currentFilter;
            const isSelected = selectedFiles.has(node.path);

            if (node.type === 'directory') {
                el.innerHTML = `
                    <div class="aura-tree-item">
                        <span class="aura-folder-toggle ${isExpanded ? 'aura-open' : ''}">▶</span>
                        <span class="aura-icon">📂</span>
                        <span class="aura-file-name">${node.name}</span>
                    </div>
                `;
                el.querySelector('.aura-tree-item').addEventListener('click', () => {
                    if (expandedFolders.has(node.path)) expandedFolders.delete(node.path);
                    else expandedFolders.add(node.path);
                    renderTree();
                });

                if (isExpanded && node.children) {
                    const childContainer = document.createElement('div');
                    childContainer.className = 'aura-children';
                    node.children.forEach(child => buildNode(child, depth + 1, childContainer));
                    el.appendChild(childContainer);
                }
            } else {
                el.innerHTML = `
                    <div class="aura-tree-item ${isSelected ? 'aura-selected' : ''}">
                        <span class="aura-checkbox">${isSelected ? '✓' : ''}</span>
                        <span class="aura-icon">${getFileIcon(node.extension)}</span>
                        <span class="aura-file-name">${node.name}</span>
                        <span class="aura-file-size">${formatFileSize(node.size)}</span>
                    </div>
                `;
                el.querySelector('.aura-tree-item').addEventListener('click', () => {
                    if (selectedFiles.has(node.path)) selectedFiles.delete(node.path);
                    else selectedFiles.add(node.path);
                    updateSelectionUI();
                    renderTree();
                });
            }
            parentEl.appendChild(el);
        }

        treeData.forEach(node => buildNode(node, 0, container));
    }

    function updateSelectionUI() {
        const count = selectedFiles.size;
        const info = document.getElementById('aura-selection-info');
        if (info) info.innerText = `${count} files selected`;
        const btn = document.getElementById('aura-btn-inject-action');
        if (btn) {
            btn.disabled = count === 0;
            btn.innerHTML = count === 0 ? '⚡ INJECT' : `⚡ INJECT (${count})`;
        }
    }

    async function handleInjectFiles() {
        const files = Array.from(selectedFiles);
        if (files.length === 0) return;

        const btn = document.getElementById('aura-btn-inject-action');
        btn.innerHTML = `<span class="aura-spinner"></span> LOADING...`;

        const res = await apiRequest('/read-multiple', 'POST', { filePaths: files });

        if (res.success) {
            let injectionText = "";
            res.files.forEach(f => {
                if (f.success) {
                    const ext = f.path.split('.').pop();
                    injectionText += `File: ${f.path}\n\`\`\`${ext}\n${f.content}\n\`\`\`\n\n`;
                }
            });

            const success = injectIntoPage(injectionText);
            if (success) {
                showToast(`${res.files.length} files injected!`, 'success');
                closeModal();
            } else {
                showToast("Failed to inject. Click text input first.", 'error');
            }
        } else {
            showToast("Failed to read files.", 'error');
        }

        btn.innerHTML = `⚡ INJECT`;
    }

    // ════════════════════════════════════════════
    // 5. TERMINAL TAB
    // ════════════════════════════════════════════
    let terminalSSE = null;

    function connectTerminalSSE() {
        if (terminalSSE) return; // Already connected

        try {
            terminalSSE = new EventSource(`${API_URL}/terminal/stream`);

            terminalSSE.onmessage = (e) => {
                try {
                    const entry = JSON.parse(e.data);
                    appendTerminalLine(entry.text, entry.type);
                } catch { }
            };

            terminalSSE.onerror = () => {
                terminalSSE.close();
                terminalSSE = null;
                // Reconnect after 5s
                setTimeout(connectTerminalSSE, 5000);
            };
        } catch { }
    }

    function appendTerminalLine(text, type = 'info') {
        const output = document.getElementById('aura-terminal-output');
        if (!output) return;

        const line = document.createElement('div');
        line.className = 'aura-terminal-line';

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const colorMap = {
            error: '#ef4444', warning: '#eab308', success: '#22c55e',
            system: '#818cf8', info: 'rgba(255,255,255,0.5)'
        };
        const color = colorMap[type] || colorMap.info;

        line.innerHTML = `
            <span class="aura-terminal-time">[${time}]</span>
            <span class="aura-terminal-text" style="color:${color}">${text}</span>
        `;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;

        // Limit lines
        while (output.children.length > 500) {
            output.removeChild(output.firstChild);
        }
    }

    async function runTerminalCommand(cmd) {
        if (!cmd || !cmd.trim()) return;
        const input = document.getElementById('aura-cmd-input');
        if (input) input.value = '';

        appendTerminalLine(`$ ${cmd}`, 'system');
        const res = await apiRequest('/exec', 'POST', { command: cmd });
        if (res.success) {
            if (res.output) appendTerminalLine(res.output, 'info');
        } else {
            appendTerminalLine(`Error: ${res.error || 'Unknown'}`, 'error');
        }
    }

    // ════════════════════════════════════════════
    // 6. HIVE TAB (NEW v4.0)
    // ════════════════════════════════════════════

    async function startHive() {
        const goalInput = document.getElementById('aura-hive-goal-input');
        const maxStepsInput = document.getElementById('aura-hive-max-steps');
        const goal = goalInput ? goalInput.value.trim() : '';
        const maxSteps = maxStepsInput ? parseInt(maxStepsInput.value) || 10 : 10;

        if (!goal) {
            showToast('Enter a goal first!', 'warning');
            return;
        }

        hiveLog('🚀 Starting Hive...', '#FE7501');
        hiveLog(`📋 Goal: "${goal}"`, '#818cf8');
        hiveLog(`📊 Max Steps: ${maxSteps}`, 'rgba(255,255,255,0.4)');

        const res = await apiRequest('/autonomous/start', 'POST', { goal, maxSteps });

        if (res.success) {
            hiveState.status = 'RUNNING';
            hiveState.goal = goal;
            hiveState.step = 1;
            hiveState.maxSteps = maxSteps;
            hiveState.history = [];

            hiveLog('✅ Hive Activated — Brain is planning...', '#22c55e');
            if (res.decision) {
                hiveLog(`🧠 Brain: ${truncate(res.decision.analysis, 120)}`, '#818cf8');
            }
            updateHiveUI();
        } else {
            hiveLog(`❌ Failed to start: ${res.error || res.message || 'Unknown'}`, '#ef4444');
        }
    }

    async function stopHive() {
        const res = await apiRequest('/autonomous/stop', 'POST');
        hiveState.status = 'STOPPED';
        hiveLog('⏹ Hive Stopped by user.', '#ef4444');
        updateHiveUI();
    }

    function hiveLog(message, color = 'rgba(255,255,255,0.5)') {
        const log = document.getElementById('aura-hive-log');
        if (!log) return;

        // Clear placeholder
        if (log.querySelector('div[style*="text-align:center"]')) {
            log.innerHTML = '';
        }

        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const line = document.createElement('div');
        line.style.cssText = `color:${color};padding:2px 4px;border-bottom:1px solid rgba(255,255,255,0.03);`;
        line.innerHTML = `<span style="color:rgba(255,255,255,0.15);margin-right:8px;">[${time}]</span>${message}`;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }

    function updateHiveUI() {
        const statusLabel = document.getElementById('aura-hive-status-label');
        const stepBadge = document.getElementById('aura-hive-step-badge');
        const startBtn = document.getElementById('aura-hive-start');
        const stopBtn = document.getElementById('aura-hive-stop');

        if (statusLabel) {
            const colorMap = { IDLE: '#888', RUNNING: '#22c55e', STOPPED: '#ef4444', PAUSED: '#eab308' };
            const color = colorMap[hiveState.status] || '#888';
            statusLabel.innerHTML = `STATUS: <span style="color:${color}">${hiveState.status}</span>`;
        }

        if (stepBadge) {
            stepBadge.textContent = `STEP ${hiveState.step}/${hiveState.maxSteps}`;
        }

        if (startBtn && stopBtn) {
            if (hiveState.status === 'RUNNING') {
                startBtn.style.display = 'none';
                stopBtn.style.display = 'flex';
            } else {
                startBtn.style.display = 'flex';
                stopBtn.style.display = 'none';
            }
        }
    }

    // ════════════════════════════════════════════
    // 7. INJECTION ENGINE (Multi-Platform)
    // ════════════════════════════════════════════

    function injectIntoPage(text) {
        // Strategy 1: Use active element if it's an input
        const active = document.activeElement;
        if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            document.execCommand('insertText', false, text);
            return true;
        }

        // Strategy 2: Platform-specific selectors
        const platformSelectors = {
            chatgpt: ['#prompt-textarea', 'textarea[data-id="root"]', 'div[contenteditable="true"]'],
            claude: ['.ProseMirror', 'div[contenteditable="true"]', 'fieldset textarea'],
            gemini: ['div[contenteditable="true"]', '.ql-editor', 'rich-textarea textarea'],
            copilot: ['textarea#searchbox', 'textarea', 'div[contenteditable="true"]'],
            arena: ['textarea', '.ProseMirror', 'div[contenteditable="true"]'],
            unknown: ['textarea', 'div[contenteditable="true"]', '.ProseMirror']
        };

        const selectors = platformSelectors[PLATFORM] || platformSelectors.unknown;

        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                el.focus();
                // Small delay to let the element activate
                setTimeout(() => {
                    document.execCommand('insertText', false, text);
                }, 50);
                return true;
            }
        }

        // Strategy 3: Generic fallback
        const genericSelectors = [
            'textarea[placeholder*="message"]',
            'textarea[placeholder*="Message"]',
            'textarea'
        ];

        for (const sel of genericSelectors) {
            const el = document.querySelector(sel);
            if (el) {
                el.focus();
                document.execCommand('insertText', false, text);
                return true;
            }
        }

        return false;
    }

    // ════════════════════════════════════════════
    // 8. SMART AUTO-SEND (Platform-Aware)
    // ════════════════════════════════════════════

    async function autoClickSend() {
        // Wait for input to propagate in React/Vue virtual DOM
        await new Promise(r => setTimeout(r, 300));

        const platformButtons = {
            chatgpt: [
                'button[data-testid="send-button"]',
                'button[aria-label="Send prompt"]',
                'button[aria-label="Send message"]',
                'form button[type="submit"]'
            ],
            claude: [
                'button[aria-label="Send Message"]',
                'button[aria-label="Send message"]',
                'fieldset button:last-child',
                'button[type="submit"]'
            ],
            gemini: [
                'button[aria-label="Send message"]',
                'button.send-button',
                'mat-icon-button[aria-label="Send message"]'
            ],
            copilot: [
                'button[aria-label="Submit"]',
                'button.submit-button',
                'button[type="submit"]'
            ],
            arena: [
                'button.lg.primary',
                'button[type="submit"]',
                '#component-6 button'
            ],
            unknown: [
                'button[aria-label="Send message"]',
                'button[data-testid="send-button"]',
                'button[type="submit"]',
                'button.send-button'
            ]
        };

        const selectors = platformButtons[PLATFORM] || platformButtons.unknown;

        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                if (el.offsetParent !== null && !el.disabled) {
                    el.click();
                    console.log(`⚡ [AuraHive] Clicked send: ${sel}`);
                    return true;
                }
            }
        }

        // Fallback: Simulate Enter key on active element
        const activeEl = document.activeElement;
        if (activeEl) {
            // For ChatGPT: Enter submits. For Claude: Enter submits.
            const enterEvent = new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true, keyCode: 13, key: 'Enter'
            });
            activeEl.dispatchEvent(enterEvent);
            console.log(`⚡ [AuraHive] Sent via Enter key`);
            return true;
        }

        return false;
    }

    // ════════════════════════════════════════════
    // 9. CODE EXTRACTION (Multi-Platform)
    // ════════════════════════════════════════════

    function extractLastCodeBlock() {
        // Platform-specific code block selectors (ordered by priority)
        const codeSelectors = {
            chatgpt: ['pre code', 'div.code-block code', '.markdown pre code'],
            claude: ['pre code', '.code-block pre', 'code.language-'],
            gemini: ['pre code', '.code-block code', 'code-block code'],
            copilot: ['pre code', '.code-block code'],
            arena: ['pre code', '.code-block', 'pre'],
            unknown: ['pre code', '.code-block', 'pre']
        };

        const selectors = codeSelectors[PLATFORM] || codeSelectors.unknown;

        // Collect ALL code blocks across selectors
        let allBlocks = [];
        for (const sel of selectors) {
            const blocks = document.querySelectorAll(sel);
            if (blocks.length > 0) {
                allBlocks = [...blocks];
                break; // Use the first selector that matches
            }
        }

        if (allBlocks.length === 0) {
            // Last resort: any pre or code element
            allBlocks = [...document.querySelectorAll('pre code, pre')];
        }

        if (allBlocks.length > 0) {
            const lastBlock = allBlocks[allBlocks.length - 1];
            const code = lastBlock.innerText || lastBlock.textContent;
            return code.trim() || null;
        }

        return null;
    }

    // Extract ALL code blocks from the last AI response
    function extractAllCodeBlocks() {
        const blocks = document.querySelectorAll('pre code, pre');
        const results = [];

        blocks.forEach(block => {
            const text = (block.innerText || block.textContent).trim();
            if (text.length > 10) { // Skip tiny snippets
                results.push(text);
            }
        });

        return results;
    }

    // ════════════════════════════════════════════
    // 10. RESPONSE COMPLETION DETECTOR
    // ════════════════════════════════════════════

    function waitForResponseCompletion(stabilityMs = 3000) {
        return new Promise((resolve) => {
            let lastChange = Date.now();
            let settled = false;

            const observer = new MutationObserver(() => {
                lastChange = Date.now();
            });

            // Observe the main content area
            const targetNode = document.querySelector('main') || document.body;
            observer.observe(targetNode, {
                childList: true,
                subtree: true,
                characterData: true
            });

            // Check if "stop generating" / loading indicators disappear
            const checkInterval = setInterval(() => {
                // Platform-specific "generating" indicators
                const generatingIndicators = {
                    chatgpt: 'button[aria-label="Stop generating"]',
                    claude: 'button[aria-label="Stop Response"]',
                    gemini: '.loading-indicator, .generating',
                    copilot: '.typing-indicator',
                    arena: '.generating, .loading'
                };

                const indicator = generatingIndicators[PLATFORM];
                const stillGenerating = indicator ? document.querySelector(indicator) : null;

                if (stillGenerating && stillGenerating.offsetParent !== null) {
                    lastChange = Date.now(); // Reset if still generating
                    return;
                }

                // If no DOM changes for stabilityMs, assume done
                if (Date.now() - lastChange > stabilityMs && !settled) {
                    settled = true;
                    clearInterval(checkInterval);
                    observer.disconnect();
                    resolve();
                }
            }, 500);

            // Safety timeout (3 mins max)
            setTimeout(() => {
                if (!settled) {
                    settled = true;
                    clearInterval(checkInterval);
                    observer.disconnect();
                    console.warn('[AuraHive] Response timeout (180s)');
                    resolve();
                }
            }, 180000);
        });
    }

    // ════════════════════════════════════════════
    // 11. QUICK SAVE
    // ════════════════════════════════════════════

    async function handleQuickSave() {
        const blocks = document.querySelectorAll('pre code, div.code-block, pre');
        if (blocks.length === 0) {
            showToast('No code block found to save.', 'error');
            return;
        }

        const lastBlock = blocks[blocks.length - 1];
        const content = lastBlock.innerText;

        const filePath = prompt("Enter file path to save (e.g. src/utils.js):");
        if (!filePath) return;

        const res = await apiRequest('/write', 'POST', { filePath, content });
        if (res.success) showToast('File saved!', 'success');
        else showToast('Save failed: ' + res.error, 'error');
    }

    // ════════════════════════════════════════════
    // 12. REMOTE CONTROL & HIVE FEEDBACK LOOP
    // ════════════════════════════════════════════

    function initRemoteControl() {
        if (window.auraRemoteActive) return;
        window.auraRemoteActive = true;

        console.log("⚡ [AuraHive] Remote Control Connector Starting...");

        const eventSource = new EventSource(`${API_URL}/remote/stream`);

        eventSource.onopen = () => {
            console.log("⚡ [AuraHive] Connected to Command Center");
            showToast("Remote Control Active", "success");
        };

        eventSource.onerror = () => {
            console.warn("⚡ [AuraHive] Remote Disconnected (Retrying in 5s...)");
            eventSource.close();
            window.auraRemoteActive = false;
            setTimeout(initRemoteControl, 5000);
        };

        eventSource.addEventListener('command', async (e) => {
            try {
                const cmd = JSON.parse(e.data);
                console.log("⚡ [AuraHive] Executing:", cmd);

                let result = null;
                let status = 'success';
                let error = null;

                try {
                    if (cmd.action === 'input') {
                        // 1. Inject Prompt into AI
                        const injected = injectIntoPage(cmd.value);
                        result = injected ? "Input injected" : "Injection failed";

                        // 2. Auto-Send
                        console.log("⚡ [AuraHive] Auto-clicking Send...");
                        await new Promise(r => setTimeout(r, 600));
                        const sent = await autoClickSend();
                        if (sent) result += " & Sent";
                        else result += " (Send button not found — tried Enter)";

                        // 3. If HIVE step, wait for AI response & extract code
                        if (cmd.id && cmd.id.startsWith('hive-')) {
                            console.log("⚡ [AuraHive] Hive Step Detected — Waiting for AI response...");
                            showToast("⏳ Waiting for AI response...", "info");
                            hiveLog(`🔄 Step injected. Waiting for AI...`, '#eab308');

                            await waitForResponseCompletion(4000);

                            // Extract code
                            const code = extractLastCodeBlock();
                            const lastText = document.body.innerText;
                            const logs = lastText.substring(Math.max(0, lastText.length - 800));

                            console.log("⚡ [AuraHive] Response Captured. Code length:", code ? code.length : 0);

                            hiveLog(
                                code
                                    ? `✅ Code captured (${code.length} chars)`
                                    : `⚠️ No code block found in response`,
                                code ? '#22c55e' : '#eab308'
                            );

                            // Update local hive state
                            hiveState.step++;
                            updateHiveUI();

                            // 4. Send Feedback to Server
                            const feedbackRes = await apiRequest('/autonomous/feedback', 'POST', {
                                id: cmd.id,
                                code,
                                logs,
                                status: code ? 'success' : 'no_code'
                            });

                            if (feedbackRes.success) {
                                if (feedbackRes.decision) {
                                    hiveLog(`🧠 Brain: ${truncate(feedbackRes.decision.analysis, 120)}`, '#818cf8');
                                }
                                if (feedbackRes.action === 'stop' || feedbackRes.context?.state === 'STOPPED') {
                                    hiveState.status = 'STOPPED';
                                    hiveLog('🛑 Hive completed.', '#ef4444');
                                    updateHiveUI();
                                }
                            }

                            showToast("✅ Feedback Sent", "success");
                            return; // Feedback sent, done.
                        }
                    }
                    else if (cmd.action === 'click') {
                        const el = document.querySelector(cmd.selector);
                        if (el) {
                            el.click();
                            result = "Clicked " + cmd.selector;
                        } else {
                            throw new Error("Element not found: " + cmd.selector);
                        }
                    }
                    else if (cmd.action === 'scrape') {
                        result = document.body.innerText;
                    }
                    else if (cmd.action === 'extract_code') {
                        const code = extractLastCodeBlock();
                        result = code || 'No code block found';
                    }

                } catch (ex) {
                    status = 'error';
                    error = ex.message;
                    console.error(ex);
                    hiveLog(`❌ Command Error: ${ex.message}`, '#ef4444');
                }

                // Standard Result (non-hive)
                await apiRequest('/remote/result', 'POST', {
                    id: cmd.id,
                    status,
                    result: typeof result === 'string' ? result.substring(0, 5000) : result,
                    error
                });

            } catch (parseErr) {
                console.error("[AuraHive] Command Parse Error", parseErr);
            }
        });
    }

    // ════════════════════════════════════════════
    // 13. INITIALIZATION
    // ════════════════════════════════════════════

    function init() {
        console.log(`%c⚡ Aura Hive v${VERSION} Active [${PLATFORM.toUpperCase()}]`,
            "background: linear-gradient(135deg, #FE7501, #e06800); color: white; padding: 6px 12px; font-weight: bold; border-radius: 4px;"
        );

        // Anti-deletion loop (re-create FAB if removed)
        setInterval(() => {
            if (!document.getElementById('aura-fab')) {
                createFAB();
            }
        }, 2000);

        createFAB();
        initRemoteControl();

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+I = Toggle Modal
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                toggleModal();
            }
            // Ctrl+Shift+H = Switch to Hive tab
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                if (!isModalOpen) openModal();
                setTimeout(() => switchTab('hive'), 100);
            }
        });
    }

    // ════════════════════════════════════════════
    // 🧠 AI CONFIG MODAL — provider + cle API + modeles
    // ════════════════════════════════════════════
    async function openAIConfigModal() {
        const existing = document.getElementById('aura-ai-modal');
        if (existing) { existing.remove(); return; }

        const modal = document.createElement('div');
        modal.id = 'aura-ai-modal';
        modal.className = 'aura-lab-modal';
        modal.innerHTML = `
            <div class="aura-lab-modal-backdrop"></div>
            <div class="aura-lab-modal-box aura-ai-box">
                <div class="aura-lab-modal-head">
                    <div class="aura-lab-modal-title">🧠 Configuration IA</div>
                    <button class="aura-lab-btn aura-lab-btn-close" id="aura-ai-close">✕</button>
                </div>
                <div class="aura-lab-modal-body" id="aura-ai-body">
                    <div class="aura-ai-loading">Chargement des providers...</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#aura-ai-close').addEventListener('click', () => modal.remove());
        modal.querySelector('.aura-lab-modal-backdrop').addEventListener('click', () => modal.remove());

        try {
            const [provRes, cfgRes] = await Promise.all([
                fetch(`${API_URL}/ai/providers`).then(r => r.json()),
                fetch(`${API_URL}/ai/config`).then(r => r.json()),
            ]);
            const providers = provRes.providers || [];
            const cfg = cfgRes.config || { active: 'groq', providers: {} };
            renderAIConfigUI(modal, providers, cfg);
        } catch (e) {
            modal.querySelector('#aura-ai-body').innerHTML = `<div class="aura-ai-error">Erreur chargement : ${e.message}</div>`;
        }
    }

    function renderAIConfigUI(modal, providers, cfg) {
        const body = modal.querySelector('#aura-ai-body');
        const activeProvider = cfg.active || providers[0]?.key || 'groq';
        const tabs = providers.map(p => `
            <button class="aura-ai-tab ${p.key === activeProvider ? 'active' : ''}" data-prov="${p.key}">
                ${p.label}${cfg.providers?.[p.key]?._hasKey ? ' ✓' : ''}
            </button>
        `).join('');
        body.innerHTML = `
            <div class="aura-ai-info">
                Choisis le provider IA qui alimente l'agent autonome. Clé stockée localement dans <code>server/data/ai-config.json</code>.
            </div>
            <div class="aura-ai-active-row">
                <label>Provider actif :</label>
                <select id="aura-ai-active-select">
                    ${providers.map(p => `<option value="${p.key}" ${p.key === activeProvider ? 'selected' : ''}>${p.label}</option>`).join('')}
                </select>
                <button class="aura-lab-btn aura-lab-btn-mini aura-lab-btn-go" id="aura-ai-set-active">Définir actif</button>
            </div>
            <div class="aura-ai-tabs">${tabs}</div>
            <div class="aura-ai-panel" id="aura-ai-panel"></div>
        `;
        const showTab = (key) => {
            const p = providers.find(x => x.key === key);
            const saved = cfg.providers?.[key] || {};
            const panel = modal.querySelector('#aura-ai-panel');
            panel.innerHTML = `
                <div class="aura-ai-field">
                    <label>Clé API</label>
                    <input type="password" id="aura-ai-key" placeholder="${saved._hasKey ? saved.apiKey : 'Colle ta clé API ici...'}" autocomplete="off" />
                    <a class="aura-ai-docs" href="${p.docsUrl}" target="_blank" rel="noopener">📖 Obtenir une clé →</a>
                </div>
                <div class="aura-ai-field">
                    <label>Modèle raisonnement (décisions, plans, chaînes)</label>
                    <select id="aura-ai-model-reasoning">
                        ${p.models.reasoning.map(m => `<option value="${m}" ${m === (saved.models?.reasoning || p.default.reasoning) ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
                <div class="aura-ai-field">
                    <label>Modèle rapide (parse, classify, tags)</label>
                    <select id="aura-ai-model-cheap">
                        ${p.models.cheap.map(m => `<option value="${m}" ${m === (saved.models?.cheap || p.default.cheap) ? 'selected' : ''}>${m}</option>`).join('')}
                    </select>
                </div>
                <div class="aura-ai-actions">
                    <button class="aura-lab-btn aura-lab-btn-mini" id="aura-ai-test">🧪 Tester</button>
                    <button class="aura-lab-btn aura-lab-btn-mini aura-lab-btn-go" id="aura-ai-save">💾 Sauvegarder</button>
                    <span class="aura-ai-status" id="aura-ai-status"></span>
                </div>
            `;

            panel.querySelector('#aura-ai-save').addEventListener('click', async () => {
                const apiKeyInput = panel.querySelector('#aura-ai-key').value.trim();
                const models = {
                    reasoning: panel.querySelector('#aura-ai-model-reasoning').value,
                    cheap: panel.querySelector('#aura-ai-model-cheap').value,
                };
                const payload = { provider: key, models };
                if (apiKeyInput) payload.apiKey = apiKeyInput;
                panel.querySelector('#aura-ai-status').textContent = '⏳ Sauvegarde...';
                try {
                    const r = await fetch(`${API_URL}/ai/config`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    }).then(x => x.json());
                    if (r.success) {
                        panel.querySelector('#aura-ai-status').textContent = '✓ Sauvegardé';
                        setTimeout(() => openAIConfigModal(), 600);
                    } else throw new Error(r.error);
                } catch (e) {
                    panel.querySelector('#aura-ai-status').textContent = '✗ ' + e.message;
                }
            });

            panel.querySelector('#aura-ai-test').addEventListener('click', async () => {
                const apiKeyInput = panel.querySelector('#aura-ai-key').value.trim();
                const model = panel.querySelector('#aura-ai-model-cheap').value;
                const st = panel.querySelector('#aura-ai-status');
                st.textContent = '🧪 Test en cours...';
                try {
                    const body = { provider: key, model };
                    if (apiKeyInput) body.apiKey = apiKeyInput;
                    const r = await fetch(`${API_URL}/ai/test`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    }).then(x => x.json());
                    if (r.ok) {
                        st.textContent = `✓ OK (${r.model}) — "${(r.response || '').slice(0, 30)}"`;
                        st.style.color = '#4ade80';
                    } else {
                        st.textContent = `✗ ${r.error}`;
                        st.style.color = '#f87171';
                    }
                } catch (e) {
                    st.textContent = `✗ ${e.message}`;
                    st.style.color = '#f87171';
                }
            });
        };
        showTab(activeProvider);

        modal.querySelectorAll('.aura-ai-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.aura-ai-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                showTab(tab.dataset.prov);
            });
        });

        modal.querySelector('#aura-ai-set-active').addEventListener('click', async () => {
            const prov = modal.querySelector('#aura-ai-active-select').value;
            try {
                const r = await fetch(`${API_URL}/ai/active`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: prov }),
                }).then(x => x.json());
                if (r.success) openAIConfigModal();
            } catch (e) {}
        });
    }

    // Run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
