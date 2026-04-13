import React from 'react'
import { View, Image, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native'
import { colors } from '../config/theme'

/* ═══════════════════════════════════════════════════════════
   Splash Screen — Premium Or/Marine
═══════════════════════════════════════════════════════════ */

export default function SplashScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.goldLineTop} />

            <View style={styles.content}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />

                {/* Ornement */}
                <View style={styles.ornament}>
                    <View style={styles.ornamentLine} />
                    <View style={styles.ornamentDiamond} />
                    <View style={styles.ornamentLine} />
                </View>

                <Text style={styles.brand}>RETOUR GAGNANT</Text>
                <Text style={styles.brandSub}>BÉNIN</Text>

                <ActivityIndicator
                    size="small"
                    color={colors.gold}
                    style={styles.loader}
                />

                <Text style={styles.loadingText}>Chargement...</Text>
            </View>

            <Text style={styles.footer}>L&apos;Agence du Retour des Afro-descendants</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.headerBg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goldLineTop: {
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, backgroundColor: colors.gold,
    },
    content: { alignItems: 'center' },
    logo: { width: 120, height: 120, marginBottom: 20 },
    ornament: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, marginBottom: 16,
    },
    ornamentLine: { width: 50, height: 1, backgroundColor: colors.gold + '50' },
    ornamentDiamond: {
        width: 7, height: 7, backgroundColor: colors.goldLight,
        transform: [{ rotate: '45deg' }],
    },
    brand: {
        color: colors.goldLight, fontSize: 22, fontWeight: '700',
        letterSpacing: 6,
    },
    brandSub: {
        color: colors.goldLight, fontSize: 22, fontWeight: '700',
        letterSpacing: 6, marginTop: 4,
    },
    loader: { marginTop: 40 },
    loadingText: {
        color: colors.gold + '80', fontSize: 11,
        fontWeight: '600', letterSpacing: 2,
        textTransform: 'uppercase', marginTop: 12,
    },
    footer: {
        position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24,
        color: colors.gold + '55', fontSize: 11,
        fontStyle: 'italic', letterSpacing: 0.5,
    },
})
