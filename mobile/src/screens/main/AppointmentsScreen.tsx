import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Alert, ActivityIndicator, Modal,
    TextInput,
} from 'react-native'
import { ArrowLeft, Calendar, Clock, Plus, Send, User, XCircle } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Appointments'>

/* ── Types ── */
interface Appointment {
    id: string
    scheduled_at: string | null
    type: 'video' | 'phone' | 'in_person'
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
    notes?: string
    agent_name?: string
}

const TYPE_CONFIG = {
    video:     { icon: 'videocam-outline'     as const, label: 'Visioconférence', color: '#7C5CCA' },
    phone:     { icon: 'call-outline'         as const, label: 'Appel téléphonique', color: colors.info },
    in_person: { icon: 'location-outline'     as const, label: 'En présentiel', color: colors.primary },
}

const STATUS_CONFIG = {
    confirmed: { label: 'Confirmé',  color: colors.success, bg: colors.success + '12' },
    pending:   { label: 'En attente', color: colors.warning, bg: colors.warning + '12' },
    cancelled: { label: 'Annulé',    color: colors.danger,  bg: colors.danger  + '12' },
    completed: { label: 'Terminé',   color: colors.textMuted, bg: colors.surfaceElevated },
}

/* ═══════════════════════════════════════════════════════════
   Appointments Screen — RDV + demande de nouveau RDV
═══════════════════════════════════════════════════════════ */

