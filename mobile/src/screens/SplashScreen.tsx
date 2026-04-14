import React, { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Text, Platform, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, gradients } from '../config/theme'

/* ═══════════════════════════════════════════════════════════
   Splash Screen — Stitch Design v4 (Dark gradient + Blue glow)
═══════════════════════════════════════════════════════════ */

export default function SplashScreen() {
    const pulseAnim = useRef(new Animated.Value(0.4)).current
    const fadeIn = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start()
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
            ])
        ).start()
    }, [])

    return (
        <LinearGradient colors={['#070D1A', '#0C1B33', '#132846']} style={styles.container}>
            {/* Flag accent line */}
            <View style={styles.flagStripe}>
                <View style={[styles.flagSegment, { backgroundColor: colors.flagGreen }]} />
                <View style={[styles.flagSegment, { backgroundColor: colors.flagYellow }]} />
                <View style={[styles.flagSegment, { backgroundColor: colors.flagRed }]} />
            </View>

            {/* Blue glow behind logo */}
            <Animated.View style={[styles.glowCircle, { opacity: pulseAnim }]} />

            <Animated.View style={[styles.content, { opacity: fadeIn }]}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                <Text style={styles.brand}>RETOUR GAGNANT</Text>
                <Text style={styles.brandSub}>BÉNIN</Text>

                {/* Animated dots loader */}
                <View style={styles.dotsRow}>
                    {[0, 1, 2].map(i => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.dot,
                                { opacity: pulseAnim, transform: [{ scale: i === 1 ? 1.2 : 1 }] }
                            ]}
                        />
                    ))}
                </View>

                <Text style={styles.loadingText}>Chargement...</Text>
            </Animated.View>

            <Text style={styles.footer}>L&apos;Agence du Retour des Afro-descendants</Text>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flagStripe: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4, flexDirection: 'row',
    },
    flagSegment: { flex: 1 },
    glowCircle: {
        position: 'absolute',
        width: 200, height: 200,
        borderRadius: 100,
        backgroundColor: colors.primary,
        opacity: 0.15,
    },
    content: { alignItems: 'center' },
    logo: { width: 110, height: 110, marginBottom: 24 },
    brand: {
        color: '#FFFFFF', fontSize: 24, fontWeight: '700',
        letterSpacing: 6,
    },
    brandSub: {
        color: colors.primary, fontSize: 24, fontWeight: '700',
        letterSpacing: 6, marginTop: 4,
    },
    dotsRow: {
        flexDirection: 'row', gap: 8,
        marginTop: 40, alignItems: 'center',
    },
    dot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: colors.primary,
    },
    loadingText: {
        color: 'rgba(255,255,255,0.35)', fontSize: 11,
        fontWeight: '600', letterSpacing: 2,
        textTransform: 'uppercase', marginTop: 16,
    },
    footer: {
        position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24,
        color: 'rgba(255,255,255,0.25)', fontSize: 11,
        fontStyle: 'italic', letterSpacing: 0.5,
    },
})
