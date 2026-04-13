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

/* ── Type ── */
interface ServiceItem {
    id: string
    icon: keyof typeof Ionicons.glyphMap
    title: string
    desc: string
    color: string
}

/* ── Services statiques (fallback si Supabase vide) ── */
const SERVICES_FALLBACK: ServiceItem[] = [
    { id: 'nationalite-vip',      icon: 'ribbon-outline'          as const, title: 'Nationalité VIP',         desc: 'Accompagnement premium de A à Z pour obtenir la nationalité béninoise.',     color: colors.gold },
    { id: 'recherche-ancestrale', icon: 'search-circle-outline'   as const, title: 'Recherche Ancestrale',    desc: 'Retrouvez la trace de vos ancêtres et construisez votre arbre généalogique.', color: '#7C5CCA' },
    { id: 'passeport',            icon: 'document-text-outline'   as const, title: 'Passeport & Docs',        desc: 'Passeport biométrique, actes d\'état civil, apostille.',                      color: '#3B82C4' },
    { id: 'logement',             icon: 'home-outline'            as const, title: 'Acheter ou Louer',        desc: 'Immobilier, sécurisation foncière et accompagnement juridique.',              color: '#2D9F63' },
    { id: 'business',             icon: 'briefcase-outline'       as const, title: "Création d'Entreprise",  desc: 'Immatriculation, conseil fiscal et démarches administratives.',                color: '#1B2A4A' },
    { id: 'culture',              icon: 'map-outline'             as const, title: 'Tourisme & Culture',      desc: 'Circuits culturels, visites de sites historiques et ancestraux.',             color: '#E07B54' },
    { id: 'construction',         icon: 'hammer-outline'          as const, title: 'Suivi de Chantier',       desc: 'Contrôle des travaux, coordination locale et reportings réguliers.',          color: colors.warning },
    { id: 'investissement',       icon: 'trending-up-outline'     as const, title: 'Investissement',          desc: 'Opportunités d\'investissement et partenariats au Bénin.',                    color: '#0F766E' },
    { id: 'autres',               icon: 'apps-outline'            as const, title: 'Autres Services',         desc: 'Transport, santé, scolarité et services à la carte.',                        color: colors.textSecondary },
]

/* Mapping slug → icône Ionicons */
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
    nationalite:   'ribbon-outline',
    nationalite_vip: 'ribbon-outline',
    ancestrale:    'search-circle-outline',
    passeport:     'document-text-outline',
    logement:      'home-outline',
    immobilier:    'home-outline',
    business:      'briefcase-outline',
    entreprise:    'briefcase-outline',
    culture:       'map-outline',
    tourisme:      'map-outline',
    construction:  'hammer-outline',
    chantier:      'hammer-outline',
    investissement:'trending-up-outline',
    autres:        'apps-outline',
}

function getIconForService(slug: string, icon_type?: string): keyof typeof Ionicons.glyphMap {
    if (icon_type && ICON_MAP[icon_type]) return ICON_MAP[icon_type]
    const key = slug.toLowerCase().replace(/-/g, '_')
    for (const [k, v] of Object.entries(ICON_MAP)) {
        if (key.includes(k)) return v
    }
    return 'briefcase-outline'
}

/* ═══════════════════════════════════════════════════════════
   Services Screen — Chargement Supabase + fallback statique
═══════════════════════════════════════════════════════════ */

