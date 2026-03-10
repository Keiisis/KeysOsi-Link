import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TICKET_SECRET = process.env.TICKET_HMAC_SECRET || 'rgb-ticket-secret-2026'

// Notification API — sends email notifications for order events using SMTP
export async function POST(request: Request) {
  try {
    const { order_id, type } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Notification: SUPABASE_SERVICE_ROLE_KEY manquante')
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 503 })
    }

    // Utiliser service role pour lire la commande (bypass RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      console.error('Notification: commande introuvable:', orderErr?.message, '| order_id:', order_id)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ════ [INTEGRATION ÉVÉNEMENTS RGB] ════
    let eventTicket = null
    if (type === 'payment_success') {
      const { data: registration } = await supabase
        .from('event_registrations')
        .select('*, events(slug, title)')
        .eq('order_id', order_id)
        .single()

      if (registration) {
        // Maj du statut
        await supabase.from('event_registrations').update({ payment_status: 'completed' }).eq('id', registration.id)

        // Verifier si le ticket existe deja
        const { data: existingTicket } = await supabase.from('event_tickets').select('*').eq('registration_id', registration.id).single()

        if (!existingTicket) {
          // Generer le code 
          const eventData = registration.events as Record<string, unknown>
          const prefix = (String(eventData?.slug || 'EVNT')).slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
          const random = crypto.randomBytes(4).toString('hex').toUpperCase()
          const ticketCode = `RGB-${prefix}-${random}`

          // Generer le payload + signature HMAC
          const payload = { ticket_code: ticketCode, event_id: registration.event_id, registration_id: registration.id }
          const hmac = crypto.createHmac('sha256', TICKET_SECRET).update(JSON.stringify(payload)).digest('hex')
          const qrData = JSON.stringify({ ...payload, hash: hmac })

          const { data: newTicket } = await supabase.from('event_tickets').insert({
            registration_id: registration.id,
            event_id: registration.event_id,
            ticket_code: ticketCode,
            qr_data: qrData,
            ticket_type: registration.ticket_type
          }).select().single()

          eventTicket = { ...newTicket, event_title: eventData?.title }
        } else {
          const eventData = registration.events as Record<string, unknown>
          eventTicket = { ...existingTicket, event_title: eventData?.title }
        }
      }
    }
    // ══════════════════════════════════════

    // Fetch admin & SMTP settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'contact_email', 'contact_phone', 'hero_title',
        'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass',
        'smtp_from_email', 'smtp_from_name'
      ])


    const settings: Record<string, string> = {}
    for (const s of settingsData || []) {
      settings[s.key] = s.value
    }

    const adminEmail = settings.contact_email || ''
    const siteName = settings.hero_title || 'Retour Gagnant'

    const formatPrice = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount)

    // Store notification in the database for admin panel
    await supabase.from('notifications').insert({
      type: type || 'order_update',
      title: type === 'payment_success'
        ? `Nouvelle commande payée - ${order.product_title}`
        : `Commande mise à jour - ${order.product_title}`,
      message: type === 'payment_success'
        ? `${order.customer_name} a payé ${formatPrice(order.amount)} ${order.currency || 'XOF'} pour "${order.product_title}" (x${order.quantity || 1}). Tel: ${order.customer_phone}`
        : `La commande #${order_id.slice(0, 8)} a été mise à jour. Statut: ${order.payment_status}`,
      order_id,
      is_read: false,
    })

    // Email notification via Nodemailer
    if (settings.smtp_host && settings.smtp_user && settings.smtp_pass) {
      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: Number(settings.smtp_port) || 465,
        secure: Number(settings.smtp_port) === 465,
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        }
      });

      const fromString = `"${settings.smtp_from_name || siteName}" <${settings.smtp_from_email || settings.smtp_user}>`;
      const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://retourgagnant.bj';

      // Send to Admin
      if (adminEmail) {
        try {
          await transporter.sendMail({
            from: fromString,
            to: adminEmail,
            replyTo: settings.smtp_user,
            subject: type === 'payment_success'
              ? `[${siteName}] Nouvelle commande - ${order.product_title}`
              : `[${siteName}] Commande #${order_id.slice(0, 8)} mise a jour`,
            html: generateOrderEmailHTML(order, siteName, type, baseUrl),
          })
        } catch (emailErr) {
          console.error('Admin Email send error:', emailErr)
        }
      }

      // Send to Customer
      if (order.customer_email && type === 'payment_success') {
        try {
          await transporter.sendMail({
            from: fromString,
            to: order.customer_email,
            replyTo: settings.smtp_from_email,
            subject: `✅ Facture & Confirmation de commande — ${siteName}`,
            html: generateCustomerEmailHTML(order, siteName, baseUrl, eventTicket, settings),
          })
        } catch (emailErr) {
          console.error('Customer email error:', emailErr)
        }
      }
    } else {
      console.log("SMTP not configuréed. Skipping emails.")
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Notif Error", e);
    return NextResponse.json({ error: 'Notification error' }, { status: 500 })
  }
}

