import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// FedaPay sends webhook notifications via POST
export async function POST(request: Request) {
    try {
        // Lire order_id depuis query params (passé via callback_url) ou depuis le body
        const { searchParams } = new URL(request.url)
        const orderIdFromUrl = searchParams.get('order_id')

        const body = await request.json()

        // FedaPay webhook structure
        const entity = body?.entity || 'transaction'
        const eventData = body?.object || body

        // Only handle transaction events
        if (entity !== 'transaction') {
            return NextResponse.json({ ok: true, message: 'Event ignored' })
        }

        const transactionId = String(eventData?.id || '')
        const status = eventData?.status // 'approved', 'declined', 'canceled', 'refunded'
        const meta = eventData?.meta || eventData?.custom_metadata || {}
        // Priorité : query param > custom_metadata > meta
        const orderId = orderIdFromUrl || meta?.order_id || meta?.orderId

        if (!transactionId || !orderId) {
            console.warn('FedaPay webhook: transactionId ou orderId manquant', { transactionId, orderId, orderIdFromUrl })
            return NextResponse.json({ error: 'Missing transaction ID or order_id' }, { status: 400 })
        }

        // Fetch order
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (fetchErr || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

        // Idempotency check
        if (order.payment_status === 'completed') {
            return NextResponse.json({ ok: true, message: 'Already processed' })
        }

        if (status === 'approved') {
            // Server-side verification: fetch from FedaPay API
            const { data: settingsData } = await supabase
                .from('settings')
                .select('key, value')
                .in('key', ['fedapay_secret_key', 'fedapay_sandbox'])

            const settingsMap: Record<string, string> = {}
            for (const s of settingsData || []) {
                settingsMap[s.key] = s.value
            }

            const secretKey = settingsMap.fedapay_secret_key
            const isSandbox = settingsMap.fedapay_sandbox === 'true'
            const apiBase = isSandbox ? 'https://sandbox-api.fedapay.com' : 'https://api.fedapay.com'

            if (secretKey) {
                const verifyRes = await fetch(`${apiBase}/v1/transactions/${transactionId}`, {
                    headers: {
                        'Authorization': `Bearer ${secretKey}`,
                        'Content-Type': 'application/json',
                    },
                })

                const verifyData = await verifyRes.json()
                const verifiedStatus = verifyData?.v1?.transaction?.status || verifyData?.status

                if (verifiedStatus !== 'approved') {
                    await supabase
                        .from('orders')
                        .update({ payment_status: 'failed', transaction_id: transactionId })
                        .eq('id', orderId)
                    return NextResponse.json({ ok: false, message: 'Server verification failed' })
                }
            }

            // Update order to completed
            await supabase
                .from('orders')
                .update({
                    payment_status: 'completed',
                    transaction_id: transactionId,
                })
                .eq('id', orderId)

            // Decrement stock
            if (order.product_id) {
                await supabase.rpc('decrement_stock', {
                    p_id: order.product_id,
                    qty: order.quantity || 1,
                })
            }

            // Send notification
            await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ''}/api/notifications/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, type: 'payment_success' }),
            }).catch(() => { })

            return NextResponse.json({ ok: true, message: 'Payment confirméed' })
        }

        if (status === 'refunded') {
            await supabase
                .from('orders')
                .update({ payment_status: 'refunded', transaction_id: transactionId })
                .eq('id', orderId)
            return NextResponse.json({ ok: true, message: 'Refund recorded' })
        }

        // declined / canceled
        await supabase
            .from('orders')
            .update({ payment_status: 'failed', transaction_id: transactionId })
            .eq('id', orderId)

        return NextResponse.json({ ok: true, message: 'Payment failed/canceled' })
    } catch {
        return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
    }
}
