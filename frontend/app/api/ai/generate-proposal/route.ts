import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import axios from 'axios'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const groqApiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6
].filter(Boolean) as string[]

const serperApiKeys = [
    process.env.SERPER_API_KEY_1,
    process.env.SERPER_API_KEY_2,
    process.env.SERPER_API_KEY_3,
].filter(Boolean) as string[]

async function callGroqWithRetry(keys: string[], prompt: string): Promise<string> {
    const shuffled = [...keys].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const groq = new Groq({ apiKey: shuffled[i] })
            const completion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                temperature: 0.3
            })
            return completion.choices[0].message.content || '{"items": []}'
        } catch (err) {
            console.warn(`Groq key ${i + 1} failed, trying next...`, err instanceof Error ? err.message : '')
            if (i === Math.min(shuffled.length, 3) - 1) throw err
        }
    }
    throw new Error('Toutes les clés Groq ont échoué')
}

async function callSerperWithRetry(keys: string[], query: string, type: 'search' | 'maps' = 'maps') {
    const shuffled = [...keys].sort(() => Math.random() - 0.5)
    for (let i = 0; i < Math.min(shuffled.length, 3); i++) {
        try {
            const res = await axios.post(
                `https://google.serper.dev/${type}`,
                { q: query, gl: 'bj', hl: 'fr' },
                { headers: { 'X-API-KEY': shuffled[i], 'Content-Type': 'application/json' }, timeout: 15000 }
            )
            return type === 'maps' ? (res.data.places || []) : (res.data.organic || [])
        } catch (err) {
            console.warn(`Serper key ${i + 1} failed, trying next...`, err instanceof Error ? err.message : '')
            if (i === Math.min(shuffled.length, 3) - 1) throw err
        }
    }
    return []
}

export async function POST(req: Request) {
    try {
        if (!supabaseUrl || !supabaseKey) { return NextResponse.json({ error: 'Config Supabase manquante' }, { status: 500 }) }
        const supabase = createClient(supabaseUrl, supabaseKey)
        const body = await req.json()
        const { client_name, client_email, client_phone, destination, start_date, end_date, budget, activities, notes } = body

        if (!client_name || !destination) {
            return NextResponse.json({ error: 'Nom du client et destination requis.' }, { status: 400 })
        }

        // 1. Serper Searches en Parallèle
        const [hotels, restaurants, places] = await Promise.all([
            callSerperWithRetry(serperApiKeys, `hotel ${destination} Benin`),
            callSerperWithRetry(serperApiKeys, `restaurant ${destination} Benin`),
            callSerperWithRetry(serperApiKeys, `activités lieux à visiter ${destination} Benin`, 'search')
        ])

        // 2. Prompting LLM
        const aiPrompt = `Tu es le meilleur agent de conciergerie VIP au Bénin.
Conçois une proposition d'itinéraire détaillée et luxueuse pour un client de Retour Gagnant.
Voici les détails du client :
- Nom : ${client_name}
- Destination : ${destination}
- Dates : ${start_date} au ${end_date}
- Budget : ${budget || 'Non précisé'}
- Préférences d'activités : ${activities || 'Non précisé'}
- Notes additionnelles : ${notes || 'Aucune'}

Voici les données brutes sur la destination (utilise ces données réelles pour formuler tes propositions uniques) :
HOTELS : ${JSON.stringify(hotels.slice(0, 10))}
RESTAURANTS : ${JSON.stringify(restaurants.slice(0, 5))}
ACTIVITES : ${JSON.stringify(places.slice(0, 5))}

Génère un objet JSON structuré avec la clé "items" contenant la liste des "slides" de la proposition dans cet ordre logique.
Chaque item doit respecter ce format :
{
  "type": "hero" | "hotel" | "restaurant" | "activity" | "transport" | "pricing",
  "title": "Titre accrocheur",
  "description": "Description professionnelle, immersive et chaleureuse du lieu/de l'activité (2-3 phrases).",
  "location": "Lieu (ex: Ouidah, Bénin)",
  "original_price": 50000, (Prix estimé par jour en FCFA. Nombre entier. Si non applicable, met 0)
  "image_url": "Url de l'image (si disponible dans les données brutes, sinon null)"
}

Règles :
1. "hero" : La première slide d'accueil chaleureuse. (original_price: 0)
2. "hotel" : Propose le meilleur hôtel des données.
3. "restaurant" : Propose le meilleur restaurant.
4. "activity" : Propose 1 ou 2 activités/lieux à visiter (utilise les données de recherche).
5. "transport" : Propose un véhicule de location avec chauffeur VIP (Prix estimatif: 40000 FCFA/jour).
6. "pricing" : Slide finale de conclusion de devis et recap (original_price: 0).
7. Ne retourne QUE le JSON.

Format JSON attendu :
{
  "items": [
    { "type": "hero", "title": "...", "description": "...", "location": "...", "original_price": 0, "image_url": null },
    ...
  ]
}`

        const aiResponse = await callGroqWithRetry(groqApiKeys, aiPrompt)
        const parsed = JSON.parse(aiResponse)
        interface ProposalItem {
            type: string;
            title: string;
            description: string;
            location: string;
            original_price: number;
            image_url: string | null;
        }
        const items: ProposalItem[] = parsed.items || []

        // 3. Sauvegarde dans DB
        const { data: proposal, error: proposalError } = await supabase.from('ai_client_proposals').insert({
            client_name,
            client_email,
            client_phone,
            destination,
            start_date: start_date || null,
            end_date: end_date || null,
            budget,
            activities,
            notes,
            status: 'draft',
            total_amount: items.reduce((acc: number, item: ProposalItem) => acc + (item.original_price || 0), 0)
        }).select().single()

        if (proposalError) throw proposalError

        const proposalItemsToInsert = items.map((item: ProposalItem, index: number) => ({
            proposal_id: proposal.id,
            type: item.type,
            title: item.title,
            description: item.description,
            location: item.location || destination,
            image_url: item.image_url,
            original_price: item.original_price || 0,
            selling_price: item.original_price || 0,
            order_index: index,
        }))

        const { error: itemsError } = await supabase.from('ai_proposal_items').insert(proposalItemsToInsert)
        if (itemsError) throw itemsError

        return NextResponse.json({ success: true, proposalId: proposal.id, secretKey: proposal.secret_key })

    } catch (err) {
        console.error('Erreur API Generate Proposal:', err)
        const message = err instanceof Error ? err.message : 'Erreur interne'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
