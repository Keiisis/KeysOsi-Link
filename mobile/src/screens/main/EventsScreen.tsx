'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, ActivityIndicator, Dimensions,
} from 'react-native'
import { ArrowRight, Calendar, CheckCircle, Clock, MapPin, Star } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenHeader from '../../components/ScreenHeader'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography, royal } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { fetchWithTimeout } from '../../lib/fetch'

const { width } = Dimensions.get('window')
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

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

// Pas de fallback — seuls les vrais événements de la base de données sont affichés

const CATEGORIES = ['Tous', 'Gala', 'Forum', 'Tourisme', 'Séminaire', 'Conférence']

const CATEGORY_COLORS: Record<string, string> = {
    'Gala': colors.primary,
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

function formatPrice(price: number, currency: string, t: any) {
    if (price === 0) return t('Gratuit')
    return `${price.toLocaleString('fr-FR')} ${currency}`
}

function isFuture(iso: string) {
    return new Date(iso) > new Date()
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, onPress, t }: { event: AppEvent; onPress: () => void; t: any }) {
    const catColor = CATEGORY_COLORS[event.category || ''] || colors.primary
    const isFree = event.price_standard === 0
    const isRegistered = !!event.my_registration

    const gradients: Record<string, string[]> = {
        'Gala':      ['#C9A84C', '#A68B3C'],
        'Forum':     ['#3B82C4', '#1B2A4A'],
        'Tourisme':  ['#E07B54', '#C9A84C'],
        'Séminaire': ['#7C5CCA', '#4F46E5'],
        'Conférence':['#2D9F63', '#0F766E'],
    }
    const grad = gradients[event.category || ''] || [colors.primary, colors.primaryDark]

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
                            <Star size={9} color={colors.primary} strokeWidth={1.75} />
                            <Text style={styles.featuredText}>{t('À la une')}</Text>
                        </View>
                    )}
                    <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
                        <Text style={[styles.catText, { color: catColor }]}>{event.category ? t(event.category) : t('Événement')}</Text>
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
                        <CheckCircle size={12} color={colors.success} strokeWidth={1.75} />
                        <Text style={styles.registeredText}>{t('Inscrit')}</Text>
                    </View>
                )}
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{event.short_description || event.description}</Text>

                <View style={styles.cardInfoRow}>
                    <View style={styles.cardInfoItem}>
                        <MapPin size={12} color={colors.textMuted} strokeWidth={1.75} />
                        <Text style={styles.cardInfoText} numberOfLines={1}>{event.location}</Text>
                    </View>
                    <View style={styles.cardInfoItem}>
                        <Clock size={12} color={colors.textMuted} strokeWidth={1.75} />
                        <Text style={styles.cardInfoText}>{formatTime(event.start_date)}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.priceWrap}>
                        {isFree ? (
                            <View style={[styles.priceBadge, { backgroundColor: colors.successLight }]}>
                                <Text style={[styles.priceText, { color: colors.success }]}>{t('Gratuit')}</Text>
                            </View>
                        ) : (
                            <View style={[styles.priceBadge, { backgroundColor: colors.primaryMuted }]}>
                                <Text style={[styles.priceText, { color: colors.primaryDark }]}>
                                    {formatPrice(event.price_standard, event.currency, t)}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={[styles.cardBtn, { backgroundColor: catColor }]}>
                        <Text style={styles.cardBtnText}>{t('Voir')}</Text>
                        <ArrowRight size={11} color="#FFF" strokeWidth={1.75} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventsScreen({ navigation }: any) {
    const { profile } = useAuth()
    const [events, setEvents] = useState<AppEvent[]>([])
    const { t } = useLang()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [category, setCategory] = useState('Tous')

    const fetchEvents = useCallback(async () => {
        try {
            const clientParam = profile?.id ? `&client_id=${profile.id}` : ''
            const text = await fetchWithTimeout(`${API_BASE}/api/mobile/events?${clientParam}`, { timeoutMs: 10000 }).then(r => r.text())
            let json: { events?: AppEvent[] } = {}
            try { json = JSON.parse(text) } catch { /* ignore */ }
            // Toujours mettre à jour avec les données réelles (même vide)
            setEvents(json.events || [])
        } catch (err) {
            console.warn('[Events] fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [profile?.id])

    useEffect(() => { fetchEvents() }, [fetchEvents])
    const onRefresh = async () => { setRefreshing(true); await fetchEvents(); setRefreshing(false) }

    const filtered = category === 'Tous'
        ? events
        : events.filter(e => e.category === category)

    const featured = events.filter(e => e.is_featured)[0]

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={['rgba(220,165,64,0.15)', royal.bg, royal.bg]} 
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject} 
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={royal.gold} />}
            >
                <ScreenHeader
                title={t('Événements')}
                subtitle={t('Galas, forums, circuits culturels et séminaires')}
            />

            {loading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.loadingText}>{t('Chargement des événements…')}</Text>
                </View>
            ) : events.length === 0 ? (
                /* ── État vide global : aucun événement dans la base ── */
                <View style={styles.globalEmptyWrap}>
                    <View style={styles.globalEmptyIcon}>
                        <Calendar size={48} color={colors.primary} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.globalEmptyTitle}>{t('Aucun événement pour le moment')}</Text>
                    <Text style={styles.globalEmptyDesc}>
                        {t('Les prochains galas, forums et circuits culturels de Retour Gagnant Bénin seront affichés ici dès leur publication.')}
                    </Text>
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
                            <View style={[styles.featuredCover, { backgroundColor: colors.surface }]}>
                                <View style={styles.featuredPattern} />
                                <View style={styles.featuredTopRow}>
                                    <View style={styles.featuredLabel}>
                                        <Star size={10} color={colors.primary} strokeWidth={1.75} />
                                        <Text style={styles.featuredLabelText}>{t('Événement Phare')}</Text>
                                    </View>
                                    {featured.my_registration && (
                                        <View style={styles.registeredBadgeLg}>
                                            <CheckCircle size={13} color={colors.success} strokeWidth={1.75} />
                                            <Text style={styles.registeredTextLg}>{t('Inscrit')}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.featuredInfo}>
                                    <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                                    <View style={styles.featuredMeta}>
                                        <Calendar size={13} color={colors.primary + 'BB'} strokeWidth={1.75} />
                                        <Text style={styles.featuredMetaText}>{formatDate(featured.start_date)} · {formatTime(featured.start_date)}</Text>
                                    </View>
                                    <View style={styles.featuredMeta}>
                                        <MapPin size={13} color={colors.primary + 'BB'} strokeWidth={1.75} />
                                        <Text style={styles.featuredMetaText}>{featured.address || featured.location}</Text>
                                    </View>
                                    <View style={styles.featuredBottom}>
                                        <Text style={styles.featuredPrice}>
                                            {featured.price_standard === 0
                                                ? t('Gratuit')
                                                : t('À partir de {price}').replace('{price}', featured.price_standard.toLocaleString('fr-FR') + ' ' + featured.currency)
                                            }
                                        </Text>
                                        <View style={styles.featuredBtn}>
                                            <Text style={styles.featuredBtnText}>{t('S\'inscrire')}</Text>
                                            <ArrowRight size={13} color="#FFF" strokeWidth={1.75} />
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
                                    {t(cat)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Liste */}
                    <View style={styles.listWrap}>
                        {filtered.length === 0 ? (
                            <View style={styles.emptyWrap}>
                                <Calendar size={40} color={colors.textMuted} strokeWidth={1.75} />
                                <Text style={styles.emptyText}>{t('Aucun événement dans cette catégorie')}</Text>
                            </View>
                        ) : (
                            filtered.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onPress={() => navigation.navigate('EventDetail', { event })}
                                    t={t}
                                />
                            ))
                        )}
                    </View>
                </>
            )}

            <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: royal.bg },



    loadingWrap: { paddingTop: 60, alignItems: 'center', gap: 12 },
    loadingText: { ...typography.bodySmall, color: colors.textSecondary },

    // État vide global (aucun événement dans la base)
    globalEmptyWrap: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: spacing.xl,
        gap: 16,
    },
    globalEmptyIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    globalEmptyTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    globalEmptyDesc: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Liste
    listWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 14 },
    emptyWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center' },
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
        backgroundColor: colors.primary + '20', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    featuredLabelText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.primary, letterSpacing: 0.5 },
    registeredBadgeLg: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.successBg, borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 4,
    },
    registeredTextLg: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.success },

    featuredInfo: { gap: 8, marginTop: 16 },
    featuredTitle: { ...typography.h2, color: '#FFF', lineHeight: 28 },
    featuredMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    featuredMetaText: { ...typography.caption, color: colors.primary + 'BB', flex: 1 },
    featuredBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    featuredPrice: { ...typography.label, color: colors.primary },
    featuredBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary, borderRadius: radius.md,
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
    filterPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    filterText: { ...typography.caption, color: colors.textSecondary },
    filterTextActive: { color: colors.primaryDark, fontFamily: 'Inter_700Bold' },

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
    featuredText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: colors.primary },
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
