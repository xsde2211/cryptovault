// src/navigation/AppNavigator.js
import React from 'react'
import { View, Text, Platform } from 'react-native'
import { NavigationContainer }  from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs'

import { useApp } from '../context/AppContext'
import { COLORS }  from '../utils/theme'
import { Spinner } from '../components/UI'

// ── Auth screens ────────────────────────────────────────────────────────
import LoginScreen    from '../screens/auth/LoginScreen'
import SignupScreen   from '../screens/auth/SignupScreen'

// ── Tab screens ─────────────────────────────────────────────────────────
import DashboardScreen    from '../screens/main/DashboardScreen'
import SwapScreen         from '../screens/main/SwapScreen'
import WatchlistScreen    from '../screens/main/WatchlistScreen'
import SettingsScreen     from '../screens/main/SettingsScreen'

// ── Stack screens (push on top) ─────────────────────────────────────────
import SendScreen         from '../screens/main/SendScreen'
import ReceiveScreen      from '../screens/main/ReceiveScreen'
import CreateWalletScreen from '../screens/wallet/CreateWalletScreen'
import ImportWalletScreen from '../screens/wallet/ImportWalletScreen'
import TokensScreen       from '../screens/main/TokensScreen'
import TransactionsScreen from '../screens/main/TransactionsScreen'
import NFTScreen          from '../screens/main/NFTScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

// ── Tab icon component ──────────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused }) => (
  <View style={{ alignItems: 'center', paddingTop: 2 }}>
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
    <Text style={{ fontSize: 9, marginTop: 2, color: focused ? COLORS.accent : COLORS.textDim, fontWeight: focused ? '700' : '500', letterSpacing: 0.3 }}>
      {label}
    </Text>
  </View>
)

// ── Main tab navigator ──────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:     false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor:  COLORS.border,
          borderTopWidth:  1,
          height:          Platform.OS === 'ios' ? 80 : 62,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home"     focused={focused} /> }} />
      <Tab.Screen name="Swap" component={SwapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔄" label="Swap"     focused={focused} /> }} />
      <Tab.Screen name="Watchlist" component={WatchlistScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" label="Watch"    focused={focused} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Settings" focused={focused} /> }} />
    </Tab.Navigator>
  )
}

// ── Stack options shared ────────────────────────────────────────────────
const sharedScreenOptions = {
  headerStyle:     { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.text,
  headerTitleStyle:{ fontWeight: '700', fontSize: 18 },
  headerBackTitle: '',
  contentStyle:    { backgroundColor: COLORS.bg },
}

// ── Root navigator ──────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, authLoading } = useApp()

  if (authLoading) return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Spinner size="large" />
    </View>
  )

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        {!user ? (
          // ── Auth flow ──
          <>
            <Stack.Screen name="Login"  component={LoginScreen}  />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          // ── App flow ──
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Send"         component={SendScreen}         options={{ ...sharedScreenOptions, headerShown: true, title: 'Send' }} />
            <Stack.Screen name="Receive"      component={ReceiveScreen}      options={{ ...sharedScreenOptions, headerShown: true, title: 'Receive' }} />
            <Stack.Screen name="Tokens"       component={TokensScreen}       options={{ ...sharedScreenOptions, headerShown: true, title: 'Tokens' }} />
            <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ ...sharedScreenOptions, headerShown: true, title: 'History' }} />
            <Stack.Screen name="NFTs"         component={NFTScreen}          options={{ ...sharedScreenOptions, headerShown: true, title: 'NFTs' }} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen} options={{ ...sharedScreenOptions, headerShown: true, title: 'New Wallet' }} />
            <Stack.Screen name="ImportWallet" component={ImportWalletScreen} options={{ ...sharedScreenOptions, headerShown: true, title: 'Import Wallet' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
