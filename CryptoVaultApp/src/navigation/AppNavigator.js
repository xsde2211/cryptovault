// src/navigation/AppNavigator.js
import React from 'react'
import { View, Text, Platform, StatusBar } from 'react-native'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator }  from '@react-navigation/native-stack'
import { createBottomTabNavigator }    from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets }           from 'react-native-safe-area-context'

import { useApp }     from '../context/AppContext'
import { useTheme }   from '../context/ThemeContext'
import { RADIUS }     from '../utils/theme'
import { Spinner }    from '../components/UI'

// Auth
import LoginScreen    from '../screens/auth/LoginScreen'
import SignupScreen   from '../screens/auth/SignupScreen'

// Main Tabs
import DashboardScreen  from '../screens/main/DashboardScreen'
import SwapScreen       from '../screens/main/SwapScreen'
import VirtualCardScreen from '../screens/vcc/VirtualCardScreen'
import P2PScreen        from '../screens/p2p/P2PScreen'
import SettingsScreen   from '../screens/main/SettingsScreen'

// Stack
import SendScreen         from '../screens/main/SendScreen'
import ReceiveScreen      from '../screens/main/ReceiveScreen'
import CreateWalletScreen from '../screens/wallet/CreateWalletScreen'
import ImportWalletScreen from '../screens/wallet/ImportWalletScreen'
import TokensScreen       from '../screens/main/TokensScreen'
import TransactionsScreen from '../screens/main/TransactionsScreen'
import NFTScreen          from '../screens/main/NFTScreen'
import WatchlistScreen    from '../screens/main/WatchlistScreen'
import TronWalletScreen   from '../screens/tron/TronWalletScreen'
import KYCScreen          from '../screens/kyc/KYCScreen'
import PhysicalCardScreen from '../screens/vcc/PhysicalCardScreen'
import MerchantScreen     from '../screens/p2p/MerchantScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

// ── Tab Icon ──────────────────────────────────────────────────
const TabIcon = ({ emoji, label, focused, colors }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
    <View style={focused ? {
      backgroundColor: `${colors.accent}20`, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 5, marginBottom: 2,
    } : { marginBottom: 2 }}>
      <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
    </View>
    <Text style={{
      fontSize: 10, fontWeight: focused ? '700' : '500',
      color: focused ? colors.accent : colors.textDim,
      letterSpacing: 0.2,
    }}>
      {label}
    </Text>
  </View>
)

// ── Main Tab Navigator ─────────────────────────────────────────
function MainTabs() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:     false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor:  colors.surface,
          borderTopColor:   colors.border,
          borderTopWidth:   1,
          // FIX: proper height accounting for device bottom inset
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          paddingHorizontal: 4,
        },
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Home"  focused={focused} colors={colors} /> }} />
      <Tab.Screen name="Swap" component={SwapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔄" label="Swap"  focused={focused} colors={colors} /> }} />
      <Tab.Screen name="Cards" component={VirtualCardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💳" label="Cards" focused={focused} colors={colors} /> }} />
      <Tab.Screen name="P2P" component={P2PScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" label="P2P"   focused={focused} colors={colors} /> }} />
      <Tab.Screen name="More" component={SettingsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️"  label="More"  focused={focused} colors={colors} /> }} />
    </Tab.Navigator>
  )
}

// ── Header Options ─────────────────────────────────────────────
const mkHeader = (title, colors) => ({
  headerShown: true,
  title,
  headerStyle:        { backgroundColor: colors.bg },
  headerTintColor:    colors.text,
  headerTitleStyle:   { fontWeight: '700', fontSize: 17, color: colors.text },
  headerBackTitle:    '',
  headerShadowVisible: false,
  contentStyle:       { backgroundColor: colors.bg },
  headerBackTitleVisible: false,
})

// ── Root Navigator ─────────────────────────────────────────────
export default function AppNavigator() {
  const { user, authLoading } = useApp()
  const { isDark, colors }    = useTheme()

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      card:       colors.surface,
      text:       colors.text,
      border:     colors.border,
    },
  }

  if (authLoading) return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Spinner size="large" />
    </View>
  )

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        {!user ? (
          <>
            <Stack.Screen name="Login"  component={LoginScreen}  />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs"     component={MainTabs} />
            <Stack.Screen name="Send"         component={SendScreen}          options={mkHeader('Send',                colors)} />
            <Stack.Screen name="Receive"      component={ReceiveScreen}       options={mkHeader('Receive',            colors)} />
            <Stack.Screen name="Tokens"       component={TokensScreen}        options={mkHeader('Tokens',             colors)} />
            <Stack.Screen name="Transactions" component={TransactionsScreen}  options={mkHeader('History',            colors)} />
            <Stack.Screen name="NFTs"         component={NFTScreen}           options={mkHeader('NFTs',               colors)} />
            <Stack.Screen name="Watchlist"    component={WatchlistScreen}     options={mkHeader('Watchlist',          colors)} />
            <Stack.Screen name="CreateWallet" component={CreateWalletScreen}  options={mkHeader('New Wallet',         colors)} />
            <Stack.Screen name="ImportWallet" component={ImportWalletScreen}  options={mkHeader('Import Wallet',      colors)} />
            <Stack.Screen name="TRON"         component={TronWalletScreen}    options={mkHeader('TRON Wallet',        colors)} />
            <Stack.Screen name="KYC"          component={KYCScreen}           options={mkHeader('Identity Verify',    colors)} />
            <Stack.Screen name="PhysicalCard" component={PhysicalCardScreen}  options={mkHeader('Order Physical Card',colors)} />
            <Stack.Screen name="Merchant"     component={MerchantScreen}      options={mkHeader('Merchant QR',        colors)} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
