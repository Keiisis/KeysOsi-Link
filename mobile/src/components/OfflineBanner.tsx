import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated, Platform } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { WifiOff } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { typography } from '../config/theme'
import { useLang } from '../contexts/LangContext'

/* ═══════════════════════════════════════════════════════════
   OfflineBanner — Displayed at top when device is offline.
   Automatically hides when connectivity is restored.
═══════════════════════════════════════════════════════════ */

export default function OfflineBanner() {
    const [isOffline, setIsOffline] = useState(false)
    const slideAnim = useState(new Animated.Value(-80))[0]
    const { t } = useLang()
    const insets = useSafeAreaInsets()

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const offline = !(state.isConnected && state.isInternetReachable !== false)
            setIsOffline(offline)

            Animated.spring(slideAnim, {
                toValue: offline ? 0 : -80,
                useNativeDriver: true,
                tension: 60,
                friction: 10,
            }).start()
        })

        return () => unsubscribe()
    }, [slideAnim])

    if (!isOffline) return null

    return (
        <Animated.View
            style={[
                styles.banner,
                { paddingTop: insets.top + 8, transform: [{ translateY: slideAnim }] },
            ]}
        >
            <WifiOff size={18} color="#FFF" strokeWidth={2} />
            <Text style={styles.text}>{t('Pas de connexion Internet')}</Text>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingBottom: 12,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 20,
    },
    text: {
        ...typography.label,
        color: '#FFFFFF',
        fontSize: 14,
    },
})
