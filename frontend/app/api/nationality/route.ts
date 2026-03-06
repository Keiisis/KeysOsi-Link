import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import Groq from 'groq-sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// On préfère la clé Service Role côté serveur pour contourner les restrictions RLS (sécurité maximale)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null

const sendConfirmationEmail = async (data: {
    nom: string
    prenom: string
    email: string
    nationalite: string
    refId: string
    baseUrl: string
}) => {
    try {
        let emailContent = ''

        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: `Tu es le rédacteur institutionnel de "Retour Gagnant Bénin", la plateforme officielle de reconnaissance de la nationalité béninoise pour les afro-descendants. Ton rôle est de rédiger un email de confirmation de réception de dossier extrêmement formel, prestigieux, élégant et chaleureux. 
RÈGLES ABSOLUES :
1. AUCUN EMOJI. C'est strictement interdit.
2. Ton retour doit être au format HTML, uniquement la partie "corps du texte" (utilise des balises <p>, <strong>, <ul>... mais pas de <html> ni de <body>).
3. Adapte le discours à la personne (Nom, Nationalité d'origine).
4. Précise que le dossier est en cours de traitement par le service juridique et qu'ils peuvent suivre l'évolution via leur numéro de référence.
5. Sois solennel. C'est une démarche symbolique forte (le retour aux sources, la terre des ancêtres).`
                        },
                        {
                            role: 'user',
                            content: `Voici les informations du demandeur :\n- Nom complet : M/Mme ${data.prenom} ${data.nom}\n- Nationalité d'origine : ${data.nationalite}\n- Numéro de Référence : ${data.refId}\nRédige le corps de l'email de confirmation.`
                        }
                    ],
                    model: 'mixtral-8x7b-32768',
                    temperature: 0.3,
                })
                emailContent = completion.choices[0]?.message?.content || ''
            } catch (err) {
                console.error('[EMAIL] Erreur lors de la génération Groq, repli sur le texte par défaut.', err)
            }
        }

        // Fallback or Wrap inside a prestigious HTML container
        if (!emailContent) {
            emailContent = `
                <p>Cher(e) ${data.prenom} ${data.nom},</p>
                <p>Nous vous confirmons la bonne réception de votre demande de reconnaissance de la nationalité béninoise.</p>
                <p>Votre dossier porte la référence officielle : <strong>${data.refId}</strong>.</p>
                <p>Notre service juridique a d’ores et déjà entamé l’examen de vos pièces. Nous vous tiendrons informé(e) des prochaines étapes.</p>
                <p>La terre de vos ancêtres vous attend. Soyez le ou la bienvenu(e) au Bénin.</p>
                <p>Très respectueusement,<br>L'équipe Retour Gagnant</p>
            `
        }

        // 2. Fetch SMTP settings from DB (we do it here specifically to get the siteName earlier for the header)
        const { data: settingsData } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from_email', 'hero_title'])

        const settings: Record<string, string> = {}
        for (const s of settingsData || []) {
            settings[s.key] = s.value
        }

        const siteName = settings.hero_title || 'Retour Gagnant Bénin'
        const logoUrl = `${data.baseUrl}/logo.jpg`

        // Superbe Layout HTML Professionnel avec Logo
        const htmlBody = `
        <div style="font-family: 'Times New Roman', Times, serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; padding: 40px;">
            <div style="text-align: center; border-bottom: 2px solid #008751; padding-bottom: 20px; margin-bottom: 30px;">
                <img src="${logoUrl}" alt="${siteName}" width="60" height="60" style="border-radius: 12px; object-fit: cover; border: 2px solid #008751; margin-bottom: 16px;" />
                <h1 style="color: #008751; font-size: 24px; font-weight: normal; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Secrétariat à la Reconnaissance</h1>
                <h2 style="color: #333333; font-size: 14px; font-weight: normal; margin: 5px 0 0 0; letter-spacing: 1px;">REPUBLIQUE DU BENIN</h2>
            </div>
            <div style="color: #1a1a1a; font-size: 16px; line-height: 1.8; text-align: justify;">
                ${emailContent}
            </div>
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; color: #777777; font-size: 11px; font-family: Arial, sans-serif;">
                <p>Ceci est un document généré automatiquement. Conservez précieusement votre référence : <strong>${data.refId}</strong></p>
                <p>&copy; ${new Date().getFullYear()} ${siteName}. Tous droits réservés.</p>
            </div>
        </div>`

        // Already fetched above, omitting re-fetch

        if (settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
            const transporter = nodemailer.createTransport({
                host: settings.smtp_host,
                port: Number(settings.smtp_port) || 465,
                secure: Number(settings.smtp_port) === 465,
                auth: {
                    user: settings.smtp_user,
                    pass: settings.smtp_pass
                }
            })

            const fromString = `"${siteName} - Service Juridique" <${settings.smtp_from_email || settings.smtp_user}>`

            await transporter.sendMail({
                from: fromString,
                to: data.email,
                replyTo: settings.smtp_from_email || settings.smtp_user,
                subject: `Confirmation de réception - Dossier N° ${data.refId}`,
                html: htmlBody,
            })

            return true
        }

        console.log('[EMAIL] Mode simulation (SMTP non configuré) -> Envoi bloqué vers :', data.email)
        return false // On retourne false pour ne pas marquer "envoyé" s'il n'y a pas de vraie config SMTP
    } catch (error) {
        console.error('[EMAIL] Erreur fatale lors de l\'envoi via SMTP/Groq:', error)
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
        const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://retourgagnant.bj'
        const body = await request.json()
        const { nom, prenom, email } = body

        if (!nom || !prenom || !email) {
            return NextResponse.json(
                { error: 'Nom, prénom et email sont requis' },
                { status: 400 }
            )
        }

        const ref = `RG-NAT-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`

        // ══════════════════════════════════════════════════════════════
        // WHITELIST: Only insert columns that exist in the DB table.
        // Using ...body caused PostgreSQL errors because the client
        // sends extra fields (documents, last_step_completed, etc.)
        // that don't exist as columns in nationality_applications.
        // ══════════════════════════════════════════════════════════════
        const insertData: Record<string, unknown> = {
            application_ref: ref,
            status: 'soumis',
            submitted_at: new Date().toISOString(),
            // Identity
            nom,
            prenom,
            email,
            genre: body.genre || null,
            date_naissance: body.date_naissance || null,
            pays_naissance: body.pays_naissance || null,
            ville_naissance: body.ville_naissance || null,
            nationalite: body.nationalite || 'Non spécifiée',
            pays_residence: body.pays_residence || null,
            adresse_residence: body.adresse_residence || null,
            telephone: body.telephone || null,
            profession: body.profession || null,
            demande_depuis_benin: body.demande_depuis_benin ?? false,
            // Law
            knows_about_law: body.knows_about_law ?? false,
            is_afro_descendant: body.is_afro_descendant ?? null,
            afro_descendant_description: body.afro_descendant_description || body.motivation || '',
            // Ancestor 1
            ancestor1_nom: body.ancestor1_nom || null,
            ancestor1_prenom: body.ancestor1_prenom || null,
            ancestor1_date_naissance: body.ancestor1_date_naissance || null,
            ancestor1_lien_parente: body.ancestor1_lien_parente || null,
            ancestor1_vivant: body.ancestor1_vivant ?? null,
            ancestor1_nationalite: body.ancestor1_nationalite || null,
            ancestor1_pays_residence: body.ancestor1_pays_residence || null,
            ancestor1_autres_infos: body.ancestor1_autres_infos || null,
            // Ancestor 2
            ancestor2_nom: body.ancestor2_nom || null,
            ancestor2_prenom: body.ancestor2_prenom || null,
            ancestor2_date_naissance: body.ancestor2_date_naissance || null,
            ancestor2_lien_parente: body.ancestor2_lien_parente || null,
            ancestor2_vivant: body.ancestor2_vivant ?? null,
            ancestor2_nationalite: body.ancestor2_nationalite || null,
            ancestor2_pays_residence: body.ancestor2_pays_residence || null,
            ancestor2_autres_infos: body.ancestor2_autres_infos || null,
            // Document
            type_document_identite: body.type_document_identite || null,
            numero_document: body.numero_document || null,
            date_expiration_document: body.date_expiration_document || null,
            pays_delivrance: body.pays_delivrance || null,
            lieu_delivrance: body.lieu_delivrance || null,
            autorite_delivrance: body.autorite_delivrance || null,
            // Parents
            pere_nom: body.pere_nom || null,
            pere_prenom: body.pere_prenom || null,
            pere_date_naissance: body.pere_date_naissance || null,
            mere_nom: body.mere_nom || null,
            mere_prenom: body.mere_prenom || null,
            mere_date_naissance: body.mere_date_naissance || null,
            // Documents & Payment
            documents_uploaded: body.documents_uploaded || body.documents || [],
            amount: body.amount ?? 250,
            currency: body.currency || 'USD',
            payment_status: body.payment_ref ? 'payé' : 'en_attente',
            payment_ref: body.payment_ref || null,
            payment_method: body.payment_method || null,
            last_step_completed: body.last_step_completed ?? 6,
        }

        const { error: insertError } = await supabase
            .from('nationality_applications')
            .insert([insertData])

        if (insertError) {
            console.error('Insert error:', JSON.stringify(insertError))
            return NextResponse.json(
                { error: `Erreur DB: ${insertError.message}` },
                { status: 500 }
            )
        }

        // 2. Create message for admin/agents (only valid columns)
        await supabase.from('messages').insert([{
            nom: `${prenom} ${nom}`,
            email,
            telephone: body.telephone || null,
            sujet: `Demande de nationalité #${ref}`,
            message: `Nouvelle demande de nationalité béninoise.\n\nNom: ${prenom} ${nom}\nEmail: ${email}\nTéléphone: ${body.telephone || 'N/A'}\nRéférence: ${ref}\nMontant: ${body.amount || 250} ${body.currency || 'USD'}\n\nAfro-descendance: ${body.afro_descendant_description || 'Non précisée'}\n\nStatut Paiement: ${body.payment_ref ? 'Payé' : 'En attente'}`,
            type: 'nationality',
            lu: false,
        }])

        // 3. Send auto email to client
        const emailSent = await sendConfirmationEmail({
            nom,
            prenom,
            email,
            nationalite: body.nationalite || 'Non spécifiée',
            refId: ref,
            baseUrl,
        })

        return NextResponse.json({
            success: true,
            reference: ref,
            emailSent,
            message: 'Votre demande a été reçue avec succès.',
        })
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('Nationality API error:', errMsg)
        return NextResponse.json(
            { error: 'Une erreur est survenue lors du traitement. Veuillez réessayer.' },
            { status: 500 }
        )
    }
}
