'use client'

import { useState, useEffect } from 'react'
import PartnerCard, { type Partner } from './PartnerCard'
import PartnerProfileModal from './PartnerProfileModal'
import { Button } from '@/components/ui/button'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

const FALLBACK_PARTNERS: Partner[] = [
    { id: 1, name: 'Immo Bénin Prestige', description: 'Agence immobilière de luxe spécialisée dans les villas et appartements meublés à Cotonou et Ouidah.', logo: '', coverImage: '', category: 'Immobilier', location: 'Cotonou, Haie Vive', isPremium: true, products: [] },
    { id: 2, name: 'Saveurs du Terroir', description: 'Exportation de produits agroalimentaires béninois bio certifiés, du producteur direct à la diaspora.', logo: '', coverImage: '', category: 'Agro-Business', location: 'Abomey-Calavi', products: [] },
    { id: 3, name: 'Art & Racines', description: 'Galerie d\'art proposant des sculptures, toiles et objets décoratifs d\'artistes béninois contemporains.', logo: '', coverImage: '', category: 'Art & Culture', location: 'Ouidah', isPremium: true, products: [] },
    { id: 4, name: 'Tech Hub Cotonou', description: 'Espace de coworking et incubateur pour startups numériques. Formation, accompagnement et networking.', logo: '', coverImage: '', category: 'Services & Tech', location: 'Cotonou, Ganhi', products: [] },
]

const CATEGORIES = ['Tous', 'Immobilier', 'Agro-Business', 'Art & Culture', 'Services & Tech', 'Mode & Beauté', 'Tourisme & Hôtellerie', 'Santé & Bien-être', 'Finance & Investissement']

export default function PartnerDirectory() {
    const [partners, setPartners] = useState<Partner[]>(FALLBACK_PARTNERS)
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
    const [selectedCategory, setSelectedCategory] = useState('Tous')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)

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
            } catch {
                console.warn('Using fallback partners data.')
            } finally {
                setLoading(false)
            }
        }
        fetchPartners()
    }, [])

    const filteredPartners = partners.filter(partner => {
        const matchesCategory = selectedCategory === 'Tous' || partner.category === selectedCategory
        const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            partner.description.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <section className="py-12 bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-12">
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'default' : 'outline'}
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-full whitespace-nowrap text-sm ${selectedCategory === cat ? 'bg-[#008751] hover:bg-[#006e42] text-white' : 'border-gray-200 text-gray-600'}`}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-72 flex-shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Rechercher un partenaire..."
                            className="pl-10 bg-white border-gray-200 rounded-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#008751]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredPartners.map(partner => (
                            <PartnerCard
                                key={partner.id}
                                partner={partner}
                                onClick={() => setSelectedPartner(partner)}
                            />
                        ))}
                    </div>
                )}

                {!loading && filteredPartners.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p className="text-xl font-medium">Aucun partenaire trouvé pour cette recherche.</p>
                        <Button variant="link" onClick={() => { setSelectedCategory('Tous'); setSearchQuery('') }}>
                            Réinitialiser les filtres
                        </Button>
                    </div>
                )}
            </div>

            {selectedPartner && (
                <PartnerProfileModal
                    partner={selectedPartner}
                    onClose={() => setSelectedPartner(null)}
                />
            )}
        </section>
    )
}
