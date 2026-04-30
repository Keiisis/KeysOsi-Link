import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert, Image, ScrollView
} from 'react-native'
import { ArrowLeft, Key, Mail, Send } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

export default function ForgotPasswordScreen({ navigation }: any) {
    const { resetPassword } = useAuth()
    const { t } = useLang()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState(false)

    const handleReset = async () => {
        if (!email.trim()) {
            Alert.alert(t('Champs requis'), t('Veuillez entrer votre adresse email.'))
            return
        }
        setLoading(true)
        const { error } = await resetPassword(email.trim())
        setLoading(false)
        if (error) {
            Alert.alert(t('Erreur'), error.message)
        } else {
            Alert.alert(
                t('Email envoyé'),
                t('Vérifiez votre boîte de réception pour réinitialiser votre mot de passe.'),
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            )
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#070D1A', '#0C1B33', '#132846']} style={styles.headerBand}>
                    <View style={styles.flagStripe}>
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagGreen }]} />
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagYellow }]} />
                        <View style={[styles.flagSeg, { backgroundColor: colors.flagRed }]} />
                    </View>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={1.75} />
                    </TouchableOpacity>
                    <Image source={require('../../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
                </LinearGradient>

                <View style={styles.card}>
                    <View style={styles.cardIconWrap}>
                        <Key size={28} color={colors.primary} strokeWidth={1.75} />
                    </View>
                    <Text style={styles.title}>{t('Mot de passe oublié')}</Text>
                    <Text style={styles.subtitle}>
                        {t('Entrez votre adresse email et nous vous enverrons un lien de réinitialisation sécurisé.')}
                    </Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Adresse email')}</Text>
                        <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
                            <Mail size={18} color={focused ? colors.primary : colors.textMuted} strokeWidth={1.75} style={styles.inputIcon}/>
                            <TextInput
                                style={styles.input}
                                placeholder={t("votre@email.com")}
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
                                <Text style={styles.buttonText}>{t('Envoyer le lien')}</Text>
                                <Send size={18} color="#FFFFFF" strokeWidth={1.75} />
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
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 40, alignItems: 'center',
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        position: 'relative',
    },
    flagStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, flexDirection: 'row' },
    flagSeg: { flex: 1 },
    backBtn: { position: 'absolute', left: 20, top: Platform.OS === 'ios' ? 54 : 38, padding: 8 },
    logo: { width: 60, height: 60 },

    card: {
        marginHorizontal: spacing.lg, marginTop: -24,
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, paddingTop: 28, ...shadows.lg,
        borderWidth: 1, borderColor: colors.borderLight,
        alignItems: 'center',
    },
    cardIconWrap: {
        marginBottom: 12, backgroundColor: colors.primaryMuted,
        padding: 14, borderRadius: radius.lg,
    },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center', lineHeight: 22 },
    
    inputGroup: { width: '100%', marginBottom: spacing.xl },
    label: { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', width: '100%',
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52,
    },
    inputFocused: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },

    button: {
        width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadows.primary,
    },
    buttonDisabled: { opacity: 0.65 },
    buttonText: { ...typography.button, color: '#FFFFFF' },
    
    footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
})
