"use client"

import { GoldenIcon } from "@/components/ui/GoldenIcon"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

import { LucideIcon } from "lucide-react"
import { useTranslation, T } from "@/lib/translation"

type GoldenIconType = "passport" | "tata" | "drum" | "cowrie" | "assin" | "tree" | "recade" | "standard"

interface ServiceItem {
    id: string | number
    title: string
    description: string
    icon?: LucideIcon
    iconType?: GoldenIconType
    slug: string
    imageUrl: string
}

// Fallback images par slug (si la DB n'a pas d'image)
const IMG_BY_SLUG: Record<string, string> = {
    passeport: '/assets/icones/icone_Passeport_Documents.png',
    logement: '/assets/icones/icone_Acheter_ou_louer.png',
    business: '/assets/icones/icone_Creation_d_Entreprise.png',
    culture: '/assets/icones/icone_Guide_culturel.png',
    construction: '/assets/icones/icone_Construction.png',
    investissement: '/assets/icones/icone_Investissement.png',
}

export default function ServicesGrid() {
    const { t } = useTranslation()
    const [servicesList, setServicesList] = useState<ServiceItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('id, title, slug, description, icon_type, image_url, is_active, order_index')
                    .eq('is_active', true)
                    .order('order_index', { ascending: true })

                if (error) throw error

                if (data && data.length > 0) {
                    const mappedServices: ServiceItem[] = data.map((item) => {
                        const slug = item.slug || String(item.title).toLowerCase().replace(/\s+/g, '-')
                        return {
                            id: item.id,
                            title: item.title,
                            description: item.description || 'Découvrez ce service',
                            iconType: (item.icon_type || 'standard') as GoldenIconType,
                            slug,
                            imageUrl: item.image_url || IMG_BY_SLUG[slug] || '',
                        }
                    })
                    setServicesList(mappedServices)
                }
            } catch (err) {
                console.warn('ServicesGrid: Erreur chargement depuis Supabase, aucun fallback.', err)
            } finally {
                setLoading(false)
            }
        }

        fetchServices()
    }, [])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-[#008751]" size={36} />
            </div>
        )
    }

    if (servicesList.length === 0) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-500 text-sm">Aucun service disponible pour le moment.</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {servicesList.map((service: ServiceItem) => (
                <div
                    key={service.id}
                    className="group relative glass-card-premium hover:border-[#FCD116] rounded-2xl p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-flag bg-white"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                        <ArrowRight className="text-[#008751] w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                    </div>

                    <div className="mb-6 flex justify-center md:justify-start">
                        {service.imageUrl ? (
                            <div className="w-24 h-24 flex items-center justify-center relative">
                                <Image
                                    src={service.imageUrl}
                                    alt={t(service.title)}
                                    fill
                                    className="object-contain bg-transparent group-hover:scale-110 group-hover:-translate-y-2 group-hover:drop-shadow-[0_12px_25px_rgba(252,209,22,0.4)] drop-shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-500"
                                    sizes="96px"
                                />
                            </div>
                        ) : (
                            <GoldenIcon
                                icon={service.icon}
                                type={service.iconType}
                                className="group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500"
                            />
                        )}
                    </div>

                    <h3 className="text-xl font-bold font-heading text-[#1a2332] mb-3 group-hover:text-[#008751] transition-colors">
                        {t(service.title)}
                    </h3>

                    <p className="text-gray-600 font-medium mb-6 line-clamp-3">
                        {t(service.description)}
                    </p>

                    <Link href={`/services/${service.slug}`} className="block w-full">
                        <Button variant="outline" className="w-full border-[#008751]/20 text-[#008751] hover:bg-[#008751] hover:text-white transition-colors rounded-xl font-semibold">
                            <T>En savoir plus</T>
                        </Button>
                    </Link>
                </div>
            ))}
        </div>
    )
}
