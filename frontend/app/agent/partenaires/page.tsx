'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Handshake, Building2, Mail, Phone, Globe, MapPin,
    CheckCircle2, Clock, MessageSquare, Ban, ChevronDown,
    ChevronUp, RefreshCw, Users, Star, Sparkles, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Application {
    id: string
    company_name: string
    contact_name: string
    email: string
    phone: string
    whatsapp: string
    website: string
    category: string
    location: string
    activity_description: string
    target_audience: string
    years_in_business: string
    team_size: string
    why_partner: string
    what_offer: string
    partnership_types: string[]
    status: 'pending' | 'contacted' | 'confirmed' | 'rejected'
    is_read: boolean
    created_at: string
}

interface Toast { id: number; type: 'success' | 'error'; msg: string }

const STATUS_META = {
    pending: { label: 'En attente', text: 'text-[#FCD116]', bg: 'bg-[#FCD116]/10', border: 'border-[#FCD116]/20', icon: Clock },
    contacted: { label: 'Contacté', text: 'text-[#3b82f6]', bg: 'bg-[#3b82f6]/10', border: 'border-[#3b82f6]/20', icon: MessageSquare },
    confirmed: { label: 'Confirmé', text: 'text-[#008751]', bg: 'bg-[#008751]/10', border: 'border-[#008751]/20', icon: CheckCircle2 },
    rejected: { label: 'Rejeté', text: 'text-[#E8112D]', bg: 'bg-[#E8112D]/10', border: 'border-[#E8112D]/20', icon: Ban },
}