export default function AppointmentsScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

    /* ── Form état ── */
    const [formType, setFormType] = useState<'video' | 'phone' | 'in_person'>('video')
    const [formNotes, setFormNotes] = useState('')

    const fetchAppointments = useCallback(async () => {
        if (!profile) return
        try {
            const { data } = await supabase
                .from('appointments')
                .select('id, scheduled_at, type, status, notes, agent_name')
                .eq('client_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(30)

            setAppointments((data || []) as Appointment[])
        } catch { /* ignore */ } finally { setLoading(false) }
    }, [profile])

    useEffect(() => { fetchAppointments() }, [fetchAppointments])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchAppointments()
        setRefreshing(false)
    }

    const now = new Date()
    const upcoming = appointments.filter(a =>
        (!a.scheduled_at || new Date(a.scheduled_at) >= now) &&
        a.status !== 'cancelled' && a.status !== 'completed'
    )
    const past = appointments.filter(a =>
        (a.scheduled_at && new Date(a.scheduled_at) < now) ||
        a.status === 'cancelled' || a.status === 'completed'
    )
    const displayed = tab === 'upcoming' ? upcoming : past

    /* ── Demander un RDV ── */
    const handleRequestAppointment = async () => {
        if (!formNotes.trim()) {
            Alert.alert(t('Champ requis'), t('Décrivez brièvement l\'objet de votre rendez-vous.'))
            return
        }

        setSubmitting(true)
        try {
            const { error } = await supabase.from('appointments').insert({
                client_id: profile!.id,
                type: formType,
                status: 'pending',
                notes: formNotes.trim(),
                scheduled_at: null,
            })

            if (error) throw error

            // Notif pour le client (stockée en FR — traduite à l'affichage via t() dans NotificationsScreen)
            await supabase.from('notifications').insert({
                user_id: profile!.id,
                title: 'Demande de RDV envoyée',
                body: 'Notre équipe vous contactera sous 24h pour confirmer votre rendez-vous.',
                type: 'appointment',
                is_read: false,
                created_at: new Date().toISOString(),
            })
            // Note: les strings ci-dessus sont stockées en français dans la DB
            // mais le NotificationsScreen les passe par t() pour les afficher
            // dans la langue du client.

            setShowModal(false)
            setFormNotes('')
            Alert.alert(
                t('Demande envoyée'),
                t('Notre équipe vous contactera sous 24h pour confirmer la date et l\'heure de votre rendez-vous.'),
            )
            await fetchAppointments()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('Erreur')
            Alert.alert(t('Erreur'), msg)
        } finally {
            setSubmitting(false)
        }
    }

    /* ── Annuler un RDV ── */
    const handleCancel = (id: string) => {
        Alert.alert(
            t('Annuler le rendez-vous'),
            t('Êtes-vous sûr de vouloir annuler ce rendez-vous ?'),
            [
                { text: t('Non'), style: 'cancel' },
                {
                    text: t('Oui, annuler'), style: 'destructive', onPress: async () => {
                        const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
                        if (error) {
                            Alert.alert(t('Erreur'), t("L'annulation a échoué. Réessayez."))
                            return
                        }
                        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
                    },
                },
            ]
        )
    }

    const formatDateTime = (iso: string | null) => {
        if (!iso) return t('Date à confirmer')
        const d = new Date(iso)
        return d.toLocaleDateString('fr-FR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }

    const formatDateShort = (iso: string | null) => {
        if (!iso) return '—'
        const d = new Date(iso)
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
                        <Text style={styles.headerTitle}>{t('Rendez-vous')}</Text>
                        <Text style={styles.headerSub}>
                            {upcoming.length > 0
                                ? `${upcoming.length} ${t('RDV à venir')}`
                                : t('Aucun RDV à venir')}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newRdvBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                        <Plus size={18} color="#FFF" strokeWidth={1.75} />
                        <Text style={styles.newRdvText}>{t('Demander')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Prochain RDV highlight */}
            {upcoming[0] && (
                <View style={styles.nextRdvCard}>
                    <View style={styles.nextRdvBadge}>
                        <Clock size={12} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.nextRdvBadgeText}>{t('Prochain rendez-vous')}</Text>
                    </View>
                    <Text style={styles.nextRdvTitle}>{t(TYPE_CONFIG[upcoming[0].type]?.label || 'Rendez-vous')}</Text>
                    <View style={styles.nextRdvRow}>
                        <Calendar size={14} color={colors.primary + 'AA'} strokeWidth={1.75} />
                        <Text style={styles.nextRdvDate}>{formatDateTime(upcoming[0].scheduled_at)}</Text>
                    </View>
                    {upcoming[0].agent_name && (
                        <View style={styles.nextRdvRow}>
                            <User size={14} color={colors.primary + 'AA'} strokeWidth={1.75} />
                            <Text style={styles.nextRdvDate}>{t('Avec')} {upcoming[0].agent_name}</Text>
                        </View>
                    )}
                    <View style={styles.nextRdvType}>
                        <Ionicons
                            name={TYPE_CONFIG[upcoming[0].type]?.icon || 'call-outline'}
                            size={14}
                            color={TYPE_CONFIG[upcoming[0].type]?.color || colors.primary}
                        />
                        <Text style={[styles.nextRdvTypeText, { color: TYPE_CONFIG[upcoming[0].type]?.color }]}>
                            {t(TYPE_CONFIG[upcoming[0].type]?.label)}
                        </Text>
                        <Text style={styles.nextRdvDuration}>• 30 min</Text>
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['upcoming', 'past'] as const).map((tabKey) => (
                    <TouchableOpacity
                        key={tabKey}
                        style={[styles.tab, tab === tabKey && styles.tabActive]}
                        onPress={() => setTab(tabKey)}
                    >
                        <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive]}>
                            {tabKey === 'upcoming' ? `${t('À venir')} (${upcoming.length})` : `${t('Passés')} (${past.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Liste */}
            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : displayed.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <Calendar size={36} color={colors.textMuted} strokeWidth={1.75} />
                    </View>
                    <Text style={styles.emptyTitle}>
                        {tab === 'upcoming' ? t('Aucun rendez-vous à venir') : t('Aucun rendez-vous passé')}
                    </Text>
                    <Text style={styles.emptyText}>
                        {tab === 'upcoming'
                            ? t('Demandez un rendez-vous avec notre équipe pour discuter de votre dossier.')
                            : t('L\'historique de vos rendez-vous apparaîtra ici.')}
                    </Text>
                    {tab === 'upcoming' && (
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                            <Calendar size={16} color="#FFF" strokeWidth={1.75} />
                            <Text style={styles.emptyBtnText}>{t('Prendre rendez-vous')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={styles.rdvList}>
                    {displayed.map((appt, i) => {
                        const tc = TYPE_CONFIG[appt.type] || TYPE_CONFIG.phone
                        const sc = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending
                        const canCancel = appt.status === 'confirmed' || appt.status === 'pending'
                        return (
                            <View key={appt.id} style={[styles.rdvCard, i < displayed.length - 1 && styles.rdvCardBorder]}>
                                <View style={styles.rdvDateCol}>
                                    <Text style={styles.rdvDay}>{formatDateShort(appt.scheduled_at).split(' ')[0]}</Text>
                                    <Text style={styles.rdvMonth}>{formatDateShort(appt.scheduled_at).split(' ')[1] || ''}</Text>
                                </View>
                                <View style={styles.rdvInfo}>
                                    <Text style={styles.rdvTitle} numberOfLines={1}>{t(tc.label)}</Text>
                                    <View style={styles.rdvMeta}>
                                        <Ionicons name={tc.icon} size={12} color={tc.color} />
                                        <Text style={[styles.rdvMetaText, { color: tc.color }]}>{t(tc.label)}</Text>
                                        <Text style={styles.rdvMetaDot}>•</Text>
                                        <Text style={styles.rdvMetaText}>30 min</Text>
                                    </View>
                                    {appt.agent_name && (
                                        <Text style={styles.rdvAgent}>{t('Avec')} {appt.agent_name}</Text>
                                    )}
                                </View>
                                <View style={styles.rdvRight}>
                                    <View style={[styles.rdvStatus, { backgroundColor: sc.bg }]}>
                                        <Text style={[styles.rdvStatusText, { color: sc.color }]}>{t(sc.label)}</Text>
                                    </View>
                                    {canCancel && (
                                        <TouchableOpacity onPress={() => handleCancel(appt.id)} style={styles.cancelBtn}>
                                            <XCircle size={18} color={colors.danger} strokeWidth={1.75} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}

            <View style={{ height: 100 }} />

            {/* ── Modal demande de RDV ── */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>{t('Demander un rendez-vous')}</Text>
                        <Text style={styles.modalSub}>{t('Notre équipe vous confirmera la date sous 24h')}</Text>

                        {/* Type de RDV */}
                        <Text style={styles.modalLabel}>{t('Type de rendez-vous')}</Text>
                        <View style={styles.typeRow}>
                            {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => (
                                <TouchableOpacity
                                    key={key}
                                    style={[styles.typeBtn, formType === key && { backgroundColor: cfg.color + '15', borderColor: cfg.color }]}
                                    onPress={() => setFormType(key)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={cfg.icon} size={18} color={formType === key ? cfg.color : colors.textMuted} />
                                    <Text style={[styles.typeBtnText, formType === key && { color: cfg.color }]}>
                                        {t(cfg.label)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Notes */}
                        <Text style={styles.modalLabel}>{t('Objet et disponibilités')} *</Text>
                        <TextInput
                            style={styles.notesInput}
                            value={formNotes}
                            onChangeText={setFormNotes}
                            placeholder={t("Ex : Suivi de mon dossier nationalité, disponible lundi et mercredi matin…")}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                            onPress={handleRequestAppointment}
                            disabled={submitting}
                            activeOpacity={0.85}
                        >
                            {submitting ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Send size={18} color="#FFF" strokeWidth={1.75} />
                                    <Text style={styles.submitBtnText}>{t('Envoyer la demande')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
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
    newRdvBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingHorizontal: 14, paddingVertical: 9,
    },
    newRdvText: { ...typography.caption, color: '#FFF', fontFamily: 'Inter_700Bold' },

    nextRdvCard: {
        margin: spacing.lg,
        backgroundColor: colors.headerBg,
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.primary + '30',
        ...shadows.md,
    },
    nextRdvBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        marginBottom: spacing.sm,
    },
    nextRdvBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: colors.primary, letterSpacing: 0.8 },
    nextRdvTitle: { ...typography.h3, color: colors.textOnDark, marginBottom: 8 },
    nextRdvRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    nextRdvDate: { ...typography.bodySmall, color: colors.primary + 'CC' },
    nextRdvType: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    nextRdvTypeText: { ...typography.caption, fontFamily: 'Inter_600SemiBold' },
    nextRdvDuration: { ...typography.caption, color: colors.textMuted },

    tabs: {
        flexDirection: 'row',
        marginHorizontal: spacing.lg,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary },
    tabText: { ...typography.label, color: colors.textMuted },
    tabTextActive: { color: '#FFF' },

    centerState: { padding: spacing.xxl, alignItems: 'center' },

    emptyCard: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.xl, alignItems: 'center',
        borderWidth: 1, borderColor: colors.borderLight,
    },
    emptyIconWrap: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.primary, borderRadius: radius.md,
        paddingHorizontal: 20, paddingVertical: 12, ...shadows.gold,
    },
    emptyBtnText: { ...typography.button, color: '#FFF', fontSize: 14 },

    rdvList: { marginHorizontal: spacing.lg },
    rdvCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: colors.surface,
        borderRadius: radius.md, padding: 14,
        marginBottom: 8,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.xs,
    },
    rdvCardBorder: { borderBottomWidth: 0 },
    rdvDateCol: {
        width: 44, alignItems: 'center',
        backgroundColor: colors.primary + '12',
        borderRadius: 10, paddingVertical: 8, marginRight: 12,
    },
    rdvDay: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.primary },
    rdvMonth: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.primary + 'AA', textTransform: 'uppercase' },
    rdvInfo: { flex: 1 },
    rdvTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 4 },
    rdvMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rdvMetaText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.textMuted },
    rdvMetaDot: { fontSize: 11, color: colors.textMuted },
    rdvAgent: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
    rdvRight: { alignItems: 'flex-end', gap: 8 },
    rdvStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    rdvStatusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
    cancelBtn: { padding: 2 },

    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
    },
    modalHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
    },
    modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
    modalSub: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
    modalLabel: { ...typography.label, color: colors.textPrimary, marginBottom: 10 },

    typeRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
    typeBtn: {
        flex: 1, alignItems: 'center', gap: 6, paddingVertical: 10,
        borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
        backgroundColor: colors.surfaceElevated,
    },
    typeBtnText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: colors.textMuted, textAlign: 'center' },

    notesInput: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
        padding: spacing.md, minHeight: 100,
        fontSize: 15, color: colors.textPrimary, fontFamily: 'Inter_400Regular',
        marginBottom: spacing.lg,
    },
    submitBtn: {
        backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        ...shadows.gold,
    },
    submitBtnDisabled: { opacity: 0.6 },
    submitBtnText: { ...typography.button, color: '#FFF' },
})
