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

// Index de rotation en mémoire (persiste entre appels du même processus)
let apifyKeyIndex = 0

function getNextApifyKey(): string {
    const key = APIFY_KEYS[apifyKeyIndex % APIFY_KEYS.length]
    apifyKeyIndex = (apifyKeyIndex + 1) % APIFY_KEYS.length
    return key
}

// ── Actors Apify par plateforme ──────────────────────────
const APIFY_ACTORS: Record<string, { actor: string; buildInput: (url: string) => Record<string, unknown> }> = {
    facebook: {
        actor: 'apify/facebook-pages-scraper',
        buildInput: (url) => ({
            startUrls: [{ url }],
            maxPosts: 20,
            maxPostComments: 0,
            maxReviews: 0,
        }),
    },
    instagram: {
        actor: 'apify/instagram-profile-scraper',
        buildInput: (url) => ({
            usernames: [url.replace(/\/$/, '').split('/').filter(Boolean).pop() || url],
            resultsLimit: 20,
        }),
    },
    tiktok: {
        actor: 'clockworks/tiktok-scraper',
        buildInput: (url) => ({
            profiles: [url],
            resultsPerPage: 20,
            shouldDownloadVideos: false,
            shouldDownloadCovers: false,
        }),
    },
    linkedin: {
        actor: 'supreme/linkedin-profile-scraper',
        buildInput: (url) => ({
            profileUrls: [url],
        }),
    },
}

// ── Rotation Apify avec retry sur toutes les clés ────────
async function callApifyWithRotation(
    platform: string,
    profileUrl: string,
    maxRetries: number = APIFY_KEYS.length
): Promise<{ posts: unknown[]; usedKeyIndex: number }> {
    if (APIFY_KEYS.length === 0) throw new Error('Aucune clé Apify configurée')

    const cfg = APIFY_ACTORS[platform]
    if (!cfg) throw new Error(`Plateforme ${platform} non supportée`)

    const triedKeys = new Set<number>()

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Prendre la prochaine clé (round-robin) en évitant les clés déjà tentées
        let keyIdx = apifyKeyIndex % APIFY_KEYS.length
        while (triedKeys.has(keyIdx) && triedKeys.size < APIFY_KEYS.length) {
            keyIdx = (keyIdx + 1) % APIFY_KEYS.length
        }
        if (triedKeys.size >= APIFY_KEYS.length) break
        triedKeys.add(keyIdx)

        const apiKey = APIFY_KEYS[keyIdx]
        const label = `[Apify key ${keyIdx + 1}/${APIFY_KEYS.length}]`

        try {
            console.log(`${label} → ${cfg.actor} | ${platform}`)

            const res = await axios.post(
                `https://api.apify.com/v2/acts/${cfg.actor}/run-sync-get-dataset-items?token=${apiKey}&timeout=60`,
                cfg.buildInput(profileUrl),
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 65000,
                }
            )

            // Mise à jour index global pour prochains appels
            apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length

            const items: unknown[] = Array.isArray(res.data) ? res.data : (res.data?.items || [])
            console.log(`${label} ✓ ${items.length} résultats`)

            return {
                posts: normalizeApifyItems(items, profileUrl),
                usedKeyIndex: keyIdx,
            }
        } catch (err) {
            const status = axios.isAxiosError(err) ? err.response?.status : null
            const msg = err instanceof Error ? err.message : String(err)

            if (status === 401 || status === 403) {
                // Clé invalide ou quota dépassé → bannir cette clé, essayer la suivante
                console.warn(`${label} ✗ AUTH ERROR (${status}) — rotation vers clé suivante`)
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                continue
            } else if (status === 429) {
                // Rate limit → rotation + pause courte
                console.warn(`${label} ✗ RATE LIMIT — rotation + pause 2s`)
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                await new Promise(r => setTimeout(r, 2000))
                continue
            } else if (status && status >= 500) {
                // Erreur Apify serveur → retry avec délai
                console.warn(`${label} ✗ SERVER ERROR (${status}) — retry`)
                await new Promise(r => setTimeout(r, 1500))
                continue
            } else {
                // Timeout ou erreur réseau → essayer prochaine clé
                console.warn(`${label} ✗ ${msg} — rotation`)
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                continue
            }
        }
    }

    throw new Error(`Toutes les clés Apify ont échoué (${APIFY_KEYS.length} clés, ${maxRetries} tentatives)`)
}

