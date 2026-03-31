'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
    X, CheckCircle2, Loader2, ArrowRight, Phone, MessageSquare,
    Send, AlertCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────

export interface OrderableService {
    id: string           // slug / identifiant
    title: string
    description: string
    color: string        // gradient Tailwind (ex: 'from-purple-500 to-violet-600')
    icon?: React.ComponentType<{ size?: number; className?: string }>
    badge?: string
    features?: string[]
}

interface ServiceOrderDrawerProps {
    service: OrderableService | null
    onClose: () => void
    onSuccess?: (dossierId: string) => void
}

// ── Composant ────────────────────────────────────────────────────

export function ServiceOrderDrawer({ service, onClose, onSuccess }: ServiceOrderDrawerProps) {
    const [description, setDescription] = useState('')
    const [phone, setPhone] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [createdRef, setCreatedRef] = useState('')
    const [clientEmail, setClientEmail] = useState('')

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) setClientEmail(session.user.email)
        })
    }, [])

    // Reset form quand le service change
    useEffect(() => {
        setDescription('')
        setPhone('')
        setError('')
        setSuccess(false)
        setCreatedRef('')
    }, [service?.id])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!service) return
        if (!description.trim()) {
            setError('Veuillez décrire votre besoin.')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token

            const res = await fetch('/api/client/service-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    service_id: service.id,
                    service_type: service.title,
                    service_title: service.title,
                    description: description.trim(),
                    phone: phone.trim() || undefined,
                    client_email: clientEmail,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission')

            setCreatedRef(data.dossier?.num_dossier || '')
            setSuccess(true)
            onSuccess?.(data.dossier?.id || '')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {service && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300]"
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-[#060d1a] border-l border-white/[0.08] z-[301] flex flex-col overflow-hidden shadow-2xl"
                    >
                        {/* Header service */}
                        <div className={`bg-gradient-to-br ${service.color} p-[1px] flex-shrink-0`}>
                            <div className="bg-[#060d1a] px-6 py-5">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        {service.badge && (
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1 block">{service.badge}</span>
                                        )}
                                        <h2 className="text-xl font-black text-white leading-tight">{service.title}</h2>
                                        <p className="text-gray-400 text-sm mt-1 leading-relaxed">{service.description}</p>
                                    </div>
                                    <button type="button" onClick={onClose}
                                        className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors flex-shrink-0">
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Features */}
                                {service.features && service.features.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {service.features.map((feat, i) => (
                                            <span key={i} className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-gray-300">
                                                {feat}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Corps */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {success ? (
                                /* ── État succès ── */
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                        <CheckCircle2 size={32} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black text-lg mb-2">Demande envoyée !</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            Votre demande a bien été reçue. Notre équipe vous contactera sous 24-48h.
                                        </p>
                                        {createdRef && (
                                            <p className="mt-2 text-[11px] font-mono text-gray-500">Référence : <span className="text-blue-400">{createdRef}</span></p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 w-full max-w-xs">
                                        <Link href="/client/dossier"
                                            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-sm font-bold transition-all border border-blue-500/20">
                                            Voir dans mon dossier <ArrowRight size={14} />
                                        </Link>
                                        <button type="button" onClick={onClose}
                                            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] text-gray-400 text-sm font-bold transition-all border border-white/[0.06]">
                                            Fermer
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                /* ── Formulaire ── */
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                                            Décrivez votre besoin
                                        </p>

                                        {/* Description */}
                                        <div className="space-y-1.5">
                                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                                                <MessageSquare size={11} />
                                                Votre demande <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                value={description}
                                                onChange={e => { setDescription(e.target.value); setError('') }}
                                                placeholder={`Décrivez votre besoin pour ${service.title}...`}
                                                rows={5}
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] resize-none transition-all"
                                            />
                                            <p className="text-[10px] text-gray-600 text-right">{description.length}/1000</p>
                                        </div>

                                        {/* Téléphone */}
                                        <div className="space-y-1.5 mt-4">
                                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                                                <Phone size={11} />
                                                Téléphone / WhatsApp <span className="text-gray-600">(optionnel)</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="+229 XX XX XX XX"
                                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/40 focus:bg-white/[0.06] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Compte connecté */}
                                    {clientEmail && (
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15">
                                            <CheckCircle2 size={12} className="text-blue-400 flex-shrink-0" />
                                            <p className="text-[11px] text-blue-300/80">
                                                Demande liée à : <span className="font-bold">{clientEmail}</span>
                                            </p>
                                        </div>
                                    )}

                                    {/* Erreur */}
                                    {error && (
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                                            <AlertCircle size={12} className="text-red-400 flex-shrink-0" />
                                            <p className="text-[11px] text-red-300">{error}</p>
                                        </div>
                                    )}

                                    {/* Info délai */}
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-gray-500 leading-relaxed">
                                        Notre équipe traitera votre demande sous <span className="text-gray-300 font-bold">24 à 48h</span> ouvrables. Vous recevrez une confirmation par email et un suivi dans votre espace client.
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Footer */}
                        {!success && (
                            <div className="flex-shrink-0 p-4 border-t border-white/[0.06] bg-[#060d1a]">
                                <button type="button" onClick={handleSubmit} disabled={submitting || !description.trim()}
                                    className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-black transition-all ${
                                        submitting || !description.trim()
                                            ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                                            : `bg-gradient-to-r ${service.color} text-white hover:opacity-90 shadow-lg`
                                    }`}>
                                    {submitting ? (
                                        <><Loader2 size={15} className="animate-spin" /> Envoi en cours...</>
                                    ) : (
                                        <><Send size={15} /> Envoyer ma demande</>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