function generateOrderEmailHTML(order: Record<string, unknown>, siteName: string, type: string, baseUrl: string): string {
  const f = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const logoUrl = `${baseUrl}/logo.jpg`
  const ref = `RG-${(order.id as string).slice(0, 8).toUpperCase()}`
  const payMethodLabel: Record<string, string> = {
    kkiapay: 'Mobile Money — Kkiapay', fedapay: 'Mobile Money — FedaPay',
    stripe: 'Carte bancaire — Stripe', paypal: 'PayPal Business', zeyow: 'Zeyow',
  }
  const payLabel = payMethodLabel[order.payment_method as string] || String(order.payment_method || '').toUpperCase()

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;background:#0d1117;border-radius:16px;overflow:hidden;border:1px solid #1e2a3a;">
    <div style="background:linear-gradient(135deg,#006b40,#008751);padding:32px 40px;display:flex;align-items:center;gap:16px;">
      <img src="${logoUrl}" alt="${siteName}" width="52" height="52" style="border-radius:10px;object-fit:cover;border:2px solid rgba(255,255,255,.3);" />
      <div>
        <div style="font-size:20px;font-weight:900;color:#fff;">${siteName}</div>
        <div style="font-size:10px;color:#FCD116;text-transform:uppercase;letter-spacing:3px;margin-top:3px;">${type === 'payment_success' ? '🛒 Nouvelle commande reçue' : 'Mise à jour commande'}</div>
      </div>
    </div>
    <div style="padding:32px 40px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Client</td><td style="padding:10px 0;text-align:right;font-weight:800;color:#fff;font-size:14px;">${order.customer_name}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px;">Téléphone</td><td style="padding:6px 0;text-align:right;color:#d1d5db;font-size:13px;">${order.customer_phone}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px;">Produit</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#fff;font-size:13px;">${order.product_title}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px;">Quantité</td><td style="padding:6px 0;text-align:right;color:#d1d5db;font-size:13px;">${order.quantity || 1}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px;">Méthode</td><td style="padding:6px 0;text-align:right;color:#d1d5db;font-size:13px;">${payLabel}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:12px;">Référence</td><td style="padding:6px 0;text-align:right;font-family:monospace;color:#FCD116;font-size:12px;">${ref}</td></tr>
        <tr style="border-top:1px solid #1e2a3a;">
          <td style="padding:18px 0 8px;color:#FCD116;font-weight:900;font-size:13px;text-transform:uppercase;">TOTAL REÇU</td>
          <td style="padding:18px 0 8px;text-align:right;font-size:22px;font-weight:900;color:#FCD116;">${f(order.amount as number)} ${order.currency || 'FCFA'}</td>
        </tr>
      </table>
      <div style="margin-top:24px;text-align:center;">
        <a href="${baseUrl}/admin/orders" style="display:inline-block;background:#008751;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:800;font-size:13px;letter-spacing:.5px;">Gérer sur le dashboard →</a>
      </div>
    </div>
    <div style="padding:16px 40px;background:#080d14;text-align:center;border-top:1px solid #1e2a3a;">
      <p style="margin:0;color:#4b5563;font-size:11px;">${siteName} — Notification automatique · Ne pas répondre</p>
    </div>
  </div>`
}

function generateCustomerEmailHTML(
  order: Record<string, unknown>,
  siteName: string,
  baseUrl: string,
  eventTicket: Record<string, string> | null = null,
  settings: Record<string, string> = {}
): string {
  const f = (n: number) => new Intl.NumberFormat('fr-FR').format(n)
  const invoiceUrl = `${baseUrl}/api/invoices/${order.id}`
  const logoUrl = `${baseUrl}/logo.jpg`
  const ref = `RG-${(order.id as string).slice(0, 8).toUpperCase()}`
  const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  const siteEmail = settings.contact_email || 'contact@retourgagnantbenin.bj'
  const sitePhone = settings.contact_phone || ''
  const payMethodLabel: Record<string, string> = {
    kkiapay: 'Mobile Money — Kkiapay', fedapay: 'Mobile Money — FedaPay',
    stripe: 'Carte bancaire — Stripe', paypal: 'PayPal Business', zeyow: 'Zeyow',
  }
  const payLabel = payMethodLabel[order.payment_method as string] || String(order.payment_method || '').toUpperCase()

  // Lignes des produits (panier ou produit unique)
  type CartItem = { title?: string; name?: string; price?: number; sale_price?: number; quantity?: number }
  const cartItems: CartItem[] = (
    Array.isArray(order.cart_items) && (order.cart_items as CartItem[]).length > 0
  )
    ? order.cart_items as CartItem[]
    : [{ title: order.product_title as string, price: (order.amount as number) / ((order.quantity as number) || 1), quantity: (order.quantity as number) || 1 }]

  const productRows = cartItems.map((item: CartItem) => {
    const price = item.sale_price && item.sale_price < (item.price || 0) ? item.sale_price : (item.price || 0)
    const total = price * (item.quantity || 1)
    return `<tr>
      <td style="padding:12px 16px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #f3f4f6;">${item.title || item.name || order.product_title}</td>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:center;border-bottom:1px solid #f3f4f6;">${item.quantity || 1}</td>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${f(price)} FCFA</td>
      <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#1a1a1a;text-align:right;border-bottom:1px solid #f3f4f6;">${f(total)} FCFA</td>
    </tr>`
  }).join('')

  const shippingFee = (order.shipping_fee as number) || 0
  const shippingRow = shippingFee > 0 ? `<tr>
    <td colspan="3" style="padding:10px 16px;font-size:12px;color:#6b7280;text-align:right;">Frais de livraison${order.shipping_zone ? ` (${order.shipping_zone})` : ''}</td>
    <td style="padding:10px 16px;font-size:12px;color:#1a1a1a;font-weight:600;text-align:right;">+ ${f(shippingFee)} FCFA</td>
  </tr>` : ''

  const ticketHtml = eventTicket ? `
  <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin:24px 0;text-align:center;border:2px solid #FCD116;">
    <p style="margin:0 0 6px;font-size:9px;color:#FCD116;text-transform:uppercase;letter-spacing:2px;font-weight:800;">Votre ticket d'accès</p>
    <h3 style="margin:0 0 16px;font-size:16px;color:#fff;">${eventTicket.event_title || order.product_title}</h3>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(eventTicket.qr_data || eventTicket.ticket_code)}" width="140" height="140" alt="QR" style="border-radius:8px;background:#fff;padding:8px;" />
    <p style="margin:12px 0 0;font-size:20px;font-family:monospace;font-weight:900;color:#FCD116;letter-spacing:4px;">${eventTicket.ticket_code}</p>
  </div>` : ''

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">

  <!-- EN-TÊTE FACTURE -->
  <div style="background:linear-gradient(135deg,#006b40,#008751);padding:0;">
    <div style="padding:32px 40px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:14px;">
        <img src="${logoUrl}" alt="${siteName}" width="56" height="56" style="border-radius:12px;object-fit:cover;border:3px solid rgba(255,255,255,.3);" />
        <div>
          <div style="font-size:20px;font-weight:900;color:#fff;line-height:1.2;">${siteName}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:2px;margin-top:2px;">Cotonou, République du Bénin</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:2px;">FACTURE</div>
        <div style="font-size:22px;font-weight:900;color:#FCD116;letter-spacing:2px;">${ref}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:4px;">${date}</div>
        <div style="margin-top:6px;display:inline-block;background:#FCD116;color:#006b40;padding:4px 12px;border-radius:20px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">✓ Payée</div>
      </div>
    </div>
  </div>

  <div style="padding:36px 40px;">

    <!-- SALUTATION -->
    <p style="margin:0 0 6px;font-size:16px;color:#1a1a1a;">Bonjour <strong>${order.customer_name}</strong>,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.7;">
      Nous vous confirmons la bonne réception de votre paiement. Voici votre facture officielle.
    </p>

    ${ticketHtml}

    <!-- TABLEAU PRODUITS -->
    <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;margin-bottom:4px;">
      <thead>
        <tr style="background:#008751;">
          <th style="padding:11px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:left;">Article</th>
          <th style="padding:11px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:center;">Qté</th>
          <th style="padding:11px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:right;">Prix unit.</th>
          <th style="padding:11px 16px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#fff;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${productRows}${shippingRow}</tbody>
    </table>

    <!-- TOTAL -->
    <div style="margin:0 0 28px;display:flex;justify-content:flex-end;">
      <div style="background:#f0fdf6;border:2px solid #008751;border-radius:12px;padding:20px 24px;min-width:220px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#008751;">Total TTC</span>
          <span style="font-size:22px;font-weight:900;color:#008751;">${f(order.amount as number)} FCFA</span>
        </div>
      </div>
    </div>

    <!-- INFO PAIEMENT -->
    <div style="background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:28px;font-size:12px;color:#6b7280;">
      💳 <strong style="color:#1a1a1a;">${payLabel}</strong>
      ${order.transaction_id ? ` &nbsp;·&nbsp; Réf. transaction : <code style="color:#008751;font-size:11px;">${order.transaction_id}</code>` : ''}
    </div>

    <!-- BOUTON FACTURE -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${invoiceUrl}" style="display:inline-block;background:#008751;color:#fff;text-decoration:none;padding:16px 40px;border-radius:12px;font-weight:800;font-size:14px;letter-spacing:.5px;">
        📄 Voir &amp; télécharger la facture complète
      </a>
      <p style="margin:10px 0 0;font-size:11px;color:#9ca3af;">Accès direct à votre facture — imprimable en PDF depuis votre navigateur</p>
    </div>

    <!-- MESSAGE CONTACT -->
    <p style="font-size:13px;color:#6b7280;line-height:1.7;margin:0;">
      Pour toute question, contactez-nous :<br>
      📧 <a href="mailto:${siteEmail}" style="color:#008751;text-decoration:none;">${siteEmail}</a>
      ${sitePhone ? ` &nbsp;·&nbsp; 📞 ${sitePhone}` : ''}
    </p>
  </div>

  <!-- PIED -->
  <div style="padding:20px 40px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.8;">
      ${siteName} · Haie Vive, Cotonou, République du Bénin<br>
      <a href="${baseUrl}" style="color:#008751;text-decoration:none;">www.retourgagnant.bj</a>
    </p>
  </div>
</div>`
}