// ── Normalisation des données Apify selon plateforme ─────
function normalizeApifyItems(items: unknown[], fallbackUrl: string): Array<{
    text: string; likes: number; comments: number; shares: number; date: string; url: string
}> {
    return items.slice(0, 25).map((item) => {
        const i = item as Record<string, unknown>
        return {
            text: String(i.text || i.caption || i.description || i.content || i.message || ''),
            likes: Number(i.likesCount || i.likes || i.diggCount || i.likeCount || 0),
            comments: Number(i.commentsCount || i.comments || i.commentCount || 0),
            shares: Number(i.sharesCount || i.shares || i.shareCount || i.playCount || i.viewCount || 0),
            date: String(i.timestamp || i.date || i.publishedAt || i.postedAt || i.createdAt || ''),
            url: String(i.url || i.postUrl || i.link || i.shortCode
                ? `https://www.instagram.com/p/${i.shortCode}/`
                : fallbackUrl
            ),
        }
    })
}

// ── Fallback Serper (si Apify indisponible) ───────────────
async function serperFallback(profileUrl: string, platform: string): Promise<unknown[]> {
    const shuffled = [...SERPER_KEYS].sort(() => Math.random() - 0.5)
    const username = profileUrl.replace(/\/$/, '').split('/').filter(Boolean).pop() || ''
    const query = `${username} ${platform === 'all' ? '' : `site:${platform}.com`} publication post viral`

    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const res = await axios.post(
                'https://google.serper.dev/search',
                { q: query, gl: 'bj', hl: 'fr', num: 15 },
                { headers: { 'X-API-KEY': shuffled[i], 'Content-Type': 'application/json' }, timeout: 15000 }
            )
            const organic: Array<{ title?: string; snippet?: string; link?: string; date?: string }> = res.data.organic || []
            console.log(`[Serper fallback key ${i + 1}] ✓ ${organic.length} résultats`)
            return organic.map(item => ({
                text: item.snippet || item.title || '',
                likes: 0,
                comments: 0,
                shares: 0,
                date: item.date || '',
                url: item.link || profileUrl,
            }))
        } catch (err) {
            console.warn(`[Serper key ${i + 1}] failed:`, err instanceof Error ? err.message : '')
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

        if (APIFY_KEYS.length > 0) {
            try {
                const result = await callApifyWithRotation(platform, profile_url)
                posts = result.posts
                apifyKeyUsed = result.usedKeyIndex + 1
                method = 'apify'
                console.log(`[scrape] Apify success — clé #${apifyKeyUsed}, ${posts.length} posts`)
            } catch (apifyErr) {
                const apifyMsg = apifyErr instanceof Error ? apifyErr.message : String(apifyErr)
                console.warn(`[scrape] Apify toutes clés épuisées (${apifyMsg}), fallback Serper`)
                posts = await serperFallback(profile_url, platform)
                method = 'serper_fallback'
            }
        } else {
            console.log('[scrape] Aucune clé Apify — Serper uniquement')
            posts = await serperFallback(profile_url, platform)
        }

        return NextResponse.json({
            success: true,
            posts,
            total: posts.length,
            method,
            apify_keys_available: APIFY_KEYS.length,
            apify_key_used: apifyKeyUsed,
            profile_url,
            platform,
        })
    } catch (err) {
        console.error('[scrape] Error:', err)
        const message = err instanceof Error ? err.message : 'Erreur serveur'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// GET /api/community-manager/scrape — Status des clés Apify
export async function GET() {
    const status = APIFY_KEYS.map((key, i) => ({
        index: i + 1,
        prefix: key.substring(0, 20) + '...',
        active: i === apifyKeyIndex % APIFY_KEYS.length,
    }))
    return NextResponse.json({
        apify_keys_count: APIFY_KEYS.length,
        current_key_index: (apifyKeyIndex % APIFY_KEYS.length) + 1,
        keys: status,
        serper_keys_count: SERPER_KEYS.length,
    })
}
