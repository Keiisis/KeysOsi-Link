import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/security'
import QRCode from 'qrcode'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Appel Groq pour générer un message de remerciement personnalisé
async function generateGroqMessage(
    customerName: string,
    productTitle: string,
    amount: number
): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return ''
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 120,
                temperature: 0.7,
                messages: [
                    {
                        role: 'system',
                        content: `Tu es le service client de Retour Gagnant Bénin, une agence de confiance basée à Cotonou.
Rédige un court message de remerciement (2-3 phrases) en français formel et chaleureux, à insérer dans une facture officielle.
Ne commence pas par "Voici" ou "Bien sûr". Sois direct, sincère et élégant.`,
                    },
                    {
                        role: 'user',
                        content: `Client: ${customerName} | Produit: ${productTitle} | Montant: ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`,
                    },
                ],
            }),
        })
        const data = await res.json()
        return data.choices?.[0]?.message?.content?.trim() || ''
    } catch {
        return ''
    }
}

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await context.params

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 503 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (error || !order) {
            return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
        }

        // Fetch site settings for branding
        const { data: settingsData } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['contact_email', 'contact_phone', 'hero_title', 'contact_address'])

        const settings: Record<string, string> = {}
        for (const s of settingsData || []) settings[s.key] = s.value

        const siteName = settings.hero_title || 'Retour Gagnant Bénin'
        const siteEmail = settings.contact_email || 'contact@retourgagnant.bj'
        const sitePhone = settings.contact_phone || '+229 XX XX XX XX'
        const siteAddress = settings.contact_address || 'Haie Vive, Cotonou, République du Bénin'

        const formatPrice = (n: number) =>
            new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

        const invoiceRef = `RG-${orderId.slice(0, 8).toUpperCase()}`
        const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
            year: 'numeric', month: 'long', day: 'numeric',
        })

        // Construire la liste des produits (panier ou produit unique)
        type CartItem = { product_id?: string; title?: string; name?: string; price?: number; sale_price?: number; quantity?: number }
        const cartItems: CartItem[] = (order.cart_items && Array.isArray(order.cart_items) && order.cart_items.length > 0)
            ? order.cart_items
            : [{ title: order.product_title, price: order.amount / (order.quantity || 1), quantity: order.quantity || 1 }]

        const subTotal = cartItems.reduce((acc: number, item: CartItem) => {
            const price = item.sale_price && item.sale_price < (item.price || 0)
                ? item.sale_price : (item.price || 0)
            return acc + price * (item.quantity || 1)
        }, 0)
        const shippingFee = order.shipping_fee || 0
        const couponDiscount = order.coupon_id ? (subTotal + shippingFee - order.amount) : 0

        // Appels parallèles : QR Code + Groq
        const baseUrl = (() => {
            const origin = request.headers.get('origin')
            if (origin) return origin
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
            if (siteUrl) return siteUrl
            return `https://retour-gagnant.vercel.app`
        })()

        const verificationUrl = `${baseUrl}/api/invoices/${orderId}`
        const logoUrl = `${baseUrl}/logo.jpg`

        const [qrCodeBase64, groqMessage] = await Promise.all([
            QRCode.toDataURL(verificationUrl, {
                color: { dark: '#008751', light: '#ffffff' },
                width: 130,
                margin: 1,
            }).catch(() => ''),
            generateGroqMessage(order.customer_name || 'Client', order.product_title || 'notre produit', order.amount),
        ])

        const paymentMethodLabel: Record<string, string> = {
            kkiapay: 'Mobile Money — Kkiapay',
            fedapay: 'Mobile Money — FedaPay',
            stripe: 'Carte bancaire — Stripe',
            paypal: 'PayPal Business',
            zeyow: 'Zeyow',
        }
        const payLabel = paymentMethodLabel[order.payment_method] || (order.payment_method || '').toUpperCase()
        const isPaid = order.payment_status === 'completed'

        // Lignes des produits commandés
        const productRowsHtml = cartItems.map((item: CartItem) => {
            const displayPrice = (item.sale_price && item.sale_price < (item.price || 0))
                ? item.sale_price : (item.price || 0)
            const lineTotal = displayPrice * (item.quantity || 1)
            const itemTitle = item.title || item.name || order.product_title || 'Produit'
            return `
              <tr>
                <td style="padding:16px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;">${escapeHtml(itemTitle)}</td>
                <td style="padding:16px;font-size:14px;color:#555;text-align:center;border-bottom:1px solid #f0f0f0;">${item.quantity || 1}</td>
                <td style="padding:16px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #f0f0f0;">${formatPrice(displayPrice)}</td>
                <td style="padding:16px;font-size:14px;font-weight:700;color:#1a1a1a;text-align:right;border-bottom:1px solid #f0f0f0;">${formatPrice(lineTotal)}</td>
              </tr>`
        }).join('')

        const couponRow = couponDiscount > 0 ? `
          <tr>
            <td colspan="3" style="padding:10px 16px;font-size:13px;color:#008751;text-align:right;">Réduction coupon</td>
            <td style="padding:10px 16px;font-size:13px;color:#008751;font-weight:700;text-align:right;">− ${formatPrice(couponDiscount)}</td>
          </tr>` : ''


        const groqSection = groqMessage ? `
          <div style="margin:40px 0 30px;padding:24px 28px;background:linear-gradient(135deg,#f0fdf6,#f8fff4);border-left:4px solid #008751;border-radius:0 12px 12px 0;">
            <p style="margin:0;font-size:14px;color:#2d5a3d;line-height:1.8;font-style:italic;">&ldquo;${escapeHtml(groqMessage)}&rdquo;</p>
            <p style="margin:12px 0 0;font-size:11px;color:#008751;font-weight:700;text-transform:uppercase;letter-spacing:1px;">— L'équipe ${escapeHtml(siteName)}</p>
          </div>` : ''

        const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Facture ${invoiceRef} — ${escapeHtml(siteName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#f4f4f5;min-height:100vh}
    .page{max-width:820px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.10)}
    .header{background:linear-gradient(135deg,#006b40 0%,#008751 50%,#00a362 100%);padding:48px 52px;display:flex;justify-content:space-between;align-items:flex-start}
    .logo-wrap{display:flex;align-items:center;gap:16px}
    .logo-img{width:64px;height:64px;border-radius:12px;object-fit:cover;border:3px solid rgba(255,255,255,.3)}
    .brand-text h1{font-size:22px;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.2}
    .brand-text p{font-size:11px;color:rgba(255,255,255,.65);margin-top:3px;text-transform:uppercase;letter-spacing:1.5px}
    .invoice-tag{text-align:right}
    .invoice-tag .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,.6);margin-bottom:6px}
    .invoice-tag .ref{font-size:28px;font-weight:900;color:#FCD116;letter-spacing:2px}
    .invoice-tag .meta{margin-top:8px;font-size:12px;color:rgba(255,255,255,.75);line-height:1.8}
    .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px}
    .badge-paid{background:#FCD116;color:#006b40}
    .badge-pending{background:rgba(255,255,255,.2);color:#fff}
    .body{padding:52px}
    .parties{display:flex;gap:40px;margin-bottom:48px}
    .party{flex:1}
    .party-label{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#008751;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #008751}
    .party p{font-size:13px;color:#555;line-height:2}
    .party strong{display:block;font-size:16px;color:#1a1a1a;font-weight:800;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.05)}
    thead tr{background:#008751}
    thead th{padding:14px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:left}
    thead th:not(:first-child){text-align:center}
    thead th:last-child{text-align:right}
    .total-section{margin-top:8px;display:flex;justify-content:flex-end}
    .total-box{background:#f8f9fa;border-radius:12px;padding:24px 28px;min-width:280px;border:2px solid #008751}
    .total-row-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;color:#555}
    .total-final{display:flex;justify-content:space-between;align-items:center;padding-top:14px;margin-top:10px;border-top:2px solid #008751}
    .total-final .label{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#008751}
    .total-final .amount{font-size:24px;font-weight:900;color:#008751}
    .payment-info{margin-top:32px;padding:16px 20px;background:#f8f9fa;border-radius:10px;display:flex;align-items:center;gap:12px}
    .payment-info span{font-size:12px;color:#888}
    .payment-info strong{font-size:13px;color:#1a1a1a}
    .footer{margin-top:52px;padding-top:28px;border-top:2px dashed #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
    .footer-left p{font-size:12px;color:#888;line-height:2}
    .footer-left h4{font-size:13px;font-weight:800;color:#008751;margin-bottom:6px}
    .qr-wrap{text-align:center}
    .qr-wrap img{border-radius:10px;border:2px solid #e5e7eb;padding:6px;background:#fff}
    .qr-wrap p{font-size:9px;color:#aaa;margin-top:6px;text-transform:uppercase;letter-spacing:1px}
    .print-btn{display:block;margin:32px auto 0;padding:14px 36px;background:#008751;color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;letter-spacing:.5px;transition:background .2s}
    .print-btn:hover{background:#006b40}
    @media print{
      body{background:#fff}
      .page{box-shadow:none;border-radius:0;margin:0}
      .print-btn{display:none}
      .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- EN-TÊTE -->
    <div class="header">
      <div class="logo-wrap">
        <img src="${logoUrl}" alt="${escapeHtml(siteName)}" class="logo-img" onerror="this.style.display='none'" />
        <div class="brand-text">
          <h1>${escapeHtml(siteName)}</h1>
          <p>Agence de confiance · Cotonou, Bénin</p>
        </div>
      </div>
      <div class="invoice-tag">
        <div class="label">Facture officielle</div>
        <div class="ref">${invoiceRef}</div>
        <div class="meta">
          Date : ${date}<br>
          Statut : <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">${isPaid ? '✓ Payée' : 'En attente'}</span>
        </div>
      </div>
    </div>

    <div class="body">

      <!-- ÉMETTEUR / CLIENT -->
      <div class="parties">
        <div class="party">
          <div class="party-label">Émetteur</div>
          <p>
            <strong>${escapeHtml(siteName)}</strong>
            ${escapeHtml(siteAddress)}<br>
            ${escapeHtml(siteEmail)}<br>
            ${escapeHtml(sitePhone)}
          </p>
        </div>
        <div class="party">
          <div class="party-label">Facturé à</div>
          <p>
            <strong>${escapeHtml(order.customer_name || 'Client')}</strong>
            ${escapeHtml(order.customer_phone || '')}<br>
            ${order.customer_email ? escapeHtml(order.customer_email) + '<br>' : ''}
            ${order.shipping_country ? escapeHtml(order.shipping_country) : ''}
            ${order.shipping_address ? '<br>' + escapeHtml(order.shipping_address) : ''}
          </p>
        </div>
      </div>

      <!-- MESSAGE GROQ -->
      ${groqSection}

      <!-- TABLEAU DES PRODUITS -->
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align:center">Qté</th>
            <th style="text-align:right">Prix unit.</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productRowsHtml}
        </tbody>
      </table>

      <!-- TOTAUX -->
      <div class="total-section">
        <div class="total-box">
          ${subTotal !== order.amount && !couponDiscount && !shippingFee ? '' : `
          <div class="total-row-item">
            <span>Sous-total</span>
            <span>${formatPrice(subTotal)}</span>
          </div>`}
          ${couponRow ? `<div class="total-row-item"><span>Coupon</span><span style="color:#008751">− ${formatPrice(couponDiscount)}</span></div>` : ''}
          ${shippingFee > 0 ? `<div class="total-row-item"><span>Livraison</span><span>+ ${formatPrice(shippingFee)}</span></div>` : ''}
          <div class="total-final">
            <span class="label">Total TTC</span>
            <span class="amount">${formatPrice(order.amount)}</span>
          </div>
        </div>
      </div>

      <!-- MOYEN DE PAIEMENT -->
      <div class="payment-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008751" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        <div>
          <span>Méthode de paiement · </span>
          <strong>${escapeHtml(payLabel)}</strong>
          ${order.transaction_id ? ` &nbsp;|&nbsp; <span>Réf. transaction : <strong>${escapeHtml(String(order.transaction_id))}</strong></span>` : ''}
        </div>
      </div>

      <!-- MESSAGE GROQ (si non présent en haut) -->
      ${!groqSection && groqMessage ? `<p style="margin-top:28px;font-size:14px;color:#555;font-style:italic;line-height:1.8;">"${escapeHtml(groqMessage)}"<br><small style="color:#008751;font-style:normal;font-weight:700">— L'équipe ${escapeHtml(siteName)}</small></p>` : ''}

      <!-- PIED DE FACTURE -->
      <div class="footer">
        <div class="footer-left">
          <h4>Facture certifiée et sécurisée</h4>
          <p>
            ${escapeHtml(siteName)} · ${escapeHtml(siteAddress)}<br>
            ${escapeHtml(siteEmail)} · ${escapeHtml(sitePhone)}<br>
            Merci de votre confiance.
          </p>
        </div>
        ${qrCodeBase64 ? `
        <div class="qr-wrap">
          <img src="${qrCodeBase64}" alt="QR Vérification" width="110" height="110" />
          <p>Scannez pour vérifier</p>
        </div>` : ''}
      </div>

      <button class="print-btn" onclick="window.print()">🖨️ Télécharger / Imprimer</button>

    </div>
  </div>
</body>
</html>`

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `inline; filename="facture-${invoiceRef}.html"`,
            },
        })
    } catch {
        return NextResponse.json({ error: 'Erreur génération facture' }, { status: 500 })
    }
}
