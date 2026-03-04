'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
    Calendar, MapPin, Clock, Users, Ticket, Crown,
    ArrowRight, Sparkles, Star, Filter, Search,
} from 'lucide-react'

interface EventData {
    id: string
    title: string
    slug: string
    short_description: string
    description: string
    location: string
    start_date: string
    end_date: string
    price_standard: number
    price_vip: number
    currency: string
    max_capacity: number
    status: string
    cover_image_url: string
    category: string
    is_featured: boolean
    event_images: { id: string; url: string; alt_text: string }[]
}

const CATEGORIES = [
    { value: 'all', label: 'Tous', icon: Filter },
    { value: 'conference', label: 'Conférence', icon: Users },
    { value: 'gala', label: 'Gala', icon: Crown },
    { value: 'workshop', label: 'Atelier', icon: Sparkles },
    { value: 'networking', label: 'Networking', icon: Star },
    { value: 'cultural', label: 'Culturel', icon: Calendar },
]

const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(n)

export default function EvenementsPage() {
    const [events, setEvents] = useState<EventData[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState('all')
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetch('/api/events')
            .then(r => r.json())
            .then(d => setEvents(d.events || []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const filtered = events.filter(e => {
        if (activeCategory !== 'all' && e.category !== activeCategory) return false
        if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const featured = events.filter(e => e.is_featured)

    return (
        <div className="min-h-screen bg-[#030a15] text-white">

            {/* ── Ambient background ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] rounded-full opacity-[0.06]"
                    style={{ background: 'radial-gradient(circle at 70% 20%, #008751, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.04]"
                    style={{ background: 'radial-gradient(circle at 30% 80%, #FCD116, transparent 60%)' }} />
            </div>

            {/* ── HERO ── */}
            <div className="relative z-10 pt-10 pb-16 px-4">
                <div className="max-w-6xl mx-auto text-center space-y-6">

                    <div className="flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#FCD116]/20 bg-[#FCD116]/5 text-[#FCD116] text-[11px] font-black uppercase tracking-[0.3em]">
                            <Calendar size={13} />
                            Événements RGB
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-black font-heading tracking-tighter leading-none">
                        Nos{' '}
                        <span className="text-transparent bg-clip-text"
                            style={{ backgroundImage: 'linear-gradient(135deg, #FCD116 0%, #008751 100%)' }}>
                            Événements
                        </span>
                    </h1>

                    <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
                        Rejoignez les rencontres exclusives de Retour Gagnant Bénin — galas, conférences, ateliers et networking pour la diaspora et les entrepreneurs.
                    </p>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un événement..."
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#008751]/60 transition-all placeholder-gray-700"
                        />
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {CATEGORIES.map(cat => {
                            const CatIcon = cat.icon
                            const isActive = activeCategory === cat.value
                            return (
                                <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${isActive
                                            ? 'border-[#008751]/50 bg-[#008751]/15 text-emerald-300'
                                            : 'border-white/[0.07] bg-white/[0.03] text-gray-500 hover:text-gray-300 hover:border-white/15'
                                        }`}>
                                    <CatIcon size={13} />
                                    {cat.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── FEATURED EVENT ── */}
            {featured.length > 0 && (
                <div className="relative z-10 max-w-6xl mx-auto px-4 pb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #FCD116, #f59e0b)', boxShadow: '0 4px 16px rgba(252,209,22,0.3)' }}>
                            <Star size={14} fill="white" className="text-white" />
                        </div>
                        <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">Événement à la une</span>
                    </div>

                    {featured.slice(0, 1).map(evt => (
                        <Link href={`/evenements/${evt.slug}`} key={evt.id}>
                            <motion.div
                                whileHover={{ y: -4 }}
                                className="relative rounded-[28px] border border-white/[0.08] overflow-hidden cursor-pointer group"
                                style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))' }}
                            >
                                <div className="grid md:grid-cols-2 gap-0">
                                    <div className="relative h-64 md:h-80">
                                        {evt.cover_image_url ? (
                                            <Image src={evt.cover_image_url} alt={evt.title} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#008751]/20 to-[#FCD116]/10 flex items-center justify-center">
                                                <Calendar size={48} className="text-[#008751]/40" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider text-[#030a15]"
                                                style={{ background: 'linear-gradient(135deg, #FCD116, #f59e0b)' }}>
                                                À la une
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-8 flex flex-col justify-center space-y-4">
                                        <span className="text-[10px] font-bold text-[#008751] uppercase tracking-widest">{evt.category}</span>
                                        <h2 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-white group-hover:text-[#FCD116] transition-colors">{evt.title}</h2>
                                        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">{evt.short_description || evt.description}</p>
                                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1.5"><Calendar size={12} className="text-[#FCD116]" />{formatDate(evt.start_date)}</span>
                                            {evt.location && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-[#008751]" />{evt.location}</span>}
                                        </div>
                                        <div className="flex items-center gap-4 pt-2">
                                            {evt.price_standard > 0 ? (
                                                <span className="text-lg font-black text-[#FCD116]">{formatPrice(evt.price_standard)} {evt.currency}</span>
                                            ) : (
                                                <span className="text-sm font-black text-[#008751]">GRATUIT</span>
                                            )}
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-gray-400 group-hover:text-[#FCD116] transition-colors ml-auto">
                                                Voir les détails <ArrowRight size={13} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}

            {/* ── EVENTS GRID ── */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 pb-20">
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] h-80 animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Calendar size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-500 font-bold">Aucun événement trouvé</p>
                        <p className="text-gray-700 text-sm mt-1">De nouveaux événements seront bientôt publiés.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((evt, i) => (
                            <motion.div
                                key={evt.id}
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08, duration: 0.4 }}
                            >
                                <Link href={`/evenements/${evt.slug}`}>
                                    <div className="rounded-[24px] border border-white/[0.08] overflow-hidden cursor-pointer group hover:border-white/15 transition-all"
                                        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))' }}>
                                        {/* Image */}
                                        <div className="relative h-48 overflow-hidden">
                                            {evt.cover_image_url ? (
                                                <Image src={evt.cover_image_url} alt={evt.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-[#008751]/15 to-[#FCD116]/10 flex items-center justify-center">
                                                    <Calendar size={36} className="text-[#008751]/30" />
                                                </div>
                                            )}
                                            <div className="absolute top-3 left-3 flex gap-2">
                                                <span className="px-2.5 py-1 rounded-full bg-[#030a15]/80 text-[9px] font-bold text-gray-300 uppercase tracking-wider backdrop-blur-sm border border-white/10">
                                                    {evt.category}
                                                </span>
                                            </div>
                                            {evt.price_vip > 0 && (
                                                <div className="absolute top-3 right-3">
                                                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black text-[#030a15] uppercase"
                                                        style={{ background: 'linear-gradient(135deg, #FCD116, #f59e0b)' }}>
                                                        <Crown size={9} className="inline mr-1" />VIP
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 space-y-3">
                                            <h3 className="text-base font-black text-white group-hover:text-[#FCD116] transition-colors line-clamp-2 font-heading">{evt.title}</h3>

                                            <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={11} className="text-[#FCD116] flex-shrink-0" />
                                                    {formatDate(evt.start_date)}
                                                </span>
                                                {evt.location && (
                                                    <span className="flex items-center gap-1.5">
                                                        <MapPin size={11} className="text-[#008751] flex-shrink-0" />
                                                        <span className="truncate">{evt.location}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                                                {evt.price_standard > 0 ? (
                                                    <span className="text-sm font-black text-[#FCD116]">
                                                        {formatPrice(evt.price_standard)} <span className="text-[10px] text-gray-600">{evt.currency}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-black text-[#008751] px-2.5 py-1 rounded-full bg-[#008751]/10 border border-[#008751]/20">GRATUIT</span>
                                                )}
                                                <span className="flex items-center gap-1 text-[11px] font-bold text-gray-500 group-hover:text-[#FCD116] transition-colors">
                                                    Participer <ArrowRight size={11} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
