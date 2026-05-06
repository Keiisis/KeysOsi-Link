import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { ArrowLeft, CreditCard, PlusCircle, Receipt, ShieldCheck } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import ScreenHeader from '../../components/ScreenHeader'
import { useKkiapay } from '@kkiapay-org/react-native-sdk'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { usePaymentSettings } from '../../contexts/PaymentSettingsContext'
import { supabase } from '../../config/supabase'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, radius, shadows, typography, royal } from '../../config/theme'
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

const STATUS_LABELS = {
    success:  'Payé',
    pending:  'En attente',
    failed:   'Échoué',
    refunded: 'Remboursé',
}

const STATUS_CONFIG = {
    success:  { icon: 'checkmark-circle'  as const, color: colors.success },
    pending:  { icon: 'time-outline'       as const, color: colors.warning },
    failed:   { icon: 'close-circle'       as const, color: colors.danger  },
    refunded: { icon: 'arrow-undo-circle'  as const, color: colors.info    },
}

/* ═══════════════════════════════════════════════════════════
   Payments Screen — Historique + initier paiement Kkiapay
   SDK natif Kkiapay React Native (Android + iOS, in-app widget)
═══════════════════════════════════════════════════════════ */

export default function PaymentsScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    // Settings préchargés au démarrage de l'app via PaymentSettingsContext
    // → ouverture du widget instantanée, pas de round-trip Supabase
    const { kkiapayPublicKey: kkiapayKey, kkiapaySandbox: sandbox } = usePaymentSettings()

    // Pending transaction id is captured at openKkiapayWidget time so the
    // success listener (registered once at mount) can update the right row.
    const pendingTxIdRef = useRef<string | null>(null)
    const fetchPaymentsRef = useRef<() => Promise<void>>(async () => {})

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

    useEffect(() => {
        fetchPayments()
    }, [fetchPayments])

    // Keep fetchPayments ref up-to-date so the success listener (registered once)
    // always uses the latest version.
    useEffect(() => { fetchPaymentsRef.current = fetchPayments }, [fetchPayments])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchPayments()
        setRefreshing(false)
    }

    /* ── Hook Kkiapay natif (Android + iOS, widget in-app) ── */
    const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKkiapay()

    /* ── Listeners enregistrés UNE SEULE FOIS au mount ──
       Le SDK n'expose pas de removeListener, donc on s'enregistre une fois et
       on lit la transactionId courante via ref pour éviter les stale closures. */
    useEffect(() => {
        addSuccessListener(async (data: { transactionId?: string }) => {
            const localTxId = pendingTxIdRef.current
            if (!localTxId) return // pas de paiement en cours
            const kkTxId = data?.transactionId || localTxId
            try {
                await supabase.from('paiements')
                    .update({ status: 'success', transaction_id: String(kkTxId) })
                    .eq('transaction_id', localTxId)
                Alert.alert(t('✅ Paiement confirmé'), t('Votre paiement a bien été reçu.'))
            } catch { /* ignore */ }
            pendingTxIdRef.current = null
            await fetchPaymentsRef.current()
        })

        addFailedListener(async () => {
            const localTxId = pendingTxIdRef.current
            if (localTxId) {
                try {
                    await supabase.from('paiements')
                        .update({ status: 'failed' })
                        .eq('transaction_id', localTxId)
                } catch { /* ignore */ }
                pendingTxIdRef.current = null
            }
            Alert.alert(t('Paiement échoué'), t("Le paiement n'a pas pu être finalisé. Veuillez réessayer."))
            await fetchPaymentsRef.current()
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    /* ── Initier un paiement Kkiapay (natif in-app) ── */
    const handleInitPayment = async (amount: number, description: string, dossierId?: string) => {
        if (!profile || !kkiapayKey) {
            Alert.alert(t('Configuration'), t("La passerelle de paiement n'est pas configurée. Veuillez contacter le support."))
            return
        }

        const transactionId = `RG-${profile.id.slice(0, 8)}-${Date.now()}`
        pendingTxIdRef.current = transactionId

        // Enregistrer le paiement en attente
        const { error: insertErr } = await supabase.from('paiements').insert({
            client_id: profile.id,
            dossier_id: dossierId || null,
            amount,
            currency: 'XOF',
            status: 'pending',
            reason: description,
            transaction_id: transactionId,
            gateway: 'kkiapay',
        })
        if (insertErr) {
            pendingTxIdRef.current = null
            Alert.alert(t('Erreur'), t('Impossible de créer le paiement. Veuillez réessayer.'))
            return
        }

        // Ouvrir le widget Kkiapay natif (in-app)
        try {
            openKkiapayWidget({
                amount,
                api_key: kkiapayKey,
                sandbox, // lu depuis Supabase settings.kkiapay_sandbox
                email: profile.email || '',
                phone: profile.phone || '',
                reason: description || t('Paiement'),
            })
        } catch (e) {
            console.error('Erreur ouverture widget Kkiapay:', e)
            pendingTxIdRef.current = null
            Alert.alert(t('Erreur'), t("Impossible d'ouvrir le paiement. Veuillez réessayer."))
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
                title={t('Paiements')}
                subtitle={t('Historique et facturation')}
                onBack={() => navigation.goBack()}
            />

            {/* Résumé */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                    <Text style={styles.summaryLabel}>{t('Total payé')}</Text>
                    <Text style={styles.summaryAmount}>{formatAmount(totalPaid, 'XOF')}</Text>
                    <Text style={styles.summaryCount}>{payments.filter(p => p.status === 'success').length} {t('transaction(s)')}</Text>
                </View>
                <View style={styles.summaryIcon}>
                    <CreditCard size={28} color={colors.primary} strokeWidth={1.75} />
                </View>
            </View>

            {/* Bouton nouveau paiement (si un dossier existe) */}
            <TouchableOpacity
                style={styles.newPaymentBtn}
                activeOpacity={0.8}
                onPress={() => {
                    Alert.prompt?.(
                        t('Montant à payer'),
                        t('Entrez le montant en FCFA'),
                        [
                            { text: t('Annuler'), style: 'cancel' },
                            {
                                text: t('Payer via Kkiapay'),
                                onPress: (value: string | undefined) => {
                                    const amount = parseInt(value || '0', 10)
                                    if (!amount || amount < 100) {
                                        Alert.alert(t('Montant invalide'), t('Veuillez entrer un montant valide.'))
                                        return
                                    }
                                    handleInitPayment(amount, t('Paiement service Retour Gagnant'))
                                },
                            },
                        ],
                        'plain-text',
                        '',
                        'numeric'
                    ) ?? Alert.alert(
                        t('Paiement Kkiapay'),
                        t('Contactez notre équipe pour effectuer un paiement ou consultez votre dossier.')
                    )
                }}
            >
                <PlusCircle size={20} color="#FFF" strokeWidth={1.75} />
                <Text style={styles.newPaymentBtnText}>{t('Effectuer un paiement')}</Text>
            </TouchableOpacity>

            {/* Liste */}
            <View style={styles.listHeader}>
                <Receipt size={18} color={colors.primary} strokeWidth={1.75} />
                <Text style={styles.listTitle}>{t('Transactions')} ({payments.length})</Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : payments.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <Receipt size={36} color={colors.textMuted} strokeWidth={1.75} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('Aucune transaction')}</Text>
                    <Text style={styles.emptyText}>
                        {t('Vos paiements apparaîtront ici. Utilisez le bouton ci-dessus pour effectuer un paiement sécurisé via Kkiapay.')}
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
                                    <Text style={styles.paymentRef}>{t('Réf')} : {payment.transaction_id || '—'}</Text>
                                    <Text style={styles.paymentDate}>{formatDate(payment.created_at)}</Text>
                                </View>
                                <View style={styles.paymentRight}>
                                    <Text style={[styles.paymentAmount, { color: payment.status === 'success' ? colors.success : colors.textPrimary }]}>
                                        {formatAmount(payment.amount, payment.currency)}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: st.color + '12' }]}>
                                        <Text style={[styles.statusText, { color: st.color }]}>{t(STATUS_LABELS[payment.status] || STATUS_LABELS.pending)}</Text>
                                    </View>
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}

            {/* Note Kkiapay */}
            <View style={styles.kkiapayNote}>
                <ShieldCheck size={14} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={styles.kkiapayNoteText}>
                    {t('Paiements sécurisés par Kkiapay — Mobile Money, cartes bancaires')}
                </Text>
            </View>

            <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: royal.bg },



    summaryCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        margin: spacing.lg,
        backgroundColor: colors.headerBg,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1, borderColor: colors.primary + '25',
        ...shadows.md,
    },
    summaryLeft: { gap: 4 },
    summaryLabel: { ...typography.caption, color: colors.primary + 'AA' },
    summaryAmount: { ...typography.h2, color: colors.textOnDark },
    summaryCount: { ...typography.caption, color: colors.textMuted },
    summaryIcon: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
    },

    newPaymentBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: radius.md, paddingVertical: 15,
        ...shadows.primary,
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
