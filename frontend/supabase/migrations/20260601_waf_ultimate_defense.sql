-- ══════════════════════════════════════════════════════════════
-- MIGRATION : WAF Ultime — Défense Active · Tables & Colonnes
-- À EXÉCUTER dans Supabase Dashboard > SQL Editor
-- Dépendances : 20260405_waf_memory_learning, 20260406_waf_autonomous
-- ══════════════════════════════════════════════════════════════

-- ── 1. Colonnes supplémentaires sur waf_ip_memory ─────────────
ALTER TABLE public.waf_ip_memory
    ADD COLUMN IF NOT EXISTS fingerprint_hashes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS tarpit_level       INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS deception_count    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_action        TEXT DEFAULT 'allow',
    ADD COLUMN IF NOT EXISTS ip_hopper          BOOLEAN DEFAULT false;

-- ── 2. Colonnes supplémentaires sur waf_logs ──────────────────
ALTER TABLE public.waf_logs
    ADD COLUMN IF NOT EXISTS action           TEXT DEFAULT 'block',
    ADD COLUMN IF NOT EXISTS response_delay_ms INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT DEFAULT '';

-- ── 3. Table : Device Fingerprints ────────────────────────────
-- Empreintes navigateur persistantes pour traquer les attaquants
-- même après changement d'IP (proxy, VPN, Tor)
CREATE TABLE IF NOT EXISTS public.waf_device_fingerprints (
    hash            TEXT PRIMARY KEY,
    components      JSONB NOT NULL DEFAULT '{}',
    -- Composants : ua_family, os, accept_lang, accept_enc,
    --   sec_ch_ua, sec_ch_platform, sec_ch_mobile, timezone_offset,
    --   screen_res, canvas_hash, webgl_vendor, fonts_hash
    associated_ips  TEXT[] DEFAULT '{}' NOT NULL,
    first_seen      TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_seen       TIMESTAMPTZ DEFAULT now() NOT NULL,
    trust_score     INTEGER DEFAULT 50 NOT NULL,
    total_requests  INTEGER DEFAULT 0 NOT NULL,
    blocked_count   INTEGER DEFAULT 0 NOT NULL,
    is_known_bad    BOOLEAN DEFAULT false NOT NULL,
    tags            TEXT[] DEFAULT '{}' NOT NULL,
    -- Tags possibles : 'ip_hopper', 'scanner', 'bot', 'tor_exit',
    --   'proxy', 'headless', 'automated'
    CONSTRAINT fp_trust_range CHECK (trust_score >= 0 AND trust_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_waf_fp_trust
    ON public.waf_device_fingerprints(trust_score)
    WHERE trust_score < 30;
CREATE INDEX IF NOT EXISTS idx_waf_fp_bad
    ON public.waf_device_fingerprints(is_known_bad)
    WHERE is_known_bad = true;
CREATE INDEX IF NOT EXISTS idx_waf_fp_last_seen
    ON public.waf_device_fingerprints(last_seen DESC);

-- ── 4. Table : Configuration Tarpitting ───────────────────────
-- Délais progressifs selon le niveau de menace
CREATE TABLE IF NOT EXISTS public.waf_tarpit_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trust_min       INTEGER NOT NULL,  -- trust score minimum (inclusive)
    trust_max       INTEGER NOT NULL,  -- trust score maximum (exclusive)
    delay_ms        INTEGER NOT NULL,  -- délai de réponse en millisecondes
    jitter_ms       INTEGER DEFAULT 0, -- variation aléatoire (+/-)
    description     TEXT NOT NULL DEFAULT '',
    enabled         BOOLEAN DEFAULT true NOT NULL,
    CONSTRAINT trust_order CHECK (trust_min < trust_max),
    CONSTRAINT delay_positive CHECK (delay_ms >= 0 AND delay_ms <= 30000)
);

-- Configuration par défaut : escalade progressive
INSERT INTO public.waf_tarpit_config (trust_min, trust_max, delay_ms, jitter_ms, description) VALUES
    (40, 50, 0,    0,    'Neutre — aucun délai'),
    (30, 40, 500,  200,  'Suspicion légère — 0.5s'),
    (20, 30, 2000, 500,  'Suspicion modérée — 2s'),
    (10, 20, 5000, 1000, 'Haute suspicion — 5s'),
    (0,  10, 8000, 2000, 'Danger critique — 8s (max Vercel)')
ON CONFLICT DO NOTHING;

-- ── 5. Table : Payloads de Déception ──────────────────────────
-- Bibliothèque de faux payloads par type d'attaque
-- L'attaquant reçoit une réponse crédible mais totalement fausse
CREATE TABLE IF NOT EXISTS public.waf_deception_payloads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attack_type     TEXT NOT NULL,       -- sql_injection, xss, lfi, rce, scanner, etc.
    payload_name    TEXT NOT NULL,        -- identifiant lisible
    status_code     INTEGER DEFAULT 200,  -- code HTTP de la réponse
    content_type    TEXT DEFAULT 'text/html',
    response_body   TEXT NOT NULL,        -- corps de la fausse réponse
    response_headers JSONB DEFAULT '{}',  -- headers additionnels
    description     TEXT DEFAULT '',
    rotation_weight INTEGER DEFAULT 1,    -- poids pour la rotation aléatoire
    enabled         BOOLEAN DEFAULT true NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waf_deception_type
    ON public.waf_deception_payloads(attack_type, enabled)
    WHERE enabled = true;

-- ── 6. Payloads de déception pré-chargés ──────────────────────

-- SQL Injection → Faux dump MySQL
INSERT INTO public.waf_deception_payloads (attack_type, payload_name, status_code, content_type, response_body, response_headers, description) VALUES
(
    'sql_injection',
    'fake_mysql_error',
    500,
    'text/html; charset=utf-8',
    E'<!DOCTYPE html>\n<html><head><title>Database Error</title></head><body>\n<h1>Database Error</h1>\n<p><b>MySQL Error 1045:</b> Access denied for user ''webapp_prod''@''10.0.3.42'' (using password: YES)</p>\n<p>Query: <code>SELECT * FROM users WHERE id = ''''</code></p>\n<p>Table: <code>prod_users_v2</code></p>\n<p>Server: <code>db-replica-03.internal.corp</code></p>\n<!-- Debug: MySQL 5.7.38-log, InnoDB engine, connection pool: 3/50 -->\n</body></html>',
    '{"X-Powered-By": "PHP/7.4.33", "Server": "Apache/2.4.41 (Ubuntu)", "X-DB-Host": "db-replica-03.internal.corp"}',
    'Faux message erreur MySQL avec infos serveur fictives — attire l''attaquant vers des cibles inexistantes'
),
(
    'sql_injection',
    'fake_table_dump',
    200,
    'text/html; charset=utf-8',
    E'<!DOCTYPE html>\n<html><body>\n<h2>Query Results</h2>\n<table border="1">\n<tr><th>id</th><th>username</th><th>email</th><th>password_hash</th><th>role</th></tr>\n<tr><td>1</td><td>admin_legacy</td><td>admin@old-system.local</td><td>$2b$10$xK9Zq.FAKE.HASH.NOT.REAL.JUST.HONEYPOT</td><td>admin</td></tr>\n<tr><td>2</td><td>dev_test</td><td>dev@test.internal</td><td>$2b$10$pQ8Yw.FAKE.HASH.DECOY.TRAP.LURE.BAIT</td><td>developer</td></tr>\n<tr><td>3</td><td>backup_svc</td><td>backup@automation.local</td><td>$2b$10$rM7Xv.FAKE.HASH.DEAD.END.NULL.VOID</td><td>service</td></tr>\n</table>\n<p><small>3 rows in set (0.023 sec) — prod_users_v2@db-replica-03</small></p>\n</body></html>',
    '{"X-Powered-By": "PHP/7.4.33", "Server": "Apache/2.4.41 (Ubuntu)"}',
    'Fausse table users avec hash bcrypt fictifs — l''attaquant perd du temps à cracker des hash inexistants'
),
-- XSS → Faux cookie de session
(
    'xss',
    'fake_session_cookie',
    200,
    'text/html; charset=utf-8',
    E'<!DOCTYPE html>\n<html><head><title>Dashboard</title></head><body>\n<script>\n// Session token refresh\ndocument.cookie = "PHPSESSID=fake_" + Math.random().toString(36).substr(2, 32) + "; path=/; HttpOnly";\ndocument.cookie = "csrf_token=decoy_" + Date.now().toString(36) + "; path=/";\ndocument.cookie = "user_role=admin; path=/";\n// API endpoint: /api/v1/internal/admin\nconsole.log("Session refreshed for user: admin_legacy");\n</script>\n<h1>Welcome back, Admin</h1>\n<p>Last login: 2 hours ago from 10.0.1.55</p>\n</body></html>',
    '{"Set-Cookie": "PHPSESSID=decoy_session_trap_not_real; path=/; HttpOnly", "X-Powered-By": "Express/4.18.2"}',
    'Faux cookie de session avec infos admin fictives — l''attaquant tente d''utiliser un token invalide'
),
-- LFI → Faux /etc/passwd
(
    'lfi',
    'fake_etc_passwd',
    200,
    'text/plain',
    E'root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\npostgres:x:109:117:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash\nwebapp:x:1001:1001:Web Application:/home/webapp:/bin/bash\nbackup:x:1002:1002:Backup Service:/var/backups:/usr/sbin/nologin\ndeploy:x:1003:1003:Deploy CI/CD:/opt/deploy:/bin/bash\nredis:x:110:120::/var/lib/redis:/usr/sbin/nologin\nmysql:x:111:121:MySQL Server,,,:/var/lib/mysql:/bin/false\njira_svc:x:1004:1004:Jira Service:/opt/jira:/usr/sbin/nologin',
    '{"Server": "nginx/1.18.0", "X-Served-By": "web-prod-02"}',
    'Faux fichier /etc/passwd avec comptes système fictifs — l''attaquant tente de bruteforcer des comptes inexistants'
),
-- Scanner → Faux serveur obsolète
(
    'scanner_detection',
    'fake_vulnerable_server',
    200,
    'text/html; charset=utf-8',
    E'<!DOCTYPE html>\n<html>\n<head><title>Apache2 Ubuntu Default Page: It works</title></head>\n<body>\n<h1>It works!</h1>\n<p>This is the default welcome page used to test the correct operation of the Apache2 server after installation on Ubuntu systems.</p>\n<p>Server: Apache/2.2.22 (Ubuntu)</p>\n<p>PHP Version: 5.4.45</p>\n<!-- phpinfo() available at /info.php -->\n<!-- Admin panel: /administrator/ -->\n<!-- Backup: /backup/db_dump_2024.sql.gz -->\n</body></html>',
    '{"Server": "Apache/2.2.22 (Ubuntu)", "X-Powered-By": "PHP/5.4.45", "X-Generator": "WordPress 4.1.1"}',
    'Fausse page Apache/PHP obsolète avec commentaires HTML alléchants — le scanner pense avoir trouvé un serveur vulnérable'
),
-- RCE → Faux output shell
(
    'rce',
    'fake_shell_output',
    200,
    'text/plain',
    E'bash: /usr/bin/id: Permission denied\nwww-data@web-prod-02:/var/www/html$ whoami\nwww-data\nwww-data@web-prod-02:/var/www/html$ cat /etc/hostname\nweb-prod-02\nwww-data@web-prod-02:/var/www/html$ uname -a\nLinux web-prod-02 4.15.0-213-generic #224-Ubuntu SMP Mon Jun 19 13:30:12 UTC 2023 x86_64\nwww-data@web-prod-02:/var/www/html$ ls -la /home/\ntotal 16\ndrwxr-xr-x  4 root   root   4096 Jan 15 08:30 .\ndrwxr-xr-x 23 root   root   4096 Jan 15 08:25 ..\ndrwxr-xr-x  5 webapp webapp 4096 Mar 22 14:10 webapp\ndrwxr-xr-x  3 deploy deploy 4096 Feb 28 09:45 deploy\nwww-data@web-prod-02:/var/www/html$ sudo -l\n[sudo] password for www-data: \nSorry, user www-data may not run sudo on web-prod-02.',
    '{"Server": "nginx/1.18.0"}',
    'Faux output shell avec hostname et users fictifs — l''attaquant pense avoir un accès shell limité'
),
-- Honeypot → Faux login WordPress
(
    'honeypot',
    'fake_wp_login',
    200,
    'text/html; charset=utf-8',
    E'<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" lang="en-US">\n<head>\n<title>Log In &lsaquo; Corporate Blog &#8212; WordPress</title>\n<meta name="robots" content="noindex,nofollow" />\n<style>body{background:#f1f1f1;font-family:-apple-system,sans-serif}.login{width:320px;margin:0 auto;padding:8% 0 0}#login h1 a{background:url(/wp-admin/images/wordpress-logo.svg) no-repeat center;width:84px;height:84px;display:block;margin:0 auto 25px}form{background:#fff;border:1px solid #c3c4c7;padding:26px 24px;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.04)}input[type=text],input[type=password]{width:100%;padding:6px 10px;margin:4px 0 16px;border:1px solid #8c8f94;border-radius:4px;font-size:24px}input[type=submit]{background:#2271b1;border:1px solid #2271b1;color:#fff;padding:6px 30px;border-radius:4px;font-size:13px;cursor:pointer}input[type=submit]:hover{background:#135e96}.forgetmenot{float:left;margin:8px 0}</style>\n</head>\n<body class="login">\n<div id="login">\n<h1><a href="https://wordpress.org/" title="Powered by WordPress"></a></h1>\n<form method="post" action="/wp-login.php">\n<p><label for="user_login">Username or Email Address</label>\n<input type="text" name="log" id="user_login" size="20" autocapitalize="off" /></p>\n<p><label for="user_pass">Password</label>\n<input type="password" name="pwd" id="user_pass" size="20" /></p>\n<p class="forgetmenot"><input name="rememberme" type="checkbox" id="rememberme" value="forever" /> <label for="rememberme">Remember Me</label></p>\n<p><input type="submit" name="wp-submit" value="Log In" /></p>\n<input type="hidden" name="redirect_to" value="/wp-admin/" />\n</form>\n<p><a href="/wp-login.php?action=lostpassword">Lost your password?</a></p>\n</div>\n<!-- WP 6.4.2 | Theme: flavor-developer | MySQL: db-master-01 -->\n</body></html>',
    '{"Server": "Apache/2.4.57", "X-Powered-By": "PHP/8.1.27", "X-Pingback": "/xmlrpc.php"}',
    'Faux formulaire de login WordPress — capture les credentials tentés par l''attaquant'
);

-- ── 7. Table : Interactions Honeypot ──────────────────────────
-- Journal détaillé des interactions avec les honeypots
CREATE TABLE IF NOT EXISTS public.waf_honeypot_interactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip               TEXT NOT NULL,
    fingerprint_hash TEXT DEFAULT '',
    path             TEXT NOT NULL,
    method           TEXT DEFAULT 'GET',
    payload_used     TEXT DEFAULT '',      -- quel payload de déception a été envoyé
    request_headers  JSONB DEFAULT '{}',   -- headers de la requête attaquante
    request_body     TEXT DEFAULT '',       -- body soumis (ex: credentials sur faux wp-login)
    duration_ms      INTEGER DEFAULT 0,    -- temps passé par l'attaquant
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_waf_hp_ip ON public.waf_honeypot_interactions(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waf_hp_date ON public.waf_honeypot_interactions(created_at DESC);

-- ── 8. RLS pour les nouvelles tables ──────────────────────────
ALTER TABLE public.waf_device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waf_tarpit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waf_deception_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waf_honeypot_interactions ENABLE ROW LEVEL SECURITY;

-- Admin + CEO read/write
CREATE POLICY "admin_waf_fingerprints" ON public.waf_device_fingerprints
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'superadmin', 'ceo')
    ));

CREATE POLICY "admin_waf_tarpit" ON public.waf_tarpit_config
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'superadmin', 'ceo')
    ));

CREATE POLICY "admin_waf_deception" ON public.waf_deception_payloads
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'superadmin', 'ceo')
    ));

CREATE POLICY "admin_waf_honeypot_int" ON public.waf_honeypot_interactions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin', 'superadmin', 'ceo')
    ));

-- Service role full access
CREATE POLICY "service_waf_fingerprints" ON public.waf_device_fingerprints
    FOR ALL TO service_role USING (true);
CREATE POLICY "service_waf_tarpit" ON public.waf_tarpit_config
    FOR ALL TO service_role USING (true);
CREATE POLICY "service_waf_deception" ON public.waf_deception_payloads
    FOR ALL TO service_role USING (true);
CREATE POLICY "service_waf_honeypot_int" ON public.waf_honeypot_interactions
    FOR ALL TO service_role USING (true);

-- ── 9. Index performance supplémentaires ──────────────────────
CREATE INDEX IF NOT EXISTS idx_waf_logs_action
    ON public.waf_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waf_logs_fingerprint
    ON public.waf_logs(fingerprint_hash)
    WHERE fingerprint_hash != '';
CREATE INDEX IF NOT EXISTS idx_waf_ip_memory_hopper
    ON public.waf_ip_memory(ip_hopper)
    WHERE ip_hopper = true;

-- ── 10. Vérification ─────────────────────────────────────────
SELECT 'waf_device_fingerprints' AS table_name, count(*) AS rows FROM public.waf_device_fingerprints
UNION ALL SELECT 'waf_tarpit_config', count(*) FROM public.waf_tarpit_config
UNION ALL SELECT 'waf_deception_payloads', count(*) FROM public.waf_deception_payloads
UNION ALL SELECT 'waf_honeypot_interactions', count(*) FROM public.waf_honeypot_interactions;

SELECT 'Migration 20260601_waf_ultimate_defense : OK' AS status;
