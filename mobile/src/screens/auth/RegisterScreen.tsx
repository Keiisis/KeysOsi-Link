import React, { useState, useEffect, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Image, KeyboardAvoidingView,
    Platform, ScrollView, ActivityIndicator, Alert,
    Animated
} from 'react-native'
import { ArrowRight, Lock, Mail, User, Phone } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { spacing, radius, fonts } from '../../config/theme'

// IMPORTANT: Importation directe du logo
const LOGO_IMG = require('../../../assets/icon.png')

export default function RegisterScreen({ navigation }: any) {
    const { signUp } = useAuth()
    const { t } = useLang()
    
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)

    const slideUpAnim = useRef(new Animated.Value(50)).current
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideUpAnim, {
                toValue: 0,
                tension: 40,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start()
    }, [])

    const handleRegister = async () => {
        if (!email.trim() || !password.trim() || !prenom.trim() || !nom.trim()) {
            Alert.alert(t('Champs requis'), t('Veuillez remplir tous les champs obligatoires.'))
            return
        }
        setLoading(true)
        const { error } = await signUp(email.trim(), password, {
            prenom: prenom.trim(),
            nom: nom.trim(),
            telephone: phone.trim()
        })
        setLoading(false)
        if (error) {
            Alert.alert(t('Erreur d\'inscription'), error.message)
        } else {
            Alert.alert(t('Succès'), t('Veuillez vérifier votre email pour confirmer votre compte.'), [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ])
        }
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <Image source={require('../../../assets/auth_bg.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(2, 20, 10, 0.5)' }]} />

            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                
                <Animated.View style={[styles.headerBand, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={LOGO_IMG}
                            style={styles.logoImage}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.brandName}>
                        <Text style={{ color: '#4ADE80' }}>RETOUR </Text>
                        <Text style={{ color: '#FCD34D' }}>GAGNANT</Text>
                    </Text>
                    <Text style={[styles.brandSub, { color: '#EF4444' }]}>BÉNIN</Text>
                </Animated.View>

                <Animated.View style={[
                    styles.card, 
                    { 
                        opacity: fadeAnim, 
                        transform: [{ translateY: slideUpAnim }] 
                    }
                ]}>
                    <Text style={styles.title}>{t('Créer un compte')}</Text>
                    <Text style={styles.subtitle}>{t('Rejoignez l\'excellence')}</Text>

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>{t('Prénom')}</Text>
                            <View style={[styles.inputWrapper, focused === 'prenom' && styles.inputFocused]}>
                                <User size={20} color={focused === 'prenom' ? '#059669' : '#A0AEC0'} style={styles.inputIcon}/>
                                <TextInput
                                    style={styles.input} placeholder={t("Prénom")} placeholderTextColor="#A0AEC0"
                                    value={prenom} onChangeText={setPrenom}
                                    onFocus={() => setFocused('prenom')} onBlur={() => setFocused(null)}
                                />
                            </View>
                        </View>
                        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>{t('Nom')}</Text>
                            <View style={[styles.inputWrapper, focused === 'nom' && styles.inputFocused]}>
                                <TextInput
                                    style={styles.input} placeholder={t("Nom")} placeholderTextColor="#A0AEC0"
                                    value={nom} onChangeText={setNom}
                                    onFocus={() => setFocused('nom')} onBlur={() => setFocused(null)}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Adresse email')}</Text>
                        <View style={[styles.inputWrapper, focused === 'email' && styles.inputFocused]}>
                            <Mail size={20} color={focused === 'email' ? '#059669' : '#A0AEC0'} style={styles.inputIcon}/>
                            <TextInput
                                style={styles.input} placeholder={t("votre@email.com")} placeholderTextColor="#A0AEC0"
                                value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
                                onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Téléphone (Optionnel)')}</Text>
                        <View style={[styles.inputWrapper, focused === 'phone' && styles.inputFocused]}>
                            <Phone size={20} color={focused === 'phone' ? '#059669' : '#A0AEC0'} style={styles.inputIcon}/>
                            <TextInput
                                style={styles.input} placeholder={t("+229 00 00 00 00")} placeholderTextColor="#A0AEC0"
                                value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                                onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('Mot de passe')}</Text>
                        <View style={[styles.inputWrapper, focused === 'password' && styles.inputFocused]}>
                            <Lock size={20} color={focused === 'password' ? '#059669' : '#A0AEC0'} style={styles.inputIcon}/>
                            <TextInput
                                style={[styles.input, { flex: 1 }]} placeholder={t("Créer un mot de passe")} placeholderTextColor="#A0AEC0"
                                value={password} onChangeText={setPassword} secureTextEntry={!showPassword}
                                onFocus={() => setFocused('password')} onBlur={() => setFocused(null)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={focused === 'password' ? '#059669' : '#A0AEC0'} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled, { marginTop: 10 }]} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
                        <LinearGradient colors={['#F59E0B', '#D97706']} style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]} />
                        {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                            <>
                                <Text style={styles.buttonText}>{t('S\'inscrire')}</Text>
                                <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.separator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>{t('Déjà membre ?')}</Text>
                        <View style={styles.separatorLine} />
                    </View>

                    <TouchableOpacity style={styles.loginBtn} activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginBtnText}>{t('Se connecter')}</Text>
                    </TouchableOpacity>
                </Animated.View>

            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#064E3B' },
    scroll: { flexGrow: 1, paddingBottom: 40 },

    circleTopRight: { position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: 125, backgroundColor: '#10B981', opacity: 0.3 },
    circleBottomLeft: { position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#F59E0B', opacity: 0.15 },

    headerBand: { paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 15, alignItems: 'center' },
    
    logoContainer: {
        width: 100, height: 100,
        borderRadius: 50,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 12,
    },
    logoImage: { width: 100, height: 100, borderRadius: 50 },
    
    brandName: { fontSize: 20, fontFamily: fonts.heading, letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    brandSub: { fontSize: 16, fontFamily: fonts.headingRegular, letterSpacing: 6, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },

    card: { marginHorizontal: spacing.lg, marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 24, padding: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 12 },
    title: { fontFamily: fonts.heading, fontSize: 26, color: '#111827', marginBottom: 4 },
    subtitle: { fontFamily: fonts.bodyMedium, fontSize: 15, color: '#6B7280', marginBottom: spacing.xl },

    row: { flexDirection: 'row' },
    inputGroup: { marginBottom: spacing.lg },
    label: { fontFamily: fonts.bodySemibold, fontSize: 13, color: '#374151', marginBottom: 8, letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', paddingHorizontal: spacing.md, minHeight: 56 },
    inputFocused: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, fontFamily: fonts.bodyMedium, color: '#111827', paddingVertical: Platform.OS === 'ios' ? 14 : 12 },
    eyeBtn: { padding: 4 },

    button: { borderRadius: radius.lg, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { fontFamily: fonts.heading, fontSize: 18, color: '#FFFFFF', letterSpacing: 0.5 },

    separator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xl, gap: 16 },
    separatorLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    separatorText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: '#9CA3AF' },

    loginBtn: { borderRadius: radius.lg, paddingVertical: 16, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#FFFFFF' },
    loginBtnText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: '#374151' },
})