export default function AgentPartenairesPage() {
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | Application['status']>('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [updating, setUpdating] = useState<string | null>(null)
    const [toasts, setToasts] = useState<Toast[]>([])
    const [toastCounter, setToastCounter] = useState(0)

    const addToast = useCallback((type: Toast['type'], msg: string) => {
        const id = toastCounter + 1
        setToastCounter(id)
        setToasts(t => [...t, { id, type, msg }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
    }, [toastCounter])

    const fetchApplications = useCallback(async () => {
        setLoading(true)
        const res = await fetch('/api/admin/partner-applications')
        if (res.ok) {
            const data = await res.json()
            setApplications(data.applications || [])
        }
        setLoading(false)
    }, [])

    useEffect(() => { fetchApplications() }, [fetchApplications])

    const updateStatus = async (app: Application, status: Application['status']) => {
        setUpdating(app.id)
        try {
            const res = await fetch(`/api/admin/partner-applications/${app.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, is_read: true, notes: notes[app.id] ?? '' }),
            })
            if (!res.ok) throw new Error('Erreur')
            setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status, is_read: true } : a))
            addToast('success', `Statut : ${STATUS_META[status].label}`)
        } catch {
            addToast('error', 'Erreur lors de la mise à jour')
        } finally { setUpdating(null) }
    }

    const markRead = async (id: string) => {
        await fetch(`/api/admin/partner-applications/${id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_read: true }),
        })
        setApplications(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    }

    const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)
    const unread = applications.filter(a => !a.is_read).length

    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        contacted: applications.filter(a => a.status === 'contacted').length,
        confirmed: applications.filter(a => a.status === 'confirmed').length,
    }

    return (
        <div className="space-y-8">
            {/* Toasts */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className={cn('flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold pointer-events-auto border',
                                t.type === 'success' ? 'bg-[#0a1a0f] border-[#008751]/30 text-[#00c870]' : 'bg-[#1a0a0a] border-[#E8112D]/30 text-[#ff4d4d]')}>
                            <CheckCircle2 size={15} /> {t.msg}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Handshake size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Réseau</span>
                    </div>
                    <h1 className="text-3xl font-black text-white font-heading tracking-tighter flex items-center gap-3">
                        Candidatures <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD116] to-[#008751]">Partenaires</span>
                        {unread > 0 && (
                            <span className="text-sm bg-[#E8112D] text-white font-black px-2.5 py-1 rounded-full">{unread} nouveau{unread > 1 ? 'x' : ''}</span>
                        )}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Gérez les demandes de partenariat soumises via le formulaire public
                    </p>
                </div>
                <button type="button" onClick={fetchApplications}
                    className="flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-4 py-2.5 rounded-xl transition-all border border-white/5">
                    <RefreshCw size={13} /> Rafraîchir
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total reçues', value: stats.total, cls: 'text-white', icon: Users },
                    { label: 'En attente', value: stats.pending, cls: 'text-[#FCD116]', icon: Clock },
                    { label: 'Contactées', value: stats.contacted, cls: 'text-[#3b82f6]', icon: MessageSquare },
                    { label: 'Confirmées', value: stats.confirmed, cls: 'text-[#008751]', icon: Star },
                ].map(s => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                            <s.icon size={14} className={s.cls} />
                        </div>
                        <div>
                            <p className={cn('text-xl font-black font-mono', s.cls)}>{s.value}</p>
                            <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold leading-tight">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit flex-wrap">
                {(['all', 'pending', 'contacted', 'confirmed', 'rejected'] as const).map(f => (
                    <button key={f} type="button" onClick={() => setFilter(f)}
                        className={cn('text-xs font-bold px-4 py-2 rounded-lg transition-all',
                            filter === f ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white')}>
                        {f === 'all' ? `Toutes (${applications.length})` : `${STATUS_META[f].label} (${applications.filter(a => a.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-7 h-7 border-2 border-[#FCD116]/30 border-t-[#FCD116] rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <Sparkles size={32} className="text-gray-700" />
                    <p className="text-gray-500 text-sm font-bold">Aucune candidature trouvée</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((app, i) => {
                        const meta = STATUS_META[app.status]
                        const StatusIcon = meta.icon
                        const isOpen = expandedId === app.id
                        return (
                            <motion.div key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                className={cn('bg-white/[0.03] border rounded-2xl overflow-hidden transition-all', !app.is_read ? 'border-[#FCD116]/25' : 'border-white/5')}>
                                {/* Row */}
                                <div className="flex items-center justify-between gap-4 p-4">
                                    <button type="button" onClick={() => { setExpandedId(isOpen ? null : app.id); if (!app.is_read) markRead(app.id) }}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-[#008751]/10 border border-[#008751]/20 flex items-center justify-center flex-shrink-0">
                                            <Building2 size={16} className="text-[#008751]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-bold text-sm text-white">{app.company_name}</p>
                                                {!app.is_read && <span className="w-2 h-2 rounded-full bg-[#FCD116] flex-shrink-0" title="Nouveau" />}
                                                <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full border flex items-center gap-1', meta.bg, meta.border, meta.text)}>
                                                    <StatusIcon size={9} /> {meta.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5 truncate">{app.contact_name} • {app.category} • {app.location}</p>
                                        </div>
                                        {isOpen ? <ChevronUp size={14} className="text-gray-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />}
                                    </button>

                                    {/* Quick contact */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {app.email && (
                                            <a href={`mailto:${app.email}?subject=Retour Gagnant — Suite à votre candidature partenaire`}
                                                title={`Envoyer un email à ${app.contact_name}`}
                                                onClick={() => app.status === 'pending' && updateStatus(app, 'contacted')}
                                                className="flex items-center gap-1 text-[11px] font-bold bg-[#3b82f6]/15 text-[#3b82f6] hover:bg-[#3b82f6]/25 border border-[#3b82f6]/20 px-3 py-1.5 rounded-lg transition-all">
                                                <Mail size={11} /> Email
                                            </a>
                                        )}
                                        {app.whatsapp && (
                                            <a href={`https://wa.me/${app.whatsapp.replace(/\s+/g, '')}?text=Bonjour ${app.contact_name}, suite à votre candidature partenaire chez Retour Gagnant...`}
                                                target="_blank" rel="noopener noreferrer" title="Contacter sur WhatsApp"
                                                onClick={() => app.status === 'pending' && updateStatus(app, 'contacted')}
                                                className="flex items-center gap-1 text-[11px] font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 px-3 py-1.5 rounded-lg transition-all">
                                                <Phone size={11} /> WA
                                            </a>
                                        )}
                                        <button type="button" title="Voir le détail" onClick={() => { setExpandedId(isOpen ? null : app.id); if (!app.is_read) markRead(app.id) }}
                                            className="p-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-colors">
                                            <Eye size={13} />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded */}
                                <AnimatePresence>
                                    {isOpen && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                            <div className="border-t border-white/5 p-5 space-y-4">
                                                {/* Contact info */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {[
                                                        { icon: Mail, label: 'Email', value: app.email },
                                                        { icon: Phone, label: 'Tél / WA', value: app.phone || app.whatsapp },
                                                        { icon: Globe, label: 'Site', value: app.website },
                                                        { icon: MapPin, label: 'Lieu', value: app.location },
                                                        { icon: Users, label: 'Équipe', value: app.team_size },
                                                        { icon: Handshake, label: 'Ancienneté', value: app.years_in_business },
                                                    ].filter(r => r.value).map(({ icon: Icon, label, value }) => (
                                                        <div key={label} className="flex items-center gap-2 text-[11px]">
                                                            <Icon size={11} className="text-gray-500 flex-shrink-0" />
                                                            <span className="text-gray-500">{label} :</span>
                                                            <span className="text-white font-bold truncate">{value}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {app.activity_description && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Activité</p>
                                                        <p className="text-xs text-gray-300 leading-relaxed border-l-2 border-white/10 pl-3">{app.activity_description}</p>
                                                    </div>
                                                )}
                                                {app.why_partner && (
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Motivation</p>
                                                        <p className="text-xs text-gray-300 leading-relaxed border-l-2 border-[#FCD116]/30 pl-3">{app.why_partner}</p>
                                                    </div>
                                                )}
                                                {app.partnership_types?.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {app.partnership_types.map(pt => (
                                                            <span key={pt} className="text-[10px] font-bold bg-[#FCD116]/10 text-[#FCD116] border border-[#FCD116]/20 px-2 py-1 rounded-lg">{pt}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                <textarea
                                                    value={notes[app.id] ?? ''}
                                                    onChange={e => setNotes(p => ({ ...p, [app.id]: e.target.value }))}
                                                    placeholder="Ajouter une note interne..."
                                                    title="Notes internes"
                                                    rows={2}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/20 resize-none placeholder-gray-600"
                                                />

                                                {/* Actions */}
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                                    {app.status !== 'contacted' && (
                                                        <button type="button" disabled={!!updating} onClick={() => updateStatus(app, 'contacted')}
                                                            className="flex items-center gap-1.5 text-xs font-bold bg-[#3b82f6]/15 text-[#3b82f6] hover:bg-[#3b82f6]/25 border border-[#3b82f6]/20 px-4 py-2 rounded-xl transition-all disabled:opacity-40">
                                                            <MessageSquare size={12} /> Marquer contacté
                                                        </button>
                                                    )}
                                                    {app.status !== 'confirmed' && (
                                                        <button type="button" disabled={!!updating} onClick={() => updateStatus(app, 'confirmed')}
                                                            className="flex items-center gap-1.5 text-xs font-bold bg-[#008751]/15 text-[#008751] hover:bg-[#008751]/25 border border-[#008751]/20 px-4 py-2 rounded-xl transition-all disabled:opacity-40">
                                                            <CheckCircle2 size={12} /> Confirmer
                                                        </button>
                                                    )}
                                                    {app.status !== 'rejected' && (
                                                        <button type="button" disabled={!!updating} onClick={() => updateStatus(app, 'rejected')}
                                                            className="flex items-center gap-1.5 text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 px-4 py-2 rounded-xl transition-all disabled:opacity-40">
                                                            <Ban size={12} /> Rejeter
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
