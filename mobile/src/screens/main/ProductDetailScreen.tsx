'use strict'
import React, { useState, useRef } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Image, Dimensions, Platform, Alert,
} from 'react-native'
import { ArrowLeft, Minus, Plus, ShoppingCart, Star, Tag, ChevronRight } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { RootStackParamList } from '../../navigation/AppNavigator'

const { width } = Dimensions.get('window')

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>
type Route = RouteProp<RootStackParamList, 'ProductDetail'>

interface Props {
    navigation: Nav
    route: Route
}

export default function ProductDetailScreen({ navigation, route }: Props) {
    const { product, onAddToCart } = route.params
    const { t } = useLang()
    const [quantity, setQuantity] = useState(1)
    const [activeImage, setActiveImage] = useState(0)
    const carouselRef = useRef<ScrollView>(null)

    const hasDiscount = product.sale_price && product.sale_price < product.price
    const displayPrice = hasDiscount ? product.sale_price! : product.price
    const outOfStock = product.stock <= 0
    const formatPrice = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

    const handleAddToCart = () => {
        if (outOfStock) return
        if (quantity > product.stock) {
            Alert.alert(t('Stock insuffisant'), t('Quantité demandée supérieure au stock disponible.'))
            return
        }
        onAddToCart(quantity)
        Alert.alert(
            t('Ajouté au panier'),
            t('{qty} × {title} ajouté à votre panier.', { qty: quantity, title: product.title }),
            [
                { text: t('Continuer mes achats'), style: 'cancel', onPress: () => navigation.goBack() },
                { text: t('Voir le panier'), onPress: () => navigation.goBack() },
            ]
        )
    }

    const onImageScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const idx = Math.round(event.nativeEvent.contentOffset.x / width)
        setActiveImage(idx)
    }

    const images = product.images && product.images.length > 0 ? product.images : []

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* ── Carousel images ── */}
                <View style={styles.carouselWrap}>
                    {images.length > 0 ? (
                        <ScrollView
                            ref={carouselRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={onImageScroll}
                            scrollEventThrottle={16}
                        >
                            {images.map((uri, i) => (
                                <Image key={i} source={{ uri }} style={styles.heroImage} resizeMode="cover" />
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
                            <ShoppingCart size={48} color={colors.textMuted} strokeWidth={1.25} />
                        </View>
                    )}

                    {/* Bouton retour overlay */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                        <ArrowLeft size={20} color="#FFF" strokeWidth={2} />
                    </TouchableOpacity>

                    {/* Indicateurs */}
                    {images.length > 1 && (
                        <View style={styles.dots}>
                            {images.map((_, i) => (
                                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
                            ))}
                        </View>
                    )}

                    {/* Badge featured */}
                    {product.is_featured && (
                        <View style={styles.featuredBadge}>
                            <Star size={11} color="#FFF" fill="#FFF" />
                            <Text style={styles.featuredText}>{t('Coup de cœur')}</Text>
                        </View>
                    )}

                    {hasDiscount && (
                        <View style={styles.discountBadge}>
                            <Text style={styles.discountText}>
                                -{Math.round(((product.price - product.sale_price!) / product.price) * 100)}%
                            </Text>
                        </View>
                    )}
                </View>

                {/* ── Infos produit ── */}
                <View style={styles.infoCard}>
                    {product.category ? (
                        <Text style={styles.category}>{t(product.category)}</Text>
                    ) : null}

                    <Text style={styles.title}>{t(product.title)}</Text>

                    {/* Prix */}
                    <View style={styles.priceRow}>
                        <Text style={styles.priceMain}>{formatPrice(displayPrice)}</Text>
                        {hasDiscount && <Text style={styles.priceOld}>{formatPrice(product.price)}</Text>}
                    </View>

                    {/* Stock */}
                    <View style={[styles.stockBadge, outOfStock && styles.stockBadgeOut]}>
                        <View style={[styles.stockDot, outOfStock && styles.stockDotOut]} />
                        <Text style={[styles.stockText, outOfStock && styles.stockTextOut]}>
                            {outOfStock
                                ? t('Rupture de stock')
                                : t('{stock} en stock', { stock: product.stock })}
                        </Text>
                    </View>

                    {/* Description courte */}
                    {product.description ? (
                        <Text style={styles.description}>{t(product.description)}</Text>
                    ) : null}

                    {/* Description longue */}
                    {product.long_description ? (
                        <View style={styles.longDescBox}>
                            <View style={styles.sectionHeader}>
                                <Tag size={16} color={colors.primary} strokeWidth={1.75} />
                                <Text style={styles.sectionTitle}>{t('Description détaillée')}</Text>
                            </View>
                            <Text style={styles.longDesc}>{t(product.long_description)}</Text>
                        </View>
                    ) : null}

                    {/* Sélecteur quantité */}
                    {!outOfStock && (
                        <View style={styles.qtyBlock}>
                            <Text style={styles.qtyLabel}>{t('Quantité')}</Text>
                            <View style={styles.qtyControls}>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Minus size={16} color={quantity <= 1 ? colors.textMuted : colors.primary} strokeWidth={2} />
                                </TouchableOpacity>
                                <Text style={styles.qtyValue}>{quantity}</Text>
                                <TouchableOpacity
                                    style={styles.qtyBtn}
                                    onPress={() => setQuantity(q => Math.min(product.stock, q + 1))}
                                    disabled={quantity >= product.stock}
                                >
                                    <Plus size={16} color={quantity >= product.stock ? colors.textMuted : colors.primary} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.qtyTotal}>
                                {t('Total')} : <Text style={styles.qtyTotalValue}>{formatPrice(displayPrice * quantity)}</Text>
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 110 }} />
                </View>
            </ScrollView>

            {/* CTA fixed bottom */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.addBtn, outOfStock && styles.addBtnDisabled]}
                    activeOpacity={0.85}
                    disabled={outOfStock}
                    onPress={handleAddToCart}
                >
                    {outOfStock ? (
                        <Text style={styles.addBtnText}>{t('Indisponible')}</Text>
                    ) : (
                        <>
                            <ShoppingCart size={18} color="#FFF" strokeWidth={1.75} />
                            <Text style={styles.addBtnText}>{t('Ajouter au panier')}</Text>
                            <ChevronRight size={18} color="#FFF" strokeWidth={2} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    /* Carousel */
    carouselWrap: { position: 'relative', width, height: width * 0.95, backgroundColor: colors.surfaceWarm },
    heroImage: { width, height: width * 0.95, backgroundColor: colors.surfaceWarm },
    heroImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
    backBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 16,
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center', justifyContent: 'center',
    },
    dots: {
        position: 'absolute', bottom: 14, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'center', gap: 6,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
    dotActive: { backgroundColor: '#FFF', width: 22 },
    featuredBadge: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, right: 16,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6,
        borderRadius: 6, ...shadows.glow,
    },
    featuredText: { fontSize: 10, color: '#FFF', fontFamily: 'Outfit_700Bold', letterSpacing: 0.5 },
    discountBadge: {
        position: 'absolute', bottom: 14, right: 16,
        backgroundColor: colors.danger,
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6,
    },
    discountText: { color: '#FFF', fontSize: 12, fontFamily: 'Outfit_700Bold' },

    /* Info card */
    infoCard: {
        marginTop: -22,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.xl,
    },
    category: {
        ...typography.overline,
        color: colors.primary,
        marginBottom: 8,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: 12,
    },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 12 },
    priceMain: { fontSize: 26, fontFamily: 'Outfit_700Bold', color: colors.primary },
    priceOld: { fontSize: 16, color: colors.textMuted, textDecorationLine: 'line-through' },

    stockBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 5,
        backgroundColor: colors.successBg, borderRadius: 6,
        marginBottom: 18,
    },
    stockBadgeOut: { backgroundColor: colors.dangerBg },
    stockDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
    stockDotOut: { backgroundColor: colors.danger },
    stockText: { fontSize: 12, color: colors.success, fontFamily: 'Outfit_600SemiBold' },
    stockTextOut: { color: colors.danger },

    description: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: 18,
    },

    longDescBox: {
        backgroundColor: colors.surfaceWarm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: 20,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    sectionTitle: { ...typography.h3, fontSize: 14, color: colors.textPrimary },
    longDesc: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },

    qtyBlock: {
        backgroundColor: colors.surfaceWarm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    qtyLabel: {
        ...typography.label,
        color: colors.textSecondary, marginBottom: 10,
    },
    qtyControls: {
        flexDirection: 'row', alignItems: 'center', gap: 18,
        marginBottom: 12,
    },
    qtyBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.borderPrimary,
    },
    qtyValue: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.textPrimary, minWidth: 30, textAlign: 'center' },
    qtyTotal: { ...typography.bodySmall, color: colors.textSecondary },
    qtyTotalValue: { color: colors.primary, fontFamily: 'Outfit_700Bold' },

    /* Bottom CTA */
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md,
        ...shadows.primary,
    },
    addBtnDisabled: { backgroundColor: colors.textMuted, opacity: 0.5 },
    addBtnText: { ...typography.button, color: '#FFF' },
})
