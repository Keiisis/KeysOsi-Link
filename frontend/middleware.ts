import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
    extractIp,
    checkRateLimit,
    getRateLimitCategory,
    analyzeRequestFast,
    checkGeoBlock,
    getCachedIpBlock,
    setCachedIpBlock,
    logWafEvent,
    trackViolation,
    setWafConfig,
    getWafConfig,
    setCustomRulesCache,
    getCustomRulesCache,
    checkIpTrustScore,
    checkSubnetBanned,
    isHoneypotPath,
    updateIpMemory,
    createAlert,
    // ── Nouveaux modules Défense Active ──
    extractFingerprint,
    registerFingerprint,
    detectHeadlessBrowser,
    evaluateRequestRPC,
    getDeceptionPayload,
    buildDeceptionResponse,
    refreshDeceptionPayloads,
    logDeceptionInteraction,
    applyTarpit,
    type ThreatType,
} from '@/lib/waf'

// ═══════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE — WAF ULTIME · Défense Active · Cyber-Déception
// ═══════════════════════════════════════════════════════════════
//
// ARCHITECTURE DE SÉCURITÉ (ordre strict) :
//
//  0. WAF_EMERGENCY_BYPASS → passe auth uniquement, WAF désactivé
//  1. Chemins login/reset/2fa → accès immédiat, zéro check
//  2. Fingerprint extraction (headers HTTP → hash stable)
//  3. Honeypot → faux payload WordPress/PHP crédible (déception)
//  4. WAF SENTINEL RPC → waf_evaluate_request() retourne:
//     - 'allow'   → continuer normalement
//     - 'tarpit'  → appliquer un délai, puis continuer
//     - 'deceive' → retourner un faux payload crédible (200 OK)
//     - 'block'   → retourner 403
//     - 'honeypot'→ retourner un faux formulaire WordPress
//  5. FALLBACK CRS JS (si RPC échoue) :
//     - IP bloquée / Trust score → 403
//     - Géo-blocage → 403
//     - Rate Limiting → 429
//     - WAF CRS OWASP → scan regex (non-panel uniquement)
//  6. Auth Supabase + rôles (inchangé)
//
// PANELS INTERNES : /admin/*, /agent/*, /client/*
//   → Jamais bloqués par WAF CRS (URL générée par l'app)
//   → Protégés par l'auth Supabase (étape 6)
//
// FAIL-OPEN : Si Supabase est injoignable, toutes les requêtes
//   passent (l'auth protège les panels, le site public est ouvert)
// ═══════════════════════════════════════════════════════════════

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// ── Chemins qui bypass ABSOLUMENT tout (même IP bloquée) ──────
const ABSOLUTE_BYPASS = [
    '/admin/login',
    '/admin/reset-password',
    '/admin/2fa',
    '/agent/login',
    '/agent/reset-password',
    '/client/login',
    '/client/register',
    '/client/reset-password',
    '/client/forgot-password',
    '/ceo/login',
    '/ceo/reset-password',
]

function isAbsoluteBypass(pathname: string): boolean {
    return ABSOLUTE_BYPASS.some(p => pathname === p || pathname.startsWith(p + '?'))
}

// ── Charger config WAF + règles custom depuis Supabase ────────
async function refreshWafConfig(): Promise<void> {
    const { stale } = getCustomRulesCache()
    if (!stale || !SUPA_URL || !SUPA_KEY) return

    try {
        const [configRes, rulesRes] = await Promise.all([
            fetch(`${SUPA_URL}/rest/v1/waf_config?select=key,value`, {
                headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
            }),
            fetch(`${SUPA_URL}/rest/v1/waf_rules?enabled=eq.true&select=*`, {
                headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
            }),
        ])

        if (configRes.ok) {
            const rows = await configRes.json() as Array<{ key: string; value: string }>
            if (Array.isArray(rows)) {
                const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
                setWafConfig({
                    paranoiaLevel:    parseInt(map['paranoia_level'] || '1') || 1,
                    blockedCountries: map['blocked_countries'] ? JSON.parse(map['blocked_countries']) : [],
                    whitelistedIps:   map['whitelisted_ips']   ? JSON.parse(map['whitelisted_ips'])   : [],
                    whitelistedPaths: map['whitelisted_paths'] ? JSON.parse(map['whitelisted_paths']) : [],
                    enabled:          map['enabled'] !== 'false',
                })
            }
        }

        if (rulesRes.ok) {
            const rules = await rulesRes.json()
            if (Array.isArray(rules)) setCustomRulesCache(rules)
        }
    } catch { /* silencieux */ }
}

