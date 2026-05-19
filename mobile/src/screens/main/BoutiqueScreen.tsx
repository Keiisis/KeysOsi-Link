import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
    Image, Dimensions, Platform, RefreshControl, ActivityIndicator,
    ScrollView,
} from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    withSpring,
    withTiming,
    withDelay,
    withRepeat,
    withSequence,
    interpolate,
    Extrapolation,
    Easing as REasing,
} from 'react-native-reanimated'
import { ShoppingBag, ArrowLeft, Plus, Minus, X, Truck, Sparkles, Crown } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Video, ResizeMode } from 'expo-av'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useLang } from '../../contexts/LangContext'
import { useCart } from '../../contexts/CartContext'
import { fetchWithTimeout } from '../../lib/fetch'
import { RootStackParamList, BoutiqueProduct } from '../../navigation/AppNavigator'
import { royal, fonts, motion } from '../../config/theme'

const { width, height } = Dimensions.get('window')
const CARD_GAP = 16
const CARD_W = (width - 40 - CARD_GAP) / 2
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'



type Nav = NativeStackNavigationProp<RootStackParamList, 'Boutique'>

/* ── Animation Hyper-Réaliste de la Vitrine (Vidéo) ── */
const StorefrontAnimation = () => {
    const scale = useSharedValue(0.95)

    useEffect(() => {
        scale.value = withSpring(1, { damping: 10, stiffness: 60 })
    }, [scale])

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    // Dimensions adaptées à la vidéo
    const STORE_WIDTH = width - 40;
    const STORE_HEIGHT = 220; 

    return (
        <Animated.View style={[storeStyles.container, { width: STORE_WIDTH, height: STORE_HEIGHT, backgroundColor: '#000' }, animStyle]}>
            <Video
                source={require('../../../assets/images/boutique_video.mp4')}
                style={StyleSheet.absoluteFillObject}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted={true}
            />

            {/* Fondu de transition au sol pour se fondre doucement dans le dégradé chic */}
            <LinearGradient colors={['transparent', `${royal.bgWarm}`]} style={StyleSheet.absoluteFillObject} start={{x:0, y:0.75}} end={{x:0, y:1}} pointerEvents="none" />
        </Animated.View>
    );
};

const storeStyles = StyleSheet.create({
    container: { alignSelf: 'center', position: 'relative', marginBottom: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: {width:0, height:8}, elevation: 10 }
});

