'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Radar, Building2, Phone, Star, ArrowRight, ExternalLink } from 'lucide-react'
import Image from 'next/image'

interface Lead {
    id?: string;
    title: string;
    address: string;
    phone: string | null;
    rating: string | null;
    reviews_count: number | null;
    description: string;
    photo_url: string | null;
}

export default function AiRadarView() {
    const [keyword, setKeyword] = useState('')
    const [city, setCity] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [leads, setLeads] = useState<Lead[]>([])
    const [error, setError] = useState<string | null>(null)

    const handleScan = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!keyword || !city) return

        setIsScanning(true)
        setError(null)
        setLeads([])

        try {
            const response = await fetch('/api/ai/radar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keyword, city })
            })

            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors du scan')
            }

            setLeads(data.data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsScanning(false)
        }
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8">
            
            {/* Header Radar AI */}
            <div className="mb-10 text-center relative z-10">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 bg-gradient-to-br from-[#008751]/20 to-[#008751]/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#008751]/20 shadow-[0_0_30px_rgba(0,135,81,0.2)] relative"
                >
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20 border border-[#008751]" style={{ animationDuration: '3s' }} />
                    <Radar className="w-10 h-10 text-[#008751] animate-[spin_10s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border border-dashed border-[#FCD116]/50 animate-[spin_15s_linear_reverse_infinite]" />
                </motion.div>
                
                <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase mb-2">
                    Radar <span className="text-[#008751]">IA</span> Prospect
                </h1>
                <p className="text-gray-500 font-medium max-w-lg mx-auto text-sm">
                    Saisissez un type d\'établissement et une ville. Notre IA va scanner, filtrer, et générer des descriptions marketing ultra-précises automatiquement.
                </p>
            </div>

            {/* Formulaire de recherche */}
            <form onSubmit={handleScan} className="relative z-20 mb-16">
                <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-3 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-gray-100 max-w-3xl mx-auto">
                    
                    <div className="flex-1 flex items-center gap-3 px-4 w-full md:w-auto h-14 md:h-auto border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0">
                        <Search className="w-5 h-5 text-gray-400 shrink-0" />
                        <input 
                            type="text"
                            placeholder="Ex: Hôtel, Coiffeur, Agence de location..."
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            disabled={isScanning}
                            className="w-full bg-transparent border-none outline-none text-gray-800 font-medium placeholder-gray-400"
                        />
                    </div>

                    <div className="flex-1 flex items-center gap-3 px-4 w-full md:w-auto h-14 md:h-auto">
                        <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                        <input 
                            type="text"
                            placeholder="Ex: Cotonou, Natitingou..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            disabled={isScanning}
                            className="w-full bg-transparent border-none outline-none text-gray-800 font-medium placeholder-gray-400"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isScanning || !keyword || !city}
                        className="w-full md:w-auto h-14 px-8 rounded-2xl bg-[#008751] hover:bg-[#00a664] text-white font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 group shadow-lg shadow-[#008751]/30"
                    >
                        {isScanning ? (
                            <span className="flex items-center gap-2">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                    <Radar className="w-5 h-5" />
                                </motion.div>
                                Analyse IA en cours...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                Lancer le Radar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </span>
                        )}
                    </button>
                </div>
            </form>

            {/* Section Erreur */}
            <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center max-w-xl mx-auto mb-10 text-sm font-medium shadow-sm"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Animation de scan en cours */}
            {isScanning && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                        <div className="absolute inset-0 bg-[#008751]/10 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="absolute inset-4 bg-[#FCD116]/10 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                        <Image src="/logo.jpg" alt="RGB" width={60} height={60} className="rounded-full shadow-lg relative z-10 animate-pulse" />
                    </div>
                    <p className="text-gray-500 font-semibold uppercase tracking-widest text-xs animate-pulse">Extraction & Optimisation par Llama-3...</p>
                </div>
            )}

            {/* Résultats affichés en grille */}
            {!isScanning && leads.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {leads.map((lead, idx) => (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={lead.id || idx}
                            className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(0,135,81,0.15)] transition-all group flex flex-col"
                        >
                            <div className="relative h-48 bg-gray-100 overflow-hidden">
                                {lead.photo_url ? (
                                    <Image 
                                        src={lead.photo_url} 
                                        alt={lead.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-700" 
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                                        <Building2 className="w-12 h-12 text-gray-300" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                                
                                <div className="absolute bottom-4 left-4 right-4">
                                    <h3 className="text-white font-extrabold text-xl leading-tight mb-1 truncate">{lead.title}</h3>
                                    {lead.rating && (
                                        <div className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-[#FCD116] fill-current" />
                                            <span className="text-white font-bold text-sm shadow-sm">{lead.rating}</span>
                                            <span className="text-white/70 text-xs ml-1">({lead.reviews_count} avis)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-5 flex-1 flex flex-col">
                                <p className="text-gray-600 text-sm italic mb-4 flex-1 line-clamp-3">"{lead.description}"</p>
                                
                                <div className="space-y-3 mt-auto">
                                    <div className="flex items-start gap-2.5 bg-gray-50 p-3 rounded-xl">
                                        <MapPin className="w-4 h-4 text-[#E8112D] shrink-0 mt-0.5" />
                                        <p className="text-xs font-semibold text-gray-700 leading-snug break-words">{lead.address}</p>
                                    </div>
                                    
                                    {lead.phone ? (
                                        <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 bg-[#008751]/10 hover:bg-[#008751]/20 p-3 rounded-xl transition-colors group/btn">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-[#008751]" />
                                                <p className="text-sm font-bold text-[#008751]">{lead.phone}</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-[#008751] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl opacity-60">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <p className="text-xs font-medium text-gray-500">Aucun numéro détecté</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {!isScanning && leads.length === 0 && !error && (
                <div className="text-center text-gray-400 py-10 opacity-70">
                    <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun résultat. Utilisez le radar pour trouver des opportunités.</p>
                </div>
            )}
        </div>
    )
}
