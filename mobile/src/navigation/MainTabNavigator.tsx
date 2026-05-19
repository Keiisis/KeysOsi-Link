import React, { useEffect } from 'react'
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Platform, StyleSheet, View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Home, Folder, Briefcase, Calendar, MessageSquare, User, LucideIcon } from 'lucide-react-native'
import { colors, fonts, motion, shadows } from '../config/theme'
import { useLang } from '../contexts/LangContext'

import HomeScreen from '../screens/main/HomeScreen'
import ServicesScreen from '../screens/main/ServicesScreen'
import DossierScreen from '../screens/main/DossierScreen'
import MessagesScreen from '../screens/main/MessagesScreen'
import ProfilScreen from '../screens/main/ProfilScreen'
import EventsScreen from '../screens/main/EventsScreen'

export type MainTabParamList = {
    Home: undefined
    Services: undefined
    Dossier: undefined
    Events: undefined
    Messages: undefined
    Profil: undefined
}

const Tab = createBottomTabNavigator<MainTabParamList>()

const TAB_ICONS: Record<keyof MainTabParamList, LucideIcon> = {
    Home: Home,
    Dossier: Folder,
    Services: Briefcase,
    Events: Calendar,
    Messages: MessageSquare,
    Profil: User,
}

/* ═══════════════════════════════════════════════════════════════
   TabButton — bouton individuel avec animation scale + haptics +
   indicateur point doré sous l'icône active.
═══════════════════════════════════════════════════════════════ */

interface TabButtonProps {
    label: string
    Icon: LucideIcon
    focused: boolean
    onPress: () => void
    onLongPress: () => void
    accessibilityLabel?: string
    testID?: string
    badgeCount?: number
}

function TabButton({ label, Icon, focused, onPress, onLongPress, accessibilityLabel, testID, badgeCount }: TabButtonProps) {
    const scale = useSharedValue(focused ? 1 : 0.92)
    const dotScale = useSharedValue(focused ? 1 : 0)
    const labelOpacity = useSharedValue(focused ? 1 : 0.7)

    useEffect(() => {
        scale.value = withSpring(focused ? 1.06 : 1, motion.spring.snappy)
        dotScale.value = withSpring(focused ? 1 : 0, motion.spring.snappy)
        labelOpacity.value = withTiming(focused ? 1 : 0.7, { duration: motion.fast })
    }, [focused, scale, dotScale, labelOpacity])

    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
    const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }], opacity: dotScale.value }))
    const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }))

    const handlePress = () => {
        if (!focused) {
            try { Haptics.selectionAsync() } catch { /* silent */ }
        }
        onPress()
    }

    const tint = focused ? colors.primary : colors.textMuted
    const strokeWidth = focused ? 2.4 : 1.8

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || label}
            accessibilityState={{ selected: focused }}
            testID={testID}
            style={styles.tabBtn}
            android_ripple={{ color: colors.primaryMuted, borderless: true, radius: 28 }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
            <View style={styles.tabBtnInner}>
                <Animated.View style={[styles.iconWrap, iconStyle]}>
                    <Icon size={22} color={tint} strokeWidth={strokeWidth} />
                    {(badgeCount != null && badgeCount > 0) && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
                        </View>
                    )}
                </Animated.View>
                <Animated.Text
                    numberOfLines={1}
                    style={[
                        styles.label,
                        { color: tint, fontFamily: focused ? fonts.bodyBold : fonts.bodyMedium },
                        labelStyle,
                    ]}
                >
                    {label}
                </Animated.Text>
                <Animated.View style={[styles.activeDot, dotStyle]} />
            </View>
        </Pressable>
    )
}

/* ═══════════════════════════════════════════════════════════════
   CustomTabBar — barre principale avec ombre subtile, fond clair,
   gestion zone safe-area, et glow émeraude au-dessus de la barre.
═══════════════════════════════════════════════════════════════ */

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const insets = useSafeAreaInsets()
    const bottomPadding = Platform.OS === 'ios' ? 24 : Math.max(insets.bottom, 6) + 10

    return (
        <View style={[styles.barOuter, { paddingBottom: bottomPadding }]}>
            <View style={styles.barTopGlow} />
            <View style={styles.barInner}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key]
                    const focused = state.index === index
                    const Icon = TAB_ICONS[route.name as keyof MainTabParamList] || Home
                    const label = (options.tabBarLabel as string) || route.name

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        })
                        if (!focused && !event.defaultPrevented) {
                            navigation.navigate(route.name as never)
                        }
                    }

                    const onLongPress = () => {
                        navigation.emit({ type: 'tabLongPress', target: route.key })
                    }

                    return (
                        <TabButton
                            key={route.key}
                            label={label}
                            Icon={Icon}
                            focused={focused}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            accessibilityLabel={options.tabBarAccessibilityLabel || label}
                            testID={options.tabBarButtonTestID}
                        />
                    )
                })}
            </View>
        </View>
    )
}

/* ═══════════════════════════════════════════════════════════════
   MainTabNavigator
═══════════════════════════════════════════════════════════════ */

export default function MainTabNavigator() {
    const { t } = useLang()

    return (
        <Tab.Navigator
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: t('Accueil') }} />
            <Tab.Screen name="Dossier"  component={DossierScreen}  options={{ tabBarLabel: t('Dossier') }} />
            <Tab.Screen name="Services" component={ServicesScreen} options={{ tabBarLabel: t('Services') }} />
            <Tab.Screen name="Events"   component={EventsScreen}   options={{ tabBarLabel: t('Événements') }} />
            <Tab.Screen name="Messages" component={MessagesScreen} options={{ tabBarLabel: t('Messages') }} />
            <Tab.Screen name="Profil"   component={ProfilScreen}   options={{ tabBarLabel: t('Profil') }} />
        </Tab.Navigator>
    )
}

const styles = StyleSheet.create({
    barOuter: {
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderLight,
        ...shadows.sm,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
    },
    barTopGlow: {
        height: 1,
        backgroundColor: 'transparent',
    },
    barInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingHorizontal: 4,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBtnInner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        gap: 2,
    },
    iconWrap: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 11,
        letterSpacing: 0.2,
        marginTop: 2,
    } as { fontSize: number; letterSpacing: number; marginTop: number },
    activeDot: {
        position: 'absolute',
        bottom: -4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.gold,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: colors.surface,
    },
    badgeText: {
        fontSize: 9,
        fontFamily: fonts.bodyBold,
        color: '#FFFFFF',
        lineHeight: 12,
    },
})
