'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, ActivityIndicator, Linking, Alert,
} from 'react-native'
import { ArrowLeft, FileText, Download, ExternalLink, Receipt, Mail, CheckCircle, Clock } from 'lucide-react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { fetchWithTimeout } from '../../lib/fetch'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'
type Nav = NativeStackNavigationProp<RootStackParamList, 'Invoices'>

interface Invoice {
    id: string
    invoice_ref: string
    order_id: string | null
    dossier_id: string | null
    customer_name: string
    amount: number
    currency: string
    description: string | null
    status: string
    issued_at: string
    paid_at: string | null
    sent_to_email: boolean
    pdf_url: string | null
    items: unknown
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    paid:      { label: 'Payée',     color: colors.success },
    pending:   { label: 'En attente', color: colors.warning },
    cancelled: { label: 'Annulée',   color: colors.danger },
    refunded:  { label: 'Remboursée', color: colors.info },
}

export default function InvoicesScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchInvoices = useCallback(async () => {
        if (!profile) { setLoading(false); return }
        try {
            const res = await fetchWithTimeout(
                `${API_BASE}/api/mobile/invoices?client_id=${profile.id}`,
                { timeoutMs: 10000 }
            )
            const data = await res.json().catch(() => ({}))
            setInvoices(data.invoices || [])
        } catch {
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }, [profile])

    useEffect(() => { fetchInvoices() }, [fetchInvoices])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchInvoices()
        setRefreshing(false)
    }

    const formatPrice = (n: number, c: string) => {
        if (c === 'XOF' || c === 'XAF') return `${n.toLocaleString('fr-FR')} FCFA`
        if (c === 'EUR') return `${n.toLocaleString('fr-FR')} €`
        return `${n} ${c}`
    }

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    const openInvoice = (inv: Invoice) => {
        // Open the HTML invoice in browser (existing route /api/invoices/[id])
        const url = inv.pdf_url || `${API_BASE}/api/invoices/${inv.id}`
        Linking.openURL(url).catch(() => {
            Alert.alert(t('Erreur'), t('Impossible d\'ouvrir la facture.'))
        })
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#FFF" strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('Mes Factures')}</Text>
                <Text style={styles.headerSub}>{t('Historique des factures émises')}</Text>
            </View>

            <View style={styles.listHeader}>
                <Receipt size={18} color={colors.primary} strokeWidth={1.75} />
                <Text style={styles.listTitle}>{t('Factures')} ({invoices.length})</Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : invoices.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <FileText size={36} color={colors.textMuted} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('Aucune facture')}</Text>
                    <Text style={styles.emptyText}>
                        {t('Vos factures apparaîtront ici après chaque commande ou prestation payée.')}
                    </Text>
                </View>
            ) : (
                <View style={styles.list}>
                    {invoices.map(inv => {
                        const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending
                        return (
                            <TouchableOpacity
                                key={inv.id}
                                style={styles.invCard}
                                activeOpacity={0.85}
                                onPress={() => openInvoice(inv)}
                            >
                                <View style={[styles.invIconWrap, { backgroundColor: cfg.color + '15' }]}>
                                    {inv.status === 'paid' ? (
                                        <CheckCircle size={22} color={cfg.color} strokeWidth={1.75} />
                                    ) : (
                                        <Clock size={22} color={cfg.color} strokeWidth={1.75} />
                                    )}
                                </View>
                                <View style={styles.invInfo}>
                                    <Text style={styles.invRef}>{inv.invoice_ref}</Text>
                                    <Text style={styles.invDesc} numberOfLines={1}>
                                        {t(inv.description || 'Facture')}
                                    </Text>
                                    <View style={styles.invMetaRow}>
                                        <Text style={styles.invDate}>{formatDate(inv.issued_at)}</Text>
                                        {inv.sent_to_email ? (
                                            <View style={styles.emailBadge}>
                                                <Mail size={10} color={colors.primary} strokeWidth={2} />
                                                <Text style={styles.emailBadgeText}>{t('Envoyée')}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                                <View style={styles.invRight}>
                                    <Text style={styles.invAmount}>{formatPrice(inv.amount, inv.currency)}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '15' }]}>
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{t(cfg.label)}</Text>
                                    </View>
                                    <View style={styles.openHint}>
                                        {inv.pdf_url ? (
                                            <Download size={12} color={colors.primary} strokeWidth={2} />
                                        ) : (
                                            <ExternalLink size={12} color={colors.primary} strokeWidth={2} />
                                        )}
                                    </View>
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
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    listHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginVertical: spacing.md,
    },
    listTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },

    list: { paddingHorizontal: spacing.lg },
    invCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.xs,
    },
    invIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    invInfo: { flex: 1 },
    invRef: { ...typography.label, color: colors.primary, fontFamily: 'Outfit_700Bold' },
    invDesc: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    invMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    invDate: { ...typography.caption, color: colors.textMuted },
    emailBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        backgroundColor: colors.primaryMuted,
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    emailBadgeText: { fontSize: 9, color: colors.primary, fontFamily: 'Outfit_600SemiBold' },
    invRight: { alignItems: 'flex-end', gap: 4 },
    invAmount: { ...typography.label, fontSize: 14, color: colors.textPrimary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusText: { fontSize: 10, fontFamily: 'Outfit_700Bold' },
    openHint: { marginTop: 4 },

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
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
})
