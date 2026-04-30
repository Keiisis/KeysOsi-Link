import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { ArrowLeft, Bell } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Notifications from 'expo-notifications'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>

/* ── Types ── */
interface AppNotification {
    id: string
    title: string
    body: string
    type: 'dossier' | 'message' | 'payment' | 'appointment' | 'system'
    is_read: boolean
    created_at: string
}

const TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
    dossier:     { icon: 'folder-open-outline',       color: colors.primary,    bg: colors.primary + '12' },
    message:     { icon: 'chatbubble-ellipses-outline', color: colors.info,   bg: colors.info + '12' },
    payment:     { icon: 'card-outline',              color: colors.success, bg: colors.success + '12' },
    appointment: { icon: 'calendar-outline',          color: '#7C5CCA',      bg: '#7C5CCA12' },
    system:      { icon: 'information-circle-outline', color: colors.textMuted, bg: colors.surfaceElevated },
}

/* ═══════════════════════════════════════════════════════════
   Notifications Screen — Liste + gestion push token
═══════════════════════════════════════════════════════════ */

export default function NotificationsScreen({ navigation }: { navigation: Nav }) {
    const { profile, updateProfile } = useAuth()
    const [notifications, setNotifications] = useState<AppNotification[]>([])
    const { t } = useLang()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [pushEnabled, setPushEnabled] = useState(false)
    const [registeringPush, setRegisteringPush] = useState(false)

    /* ── Charger les notifications ── */
    const fetchNotifications = useCallback(async () => {
        if (!profile) return
        try {
            const { data } = await supabase
                .from('notifications')
                .select('id, title, body, type, is_read, created_at')
                .eq('user_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(50)

            setNotifications((data || []) as AppNotification[])
        } catch { /* ignore */ } finally { setLoading(false) }
    }, [profile])

    /* ── Vérifier état push ── */
    const checkPushStatus = useCallback(async () => {
        const { status } = await Notifications.getPermissionsAsync()
        setPushEnabled(status === 'granted' && !!profile?.push_token)
    }, [profile])

    useEffect(() => {
        fetchNotifications()
        checkPushStatus()
    }, [fetchNotifications, checkPushStatus])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchNotifications()
        setRefreshing(false)
    }

    /* ── Activer / désactiver push ── */
    const handleTogglePush = async (value: boolean) => {
        if (value) {
            setRegisteringPush(true)
            try {
                const { status: existing } = await Notifications.getPermissionsAsync()
                let finalStatus = existing

                if (existing !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync()
                    finalStatus = status
                }

                if (finalStatus !== 'granted') {
                    Alert.alert(
                        t('Permission refusée'),
                        t('Activez les notifications dans les paramètres de votre appareil pour recevoir des alertes.')
                    )
                    return
                }

                // EAS project ID lu depuis app.json (extra.eas.projectId)
                const tokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: '6101f41c-f687-4263-af3e-049669ec6973',
                })
                const token = tokenData.data

                await updateProfile({ push_token: token })
                setPushEnabled(true)
                Alert.alert(t('Notifications activées'), t('Vous recevrez désormais des alertes pour vos dossiers et messages.'))
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : t('Erreur')
                Alert.alert(t('Erreur'), msg)
            } finally {
                setRegisteringPush(false)
            }
        } else {
            Alert.alert(
                t('Désactiver les notifications'),
                t('Vous ne recevrez plus d\'alertes push. Vous pourrez les réactiver à tout moment.'),
                [
                    { text: t('Annuler'), style: 'cancel' },
                    {
                        text: t('Désactiver'), style: 'destructive', onPress: async () => {
                            await updateProfile({ push_token: undefined })
                            setPushEnabled(false)
                        },
                    },
                ]
            )
        }
    }

    /* ── Marquer une notif comme lue ── */
    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }

    /* ── Tout marquer comme lu ── */
    const markAllRead = async () => {
        if (!profile) return
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        await supabase.from('notifications')
            .update({ is_read: true })
            .eq('user_id', profile.id)
            .eq('is_read', false)
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    const formatDate = (iso: string) => {
        const d = new Date(iso)
        const now = new Date()
        const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
        if (diff < 60) return t('À l\'instant')
        if (diff < 3600) return `${t('Il y a')} ${Math.floor(diff / 60)} min`
        if (diff < 86400) return `${t('Il y a')} ${Math.floor(diff / 3600)} h`
        if (diff < 604800) return `${t('Il y a')} ${Math.floor(diff / 86400)} j`
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textOnDark} strokeWidth={1.75} />
                </TouchableOpacity>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>{t('Notifications')}</Text>
                        <Text style={styles.headerSub}>
                            {unreadCount > 0 ? `${unreadCount} ${t('non lue')}${unreadCount > 1 ? 's' : ''}` : t('Tout est à jour')}
                        </Text>
                    </View>
                    {unreadCount > 0 && (
                        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
                            <Text style={styles.markAllText}>{t('Tout lire')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Toggle Push */}
            <View style={styles.pushCard}>
                <View style={styles.pushLeft}>
                    <View style={[styles.pushIconWrap, { backgroundColor: pushEnabled ? colors.success + '15' : colors.surfaceElevated }]}>
                        <Ionicons
                            name={pushEnabled ? 'notifications' : 'notifications-off-outline'}
                            size={20}
                            color={pushEnabled ? colors.success : colors.textMuted}
                        />
                    </View>
                    <View>
                        <Text style={styles.pushLabel}>{t('Notifications push')}</Text>
                        <Text style={styles.pushSub}>
                            {pushEnabled ? t('Activées — alertes en temps réel') : t('Désactivées')}
                        </Text>
                    </View>
                </View>
                {registeringPush ? (
                    <ActivityIndicator color={colors.primary} />
                ) : (
                    <Switch
                        value={pushEnabled}
                        onValueChange={handleTogglePush}
                        trackColor={{ false: colors.border, true: colors.success + '60' }}
                        thumbColor={pushEnabled ? colors.success : colors.textMuted}
                    />
                )}
            </View>

            {/* Liste notifications */}
            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : notifications.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <Bell size={36} color={colors.textMuted} strokeWidth={1.75} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('Aucune notification')}</Text>
                    <Text style={styles.emptyText}>
                        {t('Vous serez alerté ici lors des mises à jour de vos dossiers, messages et rendez-vous.')}
                    </Text>
                </View>
            ) : (
                <View style={styles.notifList}>
                    {notifications.map((notif, i) => {
                        const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
                        return (
                            <TouchableOpacity
                                key={notif.id}
                                style={[
                                    styles.notifCard,
                                    !notif.is_read && styles.notifCardUnread,
                                    i === notifications.length - 1 && styles.notifCardLast,
                                ]}
                                onPress={() => markAsRead(notif.id)}
                                activeOpacity={0.7}
                            >
                                {/* Indicateur non-lu */}
                                {!notif.is_read && <View style={styles.unreadDot} />}

                                <View style={[styles.notifIcon, { backgroundColor: config.bg }]}>
                                    <Ionicons name={config.icon} size={18} color={config.color} />
                                </View>

                                <View style={styles.notifContent}>
                                    <View style={styles.notifTopRow}>
                                        <Text style={[styles.notifTitle, !notif.is_read && styles.notifTitleBold]} numberOfLines={1}>
                                            {t(notif.title)}
                                        </Text>
                                        <Text style={styles.notifTime}>{formatDate(notif.created_at)}</Text>
                                    </View>
                                    <Text style={styles.notifBody} numberOfLines={2}>{t(notif.body)}</Text>
                                </View>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            )}

            <View style={{ height: 100 }} />
        </ScrollView>
    )
}

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
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
    backBtn: { marginBottom: spacing.md },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.primary + 'AA', marginTop: 4 },
    markAllBtn: {
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: colors.primary + '20', borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.primary + '30',
    },
    markAllText: { ...typography.caption, color: colors.primary, fontFamily: 'Inter_600SemiBold' },

    pushCard: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        margin: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.sm,
    },
    pushLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    pushIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    pushLabel: { ...typography.label, color: colors.textPrimary },
    pushSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

    centerState: { padding: spacing.xxl, alignItems: 'center' },

    emptyCard: {
        margin: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1, borderColor: colors.borderLight,
    },
    emptyIconWrap: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

    notifList: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    notifCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.xs,
        position: 'relative',
        overflow: 'hidden',
    },
    notifCardUnread: {
        borderColor: colors.primary + '30',
        backgroundColor: colors.primary + '05',
    },
    notifCardLast: { marginBottom: 0 },
    unreadDot: {
        position: 'absolute', top: 14, left: 6,
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: colors.primary,
    },
    notifIcon: {
        width: 38, height: 38, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12, marginLeft: 6,
    },
    notifContent: { flex: 1 },
    notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notifTitle: { ...typography.label, color: colors.textPrimary, flex: 1 },
    notifTitleBold: { fontFamily: 'Inter_700Bold' },
    notifTime: { ...typography.caption, color: colors.textMuted, marginLeft: 8 },
    notifBody: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
})
