import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// On préfère la clé Service Role côté serveur pour contourner les restrictions RLS (sécurité maximale)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const sendConfirmationEmail = async (data: {
    nom: string
    prenom: string
    email: string
    nationalite: string
    refId: string
}) => {
    try {
        // 1. Récupération du template dynamique
        const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('slug', 'nationality_confirmation')
            .eq('is_active', true)
            .single()

        if (!template) {
            console.warn('[EMAIL] Aucun template actif trouvé pour "nationality_confirmation".')
            return false
        }

        let htmlBody = template.html_body
        htmlBody = htmlBody.replace(/\{\{nom\}\}/g, data.nom)
        htmlBody = htmlBody.replace(/\{\{prenom\}\}/g, data.prenom)
        htmlBody = htmlBody.replace(/\{\{nationalite\}\}/g, data.nationalite)
        htmlBody = htmlBody.replace(/\{\{ref\}\}/g, data.refId)

        const resendKey = process.env.RESEND_API_KEY

        if (resendKey) {
            // Optionnel : permettre à l'admin de définir l'email d'envoi dans .env (ou via la table settings)
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'Retour Gagnant <contact@retourgagnant.bj>'

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${resendKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: [data.email],
                    subject: template.subject,
                    html: htmlBody,
                }),
            })

            if (!response.ok) {
                const errData = await response.json()
                console.error('[EMAIL] Erreur Resend (Domaine non vérifié ?):', errData)
                return false
            }
            return true
        }

        console.log('[EMAIL] Mode simulation (RESEND_API_KEY manquant) -> Envoi à :', data.email)
        return false // On retourne false pour ne pas marquer "envoyé" s'il n'y a pas de clé vraie
    } catch (error) {
        console.error('[EMAIL] Erreur fatale lors de l\'envoi:', error)
        return false
    }
}

export async function POST(request: NextRequest) {
    try {
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
