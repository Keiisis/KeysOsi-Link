import React, { useState, useEffect, useCallback } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Image, Alert, Platform, ActivityIndicator,
} from 'react-native'
import { Calendar, Camera, ChevronRight, CreditCard, FolderOpen, LogOut, MapPin, Pencil, ShieldCheck } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { decode } from 'base64-arraybuffer'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography, fonts, royal, motion } from '../../config/theme'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/AppNavigator'
import ScreenHeader from '../../components/ScreenHeader'
import { useLang } from '../../contexts/LangContext'
import LanguagePicker from '../../components/LanguagePicker'
import { Modal } from 'react-native'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated'

type Nav = NativeStackNavigationProp<RootStackParamList>

/* ═══════════════════════════════════════════════════════════
   Profil Screen — Menu complet + upload photo
═══════════════════════════════════════════════════════════ */

export default function ProfilScreen() {
    const { profile, signOut, updateProfile, refreshProfile } = useAuth()
    const navigation = useNavigation<Nav>()
    const { langConfig, t } = useLang()
    const [langPickerVisible, setLangPickerVisible] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [showAvatarGallery, setShowAvatarGallery] = useState(false)
    const [stats, setStats] = useState({ dossiers: 0, appointments: 0, payments: 0 })

    /* ── Avatars animés prédéfinis par genre ── */
    const AVATAR_PRESETS = {
        homme: [
            { key: 'h1', label: 'Guerrier Shōnen', emoji: '🦸🏾‍♂️', color: '#E74C3C', bg: '#FDEDEC' },
            { key: 'h2', label: 'Business King', emoji: '👑', color: '#F39C12', bg: '#FEF9E7' },
            { key: 'h3', label: 'Tech Genius', emoji: '💻', color: '#3498DB', bg: '#EBF5FB' },
            { key: 'h4', label: 'Artiste Cool', emoji: '🎨', color: '#9B59B6', bg: '#F5EEF8' },
            { key: 'h5', label: 'Champion', emoji: '🏆', color: '#27AE60', bg: '#EAFAF1' },
            { key: 'h6', label: 'Voyageur', emoji: '✈️', color: '#1ABC9C', bg: '#E8F8F5' },
        ],
        femme: [
            { key: 'f1', label: 'Reine Afro', emoji: '👸🏾', color: '#E74C3C', bg: '#FDEDEC' },
            { key: 'f2', label: 'Business Queen', emoji: '💎', color: '#F39C12', bg: '#FEF9E7' },
            { key: 'f3', label: 'Créatrice', emoji: '🌟', color: '#E91E63', bg: '#FCE4EC' },
            { key: 'f4', label: 'Fashionista', emoji: '👗', color: '#9B59B6', bg: '#F5EEF8' },
            { key: 'f5', label: 'Scientifique', emoji: '🔬', color: '#3498DB', bg: '#EBF5FB' },
            { key: 'f6', label: 'Aventurière', emoji: '🌍', color: '#27AE60', bg: '#EAFAF1' },
        ],
        neutre: [
            { key: 'n1', label: 'Phoenix', emoji: '🔥', color: '#E74C3C', bg: '#FDEDEC' },
            { key: 'n2', label: 'Étoile', emoji: '⭐', color: '#F39C12', bg: '#FEF9E7' },
            { key: 'n3', label: 'Ninja', emoji: '🥷', color: '#2C3E50', bg: '#EBEDEF' },
            { key: 'n4', label: 'Astronaute', emoji: '🚀', color: '#3498DB', bg: '#EBF5FB' },
            { key: 'n5', label: 'Lion', emoji: '🦁', color: '#E67E22', bg: '#FDF2E9' },
            { key: 'n6', label: 'Diamant', emoji: '💠', color: '#1ABC9C', bg: '#E8F8F5' },
        ],
    }

    useEffect(() => {
        if (!profile) return
        Promise.all([
            supabase.from('dossiers').select('*', { count: 'exact', head: true }).eq('client_id', profile.id),
            supabase.from('appointments').select('*', { count: 'exact', head: true })
                .eq('client_id', profile.id).neq('status', 'cancelled'),
            supabase.from('paiements').select('*', { count: 'exact', head: true })
                .eq('client_id', profile.id).eq('status', 'success'),
        ]).then(([d, a, p]) => {
            setStats({ dossiers: d.count || 0, appointments: a.count || 0, payments: p.count || 0 })
        }).catch(() => {})
    }, [profile])

    const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')).toUpperCase() || 'CL'

    /* ── Upload photo de profil ── */
    const handlePickAvatar = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert(
                t('Permission requise'),
                t('Veuillez autoriser l\'accès à votre galerie dans les paramètres de l\'application.'),
            )
            return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        })

        if (result.canceled || !result.assets[0]) return

        const asset = result.assets[0]
        const userId = profile?.id
        if (!userId) return

        setUploadingAvatar(true)
        try {
            // Lire le fichier en base64 (méthode fiable sur RN)
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            })

            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg'
            const fileName = `avatar_${userId}_${Date.now()}.${ext}`
            const filePath = `${userId}/${fileName}`

            // Upload dans le bucket Supabase "avatars"
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), {
                    contentType: asset.mimeType || `image/${ext}`,
                    upsert: true,
                })

            if (uploadError) throw uploadError

            // Obtenir URL publique
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Mettre à jour le profil + reset avatar_type
            await supabase.from('client_profiles').update({
                avatar_url: publicUrl, avatar_type: 'photo', avatar_preset: null,
            }).eq('id', userId)
            await refreshProfile()

            Alert.alert(t('Photo mise à jour'), t('Votre photo de profil a été modifiée avec succès.'))
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('Erreur lors du téléchargement')
            Alert.alert(t('Erreur'), msg)
        } finally {
            setUploadingAvatar(false)
        }
    }

    /* ── Actions prendre une photo ── */
    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert(t('Permission requise'), t('Accès à la caméra refusé.'))
            return
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        })

        if (result.canceled || !result.assets[0]) return

        const asset = result.assets[0]
        const userId = profile?.id
        if (!userId) return

        setUploadingAvatar(true)
        try {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            })
            const fileName = `avatar_${userId}_${Date.now()}.jpg`
            const filePath = `${userId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, decode(base64), { contentType: 'image/jpeg', upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            await supabase.from('client_profiles').update({
                avatar_url: publicUrl, avatar_type: 'photo', avatar_preset: null,
            }).eq('id', userId)
            await refreshProfile()

            Alert.alert(t('Photo mise à jour'), t('Photo de profil modifiée avec succès.'))
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('Erreur lors du téléchargement')
            Alert.alert(t('Erreur'), msg)
        } finally {
            setUploadingAvatar(false)
        }
    }

    /* ── Sélection avatar prédéfini ── */
    const handleSelectPresetAvatar = async (preset: { key: string; emoji: string; label: string }) => {
        if (!profile?.id) return
        setUploadingAvatar(true)
        setShowAvatarGallery(false)
        try {
            const { error } = await supabase
                .from('client_profiles')
                .update({
                    avatar_type: 'preset',
                    avatar_preset: preset.key,
                    avatar_url: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id)
            if (error) throw error
            await refreshProfile()
            Alert.alert(t('Avatar mis à jour'), `${preset.emoji} ${preset.label}`)
        } catch (e: unknown) {
            Alert.alert(t('Erreur'), e instanceof Error ? e.message : t('Erreur'))
        } finally {
            setUploadingAvatar(false)
        }
    }

    const showAvatarOptions = () => {
        Alert.alert(t('Photo de profil'), t('Choisissez une option'), [
            { text: t('🎭 Choisir un avatar'), onPress: () => setShowAvatarGallery(true) },
            { text: t('📷 Prendre une photo'), onPress: handleTakePhoto },
            { text: t('🖼️ Choisir dans la galerie'), onPress: handlePickAvatar },
            { text: t('Annuler'), style: 'cancel' },
        ])
    }

    const handleLogout = () => {
        Alert.alert(t('Déconnexion'), t('Êtes-vous sûr de vouloir vous déconnecter ?'), [
            { text: t('Annuler'), style: 'cancel' },
            { text: t('Se déconnecter'), style: 'destructive', onPress: signOut },
        ])
    }

    const menuSections = [
        {
            title: t('Compte'),
            items: [
                {
                    icon: 'person-outline' as const,
                    label: t('Informations personnelles'),
                    sub: t('Modifier votre profil'),
                    color: colors.primary,
                    onPress: () => navigation.navigate('EditProfil'),
                },
                {
                    icon: 'card-outline' as const,
                    label: t('Paiements'),
                    sub: t('Historique et méthodes'),
                    color: colors.success,
                    onPress: () => navigation.navigate('Payments'),
                },
                {
                    icon: 'receipt-outline' as const,
                    label: t('Mes factures'),
                    sub: t('Historique facturation'),
                    color: colors.gold,
                    onPress: () => navigation.navigate('Invoices'),
                },
                {
                    icon: 'cube-outline' as const,
                    label: t('Mes commandes'),
                    sub: t('Suivi de vos colis'),
                    color: colors.info,
                    onPress: () => navigation.navigate('Orders'),
                },
                {
                    icon: 'calendar-outline' as const,
                    label: t('Mes rendez-vous'),
                    sub: t('Prochains RDV'),
                    color: colors.warning,
                    onPress: () => navigation.navigate('Appointments'),
                },
                {
                    icon: 'create-outline' as const,
                    label: t('Ma signature'),
                    sub: t('Signer factures et devis'),
                    color: '#7C5CCA',
                    onPress: () => navigation.navigate('Signature'),
                },
            ],
        },
        {
            title: t('Préférences'),
            items: [
                {
                    icon: 'language-outline' as const,
                    label: t('Langue de l\'application'),
                    sub: `${langConfig.flag}  ${langConfig.nativeLabel}`,
                    color: colors.primary,
                    onPress: () => setLangPickerVisible(true),
                },
                {
                    icon: 'notifications-outline' as const,
                    label: t('Notifications'),
                    sub: t('Gérer les alertes'),
                    color: '#E07B54',
                    onPress: () => navigation.navigate('Notifications'),
                },
                {
                    icon: 'shield-checkmark-outline' as const,
                    label: t('Sécurité & Mot de passe'),
                    sub: t('Modifier le mot de passe'),
                    color: '#7C5CCA',
                    onPress: () => navigation.navigate('Security'),
                },
            ],
        },
        {
            title: t('Support'),
            items: [
                {
                    icon: 'help-circle-outline' as const,
                    label: t('Aide & FAQ'),
                    sub: t('Questions fréquentes'),
                    color: colors.info,
                    onPress: () => navigation.navigate('FAQ'),
                },
                {
                    icon: 'information-circle-outline' as const,
                    label: t('À propos'),
                    sub: t('Version et mentions légales'),
                    color: colors.textMuted,
                    onPress: () => navigation.navigate('About'),
                },
                {
                    icon: 'document-text-outline' as const,
                    label: t('CGU & Confidentialité'),
                    sub: t('Conditions et politique de données'),
                    color: '#6B7280',
                    onPress: () => navigation.navigate('Legal'),
                },
            ],
        },
    ]

    return (
        <LinearGradient colors={[colors.background, colors.surfaceWarm]} style={styles.container}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <ScreenHeader
                title={t('Mon Profil')}
                subtitle={t('Gérez vos informations et préférences')}
            />

            {/* Profile Info Card */}
            <View style={styles.profileCard}>
                <View style={styles.primaryLine} />

                {/* Avatar */}
                <TouchableOpacity
                    style={styles.avatarOuter}
                    activeOpacity={0.8}
                    onPress={showAvatarOptions}
                    disabled={uploadingAvatar}
                >
                    {uploadingAvatar ? (
                        <View style={[styles.avatarPlaceholder, { justifyContent: 'center' }]}>
                            <ActivityIndicator color={colors.primary} />
                        </View>
                    ) : profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (() => {
                        // Check for preset avatar
                        const presetKey = profile?.avatar_preset
                        if (presetKey && profile?.avatar_type === 'preset') {
                            const allPresets = [...AVATAR_PRESETS.homme, ...AVATAR_PRESETS.femme, ...AVATAR_PRESETS.neutre]
                            const found = allPresets.find(p => p.key === presetKey)
                            if (found) {
                                return (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: found.bg, borderColor: found.color + '70' }]}>
                                        <Text style={{ fontSize: 40 }}>{found.emoji}</Text>
                                    </View>
                                )
                            }
                        }
                        return (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>{initials}</Text>
                            </View>
                        )
                    })()}
                    <View style={styles.cameraBadge}>
                        <Camera size={13} color="#FFF" strokeWidth={1.75} />
                    </View>
                </TouchableOpacity>

                <Text style={styles.userName}>{profile?.prenom} {profile?.nom}</Text>
                <Text style={styles.userEmail}>{profile?.email}</Text>

                {/* Badges info */}
                <View style={styles.badgesRow}>
                    <View style={styles.roleBadge}>
                        <ShieldCheck size={12} color={colors.primary} strokeWidth={1.75} />
                        <Text style={styles.roleText}>{t('Client vérifié')}</Text>
                    </View>
                    {profile?.ville ? (
                        <View style={styles.villeBadge}>
                            <MapPin size={12} color={colors.primary + 'AA'} strokeWidth={1.75} />
                            <Text style={styles.villeText}>{profile.ville}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Edit profil shortcut */}
                <TouchableOpacity
                    style={styles.editShortcut}
                    onPress={() => navigation.navigate('EditProfil')}
                    activeOpacity={0.7}
                >
                    <Pencil size={14} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.editShortcutText}>{t('Modifier le profil')}</Text>
                </TouchableOpacity>
            </View>

            {/* Stats rapides */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <FolderOpen size={22} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.statValue}>{stats.dossiers}</Text>
                    <Text style={styles.statLabel}>{t('Dossiers')}</Text>
                </View>
                <View style={[styles.statCard, styles.statCardMiddle]}>
                    <Ionicons name="calendar" size={22} color='#7C5CCA' />
                    <Text style={styles.statValue}>{stats.appointments}</Text>
                    <Text style={styles.statLabel}>RDV</Text>
                </View>
                <View style={styles.statCard}>
                    <CreditCard size={22} color={colors.success} strokeWidth={1.75} />
                    <Text style={styles.statValue}>{stats.payments}</Text>
                    <Text style={styles.statLabel}>{t('Paiements')}</Text>
                </View>
            </View>

            {/* Menu Sections */}
            {menuSections.map((section, si) => (
                <View key={si}>
                    <Text style={styles.sectionLabel}>{t(section.title)}</Text>
                    <View style={styles.menuCard}>
                        {section.items.map((item, ii) => (
                            <TouchableOpacity
                                key={ii}
                                style={[styles.menuItem, ii < section.items.length - 1 && styles.menuItemBorder]}
                                activeOpacity={0.6}
                                onPress={item.onPress}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon} size={18} color={item.color} />
                                </View>
                                <View style={styles.menuTextWrap}>
                                    <Text style={styles.menuLabel}>{t(item.label)}</Text>
                                    <Text style={styles.menuSub}>{t(item.sub)}</Text>
                                </View>
                                <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.75} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}

            {/* Déconnexion */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                <LogOut size={18} color={colors.danger} strokeWidth={1.75} />
                <Text style={styles.logoutText}>{t('Se déconnecter')}</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Retour Gagnant Bénin — v1.0.0</Text>
            <View style={{ height: 100 }} />
        </ScrollView>

        <LanguagePicker visible={langPickerVisible} onClose={() => setLangPickerVisible(false)} />

        {/* ── Avatar Gallery Modal ── */}
        <Modal visible={showAvatarGallery} transparent animationType="slide" onRequestClose={() => setShowAvatarGallery(false)}>
            <TouchableOpacity style={galStyles.overlay} activeOpacity={1} onPress={() => setShowAvatarGallery(false)}>
                <View style={galStyles.sheet}>
                    <View style={galStyles.handle} />
                    <Text style={galStyles.title}>{t('Choisir un avatar')}</Text>
                    <Text style={galStyles.subtitle}>{t('Sélectionnez un personnage qui vous représente')}</Text>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                        {(['homme', 'femme', 'neutre'] as const).map((genre) => (
                            <View key={genre} style={galStyles.genreSection}>
                                <Text style={galStyles.genreLabel}>
                                    {genre === 'homme' ? '👨🏾 ' + t('Homme') : genre === 'femme' ? '👩🏾 ' + t('Femme') : '🌈 ' + t('Neutre')}
                                </Text>
                                <View style={galStyles.grid}>
                                    {AVATAR_PRESETS[genre].map((av) => (
                                        <TouchableOpacity
                                            key={av.key}
                                            style={[galStyles.avatarCard, { borderColor: av.color + '40' }]}
                                            onPress={() => handleSelectPresetAvatar(av)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[galStyles.avatarCircle, { backgroundColor: av.bg, borderColor: av.color + '50' }]}>
                                                <Text style={galStyles.avatarEmoji}>{av.emoji}</Text>
                                            </View>
                                            <Text style={[galStyles.avatarName, { color: av.color }]} numberOfLines={1}>{av.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={galStyles.cancelBtn} onPress={() => setShowAvatarGallery(false)}>
                        <Text style={galStyles.cancelText}>{t('Annuler')}</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    profileCard: {
        alignItems: 'center',
        paddingTop: spacing.lg, paddingBottom: 28,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderColor: colors.borderLight,
        marginBottom: spacing.lg,
    },
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },

    avatarOuter: { position: 'relative', marginBottom: 14 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary },
    avatarPlaceholder: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: colors.primary + '20', borderWidth: 3, borderColor: colors.primary + '50',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 28, fontFamily: fonts.bodyBold, color: colors.primaryLight },
    cameraBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.surface,
    },

    userName: { ...typography.h2, color: colors.textPrimary },
    userEmail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 },

    badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.primary + '15', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    roleText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.primary, letterSpacing: 0.5 },
    villeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.surfaceElevated, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    villeText: { fontSize: 11, fontFamily: fonts.bodyMedium, color: colors.textSecondary },

    editShortcut: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        marginTop: 14,
        borderWidth: 1, borderColor: colors.primary + '30',
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20,
    },
    editShortcutText: { fontSize: 12, fontFamily: fonts.bodySemibold, color: colors.primary },

    statsRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.lg, marginTop: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight,
        ...shadows.sm,
    },
    statCard: {
        flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4,
    },
    statCardMiddle: {
        borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.borderLight,
    },
    statValue: { ...typography.h3, color: colors.textPrimary },
    statLabel: { ...typography.caption, color: colors.textMuted },

    sectionLabel: {
        ...typography.overline, fontSize: 10, color: colors.textMuted,
        marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 8,
    },
    menuCard: {
        marginHorizontal: spacing.lg, backgroundColor: colors.surface,
        borderRadius: radius.lg, overflow: 'hidden',
        borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 13,
    },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    menuIcon: {
        width: 38, height: 38, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    menuTextWrap: { flex: 1 },
    menuLabel: { ...typography.bodySmall, fontFamily: fonts.bodySemibold, color: colors.textPrimary },
    menuSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: spacing.lg, marginTop: spacing.lg,
        backgroundColor: colors.dangerBg, borderRadius: radius.md,
        paddingVertical: 14, borderWidth: 1, borderColor: colors.danger + '20',
    },
    logoutText: { ...typography.label, color: colors.danger },

    version: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
})

const galStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
    title: { ...typography.h3, color: colors.textPrimary, marginBottom: 4 },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
    genreSection: { marginBottom: spacing.md },
    genreLabel: { ...typography.label, color: colors.textPrimary, fontSize: 14, marginBottom: 10, letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    avatarCard: {
        width: '30%' as any, alignItems: 'center', padding: 10,
        borderRadius: radius.md, borderWidth: 1.5,
        backgroundColor: colors.surfaceElevated,
    },
    avatarCircle: {
        width: 56, height: 56, borderRadius: 28,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, marginBottom: 6,
    },
    avatarEmoji: { fontSize: 28 },
    avatarName: { fontSize: 10, fontFamily: 'Inter_700Bold', textAlign: 'center' },
    cancelBtn: {
        marginTop: spacing.md, paddingVertical: 14,
        alignItems: 'center', backgroundColor: colors.surfaceElevated,
        borderRadius: radius.md,
    },
    cancelText: { ...typography.button, color: colors.textSecondary },
})
