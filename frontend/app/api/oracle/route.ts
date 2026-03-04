import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import { sendEmail, EMAIL_TEMPLATES, getEmailConfig } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

interface OracleAnswers {
    lien_benin?: string;
    preuve_origine?: string[];
    motivation?: string;
    pays_residence?: string;
    message_libre?: string;
    origin?: string;
    objective?: string;
    timeline?: string;
    budget?: string;
    experience?: string;
}

const serviceMapping: Record<string, { service: string, slug: string }> = {
    'nationalite': { service: 'Passeport & Documents', slug: 'passeport' },
    'investir': { service: 'Investissement', slug: 'investissement' },
    'construire': { service: 'Construction', slug: 'construction' },
    'business': { service: "Création d'Entreprise", slug: 'business' },
    'culture': { service: 'Guide Culturel', slug: 'culture' },
    'logement': { service: 'Acheter ou Louer', slug: 'logement' },
}

// ═══════════════════════════════════════════════════════════════
// Algorithme de scoring multi-critères (5 dimensions, 100 pts max)
//
//   1. Origines béninoises  → 0-20 pts
//   2. Objectif (clarté)    → 0-20 pts
//   3. Timeline (urgence)   → 0-15 pts
//   4. Budget               → 0-25 pts
//   5. Expérience terrain   → 0-20 pts
//
// Total possible : 100 pts
// ═══════════════════════════════════════════════════════════════
function calculateEligibilityScore(answers: OracleAnswers): number {
    let score = 0

    // ── 1. Origines (max 20 pts) ─────────────────────────────
    const originScores: Record<string, number> = {
        'oui': 20,      // Origines béninoises confirmées
        'partiel': 12,   // Liens familiaux/affectifs
        'non': 5,        // Intéressé mais pas de lien direct
    }
    score += originScores[answers.origin || ''] ?? 5

    // ── 2. Objectif (max 20 pts) ─────────────────────────────
    const objectiveScores: Record<string, number> = {
        'nationalite': 20,  // Très clair et spécifique
        'construire': 18,   // Projet concret
        'logement': 17,     // Besoin tangible
        'business': 16,     // Ambition entrepreneuriale
        'investir': 15,     // Intérêt financier
        'culture': 10,      // Exploration (moins urgent)
    }
    score += objectiveScores[answers.objective || ''] ?? 10

    // ── 3. Timeline / Urgence (max 15 pts) ───────────────────
    const timelineScores: Record<string, number> = {
        'urgent': 15,       // Prêt immédiatement = client chaud
        '6mois': 12,        // Court terme
        '1an': 8,           // Moyen terme
        'exploration': 4,   // Juste curieux
    }
    score += timelineScores[answers.timeline || ''] ?? 4

    // ── 4. Budget (max 25 pts) ───────────────────────────────
    const budgetScores: Record<string, number> = {
        'illimite': 25,     // Budget très confortable
        'grand': 20,        // Bon budget
        'moyen': 14,        // Budget raisonnable
        'petit': 7,         // Budget limité
    }
    score += budgetScores[answers.budget || ''] ?? 7

    // ── 5. Expérience terrain (max 20 pts) ───────────────────
    const experienceScores: Record<string, number> = {
        'oui': 20,          // Expérience = sérieux et déterminé
        'peu': 12,          // A commencé mais a besoin d'aide
        'jamais': 6,        // Débutant total
    }
    score += experienceScores[answers.experience || ''] ?? 6

    // Plafond à 100 et plancher à 15
    return Math.max(15, Math.min(100, score))
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { nom, prenom, email, whatsapp, answers } = body as {
            nom: string
            prenom: string
            email: string
            whatsapp: string
            answers: OracleAnswers
        }

        if (!answers || !answers.objective) {
            return NextResponse.json({ error: 'Réponses incomplètes' }, { status: 400 })
        }

        const clientName = `${prenom || ''} ${nom || ''}`.trim()

        // Determine recommended service
        const rec = serviceMapping[answers.objective] || serviceMapping['culture']
        const hasOrigins = answers.origin === 'oui' || answers.origin === 'partiel'

        // Calculate real multi-criteria score
        const finalScore = calculateEligibilityScore(answers)

        // Generate dynamic insights
        let dynamicInsights = [
            "Vos origines offrent un excellent potentiel pour cette démarche.",
            "L'analyse des documents mentionnés est très positive."
        ];

        try {
            if (process.env.GROQ_API_KEY) {
                const { object } = await generateObject({
                    model: groq('llama-3.3-70b-versatile'),
                    schema: z.object({
                        insights: z.array(z.string()).describe("3 points clés très pertinents, vendeurs et rassurants (max une phrase par point) concernant l'éligibilité de cette personne à la nationalité béninoise, ou son retour au Bénin. Parlez directement à la personne."),
                    }),
                    prompt: `Analysez ce profil d'une personne voulant obtenir la nationalité béninoise ou retourner au Bénin :
Prenom: ${prenom}
Pays de résidence: ${answers.pays_residence || 'Non défini'}
Lien avec le Bénin: ${answers.lien_benin || 'Non défini'}
Preuves d'origine: ${(answers.preuve_origine || []).join(', ')}
Motivation principale: ${answers.motivation || 'Non défini'}
Message libre: ${answers.message_libre || 'Aucun'}
Score d'éligibilité calculé: ${finalScore}%
Service recommandé: ${rec.service}

Générez 3 insights ou commentaires inspirants pertinents. Exprimez-vous de manière professionnelle, rassurante et très "premium".`,
                });

                dynamicInsights = object.insights;
            }
        } catch (aiError) {
            console.error("Erreur lors de la génération avec Groq:", aiError);
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: insertedLead, error } = await supabase.from('eligibility_results').insert({
            client_nom: nom || '',
            client_prenom: prenom || '',
            client_email: email || '',
            client_whatsapp: whatsapp || '',
            answers: answers,
            recommended_service: rec.service,
            recommended_slug: rec.slug,
            eligibility_score: finalScore,
            has_origins: hasOrigins,
            objective: answers.objective,
            is_contacted: false,
        }).select('id').single();

        if (error) throw error
        const leadId = insertedLead?.id || '';

        // Fire-and-forget emails
        (async () => {
            try {
                if (email) {
                    const aiReply = `Félicitations pour avoir complété le test de l'Oracle. Votre profil indique un score d'éligibilité de ${finalScore}%. Nous sommes ravis de vous accompagner vers "${rec.service}".`;
                    await sendEmail({
                        to: email,
                        subject: `Retour Gagnant — Les résultats de l'Oracle`,
                        html: EMAIL_TEMPLATES.autoReply(clientName || 'Cher client', aiReply),
                        context: 'auto_reply',
                        relatedId: leadId,
                    });
                }

                const config = await getEmailConfig();
                if (config.adminEmail) {
                    await sendEmail({
                        to: config.adminEmail,
                        subject: `🔮 Nouveau Lead Oracle — ${clientName || email}`,
                        html: EMAIL_TEMPLATES.newLeadNotification(clientName || 'Inconnu', email || 'Inconnu', finalScore, rec.service, 'L\'Oracle'),
                        context: 'lead_notification',
                        relatedId: leadId,
                    });
                }
            } catch (emailErr) {
                console.log('[ORACLE] Email send failed (non-blocking):', emailErr);
            }
        })();

        return NextResponse.json({
            success: true,
            result: {
                service: rec.service,
                slug: rec.slug,
                score: finalScore,
                hasOrigins,
                insights: dynamicInsights
            }
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
