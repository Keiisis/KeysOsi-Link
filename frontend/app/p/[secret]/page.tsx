'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getProposalBySecret } from '@/app/actions/ai-proposals'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import {
    Loader2, ChevronRight, ChevronLeft, MapPin, Star,
    CreditCard, Calendar, CheckCircle, Sparkles, BookOpen,
    HandIcon, FileDown, MessageCircle
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
    original_price: number
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

// Cinematic 3D slide transitions (Optimized for mobile & desktop)
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : '-100%',
        opacity: 0,
        scale: 0.85,
        rotateY: direction > 0 ? 15 : -15,
        filter: 'blur(10px)',
    }),
    center: {
        x: 0,
        opacity: 1,
        scale: 1,
        rotateY: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '50%' : '-50%',
        opacity: 0,
        scale: 0.9,
        rotateY: direction < 0 ? 10 : -10,
        filter: 'blur(10px)',
        transition: { duration: 0.5, ease: [0.7, 0, 0.84, 0] as const }
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
    const [showSwipeHint, setShowSwipeHint] = useState(true)

    useEffect(() => {
        const fetch = async () => {
            setLoading(true)
            const result = await getProposalBySecret(secret)
            if (result.success && result.proposal) {
                setProposal(result.proposal)
                setItems(result.items || [])
            }
            setLoading(false)

            // Hide swipe hint after 4 seconds
            setTimeout(() => setShowSwipeHint(false), 4000)
        }
        fetch()
    }, [secret])

    const goToSlide = useCallback((newSlide: number) => {
        if (newSlide < 0 || newSlide >= items.length) return
        setDirection(newSlide > currentSlide ? 1 : -1)
        setCurrentSlide(newSlide)
        setShowSwipeHint(false)
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

    // Swipe handler
    const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
        const swipeThreshold = 50
        if (offset.x < -swipeThreshold) {
            goToSlide(currentSlide + 1)
        } else if (offset.x > swipeThreshold) {
            goToSlide(currentSlide - 1)
        }
    }

    // ─── LOADING ──────────────
    if (loading) {
        return (
            <div className="h-[100dvh] w-screen bg-[#0a0e17] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full blur-2xl opacity-30 animate-pulse" />
                    <Loader2 className="w-16 h-16 text-[#FCD116] animate-spin relative z-10" />
                </div>
                <div className="text-center px-4">
                    <p className="text-[#FCD116] uppercase tracking-[0.3em] font-black text-xs md:text-sm mb-1">Retour Gagnant Bénin</p>
                    <p className="text-slate-500 text-xs">Préparation de votre expérience...</p>
                </div>
            </div>
        )
    }

    if (!proposal || items.length === 0) {
        return (
            <div className="h-[100dvh] w-screen bg-[#0a0e17] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#E8112D]/10 border-2 border-[#E8112D]/30 flex items-center justify-center mb-6">
                    <span className="text-3xl md:text-4xl">🔒</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black mb-3">Proposition introuvable</h1>
                <p className="text-slate-400 max-w-sm text-sm md:text-base">Ce lien a expiré ou n&apos;est pas valide. Contactez votre agent <span className="text-[#FCD116] font-bold">Retour Gagnant</span>.</p>
            </div>
        )
    }

    const currentItem = items[currentSlide]
    const typeInfo = TYPE_ICONS[currentItem.type] || TYPE_ICONS.activity
    const progress = ((currentSlide + 1) / items.length) * 100
    const billableItems = items.filter(i => i.type !== 'hero' && i.type !== 'pricing' && i.selling_price > 0)

    // Stats pour hero slide
    const durationDays = proposal.start_date && proposal.end_date
        ? Math.ceil((new Date(proposal.end_date).getTime() - new Date(proposal.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0
    const hotelCount = items.filter(i => i.type === 'hotel').length
    const activityCount = items.filter(i => i.type === 'activity').length

    // Calcul économies pour slide pricing
    const totalOriginal = billableItems.reduce((acc, i) => acc + (i.original_price || 0), 0)
    const savings = totalOriginal > proposal.total_amount ? totalOriginal - proposal.total_amount : 0

    return (
        <div className="h-[100dvh] w-screen bg-[#0a0e17] text-white overflow-hidden relative select-none flex flex-col" style={{ perspective: '1200px' }}>
            
            {/* ═══ BACKGROUND ═══ */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={currentItem.id + '-bg'}
                    custom={direction}
                    variants={{
                        enter: { opacity: 0, scale: 1.1 },
                        center: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: 'easeOut' } },
                        exit: { opacity: 0, transition: { duration: 0.5 } },
                    }}
                    initial="enter" animate="center" exit="exit"
                    className="absolute inset-0 z-0 bg-[#0a0f18]"
                >
                    {currentItem.image_url ? (
                        <>
                            {/* Mobile-first gradients: stronger at bottom to insure text readability */}
                            <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0a0e17]/80 via-transparent to-[#0a0e17]/40 md:to-[#0a0e17]/80" />
                            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/90 to-transparent h-3/4 md:h-2/3 bottom-0" />
                            <div className="absolute inset-x-0 bottom-0 z-10 md:hidden bg-[#0a0f18] h-10 blur-xl" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={currentItem.image_url} alt="" className="w-full h-full object-cover object-center" />
                        </>
                    ) : (
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(0,135,81,0.2),transparent_60%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(252,209,22,0.15),transparent_60%)]" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_90%_20%,rgba(232,17,45,0.1),transparent_60%)]" />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* ═══ PROGRESS BAR ═══ */}
            <div className="absolute top-0 left-0 right-0 z-50 h-[3px] md:h-1">
                <div className="h-full bg-white/10" />
                <motion.div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D]" animate={{ width: `${progress}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
            </div>

            {/* ═══ HEADER ═══ */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-start md:items-center pointer-events-none">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 md:w-11 md:h-11 bg-gradient-to-br from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full flex items-center justify-center font-black text-white text-xs md:text-base shadow-xl border-2 border-[#0a0e17]">
                        RG
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] drop-shadow-md">
                            <span className="text-[#008751]">Retour</span>{' '}
                            <span className="text-[#FCD116]">Gagnant</span>{' '}
                            <span className="text-[#E8112D]">Bénin</span>
                        </p>
                        <p className="font-bold text-white/90 text-xs md:text-sm drop-shadow-md">{proposal.client_name}</p>
                    </div>
                </div>

                {/* Slide dots - Responsive placement */}
                <div className="flex sm:hidden fixed top-4 inset-x-0 justify-center pointer-events-auto z-50">
                     <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        {items.map((_, i) => (
                            <button
                                key={i} title={`Slide ${i + 1}`} onClick={() => goToSlide(i)}
                                className={`rounded-full transition-all duration-300 ${i === currentSlide
                                    ? 'w-6 h-1.5 bg-gradient-to-r from-[#008751] to-[#FCD116]'
                                    : i < currentSlide ? 'w-1.5 h-1.5 bg-[#008751]/80' : 'w-1.5 h-1.5 bg-white/30'}`}
                            />
                        ))}
                    </div>
                </div>
                
                <div className="hidden sm:flex items-center gap-1.5 pointer-events-auto">
                    {items.map((_, i) => (
                        <button
                            key={i} title={`Slide ${i + 1}`} onClick={() => goToSlide(i)}
                            className={`rounded-full transition-all duration-500 ${i === currentSlide
                                ? 'w-8 h-2.5 bg-gradient-to-r from-[#008751] to-[#FCD116] shadow-lg shadow-[#FCD116]/40'
                                : i < currentSlide ? 'w-2.5 h-2.5 bg-[#008751]/50' : 'w-2.5 h-2.5 bg-white/15 hover:bg-white/30'}`}
                        />
                    ))}
                </div>

                <div className="text-right pointer-events-auto">
                    <p className="text-[8px] md:text-[9px] font-black text-[#FCD116] tracking-[0.2em] md:tracking-[0.3em] uppercase drop-shadow-md max-w-[120px] md:max-w-none truncate">{proposal.destination}</p>
                    {proposal.start_date && (
                        <p className="text-[10px] md:text-xs text-white/80 flex items-center justify-end gap-1 mt-0.5 drop-shadow-md">
                            <Calendar className="w-3 h-3" />
                            {new Date(proposal.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                        </p>
                    )}
                </div>
            </div>

            {/* ═══ MAIN CONTENT — 3D ANIMATED & SWIPEABLE ═══ */}
            <motion.div 
                className="relative z-20 flex-1 flex flex-col justify-end md:justify-center px-5 md:px-16 lg:px-24 pb-[100px] md:pb-0 w-full cursor-grab active:cursor-grabbing"
                style={{ transformStyle: 'preserve-3d' }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
            >
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentItem.id}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter" animate="center" exit="exit"
                        className="w-full max-w-2xl mx-auto md:mx-0"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Swipe Hint (Mobile Only) */}
                        {showSwipeHint && currentSlide === 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: -20 }} transition={{ repeat: Infinity, duration: 1.5, repeatType: 'reverse' }}
                                className="md:hidden absolute -top-16 right-0 flex items-center gap-2 text-[#FCD116]/80 text-xs font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
                            >
                                <HandIcon className="w-4 h-4" /> Balayez l&apos;écran
                            </motion.div>
                        )}

                        <div className="max-h-[60vh] md:max-h-[80vh] overflow-y-auto no-scrollbar pb-4 -mx-2 px-2">
                            {/* Type Badge */}
                            {currentItem.type !== 'hero' && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                                    className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1 md:py-1.5 rounded-full bg-black/40 backdrop-blur-xl mb-3 md:mb-5 border border-white/10 shadow-lg"
                                >
                                    <span className="text-sm md:text-lg">{typeInfo.emoji}</span>
                                    <span className="text-[10px] md:text-xs font-black tracking-[0.15em] md:tracking-[0.2em] uppercase text-[#FCD116]">{typeInfo.label}</span>
                                </motion.div>
                            )}

                            {/* Subtitle */}
                            {currentItem.subtitle && (
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                    className="text-[#FCD116] font-bold text-[10px] md:text-sm uppercase tracking-[0.1em] md:tracking-[0.15em] mb-1.5 md:mb-3 drop-shadow-md"
                                >
                                    {currentItem.subtitle}
                                </motion.p>
                            )}

                            {/* Title */}
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                                className={`font-black text-white leading-[1.1] mb-3 md:mb-5 drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] ${currentItem.type === 'hero' ? 'text-4xl md:text-6xl lg:text-7xl' : 'text-2xl sm:text-3xl md:text-5xl'}`}
                            >
                                {currentItem.title}
                            </motion.h1>

                            {/* Description */}
                            {currentItem.description && (
                                <motion.p
                                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                    className="text-sm md:text-lg text-white/80 leading-relaxed mb-4 md:mb-6 max-w-xl font-medium drop-shadow-md"
                                >
                                    {currentItem.description}
                                </motion.p>
                            )}

                            {/* Location */}
                            {currentItem.location && !['pricing', 'hero'].includes(currentItem.type) && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex items-center gap-1.5 text-white/60 mb-4 text-xs md:text-sm drop-shadow-md">
                                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#E8112D]" />
                                    <span>{currentItem.location}</span>
                                </motion.div>
                            )}

                            {/* Highlights */}
                            {currentItem.highlights && currentItem.highlights.length > 0 && !['pricing', 'hero'].includes(currentItem.type) && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
                                    {currentItem.highlights.map((h, i) => (
                                        <span key={i} className="px-2.5 py-1 md:py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-white/90 flex items-center gap-1 md:gap-1.5 shadow-md">
                                            <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-[#FCD116] fill-[#FCD116]" /> {h}
                                        </span>
                                    ))}
                                </motion.div>
                            )}

                            {/* ═══ PRICING SLIDE ═══ */}
                            {currentItem.type === 'pricing' && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-2 md:mt-4">
                                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-5 md:p-8 rounded-[2rem] shadow-[0_0_60px_rgba(252,209,22,0.08)] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FCD116]/10 rounded-full blur-3xl pointer-events-none" />
                                        
                                        <div className="space-y-2.5 md:space-y-3 mb-5 md:mb-6 relative z-10 max-h-[150px] md:max-h-none overflow-y-auto pr-2 no-scrollbar">
                                            {billableItems.map((i) => (
                                                <div key={i.id} className="flex justify-between items-center py-2 md:py-2.5 border-b border-white/5 last:border-0">
                                                    <span className="text-white/80 text-xs md:text-sm flex items-center gap-2 truncate pr-2">
                                                        <span className="text-base">{TYPE_ICONS[i.type]?.emoji}</span> <span className="truncate">{i.title}</span>
                                                    </span>
                                                    <span className="text-white font-bold text-xs md:text-sm whitespace-nowrap">{i.selling_price.toLocaleString()} FCFA</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="border-t border-white/10 pt-4 md:pt-5 mb-4 md:mb-5 flex justify-between items-end relative z-10">
                                            <div>
                                                <p className="text-[9px] md:text-[10px] font-black text-[#FCD116] uppercase tracking-[0.2em] mb-0.5 md:mb-1">Votre Tarif VIP</p>
                                                {totalOriginal > proposal.total_amount && (
                                                    <p className="text-xs text-white/30 line-through mb-0.5">{totalOriginal.toLocaleString()} FCFA</p>
                                                )}
                                                <p className="text-2xl md:text-4xl font-black text-white drop-shadow-md">{proposal.total_amount.toLocaleString()} <span className="text-sm md:text-lg text-white/50">FCFA</span></p>
                                            </div>
                                            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#FCD116]/30 hidden sm:block" />
                                        </div>

                                        {/* Économies */}
                                        {savings > 0 && (
                                            <div className="bg-[#008751]/10 border border-[#008751]/25 rounded-xl px-4 py-2 mb-4 flex items-center justify-between relative z-10">
                                                <span className="text-[10px] font-black text-[#008751] uppercase tracking-wider">Vous économisez</span>
                                                <span className="text-[#008751] font-black text-sm">{savings.toLocaleString()} FCFA 🎁</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 relative z-10">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/p/${secret}/paiement`) }}
                                                className="bg-gradient-to-r from-[#008751] to-[#FCD116] text-[#0a0e17] py-3.5 md:py-4 rounded-xl font-black text-sm md:text-base transition-all shadow-[0_0_30px_rgba(0,135,81,0.3)] flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                                            >
                                                <CreditCard className="w-4 h-4 md:w-5 md:h-5" /> Payer maintenant
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); router.push(`/p/${secret}/paiement`) }}
                                                className="bg-black/50 border border-white/10 text-white py-3.5 md:py-4 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation"
                                            >
                                                <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-[#FCD116]" /> Réserver
                                            </button>
                                        </div>
                                        <a
                                            href={`/api/proposals/${proposal?.id}/devis`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full mt-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white py-2.5 rounded-xl font-medium text-xs md:text-sm transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation relative z-10"
                                        >
                                            <FileDown className="w-4 h-4 text-[#FCD116]" /> Télécharger Devis PDF
                                        </a>
                                        <div className="mt-3 flex flex-col items-center gap-1.5 relative z-10">
                                            <p className="text-white/40 text-[10px] md:text-xs flex items-center gap-1.5">
                                                <CheckCircle className="w-3 h-3 text-[#008751]" /> Paiement 100% sécurisé — Retour Gagnant Bénin
                                            </p>
                                            <p className="text-[#FCD116]/40 text-[10px]">
                                                ⏳ Offre personnalisée · Valable 14 jours
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Price tag for normal slides */}
                            {currentItem.selling_price > 0 && !['hero', 'pricing'].includes(currentItem.type) && (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="inline-block mt-2 bg-black/60 backdrop-blur-2xl border border-[#FCD116]/30 px-4 py-2 md:px-5 md:py-3 rounded-[1.25rem] shadow-xl">
                                    <p className="text-[8px] md:text-[9px] text-white/50 mb-0.5 font-black uppercase tracking-widest">Tarif inclus</p>
                                    <p className="text-lg md:text-xl font-black text-[#FCD116]">{currentItem.selling_price.toLocaleString()} FCFA</p>
                                </motion.div>
                            )}

                            {/* Hero — Stats du voyage */}
                            {currentItem.type === 'hero' && (durationDays > 0 || hotelCount > 0 || activityCount > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                                    className="flex flex-wrap gap-2 mt-4 md:mt-5"
                                >
                                    {durationDays > 0 && (
                                        <span className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-white/90 flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-[#FCD116]" /> {durationDays} jour{durationDays > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {hotelCount > 0 && (
                                        <span className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-white/90">
                                            🏨 {hotelCount} hôtel{hotelCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {activityCount > 0 && (
                                        <span className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full text-[10px] md:text-xs font-bold text-white/90">
                                            🎯 {activityCount} activité{activityCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className="px-3 py-1.5 bg-[#008751]/30 backdrop-blur-xl border border-[#008751]/40 rounded-full text-[10px] md:text-xs font-bold text-[#008751]">
                                        ✓ Offre Personnalisée
                                    </span>
                                </motion.div>
                            )}

                            {/* Hero CTA */}
                            {currentItem.type === 'hero' && (
                                <motion.button
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                    onClick={(e) => { e.stopPropagation(); goToSlide(1) }}
                                    className="mt-6 md:mt-8 px-6 md:px-8 py-3.5 md:py-4 bg-gradient-to-r from-[#008751] via-[#FCD116] to-[#E8112D] rounded-full text-[#0a0e17] font-black uppercase tracking-wider text-xs md:text-sm transition-all shadow-[0_0_40px_rgba(252,209,22,0.4)] flex items-center gap-2 md:gap-3 active:scale-95 touch-manipulation"
                                >
                                    Découvrir l&apos;expérience <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </motion.div>

            {/* ═══ NAVIGATION CONTROLS (BOTTOM) ═══ */}
            <div className="absolute bottom-5 md:bottom-10 left-0 right-0 px-5 md:px-12 z-40 flex items-center justify-between pointer-events-none">
                <div className="text-white/30 text-[10px] md:text-xs font-black font-mono tracking-widest">
                    {String(currentSlide + 1).padStart(2, '0')}<span className="text-white/10 mx-1">/</span>{String(items.length).padStart(2, '0')}
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 pointer-events-auto">
                    <button
                        onClick={() => goToSlide(currentSlide - 1)} title="Précédent"
                        className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 touch-manipulation ${currentSlide === 0 ? 'opacity-0 pointer-events-none' : 'bg-black/50 border-white/10 text-white hover:bg-black/70'}`}
                        disabled={currentSlide === 0}
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                        onClick={() => goToSlide(currentSlide + 1)} title="Suivant"
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-2xl border transition-all active:scale-90 touch-manipulation shadow-lg ${currentSlide === items.length - 1 ? 'opacity-0 pointer-events-none' : 'bg-gradient-to-r from-[#008751] to-[#FCD116] border-[#FCD116]/30 text-[#0a0e17] shadow-[0_0_20px_rgba(252,209,22,0.3)]'}`}
                        disabled={currentSlide === items.length - 1}
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>
            </div>

            {/* ═══ FLOATING WHATSAPP ═══ */}
            <a
                href="https://wa.me/2290160322121"
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-24 right-4 md:bottom-20 md:right-8 z-[60] w-13 h-13 md:w-14 md:h-14 bg-[#25D366] hover:bg-[#20bd5a] rounded-full flex items-center justify-center shadow-[0_0_25px_rgba(37,211,102,0.5)] transition-all hover:scale-110 active:scale-95 touch-manipulation"
                title="Nous contacter sur WhatsApp"
            >
                <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </a>

            {/* Ambient particles (Reduced on mobile for perf) */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden md:block hidden">
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

