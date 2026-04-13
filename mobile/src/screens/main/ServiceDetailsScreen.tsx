import React, { useState } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Platform, Alert, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useAuth } from '../../contexts/AuthContext'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

/* ═══════════════════════════════════════════════════════════
   Service Details Screen — Commander + créer dossier en DB
═══════════════════════════════════════════════════════════ */

export default function ServiceDetailsScreen({ route, navigation }: any) {
    const { serviceId, title, desc, color, icon } = route.params || {}
    const { profile } = useAuth()
    const [loading, setLoading] = useState(false)

    const serviceColor = color || colors.gold

    const features: string[] = [
        'Consultation initiale avec nos experts',
        'Analyse complète de votre dossier',
        'Accompagnement administratif personnalisé',
        'Suivi en temps réel via l\'application',
    ]

    const handleOrder = async () => {
        if (!profile) {
            Alert.alert('Non connecté', 'Veuillez vous connecter pour commander ce service.')
            return
        }

        Alert.alert(
            'Confirmer la commande',
            `Souhaitez-vous initier le service "${title}" ?\n\nUn dossier sera créé et notre équipe vous contactera sous 24h.`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: async () => {
                        setLoading(true)
                        try {
                            const res = await fetch(`${API_BASE}/api/mobile/dossiers`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    client_id: profile.id,
                                    service_type: title,
                                    service_id: serviceId || null,
                                    notes: `Commande initiée via l'application mobile le ${new Date().toLocaleDateString('fr-FR')}`,
                                }),
                            })

                            // Lire la réponse comme texte d'abord pour éviter le crash JSON
                            const text = await res.text()
                            let json: Record<string, unknown> = {}
                            try { json = JSON.parse(text) } catch {
                                throw new Error(`Erreur serveur (${res.status}) — contactez le support`)
                            }

                            if (!res.ok) {
                                throw new Error((json.error as string) || `Erreur ${res.status}`)
                            }

                            if (json.exists) {
                                Alert.alert(
                                    'Dossier existant',
                                    'Vous avez déjà un dossier en cours pour ce service. Consultez la section "Mon Dossier" pour suivre son avancement.',
                                    [{ text: 'Voir mon dossier', onPress: () => navigation.goBack() }]
                                )
                                return
                            }

                            Alert.alert(
                                'Dossier créé !',
                                `Votre demande pour "${title}" a été enregistrée avec succès.\n\nNotre équipe vous contactera dans les 24 heures pour la suite de votre dossier.`,
                                [{ text: 'Parfait', onPress: () => navigation.goBack() }]
                            )
                        } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : 'Erreur lors de la création du dossier'
                            Alert.alert('Erreur', msg)
                        } finally {
                            setLoading(false)
                        }
                    },
                },
            ]
        )
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
                        <Ionicons name="arrow-back" size={20} color="#FFF" />
                    </View>
                </TouchableOpacity>

                <View style={styles.headerIconWrap}>
                    <Ionicons name={icon || 'briefcase-outline'} size={40} color={serviceColor} />
                </View>

                <View style={styles.headerBadge}>
                    <Ionicons name="star" size={10} color={serviceColor} />
                    <Text style={[styles.headerBadgeText, { color: serviceColor }]}>Service Premium</Text>
                </View>
            </View>

            {/* Carte contenu */}
            <View style={styles.card}>
                <Text style={styles.title}>{title || 'Détails du Service'}</Text>
                <Text style={styles.desc}>{desc || 'Informations concernant ce service et accompagnement personnalisé.'}</Text>

                {/* Délai estimé */}
                <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                        <Ionicons name="time-outline" size={18} color={serviceColor} />
                        <View>
                            <Text style={styles.infoLabel}>Délai moyen</Text>
                            <Text style={styles.infoValue}>4–8 semaines</Text>
                        </View>
                    </View>
                    <View style={[styles.infoItem, styles.infoItemBorder]}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={serviceColor} />
                        <View>
                            <Text style={styles.infoLabel}>Garantie</Text>
                            <Text style={styles.infoValue}>Satisfaction</Text>
                        </View>
                    </View>
                    <View style={styles.infoItem}>
                        <Ionicons name="people-outline" size={18} color={serviceColor} />
                        <View>
                            <Text style={styles.infoLabel}>Support</Text>
                            <Text style={styles.infoValue}>Dédié</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Ce qui est inclus</Text>
                {features.map((feature, i) => (
                    <View key={i} style={styles.featureRow}>
                        <View style={[styles.featureCheck, { backgroundColor: serviceColor + '15' }]}>
                            <Ionicons name="checkmark" size={14} color={serviceColor} />
                        </View>
                        <Text style={styles.featureText}>{feature}</Text>
                    </View>
                ))}

                <View style={styles.divider} />

                {/* Processus */}
                <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
                {[
                    { step: '1', label: 'Commandez le service', icon: 'cart-outline' as const },
                    { step: '2', label: 'Déposez vos documents', icon: 'cloud-upload-outline' as const },
                    { step: '3', label: 'Suivi en temps réel', icon: 'pulse-outline' as const },
                    { step: '4', label: 'Résultat final', icon: 'ribbon-outline' as const },
                ].map((item) => (
                    <View key={item.step} style={styles.processRow}>
                        <View style={[styles.processStep, { backgroundColor: serviceColor + '15', borderColor: serviceColor + '30' }]}>
                            <Text style={[styles.processStepNum, { color: serviceColor }]}>{item.step}</Text>
                        </View>
                        <Ionicons name={item.icon} size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={styles.processLabel}>{item.label}</Text>
                    </View>
                ))}

                {/* Bouton commander */}
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: serviceColor }, loading && styles.btnDisabled]}
                    activeOpacity={0.85}
                    onPress={handleOrder}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <>
                            <Ionicons name="cart-outline" size={20} color="#FFF" />
                            <Text style={styles.btnText}>Commander ce service</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.btnNote}>
                    En commandant, vous serez contacté par notre équipe dans les 24h pour démarrer votre dossier.
                </Text>
            </View>

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

    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
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

    processRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    processStep: {
        width: 28, height: 28, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1,
    },
    processStepNum: { fontSize: 13, fontFamily: 'Inter_700Bold' },
    processLabel: { ...typography.bodySmall, color: colors.textPrimary, flex: 1 },

    btn: {
        marginTop: spacing.lg,
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
})
