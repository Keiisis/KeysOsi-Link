import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

/* ── Types ── */
interface DossierDocument {
    id: string
    file_name: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    file_url?: string
    file_type?: string
}

interface DossierData {
    id: string
    status: string
    progress: number
    service_type: string
    documents: DossierDocument[]
}

const STEPS = [
    { label: 'Soumis', threshold: 0 },
    { label: 'Vérifié', threshold: 25 },
    { label: 'Traitement', threshold: 50 },
    { label: 'Validation', threshold: 75 },
    { label: 'Terminé', threshold: 100 },
]

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE_MB = 10

/* ═══════════════════════════════════════════════════════════
   Dossier Screen — Suivi dossier + upload documents
═══════════════════════════════════════════════════════════ */

export default function DossierScreen() {
    const { profile } = useAuth()
    const [dossier, setDossier] = useState<DossierData | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)

    const fetchDossier = useCallback(async () => {
        if (!profile) return
        try {
            const { data } = await supabase
                .from('dossiers')
                .select('id, status, progress, service_type')
                .eq('client_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

            if (data) {
                const { data: docs } = await supabase
                    .from('documents')
                    .select('id, file_name, status, created_at, file_url, file_type')
                    .eq('dossier_id', data.id)
                    .order('created_at', { ascending: false })

                setDossier({ ...data, documents: (docs || []) as unknown as DossierDocument[] })
            } else {
                setDossier(null)
            }
        } catch { /* aucun dossier */ } finally { setLoading(false) }
    }, [profile])

    useEffect(() => { fetchDossier() }, [fetchDossier])

    const onRefresh = async () => {
        setRefreshing(true)
        await fetchDossier()
        setRefreshing(false)
    }

    /* ── Upload un fichier (ArrayBuffer depuis fetch) ── */
    const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
        if (!dossier || !profile) return

        const sizeCheck = await fetch(uri, { method: 'HEAD' }).catch(() => null)
        // Check taille si possible
        const contentLength = sizeCheck?.headers?.get('content-length')
        if (contentLength && parseInt(contentLength) > MAX_SIZE_MB * 1024 * 1024) {
            Alert.alert('Fichier trop volumineux', `La taille maximale est de ${MAX_SIZE_MB} Mo.`)
            return
        }

        setUploading(true)
        setShowUploadModal(false)
        try {
            const response = await fetch(uri)
            const blob = await response.blob()

            // Sanitiser le nom de fichier
            const safeName = fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u017E]/g, '_')
            const filePath = `${profile.id}/${dossier.id}/${Date.now()}_${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('dossier-documents')
                .upload(filePath, blob, { contentType: mimeType, upsert: false })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('dossier-documents')
                .getPublicUrl(filePath)

            // Insérer enregistrement en base
            const { error: dbError } = await supabase.from('documents').insert({
                dossier_id: dossier.id,
                client_id: profile.id,
                file_name: safeName,
                file_url: publicUrl,
                file_type: mimeType,
                status: 'pending',
            })

            if (dbError) throw dbError

            Alert.alert('Document envoyé', 'Votre document a été soumis avec succès. Notre équipe le vérifiera sous 24–48h.')
            await fetchDossier()
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur lors de l\'envoi'
            Alert.alert('Erreur', msg)
        } finally {
            setUploading(false)
        }
    }

    /* ── Sélectionner un document ── */
    const handlePickDocument = async () => {
        setShowUploadModal(false)
        const result = await DocumentPicker.getDocumentAsync({
            type: ALLOWED_TYPES,
            copyToCacheDirectory: true,
        })

        if (result.canceled || !result.assets?.[0]) return
        const asset = result.assets[0]

        if (asset.size && asset.size > MAX_SIZE_MB * 1024 * 1024) {
            Alert.alert('Fichier trop volumineux', `La taille maximale est de ${MAX_SIZE_MB} Mo.`)
            return
        }

        await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream')
    }

    /* ── Prendre une photo du document ── */
    const handleScanDocument = async () => {
        setShowUploadModal(false)
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permission refusée', 'L\'accès à la caméra est requis pour scanner un document.')
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.85,
        })

        if (result.canceled || !result.assets[0]) return
        const asset = result.assets[0]
        const fileName = `scan_${Date.now()}.jpg`
        await uploadFile(asset.uri, fileName, 'image/jpeg')
    }

    /* ── Photo depuis galerie ── */
    const handlePickImage = async () => {
        setShowUploadModal(false)
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permission refusée', 'L\'accès à la galerie est requis.')
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.85,
        })

        if (result.canceled || !result.assets[0]) return
        const asset = result.assets[0]
        const ext = asset.uri.split('.').pop() || 'jpg'
        const fileName = `photo_${Date.now()}.${ext}`
        await uploadFile(asset.uri, fileName, asset.mimeType || 'image/jpeg')
    }

    /* ── Helpers UI ── */
    const docStatusInfo = (s: string) => {
        if (s === 'approved') return { icon: 'checkmark-circle' as const, color: colors.success, label: 'Validé' }
        if (s === 'rejected') return { icon: 'close-circle' as const, color: colors.danger, label: 'Refusé' }
        return { icon: 'time-outline' as const, color: colors.warning, label: 'En attente' }
    }

    const fileIconName = (type?: string): keyof typeof Ionicons.glyphMap => {
        if (!type) return 'document-outline'
        if (type.includes('pdf')) return 'document-text-outline'
        if (type.includes('image')) return 'image-outline'
        if (type.includes('word') || type.includes('doc')) return 'reader-outline'
        return 'document-outline'
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.goldLine} />
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>Mon Dossier</Text>
                        <Text style={styles.headerSub}>Suivez l'avancement en temps réel</Text>
                    </View>
                    {dossier && (
                        <TouchableOpacity
                            style={styles.uploadHeaderBtn}
                            onPress={() => setShowUploadModal(true)}
                            disabled={uploading}
                            activeOpacity={0.8}
                        >
                            {uploading ? (
                                <ActivityIndicator color="#FFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
                                    <Text style={styles.uploadHeaderBtnText}>Ajouter</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* État loading */}
            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.gold} size="large" />
                    <Text style={styles.loadingText}>Chargement du dossier…</Text>
                </View>
            ) : !dossier ? (
                /* ── Aucun dossier ── */
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}>
                        <Ionicons name="folder-open-outline" size={44} color={colors.gold} />
                    </View>
                    <Text style={styles.emptyTitle}>Aucun dossier en cours</Text>
                    <Text style={styles.emptyText}>
                        Votre dossier sera créé lors de votre premier service. Contactez-nous pour démarrer votre projet de retour au Bénin.
                    </Text>
                    <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.8}>
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#FFF" />
                        <Text style={styles.emptyBtnText}>Nous contacter</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* ── Progression ── */}
                    <View style={styles.progressCard}>
                        <View style={styles.progressTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.progressService}>{dossier.service_type || 'Dossier'}</Text>
                                <View style={styles.statusRow}>
                                    <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
                                    <Text style={styles.progressStatus}>
                                        {dossier.status === 'en_cours' ? 'En cours de traitement'
                                            : dossier.status === 'termine' ? 'Terminé'
                                                : dossier.status === 'en_attente' ? 'En attente de documents'
                                                    : dossier.status}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.percentCircle}>
                                <Text style={styles.percentText}>{dossier.progress}%</Text>
                            </View>
                        </View>

                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${dossier.progress}%` as any }]} />
                        </View>

                        {/* Steps */}
                        <View style={styles.stepsRow}>
                            {STEPS.map((step, i) => {
                                const active = dossier.progress >= step.threshold
                                const current = i < STEPS.length - 1
                                    ? dossier.progress >= step.threshold && dossier.progress < STEPS[i + 1].threshold
                                    : dossier.progress >= step.threshold
                                return (
                                    <View key={i} style={styles.step}>
                                        <View style={[
                                            styles.stepDot,
                                            active && styles.stepDotActive,
                                            current && styles.stepDotCurrent,
                                        ]}>
                                            {active && <Ionicons name="checkmark" size={8} color="#FFF" />}
                                        </View>
                                        <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                                            {step.label}
                                        </Text>
                                    </View>
                                )
                            })}
                        </View>
                    </View>

                    {/* ── Documents ── */}
                    <View style={styles.sectionHeader}>
                        <Ionicons name="document-text-outline" size={18} color={colors.gold} />
                        <Text style={styles.sectionTitle}>
                            Documents ({dossier.documents.length})
                        </Text>
                        <TouchableOpacity
                            style={styles.addDocBtn}
                            onPress={() => setShowUploadModal(true)}
                            disabled={uploading}
                        >
                            {uploading
                                ? <ActivityIndicator color={colors.gold} size="small" />
                                : <Ionicons name="add-circle-outline" size={22} color={colors.gold} />
                            }
                        </TouchableOpacity>
                    </View>

                    {uploading && (
                        <View style={styles.uploadingBanner}>
                            <ActivityIndicator color={colors.gold} size="small" />
                            <Text style={styles.uploadingText}>Envoi en cours…</Text>
                        </View>
                    )}

                    {dossier.documents.length > 0 ? dossier.documents.map((doc) => {
                        const st = docStatusInfo(doc.status)
                        return (
                            <View key={doc.id} style={styles.docCard}>
                                <View style={[styles.docIconWrap, { backgroundColor: colors.gold + '12' }]}>
                                    <Ionicons name={fileIconName(doc.file_type)} size={20} color={colors.gold} />
                                </View>
                                <View style={styles.docInfo}>
                                    <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                                    <Text style={styles.docDate}>
                                        {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                        })}
                                    </Text>
                                </View>
                                <View style={[styles.docStatusBadge, { backgroundColor: st.color + '12' }]}>
                                    <Ionicons name={st.icon} size={14} color={st.color} />
                                    <Text style={[styles.docStatusLabel, { color: st.color }]}>{st.label}</Text>
                                </View>
                            </View>
                        )
                    }) : (
                        <View style={styles.noDocsCard}>
                            <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
                            <Text style={styles.noDocsTitle}>Aucun document envoyé</Text>
                            <Text style={styles.noDocsText}>
                                Ajoutez vos documents pour faire avancer votre dossier.
                            </Text>
                            <TouchableOpacity
                                style={styles.uploadNowBtn}
                                onPress={() => setShowUploadModal(true)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="add" size={16} color="#FFF" />
                                <Text style={styles.uploadNowText}>Ajouter un document</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            )}

            <View style={{ height: 100 }} />

            {/* ── Modal choix source ── */}
            <Modal
                visible={showUploadModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowUploadModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowUploadModal(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Ajouter un document</Text>
                        <Text style={styles.modalSub}>PDF, Word, image — Max {MAX_SIZE_MB} Mo</Text>

                        <TouchableOpacity style={styles.modalOption} onPress={handlePickDocument} activeOpacity={0.7}>
                            <View style={[styles.modalOptionIcon, { backgroundColor: colors.info + '15' }]}>
                                <Ionicons name="document-text-outline" size={22} color={colors.info} />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionLabel}>Choisir un fichier</Text>
                                <Text style={styles.modalOptionSub}>PDF, Word, image depuis vos fichiers</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={handlePickImage} activeOpacity={0.7}>
                            <View style={[styles.modalOptionIcon, { backgroundColor: '#7C5CCA15' }]}>
                                <Ionicons name="image-outline" size={22} color="#7C5CCA" />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionLabel}>Photo depuis la galerie</Text>
                                <Text style={styles.modalOptionSub}>Sélectionner une image existante</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalOption} onPress={handleScanDocument} activeOpacity={0.7}>
                            <View style={[styles.modalOptionIcon, { backgroundColor: colors.gold + '15' }]}>
                                <Ionicons name="camera-outline" size={22} color={colors.gold} />
                            </View>
                            <View style={styles.modalOptionText}>
                                <Text style={styles.modalOptionLabel}>Scanner un document</Text>
                                <Text style={styles.modalOptionSub}>Prendre une photo avec la caméra</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowUploadModal(false)}>
                            <Text style={styles.modalCancelText}>Annuler</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.headerBg,
        paddingTop: Platform.OS === 'ios' ? 56 : 44,
        paddingBottom: 24, paddingHorizontal: spacing.lg,
        borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    },
    goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.gold },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { ...typography.h1, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.gold + 'AA', marginTop: 4 },
    uploadHeaderBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.gold + '25', borderRadius: radius.md,
        paddingHorizontal: 14, paddingVertical: 8,
        borderWidth: 1, borderColor: colors.gold + '40',
    },
    uploadHeaderBtnText: { ...typography.caption, color: '#FFF', fontFamily: 'Inter_600SemiBold' },

    centerState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 12 },
    loadingText: { ...typography.bodySmall, color: colors.textSecondary },

    emptyCard: {
        margin: spacing.lg, backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center',
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.md,
    },
    emptyIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.goldMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.gold, borderRadius: radius.md,
        paddingHorizontal: 24, paddingVertical: 14, ...shadows.gold,
    },
    emptyBtnText: { ...typography.button, color: '#FFF' },

    progressCard: {
        margin: spacing.lg, backgroundColor: colors.surface,
        borderRadius: radius.lg, padding: spacing.lg,
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    progressService: { ...typography.h3, color: colors.textPrimary },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    progressStatus: { ...typography.caption, color: colors.textSecondary },
    percentCircle: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.goldMuted, borderWidth: 2, borderColor: colors.gold + '40',
        alignItems: 'center', justifyContent: 'center',
    },
    percentText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.gold },
    progressBg: { height: 8, backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
    progressFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 4 },

    stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', flex: 1 },
    stepDot: {
        width: 18, height: 18, borderRadius: 9,
        backgroundColor: colors.borderLight, marginBottom: 6,
        alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: colors.gold },
    stepDotCurrent: { borderWidth: 2, borderColor: colors.goldLight, backgroundColor: colors.gold },
    stepLabel: { ...typography.caption, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
    stepLabelActive: { color: colors.gold, fontFamily: 'Inter_700Bold' },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm,
    },
    sectionTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary, flex: 1 },
    addDocBtn: { padding: 4 },

    uploadingBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: spacing.lg, marginBottom: spacing.sm,
        backgroundColor: colors.gold + '12', borderRadius: radius.md,
        padding: spacing.md, borderWidth: 1, borderColor: colors.gold + '25',
    },
    uploadingText: { ...typography.bodySmall, color: colors.gold },

    docCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: spacing.lg, marginBottom: 8,
        backgroundColor: colors.surface, borderRadius: radius.md,
        padding: 14, borderWidth: 1, borderColor: colors.borderLight, ...shadows.xs,
    },
    docIconWrap: {
        width: 40, height: 40, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    docInfo: { flex: 1 },
    docName: { ...typography.label, color: colors.textPrimary },
    docDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    docStatusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
    },
    docStatusLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

    noDocsCard: {
        marginHorizontal: spacing.lg, backgroundColor: colors.surfaceWarm,
        borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center',
        borderWidth: 1, borderColor: colors.borderLight, gap: 8,
    },
    noDocsTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },
    noDocsText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    uploadNowBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.gold, borderRadius: radius.md,
        paddingHorizontal: 20, paddingVertical: 12, marginTop: 8, ...shadows.gold,
    },
    uploadNowText: { ...typography.button, color: '#FFF', fontSize: 14 },

    /* Modal */
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
    },
    modalHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20,
    },
    modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
    modalSub: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
    modalOption: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    modalOptionIcon: {
        width: 44, height: 44, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    modalOptionText: { flex: 1 },
    modalOptionLabel: { ...typography.label, color: colors.textPrimary },
    modalOptionSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    modalCancel: {
        marginTop: spacing.md, paddingVertical: 14, alignItems: 'center',
        backgroundColor: colors.surfaceElevated, borderRadius: radius.md,
    },
    modalCancelText: { ...typography.button, color: colors.textSecondary },
})
