'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
    Calendar, MapPin, Clock, Users, Ticket, Crown,
    ArrowLeft, CheckCircle2, X, Share2, ChevronLeft, ChevronRight,
    Phone, Mail, User, CreditCard,
} from 'lucide-react'

interface EventData {
    id: string; title: string; slug: string; description: string; short_description: string
    location: string; location_map_url: string; start_date: string; end_date: string
    price_standard: number; price_vip: number; currency: string
    max_capacity: number; max_vip_seats: number; status: string
    cover_image_url: string; category: string; is_featured: boolean
    event_images: { id: string; url: string; alt_text: string; sort_order: number }[]
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const formatTime = (d: string) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

const PAYMENT_METHODS = [
    { id: 'kkiapay', label: 'Kkiapay (Mobile Money)', region: 'Bénin' },
    { id: 'fedapay', label: 'FedaPay', region: 'Afrique Ouest' },
    { id: 'stripe', label: 'Carte Bancaire (Stripe)', region: 'International' },
    { id: 'paypal', label: 'PayPal', region: 'International' },
]

export default function EventDetailPage() {
    const params = useParams()
    const slug = params?.slug as string

    const [event, setEvent] = useState<EventData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [ticketType, setTicketType] = useState<'standard' | 'vip'>('standard')
    const [formStep, setFormStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')
    const [galleryIdx, setGalleryIdx] = useState(0)
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', whatsapp: '', payment_method: '' })

    useEffect(() => {
        if (!slug) return
        fetch(`/api/events?admin=false`)
            .then(r => r.json())
            .then(d => {
                const found = (d.events || []).find((e: EventData) => e.slug === slug)
                setEvent(found || null)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [slug])

    const openRegistration = useCallback((type: 'standard' | 'vip') => {
        setTicketType(type)
        setFormStep(0)
        setError('')
        setSuccess(false)
        setShowModal(true)
    }, [])

    const handleSubmit = async () => {
        if (!event) return
        if (!form.full_name || !form.email || !form.phone) {
            setError('Veuillez remplir tous les champs obligatoires')
            return
        }
        setSubmitting(true)
        setError('')
        try {
            const res = await fetch(`/api/events/${event.id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, ticket_type: ticketType, payment_method: form.payment_method }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erreur')

            if (data.requires_payment) {
                setFormStep(2)
            } else {
                setSuccess(true)
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur lors de l\'inscription')
        } finally {
            setSubmitting(false)
        }
    }

    const images = event?.event_images?.sort((a, b) => a.sort_order - b.sort_order) || []
    const allImages = event?.cover_image_url
        ? [{ url: event.cover_image_url, alt_text: event.title }, ...images.map(i => ({ url: i.url, alt_text: i.alt_text }))]
        : images.map(i => ({ url: i.url, alt_text: i.alt_text }))

    if (loading) return (
        <div className="min-h-screen bg-[#030a15] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#008751] border-t-transparent rounded-full animate-spin" />
        </div>
    )

    if (!event) return (
        <div className="min-h-screen bg-[#030a15] text-white flex flex-col items-center justify-center gap-4">
            <Calendar size={48} className="text-gray-700" />
            <p className="text-gray-500 font-bold">Événement introuvable</p>
            <Link href="/evenements" className="text-[#008751] text-sm font-bold hover:underline flex items-center gap-1"><ArrowLeft size={14} /> Retour aux événements</Link>
        </div>
    )

    const price = ticketType === 'vip' ? event.price_vip : event.price_standard
    const isFree = price === 0

    return (
        <div className="min-h-screen bg-[#030a15] text-white">
            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full opacity-[0.05]"
                    style={{ background: 'radial-gradient(circle, #008751, transparent 60%)' }} />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 pt-8 pb-20">
                {/* Back */}
                <Link href="/evenements" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#FCD116] transition-colors mb-8">
                    <ArrowLeft size={14} /> Retour aux événements
                </Link>

                <div className="grid lg:grid-cols-5 gap-8">
                    {/* LEFT — Gallery + Description */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Gallery */}
                        {allImages.length > 0 && (
                            <div className="relative rounded-[24px] overflow-hidden border border-white/[0.08]">
                                <div className="relative h-72 md:h-96">
                                    <Image src={allImages[galleryIdx]?.url || ''} alt={allImages[galleryIdx]?.alt_text || ''} fill className="object-cover" />
                                </div>
                                {allImages.length > 1 && (
                                    <>
                                        <button onClick={() => setGalleryIdx(i => (i - 1 + allImages.length) % allImages.length)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm border border-white/10 cursor-pointer">
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button onClick={() => setGalleryIdx(i => (i + 1) % allImages.length)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm border border-white/10 cursor-pointer">
                                            <ChevronRight size={18} />
                                        </button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {allImages.map((_, idx) => (
                                                <button key={idx} onClick={() => setGalleryIdx(idx)}
                                                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${idx === galleryIdx ? 'bg-[#FCD116] w-6' : 'bg-white/30'}`} />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Description */}
                        <div className="rounded-[24px] border border-white/[0.08] p-6 md:p-8 space-y-4"
                            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))' }}>
                            <h2 className="text-base font-black text-white uppercase tracking-wider">
                                <span className="text-[#008751]">—</span> Description
                            </h2>
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed whitespace-pre-line">
                                {event.description || event.short_description || 'Aucune description disponible.'}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Info card + CTA */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-[24px] border border-white/[0.08] p-6 space-y-5 sticky top-24"
                            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}>

                            <span className="text-[10px] font-bold text-[#008751] uppercase tracking-widest">{event.category}</span>
                            <h1 className="text-2xl font-black font-heading tracking-tight">{event.title}</h1>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#FCD116]/10"><Calendar size={14} className="text-[#FCD116]" /></div>
                                    <div>
                                        <div className="text-white font-bold text-xs">{formatDate(event.start_date)}</div>
                                        <div className="text-gray-600 text-[11px]">{formatTime(event.start_date)}{event.end_date && ` — ${formatTime(event.end_date)}`}</div>
                                    </div>
                                </div>
                                {event.location && (
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#008751]/10"><MapPin size={14} className="text-[#008751]" /></div>
                                        <div className="text-white font-bold text-xs">{event.location}</div>
                                    </div>
                                )}
                                {event.max_capacity > 0 && (
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5"><Users size={14} className="text-gray-400" /></div>
                                        <div className="text-gray-500 text-xs">{event.max_capacity} places disponibles</div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-white/[0.06] pt-5 space-y-3">
                                {/* Standard ticket */}
                                <button
                                    onClick={() => openRegistration('standard')}
                                    className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #008751, #006b40)',
                                        boxShadow: '0 8px 32px rgba(0,135,81,0.35), 0 2px 8px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    <Ticket size={16} />
                                    {isFree ? 'Participer gratuitement' : `Participer — ${formatPrice(event.price_standard)} ${event.currency}`}
                                </button>

                                {/* VIP ticket */}
                                {event.price_vip > 0 && (
                                    <button
                                        onClick={() => openRegistration('vip')}
                                        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 text-[#030a15] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                        style={{
                                            background: 'linear-gradient(135deg, #FCD116, #f59e0b)',
                                            boxShadow: '0 8px 32px rgba(252,209,22,0.35), 0 2px 8px rgba(0,0,0,0.4)',
                                        }}
                                    >
                                        <Crown size={16} />
                                        Réserver VIP — {formatPrice(event.price_vip)} {event.currency}
                                    </button>
                                )}
                            </div>

                            <button className="w-full py-3 rounded-2xl border border-white/[0.08] text-xs font-bold text-gray-500 flex items-center justify-center gap-2 hover:border-white/15 transition-all cursor-pointer">
                                <Share2 size={13} /> Partager cet événement
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── REGISTRATION MODAL ── */}
            <AnimatePresence>
                {showModal && event && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-lg rounded-[28px] border border-white/[0.08] overflow-hidden"
                            style={{ background: 'linear-gradient(160deg, #0a1628, #06101e)' }}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: ticketType === 'vip' ? 'linear-gradient(135deg, #FCD116, #f59e0b)' : 'linear-gradient(135deg, #008751, #006b40)' }}>
                                        {ticketType === 'vip' ? <Crown size={18} className="text-[#030a15]" /> : <Ticket size={18} className="text-white" />}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-white">Inscription {ticketType === 'vip' ? 'VIP' : 'Standard'}</h3>
                                        <p className="text-[10px] text-gray-600">{event.title}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white cursor-pointer">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {success ? (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                                            style={{ background: 'linear-gradient(135deg, #008751, #0d9488)', boxShadow: '0 12px 40px rgba(0,135,81,0.4)' }}>
                                            <CheckCircle2 size={32} className="text-white" />
                                        </div>
                                        <h4 className="text-lg font-black text-white">Inscription confirmée !</h4>
                                        <p className="text-gray-400 text-sm">Votre ticket vous sera envoyé par email à <strong className="text-[#FCD116]">{form.email}</strong></p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Step indicators */}
                                        <div className="flex items-center gap-2 justify-center">
                                            {['Informations', 'Paiement'].map((s, i) => (
                                                <div key={s} className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${formStep >= i ? 'bg-[#008751] text-white' : 'bg-white/5 text-gray-600'}`}>
                                                        {i + 1}
                                                    </div>
                                                    <span className={`text-[11px] font-bold ${formStep >= i ? 'text-white' : 'text-gray-600'}`}>{s}</span>
                                                    {i < 1 && <div className={`w-8 h-px ${formStep > i ? 'bg-[#008751]' : 'bg-white/[0.06]'}`} />}
                                                </div>
                                            ))}
                                        </div>

                                        {formStep === 0 && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><User size={11} /> Nom complet *</label>
                                                    <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#008751]/60 transition-all" placeholder="Ex: Marc Essou" />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Mail size={11} /> Email *</label>
                                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#008751]/60 transition-all" placeholder="votre@email.com" />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Phone size={11} /> Téléphone *</label>
                                                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#008751]/60 transition-all" placeholder="+229 XX XX XX XX" />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Phone size={11} /> WhatsApp (optionnel)</label>
                                                    <input type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                                                        className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#008751]/60 transition-all" placeholder="+229 XX XX XX XX" />
                                                </div>
                                            </div>
                                        )}

                                        {formStep === 1 && !isFree && (
                                            <div className="space-y-4">
                                                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-400">Montant à payer</span>
                                                    <span className="text-lg font-black" style={{ color: ticketType === 'vip' ? '#FCD116' : '#008751' }}>
                                                        {formatPrice(price)} {event.currency}
                                                    </span>
                                                </div>
                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={11} /> Moyen de paiement</label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {PAYMENT_METHODS.map(pm => (
                                                        <button key={pm.id} onClick={() => setForm(f => ({ ...f, payment_method: pm.id }))}
                                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${form.payment_method === pm.id ? 'border-[#008751]/50 bg-[#008751]/10' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'}`}>
                                                            <div className="text-xs font-bold text-white">{pm.label}</div>
                                                            <div className="text-[10px] text-gray-600">{pm.region}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {error && <p className="text-xs text-red-400 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

                                        <div className="flex gap-3">
                                            {formStep > 0 && (
                                                <button onClick={() => setFormStep(f => f - 1)}
                                                    className="flex-1 py-3 rounded-2xl border border-white/[0.08] text-xs font-bold text-gray-400 hover:text-white cursor-pointer transition-all">
                                                    Retour
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    if (formStep === 0 && !isFree) setFormStep(1)
                                                    else handleSubmit()
                                                }}
                                                disabled={submitting}
                                                className="flex-1 py-3 rounded-2xl text-xs font-black text-white disabled:opacity-50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                                                style={{
                                                    background: ticketType === 'vip'
                                                        ? 'linear-gradient(135deg, #FCD116, #f59e0b)'
                                                        : 'linear-gradient(135deg, #008751, #006b40)',
                                                    color: ticketType === 'vip' ? '#030a15' : 'white',
                                                    boxShadow: ticketType === 'vip'
                                                        ? '0 8px 24px rgba(252,209,22,0.3)'
                                                        : '0 8px 24px rgba(0,135,81,0.3)',
                                                }}
                                            >
                                                {submitting ? 'Envoi...' : formStep === 0 && !isFree ? 'Continuer' : isFree ? 'Confirmer l\'inscription' : 'Procéder au paiement'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
