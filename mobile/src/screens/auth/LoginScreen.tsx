import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Image, KeyboardAvoidingView,
    Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'


/* ═══════════════════════════════════════════════════════════
   Login Screen — Connexion Premium Or/Ivoire
═══════════════════════════════════════════════════════════ */

export default function LoginScreen({ navigation }: any) {
    const { signIn } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Champs requis', 'Veuillez remplir tous les champs.')
            return
        }
        setLoading(true)
        const { error } = await signIn(email.trim(), password)
        setLoading(false)
        if (error) {
            Alert.alert('Erreur de connexion', 'Email ou mot de passe incorrect.')
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── En-tête avec bande marine ── */}
                <View style={styles.headerBand}>
                    <View style={styles.goldLine} />
                    <Image
                        source={require('../../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandName}>RETOUR GAGNANT</Text>
                    <Text style={styles.brandSub}>BÉNIN</Text>
                    <View style={styles.ornament}>
                        <View style={styles.ornamentLine} />
                        <View style={styles.ornamentDiamond} />
                        <View style={styles.ornamentLine} />
                    </View>
                    <Text style={styles.tagline}>L&apos;Agence du Retour des Afro-descendants</Text>
                </View>

                {/* ── Carte formulaire ── */}
                <View style={styles.card}>
                    <Text style={styles.title}>Connexion</Text>
                    <Text style={styles.subtitle}>Accédez à votre espace client sécurisé</Text>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Adresse email</Text>
                        <View style={[styles.inputWrapper, focused === 'email' && styles.inputFocused]}>
                            <Ionicons name="mail-outline" size={18} color={focused === 'email' ? colors.gold : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                            />
                        </View>
                    </View>

                    {/* Mot de passe */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mot de passe</Text>
                        <View style={[styles.inputWrapper, focused === 'password' && styles.inputFocused]}>
                            <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? colors.gold : colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Votre mot de passe"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                autoComplete="password"
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Mot de passe oublié */}
                    <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
                    </TouchableOpacity>

                    {/* Bouton Connexion */}
                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Se connecter</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Séparateur */}
                    <View style={styles.separator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>ou</Text>
                        <View style={styles.separatorLine} />
                    </View>

                    {/* Lien inscription */}
                    <TouchableOpacity style={styles.registerBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.registerBtnText}>Créer un compte</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>Retour Gagnant Bénin — v1.0</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1 },

    // Header band
    headerBand: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 64 : 48,
        paddingBottom: 36,
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    goldLine: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, backgroundColor: colors.gold,
    },
    logo: { width: 80, height: 80, marginBottom: 12 },
    brandName: {
        color: colors.goldLight,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 5,
    },
    brandSub: {
        color: colors.goldLight,
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 5,
        marginTop: 2,
    },
    ornament: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginTop: 14, marginBottom: 10,
    },
    ornamentLine: { width: 40, height: 1, backgroundColor: colors.gold + '60' },
    ornamentDiamond: {
        width: 6, height: 6, backgroundColor: colors.goldLight,
        transform: [{ rotate: '45deg' }],
    },
    tagline: {
        color: colors.gold + 'AA',
        fontSize: 11, fontStyle: 'italic',
        letterSpacing: 0.5,
    },

    // Card
    card: {
        marginHorizontal: spacing.lg,
        marginTop: -20,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        paddingTop: 28,
        ...shadows.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
        marginBottom: 4,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },

    // Inputs
    inputGroup: { marginBottom: spacing.md },
    label: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        minHeight: 52,
    },
    inputFocused: {
        borderColor: colors.gold,
        backgroundColor: colors.goldShimmer,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    },
    eyeBtn: { padding: 4 },

    // Forgot
    forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.lg, marginTop: -4 },
    forgotText: { ...typography.caption, color: colors.gold, fontWeight: '600' },

    // Button
    button: {
        backgroundColor: colors.gold,
        borderRadius: radius.md,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...shadows.gold,
    },
    buttonDisabled: { opacity: 0.65 },
    buttonText: { ...typography.button, color: '#FFFFFF' },

    // Separator
    separator: {
        flexDirection: 'row', alignItems: 'center',
        marginVertical: spacing.lg, gap: 12,
    },
    separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
    separatorText: { ...typography.caption, color: colors.textMuted },

    // Register
    registerBtn: {
        borderRadius: radius.md,
        paddingVertical: 15,
        borderWidth: 1.5,
        borderColor: colors.borderGold,
        alignItems: 'center',
        backgroundColor: colors.goldShimmer,
    },
    registerBtnText: {
        ...typography.button,
        color: colors.gold,
    },

    // Footer
    footer: {
        ...typography.caption,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
})
