const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 3666;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Racine du projet (2 niveaux au-dessus de tools/aura-link/server)
const PROJECT_ROOT = path.resolve(__dirname, '../../../');

// ────────────────────────────────────────────
// Commandes whitelistées pour /exec
// ────────────────────────────────────────────
const WHITELISTED_COMMANDS = ['npm', 'npx', 'git', 'ls', 'cat', 'pwd', 'echo', 'node', 'tsc'];

// ────────────────────────────────────────────
// Dossiers/fichiers ignorés pour /tree
// ────────────────────────────────────────────
const IGNORED_DIRS = new Set([
    'node_modules', '.git', '.next', '.turbo', '.vercel',
    '.cache', '.husky', 'dist', 'build', '.output',
    '__pycache__', '.svn', 'coverage', '.nyc_output',
    '.parcel-cache', '.DS_Store'
]);

const IGNORED_FILES = new Set([
    '.DS_Store', 'Thumbs.db', '.env', '.env.local',
    '.env.production', '.env.development',
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'
]);

// ────────────────────────────────────────────
// Bannière de démarrage
// ────────────────────────────────────────────
function printBanner() {
    console.log('');
    console.log('  ╔══════════════════════════════════════════════╗');
    console.log('  ║                                              ║');
    console.log('  ║   ⚡  AURA LINK — Ultimate AI Bridge  ⚡    ║');
    console.log('  ║                                              ║');
    console.log('  ╠══════════════════════════════════════════════╣');
    console.log(`  ║  🔌  Port     : ${PORT}                          ║`);
    console.log(`  ║  📂  Projet   : ${PROJECT_ROOT.length > 28 ? '...' + PROJECT_ROOT.slice(-25) : PROJECT_ROOT.padEnd(28)}║`);
    console.log('  ║  🛡️   Sécurité : Whitelist active             ║');
    console.log('  ║                                              ║');
    console.log('  ║  Endpoints :                                 ║');
    console.log('  ║    POST /read   — Lire un fichier            ║');
    console.log('  ║    POST /write  — Écrire un fichier          ║');
    console.log('  ║    GET  /tree   — Arborescence complète      ║');
    console.log('  ║    POST /exec   — Exécuter une commande      ║');
    console.log('  ║                                              ║');
    console.log('  ╚══════════════════════════════════════════════╝');
    console.log('');
}

// ════════════════════════════════════════════
// 1. LIRE UN FICHIER
// ════════════════════════════════════════════
app.post('/read', async (req, res) => {
    try {
        const { filePath } = req.body;
        if (!filePath) {
            return res.status(400).json({ success: false, error: 'filePath requis' });
        }

        // Sécurité : empêcher la traversée de répertoire
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
            return res.status(403).json({ success: false, error: 'Chemin interdit (traversée de répertoire)' });
        }

        const fullPath = path.join(PROJECT_ROOT, normalizedPath);
        const content = await fs.readFile(fullPath, 'utf-8');

        // Métadonnées du fichier
        const stats = await fs.stat(fullPath);
        const ext = path.extname(filePath).slice(1);
        const lines = content.split('\n').length;

        res.json({
            success: true,
            content,
            meta: {
                path: filePath,
                extension: ext,
                lines,
                size: stats.size,
                modified: stats.mtime.toISOString()
            }
        });
        console.log(`  📖  Lu : ${filePath} (${lines} lignes, ${(stats.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  Erreur lecture : ${e.message}`);
    }
});

// ════════════════════════════════════════════
// 2. ÉCRIRE UN FICHIER
// ════════════════════════════════════════════
app.post('/write', async (req, res) => {
    try {
        const { filePath, content } = req.body;
        if (!filePath || content === undefined) {
            return res.status(400).json({ success: false, error: 'filePath et content requis' });
        }

        // Sécurité : empêcher la traversée de répertoire
        const normalizedPath = path.normalize(filePath);
        if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
            return res.status(403).json({ success: false, error: 'Chemin interdit (traversée de répertoire)' });
        }

        const fullPath = path.join(PROJECT_ROOT, normalizedPath);

        // Vérifier si le fichier existe déjà (pour le log)
        let isNew = true;
        try {
            await fs.access(fullPath);
            isNew = false;
        } catch { }

        // Créer les dossiers parents si nécessaire
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        await fs.writeFile(fullPath, content, 'utf-8');
        const lines = content.split('\n').length;

        res.json({
            success: true,
            meta: {
                path: filePath,
                lines,
                size: Buffer.byteLength(content, 'utf-8'),
                action: isNew ? 'created' : 'updated'
            }
        });
        console.log(`  ✍️  ${isNew ? 'Créé' : 'Modifié'} : ${filePath} (${lines} lignes)`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  Erreur écriture : ${e.message}`);
    }
});

// ════════════════════════════════════════════
// 3. ARBORESCENCE RÉCURSIVE — /tree
// ════════════════════════════════════════════
async function scanDirectory(dirPath, relativePath = '', depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return [];

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    // Trier : dossiers d'abord, puis fichiers, alphabétiquement
    const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
        const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            // Ignorer les dossiers blacklistés
            if (IGNORED_DIRS.has(entry.name)) continue;

            const children = await scanDirectory(
                path.join(dirPath, entry.name),
                entryRelPath,
                depth + 1,
                maxDepth
            );

            result.push({
                name: entry.name,
                path: entryRelPath,
                type: 'directory',
                children
            });
        } else {
            // Ignorer les fichiers blacklistés
            if (IGNORED_FILES.has(entry.name)) continue;

            const ext = path.extname(entry.name).slice(1);
            let size = 0;
            try {
                const stats = await fs.stat(path.join(dirPath, entry.name));
                size = stats.size;
            } catch { }

            result.push({
                name: entry.name,
                path: entryRelPath,
                type: 'file',
                extension: ext,
                size
            });
        }
    }
    return result;
}

app.get('/tree', async (req, res) => {
    try {
        const maxDepth = parseInt(req.query.depth) || 8;
        const subPath = req.query.path || '';

        // Sécurité
        const normalizedSub = path.normalize(subPath);
        if (normalizedSub.startsWith('..') || path.isAbsolute(normalizedSub)) {
            return res.status(403).json({ success: false, error: 'Chemin interdit' });
        }

        const targetDir = subPath
            ? path.join(PROJECT_ROOT, normalizedSub)
            : PROJECT_ROOT;

        const tree = await scanDirectory(targetDir, subPath, 0, maxDepth);

        // Compter les stats
        function countEntries(nodes) {
            let files = 0, dirs = 0;
            for (const n of nodes) {
                if (n.type === 'directory') {
                    dirs++;
                    const sub = countEntries(n.children);
                    files += sub.files;
                    dirs += sub.dirs;
                } else {
                    files++;
                }
            }
            return { files, dirs };
        }
        const stats = countEntries(tree);

        res.json({
            success: true,
            root: PROJECT_ROOT,
            stats: {
                totalFiles: stats.files,
                totalDirectories: stats.dirs,
                maxDepth
            },
            tree
        });
        console.log(`  🌳  Arborescence scannée : ${stats.files} fichiers, ${stats.dirs} dossiers`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  Erreur tree : ${e.message}`);
    }
});

