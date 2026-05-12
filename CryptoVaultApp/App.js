// App.js — CryptoVault v2  Root Entry
// CRITICAL: polyfill order matters — do not reorder these

import 'react-native-get-random-values'
import '@ethersproject/shims'
import 'react-native-url-polyfill/auto'

import { Buffer } from 'buffer'
global.Buffer = Buffer
global.process = require('process')

// ─────────────────────────────────────────────────────────────
import React from 'react'
import { View, Text, StyleSheet, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { AppProvider } from './src/context/AppContext'
import { ThemeProvider, useTheme } from './src/context/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'
import { RADIUS } from './src/utils/theme'

// ── Toast styles ──────────────────────────────────────────────
const TOAST_TYPES = {
  success: { bg: 'rgba(0,212,170,0.12)',  border: 'rgba(0,212,170,0.35)',  icon: '✅' },
  error:   { bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.35)', icon: '❌' },
  info:    { bg: 'rgba(108,99,255,0.12)', border: 'rgba(108,99,255,0.35)', icon: 'ℹ️' },
  warning: { bg: 'rgba(255,184,48,0.12)', border: 'rgba(255,184,48,0.35)', icon: '⚠️' },
}

function ToastComp({ type, text1, text2 }) {
  const { colors } = useTheme()
  const t = TOAST_TYPES[type] || TOAST_TYPES.info
  return (
    <View style={[ts.toast, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={{ fontSize: 18 }}>{t.icon}</Text>
      <View style={{ flex: 1 }}>
        {text1 && <Text style={[ts.t1, { color: colors.text }]}  numberOfLines={2}>{text1}</Text>}
        {text2 && <Text style={[ts.t2, { color: colors.textSub }]} numberOfLines={1}>{text2}</Text>}
      </View>
    </View>
  )
}

const toastConfig = {
  success: (p) => <ToastComp type="success" {...p} />,
  error:   (p) => <ToastComp type="error"   {...p} />,
  info:    (p) => <ToastComp type="info"    {...p} />,
  warning: (p) => <ToastComp type="warning" {...p} />,
}

const ts = StyleSheet.create({
  toast: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginHorizontal: 14, paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: RADIUS.lg, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  t1: { fontWeight: '700', fontSize: 14, lineHeight: 20 },
  t2: { fontSize: 12, marginTop: 1 },
})

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppNavigator />
          <Toast
            config={toastConfig}
            topOffset={Platform.OS === 'ios' ? 60 : 44}
            visibilityTime={3500}
          />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