// ── Vérifier blocage IP ───────────────────────────────────────
async function isIpBlocked(ip: string): Promise<boolean> {
    const cached = getCachedIpBlock(ip)
    if (cached !== null) return cached
    if (!SUPA_URL || !SUPA_KEY) return false
    try {
        const res = await fetch(
            `${SUPA_URL}/rest/v1/ip_blocks?ip=eq.${encodeURIComponent(ip)}&unblocked_at=is.null&select=ip&limit=1`,
            { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
        )
        const rows = await res.json() as Array<unknown>
        const blocked = Array.isArray(rows) && rows.length > 0
        setCachedIpBlock(ip, blocked)
        return blocked
    } catch { return false }
}

function wafBlock(reason: string, status = 403): NextResponse {
    return new NextResponse(JSON.stringify({ error: reason }), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

// ══════════════════════════════════════════════════════════════
export async function middleware(request: NextRequest) {
    const response = NextResponse.next({ request: { headers: request.headers } })

    // ─── Security Headers (toujours appliqués) ───────────────
    const secHeaders: Record<string, string> = {
        'X-Content-Type-Options':    'nosniff',
        'X-Frame-Options':           'SAMEORIGIN',
        'X-XSS-Protection':          '1; mode=block',
        'Referrer-Policy':           'strict-origin-when-cross-origin',
        'Permissions-Policy':        'camera=(), microphone=(self), geolocation=()',
    }
    Object.entries(secHeaders).forEach(([k, v]) => response.headers.set(k, v))

    const pathname  = request.nextUrl.pathname
    const ip        = extractIp(request.headers)
    const userAgent = request.headers.get('user-agent') || ''
    const method    = request.method

    // ─── 0. WAF EMERGENCY BYPASS ─────────────────────────────
    // Définir WAF_EMERGENCY_BYPASS=true dans Vercel → désactive tout le WAF
    // L'auth Supabase reste active pour protéger les données
    const emergencyBypass = process.env.WAF_EMERGENCY_BYPASS === 'true'

    // ─── Refresh config WAF (AWAIT pour garantir que la whitelist est chargée) ─
    if (!emergencyBypass) {
        await refreshWafConfig().catch(() => {})
    }

    // ─── Vérifier si l'IP est dans la liste blanche ──────────
    // Les IPs whitelistées sont exemptées des contrôles de BLOCAGE :
    //   - IP bloquée, trust score, rate limiting, géo-blocage
    // Mais RESTENT soumises aux contrôles de DÉTECTION :
    //   - Honeypot (accès à des chemins malveillants = toujours suspect)
    //   - WAF CRS (détection d'attaques dans les requêtes)
    const wafConfig = getWafConfig()
    const isIpWhitelisted = !emergencyBypass && wafConfig.whitelistedIps && wafConfig.whitelistedIps.includes(ip)

    // ── Définir si on est sur un panel interne ────────────────
    const isInternalPanelPath = (
        pathname.startsWith('/admin') ||
        pathname.startsWith('/agent') ||
        pathname.startsWith('/client') ||
        pathname.startsWith('/ceo') ||
        pathname.startsWith('/api/admin') ||
        pathname.startsWith('/api/agent') ||
        pathname.startsWith('/api/client') ||
        pathname.startsWith('/api/ceo')
    )

    // ─── 2. FINGERPRINT EXTRACTION ─────────────────────────────
    // Extraire l'empreinte navigateur depuis les headers HTTP
    // Utilisé pour traquer les attaquants même après changement d'IP
    let fingerprintHash = ''
    if (!emergencyBypass && ip !== 'unknown') {
        try {
            const fp = extractFingerprint(request.headers)
            fingerprintHash = fp.hash

            // Enregistrer le fingerprint en arrière-plan (fire-and-forget)
            if (SUPA_URL && SUPA_KEY) {
                registerFingerprint({
                    ip, hash: fp.hash, components: fp.components,
                    supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                })
            }

            // Détection heuristique de navigateurs headless (bots)
            const headless = detectHeadlessBrowser(request.headers)
            if (headless.isHeadless && !isInternalPanelPath) {
                if (SUPA_URL && SUPA_KEY) {
                    createAlert({
                        level: 'info',
                        message: `🤖 Navigateur headless détecté: IP ${ip} — ${headless.indicators.join(', ')}`,
                        context: { ip, indicators: headless.indicators, fingerprint: fp.hash },
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                }
            }
        } catch { /* fingerprint extraction non-critique */ }
    }

    // ─── 3. HONEYPOT — Déception active sur chemins pièges ───
    // Au lieu de retourner un simple 404, on retourne un faux
    // formulaire WordPress/PHP crédible pour piéger l'attaquant
    if (!emergencyBypass && isHoneypotPath(pathname)) {
        if (SUPA_URL && SUPA_KEY) {
            // Ban immédiat + log
            setCachedIpBlock(ip, true)
            updateIpMemory({ ip, isAttack: true, attackType: 'honeypot', supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY })
            createAlert({
                level: 'critical',
                message: `🍯 HONEYPOT : IP ${ip} a tenté d'accéder à ${pathname} — déception activée`,
                context: { ip, path: pathname, fingerprint: fingerprintHash },
                supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
            })
            logWafEvent({
                ip, method, path: pathname, userAgent,
                threatType: 'honeypot',
                detail: `Accès au leurre honeypot : ${pathname}`,
                supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
            })
            logDeceptionInteraction({
                ip, path: pathname, method,
                attackType: 'honeypot', payloadName: 'fake_wp_login',
                fingerprintHash,
                supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
            })

            // Auto-block IP dans ip_blocks
            fetch(`${SUPA_URL}/rest/v1/ip_blocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
                    Prefer: 'resolution=merge-duplicates,return=minimal',
                },
                body: JSON.stringify({
                    ip, reason: `Honeypot déclenché : ${pathname}`,
                    blocked_by: 'auto', violation_count: 5,
                }),
            }).catch(() => {})
        }

        // Retourner un faux payload WordPress crédible
        const honeypotPayload = getDeceptionPayload('honeypot')
        return buildDeceptionResponse(honeypotPayload)
    }

    // ─── 4. WAF SENTINEL RPC — Cerveau décisionnel SQL ───────
    // Appelle waf_evaluate_request() qui retourne l'action optimale
    // basée sur trust score IP + fingerprint + historique
    let rpcHandled = false
    if (!emergencyBypass && !isIpWhitelisted && !isInternalPanelPath && SUPA_URL && SUPA_KEY && ip !== 'unknown') {
        // Refresh le cache des payloads de déception (fire-and-forget)
        refreshDeceptionPayloads(SUPA_URL, SUPA_KEY).catch(() => {})

        const evalResult = await evaluateRequestRPC({
            ip, path: pathname, fingerprintHash, userAgent,
            supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
        })

        if (evalResult) {
            rpcHandled = true

            switch (evalResult.action) {
                case 'block': {
                    logWafEvent({
                        ip, method, path: pathname, userAgent,
                        threatType: 'blocked_ip',
                        detail: `WAF Sentinel: ${evalResult.reason} (trust=${evalResult.trust_score})`,
                        fingerprintHash,
                        action: 'block',
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                    return wafBlock('Accès refusé.', 403)
                }

                case 'deceive': {
                    // ── CORRECTION 3 : Déception contextuelle ──────────
                    // On lance le CRS pour identifier le TYPE d'attaque exact
                    // puis on choisit le payload de déception correspondant
                    // SQLi → faux MySQL, XSS → faux cookie, LFI → faux passwd
                    const searchParams = request.nextUrl.searchParams.toString()
                    const deceiveVerdict = analyzeRequestFast(method, pathname, searchParams, userAgent)
                    const detectedType = deceiveVerdict.topThreat || 'scanner_detection'

                    // Mapper le type CRS vers le type de déception
                    type DeceptionType = 'sql_injection' | 'xss' | 'lfi' | 'rce' | 'scanner_detection' | 'honeypot'
                    const typeMap: Record<string, DeceptionType> = {
                        sql_injection: 'sql_injection',
                        xss: 'xss',
                        lfi: 'lfi',
                        rce: 'rce',
                        command_injection: 'rce',
                        scanner_detection: 'scanner_detection',
                        protocol_attack: 'scanner_detection',
                    }
                    const attackType: DeceptionType = typeMap[detectedType] || 'scanner_detection'

                    // Utiliser le payload RPC si fourni, sinon payload contextuel
                    const payload = evalResult.payload
                        ? {
                            status_code:      evalResult.payload.status_code,
                            content_type:     evalResult.payload.content_type,
                            response_body:    evalResult.payload.response_body,
                            response_headers: evalResult.payload.response_headers || {},
                        }
                        : getDeceptionPayload(attackType)

                    logWafEvent({
                        ip, method, path: pathname, userAgent,
                        threatType: detectedType,
                        detail: `WAF Sentinel DECEIVE [${attackType}]: ${evalResult.reason} (trust=${evalResult.trust_score})`,
                        fingerprintHash,
                        action: 'deceive',
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                    logDeceptionInteraction({
                        ip, path: pathname, method,
                        attackType, payloadName: `sentinel_${attackType}`,
                        fingerprintHash,
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })

                    // Nourrir l'apprentissage avec les détails CRS
                    if (deceiveVerdict.blocked && deceiveVerdict.matches[0]?.snippet) {
                        trackViolation(ip, SUPA_URL, SUPA_KEY, {
                            threatType: detectedType,
                            snippet: deceiveVerdict.matches[0].snippet.slice(0, 120),
                        })
                    }

                    return buildDeceptionResponse(payload)
                }

                case 'tarpit': {
                    // Ralentir la réponse pour épuiser les ressources de l'attaquant
                    const delayMs = Math.max(0, Math.min(8000, evalResult.delay_ms || 2000))
                    await applyTarpit(delayMs)

                    logWafEvent({
                        ip, method, path: pathname, userAgent,
                        threatType: 'rate_limit',
                        detail: `WAF Sentinel TARPIT: ${delayMs}ms (trust=${evalResult.trust_score})`,
                        fingerprintHash,
                        action: 'tarpit',
                        responseDelayMs: delayMs,
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })

                    // ── CORRECTION 4 : Trust decay sur tarpit ─────────
                    // Chaque requête tarpitée dégrade le trust score (-3)
                    // Ça fait progresser l'attaquant vers le blocage/déception
                    updateIpMemory({
                        ip, isAttack: true,
                        attackType: 'tarpit_escalation',
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })

                    // Après le tarpit, continuer le traitement normal
                    break
                }

                case 'honeypot': {
                    const hpPayload = getDeceptionPayload('honeypot')
                    logDeceptionInteraction({
                        ip, path: pathname, method,
                        attackType: 'honeypot', payloadName: 'sentinel_honeypot',
                        fingerprintHash,
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                    return buildDeceptionResponse(hpPayload)
                }

                case 'allow':
                default:
                    // Requête autorisée — continuer normalement
                    break
            }
        }
    }

    // ─── 4b. CRS OBSERVATION MODE (post-RPC) ─────────────────
    // CORRECTION 2 : Même quand le RPC a répondu 'allow' ou 'tarpit',
    // on lance le CRS en mode OBSERVATION (pas de blocage) pour :
    //   - Nourrir l'apprentissage automatique (learnAttackPattern)
    //   - Détecter les campagnes (trackCampaign)
    //   - Récompenser les IPs légitimes (trust +1)
    //   - Enrichir les métriques WAF
    if (rpcHandled && !emergencyBypass && !isAbsoluteBypass(pathname) && !isInternalPanelPath && SUPA_URL && SUPA_KEY) {
        const searchParamsObs = request.nextUrl.searchParams.toString()
        const obsVerdict = analyzeRequestFast(method, pathname, searchParamsObs, userAgent)

        if (obsVerdict.blocked && obsVerdict.matches.length > 0) {
            // Le CRS a détecté une menace que le RPC a laissé passer
            // → On ne bloque PAS (le RPC a déjà décidé), mais on nourrit l'apprentissage
            const topMatch = obsVerdict.matches[0]
            const isInternalApi = pathname.startsWith('/api/analytics') ||
                                  pathname.startsWith('/api/cron') ||
                                  pathname.startsWith('/api/ceo')
            if (!isInternalApi) {
                trackViolation(ip, SUPA_URL, SUPA_KEY, {
                    threatType: obsVerdict.topThreat || 'waf_observe',
                    snippet: topMatch?.snippet?.slice(0, 120),
                })
            }
        } else if (ip !== 'unknown') {
            // Requête propre → récompenser le trust score (+1)
            updateIpMemory({ ip, isAttack: false, supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY })
        }
    }

    // ─── 5. FALLBACK CRS JS (si RPC n'a pas répondu) ─────────
    // Si waf_evaluate_request() n'est pas disponible (DB down, pas de résultat),
    // on utilise la logique CRS JavaScript existante comme filet de sécurité
    if (!rpcHandled && !emergencyBypass) {

        // 5a. Check sous-réseau banni + IP bloquée + trust score
        if (!isIpWhitelisted && !isInternalPanelPath) {
            if (checkSubnetBanned(ip)) {
                return wafBlock('Accès refusé.', 403)
            }
            if (ip !== 'unknown' && await isIpBlocked(ip)) {
                if (SUPA_URL && SUPA_KEY) logWafEvent({
                    ip, method, path: pathname, userAgent,
                    threatType: 'blocked_ip', detail: 'IP dans la liste de blocage (fallback)',
                    supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                })
                return wafBlock('Accès refusé.', 403)
            }
            if (ip !== 'unknown' && SUPA_URL && SUPA_KEY) {
                const { trusted } = await checkIpTrustScore(ip, SUPA_URL, SUPA_KEY)
                if (!trusted) {
                    logWafEvent({
                        ip, method, path: pathname, userAgent,
                        threatType: 'blocked_ip', detail: 'Trust score insuffisant (fallback)',
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                    return wafBlock('Accès refusé.', 403)
                }
            }
        } else if (!isIpWhitelisted && isInternalPanelPath) {
            if (checkSubnetBanned(ip)) {
                return wafBlock('Accès refusé.', 403)
            }
        }

        // 5b. Géo-blocage
        if (!isIpWhitelisted) {
            const geo = checkGeoBlock(request.headers)
            if (geo.blocked) {
                if (SUPA_URL && SUPA_KEY) logWafEvent({
                    ip, method, path: pathname, userAgent,
                    threatType: 'geo_block', detail: `Pays bloqué: ${geo.country}`,
                    supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                })
                return wafBlock('Accès non autorisé depuis votre région.', 403)
            }
        }

        // 5c. Rate Limiting
        if (!isIpWhitelisted) {
            const rlCategory = getRateLimitCategory(pathname)
            if (checkRateLimit(ip, rlCategory)) {
                if (SUPA_URL && SUPA_KEY) {
                    logWafEvent({
                        ip, method, path: pathname, userAgent,
                        threatType: 'rate_limit', detail: `Catégorie: ${rlCategory}`,
                        supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                    })
                    if (rlCategory !== 'login') {
                        trackViolation(ip, SUPA_URL, SUPA_KEY, { threatType: 'rate_limit' })
                    }
                }
                return wafBlock('Trop de requêtes. Réessayez dans quelques instants.', 429)
            }
        }

        // 5d. WAF CRS OWASP Analysis (fallback)
        if (!isAbsoluteBypass(pathname)) {
            if (isInternalPanelPath) {
                // Panels internes : scanner le User-Agent uniquement
                const verdict = analyzeRequestFast(method, '', '', userAgent)
                if (verdict.blocked) {
                    if (SUPA_URL && SUPA_KEY) {
                        logWafEvent({
                            ip, method, path: pathname, userAgent,
                            threatType: verdict.topThreat as ThreatType || 'scanner_detection',
                            detail: verdict.matches.slice(0, 3).map(m =>
                                `[R${m.ruleId}:${m.target}] ${m.description} — "${m.snippet}"`
                            ).join(' | '),
                            score: verdict.score,
                            supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                        })
                    }
                    return wafBlock('Accès refusé — outil de scanning détecté.', 403)
                }
            } else {
                // Chemins publics : scan complet
                const searchParams = request.nextUrl.searchParams.toString()
                const verdict = analyzeRequestFast(method, pathname, searchParams, userAgent)
                if (verdict.blocked) {
                    const topMatch  = verdict.matches[0]
                    const detailStr = verdict.matches.slice(0, 3).map(m =>
                        `[R${m.ruleId}:${m.target}] ${m.description} — "${m.snippet}"`
                    ).join(' | ')

                    if (SUPA_URL && SUPA_KEY) {
                        logWafEvent({
                            ip, method, path: pathname, userAgent,
                            threatType: verdict.topThreat as ThreatType || 'sql_injection',
                            detail: detailStr,
                            score: verdict.score,
                            supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY,
                        })
                        const isInternalApi = pathname.startsWith('/api/analytics') ||
                                              pathname.startsWith('/api/cron') ||
                                              pathname.startsWith('/api/ceo')
                        if (!isInternalApi) {
                            trackViolation(ip, SUPA_URL, SUPA_KEY, {
                                threatType:  verdict.topThreat || 'waf_block',
                                payloadHash: topMatch?.snippet
                                    ? Buffer.from(topMatch.snippet.slice(0, 64)).toString('base64').slice(0, 32)
                                    : undefined,
                                snippet:     topMatch?.snippet?.slice(0, 120),
                            })
                        }
                    }
                    return wafBlock('Requête bloquée par le pare-feu applicatif.', 403)
                }

                // Récompenser les IPs légitimes (trust score +1 en arrière-plan)
                if (SUPA_URL && SUPA_KEY && ip !== 'unknown') {
                    updateIpMemory({ ip, isAttack: false, supabaseUrl: SUPA_URL, serviceKey: SUPA_KEY })
                }
            }
        }
    }

    // ─── 6. AUTH SUPABASE ─────────────────────────────────────
    const isAgentRoute  = pathname.startsWith('/agent')
    const isAdminRoute  = pathname.startsWith('/admin')
    const isClientRoute = pathname.startsWith('/client')
    const isCeoRoute    = pathname.startsWith('/ceo')
    if (!isAgentRoute && !isAdminRoute && !isClientRoute && !isCeoRoute) return response

    // Pages de login/register/reset : accès public, pas de check auth
    // Sans ça → boucle de redirection infinie (pas de session → redirect login → pas de session → ...)
    if (isAbsoluteBypass(pathname)) return response

    let supabaseResponse = response

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () => request.cookies.getAll(),
                    setAll: (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                        supabaseResponse = NextResponse.next({ request })
                        Object.entries(secHeaders).forEach(([k, v]) => supabaseResponse.headers.set(k, v))
                        cookiesToSet.forEach(({ name, value, options }) =>
                            supabaseResponse.cookies.set(name, value, options))
                    },
                },
            }
        )

        const { data: { user }, error: userError } = await supabase.auth.getUser()

        const redirectTo = (url: URL) => {
            const redirectRes = NextResponse.redirect(url)
            if (url.pathname.includes('/login')) {
                request.cookies.getAll()
                    .filter(c => c.name.startsWith('sb-'))
                    .forEach(cookie => redirectRes.cookies.delete(cookie.name))
            }
            supabaseResponse.cookies.getAll().forEach(cookie => {
                redirectRes.cookies.set(cookie.name, cookie.value, cookie)
            })
            return redirectRes
        }

        if (userError || !user) {
            const loginUrl = isAdminRoute ? '/admin/login'
                : isClientRoute ? '/client/login'
                : isCeoRoute ? '/ceo/login'
                : '/agent/login'
            return redirectTo(new URL(loginUrl, request.url))
        }

        // Fix Vercel httpOnly cookie
        request.cookies.getAll()
            .filter(c => c.name.startsWith('sb-'))
            .forEach(cookie => {
                supabaseResponse.cookies.set(cookie.name, cookie.value, {
                    path: '/', httpOnly: false, secure: true,
                    sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 7,
                })
            })

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) return supabaseResponse

        const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

        const [clientRes, agentRes] = await Promise.all([
            adminSupabase.from('client_profiles').select('id').eq('id', user.id).maybeSingle(),
            adminSupabase.from('user_profiles').select('role').eq('id', user.id).maybeSingle(),
        ])
        const clientProfile = clientRes.data
        const agentProfile  = agentRes.data

        // Espace Client
        if (isClientRoute) {
            if (agentProfile) return redirectTo(new URL('/client/login?error=unauthorized', request.url))
            if (!clientProfile) return redirectTo(new URL('/client/login?error=no-profile', request.url))
            return supabaseResponse
        }

        if (!agentProfile) {
            const loginUrl = isAdminRoute ? '/admin/login?error=unauthorized'
                : isCeoRoute ? '/ceo/login?error=unauthorized'
                : '/agent/login?error=unauthorized'
            return redirectTo(new URL(loginUrl, request.url))
        }

        // Isolation stricte des rôles
        const role = agentProfile.role
        const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'ceo']

        if (isAdminRoute && !ADMIN_ROLES.includes(role)) {
            return redirectTo(new URL('/admin/login?error=unauthorized', request.url))
        }
        if (isAgentRoute && role !== 'agent') {
            return redirectTo(new URL('/agent/login?error=unauthorized', request.url))
        }
        // CEO panel : uniquement le rôle 'ceo'
        if (isCeoRoute && role !== 'ceo') {
            return redirectTo(new URL('/ceo/login?error=unauthorized', request.url))
        }

        // ─── 2FA Check admins ────────────────────────────────
        if (isAdminRoute && ADMIN_ROLES.includes(role)) {
            const totpVerified = request.cookies.get('totp_verified')?.value
            const is2FAPage    = pathname.startsWith('/admin/2fa')

            if (!is2FAPage && totpVerified !== 'true') {
                const { data: totpRow } = await adminSupabase
                    .from('totp_secrets')
                    .select('enabled')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (totpRow?.enabled) {
                    const redirect2FA = new URL('/admin/2fa', request.url)
                    // next validé côté client dans /admin/2fa/page.tsx
                    const safeNext = /^\/admin\/[a-zA-Z0-9/_-]*$/.test(pathname) ? pathname : '/admin/dashboard'
                    redirect2FA.searchParams.set('next', safeNext)
                    return redirectTo(redirect2FA)
                }
            }
        }

        return supabaseResponse
    } catch (err: unknown) {
        console.error('Middleware catch:', err instanceof Error ? err.message : err)
        return response
    }
}

export const config = {
    matcher: [
        /*
         * Match ALL routes EXCEPT:
         * - _next/static (fichiers statiques Next.js)
         * - _next/image (optimisation images)
         * - favicon.ico, sw.js, robots.txt, sitemap.xml
         * - Fichiers statiques publics (images, fonts, icons)
         */
        '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|robots\\.txt|sitemap\\.xml|manifest\\.json|icons/|images/|fonts/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm|mp3|pdf)$).*)',
    ],
}
