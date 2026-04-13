import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── GET : liste des événements publiés ──────────────────────────────────────
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const featured = searchParams.get('featured')
        const clientId = searchParams.get('client_id') // pour vérifier inscriptions

        let query = supabase
            .from('events')
            .select(`
                id, title, slug, description, short_description,
                start_date, end_date, location, address,
                price_standard, price_vip, currency,
                max_capacity, max_vip_seats, status,
                is_featured, cover_image, category,
                event_images(image_url, is_cover)
            `)
            .eq('status', 'published')
            .order('start_date', { ascending: true })

        if (featured === 'true') query = query.eq('is_featured', true)

        const { data: events, error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        // Si client_id fourni, enrichir avec les inscriptions du client
        let registrationsMap: Record<string, { id: string; status: string; ticket_type: string }> = {}
        if (clientId && events && events.length > 0) {
            const eventIds = events.map((e: Record<string, unknown>) => e.id)
            const { data: regs } = await supabase
                .from('event_registrations')
                .select('id, event_id, status, ticket_type')
                .eq('client_id', clientId)
                .in('event_id', eventIds)

            if (regs) {
                registrationsMap = regs.reduce((acc: Record<string, { id: string; status: string; ticket_type: string }>, r: Record<string, string>) => {
                    acc[r.event_id] = { id: r.id, status: r.status, ticket_type: r.ticket_type }
                    return acc
                }, {})
            }
        }

        const enriched = (events || []).map((e: Record<string, unknown>) => ({
            ...e,
            my_registration: registrationsMap[(e.id as string)] || null,
        }))

        return NextResponse.json({ events: enriched })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
    }
}

// ─── POST : s'inscrire à un événement ────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { event_id, client_id, ticket_type = 'standard', quantity = 1 } = body

        if (!event_id || !client_id) {
            return NextResponse.json({ error: 'event_id et client_id sont requis' }, { status: 400 })
        }

        // Vérifier que l'événement existe et est publié
        const { data: event, error: eventError } = await supabase
            .from('events')
            .select('id, title, price_standard, price_vip, currency, max_capacity, max_vip_seats, status, start_date')
            .eq('id', event_id)
            .eq('status', 'published')
            .single()

        if (eventError || !event) {
            return NextResponse.json({ error: 'Événement introuvable ou non disponible' }, { status: 404 })
        }

        // Vérifier si déjà inscrit
        const { data: existing } = await supabase
            .from('event_registrations')
            .select('id, status, ticket_type')
            .eq('event_id', event_id)
            .eq('client_id', client_id)
            .not('status', 'eq', 'cancelled')
            .maybeSingle()

        if (existing) {
            return NextResponse.json({
                exists: true,
                registration: existing,
                message: 'Vous êtes déjà inscrit à cet événement.',
            }, { status: 200 })
        }

        // Calculer le montant
        const unitPrice = ticket_type === 'vip'
            ? ((event as Record<string, unknown>).price_vip as number || (event as Record<string, unknown>).price_standard as number || 0)
            : ((event as Record<string, unknown>).price_standard as number || 0)
        const totalAmount = unitPrice * quantity
        const isFree = totalAmount === 0

        // Créer l'inscription
        const now = new Date().toISOString()
        const { data: registration, error: regError } = await supabase
            .from('event_registrations')
            .insert({
                event_id,
                client_id,
                ticket_type,
                quantity,
                unit_price: unitPrice,
                total_amount: totalAmount,
                currency: (event as Record<string, unknown>).currency as string || 'XOF',
                status: isFree ? 'confirmed' : 'pending_payment',
                payment_status: isFree ? 'free' : 'pending',
                created_at: now,
                updated_at: now,
            })
            .select('id, status, total_amount, currency, ticket_type')
            .single()

        if (regError) {
            console.error('[POST /api/mobile/events]', regError)
            return NextResponse.json({ error: regError.message }, { status: 500 })
        }

        // Notification client (non bloquant)
        supabase.from('notifications').insert({
            user_id: client_id,
            title: isFree ? 'Inscription confirmée !' : 'Inscription enregistrée',
            body: isFree
                ? `Votre inscription à "${(event as Record<string, unknown>).title}" est confirmée. À très bientôt !`
                : `Votre inscription à "${(event as Record<string, unknown>).title}" est en attente de paiement (${totalAmount.toLocaleString('fr-FR')} ${(event as Record<string, unknown>).currency || 'XOF'}).`,
            type: 'event',
            is_read: false,
            created_at: now,
        }).then(() => null, () => null)

        return NextResponse.json({ registration }, { status: 201 })
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : 'Erreur serveur' },
            { status: 500 }
        )
    }
}
