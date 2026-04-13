import React from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Linking, Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'About'>

const APP_VERSION = '1.0.0'
const BUILD_NUMBER = '100'

const LINKS = [
    { label: 'Site officiel', icon: 'globe-outline' as const, url: 'https://retour-gagnant.com' },
    { label: 'Conditions d\'utilisation', icon: 'document-text-outline' as const, url: 'https://retour-gagnant.com/cgu' },
    { label: 'Politique de confidentialité', icon: 'shield-outline' as const, url: 'https://retour-gagnant.com/privacy' },
    { label: 'Nous contacter', icon: 'mail-outline' as const, url: 'mailto:contact@retour-gagnant.com' },
]

const TEAM = [
    { name: 'Équipe juridique', role: 'Experts en droit béninois et international', icon: 'briefcase-outline' as const, color: colors.gold },
    { name: 'Généalogistes', role: 'Spécialistes des archives et recherches ancestrales', icon: 'people-outline' as const, color: '#7C5CCA' },
    { name: 'Agents administratifs', role: 'Coordination avec les institutions béninoises', icon: 'business-outline' as const, color: '#2D9F63' },
    { name: 'Support client', role: 'Disponible 6j/7 pour vous accompagner', icon: 'headset-outline' as const, color: colors.info },
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
                <View style={styles.goldLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={colors.textOnDark} />
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

            {/* Mission */}
            <View style={styles.missionCard}>
                <Text style={styles.sectionTitle}>Notre Mission</Text>
                <Text style={styles.missionText}>
                    Retour Gagnant Bénin accompagne les membres de la diaspora africaine et afro-descendante dans leur retour aux sources.
                    Nous facilitons l'obtention de la nationalité béninoise, le renouvellement de passeport, les recherches ancestrales
                    et toutes les démarches administratives liées à un établissement au Bénin.
                </Text>
                <Text style={styles.missionText}>
                    Fondée sur les valeurs d'excellence, de proximité et de respect de l'héritage culturel africain, notre agence
                    place la diaspora au cœur de son action pour le développement du Bénin.
                </Text>
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
                            <Ionicons name={link.icon} size={18} color={colors.gold} />
                        </View>
                        <Text style={styles.linkLabel}>{link.label}</Text>
                        <Ionicons name="open-outline" size={14} color={colors.textMuted} />
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
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 4 },

    brandCard: {
        margin: spacing.lg,
        backgroundColor: colors.headerBg,
        borderRadius: radius.lg, padding: spacing.xl,
        alignItems: 'center',
        borderWidth: 1, borderColor: colors.gold + '25',
        ...shadows.md,
    },
    logoWrap: {
        width: 80, height: 80, borderRadius: 20,
        backgroundColor: colors.gold + '15',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.md,
        borderWidth: 1, borderColor: colors.gold + '30',
    },
    logo: { width: 60, height: 60 },
    brandName: {
        color: colors.goldLight, fontSize: 18,
        fontFamily: 'Inter_700Bold', letterSpacing: 5,
    },
    brandSub: {
        color: colors.goldLight, fontSize: 18,
        fontFamily: 'Inter_700Bold', letterSpacing: 5, marginTop: 2,
    },
    ornament: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginTop: 12, marginBottom: 8,
    },
    ornamentLine: { width: 36, height: 1, backgroundColor: colors.gold + '50' },
    ornamentDot: { width: 6, height: 6, backgroundColor: colors.goldLight, transform: [{ rotate: '45deg' }] },
    tagline: {
        color: colors.gold + 'AA', fontSize: 11,
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
    sectionTitle: { ...typography.h3, color: colors.textPrimary },
    missionText: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 22 },

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
        backgroundColor: colors.gold + '12',
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
