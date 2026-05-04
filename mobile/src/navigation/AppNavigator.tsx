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
import EventDetailScreen from '../screens/main/EventDetailScreen'
import EditProfilScreen from '../screens/main/EditProfilScreen'
import SecurityScreen from '../screens/main/SecurityScreen'
import NotificationsScreen from '../screens/main/NotificationsScreen'
import PaymentsScreen from '../screens/main/PaymentsScreen'
import AppointmentsScreen from '../screens/main/AppointmentsScreen'
import FAQScreen from '../screens/main/FAQScreen'
import AboutScreen from '../screens/main/AboutScreen'
import BoutiqueScreen from '../screens/main/BoutiqueScreen'
import ProductDetailScreen from '../screens/main/ProductDetailScreen'
import CheckoutScreen from '../screens/main/CheckoutScreen'
import OrdersScreen from '../screens/main/OrdersScreen'
import OrderDetailScreen from '../screens/main/OrderDetailScreen'
import OrderConfirmationScreen from '../screens/main/OrderConfirmationScreen'
import SignatureScreen from '../screens/main/SignatureScreen'
import InvoicesScreen from '../screens/main/InvoicesScreen'
import NationaliteFormScreen from '../screens/main/NationaliteFormScreen'

/* ── Types de navigation ── */
export interface BoutiqueProduct {
    id: string
    title: string
    description: string
    long_description: string
    price: number
    sale_price: number | null
    currency: string
    images: string[]
    category: string
    stock: number
    is_active: boolean
    is_featured: boolean
}

export interface CartItemNav {
    product: BoutiqueProduct
    quantity: number
}

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
    EventDetail: { event: Record<string, unknown> }
    EditProfil: undefined
    Security: undefined
    Notifications: undefined
    Payments: undefined
    Appointments: undefined
    FAQ: undefined
    About: undefined
    Boutique: undefined
    ProductDetail: {
        product: BoutiqueProduct
        onAddToCart: (qty: number) => void
    }
    Checkout: {
        cart: CartItemNav[]
        total: number
    }
    Orders: undefined
    OrderDetail: {
        orderId: string
        trackingCode?: string
    }
    OrderConfirmation: {
        orderId: string
        transactionId: string
    }
    Signature: undefined
    Invoices: undefined
    NationaliteForm: undefined
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

    if (loading || !onboardingChecked) {
        return <SplashScreen />
    }

    return (
        <Stack.Navigator
            screenOptions={{ headerShown: false, animation: 'fade' }}
        >
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
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
                </>
            ) : (
                <>
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                    <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="EditProfil" component={EditProfilScreen} options={{ animation: 'slide_from_bottom' }} />
                    <Stack.Screen name="Security" component={SecurityScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Payments" component={PaymentsScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Appointments" component={AppointmentsScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="FAQ" component={FAQScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Boutique" component={BoutiqueScreen} options={{ animation: 'slide_from_right' }} />

                    {/* E-commerce flow */}
                    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} options={{ animation: 'fade' }} />
                    <Stack.Screen name="Orders" component={OrdersScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ animation: 'slide_from_right' }} />

                    {/* Documents personnels */}
                    <Stack.Screen name="Signature" component={SignatureScreen} options={{ animation: 'slide_from_right' }} />
                    <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ animation: 'slide_from_right' }} />

                    {/* Nationalité VIP — Formulaire complet */}
                    <Stack.Screen name="NationaliteForm" component={NationaliteFormScreen} options={{ animation: 'slide_from_bottom' }} />
                </>
            )}
        </Stack.Navigator>
    )
}
