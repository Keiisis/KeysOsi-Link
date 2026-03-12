'use client';

import { use, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, ChevronRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { GoldenIcon } from '@/components/ui/GoldenIcon';
import PricingCalculator3D from '@/components/services/PricingCalculator3D';
import CinematicIntro from '@/components/services/CinematicIntro';
import { useTranslation, T } from '@/lib/translation';

// Fallback service data — user can override this via Supabase Admin
const FALLBACK_SERVICES: Record<string, {
    title: string;
    subtitle: string;
    description: string;
    features: string[];
    price: string;
    color: string;
    icon_type: string;
    image_url?: string;
    pricing_options: Array<{ label: string; price: string }>;
}> = {
    passeport: {
        title: "Passeport & Nationalité",
        subtitle: "Accompagnement complet pour vos démarches d'identité et de naturalisation",
        description: "Nos experts vous guident pas à pas dans vos démarches d'obtention du passeport béninois ou de reconnaissance de la nationalité. Nous prenons en charge la constitution du dossier, les rendez-vous auprès des autorités compétentes et le suivi jusqu'à l'aboutissement de votre demande.",
        features: [
            "Dossier de naturalisation",
            "Passeport biométrique (1re demande & renouvellement)",
            "Acte de naissance & état civil",
            "Extrait de casier judiciaire",
            "Légalisation Apostille (valable à l'international)",
            "Suivi administratif complet",
        ],
        price: "À partir de 50.000 FCFA",
        color: "#008751",
        icon_type: "passport",
        image_url: "/assets/icones/icone_Passeport_Documents.png",
        pricing_options: [
            { label: "Dossier passeport simple", price: "50.000 FCFA" },
            { label: "Pack gestion complète", price: "85.000 FCFA" },
            { label: "Pack urgence (délai accéléré)", price: "150.000 FCFA" },
        ]
    },
    logement: {
        title: "Acheter ou Louer",
        subtitle: "Acquisition, location et gestion de biens immobiliers au Bénin",
        description: "Notre équipe vous accompagne dans la recherche et l'acquisition de biens immobiliers adaptés à votre projet. Résidence principale, investissement locatif ou local commercial — nous vous offrons un accompagnement juridique et technique complet, avec vérification des titres fonciers.",
        features: [
            "Recherche de biens sur mesure",
            "Visites accompagnées (vidéo disponible à distance)",
            "Vérification et audit des titres fonciers",
            "Conseil juridique immobilier",
            "Négociation et finalisation des transactions",
            "Gestion locative en votre absence",
        ],
        price: "À partir de 75.000 FCFA",
        color: "#FCD116",
        icon_type: "tata",
        image_url: "/assets/icones/icone_Acheter_ou_louer.png",
        pricing_options: [
            { label: "Recherche & location meublée", price: "75.000 FCFA" },
            { label: "Acquisition terrain ou maison", price: "250.000 FCFA" },
            { label: "Audit juridique titre foncier", price: "100.000 FCFA" },
        ]
    },
    business: {
        title: "Création d'Entreprise",
        subtitle: "Création, immatriculation et développement commercial au Bénin",
        description: "Nous facilitons l'implantation économique des entrepreneurs de la diaspora au Bénin. De la création juridique de votre structure à l'ouverture de votre compte bancaire professionnel, en passant par les démarches fiscales, notre équipe vous accompagne à chaque étape.",
        features: [
            "Création SARL, SA, SASU ou association",
            "Immatriculation RCCM (Registre du Commerce)",
            "Ouverture compte bancaire professionnel",
            "Conseil fiscal et juridique",
            "Domiciliation d'entreprise à Cotonou",
            "Réseau de partenaires locaux de confiance",
        ],
        price: "À partir de 150.000 FCFA",
        color: "#E8112D",
        icon_type: "drum",
        image_url: "/assets/icones/icone_Creation_d_Entreprise.png",
        pricing_options: [
            { label: "Création d'entreprise simple", price: "150.000 FCFA" },
            { label: "Pack Business (banque + siège)", price: "350.000 FCFA" },
            { label: "Accompagnement stratégique", price: "500.000 FCFA" },
        ]
    },
    culture: {
        title: "Tourisme & Culture",
        subtitle: "Séjours culturels, visites patrimoniales et circuits au Bénin",
        description: "Explorez le Bénin à travers des séjours soigneusement organisés : Ouidah et la Route de l'Esclave, Abomey et ses palais royaux, les marchés de Cotonou, les parcs naturels du Nord. Chaque circuit est adapté à vos attentes et accompagné par des guides expérimentés.",
        features: [
            "Circuits personnalisés selon vos centres d'intérêt",
            "Hébergement sélectionné",
            "Guides culturels certifiés",
            "Visites de sites classés (Ouidah, Abomey, Ganvié)",
            "Ateliers artisanaux et rencontres communautaires",
            "Transfert aéroport et logistique sur place",
        ],
        price: "À partir de 100.000 FCFA",
        color: "#008751",
        icon_type: "cowrie",
        image_url: "/assets/icones/icone_Guide_culturel.png",
        pricing_options: [
            { label: "Journée circuit patrimonial", price: "100.000 FCFA" },
            { label: "Week-end découverte", price: "250.000 FCFA" },
            { label: "Séjour 7 jours tout compris", price: "1.200.000 FCFA" },
        ]
    },
    construction: {
        title: "Construction & Rénovation",
        subtitle: "Maîtrise d'ouvrage déléguée et suivi de chantier au Bénin",
        description: "Confiez la construction ou la rénovation de votre bien à notre équipe de maîtrise d'ouvrage déléguée. Nous sélectionnons les artisans et entreprises locaux qualifiés, supervisons l'avancement des travaux et vous rendons compte régulièrement, où que vous soyez dans le monde.",
        features: [
            "Conception architecturale et plans 3D",
            "Sélection et coordination des prestataires",
            "Suivi de chantier avec rapports réguliers",
            "Achats matériaux au meilleur rapport qualité-prix",
            "Contrôle qualité et respect des délais",
            "Livraison clé en main",
        ],
        price: "Sur Devis",
        color: "#FCD116",
        icon_type: "assin",
        image_url: "/assets/icones/icone_Construction.png",
        pricing_options: [
            { label: "Suivi de chantier (mensuel)", price: "150.000 FCFA" },
            { label: "Étude architecturale 3D", price: "300.000 FCFA" },
            { label: "Gestion projet clé en main", price: "Sur Devis" },
        ]
    },
    investissement: {
        title: "Investissement & Patrimoine",
        subtitle: "Stratégies d'investissement immobilier et patrimonial au Bénin",
        description: "Structurez votre patrimoine au Bénin avec le conseil de nos experts en investissement. Nous identifions les opportunités à fort potentiel, évaluons la rentabilité et gérons vos actifs dans la durée. Une approche rigoureuse pour sécuriser et valoriser votre capital.",
        features: [
            "Analyse rendement locatif et rentabilité",
            "Sourcing d'opportunités foncières et immobilières",
            "Diversification patrimoniale",
            "Due diligence et audit de risque",
            "Accompagnement fiscal sur les revenus locaux",
            "Reporting investisseur régulier",
        ],
        price: "Consultation gratuite",
        color: "#E8112D",
        icon_type: "tree",
        image_url: "/assets/icones/icone_Investissement.png",
        pricing_options: [
            { label: "Consultation initiale", price: "Gratuit" },
            { label: "Étude d'opportunité", price: "200.000 FCFA" },
            { label: "Accompagnement deal flow", price: "Commission" },
        ]
    },
};

import { createClient } from '@supabase/supabase-js';

// ... other imports stay the same ...

export default function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { t } = useTranslation();
    const { slug } = use(params);
    const [service, setService] = useState(FALLBACK_SERVICES[slug] || null);

    useEffect(() => {
        const fetchService = async () => {
            if (!slug) return;

            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

                if (supabaseUrl && supabaseKey) {
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    const { data, error } = await supabase
                        .from('services')
                        .select('*')
                        .eq('slug', slug);

                    if (!error && data && data.length > 0) {
                        const db = data[0];
                        const fallback = FALLBACK_SERVICES[slug];

                        // DB fields take priority; fallback only fills what's missing
                        setService({
                            title: db.title || fallback?.title || '',
                            subtitle: db.subtitle || fallback?.subtitle || '',
                            description: db.description || fallback?.description || '',
                            features: (db.features?.length ? db.features : null) ?? fallback?.features ?? ['Analyse experte', 'Suivi personnalisé'],
                            price: db.price_display || fallback?.price || 'Nous consulter',
                            color: db.color || fallback?.color || '#008751',
                            icon_type: db.icon_type || fallback?.icon_type || 'passport',
                            image_url: db.image_url || fallback?.image_url || '',
                            pricing_options: (db.pricing_options?.length ? db.pricing_options : null) ?? fallback?.pricing_options ?? [{ label: 'Standard', price: 'Nous consulter' }],
                        });
                        return;
                    }
                }
            } catch {
                console.log("Using fallback content (Supabase not ready or empty for this service)");
            }

            // Fallback if Supabase fails
            if (FALLBACK_SERVICES[slug]) {
                setService(FALLBACK_SERVICES[slug]);
            }
        };

        fetchService();
    }, [slug]);

    const [showIntro, setShowIntro] = useState(slug === 'passeport');

    if (!service) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><T>Chargement...</T></div>;
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
    );
}
