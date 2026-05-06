'use strict'
import React, { useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { ArrowLeft, CheckCircle, HelpCircle, Info, Star } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { fetchWithTimeout } from '../../lib/fetch'
import KkiapayModal from '../../components/KkiapayModal'
import type { AppEvent } from './EventsScreen'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLong(iso: string) {
    return new Date(iso).toLocaleDateString('fr-FR', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    })
}
function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function formatPrice(price: number, currency: string, t: any) {
    if (price === 0) return t('Gratuit')
    return `${price.toLocaleString('fr-FR')} ${currency}`
}

const CATEGORY_COLORS: Record<string, string> = {
    'Gala': colors.primary, 'Forum': '#3B82C4',
    'Tourisme': '#E07B54', 'Séminaire': '#7C5CCA', 'Conférence': '#2D9F63',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventDetailScreen({ route, navigation }: any) {
    const { event } = route.params as { event: AppEvent }
    const { profile } = useAuth()

    const { t } = useLang()
    const [loading, setLoading] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<'standard' | 'vip'>('standard')
    const [showModal, setShowModal] = useState(false)
    const [registration, setRegistration] = useState(event.my_registration || null)
    // Paiement Kkiapay direct (pour events payants)
    const [showKkiapay, setShowKkiapay] = useState(false)
    const [pendingRegistration, setPendingRegistration] = useState<{ id: string; amount: number } | null>(null)

    const catColor = CATEGORY_COLORS[event.category || ''] || colors.primary
    const isFree = event.price_standard === 0
    const hasVip = (event.price_vip ?? 0) > 0
    const isRegistered = !!registration

    const selectedPrice = selectedTicket === 'vip' ? (event.price_vip || 0) : event.price_standard
    const isFreeTicket = selectedPrice === 0

    const handleRegister = async () => {
        if (!profile) {
            Alert.alert(t('Non connecté'), t('Veuillez vous connecter pour vous inscrire.'))
            return
        }
        setLoading(true)
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/mobile/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 15000,
                body: JSON.stringify({
                    event_id: event.id,
                    client_id: profile.id,
                    ticket_type: selectedTicket,
                    quantity: 1,
                }),
            })
            const text = await res.text()
            let json: Record<string, unknown> = {}
            try { json = JSON.parse(text) } catch { throw new Error(`Erreur serveur (${res.status})`) }

            if (!res.ok && res.status !== 200) {
                throw new Error((json.error as string) || `Erreur ${res.status}`)
            }

            const reg = (json.registration as { id: string; status: string; ticket_type: string; payment_status?: string }) ||
                (json.exists ? { ...(json.registration as object || {}), status: 'confirmed' } : null)

            setRegistration(reg)
            setShowModal(false)

            if (json.exists) {
                Alert.alert(t('Déjà inscrit'), t('Vous êtes déjà inscrit à cet événement.'), [{ text: 'OK' }])
                return
            }

            // Inscription gratuite → confirmée immédiatement
            if (isFreeTicket) {
                Alert.alert(
                    t('✅ Inscription confirmée !'),
                    t('Votre place est réservée pour "{eventTitle}".\n\nUn email de confirmation vous sera envoyé.').replace('{eventTitle}', event.title),
                    [{ text: t('Parfait !') }]
                )
                return
            }

            // Inscription payante → ouvrir Kkiapay pour finaliser tout de suite
            if (reg?.id) {
                setPendingRegistration({ id: reg.id, amount: selectedPrice })
                setShowKkiapay(true)
            }
        } catch (e: unknown) {
            Alert.alert(t('Erreur'), e instanceof Error ? e.message : t('Impossible de s\'inscrire'))
        } finally {
            setLoading(false)
        }
    }

    /* ── Confirmer le paiement Kkiapay → PATCH registration ── */
    const handlePaymentSuccess = async (txId: string) => {
        setShowKkiapay(false)
        if (!pendingRegistration) return
        setLoading(true)
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/mobile/events`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 15000,
                body: JSON.stringify({
                    registration_id: pendingRegistration.id,
                    transaction_id: txId,
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data.ok) {
                Alert.alert(
                    t('Paiement reçu — confirmation manuelle requise'),
                    t('Votre paiement a été reçu (réf : {tx}) mais la confirmation automatique a échoué. Notre équipe vérifiera votre billet sous 24h.').replace('{tx}', txId),
                )
                return
            }

            setRegistration({ id: pendingRegistration.id, status: 'confirmed', ticket_type: selectedTicket })
            setPendingRegistration(null)

            Alert.alert(
                t('✅ Paiement confirmé !'),
                t('Votre place pour "{eventTitle}" est réservée. Un email de confirmation vous sera envoyé.').replace('{eventTitle}', event.title),
                [{ text: t('Parfait !') }]
            )
        } catch (e: unknown) {
            Alert.alert(
                t('Erreur'),
                t('Paiement reçu (réf : {tx}) mais confirmation impossible. Contactez le support.').replace('{tx}', txId),
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Header coloré */}
                <View style={[styles.header, { backgroundColor: catColor }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <View style={styles.backCircle}>
                            <ArrowLeft size={20} color="#FFF" strokeWidth={1.75} />
                        </View>
                    </TouchableOpacity>

                    {/* Pattern décoratif */}
                    <View style={styles.headerPattern} />

                    {/* Badges */}
                    <View style={styles.headerBadges}>
                        {event.is_featured && (
                            <View style={styles.featuredBadge}>
                                <Star size={9} color={catColor} strokeWidth={1.75} />
                                <Text style={[styles.featuredText, { color: catColor }]}>{t('À la une')}</Text>
                            </View>
                        )}
                        {event.category && (
                            <View style={styles.catBadge}>
                                <Text style={styles.catText}>{event.category}</Text>
                            </View>
                        )}
                    </View>

                    {/* Grande date */}
                    <View style={styles.headerDateWrap}>
                        <Text style={styles.headerDay}>{new Date(event.start_date).getDate()}</Text>
                        <Text style={styles.headerMonth}>
                            {new Date(event.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </Text>
                    </View>

                    {isRegistered && (
                        <View style={styles.registeredBanner}>
                            <CheckCircle size={16} color={colors.success} strokeWidth={1.75} />
                            <Text style={styles.registeredText}>{t('Vous êtes inscrit')}</Text>
                        </View>
                    )}
                </View>

                {/* Carte principale */}
                <View style={styles.card}>
                    <Text style={styles.title}>{event.title}</Text>

                    {/* Méta-infos */}
                    <View style={styles.metaGrid}>
                        {[
                            { icon: 'calendar-outline' as const, label: t('Date'), value: formatDateLong(event.start_date) },
                            { icon: 'time-outline' as const, label: t('Heure'), value: `${formatTime(event.start_date)}${event.end_date ? ` → ${formatTime(event.end_date)}` : ''}` },
                            { icon: 'location-outline' as const, label: t('Lieu'), value: event.address || event.location },
                            { icon: 'people-outline' as const, label: t('Capacité'), value: event.max_capacity ? `${event.max_capacity} ${t('places')}` : t('Non limité') },
                        ].map((item, i) => (
                            <View key={i} style={styles.metaItem}>
                                <View style={[styles.metaIcon, { backgroundColor: catColor + '15' }]}>
                                    <Ionicons name={item.icon} size={16} color={catColor} />
                                </View>
                                <View style={styles.metaText}>
                                    <Text style={styles.metaLabel}>{item.label}</Text>
                                    <Text style={styles.metaValue} numberOfLines={2}>{item.value}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider} />

                    {/* Description */}
                    <Text style={styles.sectionTitle}>{t('À propos de l\'événement')}</Text>
                    <Text style={styles.description}>{event.description || event.short_description || t('Rejoignez-nous pour cet événement exceptionnel organisé par Retour Gagnant Bénin.')}</Text>

                    <View style={styles.divider} />

                    {/* Tarifs */}
                    <Text style={styles.sectionTitle}>{t('Tarifs & Billets')}</Text>

                    {/* Standard */}
                    <TouchableOpacity
                        style={[styles.ticketCard, selectedTicket === 'standard' && { borderColor: catColor, backgroundColor: catColor + '08' }]}
                        onPress={() => setSelectedTicket('standard')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.ticketRadio, selectedTicket === 'standard' && { borderColor: catColor }]}>
                            {selectedTicket === 'standard' && <View style={[styles.ticketRadioInner, { backgroundColor: catColor }]} />}
                        </View>
                        <View style={styles.ticketInfo}>
                            <Text style={styles.ticketName}>{t('Billet Standard')}</Text>
                            <Text style={styles.ticketDesc}>{t('Accès à l\'événement, networking')}</Text>
                        </View>
                        <Text style={[styles.ticketPrice, isFree && { color: colors.success }]}>
                            {formatPrice(event.price_standard, event.currency, t)}
                        </Text>
                    </TouchableOpacity>

                    {/* VIP */}
                    {hasVip && (
                        <TouchableOpacity
                            style={[styles.ticketCard, selectedTicket === 'vip' && { borderColor: catColor, backgroundColor: catColor + '08' }]}
                            onPress={() => setSelectedTicket('vip')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.ticketRadio, selectedTicket === 'vip' && { borderColor: catColor }]}>
                                {selectedTicket === 'vip' && <View style={[styles.ticketRadioInner, { backgroundColor: catColor }]} />}
                            </View>
                            <View style={styles.ticketInfo}>
                                <View style={styles.vipRow}>
                                    <Text style={styles.ticketName}>{t('Billet VIP')}</Text>
                                    <View style={[styles.vipBadge, { backgroundColor: catColor + '20' }]}>
                                        <Star size={8} color={catColor} strokeWidth={1.75} />
                                        <Text style={[styles.vipBadgeText, { color: catColor }]}>VIP</Text>
                                    </View>
                                </View>
                                <Text style={styles.ticketDesc}>{t('Accès prioritaire, places réservées, cocktail')}</Text>
                            </View>
                            <Text style={styles.ticketPrice}>
                                {formatPrice(event.price_vip || 0, event.currency, t)}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bouton fixe bas */}
            <View style={styles.stickyBtn}>
                {isRegistered ? (
                    <View style={[styles.btnRegistered, { backgroundColor: colors.successBg, borderColor: colors.success + '40' }]}>
                        <CheckCircle size={20} color={colors.success} strokeWidth={1.75} />
                        <Text style={[styles.btnText, { color: colors.success }]}>{t('Inscription confirmée')}</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: catColor }, loading && styles.btnDisabled]}
                        activeOpacity={0.88}
                        onPress={() => setShowModal(true)}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Ionicons name="ticket-outline" size={20} color="#FFF" />
                                <Text style={styles.btnText}>
                                    {t('S\'inscrire ·')} {formatPrice(selectedPrice, event.currency, t)}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Modal confirmation */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
                <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowModal(false)}>
                    <View style={styles.sheet}>
                        <View style={styles.sheetHandle} />
                        <Text style={styles.sheetTitle}>{t('Confirmer l\'inscription')}</Text>
                        <Text style={styles.sheetEvent} numberOfLines={2}>{event.title}</Text>

                        <View style={styles.sheetInfoRow}>
                            <Ionicons name="ticket-outline" size={16} color={catColor} />
                            <Text style={styles.sheetInfoText}>
                                {t('Billet')} <Text style={{ fontFamily: 'Inter_700Bold', color: catColor }}>{selectedTicket.toUpperCase()}</Text>
                            </Text>
                            <Text style={[styles.sheetPrice, { color: catColor }]}>
                                {formatPrice(selectedPrice, event.currency, t)}
                            </Text>
                        </View>

                        {!isFreeTicket && (
                            <View style={styles.payNotice}>
                                <Info size={15} color={colors.info} strokeWidth={1.75} />
                                <Text style={styles.payNoticeText}>
                                    {t('Après inscription, vous recevrez les instructions de paiement par WhatsApp ou email.')}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.confirmBtn, { backgroundColor: catColor }, loading && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="#FFF" size="small" />
                                : <Text style={styles.confirmBtnText}>
                                    {isFreeTicket ? t('Confirmer l\'inscription') : t('Confirmer et payer plus tard')}
                                </Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                            <Text style={styles.cancelText}>{t('Annuler')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Paiement Kkiapay direct (events payants) */}
            <KkiapayModal
                visible={showKkiapay}
                amount={String(pendingRegistration?.amount || selectedPrice)}
                serviceName={`${event.title} — ${selectedTicket === 'vip' ? 'VIP' : 'Standard'}`}
                onClose={() => setShowKkiapay(false)}
                onSuccess={handlePaymentSuccess}
            />
        </LinearGradient>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingBottom: spacing.xl },

    header: {
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 60,
        paddingHorizontal: spacing.lg,
        position: 'relative',
        alignItems: 'center',
    },
    backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: spacing.lg },
    backCircle: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.22)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerPattern: { position: 'absolute', inset: 0, opacity: 0.07 },
    headerBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
    featuredBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    featuredText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
    catBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    catText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF' },
    headerDateWrap: { alignItems: 'center', marginTop: 16 },
    headerDay: { fontSize: 56, fontFamily: 'Inter_800ExtraBold', color: '#FFF', lineHeight: 60 },
    headerMonth: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize' },
    registeredBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.successBg, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7, marginTop: 14,
    },
    registeredText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.success },

    card: {
        marginHorizontal: spacing.lg,
        marginTop: -28,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadows.lg,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 16, textAlign: 'center' },

    metaGrid: { gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    metaIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    metaText: { flex: 1 },
    metaLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.textMuted, marginBottom: 2 },
    metaValue: { ...typography.bodySmall, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },

    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.lg },

    sectionTitle: { ...typography.h3, fontSize: 15, color: colors.textPrimary, marginBottom: 12 },
    description: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },

    // Tickets
    ticketCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        padding: 14, borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.borderLight,
        marginBottom: 10,
    },
    ticketRadio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
    },
    ticketRadioInner: { width: 10, height: 10, borderRadius: 5 },
    ticketInfo: { flex: 1 },
    ticketName: { ...typography.label, color: colors.textPrimary },
    ticketDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    ticketPrice: { ...typography.label, color: colors.textPrimary, fontSize: 14 },
    vipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    vipBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    vipBadgeText: { fontSize: 9, fontFamily: 'Inter_800ExtraBold' },

    // Bouton fixe
    stickyBtn: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        paddingTop: 14,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
        ...shadows.md,
    },
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16, borderRadius: radius.md,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
    },
    btnRegistered: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10, paddingVertical: 16, borderRadius: radius.md, borderWidth: 1.5,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },

    // Modal
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
        gap: 12,
    },
    sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 8 },
    sheetTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
    sheetEvent: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
    sheetInfoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: 14,
    },
    sheetInfoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
    sheetPrice: { fontSize: 14, fontFamily: 'Inter_800ExtraBold' },
    payNotice: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: colors.infoBg, borderRadius: radius.md, padding: 12,
    },
    payNoticeText: { ...typography.caption, color: colors.info, flex: 1, lineHeight: 18 },
    confirmBtn: {
        paddingVertical: 15, borderRadius: radius.md,
        alignItems: 'center', justifyContent: 'center',
    },
    confirmBtnText: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
    cancelBtn: { paddingVertical: 12, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: radius.md },
    cancelText: { ...typography.button, color: colors.textSecondary },
})
