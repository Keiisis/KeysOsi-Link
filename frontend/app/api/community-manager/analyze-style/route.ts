import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groqApiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6,
    process.env.GROQ_API_KEY,
].filter(Boolean) as string[]

async function callGroqWithRetry(systemPrompt: string, userPrompt: string): Promise<string> {
    const shuffled = [...groqApiKeys].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const groq = new Groq({ apiKey: shuffled[i] })
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 2000,
            })
            return completion.choices[0].message.content || '{}'
        } catch (err) {
            console.warn(`[analyze-style] Groq key ${i + 1} failed:`, err instanceof Error ? err.message : '')
            if (i === Math.min(shuffled.length, 3) - 1) throw err
        }
    }
    throw new Error('Toutes les clés Groq ont échoué')
}

const SYSTEM_PROMPT = `Tu es un expert en marketing digital, copywriting viral et community management africain.
Tu analyses des publications de réseaux sociaux pour extraire le style d'écriture avec précision.
Tu retournes UNIQUEMENT un objet JSON valide avec cette structure exacte :
{
  "tone": "string (ex: inspirant, autoritaire, amical, humoristique, urgent, éducatif)",
  "vocabulary_level": "string (simple/courant/soutenu/technique)",
  "typical_structure": "string (description de la structure type des posts)",
  "hooks": ["string", "string", "string"] (formules d'accroche récurrentes),
  "hashtag_strategy": "string (description de l'usage des hashtags)",
  "emoji_usage": "string (description de l'usage des emojis)",
  "avg_post_length": "string (court <100 mots / moyen 100-300 / long >300)",
  "engagement_triggers": ["string"] (techniques qui provoquent l'engagement),
  "writing_patterns": ["string"] (patterns récurrents détectés),
  "improvement_tips": ["string", "string", "string"] (3 conseils pour améliorer ou reproduire ce style),
  "viral_formula": "string (formule condensée du style en 1 phrase)",
  "best_content_types": ["string"] (types de contenus qui fonctionnent le mieux pour ce style),
  "call_to_action_style": "string (comment les CTA sont formulés)"
}`

// POST /api/community-manager/analyze-style
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { samples, platform, profile_url } = body

        if (!samples || samples.trim().length < 50) {
            return NextResponse.json(
                { error: 'Veuillez fournir au moins quelques publications à analyser (50 caractères minimum).' },
                { status: 400 }
            )
        }

        const userPrompt = `Analyse le style d'écriture de ces publications ${platform ? `sur ${platform}` : ''}${profile_url ? ` (profil: ${profile_url})` : ''} :

---
${samples.trim()}
---

Retourne ton analyse complète en JSON.`

        const rawJson = await callGroqWithRetry(SYSTEM_PROMPT, userPrompt)

        let analysis: Record<string, unknown>
        try {
            analysis = JSON.parse(rawJson)
        } catch {
            // Groq a retourné du texte non-JSON → on encapsule dans un objet minimal
            console.warn('[analyze-style] JSON.parse failed, raw:', rawJson?.slice(0, 200))
            analysis = { viral_formula: rawJson?.slice(0, 500) || 'Analyse indisponible', improvement_tips: [], hooks: [], engagement_triggers: [], writing_patterns: [], best_content_types: [] }
        }

        // Garantir que les champs tableau existent et sont bien des tableaux
        const ensureArray = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : []
        analysis.hooks = ensureArray(analysis.hooks)
        analysis.engagement_triggers = ensureArray(analysis.engagement_triggers)
        analysis.writing_patterns = ensureArray(analysis.writing_patterns)
        analysis.improvement_tips = ensureArray(analysis.improvement_tips)
        analysis.best_content_types = ensureArray(analysis.best_content_types)

        return NextResponse.json({ success: true, analysis, platform, profile_url })
    } catch (err) {
        console.error('[analyze-style] Error:', err)
        const message = err instanceof Error ? err.message : 'Erreur serveur'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
