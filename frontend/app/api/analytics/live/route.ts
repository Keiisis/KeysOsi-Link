import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ═══════════════════════════════════════════════════════
// GET /api/analytics/live — Données live + stats 24h
// ═══════════════════════════════════════════════════════
export async function GET() {
    try {
        const now = Date.now()
        const since5min = new Date(now - 5 * 60 * 1000).toISOString()
        const since30min = new Date(now - 30 * 60 * 1000).toISOString()
        const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString()

        // ── Sessions actives (30 dernières minutes) ──────
        const { data: liveSessions } = await supabase
            .from('visitor_sessions')
            .select('*')
            .gte('last_seen_at', since30min)
            .order('last_seen_at', { ascending: false })
            .limit(300)

        // ── En ligne maintenant (5 dernières minutes) ────
        const activeNow = new Set(
            (liveSessions || [])
                .filter(s => s.last_seen_at >= since5min)
                .map(s => s.session_id)
        ).size

        // ── Stats 24h ────────────────────────────────────
        const { data: all24h } = await supabase
            .from('visitor_sessions')
            .select('session_id, page, country, country_code, device_type, browser, latitude, longitude, created_at, last_seen_at')
            .gte('created_at', since24h)

        const rows = all24h || []

        // Unique sessions (visiteurs uniques)
        const uniqueSessionSet = new Set(rows.map(r => r.session_id))

        // Top pages
        const pageCounts: Record<string, number> = {}
        for (const r of rows) pageCounts[r.page] = (pageCounts[r.page] || 0) + 1
        const topPages = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([page, count]) => ({ page, count }))

        // Top pays
        const countryMap: Record<string, { count: number; code: string }> = {}
        for (const r of rows) {
            const c = r.country || 'Inconnu'
            if (!countryMap[c]) countryMap[c] = { count: 0, code: r.country_code || 'XX' }
            countryMap[c].count++
        }
        const topCountries = Object.entries(countryMap)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 10)
            .map(([country, { count, code }]) => ({ country, count, code }))

        // Appareils
        const deviceCounts: Record<string, number> = {}
        for (const r of rows) deviceCounts[r.device_type] = (deviceCounts[r.device_type] || 0) + 1

        // Navigateurs
        const browserCounts: Record<string, number> = {}
        for (const r of rows) browserCounts[r.browser] = (browserCounts[r.browser] || 0) + 1

        // Graphique horaire (24 dernières heures)
        const hourly: Record<string, number> = {}
        for (let h = 0; h < 24; h++) {
            const label = new Date(now - h * 3600000).toISOString().slice(0, 13)
            hourly[label] = 0
        }
        for (const r of rows) {
            const h = r.created_at?.slice(0, 13)
            if (h && hourly[h] !== undefined) hourly[h]++
        }
        const hourlyChart = Object.entries(hourly)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hour, count]) => ({ hour: hour.slice(11) + 'h', count }))

        return NextResponse.json({
            live: liveSessions || [],
            stats: {
                active_now: activeNow,
                unique_visitors_24h: uniqueSessionSet.size,
                page_views_24h: rows.length,
                countries_24h: Object.keys(countryMap).length,
            },
            top_pages: topPages,
            top_countries: topCountries,
            device_stats: deviceCounts,
            browser_stats: browserCounts,
            hourly_chart: hourlyChart,
        })
    } catch (err) {
        console.error('[analytics/live GET]', err)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
