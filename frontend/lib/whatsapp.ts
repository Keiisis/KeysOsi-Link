// ══════════════════════════════════════════════════════════════
// Notifications WhatsApp (Meta WhatsApp Business Cloud API)
//
// Permet de recevoir AUTOMATIQUEMENT un message WhatsApp à chaque
// nouveau RDV / prospect nationalité / message de contact — sans qu'un
// agent soit connecté.
//
// Configuration (variables d'environnement, côté serveur uniquement) :
//   WHATSAPP_ENABLED            = "true"
//   WHATSAPP_TOKEN              = jeton d'accès permanent Meta (secret)
//   WHATSAPP_PHONE_NUMBER_ID    = ID du numéro expéditeur (dashboard Meta)
//   WHATSAPP_NOTIFY_TO          = numéros destinataires, séparés par des virgules
//                                 (format international sans +, ex. 2290160322121)
//   WHATSAPP_TEMPLATE_NAME      = (optionnel) nom d'un template approuvé Meta
//   WHATSAPP_TEMPLATE_LANG      = (optionnel) langue du template, défaut "fr"
//
// IMPORTANT (règle Meta) : en dehors d'une fenêtre de 24h après le dernier
// message du destinataire, Meta n'autorise QUE les messages basés sur un
// TEMPLATE approuvé. Pour des notifications fiables 24/7, renseignez
// WHATSAPP_TEMPLATE_NAME (template à 1 variable {{1}} = le texte). Sans
// template, l'envoi en texte libre ne marche que dans la fenêtre de 24h.
// ══════════════════════════════════════════════════════════════

const GRAPH_VERSION = 'v21.0'

interface WhatsAppResult {
    sent: boolean
    skipped?: boolean
    reason?: string
}

function getConfig() {
    return {
        enabled: process.env.WHATSAPP_ENABLED === 'true',
        token: process.env.WHATSAPP_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        recipients: (process.env.WHATSAPP_NOTIFY_TO || '')
            .split(',').map(n => n.replace(/[^\d]/g, '')).filter(Boolean),
        templateName: process.env.WHATSAPP_TEMPLATE_NAME || '',
        templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'fr',
    }
}

async function sendToOne(to: string, text: string): Promise<boolean> {
    const cfg = getConfig()
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneNumberId}/messages`

    const body = cfg.templateName
        ? {
            messaging_product: 'whatsapp',
            to,
            type: 'template',
            template: {
                name: cfg.templateName,
                language: { code: cfg.templateLang },
                components: [{ type: 'body', parameters: [{ type: 'text', text }] }],
            },
        }
        : {
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { preview_url: false, body: text },
        }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cfg.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const err = await res.text()
            console.error('[WhatsApp] Envoi échoué:', res.status, err.slice(0, 300))
            return false
        }
        return true
    } catch (e) {
        console.error('[WhatsApp] Erreur réseau:', e instanceof Error ? e.message : e)
        return false
    }
}

/**
 * Envoie une notification WhatsApp à tous les numéros configurés.
 * No-op silencieux si non configuré (pour ne jamais casser un flux métier).
 * À appeler en fire-and-forget (ne pas bloquer la réponse HTTP).
 */
export async function sendWhatsAppNotification(text: string): Promise<WhatsAppResult> {
    const cfg = getConfig()
    if (!cfg.enabled || !cfg.token || !cfg.phoneNumberId || cfg.recipients.length === 0) {
        return { sent: false, skipped: true, reason: 'WhatsApp non configuré' }
    }
    const results = await Promise.all(cfg.recipients.map(to => sendToOne(to, text)))
    return { sent: results.some(Boolean) }
}

/** Indique si WhatsApp est configuré (utile pour l'affichage admin). */
export function isWhatsAppConfigured(): boolean {
    const cfg = getConfig()
    return cfg.enabled && !!cfg.token && !!cfg.phoneNumberId && cfg.recipients.length > 0
}
