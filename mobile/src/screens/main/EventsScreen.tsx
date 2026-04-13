'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, ActivityIndicator, Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

const { width } = Dimensions.get('window')
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://retourgagnantbenin.bj'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppEvent {
    id: string
    title: string
    short_description?: string
    description?: string
    start_date: string
    end_date?: string
    location: string
    address?: string
    price_standard: number
    price_vip?: number
    currency: string
    max_capacity?: number
    is_featured: boolean
    cover_image?: string
    status: string
    category?: string
    my_registration?: { id: string; status: string; ticket_type: string } | null
}

// ─── Fallback événements ──────────────────────────────────────────────────────

const FALLBACK_EVENTS: AppEvent[] = [
    {
        id: 'evt-1',
        title: 'Gala de la Diaspora Béninoise 2025',
        short_description: 'Soirée de gala annuelle réunissant la diaspora béninoise du monde entier.',
        description: 'Grand gala de prestige organisé par Retour Gagnant Bénin. Musique live, gastronomie béninoise, discours officiels et réseautage exclusif.',
        start_date: '2025-07-15T19:00:00',
        end_date: '2025-07-15T23:30:00',
        location: 'Cotonou',
        address: 'Hôtel Azalaï, Boulevard de la Marina, Cotonou',
        price_standard: 25000,
        price_vip: 75000,
        currency: 'XOF',
        max_capacity: 300,
        is_featured: true,
        cover_image: '',
        status: 'published',
        category: 'Gala',
    },
    {
        id: 'evt-2',
        title: 'Forum Investissements Bénin 2025',
        short_description: 'Rencontrez les acteurs clés et découvrez les opportunités d\'investissement.',
        description: 'Forum international dédié aux opportunités d\'investissement au Bénin. Panels, pitches de startups et networking B2B.',
        start_date: '2025-08-22T09:00:00',
        end_date: '2025-08-22T18:00:00',
        location: 'Cotonou',
        address: 'Palais des Congrès, Cotonou',
        price_standard: 15000,
        price_vip: 45000,
        currency: 'XOF',
        max_capacity: 500,
        is_featured: true,
        cover_image: '',
        status: 'published',
        category: 'Forum',
    },
    {
        id: 'evt-3',
        title: 'Circuit Culturel — Abomey & Ouidah',
        short_description: 'Palais Royaux d\'Abomey (UNESCO) + Route des Esclaves sur 2 jours.',
        description: 'Circuit guidé sur 2 jours : Palais Royaux d\'Abomey, Musée de Ouidah, Porte du Non-Retour, Forêt Sacrée de Kpasse.',
        start_date: '2025-09-05T07:00:00',
        end_date: '2025-09-06T18:00:00',
        location: 'Abomey / Ouidah',
        address: 'Départ depuis Cotonou (navette incluse)',
        price_standard: 35000,
        price_vip: 55000,
        currency: 'XOF',
        max_capacity: 30,
        is_featured: false,
        cover_image: '',
        status: 'published',
        category: 'Tourisme',
    },
    {
        id: 'evt-4',
        title: 'Séminaire : Créer son Entreprise au Bénin',
        short_description: 'Tout savoir sur la création d\'entreprise et les démarches administratives.',
        description: 'Séminaire d\'une journée animé par des experts juridiques et fiscaux. Questions-réponses, études de cas réels, networking.',
        start_date: '2025-10-11T09:00:00',
        end_date: '2025-10-11T17:00:00',
        location: 'En ligne + Cotonou',
        address: 'Hybride — lien de connexion envoyé après inscription',
        price_standard: 0,
        price_vip: 20000,
        currency: 'XOF',
        max_capacity: 200,
        is_featured: false,
        cover_image: '',
        status: 'published',
        category: 'Séminaire',
    },
]

const CATEGORIES = ['Tous', 'Gala', 'Forum', 'Tourisme', 'Séminaire', 'Conférence']

