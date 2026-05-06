import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert,
} from 'react-native'
import { ArrowLeft, CheckCircle, Lock, Mail } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import ScreenHeader from '../../components/ScreenHeader'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfil'>

export default function EditProfilScreen({ navigation }: { navigation: Nav }) {
    const { profile, updateProfile } = useAuth()
    const { t } = useLang()

    const [prenom, setPrenom] = useState(profile?.prenom || '')
    const [nom, setNom] = useState(profile?.nom || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [ville, setVille] = useState(profile?.ville || '')
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)

    const handleSave = async () => {
        if (!prenom.trim() || !nom.trim()) {
            Alert.alert(t('Champs requis'), t('Le prénom et le nom sont obligatoires.'))
            return
        }
        setLoading(true)
        const { error } = await updateProfile({
            prenom: prenom.trim(),
            nom: nom.trim(),
            phone: phone.trim() || undefined,
            ville: ville.trim() || undefined,
        })
        setLoading(false)

        if (error) {
            Alert.alert(t('Erreur'), error.message)
        } else {
            Alert.alert(t('Succès'), t('Profil mis à jour avec succès.'), [
                { text: 'OK', onPress: () => navigation.goBack() },
            ])
        }
    }

    const Field = ({
        label, value, onChange, placeholder, icon, keyboardType = 'default', field,
    }: {
        label: string
        value: string
        onChange: (v: string) => void
        placeholder: string
        icon: keyof typeof Ionicons.glyphMap
        keyboardType?: 'default' | 'phone-pad' | 'email-address'
        field: string
    }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, focused === field && styles.inputFocused]}>
                    <Ionicons
                        name={icon}
                        size={18}
                        color={focused === field ? colors.primary : colors.textMuted}
                        style={styles.inputIcon}
                    />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={keyboardType}
                    autoCapitalize={keyboardType === 'default' ? 'words' : 'none'}
                    onFocus={() => setFocused(field)}
                    onBlur={() => setFocused(null)}
                />
            </View>
        </View>
    )

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
            <ScreenHeader
                title={t('Informations personnelles')}
                subtitle={t('Modifiez vos informations de profil')}
                onBack={() => navigation.goBack()}
            />

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {/* Email non modifiable */}
                    <View style={styles.emailRow}>
                        <Mail size={16} color={colors.textMuted} strokeWidth={1.75} />
                        <Text style={styles.emailText}>{profile?.email}</Text>
                        <View style={styles.lockedBadge}>
                            <Lock size={10} color={colors.textMuted} strokeWidth={1.75} />
                            <Text style={styles.lockedText}>{t('Non modifiable')}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Field
                        label={t('Prénom *')}
                        value={prenom}
                        onChange={setPrenom}
                        placeholder={t("Jean")}
                        icon="person-outline"
                        field="prenom"
                    />
                    <Field
                        label={t('Nom *')}
                        value={nom}
                        onChange={setNom}
                        placeholder={t("Dupont")}
                        icon="person-outline"
                        field="nom"
                    />
                    <Field
                        label={t('Téléphone')}
                        value={phone}
                        onChange={setPhone}
                        placeholder="+229 97 00 00 00"
                        icon="call-outline"
                        keyboardType="phone-pad"
                        field="phone"
                    />
                    <Field
                        label={t('Ville de résidence')}
                        value={ville}
                        onChange={setVille}
                        placeholder={t("Paris, Montréal, Lagos...")}
                        icon="location-outline"
                        field="ville"
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <CheckCircle size={20} color="#FFF" strokeWidth={1.75} />
                                <Text style={styles.saveBtnText}>{t('Enregistrer les modifications')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },


    scroll: { padding: spacing.lg, paddingBottom: 60 },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },

    emailRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginBottom: spacing.md,
    },
    emailText: { ...typography.bodySmall, color: colors.textMuted, flex: 1 },
    lockedBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.surfaceElevated,
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.xs,
    },
    lockedText: { fontSize: 10, color: colors.textMuted, fontFamily: 'Inter_500Medium' },

    divider: { height: 1, backgroundColor: colors.borderLight, marginBottom: spacing.lg },

    inputGroup: { marginBottom: spacing.md },
    label: { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: spacing.md, minHeight: 52,
    },
    inputFocused: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.textPrimary, fontFamily: 'Inter_400Regular' },

    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { ...typography.button, color: '#FFF' },
})
