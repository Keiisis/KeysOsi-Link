import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { colors, typography } from '../config/theme'

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

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'help-outline'

                    if (route.name === 'Home') {
                        iconName = focused ? 'grid' : 'grid-outline'
                    } else if (route.name === 'Services') {
                        iconName = focused ? 'briefcase' : 'briefcase-outline'
                    } else if (route.name === 'Dossier') {
                        iconName = focused ? 'folder-open' : 'folder-open-outline'
                    } else if (route.name === 'Events') {
                        iconName = focused ? 'calendar' : 'calendar-outline'
                    } else if (route.name === 'Messages') {
                        iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'
                    } else if (route.name === 'Profil') {
                        iconName = focused ? 'person' : 'person-outline'
                    }

                    return <Ionicons name={iconName} size={size} color={color} />
                },
                tabBarActiveTintColor: colors.gold,
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
            <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Accueil' }} />
            <Tab.Screen name="Dossier"  component={DossierScreen}  options={{ tabBarLabel: 'Dossier' }} />
            <Tab.Screen name="Services" component={ServicesScreen}  options={{ tabBarLabel: 'Services' }} />
            <Tab.Screen name="Events"   component={EventsScreen}   options={{ tabBarLabel: 'Événements' }} />
            <Tab.Screen name="Messages" component={MessagesScreen}  options={{ tabBarLabel: 'Messages' }} />
            <Tab.Screen name="Profil"   component={ProfilScreen}   options={{ tabBarLabel: 'Profil' }} />
        </Tab.Navigator>
    )
}
