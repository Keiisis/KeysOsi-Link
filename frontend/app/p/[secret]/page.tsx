'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ChevronRight, ChevronLeft, MapPin, Star, CheckCircle } from 'lucide-react'

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
    client_name: string
    destination: string
    status: string
    total_amount: number
}

export default function PresentationView({ params }: { params: { secret: string } }) {
    const [loading, setLoading] = useState(true)
    const [proposal, setProposal] = useState<Proposal | null>(null)
    const [items, setItems] = useState<ProposalItem[]>([])
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        const fetchPresentation = async () => {
            setLoading(true)
            
            // 1. Fetch proposal by secret
            const { data: pData, error: pError } = await supabase
                .from('ai_client_proposals')
                .select('*')
                .eq('secret_key', params.secret)
                .single()

            if (pError || !pData) {
                setLoading(false)
                return
            }

            // 2. Fetch items
            const { data: iData } = await supabase
                .from('ai_proposal_items')
                .select('*')
                .eq('proposal_id', pData.id)
                .order('order_index', { ascending: true })

            setProposal(pData)
            setItems(iData || [])
            setLoading(false)
            
            // Note: In a real advanced app, we could trigger a view count here.
        }

        fetchPresentation()
    }, [params.secret])

    const nextSlide = () => {
        if (currentSlide < items.length - 1) setCurrentSlide(currentSlide + 1)
    }

    const prevSlide = () => {
        if (currentSlide > 0) setCurrentSlide(currentSlide - 1)
    }

    // Keydown for arrows
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') nextSlide()
            if (e.key === 'ArrowLeft') prevSlide()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })

    if (loading) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                <p className="text-amber-500/80 uppercase tracking-[0.2em] font-bold text-sm">Chargement de votre expérience...</p>
            </div>
        )
    }

    if (!proposal || items.length === 0) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8 text-center">
                <h1 className="text-3xl font-bold mb-4">Proposition introuvable</h1>
                <p className="text-slate-400">Ce lien a expiré ou n&apos;existe pas.</p>
            </div>
        )
    }

    const currentItem = items[currentSlide]

    return (
        <div className="h-screen w-screen bg-slate-950 text-white overflow-hidden relative">
            
            {/* Background Layer with Parallax / Blur */}
            <AnimatePresence mode="wait">
                <motion.div 
                    key={currentItem.id + '-bg'}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="absolute inset-0 z-0"
                >
                    {currentItem.image_url ? (
                        <>
                            <div className="absolute inset-0 bg-black/60 z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={currentItem.image_url} 
                                alt={currentItem.title}
                                className="w-full h-full object-cover opacity-60"
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 z-10" />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center font-bold text-slate-900 text-xl border-2 border-white/20">
                        RG
                    </div>
                    <div className="hidden md:block">
                        <p className="text-xs font-bold text-amber-500 tracking-widest uppercase">Spécialement conçu pour</p>
                        <p className="font-semibold text-white">{proposal.client_name}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {items.map((_, i) => (
                        <button 
                            key={i}
                            title="Navigation slide"
                            onClick={() => setCurrentSlide(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-amber-500' : 'w-3 bg-white/20 cursor-pointer hover:bg-white/40'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-20 h-full flex flex-col justify-center px-6 md:px-20 lg:px-40 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentItem.id + '-content'}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full max-w-2xl"
                    >
                        {/* Tags */}
                        {currentItem.type !== 'hero' && (
                            <motion.div 
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md mb-6 border border-white/10"
                            >
                                {currentItem.type === 'hotel' && <Star className="w-4 h-4 text-amber-500" />}
                                {currentItem.type === 'restaurant' && <Star className="w-4 h-4 text-orange-500" />}
                                {currentItem.type === 'activity' && <MapPin className="w-4 h-4 text-emerald-500" />}
                                {currentItem.type === 'transport' && <Star className="w-4 h-4 text-sky-500" />}
                                <span className="text-xs font-bold tracking-widest uppercase text-white/80">
                                    {currentItem.type === 'pricing' ? 'Résumé' : currentItem.type}
                                </span>
                            </motion.div>
                        )}

                        {/* Title */}
                        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6 drop-shadow-2xl">
                            {currentItem.title}
                        </h1>

                        {/* Description */}
                        {currentItem.description && (
                            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-8 drop-shadow-md">
                                {currentItem.description}
                            </p>
                        )}

                        {/* Location */}
                        {currentItem.location && currentItem.type !== 'pricing' && (
                            <div className="flex items-center gap-2 text-slate-400 mb-8 font-medium">
                                <MapPin className="w-5 h-5 text-amber-500" />
                                <span>{currentItem.location}</span>
                            </div>
                        )}

                        {/* Pricing / CTA */}
                        {currentItem.type === 'pricing' ? (
                            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl mt-8">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <p className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-2">Budget Estimé Total</p>
                                        <p className="text-4xl md:text-5xl font-black text-white">{proposal.total_amount.toLocaleString()} <span className="text-2xl text-slate-400">FCFA</span></p>
                                    </div>
                                </div>
                                <hr className="border-white/10 mb-6" />
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <button className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-900 py-4 rounded-xl font-black text-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                                        <CheckCircle className="w-6 h-6" /> Validons ce voyage
                                    </button>
                                </div>
                            </div>
                        ) : (
                            currentItem.selling_price > 0 && (
                                <div className="inline-block mt-4 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl">
                                    <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Tarif estimatif</p>
                                    <p className="text-2xl font-bold text-amber-400">{currentItem.selling_price.toLocaleString()} FCFA</p>
                                </div>
                            )
                        )}
                        
                        {currentItem.type === 'hero' && (
                            <button 
                                onClick={nextSlide}
                                title="Commencer"
                                className="mt-8 px-8 py-4 bg-amber-500 hover:bg-amber-400 rounded-full text-slate-900 font-bold uppercase tracking-wider text-sm transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] flex items-center gap-3"
                            >
                                Explorer l&apos;itinéraire <ChevronRight className="w-5 h-5" />
                            </button>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-10 right-6 md:right-20 z-50 flex items-center gap-4">
                <button 
                    onClick={prevSlide}
                    title="Précédent"
                    className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${currentSlide === 0 ? 'opacity-30 cursor-not-allowed bg-black/20' : 'bg-black/50 hover:bg-white/10 text-white'}`}
                    disabled={currentSlide === 0}
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                    onClick={nextSlide}
                    title="Suivant"
                    className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all ${currentSlide === items.length - 1 ? 'opacity-30 cursor-not-allowed bg-black/20' : 'bg-amber-500 text-slate-900 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'}`}
                    disabled={currentSlide === items.length - 1}
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* Decorative Grid Pattern (très chic) */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03] bg-[length:40px_40px] bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)]" />
        </div>
    )
}
