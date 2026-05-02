// src/screens/auth/LoginScreen.js
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { signIn } from '../../services/supabase/authService'
import { Input, PrimaryButton, Alert } from '../../components/UI'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import Toast from 'react-native-toast-message'

export default function LoginScreen({ navigation }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setError(''); setLoading(true)
    try {
      await signIn(email.trim(), password)
      Toast.show({ type: 'success', text1: 'Welcome back! 👋' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#050608', '#0d0e14']} style={{ flex: 1 }}>
        {/* Glow */}
        <View style={styles.glow} pointerEvents="none" />

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#7c6ff7', '#4facfe']} style={styles.logoBox}>
              <Text style={{ fontSize: 28, color: '#fff' }}>⬡</Text>
            </LinearGradient>
            <Text style={styles.appName}>CryptoVault</Text>
            <Text style={styles.tagline}>Your keys. Your crypto.</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your wallet</Text>

            {error ? <Alert type="danger" style={{ marginBottom: 16 }}>{error}</Alert> : null}

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={{ marginTop: 8 }}
            />

            <View style={styles.footerRow}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 14 }}>Create one</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },
  glow: {
    position: 'absolute', top: -100, alignSelf: 'center',
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: 'rgba(124,111,247,0.12)',
  },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  logoBox: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  appName: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  tagline: { color: COLORS.textMuted, fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)',
  },
  title:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.lg },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg },
})
