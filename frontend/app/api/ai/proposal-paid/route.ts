import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: Request) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const body = await req.json()
        const { proposal_id, client_email, client_name } = body

        if (!proposal_id) {
            return NextResponse.json({ error: 'proposal_id requis' }, { status: 400 })
        }

        // Marquer la proposition comme "paid"
        const { error } = await supabase
            .from('ai_client_proposals')
            .update({ status: 'paid' })
            .eq('id', proposal_id)

        if (error) {
            console.error('Erreur update proposal:', error)
            return NextResponse.json({ error: 'Mise à jour échouée' }, { status: 500 })
        }

        // Récupérer les détails de la proposition pour l'email
        const { data: proposal } = await supabase
            .from('ai_client_proposals')
            .select('*')
            .eq('id', proposal_id)
            .single()

        // Envoi d'email de confirmation (si le client a un email)
        if (client_email && proposal) {
            try {
                // Utiliser le système d'email existant du site
                await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.retourgagnantbenin.bj'}/api/notifications/email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: client_email,
                        subject: `✅ Confirmation de réservation — Voyage ${proposal.destination}`,
                        html: `
                        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #0f141e; color: white; border-radius: 16px; overflow: hidden;">
                            <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 32px; text-align: center;">
                                <h1 style="margin: 0; font-size: 28px; color: #0f141e; font-weight: 900;">Retour Gagnant</h1>
                                <p style="margin: 8px 0 0; color: #0f141e; opacity: 0.8; font-size: 14px;">Votre voyage est confirmé !</p>
                            </div>
                            <div style="padding: 32px;">
                                <h2 style="color: #F59E0B; font-size: 22px; margin-bottom: 8px;">Bonjour ${client_name || 'cher client'} 👋</h2>
                                <p style="color: #94a3b8; line-height: 1.8;">Nous avons bien reçu votre paiement pour votre voyage à <strong style="color: white;">${proposal.destination}</strong>.</p>
                                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin: 24px 0;">
                                    <p style="color: #94a3b8; margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Montant payé</p>
                                    <p style="color: #F59E0B; font-size: 32px; font-weight: 900; margin: 0;">${proposal.total_amount?.toLocaleString()} FCFA</p>
                                </div>
                                <p style="color: #94a3b8; line-height: 1.8;">Notre équipe va préparer tous les détails de votre séjour. Un agent vous contactera sous 24h pour finaliser les derniers arrangements.</p>
                                <p style="color: #64748b; font-size: 12px; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">© ${new Date().getFullYear()} Retour Gagnant — Voyages d'exception au Bénin</p>
                            </div>
                        </div>`
                    })
                })
            } catch (emailErr) {
                console.warn('Email de confirmation non envoyé:', emailErr)
                // Non bloquant : le paiement est validé même si l'email échoue
            }
        }

        return NextResponse.json({ success: true })

    } catch (err) {
        console.error('Erreur API proposal-paid:', err)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
