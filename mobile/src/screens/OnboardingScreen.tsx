import React, { useRef, useState } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, Dimensions, Platform, Image,
} from 'react-native'
import { ArrowRight, ChevronRight } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, radius, typography, gradients } from '../config/theme'
import { useLang } from '../contexts/LangContext'

const { width, height } = Dimensions.get('window')

interface OnboardingScreenProps {
    onComplete: () => void
}

const SLIDES = [
    {
        key: '1',
        icon: 'ribbon' as const,
        iconColor: colors.primary,
        title: 'Votre Retour au Bénin,\nSimplifiée',
        subtitle: 'Nationalité béninoise, passeport, recherche ancestrale… Nous vous accompagnons à chaque étape avec expertise et proximité.',
        bg: ['#1B2A4A', '#2A3F66'] as [string, string],
        accent: colors.primary,
    },
    {
        key: '2',
        icon: 'folder-open' as const,
        iconColor: '#7C5CCA',
        title: 'Suivez Votre Dossier\nen Temps Réel',
        subtitle: 'Déposez vos documents, suivez l\'avancement de vos démarches et recevez des notifications à chaque mise à jour.',
        bg: ['#1B2A4A', '#2A2050'] as [string, string],
        accent: '#7C5CCA',
    },
    {
        key: '3',
        icon: 'chatbubbles' as const,
        iconColor: '#2D9F63',
        title: 'Une Équipe Dédiée\nPour Vous',
        subtitle: 'Messagerie en temps réel, rendez-vous, paiements sécurisés — tout est centralisé dans votre espace client personnel.',
        bg: ['#1B2A4A', '#0F3329'] as [string, string],
        accent: '#2D9F63',
    },
]

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { t } = useLang()
    const [current, setCurrent] = useState(0)
    const flatRef = useRef<FlatList>(null)

    const goNext = () => {
        if (current < SLIDES.length - 1) {
            const next = current + 1
            flatRef.current?.scrollToIndex({ index: next, animated: true })
            setCurrent(next)
        } else {
            onComplete()
        }
    }

    const isLast = current === SLIDES.length - 1

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatRef}
                data={SLIDES}
                keyExtractor={item => item.key}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                    <LinearGradient
                        colors={item.bg}
                        style={styles.slide}
                    >
                        {/* Gold top line */}
                        <View style={styles.primaryLine} />

                        {/* Icon */}
                        <View style={[styles.iconWrap, { borderColor: item.accent + '40', backgroundColor: item.accent + '15' }]}>
                            <Ionicons name={item.icon} size={56} color={item.accent} />
                        </View>

                        {/* Ornament */}
                        <View style={styles.ornament}>
                            <View style={[styles.ornamentLine, { backgroundColor: item.accent + '50' }]} />
                            <View style={[styles.ornamentDot, { backgroundColor: item.accent }]} />
                            <View style={[styles.ornamentLine, { backgroundColor: item.accent + '50' }]} />
                        </View>

                        <Text style={styles.title}>{t(item.title)}</Text>
                        <Text style={styles.subtitle}>{t(item.subtitle)}</Text>
                    </LinearGradient>
                )}
            />

            {/* Bottom controls */}
            <View style={styles.footer}>
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === current && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>

                {/* Skip / Next / Start */}
                <View style={styles.btns}>
                    {!isLast && (
                        <TouchableOpacity style={styles.skipBtn} onPress={onComplete} activeOpacity={0.7}>
                            <Text style={styles.skipText}>{t('Passer')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.nextBtn, isLast && styles.nextBtnFull]}
                        onPress={goNext}
                        activeOpacity={0.85}
                    >
                        {isLast ? (
                            <>
                                <Text style={styles.nextText}>{t('Commencer')}</Text>
                                <ArrowRight size={18} color="#FFF" strokeWidth={1.75} />
                            </>
                        ) : (
                            <ChevronRight size={22} color="#FFF" strokeWidth={1.75} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    slide: {
        width,
        height,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: 160,
    },
    primaryLine: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, backgroundColor: colors.primary,
    },
    iconWrap: {
        width: 110, height: 110, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, marginBottom: spacing.xl,
    },
    ornament: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, marginBottom: spacing.lg,
    },
    ornamentLine: { width: 36, height: 1 },
    ornamentDot: { width: 6, height: 6, borderRadius: 3 },
    title: {
        ...typography.h1,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 38,
    },
    subtitle: {
        ...typography.body,
        color: 'rgba(245,241,232,0.80)',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: spacing.sm,
    },

    // Footer
    footer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 44 : spacing.xl,
        borderTopWidth: 1,
        borderTopColor: 'rgba(201,168,76,0.15)',
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: spacing.lg,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        width: 24, backgroundColor: colors.primary,
    },
    btns: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    skipBtn: {
        flex: 1, paddingVertical: 14,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
        alignItems: 'center',
    },
    skipText: {
        ...typography.button,
        color: colors.primary + 'CC',
    },
    nextBtn: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    nextBtnFull: {
        flex: 1, width: 'auto', borderRadius: radius.md,
        flexDirection: 'row', gap: 10,
        paddingHorizontal: spacing.xl,
    },
    nextText: {
        ...typography.button,
        color: '#FFF',
    },
})
