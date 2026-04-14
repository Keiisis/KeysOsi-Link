import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Image, KeyboardAvoidingView,
    Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { ArrowLeft, HelpCircle, Lock, Mail } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

export default function RegisterScreen({ navigation }: any) {
    const { signUp } = useAuth()
    const { t } = useLang()
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)

    const handleRegister = async () => {
        if (!prenom.trim() || !nom.trim() || !email.trim() || !password.trim()) {
            Alert.alert(t('Champs requis'), t('Veuillez remplir tous les champs.'))
            return
        }
        if (password.length < 6) {
            Alert.alert(t('Erreur'), t('Le mot de passe doit contenir au moins 6 caractères.'))
            return
        }
        setLoading(true)
        const { error } = await signUp(email.trim(), password, {
            prenom: prenom.trim(),
            nom: nom.trim(),
        })
        setLoading(false)
        if (error) {
            Alert.alert(t('Erreur'), error.message)
        } else {
            Alert.alert(
                t('Inscription réussie'),
                t('Vérifiez votre email pour confirmer votre compte.'),
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
                    <Text style={styles.brandName}>RETOUR GAGNANT</Text>
                    <Text style={styles.brandSub}>BÉNIN</Text>
                </LinearGradient>

                <View style={styles.card}>
                    <Text style={styles.title}>{t('Créer un compte')}</Text>
                    <Text style={styles.subtitle}>{t('Rejoignez la communauté Retour Gagnant')}</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>{t('Prénom')}</Text>
                            <View style={[styles.inputWrapper, focused === 'prenom' && styles.inputFocused]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Jean"
                                    placeholderTextColor={colors.textMuted}
                                    value={prenom} onChangeText={setPrenom}
                                    autoCapitalize="words"
                                    onFocus={() => setFocused('prenom')} onBlur={() => setFocused(null)}
                                />
                            </View>
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{t('Nom')}</Text>
                            <View style={[styles.inputWrapper, focused === 'nom' && styles.inputFocused]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Dupont"
                                    placeholderTextColor={colors.textMuted}
                                    value={nom} onChangeText={setNom}
                                    autoCapitalize="words"
                                    onFocus={() => setFocused('nom')} onBlur={() => setFocused(null)}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Adresse email')}</Text>
                        <View style={[styles.inputWrapper, focused === 'email' && styles.inputFocused]}>
                            <Mail size={18} color={focused === 'email' ? colors.primary : colors.textMuted} strokeWidth={1.75} style={styles.inputIcon}/>
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                placeholderTextColor={colors.textMuted}
                                value={email} onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Mot de passe')}</Text>
                        <View style={[styles.inputWrapper, focused === 'password' && styles.inputFocused]}>
                            <Lock size={18} color={focused === 'password' ? colors.primary : colors.textMuted} strokeWidth={1.75} style={styles.inputIcon}/>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Min. 6 caractères"
                                placeholderTextColor={colors.textMuted}
                                value={password} onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                        {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                            <>
                                <Text style={styles.buttonText}>S&apos;inscrire</Text>
                                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginRow}>
                        <Text style={styles.loginText}>{t('Déjà un compte ?')} </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>{t('Se connecter')}</Text>
                        </TouchableOpacity>
                    </View>
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
    logo: { width: 70, height: 70, marginBottom: 12 },
    brandName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 4 },
    brandSub: { color: colors.primary, fontSize: 18, fontWeight: '700', letterSpacing: 4, marginTop: 2 },

    card: {
        marginHorizontal: spacing.lg, marginTop: -24,
        backgroundColor: colors.surface, borderRadius: radius.xl,
        padding: spacing.lg, paddingTop: 28, ...shadows.lg,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    title: { ...typography.h2, color: colors.textPrimary, marginBottom: 4 },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
    row: { flexDirection: 'row' },
    
    inputGroup: { marginBottom: spacing.md },
    label: { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, minHeight: 52,
    },
    inputFocused: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.textPrimary, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },
    eyeBtn: { padding: 4 },

    button: {
        backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, ...shadows.primary,
    },
    buttonDisabled: { opacity: 0.65 },
    buttonText: { ...typography.button, color: '#FFFFFF' },

    loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
    loginText: { ...typography.bodySmall, color: colors.textSecondary },
    loginLink: { ...typography.label, color: colors.primary },
    
    footer: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.xxl },
})
