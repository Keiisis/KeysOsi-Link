import React, { useEffect, useState, useMemo } from 'react'
import {
    View, Text, StyleSheet, Image,
    Dimensions, StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    Shield, ArrowUpRight, Folder, MessageSquare,
    Bell, CreditCard, FileText,
    ChevronRight, Sparkles, ShoppingBag, Crown,
    Calendar, Headphones, HelpCircle, Star, Zap, TrendingUp,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
    useSharedValue, useAnimatedStyle,
    withSpring, withTiming, withRepeat, withSequence, withDelay,
    Easing, interpolate, FadeInDown, FadeIn,
} from 'react-native-reanimated'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { colors, royal, shadows, fonts } from '../../config/theme'
import PressableCard from '../../components/PressableCard'
import { SkeletonCard } from '../../components/Skeleton'

const { width } = Dimensions.get('window')

interface DossierInfo { status: string; progress: number; service_type: string | null }

const STATUS_LABEL: Record<string, string> = {
    soumis: 'Dossier soumis', verifie: 'En vérification', traitement: 'En traitement',
    validation: 'En validation', termine: 'Terminé', annule: 'Annulé',
}

export default function HomeScreen({ navigation }: { navigation: { navigate: (route: string) => void } }) {
    const insets = useSafeAreaInsets()
    const { profile } = useAuth()
    const { t } = useLang()
    const [loading, setLoading] = useState(true)
    const [dossier, setDossier] = useState<DossierInfo | null>(null)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    const pulse = useSharedValue(1)
    const shimmer = useSharedValue(-1)
    const progressAnim = useSharedValue(0)
    const bagFloat = useSharedValue(0)
    const crownGlow = useSharedValue(0)

    useEffect(() => {
        pulse.value = withRepeat(withSequence(
            withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        ), -1, false)
        shimmer.value = withRepeat(
            withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }), -1, false,
        )
        bagFloat.value = withRepeat(withSequence(
            withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        ), -1, false)
        crownGlow.value = withRepeat(withSequence(
            withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        ), -1, false)
    }, [])

    useEffect(() => {
        if (dossier) {
            progressAnim.value = withDelay(500, withSpring(
                Math.max(0, Math.min(100, dossier.progress)), { damping: 18, stiffness: 90 },
            ))
        }
    }, [dossier])

    const fetchData = async () => {
        if (!profile) return
        try {
            const [dossierRes, notifRes, conversationRes] = await Promise.all([
                supabase.from('dossiers').select('status, progress, service_type')
                    .eq('client_id', profile.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
                supabase.from('notifications').select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id).eq('is_read', false),
                supabase.from('messages').select('id')
                    .eq('client_id', profile.id).eq('type', 'chat')
                    .order('created_at', { ascending: false }).limit(1).maybeSingle(),
            ])
            if (dossierRes.data) setDossier(dossierRes.data as DossierInfo)
            setUnreadNotifs(notifRes.count || 0)
            if (conversationRes.data?.id) {
                const lastSeenKey = `@rg_chat_last_seen_${profile.id}`
                const lastSeenIso = await AsyncStorage.getItem(lastSeenKey).catch(() => null)
                let q = supabase.from('chat_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conversationRes.data.id).eq('role', 'agent')
                if (lastSeenIso) q = q.gt('created_at', lastSeenIso)
                const { count } = await q
                setUnreadMessages(count || 0)
            } else { setUnreadMessages(0) }
        } catch { /* silent */ } finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [profile])

    const getGreeting = () => {
        const h = new Date().getHours()
        return h < 12 ? t('Bonjour') : h < 18 ? t('Bon après-midi') : t('Bonsoir')
    }

    const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')).toUpperCase() || 'RG'
    const dossierStatusLabel = dossier ? t(STATUS_LABEL[dossier.status] || dossier.status) : ''

    const QUICK_ACTIONS = useMemo(() => ([
        { Icon: Folder, label: t('Dossiers'), tint: colors.info, bg: colors.infoBg, dest: 'Dossier' },
        { Icon: MessageSquare, label: t('Messages'), tint: '#7C5CCA', bg: '#7C5CCA15', badge: unreadMessages, dest: 'Messages' },
        { Icon: FileText, label: t('Documents'), tint: colors.gold, bg: colors.goldMuted, dest: 'Signature' },
        { Icon: CreditCard, label: t('Paiements'), tint: colors.success, bg: colors.successBg, dest: 'Payments' },
    ] as const), [unreadMessages, t])

    const SECONDARY_SERVICES = useMemo(() => ([
        { Icon: Calendar, label: t('Rendez-vous'), tint: colors.teal, bg: 'rgba(20,184,166,0.12)', dest: 'Appointments' },
        { Icon: Headphones, label: t('Support 24/7'), tint: '#EC4899', bg: '#EC489915', dest: 'Support' },
        { Icon: HelpCircle, label: t('Aide & FAQ'), tint: colors.warning, bg: colors.warningBg || '#F59E0B15', dest: 'Help' },
    ] as const), [t])

    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }))
    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(shimmer.value, [-1, 1], [-width, width * 1.3]) },
            { skewX: '-20deg' },
        ],
        opacity: interpolate(shimmer.value, [-1, -0.5, 0.5, 1], [0, 0.5, 0.5, 0]),
    }))
    const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressAnim.value}%` }))
    const bagFloatStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(bagFloat.value, [0, 1], [0, -8]) },
            { rotate: `${interpolate(bagFloat.value, [0, 1], [-4, 4])}deg` },
        ],
    }))
    const crownGlowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(crownGlow.value, [0, 1], [0.4, 0.9]),
        transform: [{ scale: interpolate(crownGlow.value, [0, 1], [0.9, 1.15]) }],
    }))

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <StatusBar barStyle="dark-content" />

            {/* ═══ HEADER ═══ */}
            <View style={styles.header}>
                <PressableCard haptic="light" onPress={() => navigation.navigate('Profil')} style={styles.headerLeft}>
                    <View style={styles.avatarWrap}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <LinearGradient colors={[royal.emerald, colors.primary]} style={styles.avatar}>
                                <Text style={styles.avatarText}>{initials}</Text>
                            </LinearGradient>
                        )}
                        <View style={styles.avatarRing} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.greeting}>{getGreeting()} 👋</Text>
                        <Text style={styles.userName} numberOfLines={1}>
                            {profile?.prenom || t('Bienvenue')}
                        </Text>
                    </View>
                </PressableCard>
                <PressableCard haptic="light" onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
                    <Bell size={20} color={colors.textPrimary} strokeWidth={2} />
                    {unreadNotifs > 0 && (
                        <Animated.View style={[styles.notifBadge, pulseStyle]}>
                            <Text style={styles.notifBadgeText}>{unreadNotifs > 9 ? '9+' : unreadNotifs}</Text>
                        </Animated.View>
                    )}
                </PressableCard>
            </View>

            <View style={styles.body}>

                {/* ─── HERO DOSSIER ─── */}
                <Animated.View
                    style={styles.heroWrap}
                    entering={FadeInDown.delay(80).duration(500).springify().damping(18)}
                >
                    {loading ? <SkeletonCard style={styles.heroCard} /> : (
                        <PressableCard
                            haptic="medium"
                            onPress={() => navigation.navigate(dossier ? 'Dossier' : 'Services')}
                            style={styles.heroCard}
                        >
                            <LinearGradient
                                colors={['#011F18', '#022C22', royal.emerald, '#065F46']}
                                locations={[0, 0.3, 0.7, 1]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />

                            {/* Pattern grid décoratif */}
                            <View style={styles.heroGrid}>
                                {[...Array(6)].map((_, i) => (
                                    <View key={i} style={[styles.heroGridDot, { left: 20 + i * 30, top: 15 }]} />
                                ))}
                            </View>

                            <View style={styles.heroOrb1} />
                            <View style={styles.heroOrb2} />

                            <View style={styles.shimmerWrap} pointerEvents="none">
                                <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
                                    <LinearGradient
                                        colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                </Animated.View>
                            </View>

                            <View style={styles.heroContent}>
                                <View style={styles.heroTop}>
                                    <View style={styles.heroBadge}>
                                        <Shield size={11} color={colors.goldLight} strokeWidth={2.5} />
                                        <Text style={styles.heroBadgeText}>
                                            {dossier ? t('VOTRE DOSSIER') : t('DÉMARCHE RGB')}
                                        </Text>
                                    </View>
                                    <View style={styles.heroChevron}>
                                        <ArrowUpRight size={15} color="#FFF" strokeWidth={2.5} />
                                    </View>
                                </View>
                                <Text style={styles.heroTitle} numberOfLines={2}>
                                    {dossier ? (dossier.service_type || t('Dossier en cours')) : t('Lancer une nouvelle démarche')}
                                </Text>
                                {dossier ? (
                                    <>
                                        <View style={styles.progressRow}>
                                            <Text style={styles.progressLabel}>{dossierStatusLabel}</Text>
                                            <Text style={styles.progressPct}>{dossier.progress}%</Text>
                                        </View>
                                        <View style={styles.progressBg}>
                                            <Animated.View style={[styles.progressFill, progressBarStyle]}>
                                                <LinearGradient
                                                    colors={[colors.goldLight, colors.gold]}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                    style={StyleSheet.absoluteFillObject}
                                                />
                                            </Animated.View>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={styles.heroSub} numberOfLines={2}>
                                        {t('Obtenez votre Nationalité ou réglez vos affaires courantes au Bénin.')}
                                    </Text>
                                )}
                            </View>
                        </PressableCard>
                    )}
                </Animated.View>

                {/* ─── QUICK ACTIONS ─── */}
                <Animated.View entering={FadeIn.delay(180).duration(450)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Zap size={14} color={colors.primary} strokeWidth={2.5} fill={colors.primary} />
                        <Text style={styles.sectionLabel}>{t('ACCÈS RAPIDE')}</Text>
                    </View>
                    <View style={styles.actionsRow}>
                        {QUICK_ACTIONS.map((s, i) => {
                            const badge = ('badge' in s ? s.badge : 0) as number
                            return (
                                <View key={i} style={styles.actionItem}>
                                    <PressableCard
                                        haptic="light"
                                        onPress={() => navigation.navigate(s.dest)}
                                        style={styles.actionBtn}
                                    >
                                        <View style={[styles.actionIcon, { backgroundColor: s.bg }]}>
                                            <s.Icon size={22} color={s.tint} strokeWidth={2.2} />
                                            {badge > 0 && (
                                                <Animated.View style={[styles.actionBadge, pulseStyle]}>
                                                    <Text style={styles.actionBadgeText}>{badge > 9 ? '9+' : badge}</Text>
                                                </Animated.View>
                                            )}
                                        </View>
                                    </PressableCard>
                                    <Text style={styles.actionLabel} numberOfLines={1}>{s.label}</Text>
                                </View>
                            )
                        })}
                    </View>
                </Animated.View>

                {/* ═══════════════════════════════════════════
                    🎁 DUO PREMIUM ASYMÉTRIQUE 🎁
                    Boutique (verticale, plus large) + VIP (verticale, plus haute)
                ═══════════════════════════════════════════ */}
                <Animated.View
                    style={styles.duoSection}
                    entering={FadeInDown.delay(280).duration(600).springify().damping(16)}
                >
                    <View style={styles.duoRow}>

                        {/* ┃ BOUTIQUE — Card verticale (left, plus large) ┃ */}
                        <PressableCard
                            haptic="medium"
                            onPress={() => navigation.navigate('Boutique')}
                            style={styles.boutiqueCard}
                        >
                            <LinearGradient
                                colors={['#6B4E0F', '#A68B3C', colors.gold, '#E2C97E']}
                                locations={[0, 0.35, 0.75, 1]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />

                            {/* Orbes décoratives */}
                            <View style={styles.boutiqueOrbTop} />
                            <View style={styles.boutiqueOrbBottom} />

                            <View style={styles.shimmerWrap} pointerEvents="none">
                                <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
                                    <LinearGradient
                                        colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                </Animated.View>
                            </View>

                            <View style={styles.boutiqueContent}>
                                {/* Header */}
                                <View style={styles.boutiqueHeader}>
                                    <View style={styles.boutiquePill}>
                                        <View style={styles.boutiqueLiveDot} />
                                        <Text style={styles.boutiquePillText}>{t('NEW')}</Text>
                                    </View>
                                    <View style={styles.boutiqueArrowMini}>
                                        <ArrowUpRight size={13} color={colors.goldDark} strokeWidth={3} />
                                    </View>
                                </View>

                                {/* Bag illustration centrale */}
                                <View style={styles.boutiqueBagContainer}>
                                    <Animated.View style={[styles.boutiqueBagWrap, bagFloatStyle]}>
                                        <View style={styles.boutiqueBagGlow} />
                                        <View style={styles.boutiqueBagCircle}>
                                            <ShoppingBag size={24} color={colors.goldDark} strokeWidth={2} />
                                        </View>
                                        <View style={[styles.sparkleDot, styles.sparkleDot1]} />
                                        <View style={[styles.sparkleDot, styles.sparkleDot2]} />
                                        <View style={[styles.sparkleDot, styles.sparkleDot3]} />
                                    </Animated.View>
                                </View>

                                {/* Footer */}
                                <View style={styles.boutiqueFooter}>
                                    <Text style={styles.boutiqueTitle}>{t('Boutique')}</Text>
                                    <Text style={styles.boutiqueSubtitle}>RGB</Text>
                                    <View style={styles.boutiqueRatingRow}>
                                        <Star size={10} color="#FFF" fill="#FFF" strokeWidth={0} />
                                        <Text style={styles.boutiqueRating}>4.9 · {t('Artisanat')}</Text>
                                    </View>
                                </View>
                            </View>
                        </PressableCard>

                        {/* ┃ VIP NATIONALITÉ — Ticket vertical Apple Wallet style ┃ */}
                        <PressableCard
                            haptic="medium"
                            onPress={() => navigation.navigate('NationaliteForm')}
                            style={styles.vipCard}
                        >
                            <LinearGradient
                                colors={['#011F18', '#022C22', royal.emerald, '#0C1B33']}
                                locations={[0, 0.3, 0.7, 1]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />

                            {/* Border or premium */}
                            <View style={styles.vipBorder} />

                            {/* Pattern décoratif lines */}
                            <View style={styles.vipPattern}>
                                <View style={styles.vipLine1} />
                                <View style={styles.vipLine2} />
                                <View style={styles.vipLine3} />
                            </View>

                            <View style={styles.vipOrb} />

                            <View style={styles.shimmerWrap} pointerEvents="none">
                                <Animated.View style={[styles.shimmerBand, shimmerStyle]}>
                                    <LinearGradient
                                        colors={['transparent', 'rgba(212,175,55,0.3)', 'transparent']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                </Animated.View>
                            </View>

                            <View style={styles.vipContent}>
                                {/* Crown avec glow animé */}
                                <View style={styles.vipCrownWrap}>
                                    <Animated.View style={[styles.vipCrownGlow, crownGlowStyle]} />
                                    <View style={styles.vipCrownCircle}>
                                        <Crown size={16} color={colors.goldLight} strokeWidth={2.2} fill={colors.gold} />
                                    </View>
                                </View>

                                {/* Badge VIP */}
                                <View style={styles.vipBadge}>
                                    <Text style={styles.vipBadgeText}>{t('SERVICE VIP')}</Text>
                                </View>

                                {/* Title */}
                                <View style={styles.vipTitleWrap}>
                                    <Text style={styles.vipTitle}>{t('Nationalité')}</Text>
                                    <View style={styles.vipTitleAccentRow}>
                                        <Text style={styles.vipTitleAccent}>{t('Béninoise')}</Text>
                                        <View style={styles.vipDot} />
                                    </View>
                                </View>

                                {/* Ligne perforée style ticket */}
                                <View style={styles.vipPerfLine}>
                                    {[...Array(12)].map((_, i) => (
                                        <View key={i} style={styles.vipPerfDot} />
                                    ))}
                                </View>

                                {/* CTA bottom */}
                                <View style={styles.vipFooter}>
                                    <Text style={styles.vipFooterText}>{t('Découvrir')}</Text>
                                    <View style={styles.vipArrow}>
                                        <LinearGradient
                                            colors={[colors.goldLight, colors.gold]}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                        <ArrowUpRight size={14} color={colors.primaryDark} strokeWidth={3} />
                                    </View>
                                </View>
                            </View>

                            {/* Demi-cercles perforés (style ticket) */}
                            <View style={styles.vipNotchLeft} />
                            <View style={styles.vipNotchRight} />
                        </PressableCard>

                    </View>
                </Animated.View>

                {/* ─── AUTRES SERVICES ─── */}
                <Animated.View
                    entering={FadeInDown.delay(480).duration(500).springify().damping(18)}
                    style={styles.section}
                >
                    <View style={styles.sectionHeader}>
                        <TrendingUp size={14} color={colors.textSecondary} strokeWidth={2.5} />
                        <Text style={styles.sectionLabel}>{t('AUTRES SERVICES')}</Text>
                    </View>
                    <View style={styles.listGroup}>
                        {SECONDARY_SERVICES.map((s, i) => {
                            const isLast = i === SECONDARY_SERVICES.length - 1
                            return (
                                <PressableCard
                                    key={i}
                                    haptic="light"
                                    onPress={() => navigation.navigate(s.dest)}
                                    style={[styles.listRow, isLast && styles.listRowLast]}
                                >
                                    <View style={[styles.listIcon, { backgroundColor: s.bg }]}>
                                        <s.Icon size={18} color={s.tint} strokeWidth={2.2} />
                                    </View>
                                    <Text style={styles.listLabel}>{s.label}</Text>
                                    <ChevronRight size={16} color={colors.textTertiary || '#C7C7CC'} strokeWidth={2} />
                                </PressableCard>
                            )
                        })}
                    </View>
                </Animated.View>

            </View>


        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },

    // ─── Header ───
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatarWrap: { position: 'relative' },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarRing: {
        position: 'absolute',
        top: -2, left: -2, right: -2, bottom: -2,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: colors.gold,
        opacity: 0.4,
    },
    avatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: '#FFF' },
    greeting: {
        fontFamily: fonts.bodyMedium, fontSize: 13,
        color: colors.textSecondary, letterSpacing: -0.2,
    },
    userName: {
        fontFamily: fonts.heading, fontSize: 22,
        color: colors.textPrimary, letterSpacing: -0.5,
    },
    notifBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.xs,
    },
    notifBadge: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: colors.danger,
        borderRadius: 10,
        minWidth: 18, height: 18,
        paddingHorizontal: 5,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#F2F2F7',
    },
    notifBadgeText: { color: '#FFF', fontSize: 10, fontFamily: fonts.bodyBold },

    body: { flex: 1, flexShrink: 1 },

    // ─── Section ───
    section: { marginBottom: 10 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 20,
        marginBottom: 4,
    },
    sectionLabel: {
        fontFamily: fonts.bodySemibold,
        fontSize: 12,
        color: colors.textSecondary,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },

    // ─── Hero ───
    heroWrap: { paddingHorizontal: 20, marginBottom: 8 },
    heroCard: {
        height: 120,
        borderRadius: 22,
        overflow: 'hidden',
        ...shadows.lg,
        shadowColor: royal.emerald,
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
    },
    heroGrid: { ...StyleSheet.absoluteFillObject },
    heroGridDot: {
        position: 'absolute',
        width: 3, height: 3, borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroOrb1: {
        position: 'absolute',
        top: -50, right: -50,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: colors.goldLight,
        opacity: 0.16,
    },
    heroOrb2: {
        position: 'absolute',
        bottom: -60, left: -30,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: colors.primaryLight,
        opacity: 0.2,
    },
    heroContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(212,175,55,0.4)',
    },
    heroBadgeText: {
        fontFamily: fonts.bodyBold, fontSize: 10,
        color: colors.goldLight, letterSpacing: 1,
    },
    heroChevron: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },
    heroTitle: {
        fontFamily: fonts.heading, fontSize: 17,
        color: '#FFF', letterSpacing: -0.4, lineHeight: 21,
    },
    heroSub: {
        fontFamily: fonts.bodyMedium, fontSize: 13,
        color: 'rgba(255,255,255,0.80)', lineHeight: 18,
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    progressLabel: {
        fontFamily: fonts.bodySemibold, fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    progressPct: {
        fontFamily: fonts.heading, fontSize: 16,
        color: colors.goldLight,
    },
    progressBg: {
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

    // ─── Quick Actions ───
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    actionItem: { alignItems: 'center', flex: 1 },
    actionBtn: {
        width: 46, height: 46, borderRadius: 14,
        backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.xs,
        marginBottom: 4,
    },
    actionIcon: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    actionBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: colors.danger,
        borderRadius: 9,
        minWidth: 16, height: 16,
        paddingHorizontal: 4,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#FFF',
    },
    actionBadgeText: { color: '#FFF', fontSize: 9, fontFamily: fonts.bodyBold },
    actionLabel: {
        fontFamily: fonts.bodyMedium, fontSize: 10.5,
        color: colors.textPrimary, textAlign: 'center',
        letterSpacing: -0.1,
    },

    // ═══════════════════════════════════════════
    // DUO PREMIUM
    // ═══════════════════════════════════════════
    duoSection: { marginBottom: 10 },
    duoRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        height: 170,
    },

    // ─── BOUTIQUE (verticale) ───
    boutiqueCard: {
        flex: 1.05,
        borderRadius: 20,
        overflow: 'hidden',
        ...shadows.gold,
        shadowColor: colors.gold,
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
    },
    boutiqueOrbTop: {
        position: 'absolute',
        top: -50, right: -40,
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.22)',
    },
    boutiqueOrbBottom: {
        position: 'absolute',
        bottom: -60, left: -30,
        width: 130, height: 130, borderRadius: 65,
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    boutiqueContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    boutiqueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    boutiquePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.35)',
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    boutiqueLiveDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: '#FFF',
    },
    boutiquePillText: {
        fontFamily: fonts.bodyBold, fontSize: 9,
        color: '#FFF', letterSpacing: 1.2,
    },
    boutiqueArrowMini: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.sm,
    },
    boutiqueBagContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boutiqueBagWrap: {
        width: 50, height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    boutiqueBagGlow: {
        position: 'absolute',
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#FFF',
        opacity: 0.3,
    },
    boutiqueBagCircle: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#FFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.md,
    },
    sparkleDot: {
        position: 'absolute',
        backgroundColor: '#FFF',
        borderRadius: 50,
    },
    sparkleDot1: { width: 6, height: 6, top: 0, right: 4 },
    sparkleDot2: { width: 4, height: 4, top: 20, left: -2 },
    sparkleDot3: { width: 5, height: 5, bottom: 8, right: -4 },
    boutiqueFooter: {},
    boutiqueTitle: {
        fontFamily: fonts.heading,
        fontSize: 17,
        color: '#FFF',
        letterSpacing: -0.4,
        lineHeight: 20,
    },
    boutiqueSubtitle: {
        fontFamily: fonts.heading,
        fontSize: 17,
        color: colors.primaryDark,
        letterSpacing: -0.4,
        lineHeight: 20,
        marginTop: -1,
    },
    boutiqueRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 3,
    },
    boutiqueRating: {
        fontFamily: fonts.bodySemibold,
        fontSize: 11,
        color: 'rgba(255,255,255,0.95)',
        letterSpacing: -0.1,
    },

    // ─── VIP (ticket vertical) ───
    vipCard: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        ...shadows.lg,
        shadowColor: royal.emerald,
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
    },
    vipBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.40)',
    },
    vipPattern: { ...StyleSheet.absoluteFillObject, opacity: 0.08 },
    vipLine1: {
        position: 'absolute',
        top: 30, left: -20, right: -20,
        height: 1,
        backgroundColor: colors.goldLight,
        transform: [{ rotate: '-15deg' }],
    },
    vipLine2: {
        position: 'absolute',
        top: 80, left: -20, right: -20,
        height: 1,
        backgroundColor: colors.goldLight,
        transform: [{ rotate: '-15deg' }],
    },
    vipLine3: {
        position: 'absolute',
        top: 130, left: -20, right: -20,
        height: 1,
        backgroundColor: colors.goldLight,
        transform: [{ rotate: '-15deg' }],
    },
    vipOrb: {
        position: 'absolute',
        top: -40, right: -30,
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: colors.goldLight,
        opacity: 0.15,
    },
    vipContent: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },

    // Crown avec glow
    vipCrownWrap: {
        width: 34, height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        alignSelf: 'flex-start',
    },
    vipCrownGlow: {
        position: 'absolute',
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.gold,
    },
    vipCrownCircle: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: 'rgba(212,175,55,0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(212,175,55,0.5)',
    },

    vipBadge: {
        backgroundColor: 'rgba(212,175,55,0.18)',
        paddingHorizontal: 7, paddingVertical: 3,
        borderRadius: 5,
        alignSelf: 'flex-start',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(212,175,55,0.5)',
    },
    vipBadgeText: {
        fontFamily: fonts.bodyBold,
        fontSize: 9,
        color: colors.goldLight,
        letterSpacing: 0.8,
    },

    vipTitleWrap: {},
    vipTitle: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: '#FFF',
        letterSpacing: -0.3,
        lineHeight: 19,
    },
    vipTitleAccentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vipTitleAccent: {
        fontFamily: fonts.heading,
        fontSize: 15,
        color: colors.goldLight,
        letterSpacing: -0.3,
        lineHeight: 19,
    },
    vipDot: {
        width: 5, height: 5, borderRadius: 2.5,
        backgroundColor: colors.goldLight,
    },

    // Ligne perforée
    vipPerfLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 2,
    },
    vipPerfDot: {
        width: 3, height: 1,
        backgroundColor: 'rgba(212,175,55,0.4)',
    },

    vipFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    vipFooterText: {
        fontFamily: fonts.bodyBold,
        fontSize: 12,
        color: '#FFF',
        letterSpacing: -0.1,
    },
    vipArrow: {
        width: 30, height: 30, borderRadius: 15,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        ...shadows.sm,
    },

    // Notches ticket
    vipNotchLeft: {
        position: 'absolute',
        left: -10,
        top: '50%',
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#F2F2F7',
        marginTop: -10,
    },
    vipNotchRight: {
        position: 'absolute',
        right: -10,
        top: '50%',
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: '#F2F2F7',
        marginTop: -10,
    },

    // ─── List Group ───
    listGroup: {
        marginHorizontal: 20,
        backgroundColor: '#FFF',
        borderRadius: 14,
        overflow: 'hidden',
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5EA',
    },
    listRowLast: { borderBottomWidth: 0 },
    listIcon: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    listLabel: {
        flex: 1,
        fontFamily: fonts.bodyMedium, fontSize: 14,
        color: colors.textPrimary, letterSpacing: -0.2,
    },

    // ─── Shimmer ───
    shimmerWrap: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    shimmerBand: { position: 'absolute', top: -50, bottom: -50, width: 100 },
})