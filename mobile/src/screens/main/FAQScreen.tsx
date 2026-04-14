import React, { useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, TextInput,
} from 'react-native'
import { ArrowLeft, ChevronRight, HelpCircle, Search, XCircle } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'FAQ'>

/* ── Données FAQ ── */
const FAQ_DATA = [
    {
        category: 'Nationalité béninoise',
        color: colors.primary,
        icon: 'ribbon-outline' as const,
        items: [
            {
                q: 'Qui peut bénéficier de la nationalité béninoise ?',
                a: 'Toute personne d\'origine béninoise ou descendant d\'Africains réduits en esclavage (diaspora africaine) peut bénéficier des dispositions de la loi sur la nationalité béninoise. Un dossier complet comprenant des pièces d\'état civil et des preuves de liens avec le Bénin est requis.',
            },
            {
                q: 'Quels documents sont nécessaires pour la nationalité ?',
                a: 'Les documents principaux incluent : acte de naissance, passeport en cours de validité, casier judiciaire, photos d\'identité, preuves de lien avec le Bénin (arbre généalogique, témoignages…). Notre équipe vous guidera selon votre situation.',
            },
            {
                q: 'Combien de temps prend la procédure ?',
                a: 'La procédure dure généralement entre 6 et 18 mois selon la complexité du dossier et les délais administratifs. Retour Gagnant accompagne chaque étape pour optimiser ce délai.',
            },
        ],
    },
    {
        category: 'Passeport béninois',
        color: '#7C5CCA',
        icon: 'document-outline' as const,
        items: [
            {
                q: 'Puis-je obtenir un passeport béninois depuis l\'étranger ?',
                a: 'Oui, il est possible d\'initier la démarche depuis l\'étranger via notre service. Nous coordonnons avec les consulats et ambassades du Bénin pour faciliter votre demande.',
            },
            {
                q: 'Quelle est la durée de validité du passeport béninois ?',
                a: 'Le passeport béninois est valide 5 ans et peut être renouvelé. Un passeport biométrique vous sera délivré, conforme aux normes internationales.',
            },
        ],
    },
    {
        category: 'Recherches ancestrales',
        color: '#2D9F63',
        icon: 'people-outline' as const,
        items: [
            {
                q: 'Que comprend le service de recherche ancestrale ?',
                a: 'Ce service inclut une recherche généalogique approfondie dans les archives béninoises, la reconstruction de votre arbre familial, l\'identification de votre région et village d\'origine, et un rapport complet documenté.',
            },
            {
                q: 'Est-il possible de retrouver sa famille au Bénin ?',
                a: 'Oui, dans de nombreux cas, nos experts locaux peuvent identifier et entrer en contact avec des membres de votre famille restés au Bénin. Un accompagnement sur le terrain est disponible.',
            },
        ],
    },
    {
        category: 'Paiements & Tarifs',
        color: colors.info,
        icon: 'card-outline' as const,
        items: [
            {
                q: 'Quels modes de paiement acceptez-vous ?',
                a: 'Nous acceptons les paiements via Kkiapay (Mobile Money MTN, Moov, cartes bancaires). Les paiements sont sécurisés et un reçu vous est systématiquement envoyé par email.',
            },
            {
                q: 'Comment sont calculés les frais de service ?',
                a: 'Les frais varient selon le service demandé et la complexité du dossier. Un devis détaillé vous est fourni lors de la consultation initiale, sans engagement.',
            },
        ],
    },
    {
        category: 'Application & Support',
        color: '#E07B54',
        icon: 'phone-portrait-outline' as const,
        items: [
            {
                q: 'Comment suivre l\'avancement de mon dossier ?',
                a: 'Dans la section "Mon Dossier" de l\'application, vous pouvez suivre en temps réel la progression de votre dossier, consulter vos documents, et recevoir des notifications à chaque mise à jour.',
            },
            {
                q: 'Comment contacter le support ?',
                a: 'Notre équipe est disponible via la messagerie intégrée de l\'application, par email à contact@retourgagnantbenin.bj, ou par téléphone/WhatsApp. Des rendez-vous peuvent être planifiés depuis l\'onglet "Rendez-vous".',
            },
        ],
    },
]

/* ═══════════════════════════════════════════════════════════
   FAQ Screen — Accordéon avec recherche
═══════════════════════════════════════════════════════════ */

