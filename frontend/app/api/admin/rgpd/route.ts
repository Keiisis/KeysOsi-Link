import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { verifyApiAuth } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ══════════════════════════════════════════════════════════════
// RGPD — Droit d'accès / portabilité (GET) & droit à l'effacement (POST)
// Outil admin pour honorer une demande d'un utilisateur, identifié par email.
//
// • Tables « effaçables » → suppression pure (données sans obligation légale).
// • Tables « comptables/légales » → ANONYMISATION (la pièce reste conservée
//   pour l'obligation légale, mais les données personnelles sont neutralisées).
// Chaque opération est tolérante (table/colonne absente = ignorée) et tracée.
// ══════════════════════════════════════════════════════════════

// Tables contenant des données personnelles, avec la colonne email.
const EMAIL_TABLES: { table: string; col: string; mode: 'delete' | 'anonymize' }[] = [
    { table: 'newsletter_subscribers', col: 'email',          mode: 'delete' },
    { table: 'client_documents',       col: 'client_email',   mode: 'delete' },
    { table: 'leads',                  col: 'email',           mode: 'delete' },
    { table: 'nationality_leads',      col: 'email',           mode: 'delete' },
    { table: 'appointments',           col: 'client_email',    mode: 'delete' },
    { table: 'contact_messages',       col: 'email',           mode: 'delete' },
    // Données rattachées à une obligation légale (comptabilité) → anonymisées
    { table: 'orders',                 col: 'customer_email',  mode: 'anonymize' },
    { table: 'documents_financiers',   col: 'client_email',    mode: 'anonymize' },
]

const ANON = '[supprimé — RGPD]'

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

// GET /api/admin/rgpd?email=… → export de toutes les données liées (droit d'accès)
export async function GET(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const email = (new URL(request.url).searchParams.get('email') || '').toLowerCase().trim()
    if (!isEmail(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })

    const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey)
    const out: Record<string, unknown> = { email, generated_at: new Date().toISOString(), data: {} }

    for (const { table, col } of EMAIL_TABLES) {
        try {
            const { data } = await supabase.from(table).select('*').eq(col, email)
            if (data && data.length) (out.data as Record<string, unknown>)[table] = data
        } catch { /* table absente */ }
    }
    return NextResponse.json(out)
}

// POST /api/admin/rgpd  { email, confirm: true } → efface/anonymise (droit à l'effacement)
export async function POST(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').toLowerCase().trim()
    if (!isEmail(email)) return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    if (body.confirm !== true) {
        return NextResponse.json({ error: 'Confirmation requise (confirm: true).' }, { status: 400 })
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, serviceKey)
    const report: Record<string, string> = {}

    for (const { table, col, mode } of EMAIL_TABLES) {
        try {
            if (mode === 'delete') {
                const { data } = await supabase.from(table).delete().eq(col, email).select('id')
                if (data) report[table] = `supprimé (${data.length})`
            } else {
                // Anonymisation : neutralise les champs PII usuels s'ils existent
                const patch: Record<string, string> = {}
                for (const f of ['customer_email', 'client_email', 'email']) patch[f] = ANON
                for (const f of ['customer_name', 'client_nom', 'client_prenom', 'client_phone', 'client_adresse']) patch[f] = ANON
                // On ne pousse que les colonnes acceptées : tentative tolérante
                const { data, error } = await supabase.from(table).update(patch).eq(col, email).select('id')
                if (!error && data) report[table] = `anonymisé (${data.length})`
                else if (error) {
                    // Réessai minimal : n'anonymiser que la colonne email connue
                    const { data: d2 } = await supabase.from(table).update({ [col]: ANON }).eq(col, email).select('id')
                    if (d2) report[table] = `anonymisé partiel (${d2.length})`
                }
            }
        } catch {
            report[table] = 'ignoré (table/colonne absente)'
        }
    }

    // Journalise la demande d'effacement (preuve de traitement RGPD)
    try {
        await supabase.from('security_logs').insert({
            action: 'rgpd_erasure',
            details: { email, report, by: auth.userId, at: new Date().toISOString() },
        })
    } catch { /* table de logs optionnelle */ }

    return NextResponse.json({ success: true, email, report })
}
