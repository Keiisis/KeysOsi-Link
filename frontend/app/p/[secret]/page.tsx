'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getProposalBySecret } from '@/app/actions/ai-proposals'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Loader2, ChevronRight, ChevronLeft, MapPin, Star,
    CreditCard, Calendar, CheckCircle, Sparkles, BookOpen
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProposalItem {
    id: string
    type: string
    title: string
    subtitle?: string
    description: string | null
    location: string | null
    highlights?: string[]
    image_url: string | null
    selling_price: number
    order_index: number
}

interface Proposal {
    id: string
    secret_key: string
    client_name: string
    destination: string
    status: string
    total_amount: number
    start_date: string | null
    end_date: string | null
}

const TYPE_ICONS: Record<string, { label: string, emoji: string }> = {
    hero: { label: 'Bienvenue', emoji: '✨' },
    hotel: { label: 'Hébergement', emoji: '🏨' },
    restaurant: { label: 'Gastronomie', emoji: '🍽️' },
    activity: { label: 'Découverte', emoji: '🎯' },
    transport: { label: 'Transport VIP', emoji: '🚗' },
    pricing: { label: 'Votre Devis', emoji: '💰' },
}

// Cinematic 3D slide transitions
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0,
        scale: 0.8,
        rotateY: direction > 0 ? 25 : -25,
        filter: 'blur(20px)',
    }),
    center: {
        x: 0,
        opacity: 1,
        scale: 1,
        rotateY: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const }
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '50%' : '-50%',
        opacity: 0,
        scale: 0.9,
        rotateY: direction < 0 ? 15 : -15,
        filter: 'blur(15px)',
        transition: { duration: 0.6, ease: [0.7, 0, 0.84, 0] as const }
    }),
}

