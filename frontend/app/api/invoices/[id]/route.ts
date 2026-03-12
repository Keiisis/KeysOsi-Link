import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/security'
import QRCode from 'qrcode'
import { fetchWithGroqRotation, GROQ_KEYS } from '@/lib/groq'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Appel Groq pour générer un message de facture personnalisé (PNL + psychologie de fidélisation)
async function generateGroqMessage(
  customerName: string,
  productTitle: string,
  invoiceRef: string,
  date: string,
): Promise<string> {
  if (GROQ_KEYS.length === 0) return ''
  try {
    const res = await fetchWithGroqRotation({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 220,
      temperature: 0.72,
      messages: [
        {
          role: 'system',
          content: `Tu es le directeur de la relation client de Retour Gagnant Bénin, expert en communication persuasive et fidélisation.

Rédige un message de facture (3 à 4 phrases) qui sera affiché directement dans la facture officielle du client.

OBJECTIFS PSYCHOLOGIQUES :
1. Ancrer la décision d'achat comme un choix intelligent et stratégique (biais de cohérence)
2. Créer un sentiment d'appartenance à une communauté de personnes qui réussissent (appartenance sociale)
3. Ouvrir la porte à une prochaine interaction sans quémander ni promettre ce qui n'est pas garanti
4. Laisser une empreinte émotionnelle positive et durable — le client doit se souvenir de ce message

RÈGLES ABSOLUES :
- Mentionner naturellement le numéro de facture et la date dans la première phrase
- Ton : confiant, chaleureux, jamais servile ni excessif
- Pas de superlatifs creux ("excellent", "remarquable", "exceptionnel")
- Pas de promesses non vérifiables
- Pas de champs vides, pas de tirets de remplissage (---, ___)
- Répondre UNIQUEMENT avec le texte du message, sans titre ni méta-commentaire`,
        },
        {
          role: 'user',
          content: `Client : ${customerName} | Service : ${productTitle} | Facture : ${invoiceRef} | Date : ${date}`,
        },
      ],
    });
    const data = await res.json()
    const raw = (data.choices?.[0]?.message?.content?.trim() || '') as string
    if (!raw || raw.includes('___') || raw.includes('[ ') || raw.length > 800 || raw.length < 80) {
      return ''
    }
    return raw
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
    const siteEmail = settings.contact_email || 'contact@retourgagnantbenin.bj'
    const sitePhone = settings.contact_phone || '+229 XX XX XX XX'
    const siteAddress = settings.contact_address || 'Haie Vive, Cotonou, République du Bénin'

    const formatPrice = (n: number) =>
      new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'

    const invoiceRef = `RG-${orderId.slice(0, 8).toUpperCase()}`
    const date = new Date(order.created_at).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    // CartItem accepte les deux formats : PaymentModal (title/price) et CartCheckoutModal (product_title/unit_price)
    type CartItem = {
      product_id?: string
      title?: string
      product_title?: string
      name?: string
      price?: number
      unit_price?: number
      sale_price?: number
      quantity?: number
    }

    const cartItems: CartItem[] = (order.cart_items && Array.isArray(order.cart_items) && order.cart_items.length > 0)
      ? order.cart_items
      : [{ title: order.product_title, price: order.amount / (order.quantity || 1), quantity: order.quantity || 1 }]

    // Résolution du prix effectif selon le format stocké
    const resolveItemPrice = (item: CartItem): number => {
      if (item.unit_price !== undefined) return item.unit_price
      if (item.sale_price !== undefined && item.price !== undefined && item.sale_price < item.price) return item.sale_price
      return item.price || 0
    }

    // Résolution du nom selon le format stocké
    const resolveItemTitle = (item: CartItem): string =>
      item.title || item.product_title || item.name || order.product_title || 'Produit'

    // Fetch des features produit pour chaque product_id unique
    const productIds = [...new Set(
      cartItems.map(i => i.product_id).filter((id): id is string => !!id)
    )]

    const productFeatures: Record<string, string[]> = {}
    const productDescriptions: Record<string, string> = {}

    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, features, description')
        .in('id', productIds)

      for (const p of productsData || []) {
        if (Array.isArray(p.features) && p.features.length > 0) {
          productFeatures[p.id] = p.features.map((f: unknown) => String(f))
        } else if (typeof p.features === 'string' && p.features.trim()) {
          // features stockées en CSV ou texte
          productFeatures[p.id] = p.features.split(/[,\n]/).map((f: string) => f.trim()).filter(Boolean)
        }
        if (p.description) productDescriptions[p.id] = String(p.description)
      }
    }

    const subTotal = cartItems.reduce((acc: number, item: CartItem) => {
      return acc + resolveItemPrice(item) * (item.quantity || 1)
    }, 0)
    const shippingFee = order.shipping_fee || 0
    const couponDiscount = order.coupon_id ? Math.max(0, subTotal + shippingFee - order.amount) : 0

    // Appels parallèles : QR Code + Groq
    const baseUrl = (() => {
      const origin = request.headers.get('origin')
      if (origin) return origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      if (siteUrl) return siteUrl
      return 'https://www.retourgagnantbenin.bj'
    })()

    const verificationUrl = `${baseUrl}/api/invoices/${orderId}`
    const logoUrl = `${baseUrl}/logo.jpg`

    const [qrCodeBase64, groqMessage] = await Promise.all([
      QRCode.toDataURL(verificationUrl, {
        color: { dark: '#008751', light: '#ffffff' },
        width: 120,
        margin: 1,
      }).catch(() => ''),
      generateGroqMessage(order.customer_name || 'Client', order.product_title || 'notre service', invoiceRef, date),
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

    // Lignes des produits avec détail du pack (features)
    const productRowsHtml = cartItems.map((item: CartItem) => {
      const displayPrice = resolveItemPrice(item)
      const lineTotal = displayPrice * (item.quantity || 1)
      const itemTitle = resolveItemTitle(item)
      const pid = item.product_id || ''
      const features = productFeatures[pid] || []

      const featuresHtml = features.length > 0
        ? `<ul style="margin:6px 0 0 0;padding-left:16px;list-style:none;">
            ${features.map(f => `<li style="font-size:11px;color:#555;line-height:1.6;padding:1px 0;">
              <span style="color:#008751;margin-right:5px;">✓</span>${escapeHtml(f)}
            </li>`).join('')}
           </ul>`
        : ''

      return `
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #f0f0f0;vertical-align:top;">
            <strong>${escapeHtml(itemTitle)}</strong>
            ${featuresHtml}
          </td>
          <td style="padding:12px 14px;font-size:13px;color:#555;text-align:center;border-bottom:1px solid #f0f0f0;vertical-align:top;">${item.quantity || 1}</td>
          <td style="padding:12px 14px;font-size:12px;color:#555;text-align:right;border-bottom:1px solid #f0f0f0;vertical-align:top;white-space:nowrap;">${formatPrice(displayPrice)}</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#1a1a1a;text-align:right;border-bottom:1px solid #f0f0f0;vertical-align:top;white-space:nowrap;">${formatPrice(lineTotal)}</td>
        </tr>`
    }).join('')

    const groqSection = groqMessage ? `
      <div class="groq-section">
        <p style="margin:0;font-size:13px;color:#2d5a3d;line-height:1.7;font-style:italic;">&ldquo;${escapeHtml(groqMessage)}&rdquo;</p>
        <p style="margin:8px 0 0;font-size:10px;color:#008751;font-weight:700;text-transform:uppercase;letter-spacing:1px;">— L'équipe ${escapeHtml(siteName)}</p>
      </div>` : ''

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Facture ${invoiceRef} — ${escapeHtml(siteName)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;background:#f4f4f5}
    .page{max-width:800px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 32px rgba(0,0,0,.10)}
    .header{background:linear-gradient(135deg,#006b40 0%,#008751 50%,#00a362 100%);padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start}
    .logo-wrap{display:flex;align-items:center;gap:14px}
    .logo-img{width:52px;height:52px;border-radius:10px;object-fit:cover;border:2px solid rgba(255,255,255,.3)}
    .brand-text h1{font-size:19px;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.2}
    .brand-text p{font-size:10px;color:rgba(255,255,255,.65);margin-top:2px;text-transform:uppercase;letter-spacing:1.5px}
    .invoice-tag{text-align:right}
    .invoice-tag .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:rgba(255,255,255,.6);margin-bottom:4px}
    .invoice-tag .ref{font-size:24px;font-weight:900;color:#FCD116;letter-spacing:2px}
    .invoice-tag .meta{margin-top:6px;font-size:11px;color:rgba(255,255,255,.75);line-height:1.7}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px}
    .badge-paid{background:#FCD116;color:#006b40}
    .badge-pending{background:rgba(255,255,255,.2);color:#fff}
    .body{padding:32px 40px}
    .parties{display:flex;gap:32px;margin-bottom:24px}
    .party{flex:1}
    .party-label{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:3px;color:#008751;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #008751}
    .party p{font-size:12px;color:#555;line-height:1.8}
    .party strong{display:block;font-size:14px;color:#1a1a1a;font-weight:800;margin-bottom:2px}
    .groq-section{margin:18px 0;padding:16px 20px;background:linear-gradient(135deg,#f0fdf6,#f8fff4);border-left:4px solid #008751;border-radius:0 10px 10px 0}
    table{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.05)}
    thead tr{background:#008751}
    thead th{padding:10px 14px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:left}
    thead th:not(:first-child){text-align:center}
    thead th:last-child{text-align:right}
    .total-section{margin-top:6px;display:flex;justify-content:flex-end}
    .total-box{background:#f8f9fa;border-radius:10px;padding:16px 20px;min-width:260px;border:2px solid #008751}
    .total-row-item{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px;color:#555}
    .total-final{display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:8px;border-top:2px solid #008751}
    .total-final .label{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#008751}
    .total-final .amount{font-size:20px;font-weight:900;color:#008751}
    .payment-info{margin-top:18px;padding:12px 16px;background:#f8f9fa;border-radius:8px;display:flex;align-items:center;gap:10px}
    .payment-info span{font-size:11px;color:#888}
    .payment-info strong{font-size:12px;color:#1a1a1a}
    .footer{margin-top:20px;padding-top:18px;border-top:2px dashed #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
    .footer-left p{font-size:11px;color:#888;line-height:1.8}
    .footer-left h4{font-size:12px;font-weight:800;color:#008751;margin-bottom:4px}
    .qr-wrap{text-align:center;flex-shrink:0}
    .qr-wrap img{border-radius:8px;border:2px solid #e5e7eb;padding:4px;background:#fff}
    .qr-wrap p{font-size:8px;color:#aaa;margin-top:4px;text-transform:uppercase;letter-spacing:1px}
    .print-btn{display:block;margin:24px auto 0;padding:12px 32px;background:#008751;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.5px;transition:background .2s}
    .print-btn:hover{background:#006b40}

    /* ── PRINT : une seule page A4 ── */
    @page{size:A4;margin:10mm 12mm}
    @media print{
      body{background:#fff;font-size:11px}
      .page{box-shadow:none;border-radius:0;margin:0;max-width:100%}
      .header{padding:18px 24px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .logo-img{width:40px;height:40px}
      .brand-text h1{font-size:15px}
      .invoice-tag .ref{font-size:18px}
      .body{padding:14px 24px}
      .parties{margin-bottom:12px;gap:20px}
      .party p{font-size:11px;line-height:1.6}
      .party strong{font-size:13px}
      .groq-section{margin:10px 0;padding:10px 14px}
      .groq-section p{font-size:11px;line-height:1.6}
      table thead tr{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      table thead th{padding:7px 10px;font-size:8px}
      table tbody td{padding:8px 10px!important;font-size:11px!important}
      table tbody td ul li{font-size:10px!important}
      .total-box{padding:10px 14px;min-width:220px}
      .total-final .amount{font-size:16px}
      .payment-info{margin-top:10px;padding:8px 12px}
      .payment-info span,.payment-info strong{font-size:10px}
      .footer{margin-top:12px;padding-top:12px}
      .footer-left p{font-size:10px;line-height:1.7}
      .qr-wrap img{width:80px;height:80px}
      .print-btn{display:none}
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

      <!-- TABLEAU DES PRODUITS avec détail du pack -->
      <table>
        <thead>
          <tr>
            <th>Description &amp; Contenu du pack</th>
            <th style="text-align:center">Qté</th>
            <th style="text-align:right">Prix unit.</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productRowsHtml}
          ${shippingFee > 0 ? `
          <tr>
            <td style="padding:10px 14px;font-size:12px;color:#555;border-bottom:1px solid #f0f0f0;" colspan="3">Frais de livraison — ${escapeHtml(order.shipping_country || order.shipping_zone || '')}</td>
            <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#1a1a1a;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap;">+ ${formatPrice(shippingFee)}</td>
          </tr>` : ''}
          ${couponDiscount > 0 ? `
          <tr>
            <td style="padding:10px 14px;font-size:12px;color:#008751;border-bottom:1px solid #f0f0f0;" colspan="3">Réduction coupon appliquée</td>
            <td style="padding:10px 14px;font-size:12px;font-weight:700;color:#008751;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap;">− ${formatPrice(couponDiscount)}</td>
          </tr>` : ''}
        </tbody>
      </table>

      <!-- TOTAUX -->
      <div class="total-section">
        <div class="total-box">
          ${(shippingFee > 0 || couponDiscount > 0) ? `
          <div class="total-row-item">
            <span>Sous-total produits</span>
            <span>${formatPrice(subTotal)}</span>
          </div>` : ''}
          ${shippingFee > 0 ? `<div class="total-row-item"><span>Livraison</span><span>+ ${formatPrice(shippingFee)}</span></div>` : ''}
          ${couponDiscount > 0 ? `<div class="total-row-item"><span>Réduction coupon</span><span style="color:#008751">− ${formatPrice(couponDiscount)}</span></div>` : ''}
          <div class="total-final">
            <span class="label">Total TTC</span>
            <span class="amount">${formatPrice(order.amount)}</span>
          </div>
        </div>
      </div>

      <!-- MOYEN DE PAIEMENT -->
      <div class="payment-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008751" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        <div>
          <span>Méthode de paiement · </span>
          <strong>${escapeHtml(payLabel)}</strong>
          ${order.transaction_id ? ` &nbsp;|&nbsp; <span>Réf. transaction : <strong>${escapeHtml(String(order.transaction_id))}</strong></span>` : ''}
        </div>
      </div>

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
          <img src="${qrCodeBase64}" alt="QR Vérification" width="100" height="100" />
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
