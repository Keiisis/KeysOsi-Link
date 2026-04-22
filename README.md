# ⚡ KeysOsi-Link v6.0 « Phantom »

> **Pont bidirectionnel IA ↔ Système local & méta-agent de cybersécurité autonome.**
>
> KeysOsi-Link fusionne deux univers en un seul outil :
> 1. **Extension Chrome + serveur local** qui injecte vos fichiers dans ChatGPT / Claude / Arena et sauvegarde le code généré directement dans vos projets.
> 2. **Agent pentester autonome** multi-modèles (Groq / Claude / OpenAI / Gemini) avec boucle ReAct, orchestration DAG, RAG, fewshot-memory, rapport automatique, et protocole MCP pour piloter l'agent depuis Claude Desktop / Cursor.

> ⚠️ **Usage strictement autorisé** : CTF (HackTheBox, TryHackMe, Root-Me), bug bounty avec scope écrit (HackerOne, Bugcrowd, Intigriti), audits pentest avec mandat, laboratoires personnels. Toute utilisation hors scope est refusée par l'agent et par vous-même.

---

## 📑 Table des matières

- [Pourquoi KeysOsi-Link ?](#-pourquoi-keysosi-link-)
- [Architecture globale](#-architecture-globale)
- [Capacités de la v6 Phantom](#-capacités-de-la-v6-phantom)
- [Les 15 modules Phantom](#-les-15-modules-phantom)
- [Prérequis système](#-prérequis-système)
- [Installation complète](#-installation-complète)
- [Configuration des clés API](#-configuration-des-clés-api)
- [Démarrage du serveur](#-démarrage-du-serveur)
- [Extension Chrome](#-extension-chrome)
- [Intégration MCP (Claude Desktop / Cursor)](#-intégration-mcp-claude-desktop--cursor)
- [Utilisation de l'agent pentester](#-utilisation-de-lagent-pentester)
- [Endpoints HTTP principaux](#-endpoints-http-principaux)
- [Catalogue d'outils sandbox](#-catalogue-doutils-sandbox)
- [Mémoire, RAG et fewshot](#-mémoire-rag-et-fewshot)
- [Sécurité & garde-fous scope](#-sécurité--garde-fous-scope)
- [Dépannage](#-dépannage)
- [Feuille de route](#-feuille-de-route)
- [Licence & avertissement](#-licence--avertissement)

---

## 🎯 Pourquoi KeysOsi-Link ?

### Le problème
Quand on code avec un LLM, on perd un temps fou à :
- Copier-coller 15 fichiers un par un pour donner du contexte.
- Refaire le même copier-coller de la réponse vers ses fichiers.
- Changer de modèle (Groq rapide, Claude pour le reasoning, GPT pour le code) sans perdre l'historique.

Et quand on fait du pentest, on jongle entre :
- Un terminal Kali.
- 12 onglets de CVE search.
- Un bloc-notes pour les payloads WAF-bypass.
- Un autre pour tracer ce qui a marché.
- Un LLM pour "réfléchir" mais qui n'a aucune mémoire entre les sessions.

### La solution
KeysOsi-Link est **une couche unique** qui :

| Pour le développement | Pour le pentest |
|-----------------------|-----------------|
| Injecte fichiers dans le chat IA en 1 clic | Orchestration autonome avec ReAct + DAG |
| Sauvegarde réponses IA directement sur disque | Catalogue d'outils Kali + auto-install |
| Raccourci `Ctrl+Shift+I` pour ouvrir | Mémoire persistante par engagement |
| Multi-site (Claude, ChatGPT, Arena) | CVE mapping + payloads WAF-bypass |
| Multi-provider LLM (switch à chaud) | OOB collaborator pour blind vulns |
|                                        | Scope check H1/Bugcrowd/Intigriti |
|                                        | Rapport Markdown+HTML auto généré |
|                                        | Exposition MCP → Claude Desktop |

---

## 🏗️ Architecture globale

```
┌──────────────────────────────────────────────────────────────────┐
│                       CLIENT (vous)                              │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │ Extension Chrome │  │  Claude Desktop │  │  Cursor / VS   │   │
│  │   (MV3)          │  │    (MCP stdio)  │  │  Code MCP      │   │
│  └─────────┬────────┘  └────────┬────────┘  └───────┬────────┘   │
└────────────┼─────────────────────┼───────────────────┼───────────┘
             │ HTTP/WS             │ stdio JSON-RPC    │
             │ localhost:3666      │                   │
             ▼                     ▼                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              SERVEUR NODE KEYSOSI-LINK (Express + WS)            │
│                                                                  │
│  /explorer  /save  /execute    ◄── Dev workflow (fichiers)       │
│  /agents    /orchestrator      ◄── Méta-agent pentest            │
│  /mcp       /mcp/tools         ◄── Pont MCP HTTP                 │
│  /cve /payloads /osint …       ◄── 60+ endpoints v6 Phantom      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  AI PROVIDER ROUTER                                     │     │
│  │  Groq · Anthropic Claude · OpenAI · Google Gemini       │     │
│  │  Routing : reasoning tier / cheap tier                  │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  AUTONOMOUS MODULES (agent.js + 15 modules Phantom)     │     │
│  │  tools · orchestrator · exploitchain · reflection · rag │     │
│  │  cve-mapper · payloads · session-mgr · oob-collaborator │     │
│  │  js-secrets · osint · privesc · rate-limiter            │     │
│  │  bugbounty-api · fewshot · replay-dvr · screenshot-dvr  │     │
│  │  wordlist-gen · report-gen · mcp-server                 │     │
│  └─────────────────────────────────────────────────────────┘     │
└───────────────┬──────────────────────────────────────────────────┘
                │ docker exec / WS sandbox
                ▼
┌──────────────────────────────────────────────────────────────────┐
│  DOCKER DESKTOP + WSL2                                           │
│  ┌──────────────┐      ┌───────────────┐     ┌──────────────┐    │
│  │  aura-lab    │      │  aura-mitm    │     │  aura-lab-   │    │
│  │  (Kali)      │──────│  (mitmproxy)  │─────│  net         │    │
│  │  nmap nuclei │      │  8080 proxy   │     │  bridge      │    │
│  │  sqlmap ffuf │      │               │     │              │    │
│  └──────────────┘      └───────────────┘     └──────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✨ Capacités de la v6 Phantom

### Partie IA-Bridge (pour coder)
- **Explorateur de fichiers** intégré dans le chat IA avec recherche fuzzy, expand/collapse, multi-select.
- **Injection multi-fichiers** : cochez, cliquez, tout le code est collé dans le prompt en blocs Markdown.
- **Bouton « 💾 SAVE »** sur chaque bloc de code de la réponse IA → sauvegarde directe dans votre projet.
- **Raccourci** `Ctrl+Shift+I` pour ouvrir l'injecteur sur n'importe quelle page IA supportée.
- **Interface glassmorphism** sombre + FAB flottant.
- **Support** : claude.ai, chatgpt.com, arena.ai (et extensible).

### Partie Méta-Agent pentest (v6 Phantom)
- **ReAct loop** autonome avec budget tokens, scope enforcement, question utilisateur à la demande.
- **Orchestrator DAG** : planifie une suite d'étapes avec dépendances (`$n1.output` → `$n2.input`).
- **Chain builder** : construit des chaînes d'attaque réutilisables depuis les findings.
- **Model routing** : utilise le modèle *reasoning* (Opus/70B/GPT-4o) pour les décisions et le modèle *cheap* (Haiku/8B/mini) pour les classifications — économie de tokens.
- **Self-improving** : un critic debrief extrait les patterns réutilisables après chaque engagement.
- **RAG hybride** : BM25 + embeddings locaux (`ollama nomic-embed-text`) + RRF fusion pour retrouver les outputs passés.
- **Auto-rapport** Markdown + HTML (+ PDF optionnel via puppeteer) en fin d'engagement.

---

## 🧬 Les 15 modules Phantom

Tous vivent dans `server/autonomous/`. Chacun est chargé en mode **tolérant** (si un module manque, l'agent continue à fonctionner sans la feature).

| # | Module | Rôle | Endpoint(s) HTTP |
|---|--------|------|------------------|
| 1 | `cve-mapper.js` | Lookup CVE via **NVD** + **Vulners**, cache disque 24 h, enrichissement tech-fingerprint auto. | `/cve/lookup`, `/cve/enrich-tech` |
| 2 | `payloads.js` | Bibliothèque **bypass WAF** : 10 catégories vuln (XSS, SQLi, SSTI, SSRF, XXE, LFI, CMD, LDAP, Open-redirect, CRLF) × 4 WAF (Cloudflare, Akamai, AWS, ModSecurity). Polyglots inclus. | `/payloads/categories`, `/payloads/wafs/:vuln`, `/payloads/get`, `/payloads/render` |
| 3 | `session-manager.js` | Persiste cookies / tokens / headers **par cible**. Adapters `asCurl()`, `asHttpxHeaders()`, `asCookieHeader()` pour partager la session entre curl, sqlmap, nuclei, navigateur. | `/session/*` |
| 4 | `oob-collaborator.js` | Serveur callback HTTP (Interactsh-like) pour blind vulns (SQLi/XXE/SSRF/blind RCE). Mint d'URLs uniques `http://host:port/{token}`, écoute en polling ou event-stream. | `/oob/start`, `/oob/mint`, `/oob/wait/:token` |
| 5 | `wordlist-gen.js` | Extrait wordlists target-specific depuis mitm, bundles JS, ou Wayback CDX API. | `/wordlist/from-flows`, `/wordlist/from-js`, `/wordlist/from-wayback` |
| 6 | `js-secret-scanner.js` | 23 regex patterns : AWS, GitHub, Stripe, Slack, Google, Firebase, Twilio, JWT, PEM keys, URLs internes, etc. | `/js-secrets/scan-site`, `/js-secrets/scan-url` |
| 7 | `report-gen.js` | Rapport final **Markdown + HTML** (theme dark) + PDF optionnel (puppeteer) depuis knowledge + findings. | `/report/generate`, `/report/pdf` |
| 8 | `osint.js` | Recon passif : **crt.sh** (subdomaines), **Shodan**, **Censys**, **HIBP**, **VirusTotal**. Clés API via env. | `/osint/recon`, `/osint/crtsh`, `/osint/shodan/*`, `/osint/hibp`, `/osint/virustotal` |
| 9 | `privesc.js` | Scripts enum Linux/Windows + base **GTFOBins** (awk, bash, cp, curl, find, less, more, nano, nmap, perl, python*, ruby, sed, sh, tar, tcpdump, vi, vim, wget). | `/privesc/enum-script`, `/privesc/analyze`, `/privesc/gtfobins` |
| 10 | `rate-limiter.js` | Backoff adaptatif + détection WAF (Cloudflare / Akamai / AWS / Imperva / F5 / ModSecurity / Sucuri). Pool de 5 User-Agents modernes avec rotation. | `/ratelimit/record`, `/ratelimit/advice/:target`, `/ratelimit/rotate-ua/:target` |
| 11 | `bugbounty-api.js` | Lecture scope programmes **HackerOne / Bugcrowd / Intigriti**. Support wildcard `*.domain`. Cache disque. | `/bugbounty/program`, `/bugbounty/scope-check` |
| 12 | `screenshot-dvr.js` | DVR visuel timestampé + hash MD5 pour détecter les changements UI. Capture via extension Chrome ou puppeteer. | `/dvr/save`, `/dvr/capture`, `/dvr/diff`, `/dvr/latest/:target` |
| 13 | `fewshot-memory.js` | Stocke les **kill chains prouvées** et les indexe par tech fingerprint + ports + WAF (similarité Jaccard). Injecté dans le prompt planner comme *exemples few-shot*. | `/fewshot/record`, `/fewshot/search`, `/fewshot/rate/:id` |
| 14 | `replay-dvr.js` | Enregistre chaque invocation d'outil (args, exitCode, stdout, durée). Permet **replay** complet d'une session pour debug ou démo. | `/replay/list`, `/replay/:id`, `/replay/:id/rerun`, `/replay/stats` |
| 15 | `mcp-server.js` | **Pont MCP** (Model Context Protocol JSON-RPC 2024-11-05) — stdio et HTTP. Expose 10 outils à Claude Desktop / Cursor / tout client MCP. | `/mcp`, `/mcp/tools` + CLI `bin/keysosi-mcp.js` |

---

## 💻 Prérequis système

| Composant | Version minimum | Obligatoire | Raison |
|-----------|-----------------|-------------|--------|
| **Node.js** | 18.x | ✅ | Serveur Express, modules ES |
| **npm** | 9.x | ✅ | Installation dépendances |
| **Google Chrome** | 110+ | ✅ | Extension MV3 |
| **Docker Desktop** | 4.x + WSL2 | ⚠️ pour sandbox | Containers Kali + mitmproxy |
| **Git** | 2.30+ | ✅ | Clonage + subtree |
| **PowerShell 5.1** / Bash | — | ✅ | Scripts de build |
| **Ollama** (optionnel) | 0.1+ | ❌ | Embeddings RAG (`nomic-embed-text`) |
| **Puppeteer** (optionnel) | via npm | ❌ | Screenshots + PDF report |

### Systèmes d'exploitation supportés
- ✅ **Windows 11** (dev principal — PowerShell + WSL2)
- ✅ **Linux** (Debian/Ubuntu/Kali/Arch)
- ✅ **macOS** (Intel + Apple Silicon, Docker Desktop requis)

---

## 📥 Installation complète

### 1. Cloner le repo

```bash
git clone -b phantom-v6 https://github.com/Keiisis/KeysOsi-Link.git
cd KeysOsi-Link
```

### 2. Installer les dépendances serveur

```bash
cd server
npm install
```

Cela installe :
- `@anthropic-ai/sdk` (^0.90.0) — Claude API
- `@google/generative-ai` (^0.24.1) — Gemini
- `openai` (^6.34.0) — GPT-4o / 4-mini
- `groq-sdk` (^0.37.0) — LLaMA 3 rapide
- `express` (^4.19.2) + `cors` (^2.8.5) — serveur HTTP
- `ws` (^8.18.0) — WebSocket (sandbox live)
- `node-pty` (^1.0.0) — PTY pour terminal interactif

### 3. (Optionnel) Installer les containers sandbox

```bash
cd ../docker
# Windows
./build.bat
# Linux/macOS
./build.sh
```

Cela construit deux containers :
- `aura-lab` : Kali Linux avec nmap, nuclei, sqlmap, ffuf, gobuster, katana, subfinder, httpx, whatweb, wafw00f, dnsx, wpscan, metasploit-framework, john, hashcat.
- `aura-mitm` : mitmproxy exposé sur 8080 pour capture de trafic.

> 💡 Les noms de containers (`aura-lab`, `aura-mitm`, réseau `aura-lab-net`) et variables d'env (`AURA_*`) conservent le préfixe historique — aucun impact utilisateur.

### 4. Installer l'extension Chrome

1. Ouvrez `chrome://extensions/`
2. Activez **Mode développeur** (coin supérieur droit)
3. Cliquez **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `KeysOsi-Link/extension/`

L'icône ⚡ apparaît dans la barre d'outils Chrome.

---

## 🔑 Configuration des clés API

Les clés sont stockées dans `server/data/ai-config.json` (créé au premier démarrage via `/ai/config`). Alternativement vous pouvez les passer en variables d'environnement.

### Variables d'environnement supportées

```bash
# ── LLM providers (au moins un requis) ──
GROQ_API_KEY=gsk_...                    # https://console.groq.com
ANTHROPIC_API_KEY=sk-ant-...            # https://console.anthropic.com
OPENAI_API_KEY=sk-...                   # https://platform.openai.com
GOOGLE_API_KEY=AIza...                  # https://aistudio.google.com

# ── OSINT (optionnel, débloque modules dédiés) ──
SHODAN_API_KEY=...                      # https://account.shodan.io
CENSYS_API_ID=...
CENSYS_API_SECRET=...                   # https://search.censys.io/account/api
HIBP_API_KEY=...                        # https://haveibeenpwned.com/API/Key
VIRUSTOTAL_API_KEY=...                  # https://www.virustotal.com/gui/my-apikey
VULNERS_API_KEY=...                     # https://vulners.com/personal-api

# ── OOB collaborator ──
KEYSOSI_OOB_PORT=4444                   # Port callback HTTP
KEYSOSI_OOB_PUBLIC_HOST=oob.example.com # Nom d'hôte public (si expose via ngrok/cloudflare tunnel)

# ── Agent ──
AURA_TOKEN_BUDGET=500000                # Budget tokens par agent (hard stop)
KEYSOSI_ENGAGEMENT=default              # Engagement slug pour le CLI MCP
```

### Configurer via l'API (recommandé)

Le serveur expose `/ai/config` (GET/POST) pour gérer les clés depuis un dashboard futur. Exemple :

```bash
curl -X POST http://localhost:3666/ai/config \
  -H "Content-Type: application/json" \
  -d '{"active":"anthropic","anthropic":{"apiKey":"sk-ant-..."}}'
```

---

## 🚀 Démarrage du serveur

```bash
cd server
npm start
```

### Bannière de démarrage attendue

```
╔════════════════════════════════════════════════════════╗
║   ⚡ KEYSOSI-LINK v6.0 "PHANTOM" IS ONLINE ⚡         ║
╠════════════════════════════════════════════════════════╣
║  📡 Port: 3666                                        ║
║  🤖 Multi-provider AI: Groq / Claude / OpenAI / Gemini║
║  🎯 CVE · Payloads · Session · OOB · MCP              ║
║  🧬 Fewshot · Replay-DVR · Screenshot-DVR · OSINT     ║
║  🧪 Sandbox Lab: /sandbox/* + ws://.../sandbox/ws     ║
╚════════════════════════════════════════════════════════╝
```

### Vérifier que tout fonctionne

```bash
# Liste des outils MCP
curl http://localhost:3666/mcp/tools | jq

# Catégories de payloads
curl http://localhost:3666/payloads/categories | jq

# Payload XSS bypass Cloudflare
curl "http://localhost:3666/payloads/get?vuln=xss&waf=cloudflare&limit=3" | jq
```

---

## 🌐 Extension Chrome

Une fois le serveur lancé, allez sur une interface IA supportée.

### Ouvrir l'injecteur
- **Clic** : bouton flottant `⚡ INJECT` en bas à droite
- **Raccourci** : `Ctrl + Shift + I`

### Workflow typique

1. Naviguez dans l'arborescence (ou utilisez la barre de recherche fuzzy)
2. Cochez les fichiers à injecter
3. Cliquez **Inject Selected** → le contenu est collé dans le prompt, chaque fichier dans un bloc Markdown
4. Envoyez le prompt à l'IA
5. Quand l'IA répond avec du code, chaque bloc `code` a un bouton `💾 SAVE`
6. Cliquez → choisissez le chemin → sauvegardé dans votre projet

### Sites supportés
- `claude.ai` / `claude.com`
- `chatgpt.com`
- `arena.ai`
- Tout site dont vous configurez le domaine dans `extension/manifest.json`

---

## 🔌 Intégration MCP (Claude Desktop / Cursor)

KeysOsi-Link expose **10 outils** aux clients MCP via deux transports :

### Transport stdio (recommandé — Claude Desktop)

Fichier de configuration :
- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux** : `~/.config/Claude/claude_desktop_config.json`

Collez :

```json
{
  "mcpServers": {
    "keysosi-link": {
      "command": "node",
      "args": [
        "/chemin/absolu/vers/KeysOsi-Link/server/bin/keysosi-mcp.js"
      ],
      "env": {
        "KEYSOSI_ENGAGEMENT": "default"
      }
    }
  }
}
```

Redémarrez Claude Desktop → les 10 outils apparaissent dans l'icône 🔌.

### Transport HTTP (Cursor / curl / dev)

POST JSON-RPC vers `http://localhost:3666/mcp` :

```bash
curl -X POST http://localhost:3666/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Les 10 outils MCP

| Outil | Ce qu'il fait |
|-------|---------------|
| `recon_quick` | whatweb + httpx + headers + dnsx sur une cible |
| `cve_lookup` | Recherche CVE NVD + Vulners pour `product`/`version` |
| `payloads_get` | Payloads WAF-bypass par `vuln`/`waf` |
| `rag_search` | Recherche hybride BM25 + embeddings dans la mémoire |
| `chain_build` | Construit une chaîne d'attaque DAG depuis les findings |
| `osint_recon` | crt.sh + VT + Shodan + Censys sur une cible |
| `js_secrets_scan` | Scanner regex sur les bundles JS du site |
| `oob_mint` | Génère URL callback unique pour blind vulns |
| `report_generate` | Génère rapport Markdown+HTML depuis knowledge |
| `scope_check` | Vérifie scope bug bounty H1/Bugcrowd/Intigriti |

---

## 🤖 Utilisation de l'agent pentester

### Créer un engagement

```bash
curl -X POST http://localhost:3666/engagements \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "htb-monteverde",
    "name": "HTB Monteverde",
    "scope": ["10.10.10.172"],
    "platform": "hackthebox",
    "mode": "full"
  }'
```

### Lancer un agent

```bash
curl -X POST http://localhost:3666/agents \
  -H "Content-Type: application/json" \
  -d '{
    "target": "http://10.10.10.172",
    "engagementSlug": "htb-monteverde",
    "mode": "recon-only",
    "goal": "enumerer services et trouver user.txt",
    "orchestrated": true
  }'
```

### Suivre l'agent en temps réel

```bash
# SSE stream
curl -N http://localhost:3666/agents/1/stream
```

Vous verrez :
```
data: {"type":"start","snapshot":{...}}
data: {"type":"log","entry":{"msg":"📡 OOB collaborator pret pour blind vulns"}}
data: {"type":"log","entry":{"msg":"🛰️  OSINT : 12 sous-domaines · 3 sources ok"}}
data: {"type":"tool-start","tool":"whatweb","target":"http://10.10.10.172"}
data: {"type":"tool-end","exitCode":0,"outputPreview":"..."}
data: {"type":"log","entry":{"msg":"🛡️  CVE : 4 vulnerabilites mappees depuis tech fingerprint"}}
data: {"type":"finding","severity":"medium","title":"..."}
data: {"type":"end","reason":"done","steps":12}
```

### Répondre à une question de l'agent

```bash
curl -X POST http://localhost:3666/agents/1/answer \
  -H "Content-Type: application/json" \
  -d '{"questionId":"ab12cd34","value":"oui"}'
```

### Unlock exploit mode

```bash
curl -X POST http://localhost:3666/agents/1/unlock
```

---

## 🔧 Endpoints HTTP principaux

**Base URL** : `http://localhost:3666`

### Dev workflow (extension)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/explorer?path=...` | Liste fichiers/dossiers |
| POST | `/save` | Sauvegarde un fichier |
| POST | `/execute` | Exécute commande whitelistée |
| GET | `/read?path=...` | Lit un fichier |

### Agents & orchestration

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/agents` | Crée + démarre un agent |
| GET | `/agents` | Liste des agents |
| GET | `/agents/:id` | Snapshot d'un agent |
| GET | `/agents/:id/stream` | SSE live |
| POST | `/agents/:id/answer` | Répond à une question |
| POST | `/agents/:id/unlock` | Unlock exploit mode |
| POST | `/agents/:id/stop` | Arrête l'agent |

### Modules Phantom (60+ endpoints)

| Catégorie | Exemples |
|-----------|----------|
| **CVE** | `/cve/lookup?product=apache&version=2.4.49`, `/cve/enrich-tech` |
| **Payloads** | `/payloads/get?vuln=sqli&waf=cloudflare`, `/payloads/render` |
| **Session** | `/session/:target`, `/session/:target/curl`, `/session/:target/cookie` |
| **OOB** | `/oob/start`, `/oob/mint`, `/oob/wait/:token` |
| **OSINT** | `/osint/recon?target=example.com`, `/osint/crtsh`, `/osint/shodan/host/:ip` |
| **JS Secrets** | `/js-secrets/scan-site?url=https://...` |
| **Rapport** | `/report/generate`, `/report/pdf` |
| **Bug bounty** | `/bugbounty/program?platform=hackerone&handle=shopify` |
| **DVR** | `/dvr/capture`, `/dvr/list`, `/replay/list`, `/replay/:id` |
| **Fewshot** | `/fewshot/search`, `/fewshot/all` |
| **MCP** | `/mcp` (POST), `/mcp/tools` |

---

## 🧰 Catalogue d'outils sandbox

L'agent appelle `tools.run(name, target)` qui exécute dans le container Kali `aura-lab`.

| Outil | Usage | Intrusif | Exploit |
|-------|-------|----------|---------|
| `whatweb` | Fingerprint tech | ❌ | ❌ |
| `httpx` | Probe HTTP | ❌ | ❌ |
| `http_headers` | Headers inspection | ❌ | ❌ |
| `wafw00f` | Détection WAF | ❌ | ❌ |
| `dnsx` | Résolution DNS | ❌ | ❌ |
| `subfinder` | Énumération sous-domaines | ✅ | ❌ |
| `nmap` | Port scan | ✅ | ❌ |
| `nuclei` | Template-based vuln scanner | ✅ | ❌ |
| `katana` | Web crawler | ✅ | ❌ |
| `ffuf` / `gobuster` | Fuzzing URLs/params | ✅ | ❌ |
| `wpscan` | Scanner WordPress | ✅ | ❌ |
| `sqlmap` (recon) | Détection SQLi | ✅ | ❌ |
| `sqlmap` (exploit) | Dump DB / shell | ✅ | ✅ |
| `metasploit` | Exploitation | ✅ | ✅ |
| `hydra` | Brute-force | ✅ | ✅ |

> ⚠️ Les outils marqués `exploit` exigent un **double unlock** : mode `full` ou `exploit` + confirmation utilisateur.

---

## 🧠 Mémoire, RAG et fewshot

### Architecture à 3 couches

```
┌──────────────────────────────────────────────────────┐
│  1. Engagement-memory (JSON par slug)                │
│     hosts[host] = { tech, ports, endpoints,          │
│                     waf, cves, jsSecrets, osint, ... │
│                     _jsScanned: bool }               │
│     patterns = [ { rule, tags } ]                    │
│     decisions = [ { at, action, rationale } ]        │
└───────────────────┬──────────────────────────────────┘
                    │ auto-save après chaque tool
                    ▼
┌──────────────────────────────────────────────────────┐
│  2. RAG hybride (BM25 + embeddings)                  │
│     index = chunks des outputs d'outils + findings   │
│     embeddings = ollama nomic-embed-text (optionnel) │
│     fusion = Reciprocal Rank Fusion (RRF)            │
└───────────────────┬──────────────────────────────────┘
                    │ briefFor() injecté dans prompt
                    ▼
┌──────────────────────────────────────────────────────┐
│  3. Fewshot-memory (chaînes prouvées)                │
│     record = { tech, ports, waf, chain: { nodes } }  │
│     search = Jaccard(tech ∩ ports) + WAF bonus       │
│     asPromptExamples() → injecté comme few-shot      │
└──────────────────────────────────────────────────────┘
```

### Auto-ingestion dans l'agent ReAct

À chaque `_runTool` :
1. **Rate-limiter** pré-wait + record status code
2. **Replay-DVR** tape start → record stdout → tape end
3. **Session-manager** capture `Set-Cookie` automatiquement
4. Après `whatweb`/`httpx`/`nmap` → **CVE mapper** enrichit `hostMem.cves`
5. Après `katana`/`httpx` → **JS secrets scanner** ajoute `hostMem.jsSecrets`
6. Tous les outputs → **tools.ingest()** puis **memory.save()**

En fin d'engagement (`finally` block) :
7. **Reflection** debrief → patterns sauvés
8. **Report-gen** Markdown+HTML généré
9. Si finding high/critical avec evidence → **Fewshot-memory.record** la chaîne

---

## 🛡️ Sécurité & garde-fous scope

### Règles hard-coded dans l'agent

1. **Scope enforcement** : `_runTool` vérifie `engagements.isInScope(host)` avant chaque exécution. Bloc `SCOPE BLOCK` si hors scope, aucun appel n'est fait.
2. **Bug bounty scope check** : si l'engagement a `platform + handle`, l'API du programme (H1/Bugcrowd/Intigriti) est consultée et la cible est refusée si out-of-scope.
3. **Double-unlock exploit** : mode `full` ou `exploit` + confirmation utilisateur par outil.
4. **Budget tokens** : hard stop à `AURA_TOKEN_BUDGET` (défaut 500 k).
5. **MAX_STEPS** : 40 étapes ReAct max par agent.

### Ce que l'agent refuse catégoriquement
- DoS / flood / bruteforce sans mandat
- Actions destructives (`rm -rf`, `DROP TABLE`, `shutdown`)
- Supply-chain (publishing packages malveillants)
- Mass targeting (shotgun sur des IPs aléatoires)
- Evasion de détection à fins malveillantes

### Principes éthiques
KeysOsi-Link est un **outil de sécurité défensive et offensive autorisée**. Il est destiné à :
- ✅ CTF (HackTheBox, TryHackMe, Root-Me, PortSwigger Academy, etc.)
- ✅ Bug bounty avec scope écrit (programmes publics HackerOne / Bugcrowd / Intigriti)
- ✅ Pentests avec mandat signé (client, rules of engagement)
- ✅ Audit interne de votre propre infrastructure
- ✅ Recherche académique / formation

Il **n'est pas** destiné à :
- ❌ Attaquer des systèmes sans autorisation explicite écrite
- ❌ Contourner la loi locale ou les CGU d'un service
- ❌ Nuire à des personnes ou à des organisations

L'utilisateur est **seul responsable** de l'usage qu'il fait de l'outil.

---

## 🆘 Dépannage

### Le serveur ne démarre pas
```bash
cd server
node index.js 2>&1 | head -50
```
Causes fréquentes :
- Port 3666 déjà occupé → `lsof -i :3666` puis `kill`
- Aucune clé API configurée → éditez `data/ai-config.json` ou exportez `GROQ_API_KEY`
- `node_modules/` manquant → `npm install`

### L'extension ne se connecte pas
- Vérifiez que le serveur répond : `curl http://localhost:3666/`
- Console Chrome (F12 sur la page IA) → onglet Console → cherchez `[KeysOsi]`
- Désactivez les autres extensions (ad-blocker interfère parfois avec l'injection)

### MCP Claude Desktop ne voit pas les outils
- Chemin absolu correct dans `claude_desktop_config.json` ?
- Node.js dans le PATH ? → `where node` (Windows) / `which node` (Unix)
- Logs dans `%APPDATA%\Claude\logs\` → cherchez `keysosi-mcp`

### L'agent boucle sans progresser
- Vérifiez le budget tokens → `curl localhost:3666/agents/:id` → `tokens.total`
- Forcez un step manuel → `POST /agents/:id/step`
- Consultez la transcript → les 10 dernières actions

### Les containers Docker refusent de démarrer
```bash
docker ps -a | grep aura
docker logs aura-lab
```
Sur Windows : WSL2 doit être activé (`wsl --list --verbose` doit montrer Docker Desktop).

### Les CVEs ne s'enrichissent pas
- NVD a un rate-limit strict → configurer `NVD_API_KEY` (optionnel mais accélère)
- Vulners nécessite `VULNERS_API_KEY` pour >100 req/jour

---

## 🗺️ Feuille de route

### v6.1 (en cours)
- [ ] Dashboard Web React/Next pour piloter les agents
- [ ] Support **Claude Code SDK** comme provider natif
- [ ] Multi-agent parallel swarm (exploration concurrente)
- [ ] Export rapports → Notion / Markdown + PDF signé

### v6.2
- [ ] Playbooks communautaires (librairie de kill chains partagées)
- [ ] Intégration **BurpSuite** (import scope + findings)
- [ ] Agent Slack / Discord pour notifications

### v7.0
- [ ] Mode « red team » complet avec C2 léger (local-only)
- [ ] Auto-learning : fine-tune sur ses propres debriefs
- [ ] Support MCP resources + prompts (pas juste tools)

---

## 🤝 Contribuer

Les PR sont les bienvenues. Règles :
1. Code en anglais, commentaires en français accepté.
2. Pas de dépendance lourde sans justification (< 500 KB idéalement).
3. Chaque nouveau module doit être **tolérant au manque** (try/catch au chargement).
4. Tests manuels dans `server/data/tests/` avec `node -c` propre.
5. Documenter le module dans ce README (section « Les 15 modules »).

---

## 📜 Licence & avertissement

**Licence** : MIT — voir `LICENSE` (à venir si absent).

**Avertissement légal** : KeysOsi-Link est fourni *« as-is »*, sans garantie. L'utilisateur assume toute responsabilité pour son usage. Les auteurs et contributeurs ne sont pas responsables en cas d'utilisation malveillante ou non autorisée.

**Éthique** : un outil offensif ne remplace jamais un mandat écrit. *« The strongest defense is knowing how you'll be attacked. »*

---

## 👋 Contact

- **Auteur** : Keiisis
- **Repo** : <https://github.com/Keiisis/KeysOsi-Link>
- **Branche active** : `phantom-v6`
- **Issues** : <https://github.com/Keiisis/KeysOsi-Link/issues>

---

> Fait avec ⚡ par Keiisis · 2026
