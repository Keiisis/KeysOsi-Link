#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  ⚡ KEYSOSI-MCP — stdio wrapper for Model Context Protocol
//  Expose les capacites de KeysOsi-Link a Claude Desktop / Cursor /
//  tout client MCP parlant JSON-RPC 2024-11-05.
//
//  Usage :
//    node bin/keysosi-mcp.js
//
//  Config Claude Desktop (claude_desktop_config.json) :
//  {
//    "mcpServers": {
//      "keysosi-link": {
//        "command": "node",
//        "args": ["<abs-path>/KeysOsi-Link/server/bin/keysosi-mcp.js"]
//      }
//    }
//  }
// ════════════════════════════════════════════════════════════════
'use strict';

process.on('uncaughtException', (e) => {
    process.stderr.write(`[keysosi-mcp] uncaught: ${e.stack || e.message}\n`);
});
process.on('unhandledRejection', (e) => {
    process.stderr.write(`[keysosi-mcp] unhandled: ${(e && e.stack) || e}\n`);
});

const path = require('path');
const ROOT = path.join(__dirname, '..');

function safeRequire(relPath) {
    try { return require(path.join(ROOT, relPath)); }
    catch (e) {
        process.stderr.write(`[keysosi-mcp] module "${relPath}" indisponible: ${e.message}\n`);
        return null;
    }
}

// ── Charger les modules partages (tolerant si certains manquent) ──
const tools = safeRequire('autonomous/tools');
const cveMapper = safeRequire('autonomous/cve-mapper');
const payloads = safeRequire('autonomous/payloads');
const rag = safeRequire('autonomous/rag');
const knowledgeMod = safeRequire('autonomous/engagement-memory');
const exploitChain = safeRequire('autonomous/exploitchain');
const osint = safeRequire('autonomous/osint');
const jsSecret = safeRequire('autonomous/js-secret-scanner');
const oob = safeRequire('autonomous/oob-collaborator');
const reportGen = safeRequire('autonomous/report-gen');
const bugbounty = safeRequire('autonomous/bugbounty-api');
const mcpServer = safeRequire('autonomous/mcp-server');

if (!mcpServer) {
    process.stderr.write('[keysosi-mcp] mcp-server module introuvable — arret\n');
    process.exit(1);
}

// Knowledge lazy-loaded depuis engagement-memory si l'engagement courant est passe via arg
let knowledge = { hosts: {} };
(async () => {
    try {
        if (knowledgeMod?.load) {
            const slug = process.env.KEYSOSI_ENGAGEMENT || 'default';
            knowledge = await knowledgeMod.load(slug);
        }
    } catch (e) {
        process.stderr.write(`[keysosi-mcp] knowledge load error: ${e.message}\n`);
    }

    const ctx = {
        modules: {
            tools,
            cveMapper,
            payloads,
            rag,
            knowledge,
            exploitChain,
            osint,
            jsSecret,
            oob,
            reportGen,
            bugbounty,
        },
    };

    mcpServer.runStdio(ctx);
    process.stderr.write(`[keysosi-mcp] ready — ${mcpServer.listTools().length} tools exposes\n`);
})();
