/**
 * Chargement dynamique des SDK de paiement (Kkiapay, FedaPay, Stripe)
 * Utilisé quand le modal de paiement est ouvert depuis une page
 * qui ne charge pas les SDK via boutique/layout.tsx
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = () => window as any

function loadScript(src: string, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src*="${new URL(src).hostname}"]`)
        if (existing) { resolve(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload = () => resolve()
        s.onerror = () => reject(new Error(`Échec chargement SDK: ${src}`))
        document.head.appendChild(s)
        setTimeout(() => reject(new Error(`Timeout chargement SDK: ${src}`)), timeout)
    })
}

function waitForGlobal(name: string, timeout = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
        if (win()[name]) { resolve(); return }
        const check = setInterval(() => {
            if (win()[name]) { clearInterval(check); resolve() }
        }, 150)
        setTimeout(() => { clearInterval(check); reject(new Error(`SDK ${name} non disponible après chargement`)) }, timeout)
    })
}

/** Charge le SDK Kkiapay si pas déjà disponible */
export async function ensureKkiapaySDK(): Promise<void> {
    if (typeof win().openKkiapayWidget === 'function') return
    await loadScript('https://cdn.kkiapay.me/k.js')
    await waitForGlobal('openKkiapayWidget')
}

/** Charge le SDK FedaPay si pas déjà disponible */
export async function ensureFedaPaySDK(): Promise<void> {
    if (win().FedaPay) return
    await loadScript('https://cdn.fedapay.com/checkout.js?v=1.1.7')
    await waitForGlobal('FedaPay')
}

/** Charge Stripe.js si pas déjà disponible */
export async function ensureStripeSDK(): Promise<void> {
    if (win().Stripe) return
    await loadScript('https://js.stripe.com/v3/')
    await waitForGlobal('Stripe')
}
