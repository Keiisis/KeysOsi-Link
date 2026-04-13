'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import PartnerCard, { type Partner } from './PartnerCard'
import PartnerProfileModal from './PartnerProfileModal'
import { Button } from '@/components/ui/button'
import { Search, Loader2, SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const FALLBACK_PARTNERS: Partner[] = [
    { id: 1, name: 'Immo Bénin Prestige', description: 'Agence immobilière de luxe spécialisée dans les villas et appartements meublés à Cotonou et Ouidah.', logo: '', coverImage: '', category: 'Immobilier', location: 'Cotonou, Haie Vive', isPremium: true, products: [] },
    { id: 2, name: 'Saveurs du Terroir', description: 'Exportation de produits agroalimentaires béninois bio certifiés vers la diaspora.', logo: '', coverImage: '', category: 'Agro-Business', location: 'Abomey-Calavi', products: [] },
    { id: 3, name: 'Art & Racines', description: 'Galerie d\'art proposant sculptures et toiles d\'artistes béninois contemporains.', logo: '', coverImage: '', category: 'Art & Culture', location: 'Ouidah', isPremium: true, products: [] },
    { id: 4, name: 'Tech Hub Cotonou', description: 'Espace de coworking et incubateur pour startups numériques au cœur de Cotonou.', logo: '', coverImage: '', category: 'Services & Tech', location: 'Cotonou, Ganhi', products: [] },
]

const CATEGORIES = ['Tous', 'Immobilier', 'Agro-Business', 'Art & Culture', 'Services & Tech', 'Mode & Beauté', 'Tourisme & Hôtellerie', 'Santé & Bien-être', 'Finance & Investissement', 'Éducation & Formation', 'Commerce & Distribution']

export default function PartnerDirectory() {
    const [partners, setPartners] = useState<Partner[]>(FALLBACK_PARTNERS)
    const [selectedCategory, setSelectedCategory] = useState('Tous')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const { data, error } = await supabase
                    .from('partners')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })

                if (!error && data && data.length > 0) {
                    setPartners(data.map((p: Record<string, unknown>) => ({
                        id: Number(p.id) || 0,
                        name: String(p.name || ''),
                        description: String(p.description || ''),
                        logo: p.logo ? String(p.logo) : '',
                        coverImage: p.cover_image ? String(p.cover_image) : '',
                        category: String(p.category || ''),
                        location: String(p.location || ''),
                        website: p.website ? String(p.website) : undefined,
                        phone: p.phone ? String(p.phone) : undefined,
                        email: p.email ? String(p.email) : undefined,
                        whatsapp: p.whatsapp ? String(p.whatsapp) : undefined,
                        facebook: p.facebook_url ? String(p.facebook_url) : undefined,
                        instagram: p.instagram_url ? String(p.instagram_url) : undefined,
                        linkedin: p.linkedin_url ? String(p.linkedin_url) : undefined,
                        isPremium: Boolean(p.is_premium),
                        products: Array.isArray(p.products) ? p.products : [],
                    })))
                }
            } catch { /* fallback déjà défini */ }
            finally { setLoading(false) }
        }
        fetchPartners()
    }, [])

    const filtered = partners
        .filter(p => {
            const matchCat = selectedCategory === 'Tous' || p.category === selectedCategory
            const q = searchQuery.toLowerCase()
            const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
            return matchCat && matchSearch
        })
        .sort((a, b) => {
            if (a.isPremium && !b.isPremium) return -1
            if (!a.isPremium && b.isPremium) return 1
            return a.name.localeCompare(b.name)
        })

    const resetFilters = useCallback(() => { setSelectedCategory('Tous'); setSearchQuery('') }, [])

    return (
        <section className="py-16 bg-[#f8f7f4] min-h-screen">
            <div className="container mx-auto px-4 max-w-7xl">

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-12">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#008751] mb-2">Réseau partenaire</p>
                    <h2 className="text-3xl md:text-4xl font-black text-[#1a2332] leading-tight mb-3">Nos Partenaires au Bénin</h2>
                    <p className="text-gray-500 text-[15px] max-w-xl mx-auto">Des professionnels sélectionnés pour vous accompagner dans votre retour et votre installation.</p>
                </motion.div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
                    <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button key={cat} type="button" onClick={() => setSelectedCategory(cat)}
                                className={['whitespace-nowrap px-4 py-2 rounded-full text-[12px] font-bold transition-all',
                                    selectedCategory === cat ? 'bg-[#1a2332] text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'].join(' ')}>
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64 flex-shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4"/>
                        <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-[13px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-[#008751] transition-colors shadow-sm"/>
                    </div>
                </div>

                {!loading && (
                    <div className="flex items-center gap-2 mb-6">
                        <SlidersHorizontal size={12} className="text-gray-300"/>
                        <span className="text-[12px] text-gray-400">
                            <span className="font-bold text-[#1a2332]">{filtered.length}</span> partenaire{filtered.length > 1 ? 's' : ''}
                            {selectedCategory !== 'Tous' && <> · <span className="text-[#008751] font-semibold">{selectedCategory}</span></>}
                        </span>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#008751]"/></div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filtered.map(partner => (
                            <PartnerCard key={partner.id} partner={partner} onClick={() => setSelectedPartner(partner)}/>
                        ))}
                    </div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24 space-y-3">
                        <p className="text-4xl">🔍</p>
                        <p className="text-lg font-bold text-gray-400">Aucun partenaire trouvé</p>
                        <p className="text-[13px] text-gray-300">Essayez d&apos;autres critères de recherche</p>
                        <Button variant="outline" onClick={resetFilters} className="mt-2 rounded-full border-gray-200 text-gray-500 hover:text-[#008751]">Réinitialiser les filtres</Button>
                    </motion.div>
                )}
            </div>

            <PartnerProfileModal partner={selectedPartner} onClose={() => setSelectedPartner(null)}/>
        </section>
    )
}
