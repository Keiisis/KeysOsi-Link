import React, { useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../contexts/AuthContext'

import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'
import MainTabNavigator from './MainTabNavigator'
import SplashScreen from '../screens/SplashScreen'
import OnboardingScreen from '../screens/OnboardingScreen'
import ServiceDetailsScreen from '../screens/main/ServiceDetailsScreen'
import EditProfilScreen from '../screens/main/EditProfilScreen'
import SecurityScreen from '../screens/main/SecurityScreen'
import NotificationsScreen from '../screens/main/NotificationsScreen'
import PaymentsScreen from '../screens/main/PaymentsScreen'
import AppointmentsScreen from '../screens/main/AppointmentsScreen'
import FAQScreen from '../screens/main/FAQScreen'
import AboutScreen from '../screens/main/AboutScreen'

/* ── Types de navigation ── */
export type RootStackParamList = {
    Onboarding: undefined
    Login: undefined
    Register: undefined
    ForgotPassword: undefined
    Main: undefined
    ServiceDetails: {
        serviceId: string
        title: string
        desc: string
        color: string
        icon: string
    }
    EditProfil: undefined
    Security: undefined
    Notifications: undefined
    Payments: undefined
    Appointments: undefined
    FAQ: undefined
    About: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
    const { session, loading } = useAuth()
    const [onboardingChecked, setOnboardingChecked] = useState(false)
    const [onboardingDone, setOnboardingDone] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem('onboarding_complete').then(val => {
            setOnboardingDone(val === 'true')
            setOnboardingChecked(true)
        })
    }, [])

    // Attendre la session ET le check onboarding
    if (loading || !onboardingChecked) {
        return <SplashScreen />
    }

    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false, animation: 'fade' }}
        >
            {/* ── Onboarding (1ère ouverture seulement) ── */}
            {!onboardingDone ? (
                <Stack.Screen
                    name="Onboarding"
                    children={() => (
                        <OnboardingScreen
                            onComplete={async () => {
                                await AsyncStorage.setItem('onboarding_complete', 'true')
                                setOnboardingDone(true)
                            }}
                        />
                    )}
                />
            ) : !session ? (
                /* ── Auth ── */
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPasswordScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                </>
            ) : (
                /* ── App principale ── */
                <>
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                    <Stack.Screen
                        name="ServiceDetails"
                        component={ServiceDetailsScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="EditProfil"
                        component={EditProfilScreen}
                        options={{ animation: 'slide_from_bottom' }}
                    />
                    <Stack.Screen
                        name="Security"
                        component={SecurityScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="Notifications"
                        component={NotificationsScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="Payments"
                        component={PaymentsScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="Appointments"
                        component={AppointmentsScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="FAQ"
                        component={FAQScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                    <Stack.Screen
                        name="About"
                        component={AboutScreen}
                        options={{ animation: 'slide_from_right' }}
                    />
                </>
            )}
        </Stack.Navigator>
    )
}
