'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Dimensions, Platform, RefreshControl, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { supabase } from '../../config/supabase'

const { width } = Dimensions.get('window')
const CARD_GAP = 14
const CARD_W = (width - spacing.lg * 2 - CARD_GAP) / 2

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServiceFull {
    id: string
    icon: keyof typeof Ionicons.glyphMap
    title: string
    desc: string           // court (carte grid)
    fullDescription: string
    duration: string
    price: string
    documents: string[]
    features: string[]
    color: string
}

// ─── 9 Services complets ──────────────────────────────────────────────────────

export const SERVICES_DATA: ServiceFull[] = [
    {
        id: 'nationalite-vip',
        icon: 'ribbon-outline',
        title: 'Nationalité Béninoise VIP',
        desc: 'Accompagnement premium de A à Z pour obtenir la nationalité béninoise.',
        fullDescription: 'Obtenez votre nationalité béninoise avec un accompagnement complet par nos experts juridiques et administratifs. Nous gérons l\'intégralité des démarches en votre nom, de la constitution du dossier jusqu\'à la remise officielle du décret de naturalisation.',
        duration: '3 à 6 mois',
        price: 'À partir de 150 000 FCFA',
        color: colors.gold,
        features: [
            'Consultation juridique personnalisée',
            'Constitution et vérification du dossier complet',
            'Dépôt et suivi auprès des autorités compétentes',
            'Accompagnement jusqu\'au décret officiel',
            'Traduction et légalisation des documents',
            'Suivi en temps réel via l\'application',
        ],
        documents: [
            'Acte de naissance + apostille (moins de 6 mois)',
            'Passeport en cours de validité (toutes pages)',
            'Justificatif de résidence au Bénin (3 mois min)',
            'Casier judiciaire du pays de résidence (moins de 3 mois)',
            'Preuve de lien ancestral ou appartenance à la diaspora',
            'Photos d\'identité récentes (fond blanc, norme ICAO)',
            'Formulaire de demande de nationalité rempli',
            'Certificat médical (si requis)',
        ],
    },
    {
        id: 'recherche-ancestrale',
        icon: 'search-circle-outline',
        title: 'Recherche Ancestrale',
        desc: 'Retrouvez vos origines et construisez votre arbre généalogique certifié.',
        fullDescription: 'Nos spécialistes en archives historiques, généalogie et tests ADN retrouvent la trace de vos ancêtres béninois. Vous recevez un rapport détaillé avec votre arbre généalogique certifié, accompagné d\'une carte de votre territoire ancestral.',
        duration: '4 à 10 semaines',
        price: 'À partir de 75 000 FCFA',
        color: '#7C5CCA',
        features: [
            'Recherche dans les archives nationales et religieuses',
            'Reconstruction de l\'arbre généalogique certifié',
            'Localisation de votre village / clan d\'origine',
            'Rapport historique illustré (format PDF + impression)',
            'Cérémonie de retour aux sources (option)',
            'Test ADN avec analyse diaspora (option)',
        ],
        documents: [
            'Informations sur les ancêtres connus (noms, lieux, dates)',
            'Documents familiaux disponibles (photos, lettres, actes)',
            'Nom de jeune fille des grands-mères maternelles',
            'Pays ou région d\'origine présumée',
            'Résultats de test ADN si déjà effectué (optionnel)',
        ],
    },
    {
        id: 'passeport',
        icon: 'document-text-outline',
        title: 'Passeport & Docs Officiels',
        desc: 'Passeport biométrique, actes d\'état civil, apostille et documents officiels.',
        fullDescription: 'Obtenez rapidement votre passeport biométrique béninois, vos actes d\'état civil, actes de naissance, extrait de naissance, apostilles et tout document officiel auprès des autorités compétentes. Service express disponible.',
        duration: '2 à 4 semaines',
        price: 'Selon le document',
        color: '#3B82C4',
        features: [
            'Passeport biométrique (ordinaire ou diplomatique)',
            'Acte de naissance et extrait certifié',
            'Légalisation et apostille de documents',
            'Acte de mariage, de décès, de divorce',
            'Certificat de nationalité',
            'Service express disponible (+50%)',
        ],
        documents: [
            'Acte de naissance original ou extrait certifié',
            'Justificatif de nationalité béninoise',
            'Photos d\'identité (fond blanc, 35x45 mm, norme ICAO)',
            'Formulaire de demande rempli et signé',
            'Justificatif de domicile (facture eau/électricité)',
            'Ancien passeport si renouvellement',
        ],
    },
    {
        id: 'logement',
        icon: 'home-outline',
        title: 'Achat & Location Immobilier',
        desc: 'Sécurisation foncière, achat de villa, terrain ou appartement.',
        fullDescription: 'Sécurisez votre investissement immobilier au Bénin avec un accompagnement juridique, notarial et technique complet. De la recherche du bien à la signature de l\'acte authentique, nos experts fonciers vous protègent des arnaques et garantissent la légitimité de votre titre foncier.',
        duration: '4 à 12 semaines',
        price: 'Sur devis',
        color: '#2D9F63',
        features: [
            'Recherche et sélection de biens selon vos critères',
            'Vérification de la légitimité du titre foncier',
            'Accompagnement notarial et juridique',
            'Négociation du prix avec le vendeur',
            'Gestion locative à distance (option)',
            'Suivi des travaux de rénovation (option)',
        ],
        documents: [
            'Pièce d\'identité valide (passeport ou CNI)',
            'Justificatif de revenus ou preuve de fonds disponibles',
            'Lettre d\'intention d\'achat ou de location',
            'Budget précis et critères de recherche',
            'Relevé bancaire des 3 derniers mois',
            'Procuration notariée si achat par représentant',
        ],
    },
    {
        id: 'business',
        icon: 'briefcase-outline',
        title: "Création d'Entreprise",
        desc: 'Immatriculation RCCM, NIF, statuts et toutes les démarches légales.',
        fullDescription: 'Créez votre société au Bénin (SARL, SA, SAS, SURL) avec un accompagnement complet : rédaction des statuts, immatriculation au RCCM, obtention du NIF, ouverture de compte bancaire professionnel et toutes les autorisations sectorielles.',
        duration: '3 à 6 semaines',
        price: 'À partir de 60 000 FCFA',
        color: '#1B2A4A',
        features: [
            'Rédaction et enregistrement des statuts de société',
            'Immatriculation au Registre du Commerce (RCCM)',
            'Obtention du NIF et registre de commerce',
            'Ouverture de compte bancaire professionnel',
            'Démarches CNSS et impôts',
            'Conseils comptables et fiscaux (1 mois offert)',
        ],
        documents: [
            'Pièce d\'identité de tous les associés (passeport)',
            'Projet de statuts ou intentions (forme juridique, capital)',
            'Justificatif de siège social (bail ou titre de propriété)',
            'Capital social disponible (preuve de dépôt)',
            'Casier judiciaire des gérants (moins de 3 mois)',
            'Plan de localisation du siège social',
        ],
    },
    {
        id: 'culture',
        icon: 'map-outline',
        title: 'Tourisme & Circuits Culturels',
        desc: 'Circuits guidés : Abomey, Ouidah, Ganvié, sites classés UNESCO.',
        fullDescription: 'Vivez le Bénin de manière authentique avec nos circuits exclusifs : Palais Royaux d\'Abomey (UNESCO), Route des Esclaves à Ouidah, Cité lacustre de Ganvié, Forêt Sacrée de Kpassè, Pendjari. Guides francophones certifiés, véhicules climatisés et hébergements premium.',
        duration: 'De 1 à 14 jours',
        price: 'À partir de 25 000 FCFA/jour',
        color: '#E07B54',
        features: [
            'Guides certifiés bilingues (français/anglais)',
            'Véhicules climatisés avec chauffeur',
            'Hébergement sélectionné (hôtels ou lodges)',
            'Repas gastronomiques béninois inclus',
            'Visites culturelles et cérémonies traditionnelles',
            'Circuit personnalisé selon vos intérêts',
        ],
        documents: [
            'Passeport valide (6 mois de validité minimum)',
            'Visa Bénin si nécessaire (selon nationalité)',
            'Assurance voyage internationale',
            'Réservation vol confirmée (optionnel pour devis)',
            'Vaccins à jour (carnet de vaccination)',
        ],
    },
    {
        id: 'construction',
        icon: 'hammer-outline',
        title: 'Suivi de Chantier',
        desc: 'Contrôle des travaux à distance, coordination et reportings réguliers.',
        fullDescription: 'Faites construire ou rénover depuis l\'étranger en toute sérénité. Nos techniciens qualifiés (architectes, ingénieurs) contrôlent la qualité des travaux, coordonnent les artisans locaux et vous transmettent des reportings photos/vidéos hebdomadaires.',
        duration: 'Selon durée des travaux',
        price: 'Sur devis mensuel',
        color: colors.warning,
        features: [
            'Visites hebdomadaires du chantier',
            'Reporting photos/vidéos chaque semaine',
            'Vérification de la qualité des matériaux',
            'Coordination avec architecte et maîtrise d\'ouvrage',
            'Gestion des paiements aux artisans',
            'Réception finale et levée des réserves',
        ],
        documents: [
            'Plan architectural approuvé (fichier PDF/DWG)',
            'Titre foncier ou contrat de bail du terrain',
            'Budget détaillé des travaux',
            'Coordonnées de l\'entrepreneur principal (si déjà choisi)',
            'Permis de construire (si disponible)',
        ],
    },
    {
        id: 'investissement',
        icon: 'trending-up-outline',
        title: 'Investissement & Partenariats',
        desc: 'Opportunités en agriculture, immobilier, startup et agro-industrie.',
        fullDescription: 'Identifiez et sécurisez les meilleures opportunités d\'investissement au Bénin : agro-industrie, immobilier commercial, startups numériques, énergies renouvelables. Nous mettons en relation investisseurs diaspora et entrepreneurs locaux vérifiés.',
        duration: 'Accompagnement continu',
        price: 'Sur devis',
        color: '#0F766E',
        features: [
            'Audit et sélection des projets d\'investissement',
            'Mise en relation avec des entrepreneurs locaux vérifiés',
            'Accompagnement juridique et fiscal',
            'Structuration des montages financiers',
            'Reporting trimestriel sur vos investissements',
            'Gestion déléguée des participations (option)',
        ],
        documents: [
            'Lettre d\'intention d\'investissement',
            'Budget disponible estimatif',
            'Secteur(s) d\'intérêt ciblé(s)',
            'Pièce d\'identité (passeport)',
            'Justificatif de domicile fiscal dans le pays de résidence',
        ],
    },
    {
        id: 'autres',
        icon: 'apps-outline',
        title: 'Services à la Carte',
        desc: 'Transport VIP, santé, scolarité, procurations et services personnalisés.',
        fullDescription: 'Une gamme complète de services à la demande : transfert aéroport, transport VIP, prise en charge médicale, inscription scolaire de vos enfants, gestion de procurations, envoi et réception de colis, assistance lors de cérémonies familiales.',
        duration: 'Selon la demande',
        price: 'Sur devis',
        color: colors.textSecondary,
        features: [
            'Transport aéroport et déplacements VIP',
            'Assistance médicale et prise en charge hospitalière',
            'Inscription scolaire et suivi académique des enfants',
            'Gestion de procurations notariées',
            'Envoi et réception de colis sécurisés',
            'Assistance lors de cérémonies et événements familiaux',
        ],
        documents: [
            'Pièce d\'identité',
            'Documents spécifiques selon le service demandé',
            'Contacter notre équipe pour plus de détails',
        ],
    },
]

