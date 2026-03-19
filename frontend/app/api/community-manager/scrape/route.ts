import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

// ── Pool de clés Apify (rotation dynamique) ─────────────
const APIFY_KEYS: string[] = [
    process.env.APIFY_API_KEY_1,
    process.env.APIFY_API_KEY_2,
    process.env.APIFY_API_KEY_3,
].filter(Boolean) as string[]

// Serper fallback pool
const SERPER_KEYS: string[] = [
    process.env.SERPER_API_KEY_1,
    process.env.SERPER_API_KEY_2,
    process.env.SERPER_API_KEY_3,
    process.env.SERPER_API_KEY,
].filter(Boolean) as string[]

// Index de rotation (persiste entre requêtes du même processus)
let apifyKeyIndex = 0

function getNextApifyKey(): { key: string; idx: number } {
    const idx = apifyKeyIndex % APIFY_KEYS.length
    apifyKeyIndex = (apifyKeyIndex + 1) % APIFY_KEYS.length
    return { key: APIFY_KEYS[idx], idx }
}

// ── Actors Apify par plateforme ──────────────────────────
// Actors vérifiés et actifs sur Apify
const APIFY_ACTORS: Record<string, {
    actor: string  // Format avec ~ (pas /) pour les URLs Apify
    buildInput: (url: string, username: string) => Record<string, unknown>
    timeout: number // secondes côté Apify (server-side wait)
}> = {
    facebook: {
        // apify~facebook-pages-scraper : scrape les pages et profils publics Facebook
        actor: 'apify~facebook-pages-scraper',
        buildInput: (url) => ({
            startUrls: [{ url }],
            maxPosts: 20,
            maxPostComments: 0,
            maxReviews: 0,
        }),
        timeout: 300, // Facebook est lent (anti-bot), 5 min minimum
    },
    instagram: {
        // apify~instagram-profile-scraper : profils publics Instagram
        actor: 'apify~instagram-profile-scraper',
        buildInput: (_url, username) => ({
            usernames: [username],
            resultsLimit: 20,
        }),
        timeout: 120,
    },
    tiktok: {
        // clockworks~tiktok-scraper : profils publics TikTok
        actor: 'clockworks~tiktok-scraper',
        buildInput: (url) => ({
            profiles: [url],
            resultsPerPage: 20,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
            maxItems: 20,
        }),
        timeout: 180,
    },
    linkedin: {
        // apify~linkedin-profile-scraper : pages entreprises LinkedIn (profils personnels très limités)
        actor: 'apify~linkedin-profile-scraper',
        buildInput: (url) => ({
            profileUrls: [url],
        }),
        timeout: 120,
    },
}

