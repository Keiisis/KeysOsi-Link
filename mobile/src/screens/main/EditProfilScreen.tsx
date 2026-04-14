import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert,
} from 'react-native'
import { ArrowLeft, CheckCircle, Lock, Mail } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfil'>

export default function EditProfilScreen({ navigation }: { navigation: Nav }) {
    const { profile, updateProfile } = useAuth()

    const [prenom, setPrenom] = useState(profile?.prenom || '')
    const [nom, setNom] = useState(profile?.nom || '')
    const [phone, setPhone] = useState(profile?.phone || '')
    const [ville, setVille] = useState(profile?.ville || '')
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)

    const handleSave = async () => {
        if (!prenom.trim() || !nom.trim()) {
            Alert.alert('Champs requis', 'Le prénom et le nom sont obligatoires.')
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
            Alert.alert('Erreur', error.message)
        } else {
            Alert.alert('Succès', 'Profil mis à jour avec succès.', [
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color={colors.textOnDark} strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Informations personnelles</Text>
                <Text style={styles.headerSub}>Modifiez vos informations de profil</Text>
            </View>

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
                            <Text style={styles.lockedText}>Non modifiable</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <Field
                        label="Prénom *"
                        value={prenom}
                        onChange={setPrenom}
                        placeholder="Jean"
                        icon="person-outline"
                        field="prenom"
                    />
                    <Field
                        label="Nom *"
                        value={nom}
                        onChange={setNom}
                        placeholder="Dupont"
                        icon="person-outline"
                        field="nom"
                    />
                    <Field
                        label="Téléphone"
                        value={phone}
                        onChange={setPhone}
                        placeholder="+229 97 00 00 00"
                        icon="call-outline"
                        keyboardType="phone-pad"
                        field="phone"
                    />
                    <Field
                        label="Ville de résidence"
                        value={ville}
                        onChange={setVille}
                        placeholder="Paris, Montréal, Lagos..."
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
                                <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 28,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.primary + 'AA', marginTop: 4 },

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
