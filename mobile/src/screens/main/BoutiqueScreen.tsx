'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Image, Dimensions, Platform, RefreshControl, ActivityIndicator,
} from 'react-native'
import { ShoppingBag, ShoppingCart, Star, ArrowLeft, Plus, Minus, X, Truck } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { useCart } from '../../contexts/CartContext'
import { fetchWithTimeout } from '../../lib/fetch'
import { RootStackParamList, BoutiqueProduct } from '../../navigation/AppNavigator'

const { width } = Dimensions.get('window')
const CARD_GAP = 14
const CARD_W = (width - spacing.lg * 2 - CARD_GAP) / 2
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Boutique'>

/* ── Composant principal ── */
export default function BoutiqueScreen({ navigation }: { navigation: Nav }) {
    const [products, setProducts] = useState<BoutiqueProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showCart, setShowCart] = useState(false)
    const { t, lang, isTranslating, preloadTexts } = useLang()
    const { cart, addToCart, removeFromCart, clearItem, cartCount, cartTotal } = useCart()

    /* ── Fetch produits ── */
    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/products`, { timeoutMs: 10000 })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            setProducts(data.products || [])
        } catch (e: any) {
            console.warn('[Boutique] Fetch failed:', e?.message)
            setProducts([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchProducts() }, [fetchProducts])
    const onRefresh = async () => { setRefreshing(true); await fetchProducts(); setRefreshing(false) }

    /* ── Pré-charger les traductions ── */
    useEffect(() => {
        if (loading || lang === 'fr' || products.length === 0) return
        const texts = products.flatMap(p => [p.title, p.description].filter(Boolean))
        texts.push(
            'Notre Boutique', 'Découvrez nos produits exclusifs', 'Ajouter',
            'Panier', 'Votre panier est vide', 'Payer maintenant', 'Rupture de stock',
            'En stock', 'Indisponible', 'articles', 'Voir le panier', 'Mes commandes',
        )
        preloadTexts(texts)
    }, [loading, products, lang, preloadTexts])

    /* ── Helpers ── */
    const getProductPrice = (p: BoutiqueProduct) =>
        (p.sale_price && p.sale_price < p.price) ? p.sale_price : p.price
    const formatPrice = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'
    const cartItemForProduct = (id: string) => cart.find(c => c.product.id === id)

    /* ── Navigation ── */
    const goToCheckout = () => {
        if (cart.length === 0) return
        setShowCart(false)
        navigation.navigate('Checkout', { cart, total: cartTotal })
    }

    const goToProductDetail = (product: BoutiqueProduct) => {
        navigation.navigate('ProductDetail', {
            product,
            onAddToCart: (qty: number) => addToCart(product, qty),
        })
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* Header */}
                <LinearGradient colors={['#070D1A', '#0C1B33', '#132846']} style={styles.header}>
                    <View style={styles.flagStripe}>
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagGreen }]} />
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagYellow }]} />
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagRed }]} />
                    </View>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={22} color="#FFF" strokeWidth={1.75} />
                        </TouchableOpacity>
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={styles.headerTitle}>{t('Notre Boutique')}</Text>
                            <Text style={styles.headerSub}>{t('Découvrez nos produits exclusifs')}</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('Orders')} style={styles.ordersBtn}>
                            <Truck size={18} color="#FFF" strokeWidth={1.75} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Indicateur traduction */}
                {isTranslating && lang !== 'fr' && (
                    <View style={styles.translatingBanner}>
                        <ActivityIndicator color={colors.primary} size="small" />
                        <Text style={styles.translatingText}>{t('Traduction en cours...')}</Text>
                    </View>
                )}

                {/* Contenu */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color={colors.primary} size="large" />
                    </View>
                ) : products.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <ShoppingBag size={48} color={colors.textMuted} strokeWidth={1} />
                        <Text style={styles.emptyTitle}>{t('Boutique en préparation')}</Text>
                        <Text style={styles.emptyDesc}>{t('Nos produits seront bientôt disponibles. Revenez vite !')}</Text>
                    </View>
                ) : (
                    <View style={styles.grid}>
                        {products.map(product => {
                            const hasDiscount = product.sale_price && product.sale_price < product.price
                            const displayPrice = getProductPrice(product)
                            const inCart = cartItemForProduct(product.id)
                            const outOfStock = product.stock <= 0

                            return (
                                <TouchableOpacity
                                    key={product.id}
                                    style={styles.card}
                                    activeOpacity={0.85}
                                    onPress={() => goToProductDetail(product)}
                                >
                                    <View style={styles.cardImageWrap}>
                                        {product.images && product.images.length > 0 ? (
                                            <Image source={{ uri: product.images[0] }} style={styles.cardImage} resizeMode="cover" />
                                        ) : (
                                            <View style={styles.cardImagePlaceholder}>
                                                <ShoppingBag size={32} color={colors.textMuted} strokeWidth={1} />
                                            </View>
                                        )}
                                        {hasDiscount && (
                                            <View style={styles.discountBadge}>
                                                <Text style={styles.discountText}>
                                                    -{Math.round(((product.price - product.sale_price!) / product.price) * 100)}%
                                                </Text>
                                            </View>
                                        )}
                                        {product.is_featured && (
                                            <View style={styles.featuredBadge}>
                                                <Star size={9} color="#FFF" strokeWidth={2} fill="#FFF" />
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.cardInfo}>
                                        <Text style={styles.cardCategory}>{t(product.category)}</Text>
                                        <Text style={styles.cardTitle} numberOfLines={2}>{t(product.title)}</Text>
                                        <Text style={styles.cardDesc} numberOfLines={2}>{t(product.description)}</Text>

                                        <View style={styles.priceRow}>
                                            <Text style={styles.priceMain}>{formatPrice(displayPrice)}</Text>
                                            {hasDiscount && (
                                                <Text style={styles.priceOld}>{formatPrice(product.price)}</Text>
                                            )}
                                        </View>

                                        <View style={[styles.stockBadge, outOfStock && styles.stockBadgeOut]}>
                                            <View style={[styles.stockDot, outOfStock && styles.stockDotOut]} />
                                            <Text style={[styles.stockText, outOfStock && styles.stockTextOut]}>
                                                {outOfStock ? t('Rupture de stock') : `${t('En stock')} (${product.stock})`}
                                            </Text>
                                        </View>

                                        {outOfStock ? (
                                            <View style={[styles.addBtn, styles.addBtnDisabled]}>
                                                <Text style={[styles.addBtnText, { color: colors.textMuted }]}>{t('Indisponible')}</Text>
                                            </View>
                                        ) : inCart ? (
                                            <View style={styles.qtyRow}>
                                                <TouchableOpacity
                                                    onPress={(e) => { e.stopPropagation(); removeFromCart(product.id) }}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Minus size={14} color={colors.primary} strokeWidth={2} />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{inCart.quantity}</Text>
                                                <TouchableOpacity
                                                    onPress={(e) => { e.stopPropagation(); addToCart(product, 1) }}
                                                    style={styles.qtyBtn}
                                                >
                                                    <Plus size={14} color={colors.primary} strokeWidth={2} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.addBtn}
                                                activeOpacity={0.82}
                                                onPress={(e) => { e.stopPropagation(); addToCart(product, 1) }}
                                            >
                                                <ShoppingCart size={13} color="#FFF" strokeWidth={1.75} />
                                                <Text style={styles.addBtnText}>{t('Ajouter')}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Barre panier fixe */}
            {cartCount > 0 && (
                <TouchableOpacity style={styles.cartBar} activeOpacity={0.88} onPress={() => setShowCart(true)}>
                    <View style={styles.cartBarLeft}>
                        <ShoppingCart size={20} color="#FFF" strokeWidth={1.75} />
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cartCount}</Text>
                        </View>
                    </View>
                    <Text style={styles.cartBarLabel}>{t('Voir le panier')}</Text>
                    <Text style={styles.cartBarTotal}>{formatPrice(cartTotal)}</Text>
                </TouchableOpacity>
            )}

            {/* Modal Panier */}
            {showCart && (
                <View style={styles.cartOverlay}>
                    <TouchableOpacity style={styles.cartOverlayBg} onPress={() => setShowCart(false)} />
                    <View style={styles.cartSheet}>
                        <View style={styles.cartHeader}>
                            <Text style={styles.cartHeaderTitle}>{t('Panier')} ({cartCount} {t('articles')})</Text>
                            <TouchableOpacity onPress={() => setShowCart(false)}><X size={22} color={colors.textSecondary} /></TouchableOpacity>
                        </View>

                        {cart.length === 0 ? (
                            <Text style={styles.cartEmpty}>{t('Votre panier est vide')}</Text>
                        ) : (
                            <ScrollView style={{ maxHeight: 300 }}>
                                {cart.map(item => (
                                    <View key={item.product.id} style={styles.cartItem}>
                                        {item.product.images?.[0] ? (
                                            <Image source={{ uri: item.product.images[0] }} style={styles.cartItemImg} />
                                        ) : (
                                            <View style={[styles.cartItemImg, styles.cartItemImgPlaceholder]}>
                                                <ShoppingBag size={16} color={colors.textMuted} />
                                            </View>
                                        )}
                                        <View style={styles.cartItemInfo}>
                                            <Text style={styles.cartItemName} numberOfLines={1}>{t(item.product.title)}</Text>
                                            <Text style={styles.cartItemPrice}>
                                                {formatPrice(getProductPrice(item.product))} × {item.quantity}
                                            </Text>
                                        </View>
                                        <View style={styles.cartItemActions}>
                                            <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.qtyBtnSm}>
                                                <Minus size={12} color={colors.primary} strokeWidth={2} />
                                            </TouchableOpacity>
                                            <Text style={styles.qtyTextSm}>{item.quantity}</Text>
                                            <TouchableOpacity onPress={() => addToCart(item.product, 1)} style={styles.qtyBtnSm}>
                                                <Plus size={12} color={colors.primary} strokeWidth={2} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => clearItem(item.product.id)} style={styles.deleteBtn}>
                                                <X size={14} color="#EF4444" strokeWidth={2} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}

                        {cart.length > 0 && (
                            <View style={styles.cartFooter}>
                                <View style={styles.cartTotalRow}>
                                    <Text style={styles.cartTotalLabel}>{t('Total')}</Text>
                                    <Text style={styles.cartTotalValue}>{formatPrice(cartTotal)}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.payNowBtn}
                                    activeOpacity={0.85}
                                    onPress={goToCheckout}
                                >
                                    <Text style={styles.payNowText}>{t('Payer maintenant')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 20 },

    /* Header */
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 26,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        position: 'relative',
        overflow: 'hidden',
    },
    flagStripe: { flexDirection: 'row', height: 3, position: 'absolute', top: 0, left: 0, right: 0 },
    flagSeg: { flex: 1 },
    headerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    ordersBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { ...typography.h2, color: '#FFF' },
    headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    translatingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, paddingHorizontal: spacing.lg,
        backgroundColor: colors.primaryMuted,
    },
    translatingText: { ...typography.caption, color: colors.primary },

    loadingWrap: { padding: 60, alignItems: 'center' },

    emptyWrap: { padding: 40, alignItems: 'center', gap: 8 },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: 14 },
    emptyDesc: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },

    grid: {
        flexDirection: 'row', flexWrap: 'wrap',
        paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
        gap: CARD_GAP,
    },
    card: {
        width: CARD_W,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        overflow: 'hidden',
        ...shadows.xs,
    },
    cardImageWrap: { width: '100%', aspectRatio: 1, backgroundColor: colors.surfaceWarm, position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    cardImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    discountBadge: {
        position: 'absolute', top: 8, left: 8,
        backgroundColor: colors.danger,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4,
    },
    discountText: { color: '#FFF', fontSize: 10, fontFamily: 'Outfit_700Bold' },
    featuredBadge: {
        position: 'absolute', top: 8, right: 8,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: colors.gold,
        alignItems: 'center', justifyContent: 'center',
    },

    cardInfo: { padding: 10 },
    cardCategory: { ...typography.overline, fontSize: 9, color: colors.primary, marginBottom: 2 },
    cardTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 3 },
    cardDesc: { ...typography.caption, color: colors.textMuted, lineHeight: 14, marginBottom: 6, minHeight: 28 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 6 },
    priceMain: { fontSize: 14, fontFamily: 'Outfit_700Bold', color: colors.primary },
    priceOld: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'line-through' },

    stockBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start',
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
        backgroundColor: colors.successBg, marginBottom: 8,
    },
    stockBadgeOut: { backgroundColor: colors.dangerBg },
    stockDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.success },
    stockDotOut: { backgroundColor: colors.danger },
    stockText: { fontSize: 9, color: colors.success, fontFamily: 'Outfit_600SemiBold' },
    stockTextOut: { color: colors.danger },

    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
        paddingVertical: 8,
        backgroundColor: colors.primary, borderRadius: radius.sm,
        ...shadows.primary,
    },
    addBtnDisabled: { backgroundColor: colors.surfaceWarm, shadowOpacity: 0, elevation: 0 },
    addBtnText: { fontSize: 11, color: '#FFF', fontFamily: 'Outfit_700Bold' },
    qtyRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 4, paddingHorizontal: 8,
        backgroundColor: colors.primaryMuted, borderRadius: radius.sm,
    },
    qtyBtn: { padding: 5 },
    qtyText: { fontSize: 13, fontFamily: 'Outfit_700Bold', color: colors.primary },

    /* Barre panier */
    cartBar: {
        position: 'absolute', bottom: 16, left: 16, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        ...shadows.glow,
    },
    cartBarLeft: { position: 'relative' },
    cartBadge: {
        position: 'absolute', top: -6, right: -8,
        width: 16, height: 16, borderRadius: 8,
        backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#FFF',
    },
    cartBadgeText: { fontSize: 9, fontFamily: 'Outfit_700Bold', color: colors.textOnGold },
    cartBarLabel: { ...typography.button, fontSize: 14, color: '#FFF', flex: 1 },
    cartBarTotal: { ...typography.button, fontSize: 14, color: '#FFF' },

    /* Modal panier */
    cartOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
    cartOverlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    cartSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 36 : 18,
    },
    cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    cartHeaderTitle: { ...typography.h3, color: colors.textPrimary },
    cartEmpty: { ...typography.body, color: colors.textMuted, textAlign: 'center', padding: 30 },

    cartItem: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    cartItemImg: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceWarm },
    cartItemImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
    cartItemInfo: { flex: 1 },
    cartItemName: { ...typography.label, color: colors.textPrimary },
    cartItemPrice: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    qtyBtnSm: { padding: 4 },
    qtyTextSm: { fontSize: 12, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, minWidth: 16, textAlign: 'center' },
    deleteBtn: { padding: 4, marginLeft: 4 },

    cartFooter: { marginTop: 14 },
    cartTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cartTotalLabel: { ...typography.label, color: colors.textSecondary },
    cartTotalValue: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.primary },
    payNowBtn: {
        backgroundColor: colors.primary,
        paddingVertical: 14, borderRadius: radius.md,
        alignItems: 'center', ...shadows.primary,
    },
    payNowText: { ...typography.button, color: '#FFF' },
})
