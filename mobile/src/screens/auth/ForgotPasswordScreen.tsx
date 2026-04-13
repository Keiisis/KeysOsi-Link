import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, Image, ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

export default function ForgotPasswordScreen({ navigation }: any) {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState(false)

    const handleReset = async () => {
        if (!email.trim()) {
            Alert.alert('Champs requis', 'Veuillez entrer votre adresse email.')
            return
        }
        setLoading(true)
        const { error } = await resetPassword(email.trim())
        setLoading(false)
        if (error) {
            Alert.alert('Erreur', error.message)
        } else {
            Alert.alert(
                'Email envoyé',
                'Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            )
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Header band */}
                <View style={styles.headerBand}>
                    <View style={styles.goldLine} />
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.goldLight} />
                    </TouchableOpacity>
                    <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Ionicons name="key-outline" size={32} color={colors.gold} style={styles.cardIcon} />
                    <Text style={styles.title}>Mot de passe oublié</Text>
                    <Text style={styles.subtitle}>
                        Entrez votre adresse email et nous vous enverrons un lien de réinitialisation sécurisé.
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Adresse email</Text>
                        <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
                            <Ionicons name="mail-outline" size={18} color={focused ? colors.gold : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                placeholderTextColor={colors.textMuted}
                                value={email} onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                            <>
                                <Text style={styles.buttonText}>Envoyer le lien</Text>
                                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Retour Gagnant Bénin — v1.0</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },

    headerBand: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 40, alignItems: 'center',
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
        position: 'relative',
    },
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    backBtn: { position: 'absolute', left: 20, top: Platform.OS === 'ios' ? 54 : 38, padding: 8 },
    logo: { width: 60, height: 60 },

    card: {
        marginHorizontal: spacing.lg, marginTop: -24,
        backgroundColor: colors.surface, borderRadius: radius.lg,
        padding: spacing.lg, paddingTop: 28, ...shadows.lg,
        borderWidth: 1, borderColor: colors.borderLight,
        alignItems: 'center',
    },
    cardIcon: { marginBottom: 12, backgroundColor: colors.goldMuted, padding: 12, borderRadius: 24 },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center', lineHeight: 22 },
    
    inputGroup: { width: '100%', marginBottom: spacing.xl },
    label: { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', width: '100%',
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52,
    },
    inputFocused: { borderColor: colors.gold, backgroundColor: colors.goldShimmer },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },

    button: {
        width: '100%', backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.gold,
    },
    buttonDisabled: { opacity: 0.65 },
    buttonText: { ...typography.button, color: '#FFFFFF' },
    
    footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
})
