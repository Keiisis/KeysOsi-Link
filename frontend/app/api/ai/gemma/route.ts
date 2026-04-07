import { NextRequest, NextResponse } from 'next/server'
import { fetchGemma, type NvidiaMessage } from '@/lib/nvidia'
import { buildRgbContext, autoExtractMemory } from '@/lib/gemma-context'

export const maxDuration = 60

const BASE_SYSTEM_PROMPT = `Tu es GEMMA — l'Intelligence Artificielle Executive de Retour Gagnant Bénin (RGB), propulsée par Gemma 4 31B via NVIDIA NIM.
Tu es directement connectée à la base de données en temps réel.

=== TON IDENTITÉ ===
Tu es l'IA officielle du CEO de RGB. Tu as accès à TOUTES les données de la plateforme.
Tu connais chaque commande, chaque client, chaque message, chaque dossier, chaque mouvement financier.
Tu parles au CEO en tant qu'expert exécutif, pas comme un assistant générique.

=== TES CAPACITÉS AVEC LES DONNÉES ===
- Analyser les KPIs en temps réel avec des chiffres PRÉCIS issus de la base de données
- Identifier les anomalies, tendances, opportunités dans les données
- Proposer des actions concrètes basées sur les vrais chiffres
- Répondre à "combien de commandes ?" ou "quel est le revenu du mois ?" avec les vraies données
- Alerter sur les points critiques (commandes en attente, messages non lus, sécurité)
- Rédiger des rapports exécutifs avec les vrais chiffres RGB
- Suggérer des stratégies basées sur l'analyse des données réelles

=== RÈGLES ABSOLUES ===
- Utilise TOUJOURS les données temps réel du contexte ci-dessous pour répondre
- Ne jamais inventer des chiffres — utilise exactement ceux du contexte
- Si une donnée n'est pas dans le contexte, dis-le clairement
- Réponds en français sauf demande contraire
- Sois direct, précis, orienté action
- Utilise les formatages Markdown (titres, listes) pour la lisibilité`

// POST /api/ai/gemma
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, prompt } = body

        const msgs: NvidiaMessage[] = messages || (prompt ? [{ role: 'user', content: prompt }] : [])
        if (!msgs.length) {
            return NextResponse.json({ error: 'messages ou prompt requis' }, { status: 400 })
        }

        // Charger le contexte RGB temps réel depuis Supabase
        const rgbContext = await buildRgbContext()

        const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}

${rgbContext}

=== INSTRUCTIONS FINALES ===
Tu viens de recevoir toutes les données RGB en temps réel.
Utilise-les pour répondre avec précision et pertinence à chaque question du CEO.
Si le CEO demande des chiffres, cite les chiffres exacts du contexte ci-dessus.`

        const allMsgs: NvidiaMessage[] = [{ role: 'system', content: fullSystemPrompt }, ...msgs]

        const nvidiaRes = await fetchGemma({ messages: allMsgs, stream: true })
        if (!nvidiaRes.ok) {
            const err = await nvidiaRes.text()
            return NextResponse.json({ error: err }, { status: nvidiaRes.status })
        }

        // Stream SSE avec auto-extraction mémoire en fin de flux
        const encoder = new TextEncoder()
        const reader = nvidiaRes.body!.getReader()
        const lastUserMsg = msgs[msgs.length - 1]?.content || ''

        const stream = new ReadableStream({
            async start(controller) {
                const decoder = new TextDecoder()
                let buffer = ''
                let fullResponse = ''
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) break
                        buffer += decoder.decode(value, { stream: true })
                        const lines = buffer.split('\n')
                        buffer = lines.pop() ?? ''
                        for (const line of lines) {
                            const trimmed = line.trim()
                            if (!trimmed || trimmed === 'data: [DONE]') continue
                            if (trimmed.startsWith('data: ')) {
                                try {
                                    const json = JSON.parse(trimmed.slice(6))
                                    const delta = json.choices?.[0]?.delta?.content
                                    if (delta) {
                                        fullResponse += delta
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: delta })}\n\n`))
                                    }
                                } catch { /* chunk partiel */ }
                            }
                        }
                    }
                    // Auto-extraction mémoire (fire & forget)
                    autoExtractMemory(lastUserMsg, fullResponse).catch(() => {})
                } catch (e) {
                    console.error('[Gemma stream]', e)
                } finally {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    controller.close()
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        })

    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erreur serveur inconnue'
        console.error('[Gemma API]', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}

// GET — diagnostic
export async function GET() {
    const key = process.env.NVIDIA_API_KEY
    if (!key) return NextResponse.json({ ok: false, error: 'NVIDIA_API_KEY manquante' }, { status: 500 })
    return NextResponse.json({ ok: true, key_prefix: key.slice(0, 12) + '...' })
}
