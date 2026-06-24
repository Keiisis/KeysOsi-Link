import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { collectByEmail } from '@/lib/rgpd/erase'
import { verifyRgpdToken } from '@/lib/rgpd/token'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ══════════════════════════════════════════════════════════════
// GET /api/rgpd/data?token=…
// Affiche l'aperçu des données de l'email VÉRIFIÉ par le jeton.
// Les documents sont seulement comptés/mentionnés, jamais affichés.
// ══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
    const token = new URL(request.url).searchParams.get('token') || ''
    const verified = verifyRgpdToken(token)
    if (!verified) {
        return NextResponse.json({ error: 'Lien invalide ou expiré. Refaites une demande depuis la page « Mes données ».' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const preview = await collectByEmail(supabase, verified.email)
    return NextResponse.json(preview)
}