// ── Rotation Apify avec retry sur toutes les clés ────────
async function callApifyWithRotation(
    platform: string,
    profileUrl: string
): Promise<{ posts: unknown[]; usedKeyIndex: number }> {
    if (APIFY_KEYS.length === 0) throw new Error('Aucune clé Apify configurée')

    const cfg = APIFY_ACTORS[platform]
    if (!cfg) throw new Error(`Plateforme ${platform} non supportée`)

    // Extraire le username de l'URL
    const username = profileUrl.replace(/\/$/, '').split('/').filter(Boolean).pop() || profileUrl

    const triedKeys = new Set<number>()
    const errors: string[] = []

    while (triedKeys.size < APIFY_KEYS.length) {
        // Chercher une clé non encore essayée
        let keyIdx = apifyKeyIndex % APIFY_KEYS.length
        let safety = 0
        while (triedKeys.has(keyIdx) && safety < APIFY_KEYS.length) {
            keyIdx = (keyIdx + 1) % APIFY_KEYS.length
            safety++
        }
        if (triedKeys.has(keyIdx)) break
        triedKeys.add(keyIdx)

        const apiKey = APIFY_KEYS[keyIdx]
        const label = `[Apify clé ${keyIdx + 1}/${APIFY_KEYS.length}]`

        try {
            console.log(`${label} → ${cfg.actor} | ${platform} | ${username}`)

            // run-sync-get-dataset-items : lance l'actor et attend les résultats
            const res = await axios.post(
                `https://api.apify.com/v2/acts/${cfg.actor}/run-sync-get-dataset-items?token=${apiKey}&timeout=${cfg.timeout}&format=json`,
                cfg.buildInput(profileUrl, username),
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: (cfg.timeout + 30) * 1000, // axios timeout légèrement supérieur
                }
            )

            // Mise à jour index pour prochain appel
            apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length

            const items: unknown[] = Array.isArray(res.data) ? res.data : []
            const normalizedPosts = normalizeApifyItems(items, profileUrl, platform)
            console.log(`${label} ✓ ${items.length} items bruts → ${normalizedPosts.length} posts normalisés`)

            return {
                posts: normalizedPosts,
                usedKeyIndex: keyIdx,
            }
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : null
            const msg = axios.isAxiosError(err)
                ? (err.response?.data?.error?.message || err.response?.data?.message || err.message)
                : (err instanceof Error ? err.message : String(err))

            errors.push(`clé ${keyIdx + 1}: ${status ? `HTTP ${status}` : ''} ${msg}`)
            console.warn(`${label} ✗ ${status ? `HTTP ${status}` : ''} ${msg}`)

            if (status === 401 || status === 403) {
                // Clé invalide → passer à la suivante immédiatement
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                continue
            } else if (status === 429) {
                // Rate limit → pause + rotation
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                await new Promise(r => setTimeout(r, 2000))
                continue
            } else if (status === 400) {
                // Mauvais input → inutile de réessayer avec d'autres clés
                throw new Error(`Apify: paramètres invalides — ${msg}`)
            } else {
                // Timeout, erreur réseau, 5xx → essayer clé suivante
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                continue
            }
        }
    }

    throw new Error(`Apify: toutes les clés ont échoué. Détails: ${errors.join(' | ')}`)
}

// ── Normalisation des données Apify ─────────────────────
function normalizeApifyItems(
    items: unknown[],
    fallbackUrl: string,
    platform: string
): Array<{ text: string; likes: number; comments: number; shares: number; date: string; url: string }> {
    const strSafe = (v: unknown): string => {
        if (v === null || v === undefined) return ''
        const s = String(v).trim()
        return s === 'null' || s === 'undefined' ? '' : s
    }

    return items
        .slice(0, 25)
        .map((item) => {
            const i = item as Record<string, unknown>

            // URL de la publication
            let postUrl = strSafe(i.url || i.postUrl || i.link)
            if (!postUrl && i.shortCode) {
                postUrl = `https://www.instagram.com/p/${strSafe(i.shortCode)}/`
            }
            if (!postUrl && platform === 'tiktok' && i.webVideoUrl) {
                postUrl = strSafe(i.webVideoUrl)
            }
            if (!postUrl) postUrl = fallbackUrl

            const text = strSafe(i.text || i.caption || i.description || i.content || i.message || i.storyName)

            return {
                text,
                likes: Math.max(0, Number(i.likesCount ?? i.likes ?? i.diggCount ?? i.likeCount ?? i.reactionsCount ?? 0) || 0),
                comments: Math.max(0, Number(i.commentsCount ?? i.comments ?? i.commentCount ?? 0) || 0),
                shares: Math.max(0, Number(i.sharesCount ?? i.shares ?? i.shareCount ?? 0) || 0),
                date: strSafe(i.timestamp || i.date || i.publishedAt || i.postedAt || i.createdAt),
                url: postUrl,
            }
        })
        // Filtrer les items sans texte ni URL utile
        .filter(item => item.text.length > 0 || item.url !== fallbackUrl)
}

