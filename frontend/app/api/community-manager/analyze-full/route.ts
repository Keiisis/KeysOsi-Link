import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

// ── Clés ─────────────────────────────────────────────────
const GROQ_KEYS = [
    process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3, process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5, process.env.GROQ_API_KEY_6,
].filter(Boolean) as string[]

const APIFY_KEYS = [
    process.env.APIFY_API_KEY_1,
    process.env.APIFY_API_KEY_2,
    process.env.APIFY_API_KEY_3,
].filter(Boolean) as string[]

const SERPER_KEYS = [
    process.env.SERPER_API_KEY_1,
    process.env.SERPER_API_KEY_2,
    process.env.SERPER_API_KEY_3,
].filter(Boolean) as string[]

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant')
}
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Apify actors ──────────────────────────────────────────
const APIFY_ACTORS: Record<string, {
    actor: string
    buildInput: (url: string, username: string) => Record<string, unknown>
    timeout: number
}> = {
    facebook: {
        actor: 'apify~facebook-pages-scraper',
        buildInput: (url) => ({ startUrls: [{ url }], maxPosts: 25, maxPostComments: 0, maxReviews: 0 }),
        timeout: 300,
    },
    instagram: {
        actor: 'apify~instagram-profile-scraper',
        buildInput: (_url, username) => ({ usernames: [username], resultsLimit: 25 }),
        timeout: 120,
    },
    tiktok: {
        actor: 'clockworks~tiktok-scraper',
        buildInput: (url) => ({ profiles: [url], resultsPerPage: 25, shouldDownloadVideos: false, shouldDownloadCovers: false, maxItems: 25 }),
        timeout: 180,
    },
    linkedin: {
        actor: 'apify~linkedin-profile-scraper',
        buildInput: (url) => ({ profileUrls: [url] }),
        timeout: 120,
    },
}

let apifyKeyIndex = 0

// ── Helpers ───────────────────────────────────────────────
function strSafe(v: unknown): string {
    if (v === null || v === undefined) return ''
    const s = String(v).trim()
    return s === 'null' || s === 'undefined' ? '' : s
}

function ensureArray(v: unknown): string[] {
    return Array.isArray(v) ? v.map(String).filter(Boolean) : []
}

// ── Scraping ──────────────────────────────────────────────
type RawPost = { text: string; likes: number; comments: number; shares: number; date: string; url: string }

function normalizeItems(items: unknown[], fallbackUrl: string, platform: string): RawPost[] {
    return items.slice(0, 25).map((item) => {
        const i = item as Record<string, unknown>
        let postUrl = strSafe(i.url || i.postUrl || i.link)
        if (!postUrl && i.shortCode) postUrl = `https://www.instagram.com/p/${strSafe(i.shortCode)}/`
        if (!postUrl && platform === 'tiktok' && i.webVideoUrl) postUrl = strSafe(i.webVideoUrl)
        if (!postUrl) postUrl = fallbackUrl
        return {
            text: strSafe(i.text || i.caption || i.description || i.content || i.message || i.storyName),
            likes: Math.max(0, Number(i.likesCount ?? i.likes ?? i.diggCount ?? i.likeCount ?? i.reactionsCount ?? 0) || 0),
            comments: Math.max(0, Number(i.commentsCount ?? i.comments ?? i.commentCount ?? 0) || 0),
            shares: Math.max(0, Number(i.sharesCount ?? i.shares ?? i.shareCount ?? 0) || 0),
            date: strSafe(i.timestamp || i.date || i.publishedAt || i.postedAt || i.createdAt),
            url: postUrl,
        }
    }).filter(p => p.text.length > 0 || p.url !== fallbackUrl)
}

