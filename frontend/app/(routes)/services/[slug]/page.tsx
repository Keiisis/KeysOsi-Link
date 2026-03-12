'use client'

import { use, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, ChevronRight, Calendar, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GoldenIcon } from '@/components/ui/GoldenIcon'
import PricingCalculator3D from '@/components/services/PricingCalculator3D'
import CinematicIntro from '@/components/services/CinematicIntro'
import { useTranslation, T } from '@/lib/translation'

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

// Contenu de référence utilisé si la DB est inaccessible
const FALLBACK_SERVICES: Record<string, ServiceData> = {
    passeport: {
        title: 'Passeport & Documents',
        subtitle: 'Documents officiels et accompagnement pour la diaspora béninoise',
        description: "Nous prenons en charge l'ensemble des démarches liées à l'obtention ou au renouvellement de votre passeport biométrique béninois. Constitution du dossier, coordination avec les autorités compétentes et suivi jusqu'à la remise de votre titre — un accompagnement structuré, sans improvisation.",
        features: [
            "Copie intégrale du passeport en cours de validité",
            "Acte de naissance certifié conforme délivré par la mairie béninoise",
            "Certificat de nationalité béninoise (Tribunal de Première Instance)",
            "Carte d'Identité Personnelle (CIP A) en cours de validité",
            "Extrait de casier judiciaire béninois — Bulletin n°3 (moins de 3 mois)",
            "Justificatif de domicile de moins de 3 mois (quittance ou bail)",
            "4 photos d'identité biométriques (fond blanc, 3,5 × 4,5 cm, sans lunettes)",
            "Formulaire officiel de demande de passeport rempli et signé",
        ],
        price: 'À partir de 50 000 FCFA',
        color: '#008751',
        icon_type: 'passport',
        image_url: '/assets/icones/icone_Passeport_Documents.png',
        pricing_options: [
            { label: 'Pack Standard — Passeport ordinaire', price: '75 000 FCFA' },
            { label: 'Pack VIP — Traitement express jour-J', price: '350 000 FCFA' },
            { label: 'Renouvellement accompagné', price: '50 000 FCFA' },
        ],
    },
    logement: {
        title: 'Acheter ou Louer',
        subtitle: 'Vérifiez, informez-vous et Sécurisez vos transactions foncières et immobilières',
        description: "L'immobilier au Bénin offre de réelles opportunités — à condition de savoir naviguer dans un marché foncier qui requiert vigilance et expertise juridique. Nous vous accompagnons de la sélection du bien à la signature de l'acte notarié, en veillant à chaque étape à la solidité juridique de votre acquisition.",
        features: [
            "Vérification du Titre Foncier (TF) et purge des oppositions cadastrales",
            "Bornage et identification parcellaire auprès de l'ANDF",
            "Due diligence juridique sur la chaîne de propriété",
            "Accompagnement notarial et rédaction des actes de vente ou de bail",
            "Gestion locative et suivi des relations bailleurs-locataires",
            "Conseil en fiscalité immobilière (droits de mutation, impôts fonciers)",
        ],
        price: 'À partir de 25 000 FCFA',
        color: '#FCD116',
        icon_type: 'tata',
        image_url: '/assets/icones/icone_Acheter_ou_louer.png',
        pricing_options: [
            { label: 'Accompagnement en Acquisition Foncière', price: '3% du montant' },
            { label: 'Gestion locative mensuelle', price: '8% des loyers' },
            { label: 'Consultation juridique', price: '25 000 FCFA' },
        ],
    },
    business: {
        title: "Création d'Entreprise",
        subtitle: "Lancez votre business. Études de marché, créations de sociétés et implantation, Recherche de Partenaires.",
        description: "Pendant que le monde hésite, le Bénin avance à pas de géant. Ne soyez pas spectateur de l'émergence du Bénin : devenez-en un acteur. Créer une entreprise ici peut sembler complexe, mais avec le bon partenaire, c'est une démarche maîtrisée. De la formalisation de votre idée à votre premier client, nous balisons chaque étape du parcours. Le Bénin est une terre d'opportunités pour les afro-descendants qui souhaitent investir et s'impliquer. Le gouvernement accompagne les créateurs d'entreprises et favorise le développement d'activités à fort potentiel. Votre projet commence aujourd'hui — nous en posons les fondations juridiques et fiscales solides.",
        features: [
            "Création de Société Clé-en-main (72h chrono)",
            "Fiscalité Optimisée & Conseil Comptable Stratégique",
            "Ouverture de Compte Bancaire Professionnel",
            "Domiciliation Temporaire et Prestigieuse au Cœur de Cotonou",
            "Cabinet de recrutement — Sélection de talents locaux",
            "Mise en relation privilégiée avec des personnes influentes",
        ],
        price: 'À partir de 150 000 FCFA',
        color: '#008751',
        icon_type: 'cowrie',
        image_url: '/assets/icones/icone_Creation_d_Entreprise.png',
        pricing_options: [
            { label: 'Création SARL', price: '150 000 FCFA' },
            { label: 'Création SA', price: '250 000 FCFA' },
            { label: 'Accompagnement complet', price: 'Sur devis' },
        ],
    },
    culture: {
        title: 'Tourisme & Culture',
        subtitle: 'Découvrez le Bénin authentique et son patrimoine vivant',
        description: "Circuits touristiques personnalisés, guides certifiés, séjours clé en main et immersion dans les traditions béninoises. Vivez le Bénin authentique, de Ouidah à Abomey en passant par Ganvié.",
        features: [
            'Circuits touristiques personnalisés (Ouidah, Abomey, Ganvié...)',
            'Guides culturels certifiés et bilingues',
            'Organisation de séjours clé en main',
            'Visites de sites classés UNESCO',
            'Immersion dans les traditions vodoun et royales',
        ],
        price: 'À partir de 120 000 FCFA/pers',
        color: '#E8112D',
        icon_type: 'drum',
        image_url: '/assets/icones/icone_Guide_culturel.png',
        pricing_options: [
            { label: 'Circuit court (3 jours)', price: '120 000 FCFA/pers' },
            { label: 'Circuit complet (7 jours)', price: '280 000 FCFA/pers' },
            { label: 'Sur mesure', price: 'Nous consulter' },
        ],
    },
    construction: {
        title: 'Suivi de Chantier',
        subtitle: "Votre chantier suivi et livré dans les règles de l'art",
        description: "Maîtrise d'ouvrage déléguée, contrôle qualité, coordination des corps de métier et reporting régulier. Votre projet de construction au Bénin géré avec rigueur, même à distance.",
        features: [
            "Maîtrise d'ouvrage déléguée et coordination des corps de métier",
            'Contrôle qualité et conformité des travaux',
            'Reporting photographique hebdomadaire',
            'Sélection et négociation avec les entreprises locales',
            'Réception des travaux et gestion des réserves',
        ],
        price: 'À partir de 50 000 FCFA',
        color: '#FCD116',
        icon_type: 'assin',
        image_url: '/assets/icones/icone_Construction.png',
        pricing_options: [
            { label: 'Suivi mensuel', price: '75 000 FCFA/mois' },
            { label: 'Mission complète', price: '5% du montant travaux' },
            { label: 'Audit ponctuel', price: '50 000 FCFA' },
        ],
    },
    investissement: {
        title: 'Investissement',
        subtitle: "Des opportunités d'affaires concrètes et sécurisées",
        description: "Identification d'opportunités d'investissement, mise en relation avec des partenaires locaux fiables et accompagnement stratégique pour vos projets d'affaires au Bénin.",
        features: [
            "Identification et analyse d'opportunités d'investissement",
            'Mise en relation avec partenaires locaux fiables',
            "Accompagnement pour les formalités d'installation",
            'Veille économique et sectorielle au Bénin',
            "Suivi post-investissement et gestion des risques",
        ],
        price: 'À partir de 50 000 FCFA',
        color: '#008751',
        icon_type: 'tree',
        image_url: '/assets/icones/icone_Investissement.png',
        pricing_options: [
            { label: 'Étude de marché', price: '200 000 FCFA' },
            { label: 'Accompagnement complet', price: 'Sur devis' },
            { label: 'Consultation stratégique', price: '50 000 FCFA' },
        ],
    },
    'nationalite-vip': {
        title: 'Nationalité VIP',
        subtitle: 'Obtenir la nationalité béninoise pour la diaspora afro-descendante',
        description: "Accompagnement personnalisé pour les membres de la diaspora souhaitant obtenir la nationalité béninoise. Suivi de dossier, coordination avec les autorités compétentes et prise en charge prioritaire.",
        features: [
            'Constitution et vérification du dossier complet',
            'Liaison avec le Ministère de la Justice',
            'Suivi administratif pas à pas',
            "Accompagnement pour l'apostille et traductions certifiées",
            'Pack VIP : suivi prioritaire avec référent dédié',
        ],
        price: 'À partir de 150 000 FCFA',
        color: '#FCD116',
        icon_type: 'recade',
        image_url: '',
        pricing_options: [
            { label: 'Accompagnement dossier standard', price: '150 000 FCFA' },
            { label: 'Pack VIP — suivi prioritaire', price: '350 000 FCFA' },
            { label: 'Consultation initiale', price: 'Gratuit' },
        ],
    },
    autres: {
        title: 'Autres Services',
        subtitle: 'Transport, santé, scolarité et démarches du quotidien',
        description: "Des solutions complémentaires pour faciliter chaque aspect de votre installation au Bénin — de l'aéroport à l'école de vos enfants, en passant par l'accès aux soins et les démarches administratives courantes.",
        features: [
            'Transfert aéroport et location de véhicule avec chauffeur',
            'Mise en relation avec médecins et cliniques partenaires',
            'Inscription scolaire et suivi pédagogique',
            'Accompagnement démarches administratives locales',
        ],
        price: 'Nous contacter',
        color: '#008751',
        icon_type: 'standard',
        image_url: '',
        pricing_options: [
            { label: 'Consultation', price: 'Nous contacter' },
        ],
    },
}

