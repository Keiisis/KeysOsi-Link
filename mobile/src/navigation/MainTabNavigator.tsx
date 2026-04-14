import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Platform } from 'react-native'
import { Home, Folder, Briefcase, Calendar, MessageSquare, User } from 'lucide-react-native'
import { colors, typography } from '../config/theme'
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

const TAB_ICONS: Record<string, React.FC<any>> = {
    Home: Home,
    Services: Briefcase,
    Dossier: Folder,
    Events: Calendar,
    Messages: MessageSquare,
    Profil: User,
}

export default function MainTabNavigator() {
    const { t } = useLang()

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    const IconComponent = TAB_ICONS[route.name] || Home
                    return (
                        <IconComponent
                            size={size}
                            color={color}
                            strokeWidth={focused ? 2.2 : 1.5}
                        />
                    )
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                    height: Platform.OS === 'ios' ? 88 : 68,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
                    paddingTop: 12,
                },
                tabBarLabelStyle: {
                    ...typography.caption,
                    fontSize: 10,
                    marginTop: 4,
                },
            })}
        >
            <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: t('Accueil') }} />
            <Tab.Screen name="Dossier"  component={DossierScreen}  options={{ tabBarLabel: t('Dossier') }} />
            <Tab.Screen name="Services" component={ServicesScreen}  options={{ tabBarLabel: t('Services') }} />
            <Tab.Screen name="Events"   component={EventsScreen}   options={{ tabBarLabel: t('Événements') }} />
            <Tab.Screen name="Messages" component={MessagesScreen}  options={{ tabBarLabel: t('Messages') }} />
            <Tab.Screen name="Profil"   component={ProfilScreen}   options={{ tabBarLabel: t('Profil') }} />
        </Tab.Navigator>
    )
}
