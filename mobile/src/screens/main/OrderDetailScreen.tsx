'use strict'
import React, { useEffect, useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, ActivityIndicator, Alert, Linking,
} from 'react-native'
import {
    ArrowLeft, Package, Truck, CheckCircle, Clock, AlertTriangle,
    MapPin, Phone, User, ExternalLink, Copy, Receipt,
} from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { useLang } from '../../contexts/LangContext'
import { fetchWithTimeout } from '../../lib/fetch'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>
type Route = RouteProp<RootStackParamList, 'OrderDetail'>

interface OrderDetail {
    id: string
    customer_name: string
    customer_email: string | null
    customer_phone: string
    amount: number
    currency: string
    payment_method: string
    payment_status: string
    transaction_id: string | null
    cart_items: Array<{ title: string; quantity: number; unit_price: number }> | null
    product_title: string | null
    shipping_address: string | null
    shipping_city: string | null
    shipping_postal: string | null
    shipping_country: string | null
    shipping_notes: string | null
    tracking_code: string | null
    tracking_carrier: string | null
    tracking_url: string | null
    shipping_status: string | null
    shipped_at: string | null
    delivered_at: string | null
    created_at: string
}

interface TrackingEvent {
    id: number
    status: string
    label: string
    description: string | null
    location: string | null
    created_at: string
}

const SHIPPING_LABELS: Record<string, string> = {
    pending: 'En attente', preparing: 'En préparation',
    shipped: 'Expédié', in_transit: 'En transit',
    delivered: 'Livré', failed: 'Échec', returned: 'Retourné',
}
const SHIPPING_COLORS: Record<string, string> = {
    pending: colors.textMuted, preparing: colors.warning,
    shipped: colors.info, in_transit: colors.primary,
    delivered: colors.success, failed: colors.danger, returned: colors.danger,
}

const STAGES = ['preparing', 'shipped', 'in_transit', 'delivered']

