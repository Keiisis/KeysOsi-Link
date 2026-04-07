import { NextRequest, NextResponse } from 'next/server'
import { fetchGemma, type NvidiaMessage } from '@/lib/nvidia'

// Étend le timeout Vercel à 60s (Pro) ou 300s (edge)
export const maxDuration = 60

const CEO_SYSTEM_PROMPT = `Tu es GEMMA — l'IA Executive de Retour Gagnant Bénin, alimentée par Gemma 4 31B.
Tu assistes le CEO dans toutes ses décisions stratégiques et opérationnelles.

=== TES CAPACITÉS ===
- Analyser les KPIs, revenus, commandes et données du tableau de bord
- Rédiger des rapports exécutifs, synthèses et recommandations stratégiques
- Proposer des actions concrètes pour améliorer les performances
- Analyser les dossiers clients et suggérer des priorités
- Créer du contenu premium pour la diaspora béninoise
- Répondre aux questions sur la gestion d'entreprise, droit béninois, investissement
- Rédiger des emails professionnels et communications officielles

=== CONTEXTE PLATEFORME ===
Retour Gagnant Bénin est une plateforme premium pour la diaspora béninoise.
Services : nationalité béninoise, investissement immobilier, patrimoine culturel, boutique.
Stack : Next.js 16 + Supabase + Vercel. Monnaie : XOF (Franc CFA).

=== TON TON ===
Expert, stratégique, précis. Tu parles au CEO directement.
Réponds toujours en français sauf demande contraire.
Sois concis mais complet. Utilise des listes et titres quand c'est utile.`

// POST /api/ai/gemma — réponse simple (non-stream)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, prompt, systemPrompt, stream: wantStream } = body

        const msgs: NvidiaMessage[] = messages || (prompt ? [{ role: 'user', content: prompt }] : [])
        if (!msgs.length) {
            return NextResponse.json({ error: 'messages ou prompt requis' }, { status: 400 })
        }

        const sysPrompt = systemPrompt || CEO_SYSTEM_PROMPT
        const allMsgs: NvidiaMessage[] = [{ role: 'system', content: sysPrompt }, ...msgs]

        // Toujours streamer — évite le timeout Vercel
        const nvidiaRes = await fetchGemma({ messages: allMsgs, stream: true })
        if (!nvidiaRes.ok) {
            const err = await nvidiaRes.text()
            return NextResponse.json({ error: err }, { status: nvidiaRes.status })
        }

        // Transformer le flux SSE NVIDIA → flux SSE simplifié pour le client
        const encoder = new TextEncoder()
        const nvidiaBody = nvidiaRes.body!
        const reader = nvidiaBody.getReader()

        const stream = new ReadableStream({
            async start(controller) {
                const decoder = new TextDecoder()
                let buffer = ''
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
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: delta })}\n\n`))
                                    }
                                } catch { /* chunk partiel, ignoré */ }
                            }
                        }
                    }
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
        return NextResponse.json({ error: msg, detail: String(e) }, { status: 500 })
    }
}

// GET — diagnostic : vérifie si la clé est présente
export async function GET() {
    const key = process.env.NVIDIA_API_KEY
    if (!key) {
        return NextResponse.json({ ok: false, error: 'NVIDIA_API_KEY manquante sur le serveur' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, key_prefix: key.slice(0, 12) + '...' })
}
