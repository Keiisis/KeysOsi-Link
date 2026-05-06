'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, ActivityIndicator, TextInput, Alert,
    Animated, Easing, Image, Dimensions
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Video, ResizeMode } from 'expo-av'
import { ArrowLeft, Package, Search, Truck, CheckCircle, Clock, AlertTriangle, ShoppingBag } from 'lucide-react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import ScreenHeader from '../../components/ScreenHeader'
import { fetchWithTimeout } from '../../lib/fetch'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

const royal = {
    bg: '#FDF9F1',
    surface: '#FFFFFF',
    textDark: '#0A1A14',
    emerald: '#0B4A2B',
    lightEmerald: '#12683E',
    gold: '#DCA540',
    terracotta: '#D45B3E',
    softGold: '#F8E9C7',
    border: '#EBE2CD'
}
type Nav = NativeStackNavigationProp<RootStackParamList, 'Orders'>

export interface OrderListItem {
    id: string
    amount: number
    currency: string
    payment_status: string
    transaction_id: string | null
    cart_items: Array<{ title: string; quantity: number }> | null
    product_title: string | null
    source: string | null
    tracking_code: string | null
    tracking_carrier: string | null
    shipping_status: string | null
    shipped_at: string | null
    delivered_at: string | null
    created_at: string
}

const SHIPPING_LABELS: Record<string, string> = {
    pending:    'En attente',
    preparing:  'En préparation',
    shipped:    'Expédié',
    in_transit: 'En transit',
    delivered:  'Livré',
    failed:     'Échec',
    returned:   'Retourné',
}

const SHIPPING_COLORS: Record<string, string> = {
    pending:    colors.textMuted,
    preparing:  colors.warning,
    shipped:    colors.info,
    in_transit: colors.primary,
    delivered:  colors.success,
    failed:     colors.danger,
    returned:   colors.danger,
}

const shippingIcon = (status: string | null) => {
    switch (status) {
        case 'preparing': return Package
        case 'shipped':
        case 'in_transit': return Truck
        case 'delivered': return CheckCircle
        case 'failed':
        case 'returned': return AlertTriangle
        default: return Clock
    }
}

const { width } = Dimensions.get('window')

/* ── Animation Héro Livreur VIP ── */
const DeliveryHeroAnimation = () => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.08, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <View style={styles.heroContainer}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: scaleAnim }] }]}>
                <Video
                    source={require('../../../assets/images/delivery_video.mp4')}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted={true}
                />
            </Animated.View>
            <LinearGradient 
                colors={['rgba(0,0,0,0.1)', royal.bg]} 
                style={StyleSheet.absoluteFillObject} 
                start={{x:0, y:0.5}} end={{x:0, y:1}} 
            />
        </View>
    );
};