// ════════════════════════════════════════════
// 4. EXÉCUTER UNE COMMANDE — /exec (whitelistée)
// ════════════════════════════════════════════
app.post('/exec', async (req, res) => {
    try {
        const { command } = req.body;
        if (!command || typeof command !== 'string') {
            return res.status(400).json({ success: false, error: 'command (string) requis' });
        }

        // Extraire le binaire principal
        const parts = command.trim().split(/\s+/);
        const binary = parts[0];

        // Vérifier la whitelist
        if (!WHITELISTED_COMMANDS.includes(binary)) {
            return res.status(403).json({
                success: false,
                error: `Commande "${binary}" non autorisée. Whitelist : ${WHITELISTED_COMMANDS.join(', ')}`
            });
        }

        // Bloquer les chaînes dangereuses
        const dangerousPatterns = ['&&', '||', ';', '|', '`', '$(', 'rm -rf', 'sudo', '>', '>>'];
        for (const pattern of dangerousPatterns) {
            if (command.includes(pattern)) {
                return res.status(403).json({
                    success: false,
                    error: `Pattern dangereux détecté : "${pattern}"`
                });
            }
        }

        console.log(`  🚀  Exécution : ${command}`);

        // Exécuter avec timeout de 30 secondes
        exec(command, {
            cwd: PROJECT_ROOT,
            timeout: 30000,
            maxBuffer: 1024 * 1024 * 5 // 5MB max
        }, (error, stdout, stderr) => {
            const output = {
                success: !error,
                command,
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: error ? error.code || 1 : 0
            };

            if (error) {
                console.log(`  ⚠️  Commande terminée avec erreur (code ${output.exitCode})`);
            } else {
                console.log(`  ✅  Commande terminée avec succès`);
            }
            res.json(output);
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
        console.log(`  ❌  Erreur exec : ${e.message}`);
    }
});

// ════════════════════════════════════════════
// 5. LECTURE MULTIPLE — /read-multiple
// ════════════════════════════════════════════
app.post('/read-multiple', async (req, res) => {
    try {
        const { filePaths } = req.body;
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
            return res.status(400).json({ success: false, error: 'filePaths (array) requis' });
        }

        // Limiter à 20 fichiers max
        if (filePaths.length > 20) {
            return res.status(400).json({ success: false, error: 'Maximum 20 fichiers simultanés' });
        }

        const results = await Promise.allSettled(
            filePaths.map(async (filePath) => {
                const normalizedPath = path.normalize(filePath);
                if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
                    throw new Error(`Chemin interdit : ${filePath}`);
                }
                const fullPath = path.join(PROJECT_ROOT, normalizedPath);
                const content = await fs.readFile(fullPath, 'utf-8');
                const stats = await fs.stat(fullPath);
                const ext = path.extname(filePath).slice(1);

                return {
                    path: filePath,
                    content,
                    extension: ext,
                    lines: content.split('\n').length,
                    size: stats.size
                };
            })
        );

        const files = results.map((result, i) => {
            if (result.status === 'fulfilled') {
                return { success: true, ...result.value };
            }
            return { success: false, path: filePaths[i], error: result.reason?.message };
        });

        const successCount = files.filter(f => f.success).length;

        res.json({
            success: true,
            totalRequested: filePaths.length,
            totalRead: successCount,
            totalFailed: filePaths.length - successCount,
            files
        });
        console.log(`  📚  Lecture multiple : ${successCount}/${filePaths.length} fichiers lus`);
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ════════════════════════════════════════════
// 6. HEALTH CHECK — /status
// ════════════════════════════════════════════
app.get('/status', (req, res) => {
    res.json({
        success: true,
        service: 'Aura Link — Ultimate AI Bridge',
        version: '2.0.0',
        port: PORT,
        projectRoot: PROJECT_ROOT,
        uptime: Math.floor(process.uptime()),
        whitelistedCommands: WHITELISTED_COMMANDS
    });
});

// ════════════════════════════════════════════
// DÉMARRAGE
// ════════════════════════════════════════════
app.listen(PORT, () => {
    printBanner();
});
