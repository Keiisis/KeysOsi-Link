import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
    try {
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json(
                { success: false, error: 'Configuration serveur manquante (SUPABASE_SERVICE_ROLE_KEY)' },
                { status: 503 }
            )
        }

        // Utiliser le service role pour contourner RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const body = await request.json()
        const { order_id, transaction_id, payment_method } = body

        if (!order_id || !transaction_id) {
            return NextResponse.json(
                { success: false, error: 'Missing order_id or transaction_id' },
                { status: 400 }
            )
        }

        // Idempotence — empêcher le double traitement
        const { data: existingOrder, error: fetchError } = await supabase
            .from('orders')
            .select('payment_status, transaction_id, amount, payment_method, product_id, quantity')
            .eq('id', order_id)
            .single()

        if (fetchError || !existingOrder) {
            console.error('Order fetch error:', fetchError?.message, '| order_id:', order_id)
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
        }

        if (
            existingOrder.payment_status === 'completed' &&
            existingOrder.transaction_id === transaction_id
        ) {
            return NextResponse.json({ success: true, message: 'Already verified' })
        }

        let isVerified = false
        const method = payment_method || existingOrder.payment_method

        // Lire tous les settings nécessaires en une seule requête
        const { data: settingsData } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', [
                'kkiapay_sandbox', 'kkiapay_private_key',
                'fedapay_secret_key', 'fedapay_sandbox',
                'stripe_secret_key',
                'paypal_client_id', 'paypal_client_secret', 'paypal_sandbox',
            ])

        const sm: Record<string, string> = {}
        for (const s of settingsData || []) sm[s.key] = s.value

        // ─── KKIAPAY ─────────────────────────────────────────────────────────
        if (method === 'kkiapay') {
            try {
                const isSandbox = sm.kkiapay_sandbox === 'true'
                const privateKey = sm.kkiapay_private_key || ''
                const kkiapayBase = isSandbox
                    ? 'https://api-sandbox.kkiapay.me'
                    : 'https://api.kkiapay.me'

                const verifyRes = await fetch(`${kkiapayBase}/api/v1/transactions/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-private-key': privateKey,
                    },
                    body: JSON.stringify({ transactionId: transaction_id }),
                })
                const verifyData = await verifyRes.json()
                console.log('Kkiapay verify response (HTTP', verifyRes.status, '):', JSON.stringify(verifyData).slice(0, 300))

                if (verifyData.status === 'SUCCESS') {
                    isVerified = true
                } else {
                    console.warn('Kkiapay status non-SUCCESS:', verifyData.status, '| message:', verifyData.message)
                    return NextResponse.json(
                        { success: false, error: `Kkiapay: ${verifyData.message || verifyData.status || 'vérification échouée'}` },
                        { status: 400 }
                    )
                }
            } catch (e) {
                console.error('Kkiapay verification error', e)
                return NextResponse.json(
                    { success: false, error: 'Erreur de connexion à Kkiapay' },
                    { status: 502 }
                )
            }
        }

        // ─── FEDAPAY ─────────────────────────────────────────────────────────
        else if (method === 'fedapay') {
            try {
                const secretKey = sm.fedapay_secret_key
                const isSandbox = sm.fedapay_sandbox === 'true'
                const apiBase = isSandbox
                    ? 'https://sandbox-api.fedapay.com'
                    : 'https://api.fedapay.com'

                // Vérification DB : l'ID FedaPay a été stocké dans la commande lors de la création
                // server-side (POST /api/checkout/fedapay). On vérifie que l'ID fourni correspond.
                const storedTxId = existingOrder.transaction_id
                console.log('FedaPay verify — storedTxId:', storedTxId, '| received:', transaction_id)

                if (storedTxId && storedTxId === String(transaction_id)) {
                    console.log('FedaPay verify DB OK — transaction_id:', transaction_id)
                    isVerified = true
                } else if (secretKey) {
                    // Fallback : essayer l'API FedaPay si la clé est disponible
                    console.log('FedaPay DB check failed, trying API fallback...')
                    try {
                        const verifyRes = await fetch(`${apiBase}/v1/transactions/${transaction_id}`, {
                            headers: {
                                Authorization: `Bearer ${secretKey}`,
                                'Content-Type': 'application/json',
                            },
                        })
                        if (verifyRes.ok) {
                            const verifyData = await verifyRes.json()
                            const verifiedStatus =
                                verifyData?.['v1/transaction']?.status
                                || verifyData?.v1?.transaction?.status
                                || verifyData?.transaction?.status
                                || verifyData?.status
                            console.log('FedaPay API verify — statut:', verifiedStatus, '| id:', transaction_id)
                            if (verifiedStatus === 'approved' || verifiedStatus === 'transferred') isVerified = true
                            else {
                                return NextResponse.json(
                                    { success: false, error: `FedaPay statut: ${verifiedStatus || 'inconnu'}` },
                                    { status: 400 }
                                )
                            }
                        } else {
                            // API 404 — sandbox limitation connue
                            const errBody = await verifyRes.text()
                            console.warn(`FedaPay API ${verifyRes.status}: ${errBody.slice(0, 100)} | storedTxId was: ${storedTxId}`)
                            // Si la transaction a été créée server-side mais transaction_id non stocké en DB,
                            // on ne peut pas vérifier — renvoyer une erreur claire
                            return NextResponse.json(
                                { success: false, error: 'FedaPay: impossible de vérifier — réessayez ou contactez le support' },
                                { status: 400 }
                            )
                        }
                    } catch (e) {
                        console.error('FedaPay API fallback error', e)
                        return NextResponse.json(
                            { success: false, error: 'Erreur de connexion à FedaPay' },
                            { status: 502 }
                        )
                    }
                } else {
                    console.error('FedaPay: clé secrète manquante ET aucun transaction_id en DB')
                    return NextResponse.json(
                        { success: false, error: 'Configuration FedaPay incomplète' },
                        { status: 503 }
                    )
                }
            } catch (e) {
                console.error('Fedapay verification error', e)
                return NextResponse.json(
                    { success: false, error: 'Erreur vérification FedaPay' },
                    { status: 500 }
                )
            }
        }

        // ─── STRIPE ──────────────────────────────────────────────────────────
        else if (method === 'stripe') {
            try {
                const secretKey = sm.stripe_secret_key
                if (secretKey) {
                    const stripe = new Stripe(secretKey)
                    const pi = await stripe.paymentIntents.retrieve(transaction_id)
                    if (pi.status === 'succeeded') {
                        isVerified = true
                    }
                }
            } catch (e) {
                console.error('Stripe verification error', e)
            }
        }

        // ─── PAYPAL ──────────────────────────────────────────────────────────
        else if (method === 'paypal') {
            if (
                existingOrder.payment_status === 'completed' ||
                existingOrder.transaction_id === transaction_id
            ) {
                isVerified = true
            } else {
                try {
                    if (sm.paypal_client_id && sm.paypal_client_secret) {
                        const base = sm.paypal_sandbox === 'true'
                            ? 'https://api-m.sandbox.paypal.com'
                            : 'https://api-m.paypal.com'

                        const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                Authorization: `Basic ${Buffer.from(`${sm.paypal_client_id}:${sm.paypal_client_secret}`).toString('base64')}`,
                            },
                            body: 'grant_type=client_credentials',
                        })
                        const tokenData = await tokenRes.json()

                        if (tokenData.access_token) {
                            const captureRes = await fetch(
                                `${base}/v2/payments/captures/${transaction_id}`,
                                {
                                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                                }
                            )
                            const captureData = await captureRes.json()
                            if (captureData.status === 'COMPLETED') {
                                isVerified = true
                            }
                        }
                    }
                } catch (e) {
                    console.error('PayPal verification error', e)
                }
            }
        }

        // ─── ZEYOW ───────────────────────────────────────────────────────────
        else if (method === 'zeyow') {
            isVerified = true
        }

        if (!isVerified) {
            return NextResponse.json(
                { success: false, error: 'Payment verification failed' },
                { status: 400 }
            )
        }

        // Mettre à jour le statut
        const { error } = await supabase
            .from('orders')
            .update({ payment_status: 'completed', transaction_id })
            .eq('id', order_id)

        if (error) {
            console.error('Order update error:', error.message)
            return NextResponse.json(
                { success: false, error: 'Database update failed' },
                { status: 500 }
            )
        }

        // Décrémenter le stock (atomique, anti-race condition)
        if (existingOrder.product_id) {
            await supabase.rpc('decrement_stock', {
                p_id: existingOrder.product_id,
                qty: existingOrder.quantity || 1,
            })
        }

        // Notification email — utiliser l'origine de la requête pour avoir une URL absolue
        // (NEXT_PUBLIC_SITE_URL peut être vide sur Vercel → URL relative → fetch échoue)
        try {
            const origin = new URL(request.url).origin
            await fetch(`${origin}/api/notifications/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id, type: 'payment_success' }),
            })
        } catch (notifErr) {
            console.error('Notification email error:', notifErr)
        }

        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json(
            { success: false, error: 'Server error' },
            { status: 500 }
        )
    }
}
