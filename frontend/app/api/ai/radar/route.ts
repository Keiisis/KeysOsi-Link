import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import axios from 'axios';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialiser le SDK Groq (Prendre la clé configurée)
const groqApiKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
    process.env.GROQ_API_KEY_6
].filter(Boolean);

const serperApiKeys = [
    process.env.SERPER_API_KEY_1,
    process.env.SERPER_API_KEY_2,
    process.env.SERPER_API_KEY_3,
    process.env.SERPER_API_KEY
].filter(Boolean);

export async function POST(req: Request) {
    try {
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { keyword, city } = await req.json();

        if (!keyword || !city) {
            return NextResponse.json({ error: 'Mot clé et ville obligatoires' }, { status: 400 });
        }

        if (serperApiKeys.length === 0) {
            return NextResponse.json(
                { error: 'Clés API Serper.dev manquantes (Veuillez ajouter SERPER_API_KEY_1 dans votre .env.local)' }, 
                { status: 500 }
            );
        }

        if (groqApiKeys.length === 0) {
            return NextResponse.json(
                { error: 'Clés API Groq manquantes' }, 
                { status: 500 }
            );
        }

        const serperApiKey = serperApiKeys[Math.floor(Math.random() * serperApiKeys.length)];
        const groqApiKey = groqApiKeys[Math.floor(Math.random() * groqApiKeys.length)];
        const groq = new Groq({ apiKey: groqApiKey });

        const exactQuery = `${keyword} à ${city}, Bénin`;

        // 1. Scraping avec Serper.dev
        const searchResponse = await axios.post(
            'https://google.serper.dev/places',
            { q: exactQuery, gl: 'bj', hl: 'fr' },
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        );

        const places = searchResponse.data.places;

        if (!places || places.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // On prend les 5 meilleurs pour ne pas exploser les tokens ou timeouts (Vercel limits)
        const top5Places = places.slice(0, 5);

        // 2. Traitement avec Groq AI
        const aiPrompt = `
Tu es un expert en marketing digital au Bénin.
Voici des données brutes de lieux géographiques récupérés sur Google Maps :
${JSON.stringify(top5Places)}

IMPORTANT: 
1. Ne retourne QUE l'objet JSON contenant la liste, aucun autre texte.
2. Pour chaque lieu, rédige une courte "description_marketing" percutante (3 phrases max).
3. Si un numéro de téléphone est fourni, formate-le IMPERATIVEMENT au format Whatsapp international pour le Bénin, c\'est-à-dire : "+229XXXXXXXX". S\'il n\'y a pas de numéro, laisse null.
4. Laisse le titre, la note, l\'adresse tels quels.
5. S'il n'y a pas de photo_url, laisse null.

Format de réponse attendu :
{
  "results": [
    {
      "title": "Nom du lieu",
      "address": "Adresse complète",
      "phone": "+229XXXXXXXX",
      "rating": 4.5,
      "reviews_count": 120,
      "description": "Description marketing générée par l'IA...",
      "original_photo_url": "thumbnailUrl du lieu (le lien de l'image)"
    }
  ]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: aiPrompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
            temperature: 0.2
        });

        const aiOutput = JSON.parse(chatCompletion.choices[0].message.content || '{"results": []}');
        const enhancedLeads = aiOutput.results || [];

        // 3. Téléchargement et Stockage Sécurisé
        const savedLeads = [];

        // Créer le bucket de stockage s'il n'existe pas
        try {
            await supabase.storage.createBucket('leads-images', { public: true });
        } catch(e) { /* ignore if exists */ }

        for (const lead of enhancedLeads) {
            let finalPhotoUrl = null;

            if (lead.original_photo_url) {
                try {
                    // Télécharger la photo depuis Google
                    const photoResponse = await axios.get(lead.original_photo_url, { responseType: 'arraybuffer' });
                    const fileData = photoResponse.data;
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

                    const { error } = await supabase.storage.from('leads-images')
                        .upload(`radar/${fileName}`, fileData, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (!error) {
                        const { data: pubData } = supabase.storage.from('leads-images').getPublicUrl(`radar/${fileName}`);
                        finalPhotoUrl = pubData.publicUrl;
                    }
                } catch (imgError) {
                    console.error("Problème téléchargement image:", lead.title);
                }
            }

            // Insertion dans la Base de données Supabase
            const { data: dbItem, error: dbError } = await supabase.from('ai_prospection_leads').insert({
                keyword: keyword,
                city: city,
                title: lead.title,
                address: lead.address,
                phone: lead.phone,
                description: lead.description,
                rating: lead.rating ? String(lead.rating) : null,
                reviews_count: lead.reviews_count ? parseInt(lead.reviews_count) : null,
                photo_url: finalPhotoUrl
            }).select('*').single();

            if (!dbError && dbItem) {
                savedLeads.push(dbItem);
            } else {
                // If insertion failed, push constructed info to still show exactly what was found
                 savedLeads.push({
                    ...lead,
                    photo_url: finalPhotoUrl || lead.original_photo_url
                });
            }
        }

        return NextResponse.json({ success: true, data: savedLeads });

    } catch (error: any) {
        console.error("Erreur API Radar:", error);
        return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
    }
}
