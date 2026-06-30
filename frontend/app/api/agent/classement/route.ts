import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { verifyApiAuth } from '@/lib/api-auth'
import { categorize } from '@/lib/classement/categories'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// ══════════════════════════════════════════════════════════════
// Classement Client — API (accessible agents ET admins)
//   GET   → liste complète + stats par catégorie
//   PATCH → maj notes / statut / catégorie d'un client (+ last_review_at)
//   POST  → { action:'backfill' } import des clients existants
//           { action:'add', ... } ajout manuel
// ══════════════════════════════════════════════════════════════

function sb(): SupabaseClient { return createClient(supabaseUrl, serviceKey) }
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

export async function GET(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'agent')
    if (!auth.authenticated) return auth.error!

    const supabase = sb()
    const { data, error } = await supabase
        .from('client_classement')
        .select('*')
        .order('first_contact_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const clients = data || []
    const stats: Record<string, number> = {}
    for (const c of clients) stats[c.service_category] = (stats[c.service_category] || 0) + 1

    return NextResponse.json({ clients, total: clients.length, stats })
}

export async function PATCH(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'agent')
    if (!auth.authenticated) return auth.error!

    const body = await request.json().catch(() => ({}))
    const id = String(body.id || '')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const patch: Record<string, unknown> = { last_review_at: new Date().toISOString() }
    if (typeof body.notes === 'string') patch.notes = body.notes
    if (typeof body.status === 'string') patch.status = body.status
    if (typeof body.service_category === 'string') patch.service_category = body.service_category

    const supabase = sb()
    const { data, error } = await supabase
        .from('client_classement').update(patch).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, client: data })
}

export async function POST(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'agent')
    if (!auth.authenticated) return auth.error!

    const body = await request.json().catch(() => ({}))
    const supabase = sb()

    // ── Ajout manuel d'un client ──
    if (body.action === 'add') {
        const email = String(body.email || '').toLowerCase().trim()
        if (!isEmail(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
        const { data: existing } = await supabase.from('client_classement').select('id').eq('email', email).maybeSingle()
        if (existing) return NextResponse.json({ error: 'Ce client existe déjà.' }, { status: 409 })
        const { data, error } = await supabase.from('client_classement').insert({
            email,
            full_name: body.full_name || null,
            phone: body.phone || null,
            service_category: categorize(body.service_category || body.service_label),
            service_label: body.service_label || null,
            source: 'manuel',
            status: 'nouveau',
            notes: body.notes || null,
            first_contact_at: body.first_contact_at || new Date().toISOString(),
        }).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, client: data })
    }

    // ── Backfill : importe les clients existants des autres tables ──
    if (body.action === 'backfill') {
        const { data: existingRows } = await supabase.from('client_classement').select('email')
        const known = new Set((existingRows || []).map(r => (r.email || '').toLowerCase()))
        const toInsert = new Map<string, Record<string, unknown>>()

        const add = (email: string, row: Record<string, unknown>) => {
            const e = (email || '').toLowerCase().trim()
            if (!e || !isEmail(e) || known.has(e) || toInsert.has(e)) return
            toInsert.set(e, { ...row, email: e })
        }

        // 1) Prospects nationalité / éligibilité
        try {
            const { data } = await supabase.from('eligibility_results')
                .select('client_nom, client_prenom, client_email, client_whatsapp, recommended_service, objective, created_at')
            for (const r of data || []) {
                add(r.client_email, {
                    full_name: `${r.client_prenom || ''} ${r.client_nom || ''}`.trim() || null,
                    phone: r.client_whatsapp || null,
                    service_category: categorize(r.recommended_service || r.objective),
                    service_label: r.recommended_service || r.objective || null,
                    source: 'backfill', status: 'nouveau',
                    first_contact_at: r.created_at || new Date().toISOString(),
                })
            }
        } catch { /* table absente */ }

        // 2) Rendez-vous
        try {
            const { data } = await supabase.from('rdv_requests')
                .select('client_email, motif, notes, created_at')
            for (const r of data || []) {
                const notes = String(r.notes || '')
                const nameMatch = notes.match(/__VISITOR__:\s*([^|]+)/)
                const telMatch = notes.match(/Tel:\s*([^\n|]+)/)
                add(r.client_email, {
                    full_name: nameMatch ? nameMatch[1].trim() : null,
                    phone: telMatch ? telMatch[1].trim() : null,
                    service_category: categorize(r.motif),
                    service_label: r.motif || null,
                    source: 'backfill', status: 'nouveau',
                    first_contact_at: r.created_at || new Date().toISOString(),
                })
            }
        } catch { /* table absente */ }

        // 3) Messages de contact
        try {
            const { data } = await supabase.from('messages')
                .select('nom, prenom, email, sujet, created_at')
            for (const r of data || []) {
                add(r.email, {
                    full_name: `${r.prenom || ''} ${r.nom || ''}`.trim() || null,
                    phone: null,
                    service_category: categorize(r.sujet),
                    service_label: r.sujet || null,
                    source: 'backfill', status: 'nouveau',
                    first_contact_at: r.created_at || new Date().toISOString(),
                })
            }
        } catch { /* table absente */ }

        const rows = [...toInsert.values()]
        if (rows.length === 0) return NextResponse.json({ success: true, imported: 0 })

        // Insertion par lots de 200
        let imported = 0
        for (let i = 0; i < rows.length; i += 200) {
            const chunk = rows.slice(i, i + 200)
            const { data, error } = await supabase.from('client_classement').insert(chunk).select('id')
            if (!error && data) imported += data.length
        }
        return NextResponse.json({ success: true, imported })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
