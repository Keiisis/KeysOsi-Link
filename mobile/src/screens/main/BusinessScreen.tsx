/* ═══════════════════════════════════════════════════════════
   Création d'Entreprise — écran de service (RDV-driven, SANS paiement).
   Implémentation fidèle de la maquette Sleek validée : hero éditorial,
   bande verte de piliers, mission, timeline 01/02/03, contraste Solo vs RGB,
   prestations, réassurance, FAQ accordéon, CTA « Prendre rendez-vous ».
   Actions réelles : RDV (Appointments) + contact (Messages). Charte blanche +
   tricolore. Aucun prix (devis gratuit sous 24 h).
═══════════════════════════════════════════════════════════ */

import React, { useState } from 'react'
import {
    View, Text, StyleSheet, ScrollView, Pressable, Share, LayoutAnimation, Platform, UIManager,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
    ChevronLeft, Share2, Briefcase, CheckCircle, FileText, Building2, Users,
    Scale, FileCheck2, Globe, Network, AlertTriangle, X, Check, Unlock, UserCheck,
    Eye, ChevronDown, Calendar,
} from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { screenColors as C, spacing, radius, shadows, typography, fonts } from '../../config/theme'
import { FlagBar } from '../../components/ui'
import { useLang } from '../../contexts/LangContext'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true)
}

const SERVICE_LABEL = "Création d'Entreprise"

const CHIPS = [
    { icon: CheckCircle, label: 'Création clé en main' },
    { icon: FileText, label: 'RCCM & fiscalité' },
    { icon: Building2, label: 'Compte bancaire pro' },
    { icon: Users, label: 'Réseau local' },
]

const PILIERS = [
    { icon: Scale, title: 'Conseil Expert', desc: 'Choix de la structure (SARL, SAS, EI) adapté à votre projet.' },
    { icon: FileCheck2, title: 'Conformité', desc: 'Enregistrements légaux et fiscaux garantis sans failles.' },
    { icon: Globe, title: '100% à distance', desc: 'Signatures et formalités gérées sans voyager.' },
    { icon: Network, title: 'Réseau Business', desc: 'Accès direct aux banques et notaires partenaires.' },
]

const ETAPES = [
    { num: '01', title: 'Structuration juridique', desc: 'Analyse de votre projet et rédaction des statuts par nos juristes.' },
    { num: '02', title: 'Formalités & Compte pro', desc: 'Immatriculation au RCCM, IFU et ouverture de compte bancaire professionnel.' },
    { num: '03', title: 'Lancement & Réseau', desc: 'Mise en relation avec notre écosystème de partenaires locaux pour votre démarrage.' },
]

const SOLO = [
    "Files d'attente interminables aux guichets administratifs.",
    'Insécurité juridique liée aux prête-noms et intermédiaires non agréés.',
    'Délais imprévisibles et absence de suivi structuré.',
    'Frais cachés et corruption par manque de transparence.',
]
const AVEC = [
    'Gestion 100% à distance depuis votre pays de résidence.',
    'Cabinet agréé assurant une conformité légale totale.',
    'Réseau de partenaires bancaires et notaires pré-validés.',
    'Suivi en temps réel via WhatsApp et votre dossier digital.',
]

const PRESTATIONS = [
    'Rédaction des statuts personnalisés',
    'Immatriculation au RCCM',
    'Obtention du numéro IFU',
    'Carte de Commerçant / Importateur',
    'Compte bancaire pro (UBA, BOA, etc.)',
    'Domiciliation initiale (si requise)',
]

const REASSURANCE = [
    { icon: Unlock, title: 'Sans engagement', desc: 'Devis gratuit et sans frais cachés.' },
    { icon: UserCheck, title: 'Interlocuteur unique', desc: 'Un conseiller dédié pour tout le process.' },
    { icon: Eye, title: 'Transparence', desc: "Suivi administratif via l'application." },
]

