// src/screens/auth/SignupScreen.js
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { signUp } from '../../services/supabase/authService'
import { Input, PrimaryButton, Alert } from '../../components/UI'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import Toast from 'react-native-toast-message'

export default function SignupScreen({ navigation }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handle = async () => {
    if (!email || !password) { setError('Fill in all fields'); return }
    if (password.length < 8) { setError('Password must be 8+ characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      await signUp(email.trim(), password)
      Toast.show({ type: 'success', text1: 'Account created!', text2: 'Check your email to confirm.' })
      navigation.navigate('Login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={['#050608', '#0d0e14']} style={{ flex: 1 }}>
        <View style={styles.glow} pointerEvents="none" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <LinearGradient colors={['#7c6ff7', '#4facfe']} style={styles.logoBox}>
              <Text style={{ fontSize: 28, color: '#fff' }}>⬡</Text>
            </LinearGradient>
            <Text style={styles.appName}>CryptoVault</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Start managing your crypto today</Text>
            {error ? <Alert type="danger">{error}</Alert> : null}
            <Input label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" placeholder="Min. 8 characters" value={password} onChangeText={setPassword} secureTextEntry />
            <Input label="Confirm Password" placeholder="Repeat password" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <PrimaryButton title="Create Account" onPress={handle} loading={loading} disabled={loading} style={{ marginTop: 8 }} />
            <View style={styles.footerRow}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 14 }}>Sign in</Text>
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
  glow: { position: 'absolute', top: -80, alignSelf: 'center', width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(124,111,247,0.1)' },
  logoWrap: { alignItems: 'center', marginBottom: SPACING.xl },
  logoBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(124,111,247,0.2)' },
  title:    { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.lg },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.lg },
})
