import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getGroqApiKey } from '@/lib/groq'

export async function POST(req: NextRequest) {
    const apiKey = getGroqApiKey()

    if (!apiKey) {
        return NextResponse.json({ 
            message: "La lumière de vos ancêtres brille sur vous. Bienvenue dans la terre de vos racines." 
        })
    }

    try {
        const data = await req.json()
        const clientName = `${data.client?.prenom || ''} ${data.client?.nom || ''}`.trim() || 'Digne Enfant'

        const groq = new Groq({ apiKey })

        const prompt = `Tu es la 'Voix des Ancêtres' de Retour Gagnant Bénin.
Ton but est spirituel et solennel. Accueille chaleureusement l'afro-descendant nommé ${clientName}.
Il recherche ses racines, lié à la lignée de ${data.pere?.nom || 'Paternel'} et ${data.mere?.nom || 'Maternelle'}.
Rédige un message poétique, majestueux, sacré et ultra-immersif (environ 4 phrases) pour l'accueillir émotionnellement sur la terre de ses ancêtres (la République du Bénin). 
Le ton doit être très digne, tutoyer l'âme (il/tu), et utiliser des métaphores liées aux racines, au sang et à la terre.
NE METS SURTOUT AUCUN GUILLEMET ni titre dans ta réponse.`

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'system', content: prompt }],
            model: 'mixtral-8x7b-32768',
            temperature: 0.8,
            max_tokens: 250
        })

        const content = completion.choices[0]?.message?.content || 
            `Cher ${clientName}, l'esprit de vos ancêtres a guidé vos pas jusqu'ici.`

        return NextResponse.json({ message: content })
    } catch (e: any) {
        console.error('[GROQ GENEALOGY]', e.message)
        return NextResponse.json({ 
            message: "Le pont est reconstruit. Bon retour à la maison, digne enfant de l'Afrique." 
        })
    }
}
