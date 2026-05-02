// App.js — Root entry point for CryptoVault React Native 
import 'react-native-get-random-values';
import '@ethersproject/shims'
import 'react-native-url-polyfill/auto';

import { Buffer } from 'buffer';
global.Buffer = Buffer;

global.process = require('process');
import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'
import { AppProvider } from './src/context/AppContext'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" backgroundColor="#050608" />
        <AppNavigator />
        <Toast
          config={{
            success: ({ text1, text2 }) => (
              <ToastComponent type="success" text1={text1} text2={text2} />
            ),
            error: ({ text1, text2 }) => (
              <ToastComponent type="error" text1={text1} text2={text2} />
            ),
            info: ({ text1, text2 }) => (
              <ToastComponent type="info" text1={text1} text2={text2} />
            ),
            warning: ({ text1, text2 }) => (
              <ToastComponent type="warning" text1={text1} text2={text2} />
            ),
          }}
          topOffset={60}
        />
      </AppProvider>
    </SafeAreaProvider>
  )
}

// Custom toast component
import { View, Text, StyleSheet } from 'react-native'
import { COLORS, RADIUS } from './src/utils/theme'

const TOAST_STYLES = {
  success: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)', icon: '✅' },
  error:   { bg: 'rgba(244,63,94,0.15)',  border: 'rgba(244,63,94,0.35)',  icon: '❌' },
  info:    { bg: 'rgba(124,111,247,0.15)',border: 'rgba(124,111,247,0.35)',icon: 'ℹ️' },
  warning: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)', icon: '⚠️' },
}

function ToastComponent({ type, text1, text2 }) {
  const s = TOAST_STYLES[type] || TOAST_STYLES.info
  return (
    <View style={[toastStyles.toast, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={{ fontSize: 18 }}>{s.icon}</Text>
      <View style={{ flex: 1 }}>
        {text1 && <Text style={toastStyles.text1}>{text1}</Text>}
        {text2 && <Text style={toastStyles.text2}>{text2}</Text>}
      </View>
    </View>
  )
}

const toastStyles = StyleSheet.create({
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: RADIUS.md, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  text1: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  text2: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
})
