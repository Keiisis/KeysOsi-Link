import React, { useState, useEffect } from 'react'
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity,
    Image, Alert, Platform, ActivityIndicator,
} from 'react-native'
import { Calendar, Camera, ChevronRight, CreditCard, FolderOpen, LogOut, MapPin, Pencil, ShieldCheck } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import { colors, spacing, radius, shadows, typography } from '../../config/theme'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/AppNavigator'
import { useLang } from '../../contexts/LangContext'
import LanguagePicker from '../../components/LanguagePicker'

type Nav = NativeStackNavigationProp<RootStackParamList>

/* ═══════════════════════════════════════════════════════════
   Profil Screen — Menu complet + upload photo
═══════════════════════════════════════════════════════════ */

export default function ProfilScreen() {
    const { profile, signOut, updateProfile } = useAuth()
    const navigation = useNavigation<Nav>()
    const { langConfig, t } = useLang()
    const [langPickerVisible, setLangPickerVisible] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [stats, setStats] = useState({ dossiers: 0, appointments: 0, payments: 0 })

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
                'Permission requise',
                'Veuillez autoriser l\'accès à votre galerie dans les paramètres de l\'application.',
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
            // Lire le fichier en base64
            const response = await fetch(asset.uri)
            const blob = await response.blob()

            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg'
            const fileName = `avatar_${userId}_${Date.now()}.${ext}`
            const filePath = `${userId}/${fileName}`

            // Upload dans le bucket Supabase "avatars"
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, {
                    contentType: asset.mimeType || `image/${ext}`,
                    upsert: true,
                })

            if (uploadError) throw uploadError

            // Obtenir URL publique
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Mettre à jour le profil
            const { error: updateError } = await updateProfile({ avatar_url: publicUrl })
            if (updateError) throw updateError

            Alert.alert('Photo mise à jour', 'Votre photo de profil a été modifiée avec succès.')
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur lors du téléchargement'
            Alert.alert('Erreur', msg)
        } finally {
            setUploadingAvatar(false)
        }
    }

    /* ── Actions prendre une photo ── */
    const handleTakePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync()
        if (status !== 'granted') {
            Alert.alert('Permission requise', 'Accès à la caméra refusé.')
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
            const response = await fetch(asset.uri)
            const blob = await response.blob()
            const fileName = `avatar_${userId}_${Date.now()}.jpg`
            const filePath = `${userId}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
            const { error: updateError } = await updateProfile({ avatar_url: publicUrl })
            if (updateError) throw updateError

            Alert.alert('Photo mise à jour', 'Photo de profil modifiée avec succès.')
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Erreur lors du téléchargement'
            Alert.alert('Erreur', msg)
        } finally {
            setUploadingAvatar(false)
        }
    }

    const showAvatarOptions = () => {
        Alert.alert('Photo de profil', 'Choisissez une source', [
            { text: 'Prendre une photo', onPress: handleTakePhoto },
            { text: 'Choisir dans la galerie', onPress: handlePickAvatar },
            { text: 'Annuler', style: 'cancel' },
        ])
    }

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
        ])
    }

    const menuSections = [
        {
            title: 'Compte',
            items: [
                {
                    icon: 'person-outline' as const,
                    label: 'Informations personnelles',
                    sub: 'Modifier votre profil',
                    color: colors.primary,
                    onPress: () => navigation.navigate('EditProfil'),
                },
                {
                    icon: 'card-outline' as const,
                    label: 'Paiements & Facturation',
                    sub: 'Historique et méthodes',
                    color: colors.success,
                    onPress: () => navigation.navigate('Payments'),
                },
                {
                    icon: 'calendar-outline' as const,
                    label: 'Mes rendez-vous',
                    sub: 'Prochains RDV',
                    color: colors.warning,
                    onPress: () => navigation.navigate('Appointments'),
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
            title: 'Support',
            items: [
                {
                    icon: 'help-circle-outline' as const,
                    label: 'Aide & FAQ',
                    sub: 'Questions fréquentes',
                    color: colors.info,
                    onPress: () => navigation.navigate('FAQ'),
                },
                {
                    icon: 'information-circle-outline' as const,
                    label: 'À propos',
                    sub: 'Version et mentions légales',
                    color: colors.textMuted,
                    onPress: () => navigation.navigate('About'),
                },
            ],
        },
    ]

    return (
        <>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
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
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>{initials}</Text>
                        </View>
                    )}
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
                        <Text style={styles.roleText}>Client vérifié</Text>
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
                    <Text style={styles.editShortcutText}>Modifier le profil</Text>
                </TouchableOpacity>
            </View>

            {/* Stats rapides */}
            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <FolderOpen size={22} color={colors.primary} strokeWidth={1.75} />
                    <Text style={styles.statValue}>{stats.dossiers}</Text>
                    <Text style={styles.statLabel}>Dossiers</Text>
                </View>
                <View style={[styles.statCard, styles.statCardMiddle]}>
                    <Ionicons name="calendar" size={22} color='#7C5CCA' />
                    <Text style={styles.statValue}>{stats.appointments}</Text>
                    <Text style={styles.statLabel}>RDV</Text>
                </View>
                <View style={styles.statCard}>
                    <CreditCard size={22} color={colors.success} strokeWidth={1.75} />
                    <Text style={styles.statValue}>{stats.payments}</Text>
                    <Text style={styles.statLabel}>Paiements</Text>
                </View>
            </View>

            {/* Menu Sections */}
            {menuSections.map((section, si) => (
                <View key={si}>
                    <Text style={styles.sectionLabel}>{section.title}</Text>
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
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSub}>{item.sub}</Text>
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
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>

            <Text style={styles.version}>Retour Gagnant Bénin — v1.0.0</Text>
            <View style={{ height: 100 }} />
        </ScrollView>

        <LanguagePicker visible={langPickerVisible} onClose={() => setLangPickerVisible(false)} />
        </>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    header: {
        backgroundColor: colors.headerBg, alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 56 : 44, paddingBottom: 28,
        borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    },
    primaryLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colors.primary },

    avatarOuter: { position: 'relative', marginBottom: 14 },
    avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary },
    avatarPlaceholder: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: colors.primary + '20', borderWidth: 3, borderColor: colors.primary + '50',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.primaryLight },
    cameraBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: colors.headerBg,
    },

    userName: { ...typography.h2, color: colors.textOnDark },
    userEmail: { ...typography.bodySmall, color: colors.primary + 'AA', marginTop: 4 },

    badgesRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.primary + '15', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    roleText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: colors.primaryLight, letterSpacing: 0.5 },
    villeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    villeText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: colors.primary + 'CC' },

    editShortcut: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        marginTop: 14,
        borderWidth: 1, borderColor: colors.primary + '30',
        paddingHorizontal: 16, paddingVertical: 7,
        borderRadius: 20,
    },
    editShortcutText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary },

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
    menuLabel: { ...typography.bodySmall, fontFamily: 'Inter_600SemiBold', color: colors.textPrimary },
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