export default function OrderDetailScreen({ navigation, route }: { navigation: Nav; route: Route }) {
    const { orderId } = route.params
    const { t } = useLang()
    const [order, setOrder] = useState<OrderDetail | null>(null)
    const [events, setEvents] = useState<TrackingEvent[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetchWithTimeout(
                    `${API_BASE}/api/mobile/orders?order_id=${orderId}`,
                    { timeoutMs: 10000 }
                )
                const data = await res.json().catch(() => ({}))
                if (data.order) {
                    setOrder(data.order)
                    setEvents(data.events || [])
                }
            } finally {
                setLoading(false)
            }
        }
        fetchOrder()
    }, [orderId])

    const formatPrice = (n: number, c: string) => {
        if (c === 'XOF' || c === 'XAF') return `${n.toLocaleString('fr-FR')} FCFA`
        if (c === 'EUR') return `${n.toLocaleString('fr-FR')} €`
        return `${n} ${c}`
    }

    const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const copyTracking = async () => {
        if (!order?.tracking_code) return
        await Clipboard.setStringAsync(order.tracking_code)
        Alert.alert(t('Copié'), t('Le code de suivi a été copié.'))
    }

    const openCarrierUrl = () => {
        if (order?.tracking_url) {
            Linking.openURL(order.tracking_url).catch(() => {})
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        )
    }

    if (!order) {
        return (
            <View style={[styles.container, styles.center]}>
                <AlertTriangle size={40} color={colors.danger} />
                <Text style={styles.errorTitle}>{t('Commande introuvable')}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>{t('Retour')}</Text>
                </TouchableOpacity>
            </View>
        )
    }

    const status = order.shipping_status || 'pending'
    const statusColor = SHIPPING_COLORS[status]
    const statusLabel = SHIPPING_LABELS[status]
    const currentStageIdx = STAGES.indexOf(status)

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#FFF" strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('Détails de la commande')}</Text>
                <Text style={styles.headerSub}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            </View>

            {/* Statut principal */}
            <View style={[styles.statusCard, { borderColor: statusColor + '40' }]}>
                <View style={[styles.statusIconBig, { backgroundColor: statusColor + '15' }]}>
                    {status === 'delivered' ? <CheckCircle size={32} color={statusColor} strokeWidth={1.5} /> :
                     status === 'in_transit' || status === 'shipped' ? <Truck size={32} color={statusColor} strokeWidth={1.5} /> :
                     status === 'preparing' ? <Package size={32} color={statusColor} strokeWidth={1.5} /> :
                     <Clock size={32} color={statusColor} strokeWidth={1.5} />}
                </View>
                <Text style={[styles.statusBigLabel, { color: statusColor }]}>{t(statusLabel)}</Text>
                {order.delivered_at ? (
                    <Text style={styles.statusSub}>{t('Livré le')} {formatDateTime(order.delivered_at)}</Text>
                ) : order.shipped_at ? (
                    <Text style={styles.statusSub}>{t('Expédié le')} {formatDateTime(order.shipped_at)}</Text>
                ) : (
                    <Text style={styles.statusSub}>{t('Commandé le')} {formatDateTime(order.created_at)}</Text>
                )}

                {/* Stepper */}
                {currentStageIdx >= 0 && (
                    <View style={styles.stepper}>
                        {STAGES.map((s, i) => {
                            const done = i <= currentStageIdx
                            return (
                                <React.Fragment key={s}>
                                    <View style={[styles.step, done && { backgroundColor: statusColor }]}>
                                        {done && <CheckCircle size={10} color="#FFF" strokeWidth={2.5} />}
                                    </View>
                                    {i < STAGES.length - 1 && (
                                        <View style={[styles.stepLine, done && i < currentStageIdx && { backgroundColor: statusColor }]} />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </View>
                )}
            </View>

            {/* Tracking code */}
            {order.tracking_code ? (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Truck size={16} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.cardTitle}>{t('Suivi de colis')}</Text>
                    </View>
                    <View style={styles.trackingRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.trackingCode}>{order.tracking_code}</Text>
                            {order.tracking_carrier ? (
                                <Text style={styles.trackingCarrier}>{order.tracking_carrier}</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={copyTracking} style={styles.iconBtn}>
                            <Copy size={16} color={colors.primary} />
                        </TouchableOpacity>
                        {order.tracking_url ? (
                            <TouchableOpacity onPress={openCarrierUrl} style={styles.iconBtn}>
                                <ExternalLink size={16} color={colors.primary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            ) : null}

            {/* Articles */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Receipt size={16} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.cardTitle}>{t('Articles')}</Text>
                </View>
                {(order.cart_items || []).map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {item.quantity} × {t(item.title)}
                        </Text>
                        <Text style={styles.itemPrice}>
                            {formatPrice((item.unit_price || 0) * (item.quantity || 1), order.currency)}
                        </Text>
                    </View>
                ))}
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('Total payé')}</Text>
                    <Text style={styles.totalValue}>{formatPrice(order.amount, order.currency)}</Text>
                </View>
                {order.transaction_id ? (
                    <Text style={styles.txRef}>{t('Réf. paiement')} : {order.transaction_id}</Text>
                ) : null}
            </View>

            {/* Adresse de livraison */}
            {order.shipping_address ? (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MapPin size={16} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.cardTitle}>{t('Livraison')}</Text>
                    </View>
                    <View style={styles.shipRow}>
                        <User size={14} color={colors.textMuted} />
                        <Text style={styles.shipText}>{order.customer_name}</Text>
                    </View>
                    <View style={styles.shipRow}>
                        <Phone size={14} color={colors.textMuted} />
                        <Text style={styles.shipText}>{order.customer_phone}</Text>
                    </View>
                    <View style={styles.shipRow}>
                        <MapPin size={14} color={colors.textMuted} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.shipText}>{order.shipping_address}</Text>
                            <Text style={styles.shipText}>
                                {[order.shipping_city, order.shipping_postal, order.shipping_country].filter(Boolean).join(', ')}
                            </Text>
                            {order.shipping_notes ? (
                                <Text style={styles.shipNote}>{order.shipping_notes}</Text>
                            ) : null}
                        </View>
                    </View>
                </View>
            ) : null}

            {/* Timeline événements */}
            {events.length > 0 && (
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Clock size={16} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.cardTitle}>{t('Historique')}</Text>
                    </View>
                    {events.map((ev, i) => {
                        const evColor = SHIPPING_COLORS[ev.status] || colors.textMuted
                        return (
                            <View key={ev.id} style={styles.evRow}>
                                <View style={styles.evLineCol}>
                                    <View style={[styles.evDot, { backgroundColor: evColor }]} />
                                    {i < events.length - 1 && <View style={styles.evLine} />}
                                </View>
                                <View style={{ flex: 1, paddingBottom: 14 }}>
                                    <Text style={styles.evLabel}>{t(ev.label)}</Text>
                                    {ev.description ? (
                                        <Text style={styles.evDesc}>{t(ev.description)}</Text>
                                    ) : null}
                                    {ev.location ? (
                                        <Text style={styles.evLocation}>📍 {ev.location}</Text>
                                    ) : null}
                                    <Text style={styles.evTime}>{formatDateTime(ev.created_at)}</Text>
                                </View>
                            </View>
                        )
                    })}
                </View>
            )}

            <View style={{ height: 60 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorTitle: { ...typography.h3, color: colors.textPrimary, marginTop: 12 },
    linkBtn: { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: radius.sm },
    linkBtnText: { ...typography.button, color: '#FFF' },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 24,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    statusCard: {
        margin: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        ...shadows.sm,
    },
    statusIconBig: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    statusBigLabel: { ...typography.h2, fontSize: 20, marginBottom: 4 },
    statusSub: { ...typography.bodySmall, color: colors.textMuted },

    stepper: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', marginTop: 18, paddingHorizontal: 8,
    },
    step: {
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 2, borderColor: colors.borderLight,
        alignItems: 'center', justifyContent: 'center',
    },
    stepLine: { flex: 1, height: 2, backgroundColor: colors.borderLight, marginHorizontal: 4 },

    card: {
        marginHorizontal: spacing.lg, marginBottom: spacing.md,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { ...typography.h3, fontSize: 14, color: colors.textPrimary },

    trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    trackingCode: { ...typography.h3, fontSize: 16, fontFamily: 'Outfit_700Bold', color: colors.primary, letterSpacing: 1 },
    trackingCarrier: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    iconBtn: {
        width: 36, height: 36, borderRadius: radius.sm,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
    },

    itemRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8,
    },
    itemName: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, marginRight: 10 },
    itemPrice: { ...typography.label, color: colors.textPrimary },
    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    totalLabel: { ...typography.label, color: colors.textSecondary },
    totalValue: { fontSize: 17, fontFamily: 'Outfit_700Bold', color: colors.primary },
    txRef: { ...typography.caption, color: colors.textMuted, marginTop: 6 },

    shipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    shipText: { ...typography.bodySmall, color: colors.textPrimary },
    shipNote: { ...typography.caption, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },

    evRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    evLineCol: { alignItems: 'center', width: 12 },
    evDot: { width: 10, height: 10, borderRadius: 5 },
    evLine: { width: 2, flex: 1, backgroundColor: colors.borderLight, marginTop: 4 },
    evLabel: { ...typography.label, color: colors.textPrimary },
    evDesc: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    evLocation: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    evTime: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
})
