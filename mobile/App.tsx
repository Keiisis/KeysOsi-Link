import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
    useFonts,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular,
} from '@expo-google-fonts/playfair-display'
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter'
import * as Notifications from 'expo-notifications'

import { AuthProvider } from './src/contexts/AuthContext'
import { LangProvider } from './src/contexts/LangContext'
import AppNavigator from './src/navigation/AppNavigator'
import SplashScreen from './src/screens/SplashScreen'

/* ── Notification handler global (doit être défini avant tout rendu) ── */
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
})

export default function App() {
    const [fontsLoaded] = useFonts({
        PlayfairDisplay_700Bold,
        PlayfairDisplay_400Regular,
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    })

    // Attendre que les polices soient prêtes avant d'afficher l'app
    if (!fontsLoaded) {
        return <SplashScreen />
    }

    return (
        <SafeAreaProvider>
            <LangProvider>
                <AuthProvider>
                    <NavigationContainer>
                        <StatusBar style="light" />
                        <AppNavigator />
                    </NavigationContainer>
                </AuthProvider>
            </LangProvider>
        </SafeAreaProvider>
    )
}
