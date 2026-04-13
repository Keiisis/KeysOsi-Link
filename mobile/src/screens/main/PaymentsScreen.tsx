import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Alert, ActivityIndicator, Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Payments'>

/* ── Types ── */
interface Payment {
    id: string
    amount: number
    currency: string
    status: 'pending' | 'success' | 'failed' | 'refunded'
    reason: string
    transaction_id: string
    gateway: string
    created_at: string
}

const STATUS_CONFIG = {
    success:  { label: 'Payé',       icon: 'checkmark-circle'  as const, color: colors.success },
    pending:  { label: 'En attente', icon: 'time-outline'       as const, color: colors.warning },
    failed:   { label: 'Échoué',     icon: 'close-circle'       as const, color: colors.danger  },
    refunded: { label: 'Remboursé',  icon: 'arrow-undo-circle'  as const, color: colors.info    },
}

/* NOTE: Pour une intégration Kkiapay in-app (WebView),
   installez : npx expo install react-native-webview
   et remplacez Linking.openURL par un modal WebView avec l'URL Kkiapay.
*/

/* ═══════════════════════════════════════════════════════════
   Payments Screen — Historique + initier paiement Kkiapay
═══════════════════════════════════════════════════════════ */

export default function PaymentsScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [kkiapayKey, setKkiapayKey] = useState<string | null>(null)

    /* ── Charger l'historique ── */
    const fetchPayments = useCallback(async () => {
        if (!profile) return
        try {
            const { data } = await supabase
                .from('paiements')
                .select('id, amount, currency, status, reason, transaction_id, gateway, created_at')
                .eq('client_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(30)

            setPayments((data || []) as Payment[])
        } catch { /* ignore */ } finally { setLoading(false) }
    }, [profile])

    /* ── Charger la clé publique Kkiapay depuis settings ── */
    const fetchKkiapayKey = useCallback(async () => {
        try {
            const { data } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'kkiapay_public_key')
                .single()

            if (data?.value) setKkiapayKey(data.value)
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        fetchPayments()
        fetchKkiapayKey()
    }, [fetchPayments, fetchKkiapayKey])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchPayments()
        setRefreshing(false)
    }

    /* ── Initier un paiement Kkiapay ── */
    const handleInitPayment = async (amount: number, description: string, dossierId?: string) => {
        if (!profile || !kkiapayKey) {
            Alert.alert('Configuration', 'La passerelle de paiement n\'est pas configurée. Veuillez contacter le support.')
            return
        }

        // Construire l'URL Kkiapay (checkout web)
        const transactionId = `RG-${profile.id.slice(0, 8)}-${Date.now()}`
        const callbackUrl = `retour-gagnant://payment-callback?ref=${transactionId}`
        const kkiapayUrl = `https://kkiapay.me/pay?`
            + `amount=${amount}`
            + `&key=${kkiapayKey}`
            + `&reason=${encodeURIComponent(description)}`
            + `&fullname=${encodeURIComponent(`${profile.prenom} ${profile.nom}`)}`
            + `&email=${encodeURIComponent(profile.email)}`
            + `&phone=${encodeURIComponent(profile.phone || '')}`
            + `&callback=${encodeURIComponent(callbackUrl)}`
            + `&data=${encodeURIComponent(JSON.stringify({ transaction_id: transactionId, client_id: profile.id, dossier_id: dossierId }))}`

        // Enregistrer le paiement en attente
        await supabase.from('paiements').insert({
            client_id: profile.id,
            dossier_id: dossierId || null,
            amount,
            currency: 'XOF',
            status: 'pending',
            reason: description,
            transaction_id: transactionId,
            gateway: 'kkiapay',
        })

        // Ouvrir Kkiapay dans le navigateur
        const canOpen = await Linking.canOpenURL(kkiapayUrl)
        if (canOpen) {
            await Linking.openURL(kkiapayUrl)
            Alert.alert(
                'Paiement initié',
                'Vous avez été redirigé vers Kkiapay pour finaliser le paiement. Actualisez cet écran après le paiement.',
                [{ text: 'OK' }]
            )
        } else {
            Alert.alert('Erreur', 'Impossible d\'ouvrir la page de paiement.')
        }

        await fetchPayments()
    }

    /* ── Formatage montant ── */
    const formatAmount = (amount: number, currency: string) => {
        if (currency === 'XOF' || currency === 'XAF') return `${amount.toLocaleString('fr-FR')} FCFA`
        if (currency === 'EUR') return `${amount.toLocaleString('fr-FR')} €`
        if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`
        return `${amount} ${currency}`
    }

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    const totalPaid = payments
        .filter(p => p.status === 'success')
        .reduce((acc, p) => acc + p.amount, 0)

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.goldLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={colors.textOnDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Paiements</Text>
                <Text style={styles.headerSub}>Historique et facturation</Text>
            </View>

            {/* Résumé */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                    <Text style={styles.summaryLabel}>Total payé</Text>
                    <Text style={styles.summaryAmount}>{formatAmount(totalPaid, 'XOF')}</Text>
                    <Text style={styles.summaryCount}>{payments.filter(p => p.status === 'success').length} transaction(s)</Text>
                </View>
                <View style={styles.summaryIcon}>
                    <Ionicons name="card" size={28} color={colors.gold} />
                </View>
            </View>

            {/* Bouton nouveau paiement (si un dossier existe) */}
            <TouchableOpacity
                style={styles.newPaymentBtn}
                activeOpacity={0.8}
                onPress={() => {
                    Alert.prompt?.(
                        'Montant à payer',
                        'Entrez le montant en FCFA',
                        [
                            { text: 'Annuler', style: 'cancel' },
                            {
                                text: 'Payer via Kkiapay',
                                onPress: (value) => {
                                    const amount = parseInt(value || '0', 10)
                                    if (!amount || amount < 100) {
                                        Alert.alert('Montant invalide', 'Veuillez entrer un montant valide.')
                                        return
                                    }
                                    handleInitPayment(amount, 'Paiement service Retour Gagnant')
                                },
                            },
                        ],
                        'plain-text',
                        '',
                        'numeric'
                    ) ?? Alert.alert(
                        'Paiement Kkiapay',
                        'Contactez notre équipe pour effectuer un paiement ou consultez votre dossier.',
                    )
                }}
            >
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.newPaymentBtnText}>Effectuer un paiement</Text>
            </TouchableOpacity>

            {/* Liste */}
            <View style={styles.listHeader}>
                <Ionicons name="receipt-outline" size={18} color={colors.gold} />
                <Text style={styles.listTitle}>Transactions ({payments.length})</Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.gold} size="large" />
                </View>
            ) : payments.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                    </View>
                    <Text style={styles.emptyTitle}>Aucune transaction</Text>
                    <Text style={styles.emptyText}>
                        Vos paiements apparaîtront ici. Utilisez le bouton ci-dessus pour effectuer un paiement sécurisé via Kkiapay.
                    </Text>
                </View>
            ) : (
                <View style={styles.paymentList}>
                    {payments.map((payment, i) => {
                        const st = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending
                        return (
                            <View
                                key={payment.id}
                                style={[styles.paymentCard, i === payments.length - 1 && styles.paymentCardLast]}
                            >
                                <View style={[styles.paymentIconWrap, { backgroundColor: st.color + '12' }]}>
                                    <Ionicons name={st.icon} size={20} color={st.color} />
                                </View>
                                <View style={styles.paymentInfo}>
                                    <Text style={styles.paymentDesc} numberOfLines={1}>
                                        {payment.reason || 'Paiement service'}
                                    </Text>
                                    <Text style={styles.paymentRef}>Réf : {payment.transaction_id || '—'}</Text>
                                    <Text style={styles.paymentDate}>{formatDate(payment.created_at)}</Text>
                                </View>
                                <View style={styles.paymentRight}>
                                    <Text style={[styles.paymentAmount, { color: payment.status === 'success' ? colors.success : colors.textPrimary }]}>
                                        {formatAmount(payment.amount, payment.currency)}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: st.color + '12' }]}>
                                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                                    </View>
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}

            {/* Note Kkiapay */}
            <View style={styles.kkiapayNote}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.textMuted} />
                <Text style={styles.kkiapayNoteText}>
                    Paiements sécurisés par Kkiapay — Mobile Money, cartes bancaires
                </Text>
            </View>

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
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 4 },

    summaryCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        margin: spacing.lg,
        backgroundColor: colors.headerBg,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1, borderColor: colors.gold + '25',
        ...shadows.md,
    },
    summaryLeft: { gap: 4 },
    summaryLabel: { ...typography.caption, color: colors.gold + 'AA' },
    summaryAmount: { ...typography.h2, color: colors.textOnDark },
    summaryCount: { ...typography.caption, color: colors.textMuted },
    summaryIcon: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.gold + '15',
        alignItems: 'center', justifyContent: 'center',
    },

    newPaymentBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.gold,
        borderRadius: radius.md, paddingVertical: 15,
        ...shadows.gold,
    },
    newPaymentBtnText: { ...typography.button, color: '#FFF' },

    listHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    },
    listTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },

    centerState: { padding: spacing.xxl, alignItems: 'center' },

    emptyCard: {
        marginHorizontal: spacing.lg,
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

    paymentList: { paddingHorizontal: spacing.lg },
    paymentCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.xs,
    },
    paymentCardLast: { marginBottom: 0 },
    paymentIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    paymentInfo: { flex: 1 },
    paymentDesc: { ...typography.label, color: colors.textPrimary },
    paymentRef: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    paymentDate: { ...typography.caption, color: colors.textMuted, marginTop: 1 },
    paymentRight: { alignItems: 'flex-end', gap: 6 },
    paymentAmount: { ...typography.label, fontSize: 14 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

    kkiapayNote: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: spacing.lg, marginHorizontal: spacing.lg,
    },
    kkiapayNoteText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
})
