'use strict'
import React, { useEffect, useState, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    RefreshControl, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native'
import { Check, ChevronRight, FileText, FolderOpen, Info, Plus, PlusCircle, Upload } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../contexts/AuthContext'
import { useLang } from '../../contexts/LangContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://www.retourgagnantbenin.bj'
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE_MB = 10

interface DossierDoc { id: string; file_name: string; status: string; created_at: string; file_url?: string; file_type?: string }
interface Dossier { id: string; status: string; progress: number; service_type: string; notes?: string; created_at: string; documents: DossierDoc[] }

const STEPS = [
    { label: 'Soumis', key: 'soumis' },
    { label: 'Vérifié', key: 'verifie' },
    { label: 'Traitement', key: 'traitement' },
    { label: 'Validation', key: 'validation' },
    { label: 'Terminé', key: 'termine' },
]
const STATUS_ORDER = ['soumis', 'en_attente', 'verifie', 'en_cours', 'traitement', 'validation', 'termine']
const STATUS_LABEL: Record<string, string> = {
    soumis: 'Dossier soumis', en_attente: 'En attente de documents',
    verifie: 'En cours de vérification', en_cours: 'En cours de traitement',
    traitement: 'En traitement', validation: 'En validation', termine: 'Terminé', annule: 'Annulé',
}
const STATUS_COLOR: Record<string, string> = {
    soumis: colors.info, en_attente: colors.warning, verifie: '#7C5CCA',
    en_cours: colors.primary, traitement: colors.primary, validation: '#E07B54',
    termine: colors.success, annule: colors.danger,
}

export default function DossierScreen() {
    const { profile } = useAuth()
    const { t } = useLang()
    const [dossiers, setDossiers] = useState<Dossier[]>([])
    const [selected, setSelected] = useState<Dossier | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)

    const fetchDossiers = useCallback(async () => {
        if (!profile) { setLoading(false); return }
        try {
            const text = await fetch(`${API_BASE}/api/mobile/dossiers?client_id=${profile.id}`).then(r => r.text())
            let json: { dossiers?: Dossier[] } = {}
            try { json = JSON.parse(text) } catch { /* ignore */ }
            const list = json.dossiers || []
            setDossiers(list)
            if (list.length > 0 && !selected) setSelected(list[0])
            else if (selected) {
                const updated = list.find(d => d.id === selected.id)
                if (updated) setSelected(updated)
            }
        } catch { /* silent */ } finally { setLoading(false) }
    }, [profile])

    useEffect(() => { fetchDossiers() }, [fetchDossiers])
    const onRefresh = async () => { setRefreshing(true); await fetchDossiers(); setRefreshing(false) }

    const progressFromStatus = (status: string) => {
        const idx = STATUS_ORDER.indexOf(status)
        if (idx < 0) return 0
        return Math.round((idx / (STATUS_ORDER.length - 1)) * 100)
    }

    const uploadFile = async (uri: string, fileName: string, mimeType: string) => {
        if (!selected || !profile) return
        setUploading(true); setShowUploadModal(false)
        try {
            const response = await fetch(uri)
            const blob = await response.blob()
            const safeName = fileName.replace(/[^a-zA-Z0-9._\-\u00C0-\u017E]/g, '_')
            const filePath = `${profile.id}/${selected.id}/${Date.now()}_${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('dossier-documents')
                .upload(filePath, blob, { contentType: mimeType, upsert: false })
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('dossier-documents').getPublicUrl(filePath)

            // Essayer les deux tables
            const { error: dbErr } = await supabase.from('dossier_documents').insert({
                dossier_id: selected.id, client_id: profile.id,
                file_name: safeName, file_url: publicUrl, file_type: mimeType, status: 'pending',
            })
            if (dbErr) {
                await supabase.from('documents').insert({
                    dossier_id: selected.id, client_id: profile.id,
                    file_name: safeName, file_url: publicUrl, file_type: mimeType, status: 'pending',
                })
            }
            Alert.alert('Document envoyé', 'Notre équipe le vérifiera sous 24–48h.')
            await fetchDossiers()
        } catch (e: unknown) {
            Alert.alert('Erreur', e instanceof Error ? e.message : 'Erreur lors de l\'envoi')
        } finally { setUploading(false) }
    }

    const handlePickDocument = async () => {
        setShowUploadModal(false)
        const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_TYPES, copyToCacheDirectory: true })
        if (result.canceled || !result.assets?.[0]) return
        const asset = result.assets[0]
        if (asset.size && asset.size > MAX_SIZE_MB * 1024 * 1024) {
            Alert.alert('Fichier trop volumineux', `Maximum ${MAX_SIZE_MB} Mo.`); return
        }
        await uploadFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream')
    }
    const handlePickImage = async () => {
        setShowUploadModal(false)
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Permission refusée', 'Accès à la galerie requis.'); return }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
        if (result.canceled || !result.assets[0]) return
        const asset = result.assets[0]
        await uploadFile(asset.uri, `photo_${Date.now()}.jpg`, asset.mimeType || 'image/jpeg')
    }
    const handleScanDocument = async () => {
        setShowUploadModal(false)
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') { Alert.alert('Permission refusée', 'Accès caméra requis.'); return }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.85 })
        if (result.canceled || !result.assets[0]) return
        await uploadFile(result.assets[0].uri, `scan_${Date.now()}.jpg`, 'image/jpeg')
    }

    const docStatusInfo = (s: string) => {
        if (s === 'approved') return { icon: 'checkmark-circle' as const, color: colors.success, label: t('Validé') }
        if (s === 'rejected') return { icon: 'close-circle' as const, color: colors.danger, label: t('Refusé') }
        return { icon: 'time-outline' as const, color: colors.warning, label: t('En attente') }
    }
    const fileIcon = (type?: string): keyof typeof Ionicons.glyphMap => {
        if (!type) return 'document-outline'
        if (type.includes('pdf')) return 'document-text-outline'
        if (type.includes('image')) return 'image-outline'
        return 'document-outline'
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
            <View style={styles.header}>
                <View style={styles.primaryLine} />
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.headerTitle}>{t('Mes Dossiers')}</Text>
                        <Text style={styles.headerSub}>{dossiers.length} {t('dossier')}{dossiers.length !== 1 ? 's' : ''} {t('en cours')}</Text>
                    </View>
                    {selected && (
                        <TouchableOpacity style={styles.uploadHeaderBtn} onPress={() => setShowUploadModal(true)} disabled={uploading}>
                            {uploading ? <ActivityIndicator color="#FFF" size="small" /> : (
                                <><Upload size={16} color="#FFF" strokeWidth={1.75} /><Text style={styles.uploadHeaderBtnText}>{t('Ajouter')}</Text></>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={colors.primary} size="large" />
                    <Text style={styles.loadingText}>{t('Chargement…')}</Text>
                </View>
            ) : dossiers.length === 0 ? (
                <View style={styles.emptyCard}>
                    <View style={styles.emptyIconWrap}><FolderOpen size={44} color={colors.primary} strokeWidth={1.75} /></View>
                    <Text style={styles.emptyTitle}>{t('Aucun dossier en cours')}</Text>
                    <Text style={styles.emptyText}>{t('Commandez un service depuis l\'onglet Services pour créer votre premier dossier.')}</Text>
                </View>
            ) : (
                <>
                    {/* Sélecteur dossier si plusieurs */}
                    {dossiers.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
                            {dossiers.map((d) => (
                                <TouchableOpacity key={d.id} style={[styles.tab, selected?.id === d.id && styles.tabActive]} onPress={() => setSelected(d)}>
                                    <Text style={[styles.tabText, selected?.id === d.id && styles.tabTextActive]} numberOfLines={1}>{d.service_type}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}

                    {selected && (() => {
                        const progress = selected.progress > 0 ? selected.progress : progressFromStatus(selected.status)
                        const color = STATUS_COLOR[selected.status] || colors.primary
                        const stepIdx = STEPS.findIndex(s => s.key === selected.status)

                        return (
                            <>
                                {/* Carte progression */}
                                <View style={styles.progressCard}>
                                    <View style={styles.progressTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.progressService}>{selected.service_type}</Text>
                                            <View style={styles.statusRow}>
                                                <View style={[styles.statusDot, { backgroundColor: color }]} />
                                                <Text style={[styles.progressStatus, { color }]}>{STATUS_LABEL[selected.status] || selected.status}</Text>
                                            </View>
                                            <Text style={styles.progressDate}>
                                                Créé le {new Date(selected.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={[styles.percentCircle, { borderColor: color + '60' }]}>
                                            <Text style={[styles.percentText, { color }]}>{progress}%</Text>
                                        </View>
                                    </View>

                                    <View style={styles.progressBg}>
                                        <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: color }]} />
                                    </View>

                                    <View style={styles.stepsRow}>
                                        {STEPS.map((step, i) => {
                                            const active = stepIdx >= i
                                            const current = stepIdx === i
                                            return (
                                                <View key={i} style={styles.step}>
                                                    <View style={[styles.stepDot, active && { backgroundColor: color }, current && { borderWidth: 2, borderColor: color + '80' }]}>
                                                        {active && <Check size={8} color="#FFF" strokeWidth={1.75} />}
                                                    </View>
                                                    <Text style={[styles.stepLabel, active && { color, fontFamily: 'Inter_700Bold' }]}>{step.label}</Text>
                                                </View>
                                            )
                                        })}
                                    </View>

                                    {selected.notes ? (
                                        <View style={styles.notesRow}>
                                            <Info size={14} color={colors.textMuted} strokeWidth={1.75} />
                                            <Text style={styles.notesText}>{selected.notes}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* Documents */}
                                <View style={styles.sectionHeader}>
                                    <FileText size={18} color={colors.primary} strokeWidth={1.75} />
                                    <Text style={styles.sectionTitle}>{t('Documents')} ({selected.documents.length})</Text>
                                    <TouchableOpacity style={styles.addDocBtn} onPress={() => setShowUploadModal(true)} disabled={uploading}>
                                        {uploading ? <ActivityIndicator color={colors.primary} size="small" /> : <PlusCircle size={22} color={colors.primary} strokeWidth={1.75} />}
                                    </TouchableOpacity>
                                </View>

                                {uploading && (
                                    <View style={styles.uploadingBanner}>
                                        <ActivityIndicator color={colors.primary} size="small" />
                                        <Text style={styles.uploadingText}>{t('Envoi en cours…')}</Text>
                                    </View>
                                )}

                                {selected.documents.length > 0 ? selected.documents.map((doc) => {
                                    const st = docStatusInfo(doc.status)
                                    return (
                                        <View key={doc.id} style={styles.docCard}>
                                            <View style={[styles.docIconWrap, { backgroundColor: colors.primary + '12' }]}>
                                                <Ionicons name={fileIcon(doc.file_type)} size={20} color={colors.primary} />
                                            </View>
                                            <View style={styles.docInfo}>
                                                <Text style={styles.docName} numberOfLines={1}>{doc.file_name}</Text>
                                                <Text style={styles.docDate}>{new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                                            </View>
                                            <View style={[styles.docStatusBadge, { backgroundColor: st.color + '12' }]}>
                                                <Ionicons name={st.icon} size={14} color={st.color} />
                                                <Text style={[styles.docStatusLabel, { color: st.color }]}>{st.label}</Text>
                                            </View>
                                        </View>
                                    )
                                }) : (
                                    <View style={styles.noDocsCard}>
                                        <Upload size={32} color={colors.textMuted} strokeWidth={1.75} />
                                        <Text style={styles.noDocsTitle}>Aucun document envoyé</Text>
                                        <Text style={styles.noDocsText}>Ajoutez vos documents pour faire avancer votre dossier.</Text>
                                        <TouchableOpacity style={styles.uploadNowBtn} onPress={() => setShowUploadModal(true)}>
                                            <Plus size={16} color="#FFF" strokeWidth={1.75} />
                                            <Text style={styles.uploadNowText}>Ajouter un document</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )
                    })()}
                </>
            )}

            <View style={{ height: 100 }} />

            <Modal visible={showUploadModal} transparent animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUploadModal(false)}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Ajouter un document</Text>
                        <Text style={styles.modalSub}>PDF, Word, image — Max {MAX_SIZE_MB} Mo</Text>
                        {[
                            { icon: 'document-text-outline' as const, color: colors.info, label: 'Choisir un fichier', sub: 'PDF, Word, image depuis vos fichiers', action: handlePickDocument },
                            { icon: 'image-outline' as const, color: '#7C5CCA', label: 'Photo depuis la galerie', sub: 'Sélectionner une image existante', action: handlePickImage },
                            { icon: 'camera-outline' as const, color: colors.primary, label: 'Scanner un document', sub: 'Prendre une photo avec la caméra', action: handleScanDocument },
                        ].map((opt, i) => (
                            <TouchableOpacity key={i} style={styles.modalOption} onPress={opt.action} activeOpacity={0.7}>
                                <View style={[styles.modalOptionIcon, { backgroundColor: opt.color + '15' }]}>
                                    <Ionicons name={opt.icon} size={22} color={opt.color} />
                                </View>
                                <View style={styles.modalOptionText}>
                                    <Text style={styles.modalOptionLabel}>{opt.label}</Text>
                                    <Text style={styles.modalOptionSub}>{opt.sub}</Text>
                                </View>
                                <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
                            </TouchableOpacity>
                        ))}
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
    header: { backgroundColor: colors.headerBg, paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 24, paddingHorizontal: spacing.lg, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { ...typography.h1, color: colors.textOnDark },
    headerSub: { ...typography.bodySmall, color: colors.primary + 'AA', marginTop: 4 },
    uploadHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '25', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.primary + '40' },
    uploadHeaderBtnText: { ...typography.caption, color: '#FFF', fontFamily: 'Inter_600SemiBold' },
    centerState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: 12 },
    loadingText: { ...typography.bodySmall, color: colors.textSecondary },
    emptyCard: { margin: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight, ...shadows.md },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 8 },
    emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    tabsScroll: { marginTop: spacing.md },
    tabsContent: { paddingHorizontal: spacing.lg, gap: 8 },
    tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderLight, backgroundColor: colors.surface, maxWidth: 160 },
    tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    tabText: { ...typography.caption, color: colors.textSecondary },
    tabTextActive: { color: colors.primary, fontFamily: 'Inter_700Bold' },
    progressCard: { margin: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    progressService: { ...typography.h3, color: colors.textPrimary },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    progressStatus: { ...typography.caption, fontFamily: 'Inter_600SemiBold' },
    progressDate: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    percentCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryMuted, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    percentText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    progressBg: { height: 8, backgroundColor: colors.borderLight, borderRadius: 4, overflow: 'hidden', marginBottom: 20 },
    progressFill: { height: '100%', borderRadius: 4 },
    stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    step: { alignItems: 'center', flex: 1 },
    stepDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.borderLight, marginBottom: 6, alignItems: 'center', justifyContent: 'center' },
    stepLabel: { ...typography.caption, fontSize: 9, color: colors.textMuted, textAlign: 'center' },
    notesRow: { flexDirection: 'row', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight },
    notesText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm },
    sectionTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary, flex: 1 },
    addDocBtn: { padding: 4 },
    uploadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.primary + '12', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '25' },
    uploadingText: { ...typography.bodySmall, color: colors.primary },
    docCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.borderLight, ...shadows.xs },
    docIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    docInfo: { flex: 1 },
    docName: { ...typography.label, color: colors.textPrimary },
    docDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    docStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
    docStatusLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
    noDocsCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surfaceWarm, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.borderLight, gap: 8 },
    noDocsTitle: { ...typography.h3, fontSize: 16, color: colors.textPrimary },
    noDocsText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    uploadNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8, ...shadows.primary },
    uploadNowText: { ...typography.button, color: '#FFF', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
    modalSub: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
    modalOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    modalOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalOptionText: { flex: 1 },
    modalOptionLabel: { ...typography.label, color: colors.textPrimary },
    modalOptionSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    modalCancel: { marginTop: spacing.md, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: radius.md },
    modalCancelText: { ...typography.button, color: colors.textSecondary },
})
