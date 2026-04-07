import { NextRequest, NextResponse } from 'next/server'
import { fetchGemma, getGemmaText, type NvidiaMessage } from '@/lib/nvidia'

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

        // Mode streaming — renvoie le flux SSE NVIDIA directement
        if (wantStream) {
            const allMsgs: NvidiaMessage[] = [{ role: 'system', content: sysPrompt }, ...msgs]
            const nvidiaRes = await fetchGemma({ messages: allMsgs, stream: true })
            if (!nvidiaRes.ok) {
                const err = await nvidiaRes.text()
                return NextResponse.json({ error: err }, { status: nvidiaRes.status })
            }
            return new Response(nvidiaRes.body, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            })
        }

        // Mode non-stream
        const text = await getGemmaText(msgs, sysPrompt)
        return NextResponse.json({ text })

    } catch (e) {
        console.error('[Gemma API]', e)
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Erreur serveur' },
            { status: 500 }
        )
    }
}
