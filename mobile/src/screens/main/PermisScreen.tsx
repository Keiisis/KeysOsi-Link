/* ═══════════════════════════════════════════════════════════
   Permis de Conduire Béninois — réservation mobile.
   Le client choisit sa CATÉGORIE de permis (le prix en dépend, fixé serveur
   depuis permis_types) puis, facultativement, une auto-école partenaire, puis
   paie. Miroir fidèle du web (components/services/PermisBooking) :
   /api/permis-types + /api/driving-schools + /api/services/permis-checkout
   → Kkiapay (natif) → /api/checkout/verify. Charte blanche + tricolore.
═══════════════════════════════════════════════════════════ */

import React, { useCallback, useEffect, useState } from 'react'
import {
    View, Text, StyleSheet, ScrollView, Pressable, Image,
    ActivityIndicator, TextInput, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, Car, Clock, MapPin, Check, CreditCard, IdCard, ShieldCheck } from 'lucide-react-native'
import { screenColors as C, spacing, radius, shadows, fonts, typography } from '../../config/theme'
import { useAuth } from '../../contexts/AuthContext'
import { FlagBar } from '../../components/ui'
import { useLang } from '../../contexts/LangContext'
import { toast } from '../../lib/feedback'
import KkiapayModal from '../../components/KkiapayModal'
import { fetchWithTimeout } from '../../lib/fetch'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

interface PermisType {
    id: string
    category: string
    label: string
    description: string | null
    age_min: number | null
    price_eur: number | null
    duration: string | null
}
interface School {
    id: string
    nom: string
    ville: string | null
    description: string | null
    photo_url: string | null
    price_eur: number | null
    duration: string | null
}

