import React, { useState, useEffect } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Alert, ActivityIndicator,
} from 'react-native'
import { ArrowLeft, Calendar, Check, Clock, CreditCard, Star, Tag, Users } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import KkiapayModal from '../../components/KkiapayModal'
import { fetchWithTimeout } from '../../lib/fetch'
import { supabase } from '../../config/supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

/* ═══════════════════════════════════════════════════════════
   Service Details Screen — Synchronisé avec le site web
   Affiche : description, features/pièces, tarifs, processus
   
   IMPORTANT: This screen receives RAW (untranslated) data from
   ServicesScreen and calls t() dynamically so translations
   update reactively without requiring a page reload.
═══════════════════════════════════════════════════════════ */

interface PricingOption {
    label: string
    price: string
}

export default function ServiceDetailsScreen({ route, navigation }: any) {
    const {
        serviceId, title, subtitle, desc, fullDescription,
        color, icon, duration, price, documents,
        features: paramFeatures,
        pricing_options: paramPricingOptions,
    } = route.params || {}

    const { profile } = useAuth()
    const { t, lang, preloadTexts } = useLang()
    const [loading, setLoading] = useState(false)
    const [showKkiapay, setShowKkiapay] = useState(false)
    const serviceColor = color || colors.primary

    const features: string[] = paramFeatures?.length ? paramFeatures : [
        'Consultation initiale avec nos experts',
        'Analyse complète de votre dossier',
        'Accompagnement administratif personnalisé',
        'Suivi en temps réel via l\'application',
    ]

    const requiredDocs: string[] = documents?.length ? documents : [
        'Pièce d\'identité valide (passeport ou CNI)',
        'Justificatif selon le service demandé',
    ]

    const pricingOptions: PricingOption[] = paramPricingOptions?.length ? paramPricingOptions : []

    // ── Preload ALL texts visible on this screen ──
    useEffect(() => {
        if (lang === 'fr') return
        const texts: string[] = []

        // Core content
        if (title) texts.push(title)
        if (subtitle) texts.push(subtitle)
        if (fullDescription || desc) texts.push(fullDescription || desc)
        if (duration) texts.push(duration)
        if (price) texts.push(price)

        // Features & documents
        for (const f of features) if (f) texts.push(f)
        for (const d of requiredDocs) if (d) texts.push(d)

        // Pricing options (both labels and prices)
        for (const po of pricingOptions) {
            if (po.label) texts.push(po.label)
            if (po.price) texts.push(po.price)
        }

        // UI strings on this screen
        texts.push(
            'Service Premium', 'Détails du Service', 'Délai moyen', 'Tarif',
            'Support', 'Dédié', 'Sur devis',
            'Pièces à fournir pour les afro-descendants', 'Ce que nous proposons',
            'Pack VIP Retour Gagnant',
            "Un accompagnement intégral en une seule journée — de l'état civil à la délivrance de votre passeport.",
            'Enrôlement État Civil', "Obtention de votre extrait de naissance certifié conforme auprès des autorités de l'état civil béninois.",
            "Carte d'Identité Personnelle (CIP A)", "Constitution du dossier et enrôlement biométrique pour votre titre d'identité officiel béninois.",
            'Passeport Express Jour-J', "Prise en charge prioritaire de votre demande de passeport biométrique — déposée et traitée le jour même.",
            'Tarification', 'Comment ça marche ?',
            'Commandez le service', 'Déposez vos documents', 'Suivi en temps réel', 'Résultat final',
            'Documents requis', 'Prêt à démarrer ?',
            'Réservez un créneau avec nos experts pour concrétiser votre projet.',
            'Payer avec Kkiapay', 'Premier appel de 15 min gratuit',
            'Paiement 100% sécurisé via Mobile Money ou Carte Bancaire.',
            'Non connecté', 'Veuillez vous connecter pour commander ce service.',
        )

        console.log(`[ServiceDetails] Pre-loading ${texts.length} texts for translation`)
        preloadTexts(texts)
    }, [lang]) // Only run once per language change

    // Le titre de la section "features" change selon le service (comme sur le site web)
    const featuresTitle = serviceId === 'passeport'
        ? t('Pièces à fournir pour les afro-descendants')
        : t('Ce que nous proposons')

    const initiateCheckout = () => {
        if (!profile) {
            Alert.alert(t('Non connecté'), t('Veuillez vous connecter pour commander ce service.'))
            return
        }

        const isSurDevis = !price || price.toString().toLowerCase().includes('devis')
        const numericPrice = price ? parseFloat(price.toString().replace(/[^0-9.-]+/g, '')) : 0

        if (isSurDevis || numericPrice === 0) {
            // Pour les services sans paiement immédiat, on crée le dossier directement
            createDossierDirectly(null, 0)
        } else {
            setShowKkiapay(true)
        }
    }

    const createDossierDirectly = async (transactionId: string | null, numericPrice: number) => {
        setLoading(true)
        try {
            // Vérifier si un dossier existe déjà
            const { data: existing } = await supabase
                .from('dossiers')
                .select('id')
                .eq('client_id', profile?.id)
                .eq('service_type', title)
                .maybeSingle()

            if (existing) {
                Alert.alert(
                    t('Dossier existant'),
                    t('Vous avez déjà un dossier en cours pour ce service. Consultez la section "Mon Dossier" pour suivre son avancement.'),
                    [{ text: t('Voir mon dossier'), onPress: () => navigation.goBack() }]
                )
                return
            }

            // Insérer directement dans Supabase pour que les agents le reçoivent instantanément
            const { error } = await supabase.from('dossiers').insert({
                client_id: profile?.id,
                service_type: title,
                status: 'en_attente',
                progress: 10,
                transaction_id: transactionId,
                payment_method: transactionId ? 'kkiapay' : 'none',
                payment_amount: isNaN(numericPrice) ? 0 : numericPrice,
                payment_currency: 'XOF',
                notes: `Commande initiée via l'application mobile le ${new Date().toLocaleDateString('fr-FR')}${transactionId ? `\nTransaction: ${transactionId}` : ''}`
            })

            if (error) throw error

            Alert.alert(
                t('Demande Enregistrée !'),
                t(`Votre dossier pour "{title}" a été créé avec succès.\n\nNotre équipe vous contactera dans les 24 heures pour la suite.`, { title }),
                [{ text: t('Voir mon espace'), onPress: () => navigation.navigate('Dossier') }]
            )
        } catch (e: any) {
            const msg = e.message || t('Erreur lors de la création du dossier')
            Alert.alert(t('Erreur'), msg)
        } finally {
            setLoading(false)
        }
    }

    const handlePaymentSuccess = async (transactionId: string) => {
        setShowKkiapay(false)
        const numericPrice = price ? parseFloat(price.toString().replace(/[^0-9.-]+/g, '')) : 0
        await createDossierDirectly(transactionId, numericPrice)
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
        >
            {/* Header coloré */}
            <View style={[styles.header, { backgroundColor: serviceColor }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <View style={styles.backBtnCircle}>
                        <ArrowLeft size={20} color="#FFF" strokeWidth={1.75} />
                    </View>
                </TouchableOpacity>

                <View style={styles.headerIconWrap}>
                    <Ionicons name={icon || 'briefcase-outline'} size={40} color={serviceColor} />
                </View>

                <View style={styles.headerBadge}>
                    <Star size={10} color={serviceColor} strokeWidth={1.75} />
                    <Text style={[styles.headerBadgeText, { color: serviceColor }]}>{t('Service Premium')}</Text>
                </View>
            </View>

            {/* Carte contenu */}
            <View style={styles.card}>
                <Text style={styles.title}>{t(title || 'Détails du Service')}</Text>
                {subtitle ? (
                    <Text style={styles.subtitle}>{t(subtitle)}</Text>
                ) : null}
                <Text style={styles.desc}>
                    {t(fullDescription || desc || 'Informations concernant ce service et accompagnement personnalisé.')}
                </Text>

                {/* Infos clés — ALL values wrapped with t() */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Clock size={18} color={serviceColor} strokeWidth={1.75} />
                        <View>
                            <Text style={styles.infoLabel}>{t('Délai moyen')}</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{t(duration || '4–8 semaines')}</Text>
                        </View>
                    </View>
                    <View style={[styles.infoItem, styles.infoItemBorder]}>
                        <Tag size={18} color={serviceColor} strokeWidth={1.75} />
                        <View>
                            <Text style={styles.infoLabel}>{t('Tarif')}</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{t(price || 'Sur devis')}</Text>
                        </View>
                    </View>
                    <View style={styles.infoItem}>
                        <Users size={18} color={serviceColor} strokeWidth={1.75} />
                        <View>
                            <Text style={styles.infoLabel}>{t('Support')}</Text>
                            <Text style={styles.infoValue}>{t('Dédié')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Features / Pièces à fournir — titre dynamique comme le site web */}
                <Text style={styles.sectionTitle}>{featuresTitle}</Text>
                {features.map((feature: string, i: number) => (
                    <View key={i} style={styles.featureRow}>
                        <View style={[styles.featureCheck, { backgroundColor: serviceColor + '15' }]}>
                            <Check size={14} color={serviceColor} strokeWidth={1.75} />
                        </View>
                        <Text style={styles.featureText}>{t(feature)}</Text>
                    </View>
                ))}

                {/* Section Pack VIP — uniquement pour le passeport (comme le site web) */}
                {serviceId === 'passeport' && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.vipSection}>
                            <View style={styles.vipSectionHeader}>
                                <Ionicons name="sparkles" size={18} color={colors.primary} />
                                <Text style={styles.vipSectionTitle}>{t('Pack VIP Retour Gagnant')}</Text>
                            </View>
                            <Text style={styles.vipSectionDesc}>
                                {t("Un accompagnement intégral en une seule journée — de l'état civil à la délivrance de votre passeport.")}
                            </Text>
                            {[
                                { num: '01', title: 'Enrôlement État Civil', desc: "Obtention de votre extrait de naissance certifié conforme auprès des autorités de l'état civil béninois." },
                                { num: '02', title: "Carte d'Identité Personnelle (CIP A)", desc: "Constitution du dossier et enrôlement biométrique pour votre titre d'identité officiel béninois." },
                                { num: '03', title: 'Passeport Express Jour-J', desc: "Prise en charge prioritaire de votre demande de passeport biométrique — déposée et traitée le jour même." },
                            ].map((step) => (
                                <View key={step.num} style={styles.vipStep}>
                                    <Text style={styles.vipStepNum}>{step.num}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.vipStepTitle}>{t(step.title)}</Text>
                                        <Text style={styles.vipStepDesc}>{t(step.desc)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={styles.divider} />

                {/* Grille de tarifs — ALL wrapped with t() including prices */}
                {pricingOptions.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>{t('Tarification')}</Text>
                        <View style={styles.pricingList}>
                            {pricingOptions.map((opt: PricingOption, i: number) => (
                                <View key={i} style={[styles.pricingCard, { borderLeftColor: serviceColor }]}>
                                    <Text style={styles.pricingLabel}>{t(opt.label)}</Text>
                                    <Text style={[styles.pricingPrice, { color: serviceColor }]}>{t(opt.price)}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.divider} />
                    </>
                )}

                {/* Processus */}
                <Text style={styles.sectionTitle}>{t('Comment ça marche ?')}</Text>
                {[
                    { step: '1', label: t('Commandez le service'), icon: 'cart-outline' as const },
                    { step: '2', label: t('Déposez vos documents'), icon: 'cloud-upload-outline' as const },
                    { step: '3', label: t('Suivi en temps réel'), icon: 'pulse-outline' as const },
                    { step: '4', label: t('Résultat final'), icon: 'ribbon-outline' as const },
                ].map((item) => (
                    <View key={item.step} style={styles.processRow}>
                        <View style={[styles.processStep, { backgroundColor: serviceColor + '15', borderColor: serviceColor + '30' }]}>
                            <Text style={[styles.processStepNum, { color: serviceColor }]}>{item.step}</Text>
                        </View>
                        <Ionicons name={item.icon} size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={styles.processLabel}>{item.label}</Text>
                    </View>
                ))}

                <View style={styles.divider} />

                {/* Pièces à fournir */}
                <Text style={styles.sectionTitle}>{t('Documents requis')}</Text>
                {requiredDocs.map((doc: string, i: number) => (
                    <View key={i} style={styles.docRow}>
                        <View style={[styles.docBullet, { backgroundColor: serviceColor + '18', borderColor: serviceColor + '30' }]}>
                            <Text style={[styles.docNum, { color: serviceColor }]}>{i + 1}</Text>
                        </View>
                        <Text style={styles.docText}>{t(doc)}</Text>
                    </View>
                ))}

                {/* Section CTA — comme le site "Prêt à démarrer ?" */}
                <View style={[styles.ctaSection, { borderColor: serviceColor + '30' }]}>
                    <View style={[styles.ctaBar, { backgroundColor: serviceColor }]} />
                    <Calendar size={18} color={serviceColor} strokeWidth={1.75} />
                    <Text style={styles.ctaTitle}>{t('Prêt à démarrer ?')}</Text>
                    <Text style={styles.ctaSubtitle}>
                        {t('Réservez un créneau avec nos experts pour concrétiser votre projet.')}
                    </Text>

                    {/* Bouton commander / payer */}
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: serviceColor }, loading && styles.btnDisabled]}
                        activeOpacity={0.85}
                        onPress={initiateCheckout}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <CreditCard size={20} color="#FFF" strokeWidth={1.75} />
                                <Text style={styles.btnText}>{t('Payer avec Kkiapay')}</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.ctaFreeNote}>{t('Premier appel de 15 min gratuit')}</Text>
                </View>

                <Text style={styles.btnNote}>
                    {t('Paiement 100% sécurisé via Mobile Money ou Carte Bancaire.')}
                </Text>
            </View>

            <KkiapayModal
                visible={showKkiapay}
                amount={price || 'Sur devis'}
                serviceName={title}
                onClose={() => setShowKkiapay(false)}
                onSuccess={handlePaymentSuccess}
            />

            <View style={{ height: 60 }} />
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { paddingBottom: spacing.xxl },

    header: {
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 64,
        alignItems: 'center',
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        position: 'relative',
    },
    backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 38, left: 20 },
    backBtnCircle: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerIconWrap: {
        width: 84, height: 84, borderRadius: 42,
        backgroundColor: '#FFFFFF',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 20, ...shadows.md,
    },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#FFF', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5, marginTop: 14,
    },
    headerBadgeText: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

    card: {
        marginHorizontal: spacing.lg,
        marginTop: -32,
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
        padding: spacing.xl,
        ...shadows.lg,
        borderWidth: 1, borderColor: colors.borderLight,
    },

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 4, textAlign: 'center' },
    subtitle: {
        ...typography.bodySmall, color: colors.primary, textAlign: 'center',
        fontFamily: 'Inter_600SemiBold', marginBottom: 8, lineHeight: 20,
    },
    desc: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

    infoRow: {
        flexDirection: 'row',
        marginVertical: spacing.lg,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
        overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight,
    },
    infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
    infoItemBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderLight },
    infoLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', color: colors.textMuted },
    infoValue: { fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textPrimary, marginTop: 1 },

    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.lg },

    sectionTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary, marginBottom: 14 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    featureCheck: {
        width: 26, height: 26, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    featureText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },

    /* Pack VIP Section */
    vipSection: {
        backgroundColor: colors.surfaceWarm,
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.primary + '30',
    },
    vipSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    vipSectionTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },
    vipSectionDesc: { ...typography.caption, color: colors.textMuted, marginBottom: 16 },
    vipStep: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14,
        backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
        borderWidth: 1, borderColor: colors.primary + '20',
    },
    vipStepNum: { fontSize: 28, fontFamily: 'Inter_800ExtraBold', color: colors.primary + '40' },
    vipStepTitle: { ...typography.label, color: colors.textPrimary, marginBottom: 2 },
    vipStepDesc: { ...typography.caption, color: colors.textMuted, lineHeight: 17 },

    /* Pricing */
    pricingList: { gap: 10 },
    pricingCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
        padding: 14, borderLeftWidth: 4,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    pricingLabel: { ...typography.bodySmall, color: colors.textPrimary, flex: 1, marginRight: 12 },
    pricingPrice: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },

    processRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    processStep: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    processStepNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    processLabel: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },

    /* CTA section — comme le site "Prêt à démarrer ?" */
    ctaSection: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg, padding: spacing.lg,
        alignItems: 'center', marginTop: spacing.sm,
        borderWidth: 1, overflow: 'hidden',
    },
    ctaBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
    ctaTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary, marginTop: 8, marginBottom: 4 },
    ctaSubtitle: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: 16 },
    ctaFreeNote: { ...typography.caption, color: colors.textMuted, marginTop: 10 },

    btn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: radius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { ...typography.button, color: '#FFF' },
    btnNote: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 18,
    },

    docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    docBullet: {
        width: 24, height: 24, borderRadius: 7,
        borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 1,
    },
    docNum: { fontSize: 11, fontFamily: 'Inter_700Bold' },
    docText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },
})