export default function OrdersScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const [orders, setOrders] = useState<OrderListItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchCode, setSearchCode] = useState('')
    const [searching, setSearching] = useState(false)

    const fetchOrders = useCallback(async () => {
        if (!profile) { setLoading(false); return }
        try {
            const res = await fetchWithTimeout(
                `${API_BASE}/api/mobile/orders?client_id=${profile.id}`,
                { timeoutMs: 10000 }
            )
            const data = await res.json().catch(() => ({}))
            setOrders(data.orders || [])
        } catch {
            setOrders([])
        } finally {
            setLoading(false)
        }
    }, [profile])

    useEffect(() => { fetchOrders() }, [fetchOrders])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchOrders()
        setRefreshing(false)
    }

    const handleTrackingSearch = async () => {
        const code = searchCode.trim().toUpperCase()
        if (!code) {
            Alert.alert(t('Code requis'), t('Veuillez entrer un code de suivi.'))
            return
        }
        setSearching(true)
        try {
            const res = await fetchWithTimeout(
                `${API_BASE}/api/mobile/orders?tracking=${encodeURIComponent(code)}`,
                { timeoutMs: 10000 }
            )
            const data = await res.json().catch(() => ({}))
            if (data.found && data.order) {
                setSearchCode('')
                navigation.navigate('OrderDetail', { orderId: data.order.id, trackingCode: code })
            } else {
                Alert.alert(t('Aucune commande'), t('Aucune commande trouvée avec ce code de suivi.'))
            }
        } catch {
            Alert.alert(t('Erreur'), t('Impossible de rechercher pour le moment.'))
        } finally {
            setSearching(false)
        }
    }

    const formatPrice = (n: number, c: string) => {
        if (c === 'XOF' || c === 'XAF') return `${n.toLocaleString('fr-FR')} FCFA`
        if (c === 'EUR') return `${n.toLocaleString('fr-FR')} €`
        return `${n} ${c}`
    }

    const formatDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
    })

    const renderOrder = (order: OrderListItem) => {
        const Icon = shippingIcon(order.shipping_status)
        const statusColor = SHIPPING_COLORS[order.shipping_status || 'pending']
        const statusLabel = SHIPPING_LABELS[order.shipping_status || 'pending'] || 'En attente'

        const itemsCount = order.cart_items?.reduce((s, i) => s + (i.quantity || 0), 0) || 1
        const firstTitle = order.cart_items?.[0]?.title || order.product_title || t('Commande')
        const moreCount = (order.cart_items?.length || 1) - 1

        return (
            <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
            >
                <View style={[styles.orderIconWrap, { backgroundColor: statusColor + '15' }]}>
                    <Icon size={22} color={statusColor} strokeWidth={1.75} />
                </View>
                <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle} numberOfLines={1}>
                        {firstTitle}{moreCount > 0 ? ` ${t('+ {n} autre(s)', { n: moreCount })}` : ''}
                    </Text>
                    <Text style={styles.orderMeta}>
                        {itemsCount} {t('article(s)')} · {formatDate(order.created_at)}
                    </Text>
                    {order.tracking_code ? (
                        <Text style={styles.trackingCode}>{t('Suivi')}: {order.tracking_code}</Text>
                    ) : null}
                </View>
                <View style={styles.orderRight}>
                    <Text style={styles.orderAmount}>{formatPrice(order.amount, order.currency)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{t(statusLabel)}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.container}>
            <LinearGradient 
                colors={['rgba(220,165,64,0.15)', royal.bg, royal.bg]} 
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject} 
            />
            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={royal.gold} />}
                showsVerticalScrollIndicator={false}
            >
                <ScreenHeader 
                    title={t("MES COMMANDES")}
                    subtitle={t('Suivi privé de vos joyaux')}
                    onBack={() => navigation.goBack()}
                />

            {/* Animation Image Hyper-Réaliste */}
            <DeliveryHeroAnimation />

            {/* Recherche par code de suivi */}
            <View style={styles.searchCard}>
                <View style={styles.searchHeader}>
                    <Search size={16} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.searchTitle}>{t('Suivre un colis avec un code')}</Text>
                </View>
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.searchInput}
                        value={searchCode}
                        onChangeText={setSearchCode}
                        placeholder={t('Entrez le code de suivi')}
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={handleTrackingSearch}
                        disabled={searching}
                        activeOpacity={0.85}
                    >
                        {searching ? <ActivityIndicator color="#FFF" size="small" /> : <Search size={16} color="#FFF" strokeWidth={2} />}
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Package size={18} color={colors.primary} strokeWidth={1.75} />
                <Text style={styles.listTitle}>{t('Historique')} ({orders.length})</Text>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : orders.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <ShoppingBag size={36} color={colors.textMuted} strokeWidth={1.5} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('Aucune commande')}</Text>
                    <Text style={styles.emptyText}>
                        {t('Vos commandes boutique apparaîtront ici.')}
                    </Text>
                    <TouchableOpacity
                        style={styles.shopBtn}
                        onPress={() => navigation.navigate('Boutique')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.shopBtnText}>{t('Visiter la boutique')}</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.list}>{orders.map(renderOrder)}</View>
            )}

            <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: royal.bg },

    heroContainer: {
        width: '100%',
        height: 250,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: -20, // Pour chevaucher avec la carte de recherche
    },

    searchCard: {
        margin: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: 'rgba(255,255,255,0.75)',
        padding: spacing.md,
        borderRadius: radius.md,
        shadowColor: royal.gold,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    searchHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    searchTitle: { ...typography.label, color: colors.textPrimary },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: {
        flex: 1, paddingHorizontal: 12, paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: radius.sm,
        borderWidth: 1, borderColor: 'rgba(220,165,64,0.3)',
        ...typography.body, color: colors.textPrimary,
    },
    searchBtn: {
        width: 44, height: 44, borderRadius: radius.sm,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.primary,
    },

    listHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    },
    listTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },

    list: { paddingHorizontal: spacing.lg },
    orderCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: radius.md,
        padding: 14, marginBottom: 8,
        shadowColor: royal.gold,
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    orderIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    orderInfo: { flex: 1 },
    orderTitle: { ...typography.label, color: colors.textPrimary },
    orderMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    trackingCode: { ...typography.caption, color: colors.primary, marginTop: 2, fontFamily: 'Outfit_600SemiBold' },
    orderRight: { alignItems: 'flex-end', gap: 6 },
    orderAmount: { ...typography.label, fontSize: 14, color: colors.textPrimary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontFamily: 'Outfit_700Bold' },

    centerState: { padding: spacing.xxl, alignItems: 'center' },

    emptyCard: {
        marginHorizontal: spacing.lg,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: radius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: royal.gold,
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    emptyIconWrap: {
        width: 70, height: 70, borderRadius: 35,
        backgroundColor: colors.surfaceElevated,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: 18 },
    shopBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 22, paddingVertical: 11,
        borderRadius: radius.sm, ...shadows.primary,
    },
    shopBtnText: { ...typography.button, color: '#FFF', fontSize: 14 },
})
