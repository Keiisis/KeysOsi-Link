import React from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Linking, Image,
} from 'react-native'
import { ArrowLeft, ExternalLink, HelpCircle } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'About'>

const APP_VERSION = '1.0.0'
const BUILD_NUMBER = '100'

const LINKS = [
    { label: 'Site officiel', icon: 'globe-outline' as const, url: 'https://www.retourgagnantbenin.bj' },
    { label: 'Conditions d\'utilisation', icon: 'document-text-outline' as const, url: 'https://www.retourgagnantbenin.bj/cgu' },
    { label: 'Politique de confidentialité', icon: 'shield-outline' as const, url: 'https://www.retourgagnantbenin.bj/privacy' },
    { label: 'Nous contacter', icon: 'mail-outline' as const, url: 'mailto:contact@retourgagnantbenin.bj' },
]

// Valeurs synchronisées avec le site web (page /a-propos)
const VALUES = [
    { title: 'Excellence', desc: 'Un service irréprochable à chaque étape de votre retour.', icon: 'diamond-outline' as const, color: colors.primary },
    { title: 'Engagement', desc: 'Votre réussite est notre mission première.', icon: 'heart-outline' as const, color: '#E8112D' },
    { title: 'Proximité', desc: 'Présents au Bénin et dans la diaspora.', icon: 'globe-outline' as const, color: '#008751' },
    { title: 'Confiance', desc: 'Plus de 500 familles nous ont fait confiance.', icon: 'people-outline' as const, color: '#3B82C4' },
]

// Équipe synchronisée avec le site web
const TEAM = [
    { name: 'Équipe Juridique', role: 'Passeports & Documents', icon: 'briefcase-outline' as const, color: colors.primary },
    { name: 'Équipe Immobilier', role: 'Logement & Construction', icon: 'home-outline' as const, color: '#2D9F63' },
    { name: 'Équipe Business', role: 'Investissement & Entreprise', icon: 'trending-up-outline' as const, color: '#1B2A4A' },
    { name: 'Équipe Culture', role: 'Guide & Accompagnement', icon: 'map-outline' as const, color: '#E07B54' },
]

/* ═══════════════════════════════════════════════════════════
   About Screen — Version, équipe, liens légaux
═══════════════════════════════════════════════════════════ */