async function serperFallback(profileUrl: string, platform: string): Promise<RawPost[]> {
    const cleanUrl = profileUrl.replace(/\/$/, '')
    const username = cleanUrl.split('/').filter(Boolean).pop() || ''
    for (const key of [...SERPER_KEYS].sort(() => Math.random() - 0.5)) {
        try {
            const res = await axios.post(
                'https://google.serper.dev/search',
                { q: `"${cleanUrl}"`, gl: 'bj', hl: 'fr', num: 10 },
                { headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' }, timeout: 12000 }
            )
            const organic = (res.data.organic || []) as Array<{ title?: string; snippet?: string; link?: string; date?: string }>
            const filtered = organic.filter(r => r.link?.includes(platform + '.com') || r.link?.includes(username) || r.snippet?.toLowerCase().includes(username.toLowerCase()))
            const results = filtered.length > 0 ? filtered : organic.slice(0, 5)
            if (results.length > 0) {
                return results.map(item => ({
                    text: item.snippet || item.title || '',
                    likes: 0, comments: 0, shares: 0,
                    date: item.date || '',
                    url: item.link || profileUrl,
                }))
            }
        } catch { /* essai suivant */ }
    }
    return []
}

async function scrapePosts(profileUrl: string, platform: string): Promise<{ posts: RawPost[]; method: string }> {
    const cfg = APIFY_ACTORS[platform]
    const username = profileUrl.replace(/\/$/, '').split('/').filter(Boolean).pop() || profileUrl

    if (APIFY_KEYS.length > 0 && cfg) {
        const triedKeys = new Set<number>()
        const errors: string[] = []
        while (triedKeys.size < APIFY_KEYS.length) {
            let keyIdx = apifyKeyIndex % APIFY_KEYS.length
            let safety = 0
            while (triedKeys.has(keyIdx) && safety < APIFY_KEYS.length) { keyIdx = (keyIdx + 1) % APIFY_KEYS.length; safety++ }
            if (triedKeys.has(keyIdx)) break
            triedKeys.add(keyIdx)
            const apiKey = APIFY_KEYS[keyIdx]
            try {
                const res = await axios.post(
                    `https://api.apify.com/v2/acts/${cfg.actor}/run-sync-get-dataset-items?token=${apiKey}&timeout=${cfg.timeout}&format=json`,
                    cfg.buildInput(profileUrl, username),
                    { headers: { 'Content-Type': 'application/json' }, timeout: (cfg.timeout + 30) * 1000 }
                )
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                const items: unknown[] = Array.isArray(res.data) ? res.data : []
                const posts = normalizeItems(items, profileUrl, platform)
                console.log(`[analyze-full] Apify ✓ clé ${keyIdx + 1} — ${posts.length} posts`)
                return { posts, method: 'apify' }
            } catch (err) {
                const status = axios.isAxiosError(err) ? err.response?.status : null
                const msg = axios.isAxiosError(err) ? (err.response?.data?.error?.message || err.message) : String(err)
                errors.push(`clé ${keyIdx + 1}: ${msg}`)
                apifyKeyIndex = (keyIdx + 1) % APIFY_KEYS.length
                if (status === 400) break
                if (status === 429) await new Promise(r => setTimeout(r, 2000))
            }
        }
        console.warn(`[analyze-full] Apify échoué (${errors.join(' | ')}) → fallback Serper`)
    }

    const posts = await serperFallback(profileUrl, platform)
    return { posts, method: posts.length > 0 ? 'serper_fallback' : 'empty' }
}

// ── Analyse de style IA ───────────────────────────────────
const STYLE_SYSTEM_PROMPT = `Tu es un expert en marketing digital africain, copywriting viral et community management.
Analyse le style d'écriture des publications fournies et retourne UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "tone": "string",
  "vocabulary_level": "simple|courant|soutenu|technique",
  "typical_structure": "string (ex: Choc → Problème → Solution → CTA)",
  "hooks": ["string","string","string"],
  "hashtag_strategy": "string",
  "emoji_usage": "string",
  "avg_post_length": "court <100 mots|moyen 100-300|long >300",
  "engagement_triggers": ["string"],
  "writing_patterns": ["string"],
  "improvement_tips": ["string","string","string"],
  "viral_formula": "string (formule en 1 phrase percutante)",
  "best_content_types": ["string"],
  "call_to_action_style": "string",
  "top_topics": ["string"],
  "best_posting_times": ["string"],
  "content_mix": "string (ex: 60% éducatif, 30% motivationnel, 10% promotionnel)",
  "strengths": ["string","string"],
  "weaknesses": ["string","string"],
  "opportunities": ["string","string","string"]
}`

async function analyzeStyle(posts: RawPost[], platform: string, profileUrl: string): Promise<Record<string, unknown> | null> {
    const textPosts = posts.filter(p => p.text.length > 10)
    if (textPosts.length === 0) return null
    const samples = textPosts.slice(0, 15).map(p => p.text).join('\n---\n').slice(0, 8000)

    const shuffled = [...GROQ_KEYS].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const groq = new Groq({ apiKey: shuffled[i] })
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: STYLE_SYSTEM_PROMPT },
                    { role: 'user', content: `Analyse ces ${textPosts.length} publications ${platform} (profil: ${profileUrl}) :\n\n---\n${samples}\n---\n\nRetourne l'analyse JSON complète.` },
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 2000,
            })
            const rawJson = completion.choices[0].message.content || '{}'
            try { return JSON.parse(rawJson) } catch { return null }
        } catch (err) {
            console.warn(`[analyze-full] Groq key ${i + 1} failed:`, err instanceof Error ? err.message : '')
        }
    }
    return null
}

