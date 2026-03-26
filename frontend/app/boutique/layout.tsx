'use client'

import Script from 'next/script'
import { CartDrawer } from '@/components/boutique/CartDrawer'
import { CartFloatingButton } from '@/components/boutique/CartFloatingButton'
import { CartFlyAnimation } from '@/components/boutique/CartFlyAnimation'
import { MaintenanceGuard } from '@/components/boutique/MaintenanceGuard'

export default function BoutiqueLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {/* Kkiapay Widget SDK — afterInteractive pour être dispo avant le premier clic */}
            <Script
                src="https://cdn.kkiapay.me/k.js"
                strategy="afterInteractive"
            />

            {/* FedaPay Checkout.js SDK — afterInteractive (lazyOnload trop tardif → init échoue) */}
            <Script
                src="https://cdn.fedapay.com/checkout.js?v=1.1.7"
                strategy="afterInteractive"
            />

            {/* Stripe.js SDK — afterInteractive pour PaymentModal et CartCheckoutModal */}
            <Script
                src="https://js.stripe.com/v3/"
                strategy="afterInteractive"
            />

            <MaintenanceGuard>
                {children}
            </MaintenanceGuard>

            {/* Cart UI */}
            <CartDrawer />
            <CartFloatingButton />
            <CartFlyAnimation />
        </>
    )
}