// Étapes du Pack VIP Passeport (affichées uniquement sur /services/passeport)
const PACK_VIP_STEPS = [
    {
        num: '01',
        title: 'Enrôlement État Civil',
        desc: "Obtention de votre extrait de naissance certifié conforme auprès des autorités de l'état civil béninois.",
    },
    {
        num: '02',
        title: "Carte d'Identité Personnelle (CIP A)",
        desc: "Constitution du dossier et enrôlement biométrique pour votre titre d'identité officiel béninois.",
    },
    {
        num: '03',
        title: 'Passeport Express Jour-J',
        desc: "Prise en charge prioritaire de votre demande de passeport biométrique — déposée et traitée le jour même.",
    },
]

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { t } = useTranslation()
    const { slug } = use(params)
    const [service, setService] = useState<ServiceData | null>(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [showCalculator, setShowCalculator] = useState(true)

    // Chargement du service depuis l'API serveur (service role key — bypass RLS)
    useEffect(() => {
        const fetchService = async () => {
            if (!slug) return

            try {
                const res = await fetch(`/api/services/${slug}`)
                const json = await res.json()
                const data = json.service

                if (!data) {
                    const fallback = FALLBACK_SERVICES[slug]
                    if (fallback) { setService(fallback) } else { setNotFound(true) }
                    return
                }

                setService({
                    title: data.title || '',
                    subtitle: data.subtitle || '',
                    description: data.description || '',
                    features: Array.isArray(data.features) && data.features.length > 0
                        ? data.features
                        : (FALLBACK_SERVICES[slug]?.features ?? ['Analyse experte', 'Suivi personnalisé']),
                    price: data.price_display || FALLBACK_SERVICES[slug]?.price || 'Nous consulter',
                    color: data.color || '#008751',
                    icon_type: data.icon_type || 'standard',
                    image_url: data.image_url || '',
                    pricing_options: Array.isArray(data.pricing_options) && data.pricing_options.length > 0
                        ? data.pricing_options
                        : (FALLBACK_SERVICES[slug]?.pricing_options ?? [{ label: 'Standard', price: 'Nous consulter' }]),
                })
            } catch {
                console.warn('ServiceDetailPage: Erreur API, affichage du contenu par défaut.')
                const fallback = FALLBACK_SERVICES[slug]
                if (fallback) { setService(fallback) } else { setNotFound(true) }
            } finally {
                setLoading(false)
            }
        }

        fetchService()
    }, [slug])

    // Chargement du paramètre calculateur (pages passeport et nationalite-vip uniquement)
    useEffect(() => {
        if (slug !== 'passeport' && slug !== 'nationalite-vip') return

        fetch('/api/settings/frontend')
            .then(r => r.json())
            .then(json => {
                const val = json.settings?.passeport_show_calculator
                if (val === 'false') setShowCalculator(false)
            })
            .catch(() => { /* défaut : calculateur visible */ })
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

                                {/* Features — renommé "Pièces à fournir" pour le passeport */}
                                <div>
                                    <h2 className="text-2xl font-bold text-[#1a2332] mb-6">
                                        {slug === 'passeport'
                                            ? <T>Pièces à fournir pour les afro-descendants</T>
                                            : <T>Ce que nous proposons</T>
                                        }
                                    </h2>
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

                                {/* Section Pack VIP — uniquement pour le passeport */}
                                {slug === 'passeport' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="rounded-2xl border border-[#FCD116]/40 bg-gradient-to-br from-[#FCD116]/5 to-[#008751]/5 p-6 md:p-8"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Sparkles className="text-[#FCD116]" size={22} />
                                            <h2 className="text-xl font-bold text-[#1a2332]">
                                                <T>Pack VIP Retour Gagnant</T>
                                            </h2>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-6">
                                            <T>Un accompagnement intégral en une seule journée — de l&apos;état civil à la délivrance de votre passeport.</T>
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {PACK_VIP_STEPS.map((step) => (
                                                <div
                                                    key={step.num}
                                                    className="bg-white rounded-xl p-5 shadow-sm border border-[#FCD116]/20 flex flex-col gap-2"
                                                >
                                                    <span className="text-4xl font-black text-[#FCD116]/30 leading-none">{step.num}</span>
                                                    <h4 className="text-sm font-bold text-[#1a2332]">{step.title}</h4>
                                                    <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>

                            {/* Sidebar */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="lg:col-span-1"
                            >
                                <div className="sticky top-24 space-y-6">
                                    {showCalculator && (
                                        <PricingCalculator3D
                                            options={service.pricing_options}
                                            baseColor={service.color}
                                            serviceName={service.title}
                                        />
                                    )}

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
