'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getProposalBySecret } from '@/app/actions/ai-proposals'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronRight, ChevronLeft, MapPin, Star, CreditCard, Calendar, Sparkles, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProposalItem {
    id: string
    type: string
    title: string
    description: string | null
    location: string | null
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

const TYPE_ICONS: Record<string, { icon: string, color: string }> = {
    hero: { icon: '✨', color: 'text-amber-400' },
    hotel: { icon: '🏨', color: 'text-sky-400' },
    restaurant: { icon: '🍽️', color: 'text-orange-400' },
    activity: { icon: '🎯', color: 'text-emerald-400' },
    transport: { icon: '🚗', color: 'text-violet-400' },
    pricing: { icon: '💰', color: 'text-amber-400' },
}

export default function PresentationView({ params }: { params: Promise<{ secret: string }> }) {
    const { secret } = React.use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [proposal, setProposal] = useState<Proposal | null>(null)
    const [items, setItems] = useState<ProposalItem[]>([])
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        const fetchPresentation = async () => {
            setLoading(true)
            const result = await getProposalBySecret(secret)

            if (!result.success || !result.proposal) {
                setLoading(false)
                return
            }

            setProposal(result.proposal)
            setItems(result.items || [])
            setLoading(false)
        }

        fetchPresentation()
    }, [secret])

    const nextSlide = useCallback(() => {
        if (currentSlide < items.length - 1) setCurrentSlide(prev => prev + 1)
    }, [currentSlide, items.length])

    const prevSlide = useCallback(() => {
        if (currentSlide > 0) setCurrentSlide(prev => prev - 1)
    }, [currentSlide])

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextSlide()
            if (e.key === 'ArrowLeft') prevSlide()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [nextSlide, prevSlide])

    if (loading) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 animate-ping">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20" />
                    </div>
                    <Loader2 className="w-16 h-16 text-amber-500 animate-spin relative z-10" />
                </div>
                <div className="text-center">
                    <p className="text-amber-500 uppercase tracking-[0.3em] font-bold text-sm mb-2">Retour Gagnant</p>
                    <p className="text-slate-400 text-sm">Préparation de votre expérience...</p>
                </div>
            </div>
        )
    }

    if (!proposal || items.length === 0) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
                <div className="w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6">
                    <span className="text-4xl">🔒</span>
                </div>
                <h1 className="text-3xl font-bold mb-3">Proposition introuvable</h1>
                <p className="text-slate-400 max-w-md">Ce lien a expiré ou n&apos;est pas valide. Veuillez contacter votre agent Retour Gagnant.</p>
            </div>
        )
    }

    const currentItem = items[currentSlide]
    const typeInfo = TYPE_ICONS[currentItem.type] || TYPE_ICONS.activity
    const progress = ((currentSlide + 1) / items.length) * 100

    return (
        <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden relative select-none">
            
            {/* Background Image with Parallax */}
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentItem.id + '-bg'}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 z-0"
                >
                    {currentItem.image_url ? (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-slate-950 z-10" />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 to-transparent z-10" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={currentItem.image_url} 
                                alt={currentItem.title}
                                className="w-full h-full object-cover"
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black z-10">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.15),transparent_60%)]" />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-white/5">
                <motion.div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>

            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-black text-slate-900 text-lg shadow-lg shadow-amber-500/30">
                        RG
                    </div>
                    <div className="hidden md:block">
                        <p className="text-[10px] font-bold text-amber-500/80 tracking-[0.2em] uppercase">Proposition exclusive pour</p>
                        <p className="font-bold text-white text-sm">{proposal.client_name}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                    {items.map((_, i) => (
                        <button 
                            key={i}
                            title={`Slide ${i + 1}`}
                            onClick={() => setCurrentSlide(i)}
                            className={`rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 h-2 bg-amber-500 shadow-lg shadow-amber-500/50' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                        />
                    ))}
                </div>

                <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">{proposal.destination}</p>
                    {proposal.start_date && (
                        <p className="text-xs text-slate-400 flex items-center justify-end gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(proposal.start_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                            {proposal.end_date && ` - ${new Date(proposal.end_date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}`}
                        </p>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-20 h-full flex flex-col justify-end md:justify-center px-6 md:px-16 lg:px-24 pb-32 md:pb-0 max-w-6xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentItem.id + '-content'}
                        initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-2xl"
                    >
                        {/* Type Badge */}
                        {currentItem.type !== 'hero' && (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ delay: 0.2 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 backdrop-blur-xl mb-6 border border-white/10"
                            >
                                <span className="text-lg">{typeInfo.icon}</span>
                                <span className={`text-xs font-bold tracking-[0.15em] uppercase ${typeInfo.color}`}>
                                    {currentItem.type === 'pricing' ? 'Récapitulatif' : currentItem.type}
                                </span>
                            </motion.div>
                        )}

                        {/* Title */}
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={`font-black text-white leading-[1.1] mb-5 drop-shadow-2xl ${currentItem.type === 'hero' ? 'text-4xl md:text-6xl lg:text-7xl' : 'text-3xl md:text-5xl'}`}
                        >
                            {currentItem.title}
                        </motion.h1>

                        {/* Description */}
                        {currentItem.description && (
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-base md:text-lg text-slate-300 leading-relaxed mb-6 max-w-xl"
                            >
                                {currentItem.description}
                            </motion.p>
                        )}

                        {/* Location */}
                        {currentItem.location && currentItem.type !== 'pricing' && currentItem.type !== 'hero' && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                className="flex items-center gap-2 text-slate-400 mb-6 text-sm"
                            >
                                <MapPin className="w-4 h-4 text-amber-500" />
                                <span>{currentItem.location}</span>
                            </motion.div>
                        )}

                        {/* Pricing Slide */}
                        {currentItem.type === 'pricing' ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                                className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl mt-4 shadow-2xl"
                            >
                                {/* Item recap */}
                                <div className="space-y-3 mb-6">
                                    {items.filter(i => i.type !== 'hero' && i.type !== 'pricing' && i.selling_price > 0).map((i) => (
                                        <div key={i.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                            <span className="text-white/80 text-sm">{TYPE_ICONS[i.type]?.icon} {i.title}</span>
                                            <span className="text-white font-bold">{i.selling_price.toLocaleString()} FCFA</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-white/10 pt-4 mb-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-bold text-amber-500 uppercase tracking-[0.15em] mb-1">Budget Total Estimé</p>
                                            <p className="text-3xl md:text-4xl font-black text-white">{proposal.total_amount.toLocaleString()} <span className="text-lg text-slate-400">FCFA</span></p>
                                        </div>
                                        <Sparkles className="w-8 h-8 text-amber-500/50" />
                                    </div>
                                </div>

                                <button 
                                    onClick={() => router.push(`/p/${secret}/paiement`)}
                                    className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-900 py-4 md:py-5 rounded-2xl font-black text-lg transition-all shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    <CreditCard className="w-6 h-6" /> Validons ce voyage
                                </button>
                                <p className="text-center text-slate-500 text-xs mt-3 flex items-center justify-center gap-1">
                                    <CheckCircle className="w-3 h-3" /> Paiement 100% sécurisé • Confirmation instantanée
                                </p>
                            </motion.div>
                        ) : (
                            /* Price tag for non-pricing slides */
                            currentItem.selling_price > 0 && currentItem.type !== 'hero' && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                                    className="inline-block mt-2 bg-black/50 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl"
                                >
                                    <p className="text-[10px] text-slate-500 mb-0.5 font-bold uppercase tracking-widest">Tarif estimatif</p>
                                    <p className="text-xl font-black text-amber-400">{currentItem.selling_price.toLocaleString()} FCFA</p>
                                </motion.div>
                            )
                        )}
                        
                        {/* Hero CTA */}
                        {currentItem.type === 'hero' && (
                            <motion.button 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                onClick={nextSlide}
                                title="Commencer"
                                className="mt-8 px-8 py-4 bg-amber-500 hover:bg-amber-400 rounded-full text-slate-900 font-black uppercase tracking-wider text-sm transition-all shadow-[0_0_40px_rgba(245,158,11,0.3)] hover:shadow-[0_0_60px_rgba(245,158,11,0.5)] flex items-center gap-3 hover:scale-105 active:scale-95"
                            >
                                Découvrir l&apos;expérience <ChevronRight className="w-5 h-5" />
                            </motion.button>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-6 md:bottom-10 right-4 md:right-12 z-50 flex items-center gap-3">
                <span className="text-slate-500 text-xs font-bold mr-2 hidden md:inline">
                    {currentSlide + 1} / {items.length}
                </span>
                <button 
                    onClick={prevSlide}
                    title="Précédent"
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${currentSlide === 0 ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/5' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'}`}
                    disabled={currentSlide === 0}
                >
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button 
                    onClick={nextSlide}
                    title="Suivant"
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all ${currentSlide === items.length - 1 ? 'opacity-30 cursor-not-allowed bg-white/5 border-white/5' : 'bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:scale-110'}`}
                    disabled={currentSlide === items.length - 1}
                >
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            </div>

            {/* Decorative dot grid */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] bg-[length:30px_30px] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)]" />
        </div>
    )
}