export default function ServicesScreen({ navigation }: any) {
    const [services, setServices] = useState<ServiceItem[]>(SERVICES_FALLBACK)
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
                const mapped = data.map(s => ({
                    id: s.slug || s.id,
                    icon: getIconForService(s.slug || '', s.icon_type),
                    title: s.title,
                    desc: s.subtitle || s.description || '',
                    color: s.color || colors.gold,
                }))
                setServices(mapped)
            }
            // Si erreur ou vide → garder les fallbacks
        } catch { /* garder les fallbacks */ } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchServices() }, [fetchServices])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchServices()
        setRefreshing(false)
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
                        Des solutions complètes et sur-mesure pour votre installation au Bénin.
                    </Text>
                </View>
            </View>

            {/* Loading */}
            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.gold} size="large" />
                </View>
            ) : (
                /* Grid 2 colonnes */
                <View style={styles.grid}>
                    {services.map((svc) => (
                        <TouchableOpacity
                            key={svc.id}
                            style={styles.card}
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('ServiceDetails', {
                                serviceId: svc.id,
                                title: svc.title,
                                desc: svc.desc,
                                color: svc.color,
                                icon: svc.icon,
                            })}
                        >
                            {/* Barre colorée top */}
                            <View style={[styles.cardTopBar, { backgroundColor: svc.color }]} />

                            <View style={styles.cardInner}>
                                {/* Icône */}
                                <View style={[styles.cardIconWrap, { borderColor: svc.color + '20' }]}>
                                    <Ionicons name={svc.icon} size={30} color={svc.color} />
                                </View>

                                <Text style={styles.cardTitle} numberOfLines={2}>{svc.title}</Text>
                                <Text style={styles.cardDesc} numberOfLines={3}>{svc.desc}</Text>

                                <View style={[styles.cardFooter, { backgroundColor: svc.color + '10' }]}>
                                    <Text style={[styles.cardActionText, { color: svc.color }]}>Découvrir</Text>
                                    <Ionicons name="arrow-forward" size={12} color={svc.color} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Bandeau service VIP en vedette */}
            {!loading && (
                <View style={styles.vipBanner}>
                    <View style={styles.vipBannerLeft}>
                        <View style={styles.vipBadge}>
                            <Ionicons name="star" size={10} color={colors.gold} />
                            <Text style={styles.vipBadgeText}>LE PLUS POPULAIRE</Text>
                        </View>
                        <Text style={styles.vipTitle}>Nationalité Béninoise VIP</Text>
                        <Text style={styles.vipDesc}>
                            Accompagnement prioritaire de A à Z par notre équipe d'experts juridiques.
                        </Text>
                        <TouchableOpacity
                            style={styles.vipBtn}
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('ServiceDetails', {
                                serviceId: 'nationalite-vip',
                                title: 'Nationalité VIP',
                                desc: 'Accompagnement premium de A à Z pour obtenir la nationalité béninoise.',
                                color: colors.gold,
                                icon: 'ribbon-outline',
                            })}
                        >
                            <Text style={styles.vipBtnText}>En savoir plus</Text>
                            <Ionicons name="arrow-forward" size={14} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.vipIconWrap}>
                        <Ionicons name="ribbon" size={48} color={colors.gold + '30'} />
                    </View>
                </View>
            )}

            {/* CTA Contact */}
            {!loading && (
                <TouchableOpacity
                    style={styles.ctaBanner}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Messages')}
                >
                    <View style={styles.ctaIconWrap}>
                        <Ionicons name="chatbubbles-outline" size={26} color={colors.goldLight} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.ctaTitle}>Besoin de conseils ?</Text>
                        <Text style={styles.ctaSub}>Notre équipe répond sous 2h</Text>
                    </View>
                    <View style={styles.ctaArrow}>
                        <Ionicons name="arrow-forward" size={16} color={colors.gold} />
                    </View>
                </TouchableOpacity>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 40 },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 68 : 50,
        paddingBottom: 48,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        alignItems: 'center',
    },
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: colors.gold },
    headerContent: { alignItems: 'center', paddingHorizontal: spacing.xl },
    ornament: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md,
    },
    ornamentLine: { width: 32, height: 1, backgroundColor: colors.gold + '50' },
    ornamentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
    headerTitle: { ...typography.h1, color: colors.goldLight, textAlign: 'center', letterSpacing: 1 },
    headerSub: {
        ...typography.bodySmall, color: colors.surfaceElevated,
        marginTop: 12, textAlign: 'center', lineHeight: 22,
        opacity: 0.85, paddingHorizontal: spacing.lg,
    },

    loadingWrap: { alignItems: 'center', paddingVertical: spacing.xxl },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.lg,
        marginTop: -22,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_W,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.md,
        marginBottom: 4,
    },
    cardTopBar: { width: '100%', height: 4 },
    cardInner: {
        padding: spacing.md,
        alignItems: 'center',
        paddingBottom: spacing.lg,
    },
    cardIconWrap: {
        width: 58, height: 58, borderRadius: 16,
        backgroundColor: colors.surfaceWarm,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12, borderWidth: 1,
        ...shadows.xs,
    },
    cardTitle: {
        ...typography.label, fontSize: 13, color: colors.textPrimary,
        textAlign: 'center', marginBottom: 6, minHeight: 34,
    },
    cardDesc: {
        fontSize: 11, fontFamily: 'Inter_400Regular',
        color: colors.textSecondary, textAlign: 'center',
        lineHeight: 16, marginBottom: 14, minHeight: 48,
    },
    cardFooter: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    },
    cardActionText: {
        fontSize: 10, fontFamily: 'Inter_700Bold',
        textTransform: 'uppercase', letterSpacing: 0.5,
    },

    vipBanner: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: spacing.lg, marginTop: spacing.xl,
        backgroundColor: colors.headerBg,
        borderRadius: radius.xl, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.gold + '30',
        overflow: 'hidden',
        ...shadows.lg,
    },
    vipBannerLeft: { flex: 1 },
    vipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.gold + '20', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 4,
        alignSelf: 'flex-start', marginBottom: 10,
    },
    vipBadgeText: {
        fontSize: 9, fontFamily: 'Inter_700Bold',
        color: colors.goldLight, letterSpacing: 1,
    },
    vipTitle: { ...typography.h3, color: colors.textOnDark, marginBottom: 6 },
    vipDesc: {
        ...typography.caption, color: colors.surfaceElevated + 'CC',
        lineHeight: 18, marginBottom: 14,
    },
    vipBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.gold,
        paddingHorizontal: 16, paddingVertical: 9,
        borderRadius: radius.md, alignSelf: 'flex-start',
    },
    vipBtnText: { ...typography.caption, color: '#FFF', fontFamily: 'Inter_700Bold' },
    vipIconWrap: { marginLeft: 10 },

    ctaBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        marginHorizontal: spacing.lg, marginTop: spacing.lg,
        backgroundColor: colors.navyLight,
        borderRadius: radius.xl, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.gold + '20',
        ...shadows.sm,
    },
    ctaIconWrap: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: colors.gold + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    ctaTitle: { ...typography.label, color: colors.textOnDark },
    ctaSub: { ...typography.caption, color: colors.gold + 'AA', marginTop: 2 },
    ctaArrow: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: colors.gold + '15',
        alignItems: 'center', justifyContent: 'center',
    },
})
