import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import axios from 'axios'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Pool de clés API avec rotation aléatoire
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
    process.env.SERPER_API_KEY
].filter(Boolean) as string[]

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST(req: Request) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { keyword, city } = await req.json()

        if (!keyword || !city) {
            return NextResponse.json({ error: 'Mot clé et ville obligatoires' }, { status: 400 })
        }

        if (serperApiKeys.length === 0) {
            return NextResponse.json(
                { error: 'Clés API Serper.dev manquantes. Ajoutez SERPER_API_KEY_1 dans les variables Vercel.' },
                { status: 500 }
            )
        }

        if (groqApiKeys.length === 0) {
            return NextResponse.json(
                { error: 'Clés API Groq manquantes. Ajoutez GROQ_API_KEY_1 dans les variables Vercel.' },
                { status: 500 }
            )
        }

        // Rotation aléatoire des clés
        const serperApiKey = pickRandom(serperApiKeys)
        const groqApiKey = pickRandom(groqApiKeys)
        const groq = new Groq({ apiKey: groqApiKey })

        // ═══════════════════════════════════════════════════════
        // 1. SCRAPING Google Maps via Serper.dev /maps endpoint
        // ═══════════════════════════════════════════════════════
        const searchQuery = `${keyword} ${city} Benin`

        const searchResponse = await axios.post(
            'https://google.serper.dev/maps',
            { q: searchQuery, gl: 'bj', hl: 'fr' },
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        )

        const places = searchResponse.data.places

        if (!places || places.length === 0) {
            return NextResponse.json({ success: true, data: [], message: 'Aucun résultat trouvé pour cette recherche.' })
        }

        // On prend les 8 meilleurs résultats
        const topPlaces = places.slice(0, 8)

        // ═══════════════════════════════════════════════════════
        // 2. ENRICHISSEMENT IA avec Groq (Llama-3)
        // ═══════════════════════════════════════════════════════
        const aiPrompt = `Tu es un expert en marketing digital au Bénin.
Voici des données brutes de lieux récupérés sur Google Maps :
${JSON.stringify(topPlaces)}

INSTRUCTIONS STRICTES :
1. Ne retourne QUE l'objet JSON, aucun autre texte.
2. Pour chaque lieu, rédige une "description" marketing percutante (3 phrases max).
3. Si un "phoneNumber" est fourni, formate-le au format WhatsApp international Bénin : "+229XXXXXXXX". Sinon, mets null.
4. Conserve le titre ("title"), la note ("rating"), le nombre d'avis ("ratingCount"), et l'adresse ("address") tels quels.
5. Conserve le lien "thumbnailUrl" dans le champ "original_photo_url". S'il n'existe pas, mets null.

Format de réponse attendu :
{
  "results": [
    {
      "title": "Nom du lieu",
      "address": "Adresse complète",
      "phone": "+229XXXXXXXX",
      "rating": 4.5,
      "reviews_count": 120,
      "description": "Description marketing générée...",
      "original_photo_url": "https://lh3.googleusercontent.com/..."
    }
  ]
}`

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: aiPrompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            temperature: 0.2
        })

        const aiOutput = JSON.parse(chatCompletion.choices[0].message.content || '{"results": []}')
        const enhancedLeads = aiOutput.results || []

        // ═══════════════════════════════════════════════════════
        // 3. STOCKAGE SÉCURISÉ (Images + Base de données)
        // ═══════════════════════════════════════════════════════
        const savedLeads = []

        // Créer le bucket de stockage s'il n'existe pas
        await supabase.storage.createBucket('leads-images', { public: true }).catch(() => { /* ignore if exists */ })

        for (const lead of enhancedLeads) {
            let finalPhotoUrl: string | null = null

            if (lead.original_photo_url) {
                try {
                    const photoResponse = await axios.get(lead.original_photo_url, {
                        responseType: 'arraybuffer',
                        timeout: 8000
                    })
                    const fileData = photoResponse.data
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

                    const { error: uploadError } = await supabase.storage.from('leads-images')
                        .upload(`radar/${fileName}`, fileData, {
                            contentType: 'image/jpeg',
                            upsert: true
                        })

                    if (!uploadError) {
                        const { data: pubData } = supabase.storage.from('leads-images').getPublicUrl(`radar/${fileName}`)
                        finalPhotoUrl = pubData.publicUrl
                    }
                } catch {
                    console.warn('Image download skipped for:', lead.title)
                }
            }

            // Insertion dans la BDD Supabase
            const { data: dbItem, error: dbError } = await supabase.from('ai_prospection_leads').insert({
                keyword,
                city,
                title: lead.title,
                address: lead.address,
                phone: lead.phone,
                description: lead.description,
                rating: lead.rating ? String(lead.rating) : null,
                reviews_count: lead.reviews_count ? parseInt(String(lead.reviews_count)) : null,
                photo_url: finalPhotoUrl
            }).select('*').single()

            if (!dbError && dbItem) {
                savedLeads.push(dbItem)
            } else {
                savedLeads.push({
                    ...lead,
                    photo_url: finalPhotoUrl || lead.original_photo_url
                })
            }
        }

        return NextResponse.json({ success: true, data: savedLeads })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur serveur inconnue'
        console.error('Erreur API Radar:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