export default function PresentationView({ params }: { params: Promise<{ secret: string }> }) {
    const { secret } = React.use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [proposal, setProposal] = useState<Proposal | null>(null)
    const [items, setItems] = useState<ProposalItem[]>([])
    const [currentSlide, setCurrentSlide] = useState(0)
    const [direction, setDirection] = useState(0)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const result = await getProposalBySecret(secret)
            if (result.success && result.proposal) {
                setProposal(result.proposal)
                setItems(result.items || [])
            }
            setLoading(false)
        }
        fetch()
    }, [secret])

    const goToSlide = useCallback((newSlide: number) => {
        if (newSlide < 0 || newSlide >= items.length) return
        setDirection(newSlide > currentSlide ? 1 : -1)
        setCurrentSlide(newSlide)
    }, [currentSlide, items.length])

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goToSlide(currentSlide + 1)
            if (e.key === 'ArrowLeft') goToSlide(currentSlide - 1)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [goToSlide, currentSlide])

    // ─── LOADING ──────────────
    if (loading) {
        return (
            <div className="h-screen w-screen bg-[#0a0e17] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full blur-2xl opacity-30 animate-pulse" />
                    <Loader2 className="w-16 h-16 text-[#FCD116] animate-spin relative z-10" />
                </div>
                <div className="text-center">
                    <p className="text-[#FCD116] uppercase tracking-[0.4em] font-black text-sm mb-1">Retour Gagnant Bénin</p>
                    <p className="text-slate-500 text-xs">Préparation de votre expérience...</p>
                </div>
            </div>
        )
    }

    if (!proposal || items.length === 0) {
        return (
            <div className="h-screen w-screen bg-[#0a0e17] flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-[#E8112D]/10 border-2 border-[#E8112D]/30 flex items-center justify-center mb-6">
                    <span className="text-4xl">🔒</span>
                </div>
                <h1 className="text-3xl font-black mb-3">Proposition introuvable</h1>
                <p className="text-slate-400 max-w-md">Ce lien a expiré ou n&apos;est pas valide. Contactez votre agent <span className="text-[#FCD116] font-bold">Retour Gagnant</span>.</p>
            </div>
        )
    }

    const currentItem = items[currentSlide]
    const typeInfo = TYPE_ICONS[currentItem.type] || TYPE_ICONS.activity
    const progress = ((currentSlide + 1) / items.length) * 100
    const billableItems = items.filter(i => i.type !== 'hero' && i.type !== 'pricing' && i.selling_price > 0)

    return (
        <div className="h-screen w-screen bg-[#0a0e17] text-white overflow-hidden relative select-none" style={{ perspective: '1200px' }}>

            {/* ═══ BACKGROUND ═══ */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentItem.id + '-bg'}
                    custom={direction}
                    variants={{
                        enter: { opacity: 0, scale: 1.15 },
                        center: { opacity: 1, scale: 1, transition: { duration: 1.5, ease: 'easeOut' } },
                        exit: { opacity: 0, transition: { duration: 0.5 } },
                    }}
                    initial="enter" animate="center" exit="exit"
                    className="absolute inset-0 z-0"
                >
                    {currentItem.image_url ? (
                        <>
                            <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a0e17]/80 via-[#0a0e17]/50 to-[#0a0e17]" />
                            <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#0a0e17] via-transparent to-transparent" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={currentItem.image_url} alt="" className="w-full h-full object-cover" />
                        </>
                    ) : (
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,135,81,0.15),transparent_50%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(252,209,22,0.1),transparent_50%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_20%,rgba(232,17,45,0.08),transparent_50%)]" />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ═══ PROGRESS BAR ═══ */}
            <div className="absolute top-0 left-0 right-0 z-50 h-1">
                <div className="h-full bg-white/5" />
                <motion.div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
            </div>

            {/* ═══ HEADER ═══ */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full flex items-center justify-center font-black text-white text-base shadow-xl">
                        RG
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">
                            <span className="text-[#008751]">Retour</span>{' '}
                            <span className="text-[#FCD116]">Gagnant</span>{' '}
                            <span className="text-[#E8112D]">Bénin</span>
                        </p>
                        <p className="font-bold text-white/90 text-sm">{proposal.client_name}</p>
                    </div>
                </div>

                {/* Slide dots */}
                <div className="flex items-center gap-1.5">
                    {items.map((_, i) => (
                        <button
                            key={i} title={`Slide ${i + 1}`}
                            onClick={() => goToSlide(i)}
                            className={`rounded-full transition-all duration-500 ${i === currentSlide
                                ? 'w-8 h-2.5 bg-gradient-to-r from-[#008751] to-[#FCD116] shadow-lg shadow-[#FCD116]/40'
                                : i < currentSlide
                                    ? 'w-2.5 h-2.5 bg-[#008751]/50'
                                    : 'w-2.5 h-2.5 bg-white/15 hover:bg-white/30'}`}
                        />
                    ))}
                </div>

                <div className="text-right hidden md:block">
                    <p className="text-[9px] font-black text-[#FCD116]/60 tracking-[0.3em] uppercase">{proposal.destination}</p>
                    {proposal.start_date && (
                        <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(proposal.start_date).toLocaleDateString('fr-FR', { month: 'long', day: 'numeric' })}
                        </p>
                    )}
                </div>
            </div>

            {/* ═══ MAIN CONTENT — 3D ANIMATED ═══ */}
            <div className="relative z-20 h-full flex flex-col justify-end md:justify-center px-6 md:px-16 lg:px-24 pb-32 md:pb-0 max-w-6xl" style={{ transformStyle: 'preserve-3d' }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentItem.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        className="w-full max-w-2xl"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Type Badge */}
                        {currentItem.type !== 'hero' && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-2xl mb-5 border border-white/10"
                            >
                                <span className="text-lg">{typeInfo.emoji}</span>
                                <span className="text-xs font-black tracking-[0.2em] uppercase text-[#FCD116]">{typeInfo.label}</span>
                            </motion.div>
                        )}

                        {/* Subtitle */}
                        {currentItem.subtitle && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="text-[#FCD116] font-bold text-sm uppercase tracking-[0.15em] mb-3"
                            >
                                {currentItem.subtitle}
                            </motion.p>
                        )}

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                            className={`font-black text-white leading-[1.05] mb-5 drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)] ${currentItem.type === 'hero' ? 'text-4xl md:text-6xl lg:text-7xl' : 'text-3xl md:text-5xl'}`}
                        >
                            {currentItem.title}
                        </motion.h1>

                        {/* Description */}
                        {currentItem.description && (
                            <motion.p
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                                className="text-base md:text-lg text-white/70 leading-relaxed mb-6 max-w-xl"
                            >
                                {currentItem.description}
                            </motion.p>
                        )}

                        {/* Location */}
                        {currentItem.location && !['pricing', 'hero'].includes(currentItem.type) && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-2 text-white/40 mb-5 text-sm">
                                <MapPin className="w-4 h-4 text-[#E8112D]" />
                                <span>{currentItem.location}</span>
                            </motion.div>
                        )}

                        {/* Highlights */}
                        {currentItem.highlights && currentItem.highlights.length > 0 && !['pricing', 'hero'].includes(currentItem.type) && (
                            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-2 mb-6">
                                {currentItem.highlights.map((h, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full text-xs font-medium text-white/70 flex items-center gap-1.5">
                                        <Star className="w-3 h-3 text-[#FCD116] fill-[#FCD116]" /> {h}
                                    </span>
                                ))}
                            </motion.div>
                        )}

                        {/* ═══ PRICING SLIDE ═══ */}
                        {currentItem.type === 'pricing' && (
                            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-4">
                                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl shadow-[0_0_60px_rgba(252,209,22,0.05)]">
                                    <div className="space-y-3 mb-6">
                                        {billableItems.map((i) => (
                                            <div key={i.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                                <span className="text-white/70 text-sm">{TYPE_ICONS[i.type]?.emoji} {i.title}</span>
                                                <span className="text-white font-bold">{i.selling_price.toLocaleString()} FCFA</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="border-t border-white/10 pt-5 mb-6 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-[#FCD116] uppercase tracking-[0.2em] mb-1">Total Estimé</p>
                                            <p className="text-3xl md:text-4xl font-black text-white">{proposal.total_amount.toLocaleString()} <span className="text-lg text-white/30">FCFA</span></p>
                                        </div>
                                        <Sparkles className="w-10 h-10 text-[#FCD116]/20" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <button
                                            onClick={() => router.push(`/p/${secret}/paiement`)}
                                            className="bg-gradient-to-r from-[#008751] to-[#FCD116] hover:opacity-90 text-[#0a0e17] py-4 rounded-2xl font-black text-base transition-all shadow-[0_0_40px_rgba(0,135,81,0.2)] hover:shadow-[0_0_60px_rgba(252,209,22,0.3)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <CreditCard className="w-5 h-5" /> Payer maintenant
                                        </button>
                                        <button
                                            onClick={() => router.push(`/p/${secret}/paiement`)}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#FCD116]/30 text-white py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2"
                                        >
                                            <BookOpen className="w-5 h-5 text-[#FCD116]" /> Réserver
                                        </button>
                                    </div>
                                    <p className="text-center text-white/20 text-xs mt-4 flex items-center justify-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Paiement 100% sécurisé • Confirmation instantanée
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Price tag for normal slides */}
                        {currentItem.selling_price > 0 && !['hero', 'pricing'].includes(currentItem.type) && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="inline-block mt-2 bg-black/50 backdrop-blur-2xl border border-[#FCD116]/20 px-5 py-3 rounded-2xl">
                                <p className="text-[9px] text-white/30 mb-0.5 font-black uppercase tracking-widest">Tarif</p>
                                <p className="text-xl font-black text-[#FCD116]">{currentItem.selling_price.toLocaleString()} FCFA</p>
                            </motion.div>
                        )}

                        {/* Hero CTA */}
                        {currentItem.type === 'hero' && (
                            <motion.button
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                                onClick={() => goToSlide(1)}
                                className="mt-8 px-8 py-4 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full text-[#0a0e17] font-black uppercase tracking-wider text-sm transition-all shadow-[0_0_50px_rgba(252,209,22,0.3)] hover:shadow-[0_0_80px_rgba(252,209,22,0.5)] flex items-center gap-3 hover:scale-105 active:scale-95"
                            >
                                Découvrir l&apos;expérience <ChevronRight className="w-5 h-5" />
                            </motion.button>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* ═══ NAVIGATION ═══ */}
            <div className="absolute bottom-6 md:bottom-10 right-4 md:right-12 z-50 flex items-center gap-3">
                <span className="text-white/20 text-xs font-bold mr-2 hidden md:inline font-mono">{String(currentSlide + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
                <button
                    onClick={() => goToSlide(currentSlide - 1)} title="Précédent"
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all ${currentSlide === 0 ? 'opacity-20 cursor-not-allowed border-white/5 bg-white/5' : 'bg-white/10 hover:bg-white/20 border-white/10'}`}
                    disabled={currentSlide === 0}
                >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button
                    onClick={() => goToSlide(currentSlide + 1)} title="Suivant"
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all ${currentSlide === items.length - 1 ? 'opacity-20 cursor-not-allowed border-white/5 bg-white/5' : 'bg-gradient-to-r from-[#008751] to-[#FCD116] border-[#FCD116]/50 text-[#0a0e17] shadow-[0_0_30px_rgba(252,209,22,0.3)] hover:scale-110 hover:shadow-[0_0_50px_rgba(252,209,22,0.5)]'}`}
                    disabled={currentSlide === items.length - 1}
                >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>

            {/* Ambient particles */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 rounded-full"
                        style={{ background: ['#008751', '#FCD116', '#E8112D'][i % 3], top: `${15 + i * 15}%`, left: `${80 + (i % 3) * 5}%` }}
                        animate={{ y: [-20, 20], opacity: [0.1, 0.4, 0.1] }}
                        transition={{ duration: 3 + i, repeat: Infinity, repeatType: 'reverse', delay: i * 0.5 }}
                    />
                ))}
            </div>
        </div>
    )
}