// ── Calcul score viral ────────────────────────────────────
function computeViralScore(post: RawPost): number {
    // Likes×1 + Comments×3 + Shares×5 (amplification croissante)
    return post.likes * 1 + post.comments * 3 + post.shares * 5
}

// ── Génération du prompt Claude.ai ───────────────────────
function buildClaudePrompt(dossier: Record<string, unknown>): string {
    const meta = dossier.meta as Record<string, unknown>
    const style = dossier.style as Record<string, unknown>
    const competitive = dossier.competitive as Record<string, string[]>

    return `# Contexte Expert — Dossier Intelligence Concurrent

Tu es un expert en marketing viral africain, copywriting percutant et community management pour l'Afrique de l'Ouest.

## Dossier d'Intelligence Marketing @${meta.username} (${meta.platform})

\`\`\`json
${JSON.stringify(dossier, null, 2)}
\`\`\`

## Formule Virale Détectée
"${style.viral_formula || 'Non déterminée'}"

## Ce qui fonctionne pour eux (forces)
${(competitive.strengths || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Leurs faiblesses à exploiter
${(competitive.weaknesses || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Opportunités non exploitées
${(competitive.opportunities || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

---

## Comment utiliser ce dossier

**Exemple 1 — Créer un post supérieur :**
> "En te basant sur ce dossier, crée un post ${meta.platform} sur [TON SUJET] qui utilise la formule virale détectée mais qui surpasse leur contenu sur [UN POINT FAIBLE]"

**Exemple 2 — Calendrier éditorial :**
> "Génère un calendrier éditorial de 30 jours en t'inspirant des patterns de ce concurrent (topics récurrents, formats gagnants) mais avec une approche différenciante pour Retour Gagnant Bénin"

**Exemple 3 — Réécriture virale :**
> "Réécris ce post en le rendant plus viral selon la formule détectée : [COLLER LE POST]"

**Exemple 4 — Campagne complète :**
> "Crée une séquence de 5 posts ${meta.platform} sur [THÈME] en exploitant leurs opportunités non exploitées et en surpassant leurs faiblesses"

---
*Dossier généré le ${meta.generated_at} — ${meta.posts_analyzed} publications analysées via Community Manager Pro*`
}

