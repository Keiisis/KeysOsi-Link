import React, { useEffect, useState, useRef } from 'react'
import {
    View, Text, ScrollView, StyleSheet, Image,
    TouchableOpacity, RefreshControl, Dimensions, Platform,
    Animated, Easing
} from 'react-native'
import { 
    Shield, Star, ArrowRight, Folder, MessageSquare, 
    Bell, CreditCard, ShoppingBag, FileText, Headphones, 
    ChevronRight, Sparkles
} from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { spacing, radius, fonts } from '../../config/theme'

const { width } = Dimensions.get('window')

/* ═══════════════════════════════════════════════════════════
   Home Screen — "ULTRA BANGER" (Asymétrique, Organique, 3D)
═══════════════════════════════════════════════════════════ */

export default function HomeScreen({ navigation }: any) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [refreshing, setRefreshing] = useState(false)
    const [dossier, setDossier] = useState<any>(null)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    // --- Animations "Ultra" ---
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideUpAnim = useRef(new Animated.Value(60)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const rotateAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Apparition initiale
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.spring(slideUpAnim, { toValue: 0, tension: 20, friction: 8, useNativeDriver: true }),
        ]).start()

        // Pulsation infinie pour les éléments vivants (Avatar glow, badges)
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start()

        // Rotation ultra-lente pour les cercles de fond
        Animated.loop(
            Animated.timing(rotateAnim, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
        ).start()
    }, [])

    const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

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

            if (dossierRes.data) setDossier(dossierRes.data)
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
        } catch { /* silent */ }
    }

    useEffect(() => { fetchData() }, [profile])
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

    const getGreeting = () => {
        const h = new Date().getHours()
        return h < 12 ? t('Bonjour') : h < 18 ? t('Bon après-midi') : t('Bonsoir')
    }

    const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')).toUpperCase() || 'RG'

    // Restauration des services avec ajout de la Boutique + Disposition Bento
    const SERVICES = [
        { Icon: Folder, label: t('Dossiers'), color: '#3B82F6', bg: '#EFF6FF', dest: 'Dossier' },
        { Icon: MessageSquare, label: t('Messages'), color: '#8B5CF6', bg: '#F5F3FF', badge: unreadMessages, dest: 'Messages' },
        { Icon: FileText, label: t('Documents'), color: '#EC4899', bg: '#FDF2F8', dest: 'Signature' },
        { Icon: CreditCard, label: t('Paiements'), color: '#F59E0B', bg: '#FFFBEB', dest: 'Payments' },
        { Icon: Headphones, label: t('Rendez-vous'), color: '#14B8A6', bg: '#F0FDFA', dest: 'Appointments' },
    ]

    return (
        <View style={styles.container}>
            {/* ── Background Émeraude Abstrait en Rotation ── */}
            <View style={styles.headerBackground}>
                <LinearGradient colors={['#022C22', '#064E3B', '#059669']} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFillObject} />
                <Image source={require('../../../assets/auth_bg.png')} style={[StyleSheet.absoluteFillObject, { opacity: 0.2 }]} resizeMode="cover" />
                
                <Animated.View style={[styles.glowCircle1, { transform: [{ rotate: spin }, { scale: 1.2 }] }]} />
                <Animated.View style={[styles.glowCircle2, { transform: [{ rotate: spin }] }]} />
            </View>

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
            >
                {/* ── Top Bar Profil ── */}
                <Animated.View style={[styles.topBar, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <View style={styles.userInfo}>
                        <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.9} onPress={() => navigation.navigate('Profil')}>
                            <Animated.View style={[styles.avatarPulseGlow, { transform: [{ scale: pulseAnim }] }]} />
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>{initials}</Text>
                                </View>
                            )}
                            <View style={styles.onlineDot} />
                        </TouchableOpacity>
                        <View style={styles.userTexts}>
                            <Text style={styles.greeting}>{getGreeting()}</Text>
                            <Text style={styles.userName} numberOfLines={1}>
                                {profile?.prenom || t('Bienvenue')} {profile?.nom || ''}
                            </Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
                        <Bell size={24} color="#FFFFFF" strokeWidth={2} />
                        {unreadNotifs > 0 && (
                            <Animated.View style={[styles.notifBadge, { transform: [{ scale: pulseAnim }] }]}>
                                <Text style={styles.notifBadgeText}>{unreadNotifs}</Text>
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Hero Dossier (Noir et Néon) ── */}
                <Animated.View style={[styles.heroWrapper, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <View style={styles.heroCard}>
                        <LinearGradient colors={['#111827', '#0F172A']} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFillObject} />
                        <View style={styles.heroNeonGlow} />

                        <View style={styles.heroHeader}>
                            <View style={styles.heroBadge}>
                                <Shield size={14} color="#10B981" strokeWidth={2.5} />
                                <Text style={styles.heroBadgeText}>{t('ÉTAT DU DOSSIER')}</Text>
                            </View>
                            <TouchableOpacity style={styles.heroActionBtn} onPress={() => navigation.navigate('Dossier')}>
                                <Text style={styles.heroActionText}>{t('Suivre')}</Text>
                                <ChevronRight size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.heroTitle}>
                            {dossier ? (dossier.service_type || t('Dossier en cours')) : t('Lancer une nouvelle démarche')}
                        </Text>
                        
                        {dossier ? (
                            <View style={styles.progressSection}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressStatus}>{dossier.status.toUpperCase()}</Text>
                                    <Text style={styles.progressPercent}>{dossier.progress}%</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <LinearGradient 
                                        colors={['#34D399', '#10B981', '#059669']} 
                                        start={{x:0, y:0}} end={{x:1, y:0}} 
                                        style={[styles.progressBarFill, { width: `${dossier.progress}%` }]} 
                                    />
                                    {/* Neon tip on progress bar */}
                                    <View style={[styles.progressNeonTip, { left: `${dossier.progress}%` }]} />
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.heroSubText}>{t('Obtenez votre Nationalité ou réglez vos affaires courantes au Bénin en toute sérénité.')}</Text>
                        )}
                    </View>
                </Animated.View>

                {/* ── Nouvelle Section : La Boutique (Card Large Parallax) ── */}
                <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <Text style={styles.sectionTitle}>{t('Boutique RGB')}</Text>
                    
                    <TouchableOpacity style={styles.boutiqueCard} activeOpacity={0.9} onPress={() => navigation.navigate('Boutique' as never)}>
                        <LinearGradient colors={['#F59E0B', '#D97706', '#92400E']} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFillObject} />
                        
                        {/* Motif transparent */}
                        <Image source={require('../../../assets/auth_bg.png')} style={[StyleSheet.absoluteFillObject, { opacity: 0.1, tintColor: '#FFFFFF' }]} resizeMode="cover" />
                        
                        <View style={styles.boutiqueContent}>
                            <View style={styles.boutiqueTextContainer}>
                                <View style={styles.boutiquePill}>
                                    <Sparkles size={12} color="#FFF" />
                                    <Text style={styles.boutiquePillText}>{t('NOUVEAU')}</Text>
                                </View>
                                <Text style={styles.boutiqueTitle}>{t('Découvrez nos articles')}</Text>
                                <Text style={styles.boutiqueSub}>{t('Produits artisanaux et accessoires premium.')}</Text>
                            </View>
                            
                            <View style={styles.boutiqueIconWrap}>
                                <ShoppingBag size={32} color="#D97706" />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* ── Bento Grid Asymétrique (Accès Rapides) ── */}
                <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <Text style={styles.sectionTitle}>{t('Services Rapides')}</Text>
                    
                    <View style={styles.bentoGrid}>
                        {/* On affiche les 5 services dans une grille qui s'adapte */}
                        {SERVICES.map((action, idx) => {
                            // Le premier élément (Dossiers) ou le dernier peut prendre plus de place si on veut de l'asymétrie,
                            // ici on fait une grille classique mais très soignée.
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.bentoItem}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate(action.dest)}
                                >
                                    <View style={[styles.bentoIconBox, { backgroundColor: action.bg }]}>
                                        <action.Icon size={26} color={action.color} strokeWidth={2.5} />
                                        {action.badge && action.badge > 0 ? (
                                            <View style={styles.bentoBadge}>
                                                <Text style={styles.bentoBadgeText}>{action.badge}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.bentoLabel}>{action.label}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </Animated.View>

                {/* ── VIP Cultural Card (Le clou du spectacle) ── */}
                <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <Text style={styles.sectionTitle}>{t('Exclusivité RGB')}</Text>
                    
                    <TouchableOpacity style={styles.vipCard} activeOpacity={0.9} onPress={() => navigation.navigate('NationaliteForm')}>
                        {/* Le magnifique pattern culturel en fond */}
                        <Image source={require('../../../assets/auth_bg.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        <LinearGradient colors={['rgba(217, 119, 6, 0.85)', 'rgba(69, 26, 3, 0.95)']} style={StyleSheet.absoluteFillObject} />
                        
                        <View style={styles.vipContent}>
                            <View style={styles.vipBadgeRow}>
                                <View style={styles.vipBadge}>
                                    <Star size={14} color="#FEF3C7" fill="#FEF3C7" />
                                    <Text style={styles.vipBadgeText}>{t('SERVICE VIP')}</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.vipTitle}>{t('Nationalité Béninoise')}</Text>
                            <Text style={styles.vipDesc}>{t('L\'excellence à votre service. Un accompagnement prioritaire et ancestral pour votre retour aux sources.')}</Text>
                            
                            <View style={styles.vipFooter}>
                                <Text style={styles.vipActionText}>{t('Découvrir le privilège')}</Text>
                                <View style={styles.vipArrowWrap}>
                                    <ArrowRight size={20} color="#78350F" strokeWidth={3} />
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },

    // --- Header Background ---
    headerBackground: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 380,
        borderBottomLeftRadius: 60, borderBottomRightRadius: 60,
        overflow: 'hidden',
    },
    glowCircle1: {
        position: 'absolute', top: -100, right: -100,
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: '#10B981', opacity: 0.15,
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)'
    },
    glowCircle2: {
        position: 'absolute', top: 150, left: -150,
        width: 350, height: 350, borderRadius: 175,
        backgroundColor: '#FCD34D', opacity: 0.1,
    },

    // --- Top Bar ---
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        marginBottom: 35,
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrap: { position: 'relative', marginRight: 16 },
    avatarPulseGlow: {
        position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
        borderRadius: 40, backgroundColor: '#10B981', opacity: 0.4,
    },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#FFFFFF' },
    avatarPlaceholder: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
    avatarInitial: { fontSize: 20, fontFamily: fonts.heading, color: '#059669' },
    onlineDot: {
        position: 'absolute', bottom: 2, right: 2,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFFFFF',
    },
    userTexts: { flex: 1 },
    greeting: { fontSize: 14, color: '#A7F3D0', fontFamily: fonts.bodyMedium, letterSpacing: 0.5, opacity: 0.9 },
    userName: { fontFamily: fonts.heading, fontSize: 26, color: '#FFFFFF', marginTop: 2, letterSpacing: 0.5 },
    
    notifBtn: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    notifBadge: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: '#EF4444', borderRadius: 10,
        minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#064E3B',
    },
    notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: fonts.bodySemibold },

    // --- Hero Card (Neon Cyber Style) ---
    heroWrapper: { paddingHorizontal: spacing.lg, zIndex: 10 },
    heroCard: {
        backgroundColor: '#0F172A',
        borderRadius: 32,
        padding: spacing.xl,
        shadowColor: '#059669', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 35, elevation: 20,
        overflow: 'hidden',
    },
    heroNeonGlow: {
        position: 'absolute', top: -50, right: -50,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: '#10B981', opacity: 0.3, filter: 'blur(40px)',
    },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    heroBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    heroBadgeText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: '#10B981', letterSpacing: 1 },
    heroActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heroActionText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: '#9CA3AF' },
    
    heroTitle: { fontFamily: fonts.heading, fontSize: 26, color: '#FFFFFF', marginBottom: 8 },
    heroSubText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#9CA3AF', lineHeight: 22 },
    
    progressSection: { marginTop: 16 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressStatus: { fontFamily: fonts.bodySemibold, fontSize: 13, color: '#D1D5DB', letterSpacing: 1 },
    progressPercent: { fontFamily: fonts.heading, fontSize: 14, color: '#10B981' },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 4, overflow: 'visible', position: 'relative' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    progressNeonTip: {
        position: 'absolute', top: -3, width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#FFFFFF', shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5,
        transform: [{ translateX: -7 }]
    },

    // --- Sections ---
    sectionContainer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
    sectionTitle: { fontFamily: fonts.heading, fontSize: 20, color: '#0F172A', marginBottom: 16, letterSpacing: 0.5 },

    // --- Boutique Card (Wide Parallax) ---
    boutiqueCard: {
        borderRadius: 28, overflow: 'hidden',
        height: 120,
        shadowColor: '#D97706', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    boutiqueContent: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
    },
    boutiqueTextContainer: { flex: 1, marginRight: 20 },
    boutiquePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.25)', alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8,
    },
    boutiquePillText: { fontFamily: fonts.bodySemibold, fontSize: 10, color: '#FFFFFF', letterSpacing: 1 },
    boutiqueTitle: { fontFamily: fonts.heading, fontSize: 22, color: '#FFFFFF', marginBottom: 4 },
    boutiqueSub: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
    boutiqueIconWrap: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
    },

    // --- Bento Grid ---
    bentoGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },
    bentoItem: {
        width: (width - spacing.lg * 2 - 16) / 2, // 2 columns
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: spacing.xl,
        shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
        borderWidth: 1, borderColor: 'rgba(241, 245, 249, 0.8)',
    },
    bentoIconBox: {
        width: 52, height: 52, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
    },
    bentoBadge: {
        position: 'absolute', top: -6, right: -6,
        backgroundColor: '#EF4444', borderRadius: 12,
        minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
        borderWidth: 2, borderColor: '#FFFFFF',
    },
    bentoBadgeText: { color: '#FFFFFF', fontSize: 11, fontFamily: fonts.bodySemibold },
    bentoLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: '#1E293B' },

    // --- VIP Cultural Card ---
    vipCard: {
        borderRadius: 32, overflow: 'hidden',
        shadowColor: '#78350F', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.35, shadowRadius: 30, elevation: 15,
        marginBottom: 20,
    },
    vipContent: { padding: spacing.xl, paddingTop: 30 },
    vipBadgeRow: { marginBottom: 16 },
    vipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    vipBadgeText: { fontFamily: fonts.bodySemibold, fontSize: 11, color: '#FEF3C7', letterSpacing: 1 },
    vipTitle: { fontFamily: fonts.heading, fontSize: 28, color: '#FFFFFF', marginBottom: 12 },
    vipDesc: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#FEF3C7', lineHeight: 24, marginBottom: 24, opacity: 0.9 },
    vipFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    vipActionText: { fontFamily: fonts.heading, fontSize: 18, color: '#FFFFFF' },
    vipArrowWrap: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#FCD34D',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5,
    },
})