const FAQ = [
    { q: 'Puis-je créer ma société sans venir au Bénin ?', r: "Oui. Nous réalisons l'intégralité des formalités sur place (statuts, RCCM, IFU) et ne sollicitons votre présence ou votre signature que lorsque c'est strictement nécessaire, le plus souvent à distance." },
    { q: 'Quel est le capital minimum requis ?', r: 'Pour une SARL au Bénin, le capital minimum légal est de 100 000 FCFA. Le montant conseillé dépend de votre activité ; nous vous orientons lors du premier échange.' },
    { q: "Quels sont les délais d'immatriculation ?", r: "Comptez en général 5 à 10 jours ouvrés pour l'immatriculation au RCCM et l'obtention de l'IFU, une fois votre dossier complet." },
    { q: "Comment se passe l'ouverture du compte ?", r: 'Nous constituons votre dossier bancaire et vous mettons en relation avec nos banques partenaires (UBA, BOA, etc.) pour ouvrir votre compte professionnel, à distance quand c\'est possible.' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function BusinessScreen({ navigation }: { navigation: any }) {
    const insets = useSafeAreaInsets()
    const { t } = useLang()
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const goRdv = () => navigation.navigate('Appointments', { openRequest: true, serviceLabel: SERVICE_LABEL })
    const goContact = () => navigation.navigate('Messages')
    const onShare = () => Share.share({ message: t("Créez votre entreprise au Bénin depuis la diaspora avec Retour Gagnant : https://www.retourgagnantbenin.bj/services/business") }).catch(() => {})

    const toggleFaq = (i: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'))
        setOpenFaq(prev => (prev === i ? null : i))
    }

    return (
        <View style={styles.container}>
            <View style={{ paddingTop: insets.top }}>
                <FlagBar height={6} radiusTop={false} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.circleBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Retour')}>
                    <ChevronLeft size={24} color={C.text} strokeWidth={2.2} />
                </Pressable>
                <Pressable onPress={onShare} style={styles.circleBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('Partager')}>
                    <Share2 size={19} color={C.text} strokeWidth={2} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <Animated.View entering={FadeInUp.duration(420)} style={styles.hero}>
                    <View style={styles.heroIcon}><Briefcase size={30} color={C.primary} strokeWidth={2} /></View>
                    <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{t('B2B & Investissement')}</Text></View>
                    <Text style={styles.heroTitle}>{t('Créez votre entreprise au Bénin, depuis la diaspora')}</Text>
                    <Text style={styles.heroSub}>{t('Un accompagnement juridique et administratif complet pour lancer votre projet sans vous déplacer.')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                        {CHIPS.map(({ icon: Icon, label }) => (
                            <View key={label} style={styles.chip}>
                                <Icon size={14} color={C.primary} strokeWidth={2.2} />
                                <Text style={styles.chipText}>{t(label)}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </Animated.View>

                {/* Trust strip */}
                <View style={styles.trustStrip}>
                    <Text style={styles.trustText}>{t('Premier échange gratuit')}</Text>
                    <Text style={styles.trustDot}>•</Text>
                    <Text style={styles.trustText}>{t('Interlocuteur unique')}</Text>
                    <Text style={styles.trustDot}>•</Text>
                    <Text style={styles.trustText}>{t('Transparence')}</Text>
                </View>

                {/* Bande verte piliers */}
                <View style={styles.pilierBand}>
                    {PILIERS.map(({ icon: Icon, title, desc }) => (
                        <View key={title} style={styles.pilier}>
                            <Icon size={24} color={C.accent} strokeWidth={2} />
                            <Text style={styles.pilierTitle}>{t(title)}</Text>
                            <Text style={styles.pilierDesc}>{t(desc)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.body}>
                    {/* Mission */}
                    <View style={styles.section}>
                        <Text style={styles.eyebrow}>{t('Notre mission')}</Text>
                        <Text style={styles.h2}>{t('Sécuriser votre investissement entrepreneurial.')}</Text>
                        <Text style={styles.para}>{t("Entreprendre au Bénin depuis l'étranger demande une rigueur juridique et un réseau de confiance. Nous sommes votre bras droit local pour transformer votre vision en une entité légale prospère.")}</Text>
                    </View>

                    {/* Timeline */}
                    <View style={styles.section}>
                        <Text style={styles.eyebrow}>{t('Processus de création')}</Text>
                        <View style={styles.timeline}>
                            <View style={styles.timelineLine} />
                            {ETAPES.map((e, i) => (
                                <View key={e.num} style={styles.step}>
                                    <View style={[styles.stepDot, i === 0 ? styles.stepDotGold : styles.stepDotGreen]}>
                                        <Text style={[styles.stepNum, i === 0 && styles.stepNumGold]}>{e.num}</Text>
                                    </View>
                                    <View style={styles.stepBody}>
                                        <Text style={styles.stepTitle}>{t(e.title)}</Text>
                                        <Text style={styles.stepDesc}>{t(e.desc)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Contraste */}
                    <View style={styles.section}>
                        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
                            <Text style={styles.eyebrowCenter}>{t('La différence')}</Text>
                            <Text style={styles.contrastTitle}>
                                {t('Entreprendre à distance, ')}
                                <Text style={{ color: C.danger }}>{t('sans partenaire fiable')}</Text>
                                {t(", c'est risqué.")}
                            </Text>
                            <Text style={styles.contrastSub}>{t("Ne laissez pas l'incertitude freiner vos ambitions.")}</Text>
                        </View>

                        <View style={styles.soloCard}>
                            <View style={styles.contrastHead}>
                                <AlertTriangle size={20} color={C.danger} />
                                <Text style={[styles.contrastHeadText, { color: C.danger }]}>{t('En solo au pays')}</Text>
                            </View>
                            {SOLO.map((s, i) => (
                                <View key={i} style={styles.contrastItem}>
                                    <X size={14} color={C.danger} strokeWidth={2.5} style={{ marginTop: 2 }} />
                                    <Text style={styles.soloText}>{t(s)}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.avecCard}>
                            <View style={styles.contrastHead}>
                                <CheckCircle size={20} color={C.primary} />
                                <Text style={[styles.contrastHeadText, { color: C.primary }]}>{t('Avec Retour Gagnant')}</Text>
                            </View>
                            {AVEC.map((s, i) => (
                                <View key={i} style={styles.contrastItem}>
                                    <Check size={14} color={C.primary} strokeWidth={3} style={{ marginTop: 2 }} />
                                    <Text style={styles.avecText}>{t(s)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Prestations */}
                    <View style={styles.section}>
                        <Text style={styles.eyebrow}>{t('Prestations incluses')}</Text>
                        <Text style={styles.h2}>{t('Un pack complet pour réussir.')}</Text>
                        <View style={styles.prestaCard}>
                            {PRESTATIONS.map((p, i) => (
                                <View key={i} style={styles.prestaRow}>
                                    <View style={styles.prestaCheck}><Check size={16} color={C.primary} strokeWidth={2.5} /></View>
                                    <Text style={styles.prestaText}>{t(p)}</Text>
                                </View>
                            ))}
                            <Text style={styles.prestaNote}>{t('Note : les frais de greffe et honoraires de notaire sont inclus dans nos devis personnalisés.')}</Text>
                        </View>
                    </View>

                    {/* Réassurance */}
                    <View style={styles.reassureRow}>
                        {REASSURANCE.map(({ icon: Icon, title, desc }) => (
                            <View key={title} style={styles.reassure}>
                                <View style={styles.reassureIcon}><Icon size={20} color={C.primary} strokeWidth={2} /></View>
                                <Text style={styles.reassureTitle}>{t(title)}</Text>
                                <Text style={styles.reassureDesc}>{t(desc)}</Text>
                            </View>
                        ))}
                    </View>

                    {/* FAQ */}
                    <View style={styles.section}>
                        <Text style={styles.eyebrow}>{t('Questions fréquentes')}</Text>
                        {FAQ.map((f, i) => {
                            const open = openFaq === i
                            return (
                                <Pressable key={i} onPress={() => toggleFaq(i)} style={styles.faqCard} accessibilityRole="button">
                                    <View style={styles.faqHead}>
                                        <Text style={styles.faqQ}>{t(f.q)}</Text>
                                        <ChevronDown size={18} color={C.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
                                    </View>
                                    {open && <Text style={styles.faqA}>{t(f.r)}</Text>}
                                </Pressable>
                            )
                        })}
                    </View>

                    {/* CTA final */}
                    <View style={styles.finalCard}>
                        <Text style={styles.finalTitle}>{t('Prêt à lancer votre projet ?')}</Text>
                        <Text style={styles.finalText}>{t('Discutez gratuitement de votre projet avec un expert en investissement local.')}</Text>
                        <Pressable onPress={goRdv} style={({ pressed }) => [styles.finalBtn, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
                            <Text style={styles.finalBtnText}>{t('Prendre rendez-vous')}</Text>
                            <Calendar size={19} color={C.primaryText} />
                        </Pressable>
                        <Pressable onPress={goContact} style={({ pressed }) => [styles.finalBtnGhost, pressed && { transform: [{ scale: 0.98 }] }]} accessibilityRole="button">
                            <Text style={styles.finalBtnGhostText}>{t('Nous contacter')}</Text>
                        </Pressable>
                        <Text style={styles.finalNote}>{t('Premier échange gratuit • Devis clair • Sans engagement')}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Barre collante : conseil & devis, jamais de prix */}
            <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
                <View>
                    <Text style={styles.stickyLabel}>{t('Conseil & Devis')}</Text>
                    <Text style={styles.stickyValue}>{t('Gratuit sous 24h')}</Text>
                </View>
                <Pressable onPress={goRdv} style={({ pressed }) => [styles.stickyBtn, pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button">
                    <Text style={styles.stickyBtnText}>{t('Prendre RDV')}</Text>
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.sm },
    circleBtn: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', ...shadows.card },

    scroll: { paddingBottom: 120 },

    /* Hero */
    hero: { paddingHorizontal: spacing.gutter, marginBottom: spacing.lg },
    heroIcon: { width: 56, height: 56, borderRadius: radius.xl, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
    heroBadge: { alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5, marginBottom: spacing.sm },
    heroBadgeText: { fontSize: 10, fontFamily: fonts.extrabold, color: C.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
    heroTitle: { ...typography.h1, color: C.text, lineHeight: 36 },
    heroSub: { ...typography.body, color: C.textMuted, marginTop: spacing.sm, marginBottom: spacing.md },
    chipsRow: { gap: spacing.sm, paddingVertical: 2 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceAlt, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontSize: 11, fontFamily: fonts.bold, color: C.text },

    /* Trust strip */
    trustStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: spacing.gutter, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, marginBottom: spacing.lg },
    trustText: { fontSize: 10, fontFamily: fonts.bold, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
    trustDot: { color: C.accent, fontSize: 12 },

    /* Bande piliers */
    pilierBand: { backgroundColor: C.primary, borderRadius: radius.xxl, marginHorizontal: spacing.md, paddingVertical: 28, paddingHorizontal: spacing.gutter, marginBottom: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', ...shadows.cardRaised },
    pilier: { width: '50%', paddingRight: spacing.md, marginBottom: spacing.lg },
    pilierTitle: { color: '#FFFFFF', fontSize: 12, fontFamily: fonts.bold, letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 },
    pilierDesc: { color: 'rgba(255,255,255,0.72)', fontSize: 11, lineHeight: 16, marginTop: 4 },

    body: { paddingHorizontal: spacing.gutter },
    section: { marginBottom: spacing.xxl },
    eyebrow: { fontSize: 10, fontFamily: fonts.extrabold, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm },
    eyebrowCenter: { fontSize: 10, fontFamily: fonts.extrabold, color: C.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: spacing.sm, textAlign: 'center' },
    h2: { ...typography.h2, color: C.text, marginBottom: spacing.md },
    para: { ...typography.body, color: C.textMuted, lineHeight: 23 },

    /* Timeline */
    timeline: { position: 'relative', paddingTop: spacing.xs },
    timelineLine: { position: 'absolute', left: 15, top: 6, bottom: 6, width: 2, backgroundColor: C.border },
    step: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
    stepDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', ...shadows.card },
    stepDotGold: { backgroundColor: C.accent },
    stepDotGreen: { backgroundColor: C.primary },
    stepNum: { fontSize: 13, fontFamily: fonts.extrabold, color: '#FFFFFF' },
    stepNumGold: { color: C.text },
    stepBody: { flex: 1, paddingTop: 3 },
    stepTitle: { fontSize: 15, fontFamily: fonts.bold, color: C.text, marginBottom: 2 },
    stepDesc: { fontSize: 13, lineHeight: 19, color: C.textMuted },

    /* Contraste */
    contrastTitle: { ...typography.h2, color: C.text, textAlign: 'center', lineHeight: 30 },
    contrastSub: { ...typography.bodySmall, color: C.textMuted, textAlign: 'center', marginTop: spacing.sm },
    soloCard: { backgroundColor: C.surfaceAlt, borderRadius: radius.xxl, borderWidth: 1, borderColor: C.border, padding: spacing.lg, marginBottom: spacing.md },
    avecCard: { backgroundColor: C.primarySoft, borderRadius: radius.xxl, borderWidth: 1, borderColor: C.primary, padding: spacing.lg, ...shadows.card },
    contrastHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
    contrastHeadText: { fontSize: 14, fontFamily: fonts.bold },
    contrastItem: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    soloText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: C.textMuted },
    avecText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: C.text, fontFamily: fonts.bold },

    /* Prestations */
    prestaCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: radius.xxl, padding: spacing.lg, ...shadows.card },
    prestaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    prestaCheck: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
    prestaText: { flex: 1, fontSize: 14, fontFamily: fonts.semibold, color: C.text },
    prestaNote: { fontSize: 11, fontStyle: 'italic', color: C.textMuted, marginTop: spacing.sm },

    /* Réassurance */
    reassureRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xxl },
    reassure: { flex: 1, alignItems: 'center' },
    reassureIcon: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    reassureTitle: { fontSize: 10, fontFamily: fonts.bold, color: C.text, letterSpacing: 0.5, textTransform: 'uppercase', textAlign: 'center', marginBottom: 3 },
    reassureDesc: { fontSize: 9, color: C.textMuted, textAlign: 'center', lineHeight: 13 },

    /* FAQ */
    faqCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
    faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    faqQ: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: C.text },
    faqA: { fontSize: 13, lineHeight: 20, color: C.textMuted, marginTop: spacing.sm },

    /* CTA final */
    finalCard: { backgroundColor: C.surfaceAlt, borderRadius: radius.xxl, borderWidth: 1, borderColor: C.border, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
    finalTitle: { ...typography.h2, fontSize: 20, color: C.text, marginBottom: spacing.sm, textAlign: 'center' },
    finalText: { ...typography.bodySmall, color: C.textMuted, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
    finalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', backgroundColor: C.primary, borderRadius: radius.lg, paddingVertical: 16, ...shadows.card },
    finalBtnText: { ...typography.button, fontSize: 16, color: C.primaryText },
    finalBtnGhost: { width: '100%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm },
    finalBtnGhostText: { ...typography.button, fontSize: 16, color: C.text },
    finalNote: { fontSize: 10, fontFamily: fonts.bold, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.lg, textAlign: 'center' },

    /* Sticky bar */
    stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: spacing.gutter, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#3C3C3C', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.04, shadowRadius: 32, elevation: 12 },
    stickyLabel: { fontSize: 10, fontFamily: fonts.bold, color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
    stickyValue: { fontSize: 17, fontFamily: fonts.extrabold, color: '#00643C', marginTop: 1 },
    stickyBtn: { backgroundColor: C.primary, borderRadius: radius.pill, paddingHorizontal: 28, paddingVertical: 13, ...shadows.card },
    stickyBtnText: { ...typography.button, fontSize: 14, color: C.primaryText },
})
