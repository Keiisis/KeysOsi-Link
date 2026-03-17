import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role — bypass RLS pour créer le profil et lier les documents
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { user_id, email, nom, prenom, phone, pays, ville } = body

        if (!user_id || !email) {
            return NextResponse.json({ error: 'user_id et email requis' }, { status: 400 })
        }

        // 1. Créer le profil client
        const { error: profileError } = await supabase
            .from('client_profiles')
            .upsert({
                id: user_id,
                email: email.toLowerCase().trim(),
                nom: nom || null,
                prenom: prenom || null,
                phone: phone || null,
                pays: pays || 'France',
                ville: ville || null,
            }, { onConflict: 'id' })

        if (profileError) {
            throw new Error(`Erreur création profil: ${profileError.message}`)
        }

        // 2. Lier les documents_financiers ayant le même client_email
        const { error: docError } = await supabase
            .from('documents_financiers')
            .update({ client_id: user_id })
            .eq('client_email', email.toLowerCase().trim())
            .is('client_id', null)

        if (docError) {
            console.warn('Liaison documents:', docError.message)
        }

        // 3. Lier les dossiers de suivi ayant le même client_email
        const { error: dossierError } = await supabase
            .from('dossier_tracking')
            .update({ client_id: user_id })
            .eq('client_email', email.toLowerCase().trim())
            .is('client_id', null)

        if (dossierError) {
            console.warn('Liaison dossiers:', dossierError.message)
        }

        // 4. Compter ce qui a été lié
        const { count: docsCount } = await supabase
            .from('documents_financiers')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user_id)

        const { count: dossiersCount } = await supabase
            .from('dossier_tracking')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', user_id)

        return NextResponse.json({
            success: true,
            linked: {
                documents: docsCount || 0,
                dossiers: dossiersCount || 0,
            },
        })

    } catch (err) {
        console.error('Erreur API client/register:', err)
        const message = err instanceof Error ? err.message : 'Erreur interne'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