export default function FAQScreen({ navigation }: { navigation: Nav }) {
    const [openId, setOpenId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const filteredCategories = FAQ_DATA.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            !search.trim() ||
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase())
        ),
    })).filter(cat => cat.items.length > 0)

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textOnDark} strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Aide & FAQ</Text>
                <Text style={styles.headerSub}>Questions fréquentes</Text>
            </View>

            {/* Barre de recherche */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <Search size={18} color={colors.textMuted} strokeWidth={1.75} />
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Rechercher une question…"
                        placeholderTextColor={colors.textMuted}
                        autoCapitalize="none"
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <XCircle size={16} color={colors.textMuted} strokeWidth={1.75} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Résultats */}
            {filteredCategories.length === 0 ? (
                <View style={styles.noResult}>
                    <Search size={32} color={colors.textMuted} strokeWidth={1.75} />
                    <Text style={styles.noResultTitle}>Aucun résultat</Text>
                    <Text style={styles.noResultText}>Essayez avec d'autres mots-clés.</Text>
                </View>
            ) : (
                filteredCategories.map((cat) => (
                    <View key={cat.category} style={styles.category}>
                        {/* En-tête catégorie */}
                        <View style={styles.catHeader}>
                            <View style={[styles.catIcon, { backgroundColor: cat.color + '15' }]}>
                                <Ionicons name={cat.icon} size={16} color={cat.color} />
                            </View>
                            <Text style={[styles.catTitle, { color: cat.color }]}>{cat.category}</Text>
                        </View>

                        {/* Items */}
                        <View style={styles.catCard}>
                            {cat.items.map((item, ii) => {
                                const id = `${cat.category}-${ii}`
                                const isOpen = openId === id
                                return (
                                    <View key={ii} style={[styles.faqItem, ii < cat.items.length - 1 && styles.faqItemBorder]}>
                                        <TouchableOpacity
                                            style={styles.faqQuestion}
                                            onPress={() => setOpenId(isOpen ? null : id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.faqQ, isOpen && { color: cat.color }]}>
                                                {item.q}
                                            </Text>
                                            <Ionicons
                                                name={isOpen ? 'chevron-up' : 'chevron-down'}
                                                size={16}
                                                color={isOpen ? cat.color : colors.textMuted}
                                            />
                                        </TouchableOpacity>
                                        {isOpen && (
                                            <View style={[styles.faqAnswer, { borderLeftColor: cat.color }]}>
                                                <Text style={styles.faqA}>{item.a}</Text>
                                            </View>
                                        )}
                                    </View>
                                )
                            })}
                        </View>
                    </View>
                ))
            )}

            {/* Contact support */}
            <View style={styles.contactCard}>
                <Ionicons name="chatbubble-ellipses" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.contactTitle}>Vous n'avez pas trouvé votre réponse ?</Text>
                    <Text style={styles.contactText}>Notre équipe est disponible pour vous aider.</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
            </View>

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
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.primary + 'AA', marginTop: 4 },

    searchWrap: { padding: spacing.lg, paddingBottom: spacing.sm },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: colors.surface, borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: spacing.md, minHeight: 48,
        ...shadows.sm,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, fontFamily: 'Inter_400Regular' },

    noResult: { alignItems: 'center', padding: spacing.xxl, gap: 10 },
    noResultTitle: { ...typography.h3, color: colors.textPrimary },
    noResultText: { ...typography.bodySmall, color: colors.textSecondary },

    category: { marginBottom: spacing.md },
    catHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: spacing.lg, marginBottom: 8,
    },
    catIcon: {
        width: 30, height: 30, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },
    catTitle: { ...typography.label, fontSize: 13 },

    catCard: {
        marginHorizontal: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.sm,
    },
    faqItem: { },
    faqItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    faqQuestion: {
        flexDirection: 'row', alignItems: 'flex-start',
        padding: 16, gap: 12,
    },
    faqQ: { ...typography.bodySmall, color: colors.textPrimary, flex: 1, fontFamily: 'Inter_600SemiBold', lineHeight: 20 },
    faqAnswer: {
        paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4,
        borderLeftWidth: 3, marginLeft: 16, marginRight: 16, marginBottom: 8,
        borderRadius: 2,
    },
    faqA: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },

    contactCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        marginHorizontal: spacing.lg,
        backgroundColor: colors.primary + '10',
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.primary + '25',
        marginTop: spacing.sm,
    },
    contactTitle: { ...typography.label, color: colors.textPrimary },
    contactText: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
})
