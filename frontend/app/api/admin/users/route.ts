import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
    if (!serviceKey) return NextResponse.json({ error: 'Service key manquante' }, { status: 500 })

    const supabase = createClient(supabaseUrl, serviceKey)

    // Récupère tous les users auth + leurs profils
    const [authRes, profilesRes] = await Promise.all([
        supabase.auth.admin.listUsers({ perPage: 200 }),
        supabase.from('user_profiles').select('id, full_name, role, is_active, last_seen_at, created_at'),
    ])

    if (authRes.error) return NextResponse.json({ error: authRes.error.message }, { status: 500 })

    const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]))

    // SÉCURITÉ : on n'inclut QUE les utilisateurs présents dans user_profiles
    // (admin, agent, superadmin). Les clients n'ont PAS de user_profiles → exclus.
    // Plus de fallback 'agent' qui faisait apparaître les clients comme agents.
    const VALID_ROLES = ['agent', 'admin', 'super_admin', 'superadmin']

    const users = authRes.data.users
        .filter(u => {
            const profile = profileMap.get(u.id)
            return profile && VALID_ROLES.includes(profile.role)
        })
        .map(u => {
            const profile = profileMap.get(u.id)!
            return {
                id: u.id,
                email: u.email,
                full_name: profile.full_name || u.user_metadata?.full_name || 'Sans nom',
                role: profile.role,
                is_active: profile.is_active ?? true,
                last_seen_at: profile.last_seen_at || null,
                created_at: u.created_at,
            }
        })

    return NextResponse.json({ users })
}
