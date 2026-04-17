import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { verifyApiAuth } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Convertit 'YYYY-MM' → [startISO, endISO) borné au mois exact
const monthRange = (periode: string) => {
    const [y, m] = periode.split('-').map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1)).toISOString()
    const end   = new Date(Date.UTC(y, m,     1)).toISOString()
    return { start, end }
}

const isValidPeriode = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p)

// ══════════════════════════════════════════════════════════════
// GET /api/admin/comptabilite/cloture
// Retourne la liste des périodes clôturées
// ══════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const supabase = createClient(supabaseUrl, serviceKey)
    const { data, error } = await supabase
        .from('clotures_mensuelles')
        .select('*')
        .order('periode', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ clotures: data || [] })
}

// ══════════════════════════════════════════════════════════════
// POST /api/admin/comptabilite/cloture
// Body: { periode: 'YYYY-MM', notes?: string, fichier_export_url?: string }
// Clôture la période = snapshot figé + verrou UI
// ══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const body = await request.json().catch(() => ({}))
    const periode: string = body.periode
    const notes: string | null = body.notes ?? null
    const fichier_export_url: string | null = body.fichier_export_url ?? null

    if (!periode || !isValidPeriode(periode)) {
        return NextResponse.json({ error: 'Période invalide (format attendu YYYY-MM)' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Empêcher double clôture
    const { data: existing } = await supabase
        .from('clotures_mensuelles')
        .select('id, periode')
        .eq('periode', periode)
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ error: 'Période déjà clôturée' }, { status: 409 })
    }

    const { start, end } = monthRange(periode)

    // Snapshot : on calcule les totaux figés sur la période
    const [docsRes, paiemRes, depRes] = await Promise.all([
        supabase.from('documents_financiers')
            .select('id, type, total, total_tva, status, created_at')
            .gte('created_at', start).lt('created_at', end),
        supabase.from('paiements_manuels')
            .select('id, montant, date_paiement')
            .gte('date_paiement', start.slice(0, 10)).lt('date_paiement', end.slice(0, 10)),
        supabase.from('depenses')
            .select('id, montant, date_depense')
            .gte('date_depense', start.slice(0, 10)).lt('date_depense', end.slice(0, 10)),
    ])

    const docs = docsRes.data || []
    const paiements = paiemRes.data || []
    const depenses = depRes.data || []

    const totalEncaisse = paiements.reduce((s, p) => s + Number(p.montant || 0), 0)
    const totalDepenses = depenses.reduce((s, d) => s + Number(d.montant || 0), 0)
    const totalTVA = docs
        .filter(d => d.type === 'facture' && d.status === 'paye')
        .reduce((s, d) => s + Number(d.total_tva || 0), 0)
    const beneficeNet = totalEncaisse - totalDepenses

    // Récupérer le nom du clôtureur
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, role')
        .eq('id', auth.userId!)
        .maybeSingle()

    // Hash d'intégrité = snapshot des IDs + totaux (détecte les altérations)
    const snapshotPayload = JSON.stringify({
        periode,
        doc_ids: docs.map(d => d.id).sort(),
        paiement_ids: paiements.map(p => p.id).sort(),
        depense_ids: depenses.map(d => d.id).sort(),
        totalEncaisse, totalDepenses, totalTVA, beneficeNet,
    })
    const hash = createHash('sha256').update(snapshotPayload).digest('hex')

    const { data: inserted, error } = await supabase
        .from('clotures_mensuelles')
        .insert({
            periode,
            cloture_par: auth.userId,
            cloture_par_nom: profile?.full_name || null,
            total_encaisse: totalEncaisse,
            total_depenses: totalDepenses,
            total_tva: totalTVA,
            benefice_net: beneficeNet,
            nb_documents: docs.length,
            nb_paiements: paiements.length,
            nb_depenses: depenses.length,
            fichier_export_url,
            hash_integrite: hash,
            notes,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, cloture: inserted })
}

// ══════════════════════════════════════════════════════════════
// DELETE /api/admin/comptabilite/cloture?periode=YYYY-MM
// Rouvre une période clôturée (admin/ceo uniquement)
// ══════════════════════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const { searchParams } = new URL(request.url)
    const periode = searchParams.get('periode')
    if (!periode || !isValidPeriode(periode)) {
        return NextResponse.json({ error: 'Période invalide' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase
        .from('clotures_mensuelles')
        .delete()
        .eq('periode', periode)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
