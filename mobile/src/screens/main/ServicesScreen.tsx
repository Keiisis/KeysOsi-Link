'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet,
    Dimensions, Platform, RefreshControl, ActivityIndicator,
} from 'react-native'
import { ArrowRight, Star, Tag, Sparkles } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
    Easing,
} from 'react-native-reanimated'
import ScreenHeader from '../../components/ScreenHeader'
import PressableCard from '../../components/PressableCard'
import { SkeletonCard } from '../../components/Skeleton'
import { colors, royal, spacing, radius, shadows, typography, fonts, motion } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { supabase } from '../../config/supabase'

const { width } = Dimensions.get('window')
const CARD_GAP = 14
const CARD_W = (width - spacing.lg * 2 - CARD_GAP) / 2

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PricingOption {
    label: string
    price: string
}

export interface ServiceFull {
    id: string
    icon: keyof typeof Ionicons.glyphMap
    title: string
    subtitle: string          // sous-titre du site web
    desc: string              // court (carte grid)
    fullDescription: string   // description complète
    duration: string
    price: string
    documents: string[]
    features: string[]
    pricing_options: PricingOption[]
    color: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONNÉES SYNCHRONISÉES AVEC LE SITE WEB (frontend/app/(routes)/services/[slug]/page.tsx)
// Chaque titre, description, feature, document et prix est IDENTIQUE au site.
// ═══════════════════════════════════════════════════════════════════════════════

export const SERVICES_DATA: ServiceFull[] = [
    {
        id: 'passeport',
        icon: 'document-text-outline',
        title: 'Passeport & Documents',
        subtitle: 'Documents officiels et accompagnement pour la diaspora béninoise',
        desc: 'Obtention et renouvellement de passeport, acte de naissance, légalisation et apostille — accompagnement complet pour vos démarches officielles.',
        fullDescription: "Nous prenons en charge l'ensemble des démarches liées à l'obtention ou au renouvellement de votre passeport biométrique béninois. Constitution du dossier, coordination avec les autorités compétentes et suivi jusqu'à la remise de votre titre — un accompagnement structuré, sans improvisation.",
        duration: '2 à 4 semaines',
        price: 'À partir de 50 000 FCFA',
        color: '#008751',
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
        documents: [
            "Copie intégrale du passeport en cours de validité",
            "Acte de naissance certifié conforme délivré par la mairie béninoise",
            "Certificat de nationalité béninoise (Tribunal de Première Instance)",
            "Carte d'Identité Personnelle (CIP A) en cours de validité",
            "Extrait de casier judiciaire béninois — Bulletin n°3 (moins de 3 mois)",
            "Justificatif de domicile de moins de 3 mois (quittance ou bail)",
            "4 photos d'identité biométriques (fond blanc, 3,5 × 4,5 cm, sans lunettes)",
            "Formulaire officiel de demande de passeport rempli et signé",
        ],
        pricing_options: [
            { label: 'Pack Standard — Passeport ordinaire', price: '75 000 FCFA' },
            { label: 'Pack VIP — Traitement express jour-J', price: '350 000 FCFA' },
            { label: 'Renouvellement accompagné', price: '50 000 FCFA' },
        ],
    },
    {
        id: 'logement',
        icon: 'home-outline',
        title: 'Acheter ou Louer',
        subtitle: 'Vérifiez, informez-vous et Sécurisez vos transactions foncières et immobilières',
        desc: 'Acquisition immobilière, location longue durée, sécurisation foncière et vérification juridique de vos biens au Bénin.',
        fullDescription: "L'immobilier au Bénin offre de réelles opportunités — à condition de savoir naviguer dans un marché foncier qui requiert vigilance et expertise juridique. Nous vous accompagnons de la sélection du bien à la signature de l'acte notarié, en veillant à chaque étape à la solidité juridique de votre acquisition.",
        duration: '4 à 12 semaines',
        price: 'À partir de 25 000 FCFA',
        color: '#FCD116',
        features: [
            "Vérification du Titre Foncier (TF) et purge des oppositions cadastrales",
            "Bornage et identification parcellaire auprès de l'ANDF",
            "Due diligence juridique sur la chaîne de propriété",
            "Accompagnement notarial et rédaction des actes de vente ou de bail",
            "Gestion locative et suivi des relations bailleurs-locataires",
            "Conseil en fiscalité immobilière (droits de mutation, impôts fonciers)",
        ],
        documents: [
            "Pièce d'identité valide (passeport ou CNI)",
            "Justificatif de revenus ou preuve de fonds disponibles",
            "Lettre d'intention d'achat ou de location",
            "Budget précis et critères de recherche",
        ],
        pricing_options: [
            { label: 'Accompagnement en Acquisition Foncière', price: '3% du montant' },
            { label: 'Gestion locative mensuelle', price: '8% des loyers' },
            { label: 'Consultation juridique', price: '25 000 FCFA' },
        ],
    },
    {
        id: 'business',
        icon: 'briefcase-outline',
        title: "Création d'Entreprise",
        subtitle: "Création et immatriculation d'entreprise au Bénin pour la diaspora.",
        desc: "Immatriculation RCCM, ouverture de compte professionnel, conseils fiscaux et accompagnement des formalités de création.",
        fullDescription: "Nous facilitons l'implantation économique des entrepreneurs de la diaspora au Bénin. De la création juridique de votre structure à l'ouverture de votre compte bancaire, en passant par les démarches fiscales, notre équipe vous accompagne à chaque étape.",
        duration: '3 à 6 semaines',
        price: 'À partir de 150 000 FCFA',
        color: '#008751',
        features: [
            "Création SARL / SA / SASU clé en main",
            "Immatriculation RCCM et formalités fiscales",
            "Ouverture de compte bancaire professionnel",
            "Domiciliation commerciale à Cotonou",
            "Cabinet de recrutement — sélection de talents locaux",
            "Mise en relation avec les acteurs économiques locaux",
        ],
        documents: [
            "Pièce d'identité de tous les associés (passeport)",
            "Projet de statuts ou intentions (forme juridique, capital)",
            "Justificatif de siège social (bail ou titre de propriété)",
            "Capital social disponible (preuve de dépôt)",
            "Casier judiciaire des gérants (moins de 3 mois)",
        ],
        pricing_options: [
            { label: 'Création SARL', price: '150 000 FCFA' },
            { label: 'Création SA', price: '250 000 FCFA' },
            { label: 'Accompagnement complet', price: 'Sur devis' },
        ],
    },
    {
        id: 'culture',
        icon: 'map-outline',
        title: 'Tourisme & Culture',
        subtitle: 'Reconnectez-vous avec vos racines. La richesse des Cauris.',
        desc: 'Circuits touristiques, visites patrimoniales, organisation de séjours et découverte du Bénin authentique.',
        fullDescription: "Le Bénin est l'un des berceaux les plus vivants de la culture africaine. Loin des circuits touristiques standardisés, nous vous proposons une immersion sincère dans les traditions, les savoirs et les rencontres qui font l'identité profonde de ce pays. Ici, la culture se vit, elle ne se contemple pas de loin.",
        duration: 'De 1 à 14 jours',
        price: 'À partir de 80 000 FCFA/pers',
        color: '#E8112D',
        features: [
            'Consultation du Fa — oracle traditionnel yoruba-fon',
            "Cérémonie du Nom et validation à l'état civil",
            'Soins par les plantes et approche de la médecine ancestrale',
            'Audience privée avec dignitaires et rois traditionnels',
            'Initiation et sensibilisation à la culture vodoun',
            'Programmes de visite : Ganvié, Ouidah, Abomey, Porto-Novo',
            "Guide historien expert et passionné par l'histoire du Bénin",
            'Ateliers culinaires — recettes et saveurs béninoises',
            "Découverte de l'artisanat local et des savoir-faire traditionnels",
        ],
        documents: [
            'Passeport valide (6 mois de validité minimum)',
            'Visa Bénin si nécessaire (selon nationalité)',
            'Assurance voyage internationale',
        ],
        pricing_options: [
            { label: 'Circuit culturel (3 jours)', price: '120 000 FCFA/pers' },
            { label: 'Immersion complète (7 jours)', price: '280 000 FCFA/pers' },
            { label: 'Programme sur mesure', price: 'Nous consulter' },
        ],
    },
    {
        id: 'construction',
        icon: 'hammer-outline',
        title: 'Suivi de Chantier',
        subtitle: 'Bâtissez pour la postérité. Votre chantier, géré avec rigueur.',
        desc: "Maîtrise d'ouvrage déléguée, contrôle des travaux et coordination des entreprises locales pour votre construction.",
        fullDescription: "Construire au Bénin depuis l'étranger, c'est possible — à condition d'être bien entouré. Entre les devis approximatifs, les délais non respectés et les matériaux de qualité variable, les risques sont réels. Nous agissons comme votre représentant sur place : présents à chaque étape, exigeants sur la qualité, transparents dans nos rapports. Votre investissement mérite un suivi professionnel.",
        duration: 'Selon durée des travaux',
        price: 'À partir de 50 000 FCFA',
        color: '#FCD116',
        features: [
            "Aide à l'achat et à la location de terrain ou de bien immobilier",
            "Bureau d'architecte — conception et plans techniques",
            'Surveillance et contrôle de chantier (visites régulières, tous moyens)',
            'Vérification et validation des factures fournisseurs',
            'Achats de matériaux — sélection et négociation',
            'Rapports WhatsApp hebdomadaires (photos et vidéos)',
            'Mise en relation et coordination des intervenants du chantier',
            'Livraison et nettoyage du chantier clé en main',
        ],
        documents: [
            'Plan architectural approuvé (fichier PDF/DWG)',
            'Titre foncier ou contrat de bail du terrain',
            'Budget détaillé des travaux',
            'Permis de construire (si disponible)',
        ],
        pricing_options: [
            { label: 'Suivi mensuel', price: '75 000 FCFA/mois' },
            { label: 'Mission complète', price: '5% du montant travaux' },
            { label: 'Audit ponctuel', price: '50 000 FCFA' },
        ],
    },
    {
        id: 'investissement',
        icon: 'trending-up-outline',
        title: 'Investissement',
        subtitle: "Opportunités d'affaires rentables. Faites fructifier votre héritage.",
        desc: "Identification d'opportunités d'affaires, partenariats locaux et accompagnement stratégique pour vos projets d'investissement au Bénin.",
        fullDescription: "Le Bénin connaît une dynamique économique réelle, portée par des réformes structurelles et des investissements publics soutenus. Les opportunités existent — dans l'immobilier, l'agriculture, le commerce et les services — mais elles demandent une lecture fine du terrain. Nous vous aidons à identifier des projets sérieux, à évaluer les risques réels et à structurer vos investissements dans le respect du cadre juridique local.",
        duration: 'Accompagnement continu',
        price: 'À partir de 50 000 FCFA',
        color: '#008751',
        features: [
            'Vente exclusive de particuliers à particuliers (terrain, immeuble, maison)',
            'Projets agricoles rentables et autres secteurs porteurs',
            'Évaluation approfondie des risques financiers, juridiques et opérationnels',
            "Veilles d'opportunités — marchés, appels d'offres, partenariats",
            'Suivi et optimisation de vos investissements au Bénin',
            'Stratégies fiscales adaptées au contexte local',
        ],
        documents: [
            "Lettre d'intention d'investissement",
            'Budget disponible estimatif',
            "Secteur(s) d'intérêt ciblé(s)",
            "Pièce d'identité (passeport)",
            'Justificatif de domicile fiscal dans le pays de résidence',
        ],
        pricing_options: [
            { label: 'Étude de marché', price: '200 000 FCFA' },
            { label: 'Accompagnement complet', price: 'Sur devis' },
            { label: 'Consultation stratégique', price: '50 000 FCFA' },
        ],
    },
    {
        id: 'nationalite-vip',
        icon: 'ribbon-outline',
        title: 'Nationalité VIP',
        subtitle: 'Obtenir la nationalité béninoise pour la diaspora afro-descendante',
        desc: "Accompagnement personnalisé pour l'obtention de la nationalité béninoise — dossier complet, suivi administratif et prise en charge prioritaire.",
        fullDescription: "Accompagnement personnalisé pour les membres de la diaspora souhaitant obtenir la nationalité béninoise. Suivi de dossier, coordination avec les autorités compétentes et prise en charge prioritaire.",
        duration: '3 à 6 mois',
        price: 'À partir de 150 000 FCFA',
        color: colors.primary,
        features: [
            'Constitution et vérification du dossier complet',
            'Liaison avec le Ministère de la Justice',
            'Suivi administratif pas à pas',
            "Accompagnement pour l'apostille et traductions certifiées",
            'Pack VIP : suivi prioritaire avec référent dédié',
        ],
        documents: [
            'Acte de naissance + apostille (moins de 6 mois)',
            'Passeport en cours de validité (toutes pages)',
            'Justificatif de résidence au Bénin (3 mois min)',
            'Casier judiciaire du pays de résidence (moins de 3 mois)',
            'Preuve de lien ancestral ou appartenance à la diaspora',
            "Photos d'identité récentes (fond blanc, norme ICAO)",
        ],
        pricing_options: [
            { label: 'Accompagnement dossier standard', price: '150 000 FCFA' },
            { label: 'Pack VIP — suivi prioritaire', price: '350 000 FCFA' },
            { label: 'Consultation initiale', price: 'Gratuit' },
        ],
    },
    {
        id: 'recherche-ancestrale',
        icon: 'search-circle-outline',
        title: 'Recherche Ancestrale',
        subtitle: "Retrouvez la trace de ceux que l'histoire a effacés",
        desc: 'Retrouvez la trace de vos ancêtres réduits en esclavage — archives, bases de données spécialisées et accompagnement généalogique pour reconstituer votre lignée africaine.',
        fullDescription: "Pour des millions de descendants de la diaspora africaine, une partie de l'arbre généalogique a été effacée par la traite transatlantique. Nous mobilisons archives, bases de données spécialisées et associations expertes pour reconstituer votre lignée africaine.",
        duration: '4 à 10 semaines',
        price: '250 €',
        color: '#FCD116',
        features: [
            "Extrait de naissance de vos deux parents (père et mère)",
            "Extrait de naissance ou de décès de vos grands-parents (côté paternel et maternel)",
            "Actes de mariage, notariés, militaires ou de décès des arrière-grands-parents",
            "Consultation d'archives officielles et bases de données diasporiques",
            "Partenariats avec associations spécialisées en généalogie afro-descendante",
        ],
        documents: [
            'Informations sur les ancêtres connus (noms, lieux, dates)',
            'Documents familiaux disponibles (photos, lettres, actes)',
            'Nom de jeune fille des grands-mères maternelles',
            "Pays ou région d'origine présumée",
            'Résultats de test ADN si déjà effectué (optionnel)',
        ],
        pricing_options: [
            { label: 'Recherche complète — archives, bases de données & associations', price: '250 €' },
        ],
    },
    {
        id: 'autres',
        icon: 'apps-outline',
        title: 'Autres Services',
        subtitle: 'Transport, santé, scolarité et démarches du quotidien',
        desc: 'Transport, santé, scolarité et démarches administratives — des solutions complémentaires pour faciliter votre installation au Bénin.',
        fullDescription: "Des solutions complémentaires pour faciliter chaque aspect de votre installation au Bénin — de l'aéroport à l'école de vos enfants, en passant par l'accès aux soins et les démarches administratives courantes.",
        duration: 'Selon la demande',
        price: 'Nous contacter',
        color: colors.textSecondary,
        features: [
            'Transfert aéroport et location de véhicule avec chauffeur',
            'Mise en relation avec médecins et cliniques partenaires',
            'Inscription scolaire et suivi pédagogique',
            'Accompagnement démarches administratives locales',
        ],
        documents: [
            "Pièce d'identité",
            'Documents spécifiques selon le service demandé',
            'Contacter notre équipe pour plus de détails',
        ],
        pricing_options: [
            { label: 'Consultation', price: 'Nous contacter' },
        ],
    },
]

// ─── Mapping slug → icon ──────────────────────────────────────────────────────

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    nationalite: 'ribbon-outline', nationalite_vip: 'ribbon-outline',
    ancestrale: 'search-circle-outline', recherche: 'search-circle-outline',
    passeport: 'document-text-outline',
    logement: 'home-outline', immobilier: 'home-outline',
    business: 'briefcase-outline', entreprise: 'briefcase-outline',
    culture: 'map-outline', tourisme: 'map-outline',
    construction: 'hammer-outline', chantier: 'hammer-outline',
    investissement: 'trending-up-outline',
    autres: 'apps-outline',
}

