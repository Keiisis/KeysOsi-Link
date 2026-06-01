import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyApiAuth } from '@/lib/api-auth'
import { invalidateIpCache } from '@/lib/waf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// GET /api/admin/waf?view=logs|blocks|fingerprints|deceptions|honeypots|campaigns|tarpits&limit=100&offset=0
export async function GET(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const { searchParams } = request.nextUrl
    const view   = searchParams.get('view') || 'summary'
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = createClient(supabaseUrl, serviceKey)

    if (view === 'logs') {
        const { data, count, error } = await supabase
            .from('waf_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ logs: data || [], total: count || 0, error: error?.message })
    }

    if (view === 'blocks') {
        const { data, count, error } = await supabase
            .from('ip_blocks')
            .select('*', { count: 'exact' })
            .is('unblocked_at', null)
            .order('blocked_at', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ blocks: data || [], total: count || 0, error: error?.message })
    }

    // ── Nouvelles vues Défense Active ─────────────────────────
    if (view === 'fingerprints') {
        const { data, count, error } = await supabase
            .from('waf_device_fingerprints')
            .select('*', { count: 'exact' })
            .order('last_seen', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ fingerprints: data || [], total: count || 0, error: error?.message })
    }

    if (view === 'deceptions') {
        const { data, count, error } = await supabase
            .from('waf_honeypot_interactions')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ deceptions: data || [], total: count || 0, error: error?.message })
    }

    if (view === 'honeypots') {
        const { data, error } = await supabase
            .from('waf_deception_payloads')
            .select('*')
            .order('attack_type', { ascending: true })

        return NextResponse.json({ payloads: data || [], error: error?.message })
    }

    if (view === 'campaigns') {
        const { data, count, error } = await supabase
            .from('waf_campaigns')
            .select('*', { count: 'exact' })
            .order('last_seen', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ campaigns: data || [], total: count || 0, error: error?.message })
    }

    if (view === 'tarpits') {
        const { data: config } = await supabase
            .from('waf_tarpit_config')
            .select('*')
            .order('trust_min', { ascending: true })

        const { data: tarpitedIps } = await supabase
            .from('waf_ip_memory')
            .select('ip, trust_score, tarpit_level, last_action, last_seen')
            .gt('tarpit_level', 0)
            .order('tarpit_level', { ascending: false })
            .limit(50)

        return NextResponse.json({ config: config || [], tarpitedIps: tarpitedIps || [] })
    }

    // ── Vue résumé enrichie (utilise RPC get_waf_stats) ───────
    try {
        const { data: rpcStats, error: rpcError } = await supabase.rpc('get_waf_stats', { p_hours: 24 })

        if (!rpcError && rpcStats) {
            // Ajouter les logs récents et IPs bloquées
            const [logsRes, blocksRes] = await Promise.all([
                supabase.from('waf_logs').select('*').order('created_at', { ascending: false }).limit(20),
                supabase.from('ip_blocks').select('*').is('unblocked_at', null).order('blocked_at', { ascending: false }).limit(100),
            ])

            return NextResponse.json({
                ...rpcStats,
                recentLogs: logsRes.data || [],
                blockedIps: blocksRes.data || [],
            })
        }
    } catch { /* fallback ci-dessous */ }

    // Fallback si RPC indisponible
    const [logsRes, blocksRes, statsRes] = await Promise.all([
        supabase.from('waf_logs').select('threat_type, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('ip_blocks').select('*').is('unblocked_at', null).order('blocked_at', { ascending: false }).limit(100),
        supabase.from('waf_logs').select('ip, threat_type').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    ])

    const threatStats: Record<string, number> = {}
    for (const row of (statsRes.data || [])) {
        threatStats[row.threat_type] = (threatStats[row.threat_type] || 0) + 1
    }

    const ipCounts: Record<string, number> = {}
    for (const row of (statsRes.data || [])) {
        ipCounts[row.ip] = (ipCounts[row.ip] || 0) + 1
    }
    const topIps = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count }))

    return NextResponse.json({
        recentLogs:   (logsRes.data || []).slice(0, 20),
        blockedIps:   blocksRes.data || [],
        threatStats,
        topIps,
        totalLogs24h: statsRes.data?.length || 0,
        totalBlocked: blocksRes.data?.length || 0,
    })
}

// POST /api/admin/waf — Actions: block_ip, lockdown, maintenance
// Body: { action: "block_ip", ip: "1.2.3.4", reason: "..." }
//        { action: "lockdown" }
//        { action: "maintenance" }
export async function POST(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const body = await request.json().catch(() => ({}))
    const { action, ip, reason } = body as { action?: string; ip?: string; reason?: string }

    const supabase = createClient(supabaseUrl, serviceKey)

    // ── Mode urgence : lockdown ──────────────────────────────
    if (action === 'lockdown') {
        const { data, error } = await supabase.rpc('waf_emergency_lockdown')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, lockdown: data })
    }

    // ── Maintenance manuelle ─────────────────────────────────
    if (action === 'maintenance') {
        const { data, error } = await supabase.rpc('waf_daily_maintenance')
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, maintenance: data })
    }

    // ── Bloquer une IP manuellement (action par défaut) ──────
    const targetIp = ip
    if (!targetIp || !/^[\d.:a-f]+$/i.test(targetIp)) {
        return NextResponse.json({ error: 'IP invalide' }, { status: 400 })
    }

    const { error } = await supabase.from('ip_blocks').upsert({
        ip: targetIp,
        reason: reason || 'Blocage manuel',
        blocked_by: 'manual',
        unblocked_at: null,
    }, { onConflict: 'ip' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    invalidateIpCache(targetIp)
    return NextResponse.json({ success: true })
}

// DELETE /api/admin/waf?ip=1.2.3.4 — Débloquer une IP
export async function DELETE(request: NextRequest) {
    const auth = await verifyApiAuth(request, 'admin')
    if (!auth.authenticated) return auth.error!

    const ip = request.nextUrl.searchParams.get('ip')
    if (!ip) return NextResponse.json({ error: 'IP requise' }, { status: 400 })

    const supabase = createClient(supabaseUrl, serviceKey)
    const { error } = await supabase
        .from('ip_blocks')
        .update({ unblocked_at: new Date().toISOString() })
        .eq('ip', ip)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    invalidateIpCache(ip)
    return NextResponse.json({ success: true })
}