/* ── Produit Card ── */
const ProductCard3D = ({ item, index, navigation, inCart, addToCart, removeFromCart, hasDiscount, displayPrice, outOfStock }: any) => {
    const { t } = useLang();
    const cardScale = useSharedValue(0.85)
    const cardOpacity = useSharedValue(0)
    const cardTranslateY = useSharedValue(40)
    const pressScaleVal = useSharedValue(1)

    useEffect(() => {
        const delay = index * 120
        cardOpacity.value = withDelay(delay, withTiming(1, { duration: 500 }))
        cardScale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 80 }))
        cardTranslateY.value = withDelay(delay, withSpring(0, { damping: 12, stiffness: 80 }))
    }, [index, cardOpacity, cardScale, cardTranslateY])

    const onPressIn = () => { pressScaleVal.value = withSpring(0.94, { damping: 15, stiffness: 150 }) }
    const onPressOut = () => { pressScaleVal.value = withSpring(1, { damping: 10, stiffness: 120 }) }

    const cardStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [
            { scale: cardScale.value },
            { translateY: cardTranslateY.value },
            { scale: pressScaleVal.value },
        ],
    }))

    return (
        <Animated.View style={[{ width: CARD_W }, cardStyle]}>
            <TouchableWithoutFeedback 
                onPressIn={onPressIn} onPressOut={onPressOut}
                onPress={() => navigation.navigate('ProductDetail', { product: item, onAddToCart: (qty: number) => addToCart(item, qty) })}
            >
                <View style={styles.card3D}>
                    <LinearGradient colors={['#ffffff', '#fcfaf6']} style={[StyleSheet.absoluteFillObject, { borderRadius: 24 }]} />
                    
                    <View style={styles.imageContainer}>
                        {item.images && item.images.length > 0 ? (
                            <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
                        ) : (
                            <View style={styles.placeholderImage}><Sparkles size={28} color={royal.gold} /></View>
                        )}
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.imageGradient} />

                        <View style={styles.tagContainer}>
                            {item.is_featured && <LinearGradient colors={[royal.gold, '#E8B653']} style={styles.gradientTag} start={{x:0, y:0}} end={{x:1, y:1}}><Text style={styles.tagTextWhite}>ÉDITION VIP</Text></LinearGradient>}
                            {hasDiscount && <View style={styles.discountTag}><Text style={styles.tagTextWhite}>-{Math.round(((item.price - item.sale_price!) / item.price) * 100)}%</Text></View>}
                        </View>

                        {!outOfStock && (
                            <TouchableOpacity 
                                style={[styles.quickAddBtn3D, inCart && styles.quickAddBtnActive]} 
                                activeOpacity={0.7}
                                onPress={(e) => { e.stopPropagation(); inCart ? removeFromCart(item.id) : addToCart(item, 1) }}
                            >
                                {inCart ? <Minus size={16} color="#FFF" /> : <Plus size={16} color="#FFF" />}
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.cardContent}>
                        <Text style={styles.categoryText}>{t(item.category).toUpperCase()}</Text>
                        <Text style={styles.productTitle} numberOfLines={2}>{t(item.title)}</Text>
                        
                        <View style={styles.priceRow}>
                            <Text style={styles.priceText}>{displayPrice.toLocaleString('fr-FR')} F</Text>
                            {hasDiscount && <Text style={styles.priceOld}>{item.price.toLocaleString('fr-FR')}</Text>}
                        </View>

                        {inCart && (
                            <View style={styles.inCartIndicator}>
                                <Text style={styles.inCartText}>{inCart.quantity} réservé(s)</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Animated.View>
    );
};

export default function BoutiqueScreen({ navigation }: { navigation: Nav }) {
    const [products, setProducts] = useState<BoutiqueProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [showCart, setShowCart] = useState(false)
    const { t, lang, isTranslating, preloadTexts } = useLang()
    const { cart, addToCart, removeFromCart, clearItem, cartCount, cartTotal } = useCart()

    const scrollY = useSharedValue(0)
    const pulseScale = useSharedValue(1)

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

    useEffect(() => {
        if (loading || lang === 'fr' || products.length === 0) return
        const texts = products.flatMap(p => [p.title, p.description].filter(Boolean))
        texts.push('L\'Édition Limitée', 'Notre Collection', 'Ajouter', 'Panier', 'Payer', 'Rupture', 'En stock')
        preloadTexts(texts)
    }, [loading, products, lang, preloadTexts])

    // Pulse animation for cart FAB
    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
                withTiming(1, { duration: 1500, easing: REasing.inOut(REasing.ease) }),
            ),
            -1,
            false,
        )
    }, [pulseScale])

    const getProductPrice = (p: BoutiqueProduct) => (p.sale_price && p.sale_price < p.price) ? p.sale_price : p.price
    const formatPrice = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'
    const cartItemForProduct = (id: string) => cart.find(c => c.product.id === id)

    // Animated scroll handler (UI thread)
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y
        },
    })

    // Header height shrinks on scroll
    const headerAnimStyle = useAnimatedStyle(() => ({
        height: interpolate(
            scrollY.value,
            [0, 200],
            [Platform.OS === 'ios' ? 120 : 100, Platform.OS === 'ios' ? 100 : 80],
            Extrapolation.CLAMP,
        ),
    }))

    // Cart FAB pulse
    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }))

    const renderHeader = () => (
        <View style={styles.headerSpacer}>
            <StorefrontAnimation />
            <Animated.View>
                <Text style={styles.mainTitle}>{t("Joyaux & Créations")}</Text>
                <Text style={styles.subTitle}>{t("L'essence de l'élégance béninoise.")}</Text>
                <View style={styles.decoratorLine} />
            </Animated.View>
        </View>
    );

    const renderProduct = ({ item, index }: { item: BoutiqueProduct, index: number }) => {
        return (
            <ProductCard3D 
                item={item} index={index} navigation={navigation} 
                inCart={cartItemForProduct(item.id)} 
                addToCart={addToCart} removeFromCart={removeFromCart} 
                hasDiscount={item.sale_price && item.sale_price < item.price} 
                displayPrice={getProductPrice(item)} 
                outOfStock={item.stock <= 0} 
            />
        )
    };

    return (
        <View style={styles.container}>
            {/* Arrière-plan Dégradé Chic Lumineux (Option 1) */}
            <LinearGradient 
                colors={['rgba(220,165,64,0.18)', royal.bgWarm, royal.bgWarm]} 
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFillObject} 
            />

            {/* Nav Bar Fixe */}
            <Animated.View style={[styles.stickyHeader, headerAnimStyle]}>
                <LinearGradient colors={[royal.deepEmerald, royal.deepLightEmerald]} style={StyleSheet.absoluteFillObject} />
                <View style={styles.navRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <ArrowLeft size={24} color="#FFF" strokeWidth={2} />
                    </TouchableOpacity>
                    
                    {/* Titre Stylisé */}
                    <View style={styles.stickyTitleWrapper}>
                        <View style={styles.titleDot} />
                        <Text style={styles.stickyTitle}>{t("LA BOUTIQUE")}</Text>
                        <View style={styles.titleDot} />
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate('Orders')} style={styles.iconBtn}>
                        <Truck size={22} color="#FFF" strokeWidth={2} />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {isTranslating && lang !== 'fr' && (
                <View style={[styles.translatingBanner, { marginTop: 100 }]}>
                    <ActivityIndicator color={royal.emerald} size="small" />
                    <Text style={styles.translatingText}>{t('Traduction...')}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingWrap}><ActivityIndicator color={royal.gold} size="large" /></View>
            ) : products.length === 0 ? (
                <View style={styles.emptyWrap}>
                    <StorefrontAnimation />
                    <Text style={styles.emptyTitle}>{t('Collection Secrète')}</Text>
                    <Text style={styles.emptyDesc}>{t("Les artisans sculptent les prochaines merveilles. Revenez bientôt.")}</Text>
                </View>
            ) : (
                <Animated.FlatList
                    data={products}
                    keyExtractor={(item) => item.id}
                    renderItem={renderProduct}
                    numColumns={2}
                    contentContainerStyle={styles.gridContent}
                    columnWrapperStyle={styles.columnWrapper}
                    ListHeaderComponent={renderHeader}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={royal.gold} progressViewOffset={100} />}
                    onScroll={scrollHandler}
                    scrollEventThrottle={16}
                />
            )}

            {cartCount > 0 && (
                <Animated.View style={[styles.cartFloatWrap, pulseStyle]}>
                    <TouchableOpacity style={styles.cartFloatBtn} activeOpacity={0.9} onPress={() => setShowCart(true)}>
                        <LinearGradient colors={[royal.gold, '#B8860B']} style={[StyleSheet.absoluteFillObject, { borderRadius: 30 }]} />
                        <View style={styles.cartIconBadge}>
                            <ShoppingBag size={22} color={royal.textDark} strokeWidth={2} />
                            <View style={styles.badgeDot}><Text style={styles.badgeText}>{cartCount}</Text></View>
                        </View>
                        <Text style={styles.cartFloatLabel}>{t('Ouvrir le Panier')} • {formatPrice(cartTotal)}</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {showCart && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalBg} onPress={() => setShowCart(false)} activeOpacity={1} />
                    <Animated.View style={styles.bottomSheet}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>{t('Vos Merveilles')}</Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowCart(false)}><X size={20} color={royal.textDark} /></TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: height * 0.5 }} showsVerticalScrollIndicator={false}>
                            {cart.map((item, idx) => (
                                <View key={item.product.id} style={[styles.cartItem, idx === cart.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.cartImgWrap}>
                                        <Image source={{ uri: item.product.images?.[0] }} style={styles.cartImg} />
                                    </View>
                                    <View style={styles.cartInfo}>
                                        <Text style={styles.cartItemBrand}>{t(item.product.category).toUpperCase()}</Text>
                                        <Text style={styles.cartItemName} numberOfLines={2}>{t(item.product.title)}</Text>
                                        <Text style={styles.cartItemPrice}>{formatPrice(getProductPrice(item.product))}</Text>
                                    </View>
                                    <View style={styles.cartActions}>
                                        <TouchableOpacity onPress={() => removeFromCart(item.product.id)} style={styles.cartActionBtn}><Minus size={14} color={royal.emerald} /></TouchableOpacity>
                                        <Text style={styles.cartQty}>{item.quantity}</Text>
                                        <TouchableOpacity onPress={() => addToCart(item.product, 1)} style={styles.cartActionBtn}><Plus size={14} color={royal.emerald} /></TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>{t('Sous-total')}</Text>
                                <Text style={styles.totalValue}>{formatPrice(cartTotal)}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.checkoutBtn} 
                                activeOpacity={0.8}
                                onPress={() => { setShowCart(false); navigation.navigate('Checkout', { cart, total: cartTotal }); }}
                            >
                                <LinearGradient colors={[royal.deepEmerald, royal.deepLightEmerald]} style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]} />
                                <Sparkles size={20} color={royal.gold} style={{marginRight: 10}}/>
                                <Text style={styles.checkoutBtnText}>{t('Sceller la Commande')}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: royal.bgWarm },
    
    stickyHeader: {
        position: 'absolute', top: 0, left: 0, right: 0,
        zIndex: 10,
        justifyContent: 'flex-end',
        paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        shadowColor: royal.deepEmerald, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: {width:0, height:10}, elevation: 15
    },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    
    stickyTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(220,165,64,0.15)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(220,165,64,0.3)' },
    stickyTitle: { fontFamily: fonts.heading, fontSize: 16, color: royal.gold, letterSpacing: 3, textTransform: 'uppercase' },
    titleDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: royal.gold, opacity: 0.8 },

    headerSpacer: { paddingTop: Platform.OS === 'ios' ? 140 : 120, paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center' },
    mainTitle: { fontFamily: fonts.heading, fontSize: 38, color: royal.deepEmerald, marginBottom: 8, textAlign: 'center' },
    subTitle: { fontFamily: 'Inter_500Medium', fontSize: 15, color: royal.terracotta, textAlign: 'center', fontStyle: 'italic' },
    decoratorLine: { width: 60, height: 3, backgroundColor: royal.gold, marginTop: 15, borderRadius: 2, alignSelf: 'center' },

    gridContent: { paddingHorizontal: 20, paddingBottom: 120 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: CARD_GAP + 10 },

    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: royal.emerald, textAlign: 'center', marginTop: -20 },
    emptyDesc: { fontFamily: 'Inter_400Regular', fontSize: 15, color: royal.textDark, textAlign: 'center', marginTop: 10, lineHeight: 22, opacity: 0.8 },

    card3D: { 
        width: CARD_W, backgroundColor: royal.surface, borderRadius: 24, 
        shadowColor: royal.gold, shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: {width:0, height:10}, 
        elevation: 8
    },
    imageContainer: { width: '100%', aspectRatio: 0.8, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', position: 'relative' },
    cardImage: { width: '100%', height: '100%' },
    placeholderImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: royal.goldSoft },
    imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
    
    tagContainer: { position: 'absolute', top: 12, left: 12, gap: 6, alignItems: 'flex-start' },
    gradientTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, shadowColor: royal.gold, shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: {width:0, height:3} },
    discountTag: { backgroundColor: royal.terracotta, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, shadowColor: royal.terracotta, shadowOpacity: 0.5, shadowRadius: 5, shadowOffset: {width:0, height:3} },
    tagTextWhite: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#FFF', letterSpacing: 0.5 },

    quickAddBtn3D: { position: 'absolute', bottom: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: royal.deepEmerald, alignItems: 'center', justifyContent: 'center', shadowColor: royal.deepEmerald, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: {width:0, height:4}, elevation: 5 },
    quickAddBtnActive: { backgroundColor: royal.terracotta },

    cardContent: { padding: 14, paddingTop: 12 },
    categoryText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: royal.terracotta, letterSpacing: 1.5, marginBottom: 4 },
    productTitle: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 15, color: royal.textDark, lineHeight: 20, marginBottom: 8 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    priceText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: royal.deepEmerald },
    priceOld: { fontFamily: 'Inter_500Medium', fontSize: 12, color: royal.textDark, opacity: 0.4, textDecorationLine: 'line-through' },
    
    inCartIndicator: { marginTop: 8, backgroundColor: royal.goldSoft, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    inCartText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: royal.textDark },

    cartFloatWrap: { position: 'absolute', bottom: 30, left: 20, right: 20, alignItems: 'center' },
    cartFloatBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 26, borderRadius: 30, shadowColor: royal.gold, shadowOpacity: 0.4, shadowRadius: 25, shadowOffset: {width:0, height:12}, elevation: 10, gap: 12, overflow: 'hidden' },
    cartIconBadge: { position: 'relative' },
    badgeDot: { position: 'absolute', top: -8, right: -10, backgroundColor: royal.terracotta, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: royal.gold, paddingHorizontal: 4 },
    badgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 10, color: '#FFF' },
    cartFloatLabel: { fontFamily: 'Inter_700Bold', fontSize: 15, color: royal.textDark },

    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
    modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,26,20,0.6)' },
    bottomSheet: { backgroundColor: royal.bg, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: {width:0, height:-15}, elevation: 20 },
    sheetHandle: { width: 50, height: 5, backgroundColor: royal.border, borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sheetTitle: { fontFamily: fonts.heading, fontSize: 26, color: royal.deepEmerald },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: royal.border, alignItems: 'center', justifyContent: 'center' },

    cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: royal.border },
    cartImgWrap: { shadowColor: royal.textDark, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: {width:0, height:4} },
    cartImg: { width: 66, height: 88, borderRadius: 12, backgroundColor: royal.surface },
    cartInfo: { flex: 1, marginLeft: 16 },
    cartItemBrand: { fontFamily: 'Inter_700Bold', fontSize: 10, color: royal.terracotta, letterSpacing: 1, marginBottom: 4 },
    cartItemName: { fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 17, color: royal.textDark, marginBottom: 6 },
    cartItemPrice: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: royal.deepEmerald },
    
    cartActions: { flexDirection: 'row', alignItems: 'center', backgroundColor: royal.surface, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 4, shadowColor: royal.textDark, shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: {width:0, height:2}, elevation: 2 },
    cartActionBtn: { padding: 8 },
    cartQty: { fontFamily: 'Inter_700Bold', fontSize: 14, color: royal.textDark, marginHorizontal: 8 },

    sheetFooter: { marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: royal.border },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    totalLabel: { fontFamily: 'Inter_500Medium', fontSize: 16, color: royal.textDark, opacity: 0.7 },
    totalValue: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 28, color: royal.emerald },
    
    checkoutBtn: { flexDirection: 'row', paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: royal.deepEmerald, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: {width:0, height:8}, elevation: 10, overflow: 'hidden' },
    checkoutBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: royal.gold, letterSpacing: 0.5 },

    translatingBanner: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: royal.goldSoft, gap: 10 },
    translatingText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: royal.deepEmerald }
});
