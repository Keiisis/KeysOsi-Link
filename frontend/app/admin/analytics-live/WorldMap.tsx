'use client'

import { useEffect, useRef, useState, memo } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { motion } from 'framer-motion'

interface Session {
    session_id: string
    city: string
    country: string
    country_code: string
    latitude: number
    longitude: number
    browser: string
    device_type: string
    page: string
    last_seen_at: string
}

export interface CountryPoint {
    country: string
    code: string
    count: number
    lat: number
    lon: number
}

interface TooltipData {
    x: number
    y: number
    title: string
    lines: string[]
}

function formatPage(page: string): string {
    if (page === '/' || page === '') return 'Accueil'
    return page.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function bubbleRadius(count: number, max: number): number {
    const r = 6 + 14 * Math.sqrt(count / Math.max(max, 1))
    return Math.min(r, 20)
}

const WorldMap = memo(function WorldMap({ sessions, countryPoints = [] }: {
    sessions: Session[]
    countryPoints?: CountryPoint[]
}) {
    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<maplibregl.Marker[]>([])
    const [tooltip, setTooltip] = useState<TooltipData | null>(null)

    // Initialisation de la carte (une seule fois)
    useEffect(() => {
        if (!mapContainerRef.current) return

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: 'https://tiles.openfreemap.org/styles/dark',
            center: [10, 15],
            zoom: 1.2,
            minZoom: 1,
            maxZoom: 14,
            attributionControl: false
        })

        // Ajout des contrôles de navigation (boutons zoom +/-) en bas à droite
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
        
        // Ajout des attributions en bas à gauche
        map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

        mapRef.current = map

        // Redimensionner la carte lors du changement de taille du container
        const resizeObserver = new ResizeObserver(() => {
            map.resize()
        })
        resizeObserver.observe(mapContainerRef.current)

        return () => {
            resizeObserver.disconnect()
            map.remove()
            mapRef.current = null
        }
    }, [])

    // Mise à jour des marqueurs quand sessions, countryPoints ou map changent
    useEffect(() => {
        const map = mapRef.current
        if (!map) return

        // Supprimer tous les marqueurs existants
        markersRef.current.forEach(m => m.remove())
        markersRef.current = []

        const maxCount = countryPoints.reduce((m, p) => Math.max(m, p.count), 1)

        // 1. Ajouter les marqueurs des pays (Trafic 24h)
        countryPoints.forEach(p => {
            if (p.lat === undefined || p.lon === undefined || isNaN(p.lat) || isNaN(p.lon)) return

            const r = bubbleRadius(p.count, maxCount)
            const el = document.createElement('div')
            el.style.width = `${r * 2}px`
            el.style.height = `${r * 2}px`
            el.style.display = 'flex'
            el.style.alignItems = 'center'
            el.style.justifyContent = 'center'
            el.style.position = 'relative'
            el.style.cursor = 'pointer'

            // Bulle verte
            const bubble = document.createElement('div')
            bubble.style.position = 'absolute'
            bubble.style.width = '100%'
            bubble.style.height = '100%'
            bubble.style.borderRadius = '50%'
            bubble.style.background = 'rgba(16, 185, 129, 0.22)'
            bubble.style.border = '1.5px solid rgba(52, 211, 153, 0.85)'
            el.appendChild(bubble)

            // Centre de la bulle
            const dot = document.createElement('div')
            dot.style.position = 'absolute'
            dot.style.width = '5px'
            dot.style.height = '5px'
            dot.style.borderRadius = '50%'
            dot.style.background = '#34d399'
            el.appendChild(dot)

            // Libellé CODE et Trafic
            const label = document.createElement('span')
            label.innerText = `${p.code} · ${p.count}`
            label.style.position = 'absolute'
            label.style.top = `-${r + 14}px`
            label.style.fontSize = '9.5px'
            label.style.color = '#A7F3D0'
            label.style.fontWeight = '800'
            label.style.fontFamily = 'monospace'
            label.style.whiteSpace = 'nowrap'
            label.style.pointerEvents = 'none'
            el.appendChild(label)

            // Gestionnaire de tooltip
            el.addEventListener('mouseenter', (evt) => {
                const containerRect = mapContainerRef.current?.getBoundingClientRect()
                if (containerRect) {
                    setTooltip({
                        x: evt.clientX - containerRect.left,
                        y: evt.clientY - containerRect.top,
                        title: p.country,
                        lines: [`${p.count} visiteur${p.count > 1 ? 's' : ''} sur 24 h`]
                    })
                }
            })
            el.addEventListener('mouseleave', () => setTooltip(null))

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([p.lon, p.lat])
                .addTo(map)

            markersRef.current.push(marker)
        })

        // 2. Ajouter les marqueurs des sessions en ligne en temps réel (Or, pulsant)
        sessions.filter(s => s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)).forEach(s => {
            const el = document.createElement('div')
            el.style.width = '24px'
            el.style.height = '24px'
            el.style.display = 'flex'
            el.style.alignItems = 'center'
            el.style.justifyContent = 'center'
            el.style.position = 'relative'
            el.style.cursor = 'pointer'

            // Halo pulsant (via classes Tailwind pour garder l'esthétique existante)
            const pulse = document.createElement('div')
            pulse.className = 'animate-ping'
            pulse.style.position = 'absolute'
            pulse.style.width = '18px'
            pulse.style.height = '18px'
            pulse.style.borderRadius = '50%'
            pulse.style.background = 'rgba(201, 168, 76, 0.25)'
            pulse.style.animationDuration = '2s'
            el.appendChild(pulse)

            // Point central doré
            const dot = document.createElement('div')
            dot.style.position = 'absolute'
            dot.style.width = '8px'
            dot.style.height = '8px'
            dot.style.borderRadius = '50%'
            dot.style.background = '#E2C97E'
            dot.style.border = '1.5px solid #C9A84C'
            dot.style.boxShadow = '0 0 6px rgba(226, 201, 126, 0.9)'
            el.appendChild(dot)

            // Gestionnaire de tooltip
            el.addEventListener('mouseenter', (evt) => {
                const containerRect = mapContainerRef.current?.getBoundingClientRect()
                if (containerRect) {
                    setTooltip({
                        x: evt.clientX - containerRect.left,
                        y: evt.clientY - containerRect.top,
                        title: s.city ? `${s.city}, ${s.country}` : (s.country || 'Localisation inconnue'),
                        lines: [
                            'En ligne maintenant',
                            `${s.browser || 'Navigateur inconnu'} — ${s.device_type || 'desktop'}`,
                            `Page : ${formatPage(s.page)}`,
                        ]
                    })
                }
            })
            el.addEventListener('mouseleave', () => setTooltip(null))

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([s.longitude, s.latitude])
                .addTo(map)

            markersRef.current.push(marker)
        })

    }, [sessions, countryPoints])

    return (
        <div className="relative w-full h-full overflow-hidden rounded-b-2xl" style={{ background: '#0E1B2E' }}>
            {/* Conteneur de la carte MapLibre */}
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Tooltip custom (exactement le même style) */}
            {tooltip && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ left: Math.min(tooltip.x + 14, typeof window !== 'undefined' ? window.innerWidth - 200 : 230), top: Math.max(tooltip.y - 56, 8) }}
                    className="absolute pointer-events-none bg-[#0E1B2E] border border-white/20 rounded-xl px-3.5 py-2.5 text-xs z-20 shadow-2xl min-w-[170px]"
                >
                    <p className="text-white font-bold">{tooltip.title}</p>
                    <div className="border-t border-white/10 mt-1.5 pt-1.5 space-y-0.5">
                        {tooltip.lines.map((l, i) => (
                            <p key={i} className="text-gray-300 text-[10.5px]">{l}</p>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Légende */}
            <div className="absolute bottom-3 left-4 flex items-center gap-4 text-[10px] text-gray-300 bg-[#0E1B2E]/90 rounded-lg px-3 py-1.5 border border-white/10 z-10">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-emerald-300/80 bg-emerald-400/25" />
                    Visiteurs 24 h (par pays)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E2C97E] shadow-[0_0_6px_rgba(226,201,126,0.9)]" />
                    En ligne maintenant
                </span>
            </div>

            {/* Info zoom */}
            <div className="absolute bottom-3 right-12 text-[9px] text-gray-400 font-mono bg-[#0E1B2E]/90 rounded px-2 py-1 z-10">
                Utilisez le zoom +/- pour explorer
            </div>
        </div>
    )
})

export default WorldMap
