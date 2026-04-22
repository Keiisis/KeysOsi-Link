// ════════════════════════════════════════════════════════════════
//  ⚡ AURA BACKGROUND — Service Worker (MV3)
//  - Context menus : recon rapide sur la page/lien courant
//  - Proxy toggle  : route le navigateur via mitmproxy (sandbox)
//  - Screenshot    : capture tab + upload vers session engagement
// ════════════════════════════════════════════════════════════════
const API_URL = 'http://localhost:3666';

const RECON_TYPES = {
    'aura-subfinder': { type: 'subfinder', title: 'Aura: Subfinder (sous-domaines)' },
    'aura-httpx':     { type: 'httpx',     title: 'Aura: httpx (probe)' },
    'aura-nuclei':    { type: 'nuclei',    title: 'Aura: Nuclei scan' },
    'aura-headers':   { type: 'headers',   title: 'Aura: Capturer les headers HTTP' },
    'aura-whatweb':   { type: 'whatweb',   title: 'Aura: WhatWeb (fingerprint)' },
    'aura-nmap':      { type: 'nmap',      title: 'Aura: Nmap top-100 ports' },
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        // Racine
        chrome.contextMenus.create({
            id: 'aura-root', title: '⚡ Aura Lab',
            contexts: ['page', 'link', 'selection'],
        });

        // Recon
        for (const [id, { title }] of Object.entries(RECON_TYPES)) {
            chrome.contextMenus.create({
                id, title, parentId: 'aura-root',
                contexts: ['page', 'link', 'selection'],
            });
        }

        // Separateur
        chrome.contextMenus.create({
            id: 'aura-sep-1', type: 'separator', parentId: 'aura-root',
            contexts: ['page', 'link', 'selection'],
        });

        // Screenshot
        chrome.contextMenus.create({
            id: 'aura-screenshot', title: 'Aura: Screenshot de la page',
            parentId: 'aura-root', contexts: ['page'],
        });

        // Separateur
        chrome.contextMenus.create({
            id: 'aura-sep-2', type: 'separator', parentId: 'aura-root',
            contexts: ['page'],
        });

        // Proxy
        chrome.contextMenus.create({
            id: 'aura-proxy-on', title: '🔀 Activer proxy (mitm)',
            parentId: 'aura-root', contexts: ['page'],
        });
        chrome.contextMenus.create({
            id: 'aura-proxy-off', title: '🚫 Desactiver proxy',
            parentId: 'aura-root', contexts: ['page'],
        });
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const target = info.selectionText?.trim() || info.linkUrl || info.pageUrl || tab?.url;

    if (RECON_TYPES[info.menuItemId]) {
        await runRecon(RECON_TYPES[info.menuItemId].type, target);
        return;
    }

    switch (info.menuItemId) {
        case 'aura-screenshot':
            await runScreenshot(tab);
            break;
        case 'aura-proxy-on':
            await enableProxy();
            break;
        case 'aura-proxy-off':
            await disableProxy();
            break;
    }
});

async function runRecon(type, target) {
    try {
        const res = await fetch(`${API_URL}/recon/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, target }),
        });
        const data = await res.json();
        if (data.success) {
            notify(`Recon ${type}`, `Job #${data.job.id} lance sur ${shortTarget(target)}`);
        } else {
            notify(`Recon ${type}`, `Echec : ${data.error || 'erreur inconnue'}`);
        }
    } catch {
        notify(`Recon ${type}`, 'Serveur KeysOsi-Link injoignable (port 3666)');
    }
}

async function runScreenshot(tab) {
    if (!tab) return;
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        const res = await fetch(`${API_URL}/recon/screenshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: tab.url, dataUrl }),
        });
        const data = await res.json();
        if (data.success) notify('Screenshot', `Sauve dans ${data.file}`);
        else notify('Screenshot', data.error || 'Echec');
    } catch (e) {
        notify('Screenshot', String(e.message || e));
    }
}

async function enableProxy() {
    // 1) demarre le container mitm
    let proxyInfo;
    try {
        const res = await fetch(`${API_URL}/sandbox/proxy/start`, { method: 'POST' });
        proxyInfo = await res.json();
        if (!proxyInfo.success) {
            notify('Proxy', proxyInfo.error || 'Echec demarrage mitm');
            return;
        }
    } catch {
        notify('Proxy', 'Serveur KeysOsi-Link injoignable');
        return;
    }

    // 2) configure Chrome pour router via 127.0.0.1:8880
    await new Promise((resolve) => {
        chrome.proxy.settings.set({
            value: {
                mode: 'fixed_servers',
                rules: {
                    singleProxy: { scheme: 'http', host: '127.0.0.1', port: 8880 },
                    bypassList: ['localhost', '127.0.0.1', '<local>'],
                },
            },
            scope: 'regular',
        }, resolve);
    });
    await chrome.storage.local.set({ auraProxyActive: true });

    notify('Proxy actif', 'Trafic route via mitmproxy. UI : http://127.0.0.1:8881 · Cert : http://mitm.it');
}

async function disableProxy() {
    await new Promise((resolve) => {
        chrome.proxy.settings.clear({ scope: 'regular' }, resolve);
    });
    await chrome.storage.local.set({ auraProxyActive: false });
    try { await fetch(`${API_URL}/sandbox/proxy/stop`, { method: 'POST' }); } catch {}
    notify('Proxy desactive', 'Navigateur en connexion directe');
}

function shortTarget(t) {
    const s = String(t || '');
    return s.length > 60 ? s.slice(0, 60) + '…' : s;
}

function notify(title, message) {
    try {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: '⚡ ' + title,
            message: String(message || ''),
            priority: 1,
        });
    } catch {}
}

// ── Messages depuis content.js (toggle proxy depuis le Lab panel) ──
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
        if (msg.type === 'aura-proxy-enable')  { await enableProxy();  sendResponse({ ok: true }); return; }
        if (msg.type === 'aura-proxy-disable') { await disableProxy(); sendResponse({ ok: true }); return; }
        if (msg.type === 'aura-proxy-state') {
            const { auraProxyActive } = await chrome.storage.local.get('auraProxyActive');
            sendResponse({ active: !!auraProxyActive });
            return;
        }
        sendResponse({ ok: false, error: 'unknown message type' });
    })();
    return true; // async response
});
