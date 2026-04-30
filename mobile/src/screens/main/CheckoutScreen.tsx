'use strict'
import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    TextInput, Alert, Platform, ActivityIndicator,
} from 'react-native'
import { ArrowLeft, MapPin, Package, ShieldCheck, User, Phone, Mail, Globe, Lock } from 'lucide-react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'
import { useAuth } from '../../contexts/AuthContext'
import KkiapayModal from '../../components/KkiapayModal'
import { fetchWithTimeout } from '../../lib/fetch'
import { RootStackParamList } from '../../navigation/AppNavigator'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'
const SHIPPING_KEY = '@rg_mobile_shipping'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Checkout'>
type Route = RouteProp<RootStackParamList, 'Checkout'>

interface SavedShipping {
    name: string
    phone: string
    email: string
    address: string
    city: string
    postal: string
    country: string
    notes: string
}

const EMPTY_SHIPPING: SavedShipping = {
    name: '', phone: '', email: '',
    address: '', city: '', postal: '', country: 'Bénin',
    notes: '',
}

export default function CheckoutScreen({ navigation, route }: { navigation: Nav; route: Route }) {
    const { cart, total } = route.params
    const { t } = useLang()
    const { profile } = useAuth()

    const [showPayment, setShowPayment] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState<SavedShipping>(EMPTY_SHIPPING)

    /* ── Charger l'adresse précédemment utilisée ── */
    useEffect(() => {
        AsyncStorage.getItem(SHIPPING_KEY).then(raw => {
            if (raw) {
                try {
                    const saved = JSON.parse(raw) as SavedShipping
                    setForm({ ...EMPTY_SHIPPING, ...saved })
                    return
                } catch { /* ignore */ }
            }
            // Fallback : pré-remplir depuis le profil
            if (profile) {
                setForm(f => ({
                    ...f,
                    name: `${profile.prenom || ''} ${profile.nom || ''}`.trim(),
                    phone: profile.phone || '',
                    email: profile.email || '',
                    city: profile.ville || '',
                    country: profile.pays || 'Bénin',
                }))
            }
        }).catch(() => {})
    }, [profile])

    const set = (key: keyof SavedShipping) => (v: string) => setForm(f => ({ ...f, [key]: v }))

    const formatPrice = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

    /* ── Validation ── */
    const validateForm = (): string | null => {
        if (!form.name.trim()) return t('Veuillez renseigner votre nom complet.')
        if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 8) {
            return t('Numéro de téléphone invalide.')
        }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            return t('Email invalide.')
        }
        if (!form.address.trim()) return t("Veuillez renseigner l'adresse de livraison.")
        if (!form.city.trim()) return t('Veuillez renseigner la ville.')
        if (!form.country.trim()) return t('Veuillez renseigner le pays.')
        return null
    }

    /* ── Sauvegarder l'adresse pour la prochaine fois ── */
    const persistShipping = useCallback(() => {
        AsyncStorage.setItem(SHIPPING_KEY, JSON.stringify(form)).catch(() => {})
    }, [form])

    /* ── Lancer le paiement ── */
    const handlePay = () => {
        const err = validateForm()
        if (err) {
            Alert.alert(t('Information requise'), err)
            return
        }
        persistShipping()
        setShowPayment(true)
    }

    /* ── Après paiement Kkiapay réussi → POST /api/mobile/orders ── */
    const handlePaymentSuccess = async (txId: string) => {
        if (!profile) {
            Alert.alert(
                t('Compte requis'),
                t('Veuillez vous connecter pour finaliser votre commande. Référence paiement : ') + txId,
            )
            setShowPayment(false)
            return
        }

        setSubmitting(true)
        try {
            const cartItemsPayload = cart.map(c => ({
                product_id: c.product.id,
                title: c.product.title,
                quantity: c.quantity,
                unit_price: c.product.sale_price && c.product.sale_price < c.product.price
                    ? c.product.sale_price : c.product.price,
            }))

            const res = await fetchWithTimeout(`${API_BASE}/api/mobile/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 20000,
                body: JSON.stringify({
                    client_id: profile.id,
                    customer_name: form.name.trim(),
                    customer_phone: form.phone.trim(),
                    customer_email: form.email.trim() || profile.email || null,
                    cart_items: cartItemsPayload,
                    amount: total,
                    currency: 'XOF',
                    transaction_id: txId,
                    shipping: {
                        address: form.address.trim(),
                        city: form.city.trim(),
                        postal: form.postal.trim() || null,
                        country: form.country.trim(),
                        notes: form.notes.trim() || null,
                    },
                }),
            })
            const data = await res.json().catch(() => ({}))

            if (!res.ok || !data.ok) {
                Alert.alert(
                    t('Erreur enregistrement'),
                    t('Le paiement a été reçu mais la commande n\'a pas pu être enregistrée. Référence : ') + txId,
                )
                return
            }

            setShowPayment(false)
            // Reset cart in calling screen via navigation params (BoutiqueScreen reads it)
            navigation.navigate('OrderConfirmation', {
                orderId: data.order_id,
                transactionId: txId,
            })
        } catch (e) {
            console.error('[Checkout] Submit failed:', e)
            Alert.alert(
                t('Erreur'),
                t('Impossible de finaliser votre commande. Référence : ') + txId,
            )
        } finally {
            setSubmitting(false)
        }
    }

    /* ── Render ── */
    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={22} color="#FFF" strokeWidth={1.75} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('Finaliser la commande')}</Text>
                    <Text style={styles.headerSub}>{t('Adresse de livraison + paiement')}</Text>
                </View>

                {/* Récap panier */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Package size={18} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.cardTitle}>{t('Votre commande')}</Text>
                    </View>
                    {cart.map((item, i) => (
                        <View key={i} style={styles.cartLine}>
                            <Text style={styles.cartItemName} numberOfLines={1}>
                                {item.quantity} × {t(item.product.title)}
                            </Text>
                            <Text style={styles.cartItemPrice}>
                                {formatPrice(
                                    (item.product.sale_price && item.product.sale_price < item.product.price
                                        ? item.product.sale_price : item.product.price) * item.quantity
                                )}
                            </Text>
                        </View>
                    ))}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>{t('Total à payer')}</Text>
                        <Text style={styles.totalValue}>{formatPrice(total)}</Text>
                    </View>
                </View>

                {/* Formulaire livraison */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MapPin size={18} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.cardTitle}>{t('Adresse de livraison')}</Text>
                    </View>

                    <Field label={t('Nom complet')} value={form.name} onChange={set('name')} icon={<User size={16} color={colors.textMuted} />} placeholder={t('Jean Dupont')} />
                    <Field label={t('Téléphone')} value={form.phone} onChange={set('phone')} icon={<Phone size={16} color={colors.textMuted} />} placeholder="+229 XX XX XX XX" keyboardType="phone-pad" />
                    <Field label={t('Email')} value={form.email} onChange={set('email')} icon={<Mail size={16} color={colors.textMuted} />} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
                    <Field label={t('Adresse complète')} value={form.address} onChange={set('address')} icon={<MapPin size={16} color={colors.textMuted} />} placeholder={t('Quartier, rue, immeuble…')} multiline />

                    <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                            <Field label={t('Ville')} value={form.city} onChange={set('city')} placeholder={t('Cotonou')} />
                        </View>
                        <View style={{ width: 110 }}>
                            <Field label={t('Code postal')} value={form.postal} onChange={set('postal')} placeholder="00229" />
                        </View>
                    </View>

                    <Field label={t('Pays')} value={form.country} onChange={set('country')} icon={<Globe size={16} color={colors.textMuted} />} placeholder={t('Bénin')} />
                    <Field
                        label={t('Instructions livraison (optionnel)')}
                        value={form.notes}
                        onChange={set('notes')}
                        placeholder={t('Étage, code, repère, horaire préféré…')}
                        multiline
                    />
                </View>

                {/* Note sécurité */}
                <View style={styles.securityNote}>
                    <ShieldCheck size={14} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.securityText}>
                        {t('Paiement 100% sécurisé via Kkiapay — Mobile Money & cartes bancaires')}
                    </Text>
                </View>

                <View style={{ height: 110 }} />
            </ScrollView>

            {/* CTA fixe */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.payBtn, submitting && styles.payBtnDisabled]}
                    onPress={handlePay}
                    disabled={submitting}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Lock size={18} color="#FFF" strokeWidth={1.75} />
                            <Text style={styles.payBtnText}>{t('Payer')} {formatPrice(total)}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <KkiapayModal
                visible={showPayment}
                amount={String(total)}
                serviceName={cart.map(c => c.product.title).join(', ')}
                onClose={() => setShowPayment(false)}
                onSuccess={handlePaymentSuccess}
            />
        </View>
    )
}

/* ── Composant Field ── */
function Field({
    label, value, onChange, placeholder, icon, keyboardType = 'default', autoCapitalize = 'sentences', multiline = false,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    icon?: React.ReactNode
    keyboardType?: 'default' | 'phone-pad' | 'email-address'
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
    multiline?: boolean
}) {
    return (
        <View style={styles.field}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <View style={[styles.inputWrap, multiline && { alignItems: 'flex-start' }]}>
                {icon ? <View style={{ marginRight: 8, marginTop: multiline ? 2 : 0 }}>{icon}</View> : null}
                <TextInput
                    style={[styles.input, multiline && styles.inputMultiline]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={false}
                    multiline={multiline}
                    numberOfLines={multiline ? 3 : 1}
                />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 20,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

    card: {
        margin: spacing.lg,
        marginBottom: 0,
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { ...typography.h3, fontSize: 15, color: colors.textPrimary },

    cartLine: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8,
    },
    cartItemName: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, marginRight: 10 },
    cartItemPrice: { ...typography.label, color: colors.textPrimary },

    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 10, paddingTop: 10,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    totalLabel: { ...typography.label, color: colors.textSecondary },
    totalValue: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: colors.primary },

    field: { marginBottom: 12 },
    fieldLabel: { ...typography.label, color: colors.textSecondary, marginBottom: 5 },
    inputWrap: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surfaceWarm,
        borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.borderLight,
        paddingHorizontal: 12, minHeight: 44,
    },
    input: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 8 },
    inputMultiline: { minHeight: 70, paddingTop: 8, textAlignVertical: 'top' },

    row2: { flexDirection: 'row', gap: 10 },

    securityNote: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 0,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: colors.primaryMuted,
        borderRadius: radius.sm,
    },
    securityText: { ...typography.caption, color: colors.primary, flex: 1 },

    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.borderLight,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    payBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.primary, paddingVertical: 16, borderRadius: radius.md,
        ...shadows.primary,
    },
    payBtnDisabled: { opacity: 0.6 },
    payBtnText: { ...typography.button, color: '#FFF' },
})
