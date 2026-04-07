/**
 * gemma-context.ts
 * Assemble le contexte temps réel de Retour Gagnant Bénin
 * pour l'injection dans le system prompt de Gemma 4.
 * Toutes les requêtes utilisent le service role → bypass RLS complet.
 * Cache 5 minutes pour éviter les timeouts Vercel.
 */
import { createClient } from '@supabase/supabase-js'

// ─── Cache module-level (évite 23 requêtes à chaque message) ─────────────────
let _cache: { data: string; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getCachedRgbContext(): Promise<string> {
    const now = Date.now()
    if (_cache && now - _cache.ts < CACHE_TTL) return _cache.data
    const data = await buildRgbContext()
    _cache = { data, ts: now }
    return data
}

export function invalidateContextCache() { _cache = null }

function sb() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
}

function xof(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M FCFA`
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K FCFA`
    return `${n.toLocaleString('fr-FR')} FCFA`
}

function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export interface GemmaMemoryEntry {
    id: string
    type: 'fact' | 'decision' | 'metric' | 'note' | 'alert'
    content: string
    importance: number
    tags?: string[]
    created_at: string
}

// ─── Charge les données temps réel depuis Supabase ────────────────────────────
export async function buildRgbContext(): Promise<string> {
    const supabase = sb()
    const now = new Date()
    const day   = new Date(now); day.setHours(0, 0, 0, 0)
    const month = new Date(now); month.setDate(1); month.setHours(0, 0, 0, 0)
    const h24   = new Date(Date.now() - 86_400_000).toISOString()
    const h72   = new Date(Date.now() - 3 * 86_400_000).toISOString()

    // ── Toutes les requêtes en parallèle ─────────────────────────────────────
    const [
        rAll, rMonth, rToday,
        ordersAll, ordersPending, ordersRecent,
        clientsTotal, clientsMonth, clientsRecent,
        agentsAll,
        msgsUnread, msgsRecent,
        dossiersTotal, dossiersRecent,
        partApps, natReqs,
        wafBlocked, ipsBlocked,
        settingsRes, memoryRes,
        servicesRes, blogRes, testRes,
    ] = await Promise.allSettled([
        // Revenus
        supabase.from('orders').select('total_amount').in('status', ['completed', 'paid']),
        supabase.from('orders').select('total_amount').in('status', ['completed', 'paid']).gte('created_at', month.toISOString()),
        supabase.from('orders').select('total_amount').in('status', ['completed', 'paid']).gte('created_at', day.toISOString()),
        // Commandes
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, created_at, total_amount, status, client_email, client_name').eq('status', 'pending').order('created_at', { ascending: false }).limit(10),
        supabase.from('orders').select('id, created_at, total_amount, status, client_email, client_name').order('created_at', { ascending: false }).limit(10),
        // Clients
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'client').gte('created_at', month.toISOString()),
        supabase.from('user_profiles').select('id, created_at, full_name, email, phone, city, country').eq('role', 'client').order('created_at', { ascending: false }).limit(5),
        // Agents
        supabase.from('user_profiles').select('id, full_name, email').eq('role', 'agent'),
        // Messages
        supabase.from('messages').select('id, created_at, name, sujet, content, lu').eq('lu', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('messages').select('id, created_at, name, sujet').order('created_at', { ascending: false }).limit(5),
        // Dossiers
        supabase.from('dossiers').select('id', { count: 'exact', head: true }),
        supabase.from('dossiers').select('id, created_at, client_name, type, status').order('created_at', { ascending: false }).limit(5),
        // Partenaires & Nationalité
        supabase.from('partner_applications').select('id, created_at, company_name, status').order('created_at', { ascending: false }).limit(5),
        supabase.from('nationalite_requests').select('id, created_at, full_name, status').order('created_at', { ascending: false }).limit(5),
        // Sécurité
        supabase.from('waf_logs').select('id', { count: 'exact', head: true }).eq('is_blocked', true).gte('created_at', h24),
        supabase.from('ip_blocks').select('id, ip, reason').is('unblocked_at', null).limit(5),
        // Paramètres site
        supabase.from('settings').select('key, value').in('key', ['site_name', 'contact_email', 'contact_phone', 'contact_whatsapp', 'address', 'site_tagline']),
        // Mémoire persistante Gemma
        supabase.from('gemma_memory').select('*').order('importance', { ascending: false }).order('created_at', { ascending: false }).limit(30),
        // Contenu
        supabase.from('services').select('id, name, price, is_active').eq('is_active', true).limit(20),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
        supabase.from('testimonials').select('id', { count: 'exact', head: true }),
    ])

    // ── Extraction des données ────────────────────────────────────────────────
    const g = <T>(r: PromiseSettledResult<{ data: T | null }>): T =>
        r.status === 'fulfilled' ? (r.value.data as T) ?? ([] as unknown as T) : ([] as unknown as T)
    const gc = (r: PromiseSettledResult<{ count: number | null }>): number =>
        r.status === 'fulfilled' ? (r.value.count ?? 0) : 0
    const sum = (arr: Array<{ total_amount?: number }>) =>
        arr.reduce((a, x) => a + (x.total_amount || 0), 0)

    const revenueTotal = sum(g<Array<{ total_amount: number }>>(rAll as never))
    const revenueMonth = sum(g<Array<{ total_amount: number }>>(rMonth as never))
    const revenueToday = sum(g<Array<{ total_amount: number }>>(rToday as never))
    const ordersTotal  = gc(ordersAll as never)
    const clientsCount = gc(clientsTotal as never)
    const clientsMonthCount = gc(clientsMonth as never)
    const agentsList   = g<Array<{ id: string; full_name?: string; email?: string }>>(agentsAll as never)
    const wafBlockedCount = gc(wafBlocked as never)
    const ipsList      = g<Array<{ id: string; ip: string; reason?: string }>>(ipsBlocked as never)
    const settings     = g<Array<{ key: string; value: string }>>(settingsRes as never)
    const memory       = g<GemmaMemoryEntry[]>(memoryRes as never)
    const services     = g<Array<{ id: string; name: string; price?: number; is_active: boolean }>>(servicesRes as never)
    const blogCount    = gc(blogRes as never)
    const testCount    = gc(testRes as never)
    const dossiersCount = gc(dossiersTotal as never)

    type Order = { id: string; created_at: string; total_amount?: number; status: string; client_email?: string; client_name?: string }
    type Client = { id: string; created_at: string; full_name?: string; email?: string; phone?: string; city?: string; country?: string }
    type Message = { id: string; created_at: string; name?: string; sujet?: string; content?: string; lu?: boolean }
    type Dossier = { id: string; created_at: string; client_name?: string; type?: string; status?: string }
    type PartApp = { id: string; created_at: string; company_name?: string; status?: string }
    type NatReq  = { id: string; created_at: string; full_name?: string; status?: string }

    const pendingOrders  = g<Order[]>(ordersPending as never)
    const recentOrders   = g<Order[]>(ordersRecent as never)
    const recentClients  = g<Client[]>(clientsRecent as never)
    const unreadMessages = g<Message[]>(msgsUnread as never)
    const recentMessages = g<Message[]>(msgsRecent as never)
    const recentDossiers = g<Dossier[]>(dossiersRecent as never)
    const partAppsList   = g<PartApp[]>(partApps as never)
    const natReqsList    = g<NatReq[]>(natReqs as never)

    const settMap = Object.fromEntries(settings.map(s => [s.key, s.value]))
    const secScore = Math.round(Math.max(0, 100 - Math.min(50, ipsList.length * 5) - Math.min(30, wafBlockedCount / 10)))

    // ── Construction du contexte ──────────────────────────────────────────────
    const lines: string[] = []

    lines.push(`=== RETOUR GAGNANT BÉNIN — CONTEXTE TEMPS RÉEL ===`)
    lines.push(`Date/Heure : ${now.toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' })} (heure Bénin)`)
    lines.push(`Site : ${settMap.site_name || 'Retour Gagnant Bénin'} — ${settMap.site_tagline || ''}`)
    lines.push(`Email : ${settMap.contact_email || '—'} | Tel : ${settMap.contact_phone || '—'} | WhatsApp : ${settMap.contact_whatsapp || '—'}`)
    lines.push(`Adresse : ${settMap.address || 'Cotonou, Bénin'}`)
    lines.push('')

    lines.push(`=== KPIs FINANCIERS ===`)
    lines.push(`Revenu TOTAL cumulé : ${xof(revenueTotal)}`)
    lines.push(`Revenu ce mois (${now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}) : ${xof(revenueMonth)}`)
    lines.push(`Revenu aujourd'hui : ${xof(revenueToday)}`)
    lines.push(`Commandes TOTAL : ${ordersTotal} | En attente de traitement : ${pendingOrders.length}`)
    lines.push('')

    lines.push(`=== CLIENTS & ÉQUIPE ===`)
    lines.push(`Clients inscrits TOTAL : ${clientsCount} | Nouveaux ce mois : ${clientsMonthCount}`)
    lines.push(`Agents actifs : ${agentsList.length}${agentsList.length > 0 ? ' (' + agentsList.map(a => a.full_name || a.email).join(', ') + ')' : ''}`)
    lines.push(`Messages non lus : ${unreadMessages.length}`)
    lines.push(`Dossiers ouverts : ${dossiersCount}`)
    lines.push('')

    lines.push(`=== SERVICES ACTIFS (${services.length}) ===`)
    if (services.length > 0) {
        services.forEach(s => {
            lines.push(`  • ${s.name}${s.price ? ` — ${xof(s.price)}` : ''}`)
        })
    } else {
        lines.push('  Aucun service actif trouvé')
    }
    lines.push('')

    lines.push(`=== COMMANDES EN ATTENTE (${pendingOrders.length}) ===`)
    if (pendingOrders.length > 0) {
        pendingOrders.forEach(o => {
            lines.push(`  • ${fmtDate(o.created_at)} | ${o.client_name || o.client_email || 'Client inconnu'} | ${xof(o.total_amount || 0)} | Statut: ${o.status}`)
        })
    } else {
        lines.push('  Aucune commande en attente')
    }
    lines.push('')

    lines.push(`=== 10 DERNIÈRES COMMANDES ===`)
    recentOrders.forEach(o => {
        lines.push(`  • ${fmtDate(o.created_at)} | ${o.client_name || o.client_email || '—'} | ${xof(o.total_amount || 0)} | ${o.status}`)
    })
    lines.push('')

    lines.push(`=== MESSAGES NON LUS (${unreadMessages.length}) ===`)
    if (unreadMessages.length > 0) {
        unreadMessages.slice(0, 8).forEach(m => {
            lines.push(`  • ${fmtDate(m.created_at)} | De: ${m.name || 'Inconnu'} | Sujet: ${m.sujet || '—'}`)
            if (m.content) lines.push(`    "${m.content.slice(0, 120)}${m.content.length > 120 ? '...' : ''}"`)
        })
    } else {
        lines.push('  Aucun message non lu')
    }
    lines.push('')

    lines.push(`=== DERNIERS MESSAGES (tous) ===`)
    recentMessages.forEach(m => {
        lines.push(`  • ${fmtDate(m.created_at)} | ${m.name || '—'} | ${m.sujet || '—'}`)
    })
    lines.push('')

    lines.push(`=== DOSSIERS RÉCENTS ===`)
    recentDossiers.forEach(d => {
        lines.push(`  • ${fmtDate(d.created_at)} | ${d.client_name || '—'} | Type: ${d.type || '—'} | Statut: ${d.status || '—'}`)
    })
    lines.push('')

    lines.push(`=== PARTENAIRES — CANDIDATURES RÉCENTES (${partAppsList.length}) ===`)
    partAppsList.forEach(p => {
        lines.push(`  • ${fmtDate(p.created_at)} | ${p.company_name || '—'} | ${p.status || '—'}`)
    })
    lines.push('')

    lines.push(`=== DEMANDES NATIONALITÉ RÉCENTES (${natReqsList.length}) ===`)
    natReqsList.forEach(n => {
        lines.push(`  • ${fmtDate(n.created_at)} | ${n.full_name || '—'} | ${n.status || '—'}`)
    })
    lines.push('')

    lines.push(`=== SÉCURITÉ WAF ===`)
    lines.push(`Score de sécurité : ${secScore}/100${secScore >= 80 ? ' ✓ Excellent' : secScore >= 60 ? ' ⚠ Modéré' : ' ✗ CRITIQUE'}`)
    lines.push(`Attaques bloquées (24h) : ${wafBlockedCount}`)
    lines.push(`IPs actuellement bloquées : ${ipsList.length}${ipsList.length > 0 ? ' (' + ipsList.map(i => i.ip).join(', ') + ')' : ''}`)
    lines.push('')

    lines.push(`=== CONTENU SITE ===`)
    lines.push(`Articles blog : ${blogCount} | Témoignages : ${testCount}`)
    lines.push('')

    // ── Mémoire persistante ───────────────────────────────────────────────────
    if (memory.length > 0) {
        lines.push(`=== MÉMOIRE GEMMA — CONNAISSANCES ACCUMULÉES (${memory.length} entrées) ===`)
        const byType: Record<string, GemmaMemoryEntry[]> = {}
        memory.forEach(m => {
            if (!byType[m.type]) byType[m.type] = []
            byType[m.type].push(m)
        })
        const typeLabels: Record<string, string> = {
            fact: 'FAITS', decision: 'DÉCISIONS', metric: 'MÉTRIQUES', note: 'NOTES', alert: 'ALERTES'
        }
        for (const [type, entries] of Object.entries(byType)) {
            lines.push(`\n  [${typeLabels[type] || type.toUpperCase()}]`)
            entries.forEach(e => {
                const stars = '★'.repeat(e.importance)
                lines.push(`  ${stars} ${e.content}${e.tags?.length ? ' [' + e.tags.join(', ') + ']' : ''}`)
            })
        }
        lines.push('')
    }

    return lines.join('\n')
}

