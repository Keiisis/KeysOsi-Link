'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GoldenIcon } from '@/components/ui/GoldenIcon'
import PricingCalculator3D from '@/components/services/PricingCalculator3D'
import CinematicIntro from '@/components/services/CinematicIntro'
import { useTranslation, T } from '@/lib/translation'
import { supabase } from '@/lib/supabase'

interface ServiceData {
    title: string
    subtitle: string
    description: string
    features: string[]
    price: string
    color: string
    icon_type: string
    image_url?: string
    pricing_options: Array<{ label: string; price: string }>
}

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { t } = useTranslation()
    const { slug } = use(params)
    const [service, setService] = useState<ServiceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    useEffect(() => {
        const fetchService = async () => {
            if (!slug) return

            try {
                const { data, error } = await supabase
                    .from('services')
                    .select('*')
                    .eq('slug', slug)
                    .single()

                if (error || !data) {
                    setNotFound(true)
                    return
                }

                setService({
                    title: data.title || '',
                    subtitle: data.subtitle || '',
                    description: data.description || '',
                    features: Array.isArray(data.features) && data.features.length > 0
                        ? data.features
                        : ['Analyse experte', 'Suivi personnalisé'],
                    price: data.price_display || 'Nous consulter',
                    color: data.color || '#008751',
                    icon_type: data.icon_type || 'standard',
                    image_url: data.image_url || '',
                    pricing_options: Array.isArray(data.pricing_options) && data.pricing_options.length > 0
                        ? data.pricing_options
                        : [{ label: 'Standard', price: 'Nous consulter' }],
                })
            } catch {
                console.warn('ServiceDetailPage: Erreur chargement depuis Supabase')
                setNotFound(true)
            } finally {
                setLoading(false)
            }
        }

        fetchService()
    }, [slug])

    const [showIntro, setShowIntro] = useState(slug === 'passeport')

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-[#008751]" size={36} />
            </div>
        )
    }

    if (notFound || !service) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500 text-lg font-semibold"><T>Service introuvable</T></p>
                <Link href="/services">
                    <Button variant="outline"><T>Retour aux services</T></Button>
                </Link>
            </div>
        )
    }

    return (
        <>
            {showIntro && (
                <div className="fixed inset-0 z-[100]">
                    <CinematicIntro onComplete={() => setShowIntro(false)} />
                </div>
            )}

            <div className="min-h-screen bg-gray-50">
                {/* Hero Banner */}
                <section className="relative py-20 bg-gradient-to-br from-[#0f141e] via-[#1a2a3a] to-[#0f141e] text-white overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-10 right-20 w-64 h-64 rounded-full blur-[100px]" style={{ background: service.color }} />
                    </div>

                    <div className="container mx-auto px-4 relative z-10">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-8">
                            <Link href="/" className="hover:text-white/80 transition-colors"><T>Accueil</T></Link>
                            <ChevronRight size={14} />
                            <Link href="/services" className="hover:text-white/80 transition-colors"><T>Services</T></Link>
                            <ChevronRight size={14} />
                            <span className="text-[#FCD116]">{t(service.title)}</span>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl flex flex-col md:flex-row items-center gap-8"
                        >
                            <div className="shrink-0 drop-shadow-[0_0_30px_rgba(252,209,22,0.4)]">
                                {service.image_url ? (
                                    <motion.div
                                        className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center origin-center"
                                        animate={{
                                            y: [0, -15, 0],
                                            rotate: [0, 4, -4, 0]
                                        }}
                                        transition={{
                                            duration: 6,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={service.image_url}
                                            alt={service.title}
                                            className="w-full h-full object-contain bg-transparent drop-shadow-[0_15px_35px_rgba(0,0,0,0.4)]"
                                        />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <GoldenIcon
                                            // @ts-expect-error — icon_type is a valid prop but not typed
                                            type={service.icon_type}
                                            className="w-32 h-32 md:w-40 md:h-40"
                                        />
                                    </motion.div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">{t(service.title)}</h1>
                                <p className="text-xl text-white/70">{t(service.subtitle)}</p>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Content & Pricing */}
                <section className="py-16">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
                            {/* Main Content */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="lg:col-span-2 space-y-10"
                            >
                                <div>
                                    <h2 className="text-2xl font-bold text-[#1a2332] mb-4"><T>Description du service</T></h2>
                                    <p className="text-gray-600 leading-relaxed text-lg">{t(service.description)}</p>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-[#1a2332] mb-6"><T>Ce que nous proposons</T></h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {service.features.map((item, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 + i * 0.05 }}
                                                className="flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                                            >
                                                <CheckCircle2 className="shrink-0 mt-0.5" style={{ color: service.color }} size={20} />
                                                <span className="text-gray-700">{t(item)}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Sidebar */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="lg:col-span-1"
                            >
                                <div className="sticky top-24 space-y-6">
                                    <PricingCalculator3D
                                        options={service.pricing_options}
                                        baseColor={service.color}
                                        serviceName={service.title}
                                    />

                                    <Card className="border-0 shadow-lg overflow-hidden bg-white/80 backdrop-blur-sm">
                                        <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${service.color}, #FCD116)` }} />
                                        <CardContent className="p-6">
                                            <h3 className="text-lg font-bold text-[#1a2332] mb-2 flex items-center gap-2">
                                                <Calendar size={18} className="text-[#008751]" />
                                                <T>Prêt à démarrer ?</T>
                                            </h3>
                                            <p className="text-sm text-gray-500 mb-4">
                                                <T>Réservez un créneau avec nos experts pour concrétiser votre projet.</T>
                                            </p>
                                            <Link href="/rendez-vous" className="block">
                                                <Button className="w-full bg-[#1a2332] hover:bg-[#2c3b55] text-white font-bold h-12 rounded-xl transition-all shadow-md hover:shadow-lg">
                                                    <T>Prendre Rendez-vous</T>
                                                </Button>
                                            </Link>
                                            <p className="text-xs text-center text-gray-400 mt-3">
                                                <T>Premier appel de 15 min gratuit</T>
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}
