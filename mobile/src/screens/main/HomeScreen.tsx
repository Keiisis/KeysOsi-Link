import React, { useEffect, useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, Image,
    RefreshControl, Dimensions, Platform,
} from 'react-native'
import {
    Shield, Star, ArrowRight, Folder, MessageSquare,
    Bell, CreditCard, ShoppingBag, FileText, Headphones,
    ChevronRight, Sparkles,
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    interpolate,
    Extrapolation,
    useAnimatedScrollHandler,
} from 'react-native-reanimated'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { colors, royal, spacing, radius, shadows, typography, fonts, motion } from '../../config/theme'
import PressableCard from '../../components/PressableCard'
import { SkeletonCard } from '../../components/Skeleton'

const { width } = Dimensions.get('window')

const AnimatedScrollView = Animated.ScrollView

interface DossierInfo {
    status: string
    progress: number
    service_type: string | null
}

const STATUS_LABEL: Record<string, string> = {
    soumis: 'Dossier soumis',
    verifie: 'En vérification',
    traitement: 'En traitement',
    validation: 'En validation',
    termine: 'Terminé',
    annule: 'Annulé',
}

export default function HomeScreen({ navigation }: { navigation: { navigate: (route: string) => void } }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [dossier, setDossier] = useState<DossierInfo | null>(null)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    /* ── Animations Reanimated ── */
    const enterOpacity = useSharedValue(0)
    const enterTranslate = useSharedValue(40)
    const pulse = useSharedValue(1)
    const orbAngle = useSharedValue(0)
    const scrollY = useSharedValue(0)

    useEffect(() => {
        enterOpacity.value = withTiming(1, { duration: motion.slower })
        enterTranslate.value = withSpring(0, motion.spring.soft)
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        )
        orbAngle.value = withRepeat(
            withTiming(360, { duration: 24000, easing: Easing.linear }),
            -1,
            false,
        )
    }, [enterOpacity, enterTranslate, pulse, orbAngle])

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
                let unreadQuery = supabase.from('chat_messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conversationRes.data.id)
                    .eq('role', 'agent')
                if (lastSeenIso) unreadQuery = unreadQuery.gt('created_at', lastSeenIso)
                const { count } = await unreadQuery
                setUnreadMessages(count || 0)
            } else {
                setUnreadMessages(0)
            }
        } catch { /* silent */ } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profile])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchData()
        setRefreshing(false)
    }

    const getGreeting = () => {
        const h = new Date().getHours()
        return h < 12 ? t('Bonjour') : h < 18 ? t('Bon après-midi') : t('Bonsoir')
    }

    const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')).toUpperCase() || 'RG'

    const SERVICES = [
        { Icon: Folder,        label: t('Dossiers'),   tint: colors.info,    bg: colors.infoBg,    dest: 'Dossier' },
        { Icon: MessageSquare, label: t('Messages'),   tint: '#7C5CCA',      bg: '#7C5CCA12',      badge: unreadMessages, dest: 'Messages' },
        { Icon: FileText,      label: t('Documents'),  tint: colors.gold,    tintBg: colors.goldMuted, dest: 'Signature' },
        { Icon: CreditCard,    label: t('Paiements'),  tint: colors.success, bg: colors.successBg, dest: 'Payments' },
        { Icon: Headphones,    label: t('Rendez-vous'), tint: colors.teal,   bg: 'rgba(20, 184, 166, 0.10)', dest: 'Appointments' },
    ] as const

    /* ── Styles animés ── */
    const enterStyle = useAnimatedStyle(() => ({
        opacity: enterOpacity.value,
        transform: [{ translateY: enterTranslate.value }],
    }))

    const heroStyle = useAnimatedStyle(() => ({
        opacity: enterOpacity.value,
        transform: [
            { translateY: withDelay(80, withSpring(0, motion.spring.soft)) },
            { translateY: enterTranslate.value * 0.6 },
        ],
    }))

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }))

    const orbStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${orbAngle.value}deg` }],
    }))

    // Parallax — le header se contracte légèrement quand on scroll
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (e) => { scrollY.value = e.contentOffset.y },
    })
    const headerParallax = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    scrollY.value,
                    [0, 200],
                    [0, -60],
                    Extrapolation.CLAMP,
                ),
            },
            {
                scale: interpolate(
                    scrollY.value,
                    [-100, 0],
                    [1.1, 1],
                    Extrapolation.CLAMP,
                ),
            },
        ],
    }))

    const dossierStatusLabel = dossier ? t(STATUS_LABEL[dossier.status] || dossier.status) : ''

    return (
        <View style={styles.container}>
            {/* ── Background émeraude profond + 2 orbes glow lents ── */}
            <Animated.View style={[styles.headerBackground, headerParallax]}>
                <LinearGradient
                    colors={['#022C22', royal.emerald, royal.lightEmerald]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <Animated.View style={[styles.orbEmerald, orbStyle]} />
                <Animated.View style={[styles.orbGold, orbStyle]} />
            </Animated.View>

            <AnimatedScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 140 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#FFFFFF"
                        progressBackgroundColor="#FFFFFF"
                        colors={[colors.primary, colors.gold]}
                    />
                }
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                {/* ── TopBar : Avatar + greeting + notif ── */}
                <Animated.View style={[styles.topBar, enterStyle]}>
                    <PressableCard
                        haptic="light"
                        onPress={() => navigation.navigate('Profil')}
                        accessibilityLabel={t('Ouvrir mon profil')}
                        style={styles.userInfo}
                    >
                        <View style={styles.avatarWrap}>
                            <Animated.View style={[styles.avatarHalo, pulseStyle]} />
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>{initials}</Text>
                                </View>
                            )}
                            <View style={styles.onlineDot} />
                        </View>
                        <View style={styles.userTexts}>
                            <Text style={styles.greeting}>{getGreeting()}</Text>
                            <Text style={styles.userName} numberOfLines={1}>
                                {profile?.prenom || t('Bienvenue')} {profile?.nom || ''}
                            </Text>
                        </View>
                    </PressableCard>

                    <PressableCard
                        haptic="light"
                        onPress={() => navigation.navigate('Notifications')}
                        accessibilityLabel={t('Notifications')}
                        style={styles.notifBtn}
                    >
                        <Bell size={22} color="#FFFFFF" strokeWidth={2} />
                        {unreadNotifs > 0 && (
                            <Animated.View style={[styles.notifBadge, pulseStyle]}>
                                <Text style={styles.notifBadgeText}>
                                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                                </Text>
                            </Animated.View>
                        )}
                    </PressableCard>
                </Animated.View>

                {/* ── Hero Dossier ── */}
                <Animated.View style={[styles.heroWrapper, heroStyle]}>
                    {loading ? (
                        <SkeletonCard style={{ height: 180 }} />
                    ) : (
                        <PressableCard
                            haptic="medium"
                            onPress={() => navigation.navigate(dossier ? 'Dossier' : 'Services')}
                            accessibilityLabel={dossier ? t('Voir mon dossier') : t('Découvrir les services')}
                            style={styles.heroCard}
                        >
                            <LinearGradient
                                colors={['#0C1B33', '#1A2D4D', royal.emerald]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                            <View style={styles.heroGoldAccent} />

                            <View style={styles.heroHeader}>
                                <View style={styles.heroBadge}>
                                    <Shield size={13} color={colors.primaryLight} strokeWidth={2.5} />
                                    <Text style={styles.heroBadgeText}>
                                        {dossier ? t('ÉTAT DU DOSSIER') : t('PRÊT À COMMENCER')}
                                    </Text>
                                </View>
                                <View style={styles.heroActionBtn}>
                                    <Text style={styles.heroActionText}>{dossier ? t('Suivre') : t('Explorer')}</Text>
                                    <ChevronRight size={16} color="#A7F3D0" />
                                </View>
                            </View>

                            <Text style={styles.heroTitle}>
                                {dossier
                                    ? (dossier.service_type || t('Dossier en cours'))
                                    : t('Lancer une nouvelle démarche')}
                            </Text>

                            {dossier ? (
                                <View style={styles.progressSection}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressStatus}>
                                            {dossierStatusLabel.toUpperCase()}
                                        </Text>
                                        <Text style={styles.progressPercent}>{dossier.progress}%</Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <LinearGradient
                                            colors={[colors.gold, colors.primaryLight, colors.primary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, dossier.progress))}%` }]}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.heroSubText}>
                                    {t('Obtenez votre Nationalité ou réglez vos affaires courantes au Bénin en toute sérénité.')}
                                </Text>
                            )}
                        </PressableCard>
                    )}
                </Animated.View>

                {/* ── Boutique RGB — gradient royal doré ── */}
                <Animated.View style={[styles.sectionContainer, enterStyle]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('Boutique RGB')}</Text>
                        <View style={styles.sectionDot} />
                    </View>

                    <PressableCard
                        haptic="medium"
                        onPress={() => navigation.navigate('Boutique')}
                        accessibilityLabel={t('Ouvrir la boutique')}
                        style={styles.boutiqueCard}
                    >
                        <LinearGradient
                            colors={['#A68B3C', colors.gold, '#E2C97E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFillObject}
                        />

                        <View style={styles.boutiqueContent}>
                            <View style={styles.boutiqueTextContainer}>
                                <View style={styles.boutiquePill}>
                                    <Sparkles size={11} color="#FFF" strokeWidth={2.2} />
                                    <Text style={styles.boutiquePillText}>{t('NOUVEAU')}</Text>
                                </View>
                                <Text style={styles.boutiqueTitle}>{t('Découvrez nos articles')}</Text>
                                <Text style={styles.boutiqueSub}>
                                    {t('Produits artisanaux et accessoires premium.')}
                                </Text>
                            </View>

                            <View style={styles.boutiqueIconWrap}>
                                <ShoppingBag size={32} color={colors.goldDark} strokeWidth={2} />
                            </View>
                        </View>
                    </PressableCard>
                </Animated.View>

                {/* ── Services Rapides — Bento ── */}
                <Animated.View style={[styles.sectionContainer, enterStyle]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('Services rapides')}</Text>
                        <View style={styles.sectionDot} />
                    </View>

                    <View style={styles.bentoGrid}>
                        {SERVICES.map((action, idx) => {
                            const tintBg = ('tintBg' in action ? action.tintBg : action.bg) as string
                            const badge = ('badge' in action ? action.badge : 0) as number
                            return (
                                <PressableCard
                                    key={idx}
                                    haptic="light"
                                    onPress={() => navigation.navigate(action.dest)}
                                    accessibilityLabel={action.label}
                                    style={styles.bentoItem}
                                >
                                    <View style={[styles.bentoIconBox, { backgroundColor: tintBg }]}>
                                        <action.Icon size={24} color={action.tint} strokeWidth={2.2} />
                                        {badge > 0 ? (
                                            <View style={styles.bentoBadge}>
                                                <Text style={styles.bentoBadgeText}>
                                                    {badge > 9 ? '9+' : badge}
                                                </Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.bentoLabel}>{action.label}</Text>
                                </PressableCard>
                            )
                        })}
                    </View>
                </Animated.View>

                {/* ── VIP Cultural Card ── */}
                <Animated.View style={[styles.sectionContainer, enterStyle]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('Exclusivité RGB')}</Text>
                        <View style={styles.sectionDot} />
                    </View>

                    <PressableCard
                        haptic="medium"
                        onPress={() => navigation.navigate('NationaliteForm')}
                        accessibilityLabel={t('Demander la Nationalité Béninoise')}
                        style={styles.vipCard}
                    >
                        <Image
                            source={require('../../../assets/auth_bg.png')}
                            style={StyleSheet.absoluteFillObject}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['rgba(4, 120, 87, 0.92)', 'rgba(12, 27, 51, 0.95)']}
                            style={StyleSheet.absoluteFillObject}
                        />

                        <View style={styles.vipContent}>
                            <View style={styles.vipBadgeRow}>
                                <View style={styles.vipBadge}>
                                    <Star size={13} color={colors.goldLight} fill={colors.goldLight} strokeWidth={1.5} />
                                    <Text style={styles.vipBadgeText}>{t('SERVICE VIP')}</Text>
                                </View>
                            </View>

                            <Text style={styles.vipTitle}>{t('Nationalité Béninoise')}</Text>
                            <Text style={styles.vipDesc}>
                                {t("L'excellence à votre service. Un accompagnement prioritaire et ancestral pour votre retour aux sources.")}
                            </Text>

                            <View style={styles.vipFooter}>
                                <Text style={styles.vipActionText}>{t('Découvrir le privilège')}</Text>
                                <View style={styles.vipArrowWrap}>
                                    <ArrowRight size={20} color={colors.primaryDark} strokeWidth={3} />
                                </View>
                            </View>
                        </View>
                    </PressableCard>
                </Animated.View>
            </AnimatedScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // ── Header gradient + orbes ──
    headerBackground: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 380,
        borderBottomLeftRadius: 56, borderBottomRightRadius: 56,
        overflow: 'hidden',
    },
    orbEmerald: {
        position: 'absolute', top: -120, right: -100,
        width: 360, height: 360, borderRadius: 180,
        backgroundColor: colors.primaryLight,
        opacity: 0.18,
        borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    orbGold: {
        position: 'absolute', top: 140, left: -140,
        width: 320, height: 320, borderRadius: 160,
        backgroundColor: colors.goldLight,
        opacity: 0.10,
    },

    // ── TopBar ──
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        marginBottom: spacing.xl,
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatarHalo: {
        position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
        borderRadius: 36,
        backgroundColor: colors.primaryLight,
        opacity: 0.45,
    },
    avatar: {
        width: 54, height: 54, borderRadius: 27,
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    avatarPlaceholder: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.sm,
    },
    avatarInitial: {
        fontSize: 19,
        fontFamily: fonts.heading,
        color: colors.primaryDark,
    },
    onlineDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: colors.primary,
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    userTexts: { flex: 1 },
    greeting: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontFamily: fonts.bodyMedium,
        letterSpacing: 0.5,
    },
    userName: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: '#FFFFFF',
        marginTop: 2,
        letterSpacing: 0.3,
    },
    notifBtn: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    notifBadge: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: colors.danger,
        borderRadius: 10,
        minWidth: 18, height: 18,
        paddingHorizontal: 5,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#064E3B',
    },
    notifBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: fonts.bodyBold,
    },

    // ── Hero ──
    heroWrapper: { paddingHorizontal: spacing.lg, zIndex: 10 },
    heroCard: {
        backgroundColor: '#0F172A',
        borderRadius: radius.xxl,
        padding: spacing.xl,
        overflow: 'hidden',
        ...shadows.lg,
        shadowColor: colors.primary,
        shadowOpacity: 0.30,
    },
    heroGoldAccent: {
        position: 'absolute',
        top: 0, right: 0,
        width: 140, height: 4,
        backgroundColor: colors.gold,
        borderBottomLeftRadius: 4,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    heroBadgeText: {
        fontFamily: fonts.bodyBold,
        fontSize: 10,
        color: colors.primaryLight,
        letterSpacing: 1.2,
    },
    heroActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroActionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#A7F3D0' },
    heroTitle: {
        fontFamily: fonts.heading,
        fontSize: 24,
        color: '#FFFFFF',
        marginBottom: 8,
        lineHeight: 30,
    },
    heroSubText: {
        fontFamily: fonts.bodyMedium,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.75)',
        lineHeight: 21,
    },
    progressSection: { marginTop: spacing.md },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    progressStatus: {
        fontFamily: fonts.bodyBold,
        fontSize: 11,
        color: colors.goldLight,
        letterSpacing: 1.2,
    },
    progressPercent: {
        fontFamily: fonts.heading,
        fontSize: 16,
        color: colors.primaryLight,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: { height: '100%', borderRadius: 4 },

    // ── Sections ──
    sectionContainer: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontFamily: fonts.heading,
        fontSize: 20,
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },
    sectionDot: {
        flex: 1,
        height: 1,
        backgroundColor: colors.borderLight,
    },

    // ── Boutique ──
    boutiqueCard: {
        borderRadius: radius.xxl,
        overflow: 'hidden',
        height: 124,
        ...shadows.gold,
    },
    boutiqueContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
    },
    boutiqueTextContainer: { flex: 1, marginRight: 16 },
    boutiquePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.30)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 8,
    },
    boutiquePillText: {
        fontFamily: fonts.bodyBold,
        fontSize: 9,
        color: '#FFFFFF',
        letterSpacing: 1.5,
    },
    boutiqueTitle: {
        fontFamily: fonts.heading,
        fontSize: 21,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    boutiqueSub: {
        fontFamily: fonts.bodyMedium,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.85)',
    },
    boutiqueIconWrap: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        ...shadows.sm,
    },

    // ── Bento ──
    bentoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    bentoItem: {
        width: (width - spacing.lg * 2 - 12) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: radius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.xs,
    },
    bentoIconBox: {
        width: 48, height: 48, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
        position: 'relative',
    },
    bentoBadge: {
        position: 'absolute', top: -6, right: -6,
        backgroundColor: colors.danger,
        borderRadius: 12,
        minWidth: 22, height: 22,
        paddingHorizontal: 6,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    bentoBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontFamily: fonts.bodyBold,
    },
    bentoLabel: {
        fontFamily: fonts.bodySemibold,
        fontSize: 15,
        color: colors.textPrimary,
    },

    // ── VIP ──
    vipCard: {
        borderRadius: radius.xxl,
        overflow: 'hidden',
        marginBottom: spacing.md,
        ...shadows.lg,
        shadowColor: colors.primary,
    },
    vipContent: { padding: spacing.xl, paddingTop: 26 },
    vipBadgeRow: { marginBottom: 14 },
    vipBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: radius.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        borderWidth: 1, borderColor: colors.borderGold,
    },
    vipBadgeText: {
        fontFamily: fonts.bodyBold,
        fontSize: 10,
        color: colors.goldLight,
        letterSpacing: 1.3,
    },
    vipTitle: {
        fontFamily: fonts.heading,
        fontSize: 26,
        color: '#FFFFFF',
        marginBottom: 10,
    },
    vipDesc: {
        ...typography.body,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    vipFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    vipActionText: {
        fontFamily: fonts.heading,
        fontSize: 17,
        color: '#FFFFFF',
    },
    vipArrowWrap: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: colors.goldLight,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.sm,
    },
})
