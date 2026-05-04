import React, { useEffect, useRef } from 'react'
import { View, Image, StyleSheet, Text, Platform, Animated, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, fonts } from '../config/theme'

/* ═══════════════════════════════════════════════════════════
   Splash Screen — Ultra Premium Cinematic Entrance
   Animations: Spring scale, staggered fade, glowing aura
═══════════════════════════════════════════════════════════ */

export default function SplashScreen() {
    const scaleAnim = useRef(new Animated.Value(0.8)).current
    const fadeAnim = useRef(new Animated.Value(0)).current
    const translateY = useRef(new Animated.Value(20)).current
    const pulseGlow = useRef(new Animated.Value(0.2)).current
    const lineAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Entrance Animations
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 15,
                friction: 6,
                useNativeDriver: true
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.back(1.5)),
                useNativeDriver: true
            }),
            Animated.timing(lineAnim, {
                toValue: 1,
                duration: 1500,
                delay: 400,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false // width cannot use native driver easily without scaleX
            })
        ]).start()

        // Continuous luxury pulse for the background glow
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseGlow, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseGlow, { toValue: 0.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start()
    }, [])

    return (
        <View style={styles.container}>
            {/* Deep luxurious background */}
            <LinearGradient colors={['#050B14', '#0A162D', '#0B1A3A']} style={StyleSheet.absoluteFillObject} />

            {/* Subtle animated background glow */}
            <Animated.View style={[styles.glowBackdrop, { opacity: pulseGlow, transform: [{ scale: scaleAnim }] }]} />

            <View style={styles.content}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY }] }}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        {/* Premium inner glow reflection */}
                        <View style={styles.logoReflection} />
                    </View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity: fadeAnim, transform: [{ translateY }] }]}>
                    <Text style={styles.brand}>RETOUR GAGNANT</Text>
                    <Text style={styles.brandSub}>BÉNIN</Text>
                    
                    {/* Animated Gold Separator */}
                    <Animated.View style={[
                        styles.goldLine, 
                        { width: lineAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '60%'] }) }
                    ]} />
                </Animated.View>
            </View>

            <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
                L&apos;Agence du Retour des Afro-descendants
            </Animated.Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050B14',
    },
    glowBackdrop: {
        position: 'absolute',
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: colors.gold,
        opacity: 0.15,
        filter: 'blur(40px)', // Web/New architecture blur
    },
    content: { 
        alignItems: 'center',
        zIndex: 10,
    },
    logoContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(201, 168, 76, 0.2)',
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    logo: { 
        width: 100, 
        height: 100 
    },
    logoReflection: {
        position: 'absolute',
        top: 0, left: 0, right: 0, height: '50%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    brand: {
        color: '#FFFFFF', 
        fontSize: 28, 
        fontFamily: fonts.heading,
        letterSpacing: 8,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 8,
    },
    brandSub: {
        color: colors.gold, 
        fontSize: 26, 
        fontFamily: fonts.headingRegular,
        letterSpacing: 10, 
        marginTop: 4,
    },
    goldLine: {
        height: 2,
        backgroundColor: colors.gold,
        marginTop: 20,
        borderRadius: 1,
        shadowColor: colors.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
    },
    footer: {
        position: 'absolute', 
        bottom: Platform.OS === 'ios' ? 50 : 30,
        color: 'rgba(255,255,255,0.4)', 
        fontSize: 12,
        fontFamily: fonts.bodyMedium,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
})