const CATEGORY_COLORS: Record<string, string> = {
    'Gala': colors.gold,
    'Forum': '#3B82C4',
    'Tourisme': '#E07B54',
    'Séminaire': '#7C5CCA',
    'Conférence': '#2D9F63',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatPrice(price: number, currency: string) {
    if (price === 0) return 'Gratuit'
    return `${price.toLocaleString('fr-FR')} ${currency}`
}

function isFuture(iso: string) {
    return new Date(iso) > new Date()
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: AppEvent; onPress: () => void }) {
    const catColor = CATEGORY_COLORS[event.category || ''] || colors.gold
    const isFree = event.price_standard === 0
    const isRegistered = !!event.my_registration

    const gradients: Record<string, string[]> = {
        'Gala':      ['#C9A84C', '#A68B3C'],
        'Forum':     ['#3B82C4', '#1B2A4A'],
        'Tourisme':  ['#E07B54', '#C9A84C'],
        'Séminaire': ['#7C5CCA', '#4F46E5'],
        'Conférence':['#2D9F63', '#0F766E'],
    }
    const grad = gradients[event.category || ''] || [colors.gold, colors.goldDark]

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
            {/* Cover gradient */}
            <View style={[styles.cardCover, { backgroundColor: grad[0] }]}>
                {/* Pattern décoratif */}
                <View style={styles.coverPattern} />

                {/* Badges top */}
                <View style={styles.cardBadgesRow}>
                    {event.is_featured && (
                        <View style={styles.featuredBadge}>
                            <Ionicons name="star" size={9} color={colors.gold} />
                            <Text style={styles.featuredText}>À la une</Text>
                        </View>
                    )}
                    <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
                        <Text style={[styles.catText, { color: catColor }]}>{event.category || 'Événement'}</Text>
                    </View>
                </View>

                {/* Date badge */}
                <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>{new Date(event.start_date).getDate()}</Text>
                    <Text style={styles.dateBadgeMonth}>
                        {new Date(event.start_date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()}
                    </Text>
                </View>

                {isRegistered && (
                    <View style={styles.registeredBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.registeredText}>Inscrit</Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{event.short_description || event.description}</Text>

                <View style={styles.cardInfoRow}>
                    <View style={styles.cardInfoItem}>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.cardInfoText} numberOfLines={1}>{event.location}</Text>
                    </View>
                    <View style={styles.cardInfoItem}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.cardInfoText}>{formatTime(event.start_date)}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.priceWrap}>
                        {isFree ? (
                            <View style={[styles.priceBadge, { backgroundColor: colors.successLight }]}>
                                <Text style={[styles.priceText, { color: colors.success }]}>Gratuit</Text>
                            </View>
                        ) : (
                            <View style={[styles.priceBadge, { backgroundColor: colors.goldMuted }]}>
                                <Text style={[styles.priceText, { color: colors.goldDark }]}>
                                    {formatPrice(event.price_standard, event.currency)}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.cardBtn, { backgroundColor: catColor }]}>
                        <Text style={styles.cardBtnText}>Voir</Text>
                        <Ionicons name="arrow-forward" size={11} color="#FFF" />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventsScreen({ navigation }: any) {
    const { profile } = useAuth()
    const [events, setEvents] = useState<AppEvent[]>(FALLBACK_EVENTS)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [category, setCategory] = useState('Tous')

    const fetchEvents = useCallback(async () => {
        try {
            const clientParam = profile?.id ? `&client_id=${profile.id}` : ''
            const text = await fetch(`${API_BASE}/api/mobile/events?${clientParam}`).then(r => r.text())
            let json: { events?: AppEvent[] } = {}
            try { json = JSON.parse(text) } catch { /* ignore */ }
            if (json.events && json.events.length > 0) {
                setEvents(json.events.filter((e: AppEvent) => isFuture(e.start_date) || true))
            }
        } catch { /* garder fallback */ } finally {
            setLoading(false) }
    }, [profile?.id])

    useEffect(() => { fetchEvents() }, [fetchEvents])
    const onRefresh = async () => { setRefreshing(true); await fetchEvents(); setRefreshing(false) }

    const filtered = category === 'Tous'
        ? events
        : events.filter(e => e.category === category)

    const featured = events.filter(e => e.is_featured)[0]

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.goldLine} />
                <Text style={styles.headerTitle}>Événements</Text>
                <Text style={styles.headerSub}>Galas, forums, circuits culturels et séminaires</Text>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.gold} size="large" />
                    <Text style={styles.loadingText}>Chargement des événements…</Text>
                </View>
            ) : (
                <>
                    {/* Événement à la une */}
                    {featured && (
                        <TouchableOpacity
                            style={styles.featuredCard}
                            activeOpacity={0.88}
                            onPress={() => navigation.navigate('EventDetail', { event: featured })}
                        >
                            <View style={[styles.featuredCover, { backgroundColor: colors.navy }]}>
                                <View style={styles.featuredPattern} />
                                <View style={styles.featuredTopRow}>
                                    <View style={styles.featuredLabel}>
                                        <Ionicons name="star" size={10} color={colors.gold} />
                                        <Text style={styles.featuredLabelText}>Événement Phare</Text>
                                    </View>
                                    {featured.my_registration && (
                                        <View style={styles.registeredBadgeLg}>
                                            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                                            <Text style={styles.registeredTextLg}>Inscrit</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.featuredInfo}>
                                    <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                                    <View style={styles.featuredMeta}>
                                        <Ionicons name="calendar-outline" size={13} color={colors.gold + 'BB'} />
                                        <Text style={styles.featuredMetaText}>{formatDate(featured.start_date)} · {formatTime(featured.start_date)}</Text>
                                    </View>
                                    <View style={styles.featuredMeta}>
                                        <Ionicons name="location-outline" size={13} color={colors.gold + 'BB'} />
                                        <Text style={styles.featuredMetaText}>{featured.address || featured.location}</Text>
                                    </View>
                                    <View style={styles.featuredBottom}>
                                        <Text style={styles.featuredPrice}>
                                            {featured.price_standard === 0
                                                ? 'Gratuit'
                                                : `À partir de ${featured.price_standard.toLocaleString('fr-FR')} ${featured.currency}`
                                            }
                                        </Text>
                                        <View style={styles.featuredBtn}>
                                            <Text style={styles.featuredBtnText}>S'inscrire</Text>
                                            <Ionicons name="arrow-forward" size={13} color="#FFF" />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Filtres catégorie */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filtersScroll}
                        contentContainerStyle={styles.filtersContent}
                    >
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.filterPill, category === cat && styles.filterPillActive]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.filterText, category === cat && styles.filterTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Liste */}
                    <View style={styles.listWrap}>
                        {filtered.length === 0 ? (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                                <Text style={styles.emptyText}>Aucun événement dans cette catégorie</Text>
                            </View>
                        ) : (
                            filtered.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onPress={() => navigation.navigate('EventDetail', { event })}
                                />
                            ))
                        )}
                    </View>
                </>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 24,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    headerTitle: { ...typography.h1, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 4 },

    loadingWrap: { paddingTop: 60, alignItems: 'center', gap: 12 },
    loadingText: { ...typography.bodySmall, color: colors.textSecondary },

    // Featured card
    featuredCard: { margin: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', ...shadows.md },
    featuredCover: { padding: spacing.lg, minHeight: 200, justifyContent: 'space-between' },
    featuredPattern: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        opacity: 0.07,
        backgroundColor: 'transparent',
    },
    featuredTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featuredLabel: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.gold + '20', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    featuredLabelText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.gold, letterSpacing: 0.5 },
    registeredBadgeLg: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.successBg, borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    registeredTextLg: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.success },

    featuredInfo: { gap: 8, marginTop: 16 },
    featuredTitle: { ...typography.h2, color: '#FFF', lineHeight: 28 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featuredMetaText: { ...typography.caption, color: colors.gold + 'BB', flex: 1 },
    featuredBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    featuredPrice: { ...typography.label, color: colors.gold },
    featuredBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.gold, borderRadius: radius.md,
        paddingHorizontal: 16, paddingVertical: 10,
    },
    featuredBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#FFF' },

    // Filtres
    filtersScroll: { marginTop: spacing.md },
    filtersContent: { paddingHorizontal: spacing.lg, gap: 8 },
    filterPill: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
    },
    filterPillActive: { borderColor: colors.gold, backgroundColor: colors.goldMuted },
    filterText: { ...typography.caption, color: colors.textSecondary },
    filterTextActive: { color: colors.goldDark, fontFamily: 'Inter_700Bold' },

    // Liste
    listWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 14 },
    emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },

    // Event card
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    cardCover: { height: 120, justifyContent: 'space-between', padding: 12, position: 'relative' },
    coverPattern: { position: 'absolute', inset: 0, opacity: 0.08 },
    cardBadgesRow: { flexDirection: 'row', gap: 6 },
    featuredBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 4,
    },
    featuredText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.gold },
    catBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
    catText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
    dateBadge: {
        position: 'absolute', bottom: 10, right: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
        alignItems: 'center',
    },
    dateBadgeDay: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', color: colors.textPrimary, lineHeight: 20 },
    dateBadgeMonth: { fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.textMuted, letterSpacing: 0.5 },
    registeredBadge: {
        position: 'absolute', top: 10, right: 12,
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: colors.successBg, borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 4,
    },
    registeredText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.success },

    cardBody: { padding: 14, gap: 8 },
    cardTitle: { ...typography.label, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
    cardDesc: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    cardInfoRow: { flexDirection: 'row', gap: 16 },
    cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    cardInfoText: { ...typography.caption, color: colors.textMuted, flex: 1 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
    priceWrap: {},
    priceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    priceText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
    cardBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    },
    cardBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#FFF' },
})
