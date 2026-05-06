import React from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Linking,
} from 'react-native'
import { ArrowLeft, Shield, FileText, ExternalLink } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenHeader from '../../components/ScreenHeader'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useLang } from '../../contexts/LangContext'

/* ═══════════════════════════════════════════════════════════
   CGU & Politique de Confidentialité
   Obligatoire pour Google Play & App Store
═══════════════════════════════════════════════════════════ */

export default function LegalScreen({ navigation }: any) {
    const { t } = useLang()

    const sections = [
        {
            title: t('Conditions Générales d\'Utilisation'),
            icon: FileText,
            content: [
                {
                    heading: t('1. Objet'),
                    text: t('Les présentes Conditions Générales d\'Utilisation (CGU) régissent l\'accès et l\'utilisation de l\'application mobile "Retour Gagnant Bénin" (ci-après "l\'Application"), éditée par RGB SARL, immatriculée au Bénin. L\'utilisation de l\'Application implique l\'acceptation pleine et entière des présentes CGU.'),
                },
                {
                    heading: t('2. Services proposés'),
                    text: t('L\'Application propose des services d\'accompagnement administratif et juridique pour les diasporas béninoises, incluant : constitution de dossiers de nationalité, recherche ancestrale, suivi de dossiers en cours, messagerie avec notre équipe d\'agents, boutique d\'articles culturels et artisanaux, gestion de rendez-vous et événements communautaires.'),
                },
                {
                    heading: t('3. Inscription et compte'),
                    text: t('L\'accès aux services nécessite la création d\'un compte personnel. L\'utilisateur s\'engage à fournir des informations exactes et à maintenir la confidentialité de ses identifiants. Tout usage frauduleux du compte pourra entraîner sa suspension immédiate.'),
                },
                {
                    heading: t('4. Paiements'),
                    text: t('Les paiements sont traités via la plateforme sécurisée Kkiapay (Mobile Money, cartes bancaires). Les tarifs sont indiqués en FCFA. Toute prestation commandée et payée est soumise aux conditions de remboursement spécifiques à chaque service, détaillées lors de la commande.'),
                },
                {
                    heading: t('5. Responsabilité'),
                    text: t('RGB SARL s\'engage à fournir ses services avec diligence. Toutefois, l\'Application est fournie "en l\'état". RGB SARL ne saurait être tenue responsable des interruptions techniques, des retards administratifs indépendants de sa volonté, ou de l\'usage fait par l\'utilisateur des informations fournies.'),
                },
                {
                    heading: t('6. Propriété intellectuelle'),
                    text: t('L\'ensemble des contenus de l\'Application (textes, images, logos, design) sont la propriété exclusive de RGB SARL et sont protégés par les lois sur la propriété intellectuelle. Toute reproduction non autorisée est strictement interdite.'),
                },
                {
                    heading: t('7. Droit applicable'),
                    text: t('Les présentes CGU sont régies par le droit béninois. En cas de litige, les tribunaux de Cotonou seront seuls compétents, après tentative de résolution amiable.'),
                },
            ],
        },
        {
            title: t('Politique de Confidentialité'),
            icon: Shield,
            content: [
                {
                    heading: t('1. Données collectées'),
                    text: t('Nous collectons les données suivantes : nom, prénom, adresse e-mail, numéro de téléphone, ville et pays de résidence, photo de profil (optionnelle), documents administratifs téléversés dans le cadre de votre dossier, historique de paiements et de commandes, messages échangés avec notre équipe.'),
                },
                {
                    heading: t('2. Finalité du traitement'),
                    text: t('Vos données sont utilisées exclusivement pour : la gestion de votre compte et de vos dossiers, la communication avec notre équipe d\'agents, le traitement de vos paiements et commandes, l\'envoi de notifications relatives à vos démarches, l\'amélioration de nos services.'),
                },
                {
                    heading: t('3. Partage des données'),
                    text: t('Vos données personnelles ne sont jamais vendues à des tiers. Elles peuvent être partagées avec : nos agents internes habilités au traitement de vos dossiers, nos prestataires de paiement (Kkiapay) dans le cadre strict du traitement des transactions, les autorités béninoises compétentes dans le cadre des démarches administratives que vous avez initiées.'),
                },
                {
                    heading: t('4. Sécurité'),
                    text: t('Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées : chiffrement des données en transit (TLS/SSL), stockage sécurisé via Supabase (hébergement certifié), authentification sécurisée avec tokens JWT, accès restreint aux données selon le principe du moindre privilège.'),
                },
                {
                    heading: t('5. Conservation'),
                    text: t('Vos données sont conservées pendant toute la durée de votre utilisation de l\'Application, puis pendant une durée de 5 ans après la clôture de votre compte, conformément aux obligations légales en vigueur au Bénin.'),
                },
                {
                    heading: t('6. Vos droits'),
                    text: t('Vous disposez d\'un droit d\'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : contact@retourgagnantbenin.bj. Nous nous engageons à répondre dans un délai de 30 jours.'),
                },
                {
                    heading: t('7. Cookies et traceurs'),
                    text: t('L\'Application n\'utilise pas de cookies. Des identifiants techniques peuvent être utilisés pour le bon fonctionnement du service (tokens de session, push notification tokens).'),
                },
            ],
        },
    ]

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
            <ScreenHeader
                title={t('Mentions Légales')}
                subtitle={t('CGU & Confidentialité')}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {sections.map((section, si) => (
                    <View key={si} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionIconWrap}>
                                <section.icon size={20} color={colors.primary} strokeWidth={2} />
                            </View>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>

                        <View style={styles.card}>
                            {section.content.map((item, ii) => (
                                <View key={ii} style={[styles.clause, ii < section.content.length - 1 && styles.clauseBorder]}>
                                    <Text style={styles.clauseHeading}>{item.heading}</Text>
                                    <Text style={styles.clauseText}>{item.text}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Contact */}
                <View style={styles.contactCard}>
                    <Text style={styles.contactTitle}>{t('Une question ?')}</Text>
                    <Text style={styles.contactText}>
                        {t('Contactez notre équipe pour toute question relative à vos données personnelles ou à nos conditions d\'utilisation.')}
                    </Text>
                    <TouchableOpacity
                        style={styles.contactBtn}
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL('mailto:contact@retourgagnantbenin.bj')}
                    >
                        <ExternalLink size={16} color="#FFF" strokeWidth={2} />
                        <Text style={styles.contactBtnText}>contact@retourgagnantbenin.bj</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    {t('Dernière mise à jour : Mai 2026')}{'\n'}
                    {t('RGB SARL — Cotonou, Bénin')}{'\n'}
                    {t('Tous droits réservés.')}
                </Text>

                <View style={{ height: 100 }} />
            </ScrollView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    scrollContent: { padding: spacing.md },

    section: { marginBottom: spacing.xl },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        marginBottom: spacing.md,
    },
    sectionIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        flex: 1,
    },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
        ...shadows.sm,
    },

    clause: {
        padding: spacing.md,
    },
    clauseBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    clauseHeading: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: 6,
    },
    clauseText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 22,
    },

    contactCard: {
        backgroundColor: colors.primarySoft,
        borderRadius: radius.lg,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.lg,
    },
    contactTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    contactText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: 16,
    },
    contactBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.primary,
        paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: radius.md, alignSelf: 'flex-start',
        ...shadows.primary,
    },
    contactBtnText: {
        ...typography.label,
        color: '#FFF',
    },

    footer: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
})
