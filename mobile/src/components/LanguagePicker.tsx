import React, { useRef, useEffect } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, Animated, Dimensions, Platform, Pressable,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useLang, SUPPORTED_LANGUAGES, type LangCode } from '../contexts/LangContext'
import { colors, spacing, radius, typography, shadows } from '../config/theme'

const { height: SCREEN_H } = Dimensions.get('window')
const SHEET_H = SCREEN_H * 0.62

interface LanguagePickerProps {
    visible: boolean
    onClose: () => void
}

export default function LanguagePicker({ visible, onClose }: LanguagePickerProps) {
    const { lang, setLang } = useLang()
    const slideAnim = useRef(new Animated.Value(SHEET_H)).current
    const fadeAnim  = useRef(new Animated.Value(0)).current

    // ── Open / close animation ──
    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1, duration: 240,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0, damping: 22, stiffness: 260,
                    useNativeDriver: true,
                }),
            ]).start()
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0, duration: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SHEET_H, duration: 200,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }, [visible, fadeAnim, slideAnim])

    const handleSelect = (code: LangCode) => {
        setLang(code)
        setTimeout(onClose, 140)
    }

    return (
        <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
            {/* Backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }, { opacity: fadeAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose}/>
            </Animated.View>

            {/* Bottom sheet */}
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                {/* Handle */}
                <View style={styles.handle}/>

                {/* Header */}
                <LinearGradient colors={[colors.navy, '#2A3F66']} style={styles.sheetHeader}>
                    {/* Gold accent line */}
                    <View style={styles.goldAccent}/>

                    <View style={styles.headerContent}>
                        <View>
                            <Text style={styles.headerTitle}>Langue de l&apos;application</Text>
                            <Text style={styles.headerSub}>
                                Choisissez votre langue préférée
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={colors.gold}/>
                        </TouchableOpacity>
                    </View>

                    {/* Active language badge */}
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeFlag}>
                            {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag}
                        </Text>
                        <Text style={styles.activeBadgeText}>
                            {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.nativeLabel}
                        </Text>
                        <View style={styles.activeDot}/>
                    </View>
                </LinearGradient>

                {/* Language list */}
                <View style={styles.list}>
                    {SUPPORTED_LANGUAGES.map((item, index) => {
                        const isSelected = item.code === lang
                        const isLast = index === SUPPORTED_LANGUAGES.length - 1

                        return (
                            <TouchableOpacity
                                key={item.code}
                                style={[
                                    styles.langItem,
                                    isSelected && styles.langItemActive,
                                    !isLast && styles.langItemBorder,
                                ]}
                                onPress={() => handleSelect(item.code)}
                                activeOpacity={0.65}
                            >
                                {/* Flag */}
                                <View style={[styles.flagWrap, isSelected && styles.flagWrapActive]}>
                                    <Text style={styles.flag}>{item.flag}</Text>
                                </View>

                                {/* Labels */}
                                <View style={styles.langLabels}>
                                    <Text style={[styles.nativeLabel, isSelected && styles.nativeLabelActive]}>
                                        {item.nativeLabel}
                                    </Text>
                                    <Text style={styles.frenchLabel}>{item.label}</Text>
                                </View>

                                {/* Check or arrow */}
                                {isSelected ? (
                                    <View style={styles.checkWrap}>
                                        <LinearGradient
                                            colors={[colors.gold, colors.goldDark]}
                                            style={styles.checkGradient}
                                        >
                                            <Ionicons name="checkmark" size={14} color="#FFF"/>
                                        </LinearGradient>
                                    </View>
                                ) : (
                                    <Ionicons name="chevron-forward" size={16} color={colors.border}/>
                                )}
                            </TouchableOpacity>
                        )
                    })}
                </View>

                {/* Footer note */}
                <View style={styles.footer}>
                    <Ionicons name="globe-outline" size={13} color={colors.textMuted}/>
                    <Text style={styles.footerText}>
                        La traduction est automatique et propulsée par IA
                    </Text>
                </View>

                {/* Safe area padding */}
                <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }}/>
            </Animated.View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        ...shadows.lg,
        overflow: 'hidden',
    },

    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center', marginTop: 10, marginBottom: 0,
    },

    // ── Header ──
    sheetHeader: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    goldAccent: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 2, backgroundColor: colors.gold,
    },
    headerContent: {
        flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 12,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textOnDark,
        fontSize: 16,
    },
    headerSub: {
        ...typography.caption,
        color: colors.gold + '99',
        marginTop: 2,
    },
    closeBtn: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: colors.gold + '15',
        alignItems: 'center', justifyContent: 'center',
    },
    activeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.gold + '12',
        borderRadius: radius.sm, borderWidth: 1, borderColor: colors.gold + '25',
        paddingHorizontal: 12, paddingVertical: 7,
        alignSelf: 'flex-start',
    },
    activeBadgeFlag: { fontSize: 18 },
    activeBadgeText: {
        ...typography.label,
        color: colors.goldLight,
        fontSize: 13,
    },
    activeDot: {
        width: 7, height: 7, borderRadius: 3.5,
        backgroundColor: colors.success,
        marginLeft: 2,
    },

    // ── List ──
    list: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.borderLight,
        overflow: 'hidden',
    },
    langItem: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: 13,
        gap: 12,
    },
    langItemActive: {
        backgroundColor: colors.goldMuted,
    },
    langItemBorder: {
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },

    flagWrap: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: colors.background,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.borderLight,
    },
    flagWrapActive: {
        borderColor: colors.gold + '40',
        backgroundColor: colors.goldShimmer,
    },
    flag: { fontSize: 24 },

    langLabels: { flex: 1 },
    nativeLabel: {
        ...typography.label, fontSize: 15,
        color: colors.textPrimary,
    },
    nativeLabelActive: { color: colors.textGold },
    frenchLabel: {
        ...typography.caption,
        color: colors.textMuted, marginTop: 2,
    },

    checkWrap: { width: 28, height: 28 },
    checkGradient: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        ...shadows.gold,
    },

    // ── Footer ──
    footer: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginHorizontal: spacing.lg, marginTop: spacing.md,
        paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: colors.navyMuted,
        borderRadius: radius.sm,
    },
    footerText: {
        ...typography.caption, fontSize: 11,
        color: colors.textMuted, flex: 1,
    },
})