// ═════════════════════════════════════════════════════════
// POST /api/community-manager/analyze-full
// ═════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { profile_id, profile_url, platform, username, notes } = body

        if (!profile_url?.trim()) return NextResponse.json({ error: 'profile_url obligatoire' }, { status: 400 })
        if (!platform || !['facebook', 'instagram', 'tiktok', 'linkedin'].includes(platform)) {
            return NextResponse.json({ error: 'Plateforme invalide' }, { status: 400 })
        }

        const profileUsername = username || profile_url.replace(/\/$/, '').split('/').filter(Boolean).pop() || ''

        // ── 1. Scraping ───────────────────────────────────
        console.log(`[analyze-full] Début pipeline — ${platform} : ${profile_url}`)
        const { posts: rawPosts, method: scrapeMethod } = await scrapePosts(profile_url, platform)
        console.log(`[analyze-full] ${rawPosts.length} posts scrappés via ${scrapeMethod}`)

        // ── 2. Scores viraux ──────────────────────────────
        const rawScores = rawPosts.map(p => computeViralScore(p))
        const maxRaw = Math.max(...rawScores, 1)
        const postsScored = rawPosts.map((post, i) => ({
            ...post,
            viral_score: Math.round((rawScores[i] / maxRaw) * 100),
        })).sort((a, b) => b.viral_score - a.viral_score)

        // ── 3. Analyse de style ───────────────────────────
        console.log(`[analyze-full] Analyse style Groq...`)
        const style = await analyzeStyle(rawPosts, platform, profile_url)
        const s = style || {}

        // ── 4. Stats d'engagement ─────────────────────────
        const withEngage = postsScored.filter(p => p.likes + p.comments + p.shares > 0)
        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
        const avgLikes = avg(withEngage.map(p => p.likes))
        const avgComments = avg(withEngage.map(p => p.comments))
        const avgShares = avg(withEngage.map(p => p.shares))
        const bestScore = postsScored[0]?.viral_score ?? 0
        const engagementLevel = withEngage.length === 0 ? 'non mesuré' : bestScore > 70 ? 'viral' : bestScore > 40 ? 'élevé' : bestScore > 20 ? 'moyen' : 'faible'

        // ── 5. Construction du Dossier Intelligence ───────
        const dossier: Record<string, unknown> = {
            meta: {
                version: '2.0',
                generated_at: new Date().toISOString(),
                tool: 'Retour Gagnant — Community Manager Pro',
                posts_analyzed: rawPosts.length,
                scrape_method: scrapeMethod,
                platform,
                profile_url,
                username: profileUsername,
            },
            profile: {
                platform,
                username: profileUsername,
                profile_url,
                notes: notes || '',
            },
            style: {
                tone: String(s.tone || 'Non déterminé'),
                vocabulary_level: String(s.vocabulary_level || 'courant'),
                structure: String(s.typical_structure || ''),
                hooks: ensureArray(s.hooks),
                hashtag_strategy: String(s.hashtag_strategy || ''),
                emoji_usage: String(s.emoji_usage || ''),
                avg_post_length: String(s.avg_post_length || ''),
                engagement_triggers: ensureArray(s.engagement_triggers),
                writing_patterns: ensureArray(s.writing_patterns),
                improvement_tips: ensureArray(s.improvement_tips),
                viral_formula: String(s.viral_formula || ''),
                best_content_types: ensureArray(s.best_content_types),
                cta_style: String(s.call_to_action_style || ''),
                top_topics: ensureArray(s.top_topics),
                content_mix: String(s.content_mix || ''),
            },
            top_posts: postsScored.slice(0, 10).map((p, i) => ({
                rank: i + 1,
                text: p.text.slice(0, 400),
                likes: p.likes,
                comments: p.comments,
                shares: p.shares,
                viral_score: p.viral_score,
                date: p.date,
                url: p.url,
            })),
            stats: {
                avg_likes: avgLikes,
                avg_comments: avgComments,
                avg_shares: avgShares,
                best_viral_score: bestScore,
                engagement_level: engagementLevel,
                total_posts_scraped: rawPosts.length,
                posts_with_engagement: withEngage.length,
            },
            patterns: {
                best_times: ensureArray(s.best_posting_times).length > 0 ? ensureArray(s.best_posting_times) : ['18h-20h', '7h-9h'],
                top_hooks: ensureArray(s.hooks).slice(0, 5),
                top_topics: ensureArray(s.top_topics),
                content_mix: String(s.content_mix || ''),
            },
            competitive: {
                strengths: ensureArray(s.strengths),
                weaknesses: ensureArray(s.weaknesses),
                opportunities: ensureArray(s.opportunities),
            },
        }

        // ── 6. Prompt Claude.ai prêt à l'emploi ──────────
        const claudePrompt = buildClaudePrompt(dossier)
        dossier.claude_prompt = claudePrompt

        // ── 7. Sauvegarde Supabase ────────────────────────
        if (profile_id) {
            try {
                await supabase.from('social_analyses').insert({
                    profile_id,
                    analysis_type: 'style',
                    content_samples: rawPosts.slice(0, 5).map(p => p.text).join('\n---\n').slice(0, 5000),
                    result: dossier,
                })
                // Mettre à jour last_analyzed_at du profil
                await supabase.from('social_profiles').update({ last_analyzed_at: new Date().toISOString() }).eq('id', profile_id)
            } catch (dbErr) {
                console.warn('[analyze-full] Supabase save failed:', dbErr)
            }
        }

        console.log(`[analyze-full] ✓ Dossier construit — engagement: ${engagementLevel} | style analysé: ${style !== null}`)
        return NextResponse.json({ success: true, dossier })
    } catch (err) {
        console.error('[analyze-full] Error:', err)
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, { status: 500 })
    }
}
