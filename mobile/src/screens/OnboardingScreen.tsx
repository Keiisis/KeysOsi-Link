import React, { useRef, useState } from 'react'
import {
    View, Text, StyleSheet, TouchableOpacity,
    Animated, Dimensions, Platform, Image,
} from 'react-native'
import { ArrowRight, ChevronRight } from 'lucide-react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, radius, typography, fonts } from '../config/theme'
import { useLang } from '../contexts/LangContext'

const { width, height } = Dimensions.get('window')

interface OnboardingScreenProps {
    onComplete: () => void
}

const SLIDES = [
    {
        key: '1',
        icon: 'ribbon-outline' as const,
        iconColor: '#F59E0B',
        title: 'Votre Retour\nSimplifié',
        subtitle: 'Nationalité, passeport, démarches… Nous vous accompagnons à chaque étape avec une expertise VIP.',
        bg: ['#059669', '#064E3B'] as [string, string],
        accent: '#F59E0B',
    },
    {
        key: '2',
        icon: 'document-text-outline' as const,
        iconColor: '#3B82F6',
        title: 'Suivi\nen Temps Réel',
        subtitle: 'Déposez vos documents et suivez l\'avancement de vos démarches avec une transparence absolue.',
        bg: ['#2563EB', '#1E3A8A'] as [string, string],
        accent: '#3B82F6',
    },
    {
        key: '3',
        icon: 'shield-checkmark-outline' as const,
        iconColor: '#10B981',
        title: 'Excellence &\nSécurité',
        subtitle: 'Messagerie, paiements, rendez-vous : un espace client luxueux et 100% sécurisé.',
        bg: ['#0F766E', '#134E4A'] as [string, string],
        accent: '#10B981',
    },
]

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { t } = useLang()
    const [current, setCurrent] = useState(0)
    const flatRef = useRef<Animated.FlatList<any>>(null)
    const scrollX = useRef(new Animated.Value(0)).current

    const goNext = () => {
        if (current < SLIDES.length - 1) {
            const next = current + 1
            // @ts-ignore
            flatRef.current?.scrollToIndex({ index: next, animated: true })
            setCurrent(next)
        } else {
            onComplete()
        }
    }

    const isLast = current === SLIDES.length - 1

    return (
        <View style={styles.container}>
            {/* Arrière-plans colorés animés via Parallax */}
            {SLIDES.map((slide, index) => {
                const opacity = scrollX.interpolate({
                    inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                })
                return (
                    <Animated.View key={index} style={[StyleSheet.absoluteFillObject, { opacity }]}>
                        <LinearGradient colors={slide.bg} style={StyleSheet.absoluteFillObject} />
                    </Animated.View>
                )
            })}

            {/* Formes pour plus de "vivance" */}
            <View style={styles.circleTopRight} />
            <View style={styles.circleBottomLeft} />

            <Animated.FlatList
                ref={flatRef}
                data={SLIDES}
                keyExtractor={item => item.key}
                horizontal
                pagingEnabled
                scrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                renderItem={({ item, index }) => {
                    const inputRange = [
                        (index - 1) * width,
                        index * width,
                        (index + 1) * width,
                    ]

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.85, 1, 0.85],
                        extrapolate: 'clamp',
                    })
                    const translateY = scrollX.interpolate({
                        inputRange,
                        outputRange: [60, 0, 60],
                        extrapolate: 'clamp',
                    })
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0, 1, 0],
                        extrapolate: 'clamp',
                    })

                    return (
                        <View style={styles.slide}>
                            <Animated.View style={[styles.card, { opacity, transform: [{ scale }, { translateY }] }]}>
                                
                                <View style={[styles.iconWrap, { backgroundColor: item.accent + '15' }]}>
                                    <Ionicons name={item.icon} size={50} color={item.accent} />
                                </View>

                                <Text style={styles.title}>{t(item.title)}</Text>
                                <View style={[styles.divider, { backgroundColor: item.accent }]} />
                                <Text style={styles.subtitle}>{t(item.subtitle)}</Text>
                            </Animated.View>
                        </View>
                    )
                }}
            />

            {/* Footer Épuré Blanc */}
            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width]
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: 'clamp',
                        })
                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        })
                        const dotColor = scrollX.interpolate({
                            inputRange,
                            outputRange: ['#A0AEC0', SLIDES[current]?.accent || '#F59E0B', '#A0AEC0'],
                            extrapolate: 'clamp',
                        })

                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    { width: dotWidth, opacity: dotOpacity, backgroundColor: dotColor },
                                ]}
                            />
                        )
                    })}
                </View>

                <View style={styles.btns}>
                    {!isLast && (
                        <TouchableOpacity style={styles.skipBtn} onPress={onComplete} activeOpacity={0.6}>
                            <Text style={styles.skipText}>{t('Passer')}</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.nextBtn, 
                            isLast && styles.nextBtnFull,
                            { backgroundColor: SLIDES[current]?.accent || '#F59E0B' }
                        ]}
                        onPress={goNext}
                        activeOpacity={0.8}
                    >
                        {isLast ? (
                            <>
                                <Text style={styles.nextText}>{t('Démarrer')}</Text>
                                <ArrowRight size={20} color="#FFFFFF" strokeWidth={3} />
                            </>
                        ) : (
                            <ChevronRight size={28} color="#FFFFFF" strokeWidth={3} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#059669' },
    
    circleTopRight: {
        position: 'absolute', top: -50, right: -50,
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: '#FFFFFF', opacity: 0.1,
    },
    circleBottomLeft: {
        position: 'absolute', bottom: -100, left: -100,
        width: 400, height: 400, borderRadius: 200,
        backgroundColor: '#000000', opacity: 0.05,
    },

    slide: {
        width, height,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: 150,
    },
    card: {
        width: '100%',
        padding: spacing.xl, paddingTop: 40, paddingBottom: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 15,
    },
    iconWrap: {
        width: 110, height: 110, borderRadius: 55,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontFamily: fonts.heading,
        fontSize: 32,
        color: '#111827',
        textAlign: 'center',
        lineHeight: 40,
        letterSpacing: 0.5,
    },
    divider: {
        width: 40, height: 4,
        borderRadius: 2,
        marginVertical: spacing.lg,
    },
    subtitle: {
        fontFamily: fonts.bodyMedium,
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 26,
    },

    // Footer (Blanc & Clean)
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: spacing.xl, paddingTop: spacing.xl,
        paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 20,
    },
    dots: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 8, marginBottom: spacing.xl,
    },
    dot: { height: 6, borderRadius: 3 },
    btns: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16,
    },
    skipBtn: {
        flex: 1, paddingVertical: 16, alignItems: 'center',
    },
    skipText: {
        fontFamily: fonts.bodySemibold, fontSize: 16, color: '#9CA3AF', letterSpacing: 0.5,
    },
    nextBtn: {
        width: 64, height: 64, borderRadius: 32,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
    },
    nextBtnFull: {
        flex: 1, width: 'auto', borderRadius: 20,
        flexDirection: 'row', gap: 12, paddingHorizontal: spacing.xl, height: 64,
    },
    nextText: {
        fontFamily: fonts.heading, fontSize: 20, color: '#FFFFFF', letterSpacing: 0.5,
    },
})