// ─── Sauvegarder une entrée en mémoire ───────────────────────────────────────
export async function saveMemory(entry: Omit<GemmaMemoryEntry, 'id' | 'created_at'>): Promise<void> {
    try {
        const supabase = sb()
        await supabase.from('gemma_memory').insert({
            type: entry.type,
            content: entry.content,
            importance: entry.importance,
            tags: entry.tags || [],
        })
    } catch { /* silent */ }
}

// ─── Auto-extraction de mémoire depuis une réponse ────────────────────────────
export async function autoExtractMemory(userMsg: string, assistantResponse: string): Promise<void> {
    // Extraction légère via pattern matching — sans appel API supplémentaire
    const combined = `USER: ${userMsg}\nGEMMA: ${assistantResponse}`

    // Détecte les métriques mentionnées
    const metricMatch = combined.match(/(\d[\d\s]*(?:FCFA|clients?|commandes?|dossiers?))/gi)
    if (metricMatch && metricMatch.length > 0) {
        await saveMemory({
            type: 'metric',
            content: `[${new Date().toLocaleDateString('fr-FR')}] Métriques évoquées : ${metricMatch.slice(0, 3).join(', ')}`,
            importance: 2,
            tags: ['auto', 'metric'],
        })
    }

    // Détecte les décisions (mots-clés)
    const decisionKeywords = ['décidé', 'décision', 'stratégie', 'objectif', 'priorité', 'plan', 'action', 'lancer', 'arrêter']
    const hasDecision = decisionKeywords.some(k => combined.toLowerCase().includes(k))
    if (hasDecision) {
        const shortSummary = assistantResponse.slice(0, 200).replace(/\n/g, ' ')
        await saveMemory({
            type: 'decision',
            content: `[${new Date().toLocaleDateString('fr-FR')}] ${shortSummary}`,
            importance: 3,
            tags: ['auto', 'decision'],
        })
    }
}