function getIconForSlug(slug: string, icon_type?: string): keyof typeof Ionicons.glyphMap {
    if (icon_type && ICON_MAP[icon_type]) return ICON_MAP[icon_type]
    const key = slug.toLowerCase().replace(/-/g, '_')
    for (const [k, v] of Object.entries(ICON_MAP)) {
        if (key.includes(k)) return v
    }
    return 'briefcase-outline'
}

// ─── Sub-component : ServiceCard avec animation stagger ──────────────────────

interface ServiceCardProps {
    svc: ServiceFull
    index: number
    onPress: () => void
    t: (s: string) => string
}

function ServiceCard({ svc, index, onPress, t }: ServiceCardProps) {
    const opacity = useSharedValue(0)
    const translateY = useSharedValue(24)

    useEffect(() => {
        opacity.value = withDelay(index * 60, withTiming(1, { duration: motion.slow, easing: Easing.out(Easing.cubic) }))
        translateY.value = withDelay(index * 60, withSpring(0, motion.spring.soft))
    }, [index, opacity, translateY])

    const animStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }))

    return (
        <Animated.View style={[{ width: CARD_W }, animStyle]}>
            <PressableCard
                haptic="light"
                onPress={onPress}
                accessibilityLabel={`${t(svc.title)} — ${t(svc.price)}`}
                style={styles.card}
            >
                <View style={[styles.cardTopBar, { backgroundColor: svc.color }]} />
                <View style={styles.cardInner}>
                    <View style={[styles.cardIconWrap, { borderColor: svc.color + '22', backgroundColor: svc.color + '10' }]}>
                        <Ionicons name={svc.icon} size={26} color={svc.color} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={2}>{t(svc.title)}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>{t(svc.desc)}</Text>

                    <View style={styles.cardMeta}>
                        <View style={[styles.metaBadge, { backgroundColor: svc.color + '12' }]}>
                            <Tag size={9} color={svc.color} strokeWidth={1.75} />
                            <Text style={[styles.metaText, { color: svc.color }]} numberOfLines={1}>{t(svc.price)}</Text>
                        </View>
                    </View>

                    <View style={[styles.cardFooter, { backgroundColor: svc.color + '10' }]}>
                        <Text style={[styles.cardActionText, { color: svc.color }]}>{t('En savoir plus')}</Text>
                        <ArrowRight size={11} color={svc.color} strokeWidth={1.75} />
                    </View>
                </View>
            </PressableCard>
        </Animated.View>
    )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServicesScreen({ navigation }: any) {
    const [services, setServices] = useState<ServiceFull[]>(SERVICES_DATA)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const { t, lang, isTranslating, preloadTexts } = useLang()

    const fetchServices = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('id, title, slug, subtitle, description, color, icon_type, is_active, order_index, price_display, features, pricing_options')
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (error) {
                console.warn('[Services] Supabase error, using static data:', error.message)
                setServices(SERVICES_DATA)
            } else if (data && data.length > 0) {
                // Fusionner les données DB avec les données statiques enrichies
                const mapped: ServiceFull[] = data.map((s: Record<string, any>) => {
                    const staticMatch = SERVICES_DATA.find(sd =>
                        sd.id === s.slug ||
                        s.slug?.includes(sd.id.split('-')[0]) ||
                        sd.id.includes((s.slug || '').split('-')[0])
                    )
                    return {
                        id: s.slug || s.id,
                        icon: getIconForSlug(s.slug || '', s.icon_type),
                        title: s.title || staticMatch?.title || '',
                        subtitle: s.subtitle || staticMatch?.subtitle || '',
                        desc: s.subtitle || s.description || staticMatch?.desc || '',
                        fullDescription: s.description || staticMatch?.fullDescription || '',
                        duration: staticMatch?.duration || '4–8 semaines',
                        price: s.price_display || staticMatch?.price || 'Sur devis',
                        documents: staticMatch?.documents || ["Pièce d'identité valide", 'Documents selon le service'],
                        features: (Array.isArray(s.features) && s.features.length > 0)
                            ? s.features
                            : (staticMatch?.features || ['Consultation personnalisée', 'Accompagnement complet']),
                        pricing_options: (Array.isArray(s.pricing_options) && s.pricing_options.length > 0)
                            ? s.pricing_options
                            : (staticMatch?.pricing_options || [{ label: 'Standard', price: 'Nous consulter' }]),
                        color: s.color || staticMatch?.color || colors.primary,
                    }
                })
                setServices(mapped)
            } else {
                // Table vide — utiliser les données statiques
                console.warn('[Services] No data from Supabase, using static data')
                setServices(SERVICES_DATA)
            }
        } catch (e: any) {
            console.warn('[Services] Fetch failed, using static data:', e?.message)
            setServices(SERVICES_DATA)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchServices() }, [fetchServices])
    const onRefresh = async () => { setRefreshing(true); await fetchServices(); setRefreshing(false) }

    // ── Pré-charger les textes visibles sur la grille (titres, desc, prix, UI) ──
    useEffect(() => {
        if (loading || lang === 'fr') return
        const textsToPreload: string[] = []
        for (const svc of services) {
            if (svc.title) textsToPreload.push(svc.title)
            if (svc.desc) textsToPreload.push(svc.desc)
            if (svc.price) textsToPreload.push(svc.price)
        }
        // UI strings visible on this screen
        textsToPreload.push(
            'Nos Services',
            'Des solutions complètes et sur-mesure pour votre retour au Bénin.',
            'En savoir plus',
            'LE PLUS POPULAIRE',
            'Nationalité Béninoise VIP',
            'Accompagnement complet de A à Z · À partir de 150 000 FCFA',
        )
        console.log(`[Services] Pre-loading ${textsToPreload.length} grid-visible texts`)
        preloadTexts(textsToPreload)
    }, [loading, services, lang, preloadTexts])

    // ── Pass RAW (untranslated) data to ServiceDetails ──
    // ServiceDetailsScreen will call t() itself so translations update dynamically
    const handlePress = (svc: ServiceFull) => {
        navigation.navigate('ServiceDetails', {
            serviceId: svc.id,
            title: svc.title,
            subtitle: svc.subtitle,
            desc: svc.desc,
            fullDescription: svc.fullDescription,
            duration: svc.duration,
            price: svc.price,
            documents: svc.documents,
            features: svc.features,
            pricing_options: svc.pricing_options,
            color: svc.color,
            icon: svc.icon,
        })
    }

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
        <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            <ScreenHeader
                title={t('Nos Services')}
                subtitle={t('Des solutions complètes et sur-mesure pour votre retour au Bénin.')}
            />

            {/* Indicateur de traduction en cours */}
            {isTranslating && lang !== 'fr' && (
                <View style={styles.translatingBanner}>
                    <ActivityIndicator color={colors.primary} size="small" />
                    <Text style={styles.translatingText}>{t('Traduction en cours...')}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.grid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <SkeletonCard key={i} style={{ width: CARD_W, height: 200 }} />
                    ))}
                </View>
            ) : (
                <View style={styles.grid}>
                    {services.map((svc, idx) => (
                        <ServiceCard
                            key={svc.id}
                            svc={svc}
                            index={idx}
                            onPress={() => handlePress(svc)}
                            t={t}
                        />
                    ))}
                </View>
            )}

            {/* Bandeau VIP — gradient gold premium */}
            {!loading && (
                <PressableCard
                    haptic="medium"
                    onPress={() => handlePress(services.find(s => s.id === 'nationalite-vip') || services[0])}
                    accessibilityLabel={t('Nationalité Béninoise VIP — Le plus populaire')}
                    style={styles.vipBanner}
                >
                    <LinearGradient
                        colors={['#A68B3C', colors.gold, '#E2C97E']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.vipShine} />

                    <View style={styles.vipBannerLeft}>
                        <View style={styles.vipBadge}>
                            <Star size={11} color="#FFFFFF" fill="#FFFFFF" strokeWidth={1.5} />
                            <Text style={styles.vipBadgeText}>{t('LE PLUS POPULAIRE')}</Text>
                        </View>
                        <Text style={styles.vipTitle}>{t('Nationalité Béninoise VIP')}</Text>
                        <Text style={styles.vipDesc}>
                            {t('Accompagnement complet de A à Z · À partir de 150 000 FCFA')}
                        </Text>
                    </View>
                    <View style={styles.vipArrow}>
                        <ArrowRight size={22} color={colors.goldDark} strokeWidth={2.5} />
                    </View>
                </PressableCard>
            )}

            <View style={{ height: 100 }} />
            </ScrollView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: spacing.xl },



    loadingWrap: { paddingTop: 60, alignItems: 'center' },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_W,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    cardTopBar: { height: 4 },
    cardInner: { padding: 14, gap: 6 },
    cardIconWrap: {
        width: 48, height: 48, borderRadius: radius.md,
        borderWidth: 1, backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    cardTitle: { ...typography.label, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
    cardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, fontSize: 11 },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    metaText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', maxWidth: 100 },
    cardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 8, borderRadius: radius.sm, marginTop: 6,
    },
    cardActionText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

    vipBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: spacing.lg, marginTop: spacing.lg,
        borderRadius: radius.xl, padding: spacing.lg,
        overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderGold,
        ...shadows.gold,
    },
    vipShine: {
        position: 'absolute',
        top: -40, right: -40,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },
    vipBannerLeft: { flex: 1, gap: 6 },
    vipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.30)',
        borderRadius: 999,
        paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.45)',
    },
    vipBadgeText: {
        fontSize: 9, fontFamily: fonts.bodyBold,
        color: '#FFFFFF', letterSpacing: 1.2,
    },
    vipTitle: {
        fontFamily: fonts.heading, fontSize: 18,
        color: '#FFFFFF', letterSpacing: 0.3,
    },
    vipDesc: {
        ...typography.caption,
        color: 'rgba(255, 255, 255, 0.92)',
        lineHeight: 18,
    },
    vipArrow: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.sm,
    },

    translatingBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 8,
        backgroundColor: colors.primaryMuted,
        marginHorizontal: spacing.lg, marginTop: spacing.sm,
        borderRadius: radius.sm,
    },
    translatingText: {
        ...typography.caption, color: colors.primary, fontSize: 11,
    },
})