const cleanLabel = (l: string) => l.replace(/\s*\([^)]*\)\s*$/, '')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PermisScreen({ navigation }: { navigation: any }) {
    const insets = useSafeAreaInsets()
    const { profile } = useAuth()
    const { t } = useLang()

    const [types, setTypes] = useState<PermisType[]>([])
    const [typeId, setTypeId] = useState('')
    const [schools, setSchools] = useState<School[]>([])
    const [schoolId, setSchoolId] = useState('') // '' = laisser RGB choisir
    const [form, setForm] = useState({ name: '', email: '', phone: '' })
    const [focused, setFocused] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [showPay, setShowPay] = useState(false)
    const [pendingOrder, setPendingOrder] = useState<string | null>(null)
    const [payAmount, setPayAmount] = useState('')

    useEffect(() => {
        let alive = true
        ;(async () => {
            try {
                const [tRes, sRes] = await Promise.all([
                    fetchWithTimeout(`${API_BASE}/api/permis-types`, { timeoutMs: 12000 }),
                    fetchWithTimeout(`${API_BASE}/api/driving-schools`, { timeoutMs: 12000 }),
                ])
                const tJson = await tRes.json().catch(() => ({}))
                const sJson = await sRes.json().catch(() => ({}))
                if (!alive) return
                setTypes(Array.isArray(tJson.types) ? tJson.types : [])
                setSchools(Array.isArray(sJson.schools) ? sJson.schools : [])
            } catch { /* repli : listes vides gérées à l'affichage */ }
            finally { if (alive) setLoading(false) }
        })()
        return () => { alive = false }
    }, [])

    useEffect(() => {
        setForm({
            name: profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() : '',
            email: profile?.email || '',
            phone: profile?.phone || '',
        })
    }, [profile])

    const selected = types.find(x => x.id === typeId) || null
    const priceReady = !!(selected && typeof selected.price_eur === 'number' && selected.price_eur > 0)

    const submitBooking = useCallback(async () => {
        if (!typeId) { toast(t('Catégorie requise'), t('Choisissez une catégorie de permis.')); return }
        if (!form.name.trim() || !form.phone.trim()) {
            toast(t('Champs requis'), t('Votre nom et votre téléphone sont nécessaires.')); return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            toast(t('Email invalide'), t('Veuillez saisir un email valide.')); return
        }
        setSubmitting(true)
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/services/permis-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 20000,
                body: JSON.stringify({
                    permis_type_id: typeId,
                    school_id: schoolId || undefined,
                    customer_name: form.name.trim(),
                    customer_email: form.email.trim().toLowerCase(),
                    customer_phone: form.phone.trim(),
                    payment_method: 'kkiapay',
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.success) {
                toast(t('Réservation impossible'), data.error || t('Réessayez dans un instant.'))
                return
            }
            setPendingOrder(String(data.order_id))
            setPayAmount(`${data.amount_xof} FCFA`)
            setShowPay(true)
        } catch {
            toast(t('Erreur réseau'), t('Vérifiez votre connexion et réessayez.'))
        } finally {
            setSubmitting(false)
        }
    }, [typeId, schoolId, form, t])

    const onPaid = useCallback(async (txId: string) => {
        setShowPay(false)
        if (!pendingOrder) return
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/checkout/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 20000,
                body: JSON.stringify({ order_id: pendingOrder, transaction_id: txId }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && data.success) {
                toast(t('Inscription confirmée'), t('Paiement confirmé. Notre équipe vous contacte sous 24 h pour lancer votre dossier de permis et planifier votre formation. Reçu envoyé par email.'))
            } else {
                toast(t('Paiement reçu'), t('Le paiement a été reçu mais la confirmation a échoué. Référence : ') + txId)
            }
        } catch {
            toast(t('Paiement reçu'), t('Confirmation réseau échouée. Référence : ') + txId)
        } finally {
            setPendingOrder(null)
        }
    }, [pendingOrder, t])

    const field = (name: string) => [styles.field, focused === name && styles.fieldFocused]

    return (
        <View style={styles.container}>
            <View style={{ paddingTop: insets.top }}>
                <FlagBar height={6} radiusTop={false} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Retour')}>
                    <ChevronLeft size={24} color={C.text} strokeWidth={2.2} />
                </Pressable>
                <Text style={styles.headerTitle}>{t('Permis de conduire')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.heroIcon}><IdCard size={28} color={C.primary} strokeWidth={2} /></View>
                <Text style={styles.title}>{t('Permis de Conduire Béninois')}</Text>
                <Text style={styles.subtitle}>{t('Choisissez votre catégorie, votre auto-école, et lancez votre dossier. Prix officiel par catégorie.')}</Text>

                {loading ? (
                    <View style={styles.loadingBox}><ActivityIndicator color={C.primary} size="large" /></View>
                ) : types.length === 0 ? (
                    <View style={styles.warnBox}>
                        <IdCard size={22} color={C.warning} />
                        <Text style={styles.warnText}>{t('Les catégories de permis seront bientôt disponibles. Contactez-nous pour lancer votre permis dès maintenant.')}</Text>
                    </View>
                ) : (
                    <>
                        {/* 1. Catégorie */}
                        <Text style={styles.stepLabel}>{t('1. Votre catégorie de permis')}</Text>
                        <View style={styles.typeGrid}>
                            {types.map(ty => {
                                const active = typeId === ty.id
                                const pEur = typeof ty.price_eur === 'number' && ty.price_eur > 0 ? ty.price_eur : null
                                return (
                                    <Pressable key={ty.id} onPress={() => setTypeId(ty.id)} style={[styles.typeCard, active && styles.typeCardActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                                        <View style={styles.typeTop}>
                                            <View style={[styles.catBadge, active && styles.catBadgeActive]}>
                                                <Text style={[styles.catBadgeText, active && styles.catBadgeTextActive]}>{ty.category}</Text>
                                            </View>
                                            <Text style={styles.typeLabel} numberOfLines={2}>{cleanLabel(ty.label)}</Text>
                                            {active && <Check size={18} color={C.primary} strokeWidth={2.5} />}
                                        </View>
                                        {!!ty.description && <Text style={styles.typeDesc} numberOfLines={2}>{ty.description}</Text>}
                                        <View style={styles.typeMeta}>
                                            <Text style={styles.typePrice}>
                                                {pEur ? `${pEur} €` : t('Tarif à confirmer')}
                                            </Text>
                                            {!!ty.duration && (
                                                <View style={styles.typeDuration}>
                                                    <Clock size={12} color={C.primary} />
                                                    <Text style={styles.typeDurationText}>{ty.duration}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </Pressable>
                                )
                            })}
                        </View>

                        {/* 2. Auto-école (facultatif) */}
                        {schools.length > 0 && (
                            <>
                                <Text style={styles.stepLabel}>{t('2. Votre auto-école')}</Text>
                                <Text style={styles.stepHint}>{t("Facultatif. Sans choix, nous vous orientons vers l'auto-école partenaire la plus proche.")}</Text>
                                <Pressable onPress={() => setSchoolId('')} style={[styles.schoolRow, schoolId === '' && styles.schoolRowActive]} accessibilityRole="button">
                                    <View style={styles.schoolIcon}><Car size={16} color={C.textMuted} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.schoolName}>{t('Laisser RGB choisir')}</Text>
                                        <Text style={styles.schoolCity}>{t('La plus proche de vous')}</Text>
                                    </View>
                                    {schoolId === '' && <Check size={18} color={C.primary} strokeWidth={2.5} />}
                                </Pressable>
                                {schools.map(sc => {
                                    const on = schoolId === sc.id
                                    return (
                                        <Pressable key={sc.id} onPress={() => setSchoolId(sc.id)} style={[styles.schoolRow, on && styles.schoolRowActive]} accessibilityRole="button">
                                            <View style={styles.schoolIconImg}>
                                                {sc.photo_url ? <Image source={{ uri: sc.photo_url }} style={styles.schoolImg} /> : <Car size={16} color={C.primary} />}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.schoolName} numberOfLines={1}>{sc.nom}</Text>
                                                {!!sc.ville && (
                                                    <View style={styles.schoolCityRow}>
                                                        <MapPin size={11} color={C.textMuted} />
                                                        <Text style={styles.schoolCity} numberOfLines={1}>{sc.ville}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            {on && <Check size={18} color={C.primary} strokeWidth={2.5} />}
                                        </Pressable>
                                    )
                                })}
                            </>
                        )}

                        {/* 3. Coordonnées */}
                        <Text style={styles.stepLabel}>{schools.length > 0 ? t('3. Vos coordonnées') : t('2. Vos coordonnées')}</Text>
                        <View style={field('name')}>
                            <TextInput value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))}
                                onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                                placeholder={t('Nom complet')} placeholderTextColor={C.placeholder} style={styles.input} />
                        </View>
                        <View style={field('email')}>
                            <TextInput value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))}
                                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                                placeholder={t('Email')} placeholderTextColor={C.placeholder}
                                keyboardType="email-address" autoCapitalize="none" style={styles.input} />
                        </View>
                        <View style={field('phone')}>
                            <TextInput value={form.phone} onChangeText={v => setForm(p => ({ ...p, phone: v }))}
                                onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                                placeholder={t('Téléphone (WhatsApp)')} placeholderTextColor={C.placeholder}
                                keyboardType="phone-pad" style={styles.input} />
                        </View>

                        {/* Récap + CTA */}
                        <View style={styles.recap}>
                            <Text style={styles.recapService} numberOfLines={1}>
                                {selected ? cleanLabel(selected.label) : t('Choisissez une catégorie ci-dessus')}
                            </Text>
                            {priceReady && <Text style={styles.recapPrice}>{selected!.price_eur} €</Text>}
                        </View>

                        <Pressable
                            onPress={submitBooking}
                            disabled={submitting || !typeId || !priceReady}
                            style={({ pressed }) => [styles.cta, pressed && { transform: [{ scale: 0.98 }] }, (submitting || !typeId || !priceReady) && { opacity: 0.5 }]}
                            accessibilityRole="button"
                        >
                            {submitting
                                ? <ActivityIndicator color={C.primaryText} />
                                : <><CreditCard size={18} color={C.primaryText} /><Text style={styles.ctaText}>{t('Réserver et payer')}</Text></>}
                        </Pressable>

                        <View style={styles.secureRow}>
                            <ShieldCheck size={13} color={C.textMuted} />
                            <Text style={styles.secure}>{t('Paiement sécurisé : Mobile Money / Carte. Reçu par email.')}</Text>
                        </View>
                    </>
                )}
            </ScrollView>

            <KkiapayModal
                visible={showPay}
                amount={payAmount}
                serviceName={t('Permis de Conduire Béninois')}
                onClose={() => setShowPay(false)}
                onSuccess={onPaid}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.sm },
    backBtn: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...typography.h3, color: C.text },

    scroll: { paddingHorizontal: spacing.gutter, paddingBottom: 48 },
    heroIcon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, marginBottom: spacing.md },
    title: { ...typography.h1, color: C.text },
    subtitle: { ...typography.body, color: C.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg },

    loadingBox: { paddingVertical: 60, alignItems: 'center' },
    warnBox: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', backgroundColor: C.accentSoft, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm },
    warnText: { flex: 1, ...typography.bodySmall, color: C.accentInk },

    stepLabel: { ...typography.overline, color: C.primary, marginTop: spacing.lg, marginBottom: spacing.sm, letterSpacing: 1.2 },
    stepHint: { ...typography.caption, color: C.textMuted, marginBottom: spacing.md, marginTop: -4 },

    typeGrid: { gap: spacing.sm },
    typeCard: { borderWidth: 2, borderColor: C.border, borderRadius: radius.xl, padding: spacing.md, backgroundColor: C.surface },
    typeCardActive: { borderColor: C.primary, backgroundColor: C.primarySoft, ...shadows.card },
    typeTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    catBadge: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    catBadgeActive: { backgroundColor: C.primary },
    catBadgeText: { ...typography.button, fontSize: 13, color: C.textSec },
    catBadgeTextActive: { color: C.primaryText },
    typeLabel: { flex: 1, ...typography.label, fontSize: 15, color: C.text },
    typeDesc: { ...typography.caption, color: C.textMuted, marginTop: spacing.xs, lineHeight: 17 },
    typeMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    typePrice: { ...typography.h3, fontSize: 18, color: C.primary },
    typeDuration: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    typeDurationText: { ...typography.caption, color: C.textSec },

    schoolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: C.border, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.sm, backgroundColor: C.surface },
    schoolRowActive: { borderColor: C.primary, backgroundColor: C.primarySoft },
    schoolIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    schoolIconImg: { width: 40, height: 40, borderRadius: radius.md, overflow: 'hidden', backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
    schoolImg: { width: '100%', height: '100%' },
    schoolName: { ...typography.label, fontSize: 14, color: C.text },
    schoolCityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
    schoolCity: { ...typography.caption, color: C.textMuted },

    field: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.sm },
    fieldFocused: { borderColor: C.primary, backgroundColor: C.surface },
    input: { ...typography.body, color: C.text, padding: 0 },

    recap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
    recapService: { flex: 1, ...typography.label, color: C.textSec },
    recapPrice: { ...typography.h2, color: C.primary },

    cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: C.primary, borderRadius: radius.lg, paddingVertical: 18, ...shadows.card },
    ctaText: { ...typography.button, fontSize: 16, color: C.primaryText, letterSpacing: 0.2 },
    secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md },
    secure: { ...typography.caption, color: C.textMuted },
})
