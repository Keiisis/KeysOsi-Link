import React, { useEffect, useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, Image,
    TouchableOpacity, RefreshControl, Dimensions, Platform
} from 'react-native'
import { Shield, Star, ArrowRight, Folder, MessageSquare, Bell, CreditCard, ShoppingBag, Award } from 'lucide-react-native'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

const { width } = Dimensions.get('window')
const CARD_GAP = 12
const CARD_W = (width - spacing.lg * 2 - CARD_GAP * 2) / 3 // 3 columns for quick actions

/* ═══════════════════════════════════════════════════════════
   Home Screen — Ultra Premium Dashboard
═══════════════════════════════════════════════════════════ */

interface DossierSummary { status: string; progress: number; service_type: string }

export default function HomeScreen({ navigation }: any) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [refreshing, setRefreshing] = useState(false)
    const [dossier, setDossier] = useState<DossierSummary | null>(null)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [unreadNotifs, setUnreadNotifs] = useState(0)

    const fetchData = async () => {
        if (!profile) return
        try {
            const [dossierRes, msgRes, notifRes] = await Promise.all([
                supabase.from('dossiers').select('status, progress, service_type')
                    .eq('client_id', profile.id).order('created_at', { ascending: false }).limit(1).single(),
                supabase.from('messages').select('*', { count: 'exact', head: true })
                    .eq('recipient_id', profile.id).eq('is_read', false),
                supabase.from('notifications').select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id).eq('is_read', false),
            ])
            if (dossierRes.data) setDossier(dossierRes.data)
            setUnreadMessages(msgRes.count || 0)
            setUnreadNotifs(notifRes.count || 0)
        } catch { /* silent */ }
    }

    useEffect(() => { fetchData() }, [profile])
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

    const getGreeting = () => {
        const h = new Date().getHours()
        return h < 12 ? t('Bonjour') : h < 18 ? t('Bon après-midi') : t('Bonsoir')
    }

    const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')).toUpperCase() || 'C'

    const SHORTCUTS = [
        { Icon: Award, label: t('Nationalité'), color: colors.primary, dest: 'Services' },
        { Icon: Folder, label: t('Dossier'), color: '#1B2A4A', dest: 'Dossier' },
        { Icon: MessageSquare, label: t('Messages'), color: '#7C5CCA', badge: unreadMessages, dest: 'Messages' },
        { Icon: Bell, label: t('Alertes'), color: '#E07B54', badge: unreadNotifs, dest: 'Notifications' },
        { Icon: CreditCard, label: t('Paiements'), color: '#3B82C4', dest: 'Payments' },
        { Icon: ShoppingBag, label: t('Boutique'), color: '#0F766E', dest: 'Boutique' },
    ]

    const statusConfig: Record<string, { label: string; color: string }> = {
        'soumis':     { label: t('Dossier soumis'),           color: colors.info },
        'verifie':    { label: t('En cours de vérification'), color: colors.warning },
        'traitement': { label: t('En cours de traitement'),   color: colors.primary },
        'validation': { label: t('En attente de validation'), color: '#7C5CCA' },
        'termine':    { label: t('Terminé'),                  color: colors.success },
        'annule':     { label: t('Annulé'),                   color: colors.danger },
        // anciennes valeurs (rétrocompatibilité)
        'en_cours':   { label: t('En cours de traitement'),   color: colors.primary },
        'en_attente': { label: t('En attente de documents'),  color: colors.warning },
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            {/* ── Header Bleu Nuit Premium ── */}
            <View style={styles.header}>
                <View style={styles.headerGoldTop} />
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName} numberOfLines={1}>
                            {profile?.prenom || t('Client')} {profile?.nom || ''}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => navigation.navigate('Profil')}>
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitial}>{initials}</Text>
                            </View>
                        )}
                        <View style={styles.onlineDot} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Status Banner Exceptionnel ── */}
            <View style={styles.dossierBanner}>
                <View style={styles.dossierBannerLeft}>
                    <View style={styles.dossierBannerBadge}>
                        <Shield size={12} color={colors.primary} strokeWidth={2.5} />
                        <Text style={styles.dossierBannerBadgeText}>{t('ESPACE SÉCURISÉ')}</Text>
                    </View>
                    <Text style={styles.dossierBannerTitle}>
                        {dossier ? (dossier.service_type || t('Votre dossier en cours')) : t('Démarrer votre projet')}
                    </Text>
                    <Text style={styles.dossierBannerSub}>
                        {dossier
                            ? (statusConfig[dossier.status]?.label || dossier.status)
                            : t('Explorez nos services d\'accompagnement')
                        }
                    </Text>
                    {dossier && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBarWrap}>
                                <View style={[styles.progressBar, { width: `${dossier.progress}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{dossier.progress}%</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* ── Accès Rapides Centralisés ── */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('Accès rapide')}</Text>
            </View>

            <View style={styles.actionsGrid}>
                {SHORTCUTS.map((action, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.actionCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate(action.dest)}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: action.color + '10' }]}>
                            <action.Icon size={24} color={action.color} strokeWidth={1.75} />
                            {action.badge && action.badge > 0 ? (
                                <View style={styles.actionBadge}>
                                    <Text style={styles.actionBadgeText}>{action.badge}</Text>
                                </View>
                            ) : null}
                        </View>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Section Services VIP ── */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('Service Phare')}</Text>
            </View>

            <TouchableOpacity style={styles.vipCard} activeOpacity={0.85} onPress={() => navigation.navigate('Services')}>
                <View style={styles.vipContent}>
                    <View style={styles.vipBadge}>
                        <Star size={12} color="#FFF" fill="#FFF" strokeWidth={2} />
                        <Text style={styles.vipBadgeText}>{t('EXCLUSIF')}</Text>
                    </View>
                    <Text style={styles.vipTitle}>{t('Nationalité Béninoise VIP')}</Text>
                    <Text style={styles.vipDesc}>{t('Récupérez votre nationalité avec un accompagnement prioritaire de A à Z par nos experts.')}</Text>
                    <View style={styles.vipFooter}>
                        <Text style={styles.vipActionText}>{t('En savoir plus')}</Text>
                        <ArrowRight size={14} color={colors.primary} strokeWidth={2} />
                    </View>
                </View>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 40,
        paddingHorizontal: spacing.xl,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
    },
    headerGoldTop: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4, backgroundColor: colors.primary,
    },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flex: 1, marginRight: 16 },
    greeting: { fontSize: 13, color: colors.primaryLight, fontFamily: 'Inter_600SemiBold', opacity: 0.9, letterSpacing: 0.5 },
    userName: { ...typography.h2, color: '#FFF', marginTop: 4, letterSpacing: 0.5 },
    avatarWrap: { position: 'relative' },
    avatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.primary },
    avatarPlaceholder: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: colors.primary + '25', borderWidth: 2, borderColor: colors.primary + '60',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitial: { fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.primaryLight },
    onlineDot: {
        position: 'absolute', bottom: 2, right: 2,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: colors.success, borderWidth: 2, borderColor: colors.headerBg,
    },

    // Dossier Banner (Elevated, Overlapping Header)
    dossierBanner: {
        marginHorizontal: spacing.lg, marginTop: -20,
        backgroundColor: colors.surface,
        borderRadius: radius.xl, padding: spacing.xl,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.lg,
    },
    dossierBannerLeft: { zIndex: 1 },
    dossierBannerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primaryMuted, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
        marginBottom: 12,
    },
    dossierBannerBadgeText: { ...typography.overline, fontSize: 10, color: colors.primaryDark },
    dossierBannerTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 6 },
    dossierBannerSub: { ...typography.bodySmall, color: colors.textSecondary },
    progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 12 },
    progressBarWrap: {
        flex: 1, height: 8, backgroundColor: colors.borderLight,
        borderRadius: 4, overflow: 'hidden',
    },
    progressBar: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
    progressText: { ...typography.label, color: colors.primary, width: 36, textAlign: 'right' },

    // Section
    sectionHeader: {
        marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.md,
    },
    sectionTitle: { ...typography.h3, fontSize: 18, color: colors.textPrimary },

    // Actions Grid (3 columns, centered, highly symmetrical)
    actionsGrid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: spacing.lg, gap: CARD_GAP,
        justifyContent: 'center',
    },
    actionCard: {
        width: CARD_W,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingVertical: 18,
        paddingHorizontal: 8,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.xs,
        alignItems: 'center', justifyContent: 'center',
    },
    actionIconWrap: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    actionBadge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: colors.danger, borderRadius: 10,
        minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
        borderWidth: 2, borderColor: colors.surface,
    },
    actionBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Inter_700Bold' },
    actionLabel: { ...typography.label, fontSize: 11, color: colors.textPrimary, textAlign: 'center' },

    // VIP Card
    vipCard: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surfaceWarm,
        borderRadius: radius.xl,
        borderWidth: 1, borderColor: colors.borderGold,
        ...shadows.gold,
        overflow: 'hidden',
    },
    vipContent: { padding: spacing.xl },
    vipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.primary, borderRadius: 4,
        paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
        marginBottom: 12,
    },
    vipBadgeText: { ...typography.overline, fontSize: 9, color: '#FFF' },
    vipTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    vipDesc: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22, marginBottom: 16 },
    vipFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    vipActionText: { ...typography.label, color: colors.primary },
})
