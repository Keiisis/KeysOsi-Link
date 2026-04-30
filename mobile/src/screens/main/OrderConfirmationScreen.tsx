'use strict'
import React from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView,
} from 'react-native'
import { CheckCircle, Package, ShoppingBag, Receipt } from 'lucide-react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderConfirmation'>
type Route = RouteProp<RootStackParamList, 'OrderConfirmation'>

export default function OrderConfirmationScreen({ navigation, route }: { navigation: Nav; route: Route }) {
    const { orderId, transactionId } = route.params
    const { t } = useLang()

    const goToOrder = () => {
        navigation.replace('OrderDetail', { orderId })
    }

    const backToBoutique = () => {
        navigation.popToTop()
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.successCircle}>
                <CheckCircle size={64} color={colors.success} strokeWidth={1.5} />
            </View>

            <Text style={styles.title}>{t('Commande confirmée !')}</Text>
            <Text style={styles.subtitle}>
                {t('Votre paiement a été reçu et votre commande est en cours de préparation.')}
            </Text>

            <View style={styles.refCard}>
                <View style={styles.refRow}>
                    <Receipt size={16} color={colors.primary} strokeWidth={1.75} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.refLabel}>{t('Numéro de commande')}</Text>
                        <Text style={styles.refValue}>#{orderId.slice(0, 8).toUpperCase()}</Text>
                    </View>
                </View>
                {transactionId ? (
                    <View style={styles.refRow}>
                        <Package size={16} color={colors.primary} strokeWidth={1.75} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.refLabel}>{t('Référence paiement')}</Text>
                            <Text style={styles.refValueSmall}>{transactionId}</Text>
                        </View>
                    </View>
                ) : null}
            </View>

            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    {t('Vous recevrez un email de confirmation avec votre facture. Suivez la livraison de votre colis depuis l\'onglet "Mes Commandes".')}
                </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={goToOrder} activeOpacity={0.85}>
                <Package size={18} color="#FFF" strokeWidth={1.75} />
                <Text style={styles.primaryBtnText}>{t('Suivre ma commande')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={backToBoutique} activeOpacity={0.85}>
                <ShoppingBag size={18} color={colors.primary} strokeWidth={1.75} />
                <Text style={styles.secondaryBtnText}>{t('Retour à la boutique')}</Text>
            </TouchableOpacity>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center', justifyContent: 'center',
        padding: spacing.xl,
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
        backgroundColor: colors.background,
    },
    successCircle: {
        width: 120, height: 120, borderRadius: 60,
        backgroundColor: colors.successBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24,
    },
    title: { ...typography.h1, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },

    refCard: {
        width: '100%',
        backgroundColor: colors.surface,
        padding: spacing.lg, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: 20, gap: 14,
    },
    refRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    refLabel: { ...typography.caption, color: colors.textMuted },
    refValue: { ...typography.h3, fontSize: 16, color: colors.primary, fontFamily: 'Outfit_700Bold' },
    refValueSmall: { ...typography.bodySmall, color: colors.textPrimary, fontFamily: 'Outfit_600SemiBold' },

    infoBox: {
        width: '100%',
        backgroundColor: colors.primaryMuted,
        padding: spacing.md, borderRadius: radius.sm,
        marginBottom: 28,
    },
    infoText: { ...typography.bodySmall, color: colors.primary, lineHeight: 20 },

    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', paddingVertical: 16,
        backgroundColor: colors.primary, borderRadius: radius.md,
        marginBottom: 12, ...shadows.primary,
    },
    primaryBtnText: { ...typography.button, color: '#FFF' },

    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', paddingVertical: 14,
        backgroundColor: 'transparent', borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.primary,
    },
    secondaryBtnText: { ...typography.button, color: colors.primary },
})