// ── Fallback Serper CORRIGÉ ───────────────────────────────
// Recherche précise basée sur l'URL du profil (sans mots parasites)
async function serperFallback(profileUrl: string, platform: string): Promise<unknown[]> {
    const shuffled = [...SERPER_KEYS].sort(() => Math.random() - 0.5)

    // Extraire le username proprement
    const cleanUrl = profileUrl.replace(/\/$/, '')
    const username = cleanUrl.split('/').filter(Boolean).pop() || ''

    // Requêtes ciblées sans mots parasites
    const queries = [
        `"${cleanUrl}"`,                              // URL exacte entre guillemets
        `site:${platform}.com "${username}"`,         // Site + username exact
        `"${username}" ${platform}`,                  // Username + plateforme
    ]

    for (const query of queries) {
        for (let i = 0; i < Math.min(shuffled.length, 2); i++) {
            try {
                const res = await axios.post(
                    'https://google.serper.dev/search',
                    { q: query, gl: 'bj', hl: 'fr', num: 10 },
                    { headers: { 'X-API-KEY': shuffled[i], 'Content-Type': 'application/json' }, timeout: 12000 }
                )
                const organic: Array<{ title?: string; snippet?: string; link?: string; date?: string }> = res.data.organic || []

                // Filtrer pour ne garder que les résultats de la bonne plateforme
                const filtered = organic.filter(r =>
                    r.link?.includes(platform + '.com') ||
                    r.link?.includes(username) ||
                    r.snippet?.toLowerCase().includes(username.toLowerCase())
                )

                const results = filtered.length > 0 ? filtered : organic.slice(0, 5)

                if (results.length > 0) {
                    console.log(`[Serper fallback] ✓ query="${query}" → ${results.length} résultats filtrés`)
                    return results.map(item => ({
                        text: item.snippet || item.title || '',
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        date: item.date || '',
                        url: item.link || profileUrl,
                    }))
                }
            } catch (err) {
                console.warn(`[Serper key ${i + 1}] failed:`, err instanceof Error ? err.message : '')
            }
        }
    }

    return []
}

// ═════════════════════════════════════════════════════════
// POST /api/community-manager/scrape
// ═════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { profile_url, platform } = body

        if (!profile_url?.trim()) {
            return NextResponse.json({ error: "L'URL du profil est obligatoire." }, { status: 400 })
        }
        if (!platform || !['facebook', 'instagram', 'tiktok', 'linkedin'].includes(platform)) {
            return NextResponse.json(
                { error: 'Plateforme invalide. Choisissez : facebook, instagram, tiktok ou linkedin.' },
                { status: 400 }
            )
        }

        let posts: unknown[] = []
        let method = 'serper'
        let apifyKeyUsed: number | null = null
        let apifyError: string | null = null

        if (APIFY_KEYS.length > 0) {
            try {
                const result = await callApifyWithRotation(platform, profile_url)
                apifyKeyUsed = result.usedKeyIndex + 1
                if (result.posts.length === 0) {
                    // Apify OK mais 0 posts (profil privé/personnel/inaccessible) → Serper
                    console.warn(`[scrape] Apify clé #${apifyKeyUsed} → 0 posts → fallback Serper`)
                    posts = await serperFallback(profile_url, platform)
                    method = posts.length > 0 ? 'serper_fallback' : 'apify_empty'
                } else {
                    posts = result.posts
                    method = 'apify'
                    console.log(`[scrape] ✓ Apify clé #${apifyKeyUsed} — ${posts.length} posts`)
                }
            } catch (err) {
                apifyError = err instanceof Error ? err.message : String(err)
                console.warn(`[scrape] Apify échoué: ${apifyError} → fallback Serper`)
                posts = await serperFallback(profile_url, platform)
                method = posts.length > 0 ? 'serper_fallback' : 'empty'
            }
        } else {
            posts = await serperFallback(profile_url, platform)
        }

        return NextResponse.json({
            success: true,
            posts,
            total: posts.length,
            method,
            apify_keys_count: APIFY_KEYS.length,
            apify_key_used: apifyKeyUsed,
            apify_error: apifyError, // aide au débogage
            profile_url,
            platform,
        })
    } catch (err) {
        console.error('[scrape] Error:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}

// GET /api/community-manager/scrape — Status des clés Apify
export async function GET() {
    return NextResponse.json({
        apify_keys_count: APIFY_KEYS.length,
        current_key_index: (apifyKeyIndex % Math.max(APIFY_KEYS.length, 1)) + 1,
        keys_preview: APIFY_KEYS.map((k, i) => ({ index: i + 1, prefix: k.substring(0, 24) + '...' })),
        serper_keys_count: SERPER_KEYS.length,
    })
}