export default function AboutScreen({ navigation }: { navigation: Nav }) {
    const handleLink = (url: string) => {
        Linking.openURL(url).catch(() => {
            /* ignore */
        })
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textOnDark} strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>À propos</Text>
                <Text style={styles.headerSub}>Retour Gagnant Bénin</Text>
            </View>

            {/* Logo & version */}
            <View style={styles.brandCard}>
                <View style={styles.logoWrap}>
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>
                <Text style={styles.brandName}>RETOUR GAGNANT</Text>
                <Text style={styles.brandSub}>BÉNIN</Text>
                <View style={styles.ornament}>
                    <View style={styles.ornamentLine} />
                    <View style={styles.ornamentDot} />
                    <View style={styles.ornamentLine} />
                </View>
                <Text style={styles.tagline}>L'Agence du Retour des Afro-descendants</Text>
                <View style={styles.versionBadge}>
                    <Ionicons name="code-slash-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.versionText}>Version {APP_VERSION} (build {BUILD_NUMBER})</Text>
                </View>
            </View>

            {/* Notre Histoire — synchronisé avec le site web /a-propos */}
            <View style={styles.missionCard}>
                <Text style={styles.sectionLabel}>NOTRE HISTOIRE</Text>
                <Text style={styles.sectionTitle}>Née de la diaspora,{"\n"}pour la diaspora</Text>
                <Text style={styles.missionText}>
                    Fondée par des membres de la diaspora béninoise ayant eux-mêmes vécu l'expérience du retour, Retour Gagnant est née d'un constat simple : rentrer au pays ne devrait pas être un parcours du combattant.
                </Text>
                <Text style={styles.missionText}>
                    Aujourd'hui, nous avons accompagné plus de 500 projets de retour réussis. Des passeports aux investissements immobiliers, en passant par la création d'entreprise, nous sommes le partenaire de confiance de la diaspora.
                </Text>
            </View>

            {/* Nos Valeurs — synchronisé avec le site web */}
            <Text style={styles.listSectionTitle}>NOS VALEURS</Text>
            <View style={styles.valuesGrid}>
                {VALUES.map((v, i) => (
                    <View key={i} style={styles.valueCard}>
                        <View style={[styles.valueIconWrap, { backgroundColor: v.color + '12' }]}>
                            <Ionicons name={v.icon} size={22} color={v.color} />
                        </View>
                        <Text style={styles.valueTitle}>{v.title}</Text>
                        <Text style={styles.valueDesc}>{v.desc}</Text>
                    </View>
                ))}
            </View>

            {/* Équipe */}
            <Text style={styles.listSectionTitle}>Notre équipe</Text>
            <View style={styles.teamCard}>
                {TEAM.map((member, i) => (
                    <View
                        key={i}
                        style={[styles.teamItem, i < TEAM.length - 1 && styles.teamItemBorder]}
                    >
                        <View style={[styles.teamIcon, { backgroundColor: member.color + '15' }]}>
                            <Ionicons name={member.icon} size={18} color={member.color} />
                        </View>
                        <View>
                            <Text style={styles.teamName}>{member.name}</Text>
                            <Text style={styles.teamRole}>{member.role}</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Liens légaux */}
            <Text style={styles.listSectionTitle}>Informations légales</Text>
            <View style={styles.linksCard}>
                {LINKS.map((link, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.linkItem, i < LINKS.length - 1 && styles.linkItemBorder]}
                        onPress={() => handleLink(link.url)}
                        activeOpacity={0.6}
                    >
                        <View style={styles.linkIconWrap}>
                            <Ionicons name={link.icon} size={18} color={colors.primary} />
                        </View>
                        <Text style={styles.linkLabel}>{link.label}</Text>
                        <ExternalLink size={14} color={colors.textMuted} strokeWidth={1.75} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Réseaux sociaux */}
            <Text style={styles.listSectionTitle}>Suivez-nous</Text>
            <View style={styles.socialRow}>
                {[
                    { icon: 'logo-facebook' as const, color: '#1877F2', label: 'Facebook' },
                    { icon: 'logo-instagram' as const, color: '#E1306C', label: 'Instagram' },
                    { icon: 'logo-youtube' as const, color: '#FF0000', label: 'YouTube' },
                    { icon: 'logo-whatsapp' as const, color: '#25D366', label: 'WhatsApp' },
                ].map((s) => (
                    <TouchableOpacity key={s.label} style={styles.socialBtn} activeOpacity={0.7}>
                        <Ionicons name={s.icon} size={22} color={s.color} />
                        <Text style={styles.socialLabel}>{s.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Copyright */}
            <Text style={styles.copyright}>
                © {new Date().getFullYear()} Retour Gagnant Bénin{'\n'}Tous droits réservés
            </Text>

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

    brandCard: {
        margin: spacing.lg,
        backgroundColor: colors.headerBg,
        borderRadius: radius.lg, padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1, borderColor: colors.primary + '25',
        ...shadows.md,
    },
    logoWrap: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.primary + '30',
    },
    logo: { width: 60, height: 60 },
    brandName: {
        color: colors.primaryLight, fontSize: 18,
        fontFamily: 'Inter_700Bold', letterSpacing: 5,
    },
    brandSub: {
        color: colors.primaryLight, fontSize: 18,
        fontFamily: 'Inter_700Bold', letterSpacing: 5, marginTop: 2,
    },
    ornament: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginTop: 12, marginBottom: 8,
    },
    ornamentLine: { width: 36, height: 1, backgroundColor: colors.primary + '50' },
    ornamentDot: { width: 6, height: 6, backgroundColor: colors.primaryLight, transform: [{ rotate: '45deg' }] },
    tagline: {
        color: colors.primary + 'AA', fontSize: 11,
        fontStyle: 'italic', letterSpacing: 0.5, marginBottom: spacing.md,
    },
    versionBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    },
    versionText: { ...typography.caption, color: colors.textMuted },

    missionCard: {
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.sm, gap: 12,
    },
    sectionLabel: { ...typography.overline, fontSize: 10, color: '#E8112D', marginBottom: 2 },
    sectionTitle: { ...typography.h3, color: colors.textPrimary },
    missionText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },

    valuesGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12,
        paddingHorizontal: spacing.lg, marginBottom: spacing.lg,
    },
    valueCard: {
        width: '47%' as any, backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: spacing.md,
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.sm, alignItems: 'center', gap: 6,
    },
    valueIconWrap: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    valueTitle: { ...typography.label, color: colors.textPrimary, fontSize: 14, textAlign: 'center' },
    valueDesc: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },

    listSectionTitle: {
        ...typography.overline, fontSize: 10, color: colors.textMuted,
        marginHorizontal: spacing.lg, marginBottom: 8,
    },

    teamCard: {
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    },
    teamItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingHorizontal: 16, paddingVertical: 14,
    },
    teamItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    teamIcon: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    teamName: { ...typography.label, color: colors.textPrimary },
    teamRole: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

    linksCard: {
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    },
    linkItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    linkItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    linkIconWrap: {
        width: 34, height: 34, borderRadius: 9,
        backgroundColor: colors.primary + '12',
        alignItems: 'center', justifyContent: 'center',
    },
    linkLabel: { flex: 1, ...typography.bodySmall, fontFamily: 'Inter_500Medium', color: colors.textPrimary },

    socialRow: {
        flexDirection: 'row', justifyContent: 'space-around',
        marginHorizontal: spacing.lg, marginBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: spacing.md,
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    },
    socialBtn: { alignItems: 'center', gap: 6, flex: 1 },
    socialLabel: { ...typography.caption, color: colors.textSecondary },

    copyright: {
        ...typography.caption, color: colors.textMuted,
        textAlign: 'center', lineHeight: 20,
        marginBottom: spacing.lg,
    },
})