// ─── Mapping slug → service ───────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServicesScreen({ navigation }: any) {
    const [services, setServices] = useState<ServiceFull[]>(SERVICES_DATA)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchServices = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('id, title, slug, subtitle, description, color, icon_type, is_active, order_index')
                .eq('is_active', true)
                .order('order_index', { ascending: true })

            if (!error && data && data.length > 0) {
                // Fusionner les données DB avec les données statiques enrichies
                const mapped: ServiceFull[] = data.map((s: Record<string, string>) => {
                    const staticMatch = SERVICES_DATA.find(sd =>
                        sd.id === s.slug ||
                        s.slug?.includes(sd.id.split('-')[0]) ||
                        sd.id.includes((s.slug || '').split('-')[0])
                    )
                    return {
                        id: s.slug || s.id,
                        icon: getIconForSlug(s.slug || '', s.icon_type),
                        title: s.title,
                        desc: s.subtitle || s.description || staticMatch?.desc || '',
                        fullDescription: s.description || staticMatch?.fullDescription || s.subtitle || '',
                        duration: staticMatch?.duration || '4–8 semaines',
                        price: staticMatch?.price || 'Sur devis',
                        documents: staticMatch?.documents || ['Pièce d\'identité valide', 'Documents selon le service'],
                        features: staticMatch?.features || ['Consultation personnalisée', 'Accompagnement complet', 'Suivi en temps réel'],
                        color: s.color || staticMatch?.color || colors.gold,
                    }
                })
                setServices(mapped)
            }
        } catch { /* garder SERVICES_DATA */ } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchServices() }, [fetchServices])
    const onRefresh = async () => { setRefreshing(true); await fetchServices(); setRefreshing(false) }

    const handlePress = (svc: ServiceFull) => {
        navigation.navigate('ServiceDetails', {
            serviceId: svc.id,
            title: svc.title,
            desc: svc.desc,
            fullDescription: svc.fullDescription,
            duration: svc.duration,
            price: svc.price,
            documents: svc.documents,
            features: svc.features,
            color: svc.color,
            icon: svc.icon,
        })
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.goldLine} />
                <View style={styles.headerContent}>
                    <View style={styles.ornament}>
                        <View style={styles.ornamentLine} />
                        <View style={styles.ornamentDot} />
                        <View style={styles.ornamentLine} />
                    </View>
                    <Text style={styles.headerTitle}>Nos Services</Text>
                    <Text style={styles.headerSub}>
                        Des solutions complètes et sur-mesure pour votre retour au Bénin.
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.gold} size="large" />
                </View>
            ) : (
                <View style={styles.grid}>
                    {services.map((svc) => (
                        <TouchableOpacity
                            key={svc.id}
                            style={styles.card}
                            activeOpacity={0.82}
                            onPress={() => handlePress(svc)}
                        >
                            <View style={[styles.cardTopBar, { backgroundColor: svc.color }]} />
                            <View style={styles.cardInner}>
                                <View style={[styles.cardIconWrap, { borderColor: svc.color + '22' }]}>
                                    <Ionicons name={svc.icon} size={28} color={svc.color} />
                                </View>
                                <Text style={styles.cardTitle} numberOfLines={2}>{svc.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={3}>{svc.desc}</Text>

                                {/* Badges durée + prix */}
                                <View style={styles.cardMeta}>
                                    <View style={[styles.metaBadge, { backgroundColor: svc.color + '12' }]}>
                                        <Ionicons name="time-outline" size={9} color={svc.color} />
                                        <Text style={[styles.metaText, { color: svc.color }]} numberOfLines={1}>{svc.duration}</Text>
                                    </View>
                                </View>

                                <View style={[styles.cardFooter, { backgroundColor: svc.color + '10' }]}>
                                    <Text style={[styles.cardActionText, { color: svc.color }]}>Découvrir</Text>
                                    <Ionicons name="arrow-forward" size={11} color={svc.color} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Bandeau VIP */}
            {!loading && (
                <TouchableOpacity
                    style={styles.vipBanner}
                    activeOpacity={0.88}
                    onPress={() => handlePress(services[0])}
                >
                    <View style={styles.vipBannerLeft}>
                        <View style={styles.vipBadge}>
                            <Ionicons name="star" size={10} color={colors.gold} />
                            <Text style={styles.vipBadgeText}>LE PLUS POPULAIRE</Text>
                        </View>
                        <Text style={styles.vipTitle}>Nationalité Béninoise VIP</Text>
                        <Text style={styles.vipDesc}>
                            Accompagnement complet de A à Z · {services[0]?.price}
                        </Text>
                    </View>
                    <View style={styles.vipArrow}>
                        <Ionicons name="arrow-forward" size={20} color={colors.gold} />
                    </View>
                </TouchableOpacity>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: spacing.xl },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 28,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    headerContent: { alignItems: 'center', paddingTop: 8 },
    ornament: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    ornamentLine: { flex: 1, height: 1, backgroundColor: colors.gold + '40', maxWidth: 40 },
    ornamentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
    headerTitle: { ...typography.h1, color: colors.textOnDark, textAlign: 'center' },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 6, textAlign: 'center', lineHeight: 20 },

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
        width: 48, height: 48, borderRadius: 12,
        borderWidth: 1, backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
    },
    cardTitle: { ...typography.label, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
    cardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 17, fontSize: 11 },
    cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
    metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    metaText: { fontSize: 9, fontFamily: 'Inter_600SemiBold', maxWidth: 80 },
    cardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 8, borderRadius: 8, marginTop: 6,
    },
    cardActionText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

    vipBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: spacing.lg, marginTop: spacing.lg,
        backgroundColor: colors.navy,
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.gold + '30',
        ...shadows.md,
    },
    vipBannerLeft: { flex: 1, gap: 6 },
    vipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.gold + '20', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    },
    vipBadgeText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold', color: colors.gold, letterSpacing: 0.8 },
    vipTitle: { ...typography.h3, color: colors.textOnDark, fontSize: 16 },
    vipDesc: { ...typography.caption, color: colors.gold + 'BB', lineHeight: 18 },
    vipArrow: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.gold + '20',
        alignItems: 'center', justifyContent: 'center',
    },
})
