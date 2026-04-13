import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role — bypasse RLS pour créer/lire les dossiers depuis l'app mobile
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET : tous les dossiers d'un client avec leurs documents ────────────────
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const clientId = searchParams.get('client_id')
        if (!clientId) return NextResponse.json({ error: 'client_id manquant' }, { status: 400 })

        const { data: dossiers, error } = await supabase
            .from('dossiers')
            .select('id, status, progress, service_type, notes, created_at, updated_at')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Pour chaque dossier, charger ses documents
        const dossiersWithDocs = await Promise.all((dossiers || []).map(async (d) => {
            const { data: docs } = await supabase
                .from('dossier_documents')
                .select('id, file_name, file_url, file_type, status, created_at')
                .eq('dossier_id', d.id)
                .order('created_at', { ascending: false })

            // Fallback sur table "documents" si dossier_documents vide
            let finalDocs = docs || []
            if (finalDocs.length === 0) {
                const { data: docs2 } = await supabase
                    .from('documents')
                    .select('id, file_name, file_url, file_type, status, created_at')
                    .eq('dossier_id', d.id)
                    .order('created_at', { ascending: false })
                finalDocs = docs2 || []
            }

            return { ...d, documents: finalDocs }
        }))

        return NextResponse.json({ dossiers: dossiersWithDocs })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
    }
}

// ─── POST : créer un dossier (commande service depuis mobile) ─────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { client_id, service_type, service_id, notes } = body

        if (!client_id || !service_type) {
            return NextResponse.json(
                { error: 'client_id et service_type sont requis' },
                { status: 400 }
            )
        }

        // S'assurer que le client existe dans client_profiles (cas inscription mobile)
        const { data: cp } = await supabase
            .from('client_profiles')
            .select('id')
            .eq('id', client_id)
            .single()

        if (!cp) {
            // Récupérer l'email depuis auth.users et créer le profil manquant
            const { data: authUser } = await supabase.auth.admin.getUserById(client_id)
            if (authUser?.user) {
                await supabase.from('client_profiles').upsert({
                    id: client_id,
                    email: authUser.user.email || '',
                    nom: authUser.user.user_metadata?.nom || null,
                    prenom: authUser.user.user_metadata?.prenom || null,
                    phone: authUser.user.user_metadata?.phone || null,
                    pays: 'France',
                }, { onConflict: 'id' })
            }
        }

        // Vérifier si un dossier actif existe déjà
        const { data: existing } = await supabase
            .from('dossiers')
            .select('id')
            .eq('client_id', client_id)
            .eq('service_type', service_type)
            .in('status', ['en_cours', 'en_attente', 'soumis', 'verifie', 'traitement', 'validation'])
            .limit(1)
            .single()

        if (existing) {
            return NextResponse.json({ exists: true, id: existing.id }, { status: 200 })
        }

        // Créer le dossier
        const { data, error } = await supabase
            .from('dossiers')
            .insert({
                client_id,
                service_type,
                service_id: service_id || null,
                status: 'soumis',
                progress: 0,
                notes: notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select('id')
            .single()

        if (error) {
            console.error('[api/mobile/dossiers POST]', error)
            return NextResponse.json(
                { error: error.message, code: error.code },
                { status: 500 }
            )
        }

        // Créer la notification client
        await supabase.from('notifications').insert({
            user_id: client_id,
            title: 'Dossier créé',
            body: `Votre dossier "${service_type}" a été créé. Notre équipe vous contactera sous 24h.`,
            type: 'dossier',
            is_read: false,
            created_at: new Date().toISOString(),
        })

        return NextResponse.json({ id: data.id }, { status: 201 })
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Erreur serveur' },
            { status: 500 }
        )
    }
}
