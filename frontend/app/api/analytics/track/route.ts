import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Cache géolocalisation IP (évite les appels répétés) ──
const geoCache = new Map<string, { data: GeoData | null; ts: number }>()
const GEO_CACHE_TTL = 3_600_000 // 1 heure

interface GeoData {
    country: string
    country_code: string
    city: string
    region: string
    latitude: number
    longitude: number
}

async function getGeoFromIP(ip: string): Promise<GeoData | null> {
    // IPs locales → simuler Cotonou
    const isLocal = !ip || ip === '127.0.0.1' || ip === '::1'
        || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')
    if (isLocal) {
        return { country: 'Bénin', country_code: 'BJ', city: 'Cotonou', region: 'Littoral', latitude: 6.36, longitude: 2.42 }
    }

    const cached = geoCache.get(ip)
    if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) return cached.data

    try {
        const res = await fetch(
            `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName,lat,lon`,
            { signal: AbortSignal.timeout(4000) }
        )
        const json = await res.json()
        if (json.status === 'success') {
            const geo: GeoData = {
                country: json.country || 'Inconnu',
                country_code: json.countryCode || 'XX',
                city: json.city || '',
                region: json.regionName || '',
                latitude: json.lat || 0,
                longitude: json.lon || 0,
            }
            geoCache.set(ip, { data: geo, ts: Date.now() })
            return geo
        }
    } catch {
        // ip-api.com indisponible → fallback null
    }
    geoCache.set(ip, { data: null, ts: Date.now() })
    return null
}

function parseUserAgent(ua: string): { browser: string; browser_version: string; os: string; device_type: string } {
    const b = ua
    const browser =
        /Edg\//i.test(b) ? 'Edge'
        : /OPR\//i.test(b) || /Opera/i.test(b) ? 'Opera'
        : /Firefox\//i.test(b) ? 'Firefox'
        : /Chrome\//i.test(b) ? 'Chrome'
        : /Safari\//i.test(b) ? 'Safari'
        : /MSIE|Trident/i.test(b) ? 'IE'
        : 'Autre'

    const vMatch = ua.match(
        browser === 'Chrome' ? /Chrome\/([\d.]+)/
        : browser === 'Firefox' ? /Firefox\/([\d.]+)/
        : browser === 'Safari' ? /Version\/([\d.]+)/
        : browser === 'Edge' ? /Edg\/([\d.]+)/
        : browser === 'Opera' ? /OPR\/([\d.]+)/
        : /rv:([\d.]+)/
    )
    const browser_version = vMatch ? vMatch[1].split('.').slice(0, 2).join('.') : ''

    const os =
        /Windows NT 10/i.test(ua) ? 'Windows 10/11'
        : /Windows/i.test(ua) ? 'Windows'
        : /iPhone/i.test(ua) ? 'iOS (iPhone)'
        : /iPad/i.test(ua) ? 'iOS (iPad)'
        : /Android/i.test(ua) ? 'Android'
        : /Mac OS X/i.test(ua) ? 'macOS'
        : /Linux/i.test(ua) ? 'Linux'
        : 'Autre'

    const device_type =
        /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ? 'mobile'
        : /iPad|Tablet|tablet/i.test(ua) ? 'tablet'
        : 'desktop'

    return { browser, browser_version, os, device_type }
}

function getRealIP(req: NextRequest): string {
    return (
        req.headers.get('cf-connecting-ip')
        || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || '127.0.0.1'
    )
}

// ═══════════════════════════════════════════════════════
// POST /api/analytics/track — Enregistrer une visite
// ═══════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { session_id, page, referrer, utm_source, utm_medium, utm_campaign } = body

        if (!session_id?.trim()) return NextResponse.json({ ok: false }, { status: 400 })

        const ip = getRealIP(req)
        const ua = req.headers.get('user-agent') || ''
        const { browser, browser_version, os, device_type } = parseUserAgent(ua)
        const geo = await getGeoFromIP(ip)
        const now = new Date().toISOString()

        const { error } = await supabase
            .from('visitor_sessions')
            .upsert(
                {
                    session_id,
                    ip,
                    country: geo?.country ?? 'Inconnu',
                    country_code: geo?.country_code ?? 'XX',
                    city: geo?.city ?? '',
                    region: geo?.region ?? '',
                    latitude: geo?.latitude ?? 0,
                    longitude: geo?.longitude ?? 0,
                    device_type,
                    browser,
                    browser_version,
                    os,
                    page: page || '/',
                    referrer: referrer || '',
                    utm_source: utm_source || '',
                    utm_medium: utm_medium || '',
                    utm_campaign: utm_campaign || '',
                    last_seen_at: now,
                },
                { onConflict: 'session_id,page' }
            )

        if (error) throw error
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[analytics/track POST]', err)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
