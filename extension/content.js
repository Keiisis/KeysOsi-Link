// ════════════════════════════════════════════════════════════════
//  ⚡ AURA LINK — Ultimate AI Bridge — Content Script v2.0
// ════════════════════════════════════════════════════════════════

(() => {
    "use strict";

    const API_URL = "http://localhost:3666";
    let treeCache = null;
    let treeCacheTime = 0;
    const TREE_CACHE_TTL = 15000; // 15s

    // ────────────────────────────────────────────
    // STYLES INJECTÉS (Glassmorphism)
    // ────────────────────────────────────────────
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        /* ── Animations ── */
        @keyframes aura-fadeIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes aura-fadeOut {
            from { opacity: 1; transform: scale(1) translateY(0); }
            to   { opacity: 0; transform: scale(0.95) translateY(10px); }
        }
        @keyframes aura-slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aura-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(254, 117, 1, 0.4); }
            50%      { box-shadow: 0 0 0 8px rgba(254, 117, 1, 0); }
        }
        @keyframes aura-spin {
            to { transform: rotate(360deg); }
        }
        @keyframes aura-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }

        /* ── Overlay ── */
        #aura-modal-overlay {
            position: fixed; inset: 0; z-index: 999998;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        #aura-modal-overlay.aura-visible { opacity: 1; }

        /* ── Modal Container ── */
        #aura-modal {
            position: fixed; z-index: 999999;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 680px; max-width: 92vw;
            max-height: 85vh;
            background: linear-gradient(135deg, rgba(20, 20, 25, 0.95), rgba(30, 30, 38, 0.92));
            backdrop-filter: blur(40px) saturate(1.5);
            -webkit-backdrop-filter: blur(40px) saturate(1.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            box-shadow: 
                0 40px 80px rgba(0, 0, 0, 0.5),
                0 0 1px rgba(255, 255, 255, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);
            display: flex; flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            animation: aura-fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        #aura-modal.aura-closing {
            animation: aura-fadeOut 0.25s ease forwards;
        }

        /* ── Header ── */
        .aura-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            display: flex; align-items: center; justify-content: space-between;
            background: rgba(254, 117, 1, 0.03);
        }
        .aura-header-left {
            display: flex; align-items: center; gap: 12px;
        }
        .aura-logo {
            width: 36px; height: 36px;
            background: linear-gradient(135deg, #FE7501, #ff9a3c);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 15px rgba(254, 117, 1, 0.3);
        }
        .aura-title {
            font-size: 15px; font-weight: 800; color: #fff;
            letter-spacing: 0.5px;
        }
        .aura-subtitle {
            font-size: 10px; color: rgba(255, 255, 255, 0.35);
            font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
            margin-top: 1px;
        }
        .aura-close-btn {
            width: 32px; height: 32px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.4);
            font-size: 16px; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.2s;
        }
        .aura-close-btn:hover {
            background: rgba(255, 50, 50, 0.15);
            color: #ff6b6b;
            border-color: rgba(255, 50, 50, 0.3);
        }

        /* ── Search Bar ── */
        .aura-search-wrapper {
            padding: 12px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .aura-search {
            width: 100%; padding: 10px 14px 10px 38px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            color: #fff; font-size: 13px; font-weight: 500;
            outline: none;
            transition: all 0.2s;
        }
        .aura-search:focus {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(254, 117, 1, 0.4);
            box-shadow: 0 0 0 3px rgba(254, 117, 1, 0.1);
        }
        .aura-search::placeholder {
            color: rgba(255, 255, 255, 0.2);
        }
        .aura-search-icon {
            position: absolute; left: 38px; top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.2);
            font-size: 14px; pointer-events: none;
        }

        /* ── Stats Bar ── */
        .aura-stats-bar {
            padding: 8px 24px;
            display: flex; align-items: center; justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .aura-stat {
            font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.25);
            letter-spacing: 1px; text-transform: uppercase;
        }
        .aura-stat-highlight {
            color: #FE7501; font-weight: 800;
        }
        .aura-select-actions {
            display: flex; gap: 6px;
        }
        .aura-mini-btn {
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 6px;
            color: rgba(255, 255, 255, 0.4);
            font-size: 9px; font-weight: 700; text-transform: uppercase;
            letter-spacing: 1px; cursor: pointer;
            transition: all 0.15s;
        }
        .aura-mini-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: rgba(255, 255, 255, 0.7);
        }

        /* ── Tree Container ── */
        .aura-tree-container {
            flex: 1; overflow-y: auto;
            padding: 8px 16px 16px;
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.08) transparent;
        }
        .aura-tree-container::-webkit-scrollbar { width: 6px; }
        .aura-tree-container::-webkit-scrollbar-track { background: transparent; }
        .aura-tree-container::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.08);
            border-radius: 3px;
        }

        /* ── Tree Node ── */
        .aura-tree-node {
            animation: aura-slideUp 0.2s ease forwards;
        }
        .aura-tree-item {
            display: flex; align-items: center; gap: 8px;
            padding: 6px 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            user-select: none;
        }
        .aura-tree-item:hover {
            background: rgba(255, 255, 255, 0.04);
        }
        .aura-tree-item.aura-selected {
            background: rgba(254, 117, 1, 0.08);
            border: 1px solid rgba(254, 117, 1, 0.15);
            margin: 1px 0;
        }
        
        /* Checkbox */
        .aura-checkbox {
            width: 16px; height: 16px; min-width: 16px;
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            transition: all 0.15s;
            font-size: 10px; color: transparent;
        }
        .aura-selected .aura-checkbox {
            background: #FE7501;
            border-color: #FE7501;
            color: #fff;
            box-shadow: 0 2px 8px rgba(254, 117, 1, 0.3);
        }

        /* Icons */
        .aura-icon {
            font-size: 14px; width: 20px; text-align: center;
            flex-shrink: 0;
        }
        .aura-folder-icon { color: #FE7501; }
        .aura-file-icon { color: rgba(255, 255, 255, 0.3); }
        
        /* File extensions → couleurs */
        .aura-ext-tsx, .aura-ext-jsx { color: #61dafb; }
        .aura-ext-ts, .aura-ext-js   { color: #f7df1e; }
        .aura-ext-css, .aura-ext-scss { color: #a855f7; }
        .aura-ext-json                { color: #22c55e; }
        .aura-ext-md                  { color: #6b7280; }
        .aura-ext-html                { color: #ef4444; }
        .aura-ext-svg, .aura-ext-png, .aura-ext-jpg { color: #ec4899; }
        .aura-ext-prisma              { color: #2dd4bf; }
        .aura-ext-sql                 { color: #3b82f6; }
        .aura-ext-env                 { color: #eab308; }

        .aura-file-name {
            font-size: 13px; font-weight: 500; color: rgba(255, 255, 255, 0.75);
            flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .aura-tree-item:hover .aura-file-name { color: rgba(255, 255, 255, 0.95); }
        .aura-selected .aura-file-name { color: #fff; font-weight: 600; }

        .aura-file-size {
            font-size: 9px; color: rgba(255, 255, 255, 0.15);
            font-weight: 600; font-variant-numeric: tabular-nums;
            letter-spacing: 0.5px;
        }

        .aura-folder-toggle {
            width: 16px; height: 16px; min-width: 16px;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: rgba(255, 255, 255, 0.25);
            transition: transform 0.2s;
            cursor: pointer;
        }
        .aura-folder-toggle.aura-open { transform: rotate(90deg); }

        .aura-children {
            margin-left: 20px;
            border-left: 1px solid rgba(255, 255, 255, 0.04);
            padding-left: 4px;
            overflow: hidden;
            transition: max-height 0.25s ease;
        }

        /* ── Footer / Action Bar ── */
        .aura-footer {
            padding: 16px 24px;
            border-top: 1px solid rgba(255, 255, 255, 0.06);
            display: flex; align-items: center; justify-content: space-between;
            gap: 12px;
            background: rgba(0, 0, 0, 0.2);
        }
        .aura-footer-info {
            font-size: 11px; color: rgba(255, 255, 255, 0.3);
            font-weight: 600;
        }
        .aura-footer-actions {
            display: flex; gap: 8px;
        }
        .aura-btn {
            padding: 10px 20px;
            border-radius: 12px;
            font-size: 11px; font-weight: 800;
            text-transform: uppercase; letter-spacing: 1.5px;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            display: flex; align-items: center; gap: 8px;
        }
        .aura-btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .aura-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.8);
        }
        .aura-btn-primary {
            background: linear-gradient(135deg, #FE7501, #ff9a3c);
            color: #fff;
            box-shadow: 0 4px 20px rgba(254, 117, 1, 0.3);
        }
        .aura-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 25px rgba(254, 117, 1, 0.4);
        }
        .aura-btn-primary:active { transform: translateY(0); }
        .aura-btn:disabled {
            opacity: 0.4; cursor: not-allowed;
            transform: none !important;
        }

        /* ── Floating Action Button ── */
        #aura-fab {
            position: fixed; bottom: 24px; right: 24px; z-index: 99990;
            display: flex; flex-direction: column; gap: 8px;
            align-items: flex-end;
        }
        .aura-fab-btn {
            display: flex; align-items: center; gap: 8px;
            padding: 12px 18px;
            background: linear-gradient(135deg, rgba(20, 20, 25, 0.92), rgba(30, 30, 38, 0.88));
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            color: #fff; font-weight: 700; font-size: 12px;
            cursor: pointer;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            transition: all 0.25s;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }
        .aura-fab-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
            border-color: rgba(254, 117, 1, 0.3);
        }
        .aura-fab-main {
            background: linear-gradient(135deg, #FE7501, #e06800);
            border-color: rgba(255, 255, 255, 0.15);
            animation: aura-pulse 2s infinite;
        }
        .aura-fab-main:hover {
            animation: none;
            background: linear-gradient(135deg, #ff8a1c, #FE7501);
        }

        /* ── Loading Spinner ── */
        .aura-spinner {
            width: 20px; height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-top-color: #FE7501;
            border-radius: 50%;
            animation: aura-spin 0.8s linear infinite;
        }

        /* ── Loading Skeleton ── */
        .aura-skeleton {
            height: 32px; margin: 4px 10px;
            border-radius: 8px;
            background: linear-gradient(90deg, 
                rgba(255,255,255,0.03) 0%, 
                rgba(255,255,255,0.06) 50%, 
                rgba(255,255,255,0.03) 100%);
            background-size: 200% 100%;
            animation: aura-shimmer 1.5s infinite;
        }

        /* ── Toast Notification ── */
        .aura-toast {
            position: fixed; bottom: 90px; right: 24px; z-index: 999999;
            padding: 12px 20px;
            background: rgba(20, 20, 25, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            color: #fff; font-size: 12px; font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
            display: flex; align-items: center; gap: 8px;
            animation: aura-slideUp 0.3s ease;
            transition: opacity 0.3s;
        }
        .aura-toast-success { border-left: 3px solid #22c55e; }
        .aura-toast-error   { border-left: 3px solid #ef4444; }
        .aura-toast-info    { border-left: 3px solid #FE7501; }

        /* ── Empty State ── */
        .aura-empty {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            padding: 48px 24px;
            color: rgba(255, 255, 255, 0.2);
            gap: 12px;
        }
        .aura-empty-icon { font-size: 40px; opacity: 0.5; }
        .aura-empty-text { font-size: 13px; font-weight: 600; text-align: center; }
    `;
    document.head.appendChild(styleSheet);


    // ────────────────────────────────────────────
    // UTILITAIRES
    // ────────────────────────────────────────────
    function formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getFileIcon(ext) {
        const icons = {
            tsx: '⚛️', jsx: '⚛️', ts: '🟨', js: '🟨',
            css: '🎨', scss: '🎨', less: '🎨',
            html: '🌐', svg: '🖼️', png: '🖼️', jpg: '🖼️', gif: '🖼️', webp: '🖼️',
            json: '📋', md: '📝', mdx: '📝',
            prisma: '💎', sql: '🗃️',
            env: '🔒', yaml: '⚙️', yml: '⚙️', toml: '⚙️',
            py: '🐍', go: '🐹', rs: '🦀',
            sh: '🐚', bash: '🐚',
            txt: '📄', log: '📄',
        };
        return icons[ext] || '📄';
    }

    function showToast(message, type = 'info') {
        const existing = document.querySelectorAll('.aura-toast');
        existing.forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `aura-toast aura-toast-${type}`;
        toast.innerHTML = `${type === 'success' ? '✅' : type === 'error' ? '❌' : '⚡'} ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }


    // ────────────────────────────────────────────
    // API CALLS
    // ────────────────────────────────────────────
    async function fetchTree() {
        const now = Date.now();
        if (treeCache && (now - treeCacheTime) < TREE_CACHE_TTL) {
            return treeCache;
        }
        const res = await fetch(`${API_URL}/tree?depth=8`);
        const data = await res.json();
        if (data.success) {
            treeCache = data;
            treeCacheTime = now;
        }
        return data;
    }

    async function fetchFileContent(filePath) {
        const res = await fetch(`${API_URL}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath })
        });
        return await res.json();
    }

    async function fetchMultipleFiles(filePaths) {
        const res = await fetch(`${API_URL}/read-multiple`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePaths })
        });
        return await res.json();
    }

    async function saveFile(filePath, content) {
        const res = await fetch(`${API_URL}/write`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath, content })
        });
        return await res.json();
    }


    // ────────────────────────────────────────────
    // INJECTION DANS LE CHAT
    // ────────────────────────────────────────────
    function injectIntoChat(text) {
        // Chercher la zone de texte (Claude, ChatGPT, Arena...)
        const selectors = [
            'div.ProseMirror[contenteditable="true"]',           // Claude
            'div#prompt-textarea[contenteditable="true"]',       // ChatGPT
            'textarea[placeholder]',                              // Arena / Generic
            'textarea',                                           // Fallback
            '[contenteditable="true"]',                           // Generic contenteditable
        ];

        let inputArea = null;
        for (const sel of selectors) {
            inputArea = document.querySelector(sel);
            if (inputArea) break;
        }

        if (!inputArea) {
            showToast("Zone de texte introuvable ! Cliquez dans le chat d'abord.", 'error');
            return false;
        }

        inputArea.focus();

        // Tenter insertText d'abord (compatible React/ProseMirror)
        const inserted = document.execCommand('insertText', false, text);

        if (!inserted) {
            // Fallback textarea
            if (inputArea.tagName === 'TEXTAREA' || inputArea.tagName === 'INPUT') {
                const start = inputArea.selectionStart || inputArea.value.length;
                inputArea.value = inputArea.value.slice(0, start) + text + inputArea.value.slice(start);
                inputArea.selectionStart = inputArea.selectionEnd = start + text.length;
            } else {
                inputArea.textContent += text;
            }
            inputArea.dispatchEvent(new Event('input', { bubbles: true }));
            inputArea.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return true;
    }

    function buildInjectionPayload(files) {
        return files.map(f => {
            const ext = f.path.split('.').pop() || 'txt';
            return `Voici le contenu du fichier \`${f.path}\`:\n\n\`\`\`${ext}\n${f.content}\n\`\`\``;
        }).join('\n\n');
    }


    // ────────────────────────────────────────────
    // MODAL — CONSTRUCTION
    // ────────────────────────────────────────────
    let selectedFiles = new Set();
    let expandedFolders = new Set();
    let currentFilter = '';

    function openModal() {
        // Fermer si déjà ouvert
        closeModal(true);
        selectedFiles = new Set();

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'aura-modal-overlay';
        overlay.addEventListener('click', () => closeModal());
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add('aura-visible'));

        // Modal
        const modal = document.createElement('div');
        modal.id = 'aura-modal';
        modal.innerHTML = `
            <!-- Header -->
            <div class="aura-header">
                <div class="aura-header-left">
                    <div class="aura-logo">⚡</div>
                    <div>
                        <div class="aura-title">Aura Link</div>
                        <div class="aura-subtitle">Ultimate AI Bridge</div>
                    </div>
                </div>
                <button class="aura-close-btn" id="aura-close">✕</button>
            </div>

            <!-- Search -->
            <div class="aura-search-wrapper" style="position: relative;">
                <span class="aura-search-icon">🔍</span>
                <input 
                    type="text" 
                    class="aura-search" 
                    id="aura-search-input" 
                    placeholder="Rechercher un fichier..." 
                    autocomplete="off" spellcheck="false"
                />
            </div>

            <!-- Stats Bar -->
            <div class="aura-stats-bar" id="aura-stats-bar">
                <span class="aura-stat">Chargement...</span>
            </div>

            <!-- Tree -->
            <div class="aura-tree-container" id="aura-tree-container">
                <div class="aura-skeleton" style="width: 70%;"></div>
                <div class="aura-skeleton" style="width: 55%; animation-delay: 0.1s;"></div>
                <div class="aura-skeleton" style="width: 80%; animation-delay: 0.2s;"></div>
                <div class="aura-skeleton" style="width: 45%; animation-delay: 0.3s;"></div>
                <div class="aura-skeleton" style="width: 65%; animation-delay: 0.4s;"></div>
                <div class="aura-skeleton" style="width: 50%; animation-delay: 0.5s;"></div>
            </div>

            <!-- Footer -->
            <div class="aura-footer">
                <span class="aura-footer-info" id="aura-selection-info">Aucun fichier sélectionné</span>
                <div class="aura-footer-actions">
                    <button class="aura-btn aura-btn-secondary" id="aura-btn-cancel">Annuler</button>
                    <button class="aura-btn aura-btn-primary" id="aura-btn-inject" disabled>
                        ⚡ INJECT SELECTED
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Empêcher la propagation des clics internes à l'overlay
        modal.addEventListener('click', e => e.stopPropagation());

        // Event listeners
        document.getElementById('aura-close').addEventListener('click', () => closeModal());
        document.getElementById('aura-btn-cancel').addEventListener('click', () => closeModal());
        document.getElementById('aura-btn-inject').addEventListener('click', handleInject);

        const searchInput = document.getElementById('aura-search-input');
        searchInput.addEventListener('input', (e) => {
            currentFilter = e.target.value.toLowerCase();
            renderTree();
        });

        // Raccourci Escape
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Focus le champ de recherche
        setTimeout(() => searchInput.focus(), 100);

        // Charger l'arborescence
        loadTree();
    }

    function closeModal(instant = false) {
        const overlay = document.getElementById('aura-modal-overlay');
        const modal = document.getElementById('aura-modal');

        if (!modal && !overlay) return;

        if (instant) {
            overlay?.remove();
            modal?.remove();
            return;
        }

        if (overlay) {
            overlay.classList.remove('aura-visible');
            setTimeout(() => overlay.remove(), 300);
        }
        if (modal) {
            modal.classList.add('aura-closing');
            setTimeout(() => modal.remove(), 250);
        }
    }


    // ────────────────────────────────────────────
    // TREE — CHARGEMENT & RENDU
    // ────────────────────────────────────────────
    let treeData = [];

    async function loadTree() {
        try {
            const data = await fetchTree();
            if (data.success) {
                treeData = data.tree;
                // Auto-expand les dossiers de premier niveau
                treeData.forEach(node => {
                    if (node.type === 'directory') {
                        expandedFolders.add(node.path);
                    }
                });
                updateStatsBar(data.stats);
                renderTree();
            } else {
                showTreeError("Impossible de charger l'arborescence.");
            }
        } catch (e) {
            showTreeError("Serveur Aura Link inaccessible (port 3666).");
        }
    }

    function updateStatsBar(stats) {
        const bar = document.getElementById('aura-stats-bar');
        if (!bar) return;

        bar.innerHTML = `
            <span class="aura-stat">
                <span class="aura-stat-highlight">${stats.totalFiles}</span> fichiers · 
                <span class="aura-stat-highlight">${stats.totalDirectories}</span> dossiers
            </span>
            <div class="aura-select-actions">
                <button class="aura-mini-btn" id="aura-select-all">Tout</button>
                <button class="aura-mini-btn" id="aura-select-none">Aucun</button>
                <button class="aura-mini-btn" id="aura-refresh-tree">↻ Refresh</button>
            </div>
        `;

        document.getElementById('aura-select-all')?.addEventListener('click', () => {
            selectAllVisible();
            renderTree();
            updateSelectionInfo();
        });
        document.getElementById('aura-select-none')?.addEventListener('click', () => {
            selectedFiles.clear();
            renderTree();
            updateSelectionInfo();
        });
        document.getElementById('aura-refresh-tree')?.addEventListener('click', () => {
            treeCache = null;
            loadTree();
        });
    }

    function selectAllVisible() {
        function walkAndSelect(nodes) {
            for (const node of nodes) {
                if (node.type === 'file' && matchesFilter(node)) {
                    selectedFiles.add(node.path);
                }
                if (node.type === 'directory' && node.children) {
                    walkAndSelect(node.children);
                }
            }
        }
        walkAndSelect(treeData);
    }

    function matchesFilter(node) {
        if (!currentFilter) return true;
        return node.name.toLowerCase().includes(currentFilter) ||
            node.path.toLowerCase().includes(currentFilter);
    }

    function hasVisibleChildren(node) {
        if (!node.children) return false;
        return node.children.some(child => {
            if (child.type === 'file') return matchesFilter(child);
            if (child.type === 'directory') return hasVisibleChildren(child);
            return false;
        });
    }

    function renderTree() {
        const container = document.getElementById('aura-tree-container');
        if (!container) return;

        if (treeData.length === 0) {
            container.innerHTML = `
                <div class="aura-empty">
                    <span class="aura-empty-icon">📂</span>
                    <span class="aura-empty-text">Aucun fichier trouvé</span>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        renderNodes(treeData, container, 0);
    }

    function renderNodes(nodes, parentEl, depth) {
        for (const node of nodes) {
            if (node.type === 'file' && !matchesFilter(node)) continue;
            if (node.type === 'directory' && currentFilter && !hasVisibleChildren(node)) continue;

            const el = document.createElement('div');
            el.className = 'aura-tree-node';
            el.style.animationDelay = `${depth * 0.02}s`;

            if (node.type === 'directory') {
                const isExpanded = expandedFolders.has(node.path) || !!currentFilter;

                el.innerHTML = `
                    <div class="aura-tree-item" data-path="${node.path}" data-type="directory">
                        <span class="aura-folder-toggle ${isExpanded ? 'aura-open' : ''}">▶</span>
                        <span class="aura-icon aura-folder-icon">${isExpanded ? '📂' : '📁'}</span>
                        <span class="aura-file-name">${node.name}</span>
                        <span class="aura-file-size" style="opacity: 0.15;">${node.children?.length || 0}</span>
                    </div>
                `;

                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'aura-children';
                childrenContainer.style.display = isExpanded ? 'block' : 'none';

                if (node.children && node.children.length > 0) {
                    renderNodes(node.children, childrenContainer, depth + 1);
                }
                el.appendChild(childrenContainer);

                // Toggle folder
                const item = el.querySelector('.aura-tree-item');
                item.addEventListener('click', () => {
                    const toggle = item.querySelector('.aura-folder-toggle');
                    const icon = item.querySelector('.aura-icon');
                    const isOpen = expandedFolders.has(node.path);

                    if (isOpen) {
                        expandedFolders.delete(node.path);
                        toggle.classList.remove('aura-open');
                        icon.textContent = '📁';
                        childrenContainer.style.display = 'none';
                    } else {
                        expandedFolders.add(node.path);
                        toggle.classList.add('aura-open');
                        icon.textContent = '📂';
                        childrenContainer.style.display = 'block';
                    }
                });

            } else {
                // File
                const isSelected = selectedFiles.has(node.path);
                const ext = node.extension || '';

                el.innerHTML = `
                    <div class="aura-tree-item ${isSelected ? 'aura-selected' : ''}" 
                         data-path="${node.path}" data-type="file">
                        <span class="aura-checkbox">${isSelected ? '✓' : ''}</span>
                        <span class="aura-icon aura-file-icon aura-ext-${ext}">${getFileIcon(ext)}</span>
                        <span class="aura-file-name">${node.name}</span>
                        <span class="aura-file-size">${formatFileSize(node.size || 0)}</span>
                    </div>
                `;

                // Toggle selection
                const item = el.querySelector('.aura-tree-item');
                item.addEventListener('click', () => {
                    if (selectedFiles.has(node.path)) {
                        selectedFiles.delete(node.path);
                        item.classList.remove('aura-selected');
                        item.querySelector('.aura-checkbox').textContent = '';
                    } else {
                        selectedFiles.add(node.path);
                        item.classList.add('aura-selected');
                        item.querySelector('.aura-checkbox').textContent = '✓';
                    }
                    updateSelectionInfo();
                });
            }

            parentEl.appendChild(el);
        }
    }

    function showTreeError(message) {
        const container = document.getElementById('aura-tree-container');
        if (!container) return;
        container.innerHTML = `
            <div class="aura-empty">
                <span class="aura-empty-icon">⚠️</span>
                <span class="aura-empty-text">${message}<br><br>
                    <span style="font-size: 10px; opacity: 0.5;">
                        Lancez : node tools/aura-link/server/index.js
                    </span>
                </span>
            </div>
        `;
    }

    function updateSelectionInfo() {
        const info = document.getElementById('aura-selection-info');
        const btn = document.getElementById('aura-btn-inject');
        const count = selectedFiles.size;

        if (info) {
            if (count === 0) {
                info.textContent = 'Aucun fichier sélectionné';
            } else {
                info.innerHTML = `<span style="color: #FE7501; font-weight: 800;">${count}</span> fichier${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}`;
            }
        }

        if (btn) {
            btn.disabled = count === 0;
            btn.innerHTML = count > 0
                ? `⚡ INJECT ${count} FILE${count > 1 ? 'S' : ''}`
                : '⚡ INJECT SELECTED';
        }
    }


    // ────────────────────────────────────────────
    // INJECTION HANDLER
    // ────────────────────────────────────────────
    async function handleInject() {
        const paths = Array.from(selectedFiles);
        if (paths.length === 0) return;

        const btn = document.getElementById('aura-btn-inject');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="aura-spinner"></span> LOADING...';
        }

        try {
            let filesData;

            if (paths.length === 1) {
                // Lecture simple
                const result = await fetchFileContent(paths[0]);
                if (result.success) {
                    filesData = [{ path: paths[0], content: result.content }];
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Lecture multiple
                const result = await fetchMultipleFiles(paths);
                if (result.success) {
                    filesData = result.files
                        .filter(f => f.success)
                        .map(f => ({ path: f.path, content: f.content }));

                    if (result.totalFailed > 0) {
                        showToast(`${result.totalFailed} fichier(s) impossible(s) à lire`, 'error');
                    }
                } else {
                    throw new Error(result.error);
                }
            }

            if (filesData && filesData.length > 0) {
                const payload = buildInjectionPayload(filesData);
                const injected = injectIntoChat(payload);

                if (injected) {
                    showToast(`${filesData.length} fichier${filesData.length > 1 ? 's' : ''} injecté${filesData.length > 1 ? 's' : ''} avec succès`, 'success');
                    closeModal();
                }
            }
        } catch (e) {
            showToast(`Erreur : ${e.message}`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '⚡ INJECT SELECTED';
            }
        }
    }


    // ────────────────────────────────────────────
    // FLOATING ACTION BUTTONS
    // ────────────────────────────────────────────
    const fab = document.createElement('div');
    fab.id = 'aura-fab';
    fab.innerHTML = `
        <button class="aura-fab-btn" id="aura-fab-save" title="Sauvegarder depuis le chat">
            💾 SAVE
        </button>
        <button class="aura-fab-btn aura-fab-main" id="aura-fab-inject" title="Injecter des fichiers">
            ⚡ INJECT
        </button>
    `;
    document.body.appendChild(fab);

    document.getElementById('aura-fab-inject').addEventListener('click', openModal);

    document.getElementById('aura-fab-save').addEventListener('click', async () => {
        const filePath = prompt("Sauvegarder dans quel fichier ?\n(depuis la racine du projet)\nEx: app/page.tsx");
        if (!filePath) return;

        // Chercher le dernier code block sélectionné ou le dernier sur la page
        const selection = window.getSelection();
        let code = '';

        if (selection && selection.toString().trim().length > 0) {
            code = selection.toString();
        } else {
            const codeBlocks = document.querySelectorAll('pre code, pre');
            if (codeBlocks.length > 0) {
                code = codeBlocks[codeBlocks.length - 1].innerText;
            }
        }

        if (!code) {
            showToast("Aucun code trouvé. Sélectionnez du texte ou assurez-vous qu'il y a un bloc de code.", 'error');
            return;
        }

        try {
            const result = await saveFile(filePath, code);
            if (result.success) {
                showToast(`Sauvegardé dans ${filePath}`, 'success');
            } else {
                showToast(`Erreur : ${result.error}`, 'error');
            }
        } catch (e) {
            showToast("Serveur Aura Link inaccessible", 'error');
        }
    });

    // ────────────────────────────────────────────
    // SAVE BUTTONS ON CODE BLOCKS
    // ────────────────────────────────────────────
    function processCodeBlocks() {
        const codeBlocks = document.querySelectorAll("pre");

        codeBlocks.forEach(block => {
            if (block.getAttribute("data-aura-processed")) return;

            const btn = document.createElement("button");
            btn.innerHTML = "💾 SAVE";
            btn.style.cssText = `
                position: absolute; top: 8px; right: 60px;
                background: linear-gradient(135deg, rgba(20, 20, 25, 0.9), rgba(30, 30, 38, 0.85));
                backdrop-filter: blur(10px);
                color: rgba(255, 255, 255, 0.8);
                font-size: 10px; font-weight: 700;
                padding: 5px 12px; border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                cursor: pointer; z-index: 100;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                letter-spacing: 1px; text-transform: uppercase;
                transition: all 0.2s;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;

            btn.onmouseenter = () => {
                btn.style.borderColor = 'rgba(254, 117, 1, 0.4)';
                btn.style.color = '#FE7501';
                btn.style.transform = 'translateY(-1px)';
            };
            btn.onmouseleave = () => {
                btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                btn.style.color = 'rgba(255, 255, 255, 0.8)';
                btn.style.transform = 'translateY(0)';
            };

            if (getComputedStyle(block).position === 'static') {
                block.style.position = 'relative';
            }

            btn.addEventListener("click", async (e) => {
                e.stopPropagation();
                const code = block.querySelector("code")?.innerText || block.innerText;
                const targetPath = prompt("Sauvegarder dans quel fichier ?\nEx: app/page.tsx");

                if (targetPath) {
                    try {
                        const result = await saveFile(targetPath, code);
                        if (result.success) {
                            btn.innerHTML = "✅ SAVED";
                            btn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                            btn.style.color = '#22c55e';
                            showToast(`Sauvegardé dans ${targetPath}`, 'success');

                            setTimeout(() => {
                                btn.innerHTML = "💾 SAVE";
                                btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                btn.style.color = 'rgba(255, 255, 255, 0.8)';
                            }, 2500);
                        } else {
                            showToast(`Erreur : ${result.error}`, 'error');
                        }
                    } catch (err) {
                        showToast("Serveur Aura Link inaccessible", 'error');
                    }
                }
            });

            block.appendChild(btn);
            block.setAttribute("data-aura-processed", "true");
        });
    }

    // Observer les nouveaux code blocks (streaming IA)
    const codeBlockObserver = new MutationObserver(() => {
        processCodeBlocks();
    });

    codeBlockObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Scan initial
    processCodeBlocks();


    // ────────────────────────────────────────────
    // RACCOURCI CLAVIER : Ctrl+Shift+I → ouvrir la modale
    // ────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            openModal();
        }
    });

    console.log("⚡ Aura Link v2.0 — Ultimate AI Bridge activé");
    console.log("   Ctrl+Shift+I pour ouvrir l'injecteur");

})();
