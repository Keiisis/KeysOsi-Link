import React, { useState } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Security'>

export default function SecurityScreen({ navigation }: { navigation: Nav }) {
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [focused, setFocused] = useState<string | null>(null)
    const [showNew, setShowNew] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    /* ── Indicateur de force ── */
    const getStrength = (p: string): { level: number; label: string; color: string } => {
        if (p.length === 0) return { level: 0, label: '', color: 'transparent' }
        let score = 0
        if (p.length >= 8) score++
        if (/[A-Z]/.test(p)) score++
        if (/[0-9]/.test(p)) score++
        if (/[^A-Za-z0-9]/.test(p)) score++
        if (score <= 1) return { level: 1, label: 'Faible', color: '#E74C3C' }
        if (score === 2) return { level: 2, label: 'Moyen', color: '#F39C12' }
        if (score === 3) return { level: 3, label: 'Bon', color: '#2D9F63' }
        return { level: 4, label: 'Fort', color: '#27AE60' }
    }

    const strength = getStrength(newPassword)

    const handleSave = async () => {
        if (!newPassword.trim()) {
            Alert.alert('Champ requis', 'Veuillez saisir un nouveau mot de passe.')
            return
        }
        if (newPassword.length < 8) {
            Alert.alert('Mot de passe trop court', 'Le mot de passe doit contenir au moins 8 caractères.')
            return
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mots de passe différents', 'La confirmation ne correspond pas au nouveau mot de passe.')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        setLoading(false)

        if (error) {
            Alert.alert('Erreur', error.message)
        } else {
            Alert.alert(
                'Mot de passe modifié',
                'Votre mot de passe a été mis à jour avec succès.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            )
        }
    }

    const PasswordField = ({
        label, value, onChange, show, onToggle, field, placeholder,
    }: {
        label: string
        value: string
        onChange: (v: string) => void
        show: boolean
        onToggle: () => void
        field: string
        placeholder: string
    }) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, focused === field && styles.inputFocused]}>
                <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={focused === field ? colors.gold : colors.textMuted}
                    style={styles.inputIcon}
                />
                <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={value}
                    onChangeText={onChange}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!show}
                    autoCapitalize="none"
                    onFocus={() => setFocused(field)}
                    onBlur={() => setFocused(null)}
                />
                <TouchableOpacity
                    onPress={onToggle}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.eyeBtn}
                >
                    <Ionicons
                        name={show ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                    />
                </TouchableOpacity>
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
                <View style={styles.goldLine} />
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color={colors.textOnDark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sécurité</Text>
                <Text style={styles.headerSub}>Gérez votre mot de passe</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Info banner */}
                <View style={styles.infoBanner}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.gold} />
                    <Text style={styles.infoText}>
                        Choisissez un mot de passe fort : au moins 8 caractères, avec majuscules, chiffres et symboles.
                    </Text>
                </View>

                <View style={styles.card}>
                    <PasswordField
                        label="Nouveau mot de passe"
                        value={newPassword}
                        onChange={setNewPassword}
                        show={showNew}
                        onToggle={() => setShowNew(v => !v)}
                        field="new"
                        placeholder="Min. 8 caractères"
                    />

                    {/* Indicateur de force */}
                    {newPassword.length > 0 && (
                        <View style={styles.strengthWrap}>
                            <View style={styles.strengthBars}>
                                {[1, 2, 3, 4].map(i => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.strengthBar,
                                            { backgroundColor: i <= strength.level ? strength.color : colors.border },
                                        ]}
                                    />
                                ))}
                            </View>
                            <Text style={[styles.strengthLabel, { color: strength.color }]}>
                                {strength.label}
                            </Text>
                        </View>
                    )}

                    {/* Règles */}
                    <View style={styles.rulesWrap}>
                        {[
                            { rule: newPassword.length >= 8, text: 'Au moins 8 caractères' },
                            { rule: /[A-Z]/.test(newPassword), text: 'Une majuscule' },
                            { rule: /[0-9]/.test(newPassword), text: 'Un chiffre' },
                            { rule: /[^A-Za-z0-9]/.test(newPassword), text: 'Un caractère spécial' },
                        ].map(({ rule, text }) => (
                            <View key={text} style={styles.ruleRow}>
                                <Ionicons
                                    name={rule ? 'checkmark-circle' : 'ellipse-outline'}
                                    size={14}
                                    color={rule ? '#2D9F63' : colors.textMuted}
                                />
                                <Text style={[styles.ruleText, rule && styles.ruleTextDone]}>{text}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.divider} />

                    <PasswordField
                        label="Confirmer le mot de passe"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        show={showConfirm}
                        onToggle={() => setShowConfirm(v => !v)}
                        field="confirm"
                        placeholder="Répétez le mot de passe"
                    />

                    {/* Match indicator */}
                    {confirmPassword.length > 0 && (
                        <View style={[styles.matchRow, { marginTop: -8, marginBottom: spacing.md }]}>
                            <Ionicons
                                name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                                size={14}
                                color={newPassword === confirmPassword ? '#2D9F63' : '#E74C3C'}
                            />
                            <Text style={[
                                styles.matchText,
                                { color: newPassword === confirmPassword ? '#2D9F63' : '#E74C3C' },
                            ]}>
                                {newPassword === confirmPassword ? 'Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                            </Text>
                        </View>
                    )}

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
                                <Ionicons name="shield-checkmark-outline" size={20} color="#FFF" />
                                <Text style={styles.saveBtnText}>Modifier le mot de passe</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Section sessions */}
                <View style={styles.card2}>
                    <View style={styles.card2Header}>
                        <Ionicons name="log-out-outline" size={20} color={colors.gold} />
                        <Text style={styles.card2Title}>Déconnexion sécurisée</Text>
                    </View>
                    <Text style={styles.card2Text}>
                        Si vous suspectez une activité non autorisée sur votre compte, déconnectez-vous immédiatement.
                    </Text>
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
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 4 },

    scroll: { padding: spacing.lg, paddingBottom: 60 },

    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: colors.gold + '15',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.gold + '30',
        padding: spacing.md,
        marginBottom: spacing.lg,
    },
    infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1, lineHeight: 20 },

    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.lg,
    },

    inputGroup: { marginBottom: spacing.md },
    label: { ...typography.label, color: colors.textPrimary, marginBottom: 8 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
        borderWidth: 1.5, borderColor: colors.border,
        paddingHorizontal: spacing.md, minHeight: 52,
    },
    inputFocused: { borderColor: colors.gold, backgroundColor: colors.goldShimmer },
    inputIcon: { marginRight: 10 },
    input: { fontSize: 16, color: colors.textPrimary, fontFamily: 'Inter_400Regular' },
    eyeBtn: { padding: 4 },

    divider: { height: 1, backgroundColor: colors.borderLight, marginBottom: spacing.lg },

    strengthWrap: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, marginTop: -6, marginBottom: spacing.md,
    },
    strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { ...typography.caption, fontFamily: 'Inter_600SemiBold', minWidth: 40 },

    rulesWrap: { gap: 6, marginBottom: spacing.md },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleText: { ...typography.caption, color: colors.textMuted },
    ruleTextDone: { color: '#2D9F63' },

    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    matchText: { ...typography.caption },

    saveBtn: {
        backgroundColor: colors.gold,
        borderRadius: radius.md,
        paddingVertical: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: spacing.sm,
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { ...typography.button, color: '#FFF' },

    card2: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadows.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    card2Header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
    card2Title: { ...typography.h3, color: colors.textPrimary },
    card2Text: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 },
})
