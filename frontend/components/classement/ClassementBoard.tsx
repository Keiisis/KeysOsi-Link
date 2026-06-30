'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, Search, RefreshCw, Loader2, AlertCircle, Clock, BellRing,
    ChevronDown, Save, Phone, Mail, DownloadCloud, CheckCircle2, Inbox,
    UserPlus, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    SERVICE_CATEGORIES, CLIENT_STATUSES, getCategory, getStatus,
    daysSince, nextMilestone, dueMilestones,
} from '@/lib/classement/categories'

interface ClientRow {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    service_category: string
    service_label: string | null
    source: string | null
    status: string
    notes: string | null
    first_contact_at: string
    last_review_at: string | null
    relances_sent: number[] | null
}

type Theme = 'dark' | 'light'

// Palette dérivée du thème — un seul accent (émeraude), neutres harmonisés.
function palette(theme: Theme) {
    const dark = theme === 'dark'
    return {
        dark,
        page: dark ? 'text-white' : 'text-[#1a2332]',
        sub: dark ? 'text-gray-400' : 'text-gray-500',
        faint: dark ? 'text-gray-500' : 'text-gray-400',
        card: dark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-gray-100 shadow-sm',
        cardHover: dark ? 'hover:bg-white/[0.07]' : 'hover:bg-gray-50',
        chip: dark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600',
        input: dark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-[#1a2332] placeholder-gray-400',
        divider: dark ? 'border-white/10' : 'border-gray-100',
        soft: dark ? 'bg-black/20' : 'bg-[#F8FAF9]',
    }
}

async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}

function initials(name: string | null, email: string): string {
    const base = (name || email || '?').trim()
    const parts = base.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return base.slice(0, 2).toUpperCase()
}

// Couleur du badge d'ancienneté selon l'urgence
function ageColor(days: number): string {
    if (days >= 60) return '#EF4444'
    if (days >= 30) return '#F59E0B'
    if (days >= 15) return '#C9A84C'
    return '#10B981'
}

