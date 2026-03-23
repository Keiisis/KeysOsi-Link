'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Génère ou récupère l'ID de session depuis sessionStorage
function getSessionId(): string {
    if (typeof window === 'undefined') return ''
    let sid = sessionStorage.getItem('_rg_visitor_sid')
    if (!sid) {
        sid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
        sessionStorage.setItem('_rg_visitor_sid', sid)
    }
    return sid
}

export function VisitorTracker() {
    const pathname = usePathname()
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        // Ne pas tracker les pages admin / agent
        if (pathname.startsWith('/admin') || pathname.startsWith('/agent')) return

        const sessionId = getSessionId()
        if (!sessionId) return

        const payload = {
            session_id: sessionId,
            page: pathname,
            referrer: document.referrer || '',
            utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
            utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
            utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
        }

        const track = () => {
            // sendBeacon pour ne pas bloquer la navigation (survit aux unload)
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/analytics/track', blob)
            } else {
                fetch('/api/analytics/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    keepalive: true,
                }).catch(() => {})
            }
        }

        // Premier ping immédiat
        track()

        // Heartbeat toutes les 30s : signale que le visiteur est toujours là
        heartbeatRef.current = setInterval(track, 30_000)

        return () => {
            if (heartbeatRef.current) clearInterval(heartbeatRef.current)
        }
    }, [pathname])

    return null
}
