'use strict'
import React, { useEffect, useRef, useState } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity, Platform,
    ActivityIndicator, Alert, ScrollView, Image,
} from 'react-native'
import { ArrowLeft, Edit3, RotateCcw, Save, Trash2, Settings as SettingsIcon, Check } from 'lucide-react-native'
import SignatureScreenLib, { SignatureViewRef } from 'react-native-signature-canvas'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { fetchWithTimeout } from '../../lib/fetch'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { RootStackParamList } from '../../navigation/AppNavigator'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Signature'>

type AutoSign = 'ask' | 'auto' | 'never'

interface ServerSignature {
    id: string
    signature_data: string
    auto_sign: AutoSign
    updated_at: string
}

const AUTO_SIGN_LABELS: Record<AutoSign, string> = {
    ask: 'Me demander à chaque fois',
    auto: 'Apposer automatiquement',
    never: "Ne pas signer automatiquement",
}

export default function SignatureScreen({ navigation }: { navigation: Nav }) {
    const { profile } = useAuth()
    const { t } = useLang()
    const sigRef = useRef<SignatureViewRef>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editing, setEditing] = useState(false)
    const [savedSig, setSavedSig] = useState<ServerSignature | null>(null)
    const [autoSign, setAutoSign] = useState<AutoSign>('ask')

    /* ── Charger la signature existante ── */
    useEffect(() => {
        const load = async () => {
            if (!profile) { setLoading(false); return }
            try {
                const res = await fetchWithTimeout(
                    `${API_BASE}/api/mobile/signature?client_id=${profile.id}`,
                    { timeoutMs: 8000 }
                )
                const data = await res.json().catch(() => ({}))
                if (data.signature) {
                    setSavedSig(data.signature)
                    setAutoSign(data.signature.auto_sign || 'ask')
                }
            } catch { /* ignore */ } finally {
                setLoading(false)
            }
        }
        load()
    }, [profile])

    /* ── Sauvegarder la signature ── */
    const handleOK = async (signature: string) => {
        if (!profile) return
        if (!signature || signature.length < 200) {
            Alert.alert(t('Signature trop courte'), t('Dessinez une signature plus complète.'))
            return
        }
        setSaving(true)
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/mobile/signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 12000,
                body: JSON.stringify({
                    client_id: profile.id,
                    signature_data: signature,
                    auto_sign: autoSign,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.signature) {
                Alert.alert(t('Erreur'), data.error || t('Impossible d\'enregistrer la signature.'))
                return
            }
            setSavedSig(data.signature)
            setEditing(false)
            Alert.alert(t('Signature enregistrée'), t('Votre signature est désormais associée à votre compte.'))
        } catch {
            Alert.alert(t('Erreur'), t('Impossible d\'enregistrer la signature.'))
        } finally {
            setSaving(false)
        }
    }

    const handleClear = () => sigRef.current?.clearSignature()

    /* ── Mettre à jour la préférence auto_sign ── */
    const updateAutoSign = async (next: AutoSign) => {
        if (!profile || !savedSig) {
            setAutoSign(next)
            return
        }
        try {
            const res = await fetchWithTimeout(`${API_BASE}/api/mobile/signature`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                timeoutMs: 8000,
                body: JSON.stringify({ client_id: profile.id, auto_sign: next }),
            })
            const data = await res.json().catch(() => ({}))
            if (res.ok && data.signature) {
                setSavedSig(data.signature)
                setAutoSign(next)
            }
        } catch { /* ignore */ }
    }

    /* ── Supprimer ── */
    const handleDelete = () => {
        Alert.alert(
            t('Supprimer la signature'),
            t('Voulez-vous vraiment supprimer votre signature enregistrée ?'),
            [
                { text: t('Annuler'), style: 'cancel' },
                {
                    text: t('Supprimer'), style: 'destructive', onPress: async () => {
                        if (!profile) return
                        try {
                            const res = await fetchWithTimeout(
                                `${API_BASE}/api/mobile/signature?client_id=${profile.id}`,
                                { method: 'DELETE', timeoutMs: 8000 }
                            )
                            if (res.ok) {
                                setSavedSig(null)
                                setEditing(true)
                            }
                        } catch { /* ignore */ }
                    },
                },
            ]
        )
    }

    /* ── Webview style ── */
    const webStyle = `
        .m-signature-pad { box-shadow: none; border: none; }
        .m-signature-pad--body { border: none; }
        .m-signature-pad--footer { display: none; }
        body, html { width: 100%; height: 100%; margin: 0; padding: 0; }
    `

    /* ── Render ── */
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#FFF" strokeWidth={1.75} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('Ma Signature')}</Text>
                <Text style={styles.headerSub}>
                    {t('Utilisée pour signer factures, devis et documents')}
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} size="large" />
                </View>
            ) : !editing && savedSig ? (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
                    {/* Signature actuelle */}
                    <View style={styles.savedCard}>
                        <View style={styles.cardHeader}>
                            <Check size={16} color={colors.success} strokeWidth={1.75} />
                            <Text style={styles.cardTitle}>{t('Signature enregistrée')}</Text>
                        </View>
                        <View style={styles.sigPreviewWrap}>
                            <Image
                                source={{ uri: savedSig.signature_data }}
                                style={styles.sigPreview}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.savedDate}>
                            {t('Mise à jour')} : {new Date(savedSig.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </View>

                    {/* Préférence */}
                    <View style={styles.prefCard}>
                        <View style={styles.cardHeader}>
                            <SettingsIcon size={16} color={colors.primary} strokeWidth={1.75} />
                            <Text style={styles.cardTitle}>{t('Comportement par défaut')}</Text>
                        </View>
                        {(Object.keys(AUTO_SIGN_LABELS) as AutoSign[]).map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.prefRow, autoSign === opt && styles.prefRowActive]}
                                onPress={() => updateAutoSign(opt)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.radio, autoSign === opt && styles.radioActive]}>
                                    {autoSign === opt && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[styles.prefLabel, autoSign === opt && { color: colors.primary }]}>
                                    {t(AUTO_SIGN_LABELS[opt])}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.btnPrimary} onPress={() => setEditing(true)} activeOpacity={0.85}>
                            <Edit3 size={16} color="#FFF" strokeWidth={1.75} />
                            <Text style={styles.btnPrimaryText}>{t('Modifier la signature')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnDanger} onPress={handleDelete} activeOpacity={0.85}>
                            <Trash2 size={16} color={colors.danger} strokeWidth={1.75} />
                            <Text style={styles.btnDangerText}>{t('Supprimer')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            ) : (
                /* Mode édition : canvas */
                <View style={styles.editorWrap}>
                    <View style={styles.editorHeader}>
                        <Edit3 size={16} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.editorTitle}>{t('Dessinez votre signature ci-dessous')}</Text>
                    </View>

                    <View style={styles.canvasWrap}>
                        <SignatureScreenLib
                            ref={sigRef}
                            onOK={handleOK}
                            onEmpty={() => Alert.alert(t('Vide'), t('Veuillez dessiner votre signature.'))}
                            descriptionText=""
                            webStyle={webStyle}
                            penColor="#1a2332"
                            backgroundColor="#FFFFFF"
                            autoClear={false}
                            imageType="image/png"
                        />
                    </View>

                    <View style={styles.editorActions}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={handleClear} activeOpacity={0.85}>
                            <RotateCcw size={16} color={colors.textSecondary} strokeWidth={1.75} />
                            <Text style={styles.btnSecondaryText}>{t('Effacer')}</Text>
                        </TouchableOpacity>
                        {savedSig && (
                            <TouchableOpacity
                                style={styles.btnSecondary}
                                onPress={() => setEditing(false)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.btnSecondaryText}>{t('Annuler')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.btnPrimary, { flex: 1 }]}
                            onPress={() => sigRef.current?.readSignature()}
                            disabled={saving}
                            activeOpacity={0.85}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Save size={16} color="#FFF" strokeWidth={1.75} />
                                    <Text style={styles.btnPrimaryText}>{t('Enregistrer')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 24,
        paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    },
    backBtn: { marginBottom: spacing.md },
    headerTitle: { ...typography.h2, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

    scrollContent: { padding: spacing.lg },

    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { ...typography.h3, fontSize: 14, color: colors.textPrimary },

    savedCard: {
        backgroundColor: colors.surface,
        padding: spacing.md, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: spacing.md, ...shadows.xs,
    },
    sigPreviewWrap: {
        backgroundColor: '#FFF',
        borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.borderLight,
        padding: 8, alignItems: 'center', justifyContent: 'center',
    },
    sigPreview: { width: '100%', height: 140 },
    savedDate: { ...typography.caption, color: colors.textMuted, marginTop: 8, textAlign: 'right' },

    prefCard: {
        backgroundColor: colors.surface,
        padding: spacing.md, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    prefRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 11,
    },
    prefRowActive: { /* visual highlight via radio + text color only */ },
    radio: {
        width: 20, height: 20, borderRadius: 10,
        borderWidth: 2, borderColor: colors.borderPrimary,
        alignItems: 'center', justifyContent: 'center',
    },
    radioActive: { borderColor: colors.primary },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    prefLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },

    actions: { gap: 10 },

    btnPrimary: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: colors.primary, paddingVertical: 14,
        borderRadius: radius.md, ...shadows.primary,
    },
    btnPrimaryText: { ...typography.button, color: '#FFF' },
    btnSecondary: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: colors.surface,
        paddingHorizontal: 16, paddingVertical: 12,
        borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.borderPrimary,
    },
    btnSecondaryText: { ...typography.button, fontSize: 13, color: colors.textSecondary },

    btnDanger: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: colors.dangerBg,
        paddingVertical: 13, borderRadius: radius.sm,
        borderWidth: 1, borderColor: colors.danger + '40',
    },
    btnDangerText: { ...typography.button, color: colors.danger },

    /* Editor */
    editorWrap: { flex: 1, padding: spacing.lg },
    editorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    editorTitle: { ...typography.label, color: colors.textPrimary },
    canvasWrap: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.borderPrimary,
        overflow: 'hidden', marginBottom: 12,
    },
    editorActions: { flexDirection: 'row', gap: 8, marginBottom: Platform.OS === 'ios' ? 24 : 12 },
})