export default function ClassementBoard({ theme }: { theme: Theme }) {
    const p = palette(theme)
    const [clients, setClients] = useState<ClientRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState<string>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draftNotes, setDraftNotes] = useState('')
    const [draftStatus, setDraftStatus] = useState('')
    const [saving, setSaving] = useState(false)
    const [backfilling, setBackfilling] = useState(false)
    const [flash, setFlash] = useState('')

    // Ajout manuel
    const emptyAdd = { full_name: '', email: '', phone: '', service_category: 'passeport', service_label: '', first_contact_at: '', notes: '' }
    const [addOpen, setAddOpen] = useState(false)
    const [addForm, setAddForm] = useState(emptyAdd)
    const [adding, setAdding] = useState(false)
    const [addError, setAddError] = useState('')

    const load = useCallback(async () => {
        setLoading(true); setError('')
        try {
            const res = await fetch('/api/agent/classement', { headers: await authHeaders(), cache: 'no-store' })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Erreur de chargement'); setClients([]) }
            else setClients(json.clients || [])
        } catch {
            setError('Erreur de connexion')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { load() }, [load])

    const backfill = async () => {
        setBackfilling(true); setFlash('')
        try {
            const res = await fetch('/api/agent/classement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                body: JSON.stringify({ action: 'backfill' }),
            })
            const json = await res.json()
            if (res.ok) { setFlash(`${json.imported || 0} client(s) importé(s).`); await load() }
            else setError(json.error || 'Import impossible')
        } catch { setError('Erreur de connexion') }
        finally { setBackfilling(false) }
    }

    const openEditor = (c: ClientRow) => {
        setEditingId(c.id); setDraftNotes(c.notes || ''); setDraftStatus(c.status)
    }

    const saveEditor = async (id: string) => {
        setSaving(true)
        try {
            const res = await fetch('/api/agent/classement', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                body: JSON.stringify({ id, notes: draftNotes, status: draftStatus }),
            })
            if (res.ok) {
                setClients(prev => prev.map(c => c.id === id ? { ...c, notes: draftNotes, status: draftStatus, last_review_at: new Date().toISOString() } : c))
                setEditingId(null)
            }
        } finally { setSaving(false) }
    }

    const submitAdd = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) { setAddError('Email invalide.'); return }
        setAdding(true); setAddError('')
        try {
            const res = await fetch('/api/agent/classement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                body: JSON.stringify({
                    action: 'add',
                    full_name: addForm.full_name.trim() || null,
                    email: addForm.email.trim(),
                    phone: addForm.phone.trim() || null,
                    service_category: addForm.service_category,
                    service_label: addForm.service_label.trim() || null,
                    notes: addForm.notes.trim() || null,
                    first_contact_at: addForm.first_contact_at ? new Date(addForm.first_contact_at).toISOString() : undefined,
                }),
            })
            const json = await res.json()
            if (res.ok) {
                setAddOpen(false); setAddForm(emptyAdd); setFlash('Client ajouté avec succès.'); await load()
            } else {
                setAddError(json.error || 'Ajout impossible.')
            }
        } catch { setAddError('Erreur de connexion.') }
        finally { setAdding(false) }
    }

    // Filtrage
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        return clients.filter(c => {
            if (catFilter !== 'all' && c.service_category !== catFilter) return false
            if (!q) return true
            return (c.full_name || '').toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone || '').includes(q)
        })
    }, [clients, search, catFilter])

    // Groupement par catégorie (ordre des catégories officielles)
    const grouped = useMemo(() => {
        return SERVICE_CATEGORIES
            .map(cat => ({ cat, rows: filtered.filter(c => c.service_category === cat.slug) }))
            .filter(g => g.rows.length > 0)
    }, [filtered])

    // KPIs
    const kpis = useMemo(() => {
        let dues = 0
        for (const c of clients) {
            const d = daysSince(c.first_contact_at)
            if (dueMilestones(d, Array.isArray(c.relances_sent) ? c.relances_sent : []).length > 0
                && !['perdu', 'termine'].includes(c.status)) dues++
        }
        const actifs = clients.filter(c => !['perdu', 'termine', 'converti'].includes(c.status)).length
        return { total: clients.length, dues, actifs }
    }, [clients])

    const kpiCards = [
        { icon: Users, label: 'Clients suivis', value: kpis.total, color: '#10B981' },
        { icon: Clock, label: 'Dossiers actifs', value: kpis.actifs, color: '#C9A84C' },
        { icon: BellRing, label: 'Relances à faire', value: kpis.dues, color: '#EF4444' },
    ]

    return (
        <div className={`p-5 md:p-8 max-w-6xl mx-auto ${p.page}`}>
            {/* En-tête */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Classement Client</h1>
                        <p className={`text-sm ${p.sub}`}>Suivi intelligent par service · relances automatiques 15 → 90 jours</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => { setAddForm(emptyAdd); setAddError(''); setAddOpen(true) }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1a2332] hover:bg-[#2c3b55] text-white text-sm font-semibold active:scale-[0.98] transition">
                        <UserPlus className="w-4 h-4" /> Ajouter un client
                    </button>
                    <button type="button" onClick={backfill} disabled={backfilling}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition">
                        {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                        Importer l&apos;existant
                    </button>
                </div>
            </header>

            {flash && <p className="mb-4 text-sm text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {flash}</p>}

            {/* KPIs */}
            <section className="grid grid-cols-3 gap-3 mb-6">
                {kpiCards.map(k => (
                    <div key={k.label} className={`rounded-2xl border p-4 ${p.card}`}>
                        <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
                        <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
                        <p className={`text-xs ${p.sub}`}>{k.label}</p>
                    </div>
                ))}
            </section>

            {/* Filtres */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${p.faint}`} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client (nom, email, téléphone)…"
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none focus:border-emerald-500 ${p.input}`} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setCatFilter('all')}
                        className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition ${catFilter === 'all' ? 'bg-emerald-600 border-emerald-600 text-white' : p.chip}`}>
                        Tous
                    </button>
                    {SERVICE_CATEGORIES.map(cat => (
                        <button key={cat.slug} onClick={() => setCatFilter(cat.slug)}
                            className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition ${catFilter === cat.slug ? 'text-white' : p.chip}`}
                            style={catFilter === cat.slug ? { backgroundColor: cat.color, borderColor: cat.color } : undefined}>
                            {cat.emoji} {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* États */}
            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map(i => <div key={i} className={`h-24 rounded-2xl border animate-pulse ${p.card}`} />)}
                </div>
            ) : error ? (
                <div className={`rounded-2xl border p-8 text-center ${p.card}`}>
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="font-semibold">{error}</p>
                    <button onClick={load} className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-500 hover:underline">
                        <RefreshCw className="w-4 h-4" /> Réessayer
                    </button>
                </div>
            ) : clients.length === 0 ? (
                <div className={`rounded-2xl border p-10 text-center ${p.card}`}>
                    <Inbox className={`w-9 h-9 mx-auto mb-3 ${p.faint}`} />
                    <p className="font-semibold mb-1">Aucun client pour l&apos;instant</p>
                    <p className={`text-sm ${p.sub} mb-4`}>Les nouveaux RDV, prospects et messages s&apos;ajouteront automatiquement ici. Vous pouvez aussi importer les clients déjà collectés.</p>
                    <button onClick={backfill} disabled={backfilling}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60">
                        {backfilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                        Importer les clients existants
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {grouped.map(({ cat, rows }) => (
                        <section key={cat.slug}>
                            {/* En-tête de catégorie */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className="w-1.5 h-6 rounded-full" style={{ backgroundColor: cat.color }} />
                                <h2 className="text-base font-bold flex items-center gap-2">{cat.emoji} {cat.label}</h2>
                                <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 border ${p.chip}`}>{rows.length}</span>
                            </div>

                            <div className="space-y-3">
                                {rows.map(c => {
                                    const d = daysSince(c.first_contact_at)
                                    const sent = Array.isArray(c.relances_sent) ? c.relances_sent : []
                                    const due = dueMilestones(d, sent).length > 0 && !['perdu', 'termine'].includes(c.status)
                                    const nm = nextMilestone(d)
                                    const st = getStatus(c.status)
                                    const isEditing = editingId === c.id
                                    return (
                                        <motion.div key={c.id} layout
                                            className={`rounded-2xl border ${p.card} ${p.cardHover} transition overflow-hidden`}>
                                            {/* Ligne principale */}
                                            <button type="button" onClick={() => (isEditing ? setEditingId(null) : openEditor(c))}
                                                className="w-full flex items-center gap-4 p-4 text-left">
                                                <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                                                    style={{ backgroundColor: cat.color }}>
                                                    {initials(c.full_name, c.email)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold truncate">{c.full_name || c.email}</p>
                                                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ${p.sub}`}>
                                                        <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>
                                                        {c.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {due && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-500">
                                                            <BellRing className="w-3 h-3" /> Relance
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                                                        style={{ backgroundColor: `${st.color}22`, color: st.color }}>
                                                        {st.label}
                                                    </span>
                                                    <span className="text-[11px] font-black px-2 py-1 rounded-lg"
                                                        style={{ backgroundColor: `${ageColor(d)}1a`, color: ageColor(d) }}>
                                                        {d}j
                                                    </span>
                                                    <ChevronDown className={`w-4 h-4 ${p.faint} transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {/* Éditeur déroulant */}
                                            <AnimatePresence initial={false}>
                                                {isEditing && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                        className={`border-t ${p.divider}`}>
                                                        <div className="p-4 space-y-4">
                                                            <div className={`flex flex-wrap items-center gap-3 text-xs ${p.sub}`}>
                                                                <span>Premier contact : <strong className={p.page}>{new Date(c.first_contact_at).toLocaleDateString('fr-FR')}</strong></span>
                                                                <span>·</span>
                                                                <span>{nm ? `Prochaine relance à ${nm}j (dans ${Math.max(0, nm - d)}j)` : 'Toutes les relances passées'}</span>
                                                                {c.service_label && <><span>·</span><span>Origine : {c.service_label}</span></>}
                                                            </div>

                                                            <div>
                                                                <label className={`block text-xs font-semibold mb-1.5 ${p.sub}`}>Statut du dossier</label>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {CLIENT_STATUSES.map(s => (
                                                                        <button key={s.value} type="button" onClick={() => setDraftStatus(s.value)}
                                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition"
                                                                            style={draftStatus === s.value
                                                                                ? { backgroundColor: s.color, borderColor: s.color, color: '#fff' }
                                                                                : { borderColor: `${s.color}55`, color: s.color }}>
                                                                            {s.label}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className={`block text-xs font-semibold mb-1.5 ${p.sub}`}>
                                                                    Notes — où en est-on ? problèmes ? possibilités ?
                                                                </label>
                                                                <textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} rows={4}
                                                                    placeholder="Ex. Dossier passeport en attente de l'extrait de naissance. Client relancé le 12. Possibilité d'accélérer via le partenaire X…"
                                                                    className={`w-full p-3 rounded-xl border outline-none focus:border-emerald-500 resize-y text-sm ${p.input}`} />
                                                                <p className={`text-[11px] mt-1.5 ${p.faint}`}>
                                                                    Ces notes alimentent les emails de relance et les suggestions de l&apos;assistant IA envoyés à l&apos;équipe.
                                                                </p>
                                                            </div>

                                                            <div className="flex gap-2">
                                                                <button type="button" onClick={() => saveEditor(c.id)} disabled={saving}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition">
                                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer
                                                                </button>
                                                                <button type="button" onClick={() => setEditingId(null)}
                                                                    className={`px-4 py-2 rounded-xl border text-sm font-medium ${p.chip}`}>Fermer</button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                    {grouped.length === 0 && (
                        <p className={`text-center text-sm ${p.sub} py-8`}>Aucun client ne correspond à votre recherche.</p>
                    )}
                </div>
            )}

            {/* ── Modal : ajout manuel d'un client ── */}
            <AnimatePresence>
                {addOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => !adding && setAddOpen(false)}>
                        <motion.div
                            initial={{ scale: 0.95, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                            onClick={e => e.stopPropagation()}
                            className={`w-full max-w-lg rounded-2xl border overflow-hidden ${p.dark ? 'bg-[#0f141e] border-white/10' : 'bg-white border-gray-100'} ${p.page}`}>
                            <div className="h-1 w-full bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" />
                            <div className="flex items-center justify-between px-5 py-4">
                                <h3 className="font-bold flex items-center gap-2"><UserPlus className="w-5 h-5 text-emerald-500" /> Ajouter un client</h3>
                                <button type="button" onClick={() => setAddOpen(false)} className={p.faint} title="Fermer"><X className="w-5 h-5" /></button>
                            </div>
                            <div className={`px-5 pb-5 space-y-3 border-t ${p.divider} pt-4`}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Nom complet</label>
                                        <input value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))}
                                            placeholder="Nom et prénom" className={`w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 text-sm ${p.input}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Email *</label>
                                        <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                                            placeholder="client@exemple.com" className={`w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 text-sm ${p.input}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Téléphone</label>
                                        <input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                                            placeholder="+229…" className={`w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 text-sm ${p.input}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Premier contact</label>
                                        <input type="date" title="Premier contact" value={addForm.first_contact_at} onChange={e => setAddForm(f => ({ ...f, first_contact_at: e.target.value }))}
                                            max={new Date().toISOString().split('T')[0]}
                                            className={`w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 text-sm ${p.input}`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Catégorie de service</label>
                                    <div className="flex flex-wrap gap-2">
                                        {SERVICE_CATEGORIES.map(cat => (
                                            <button key={cat.slug} type="button" onClick={() => setAddForm(f => ({ ...f, service_category: cat.slug }))}
                                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition"
                                                style={addForm.service_category === cat.slug
                                                    ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' }
                                                    : { borderColor: `${cat.color}55`, color: cat.color }}>
                                                {cat.emoji} {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-semibold mb-1 ${p.sub}`}>Notes (facultatif)</label>
                                    <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                                        placeholder="Contexte, demande, problèmes…" className={`w-full px-3 py-2 rounded-lg border outline-none focus:border-emerald-500 resize-y text-sm ${p.input}`} />
                                </div>
                                {addError && <p className="text-sm text-red-500 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {addError}</p>}
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={submitAdd} disabled={adding}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.98] transition">
                                        {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Enregistrer le client
                                    </button>
                                    <button type="button" onClick={() => setAddOpen(false)} disabled={adding}
                                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium ${p.chip}`}>Annuler</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
