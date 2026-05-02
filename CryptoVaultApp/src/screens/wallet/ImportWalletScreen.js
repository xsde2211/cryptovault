// src/screens/wallet/ImportWalletScreen.js
import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { walletFromMnemonic, walletFromPrivateKey } from '../../services/blockchain/walletService'
import { encryptPrivateKey } from '../../utils/encryption'
import { saveWallet } from '../../services/supabase/walletDbService'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Input } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function ImportWalletScreen({ navigation }) {
  const { loadWallets, activeNetwork } = useApp()
  const [mode,      setMode]      = useState('mnemonic') // 'mnemonic' | 'privatekey'
  const [input,     setInput]     = useState('')
  const [step,      setStep]      = useState('input')    // 'input' | 'password'
  const [password,  setPassword]  = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [preview,   setPreview]   = useState(null)       // { address, privateKey }
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const handleParse = () => {
    setError('')
    try {
      const data = mode === 'mnemonic'
        ? walletFromMnemonic(input)
        : walletFromPrivateKey(input)
      setPreview(data)
      setStep('password')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSave = async () => {
    if (password.length < 8)   { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      const encrypted = encryptPrivateKey(preview.privateKey, password)
      await saveWallet({ address: preview.address, encryptedPrivateKey: encrypted, network: activeNetwork })
      await loadWallets()
      Toast.show({ type: 'success', text1: 'Wallet imported! 🎉' })
      navigation.goBack()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {error ? <Alert type="danger">{error}</Alert> : null}

        {step === 'input' && (
          <Card>
            <Text style={styles.cardTitle}>Import Wallet</Text>
            <Text style={styles.cardDesc}>Import an existing wallet using your seed phrase or private key.</Text>

            {/* Mode toggle */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'mnemonic' && styles.tabActive]}
                onPress={() => { setMode('mnemonic'); setInput(''); setError('') }}
              >
                <Text style={[styles.tabText, mode === 'mnemonic' && styles.tabTextActive]}>Seed Phrase</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'privatekey' && styles.tabActive]}
                onPress={() => { setMode('privatekey'); setInput(''); setError('') }}
              >
                <Text style={[styles.tabText, mode === 'privatekey' && styles.tabTextActive]}>Private Key</Text>
              </TouchableOpacity>
            </View>

            {mode === 'mnemonic' ? (
              <View style={{ marginBottom: SPACING.md }}>
                <Text style={styles.label}>12-Word Seed Phrase</Text>
                <TextInput
                  style={[styles.multiInput]}
                  placeholder="word1 word2 word3 ... word12"
                  placeholderTextColor={COLORS.textDim}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  numberOfLines={4}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textAlignVertical="top"
                />
                <Text style={styles.hint}>Enter all 12 words separated by spaces</Text>
              </View>
            ) : (
              <View style={{ marginBottom: SPACING.md }}>
                <Text style={styles.label}>Private Key (hex)</Text>
                <TextInput
                  style={styles.monoInput}
                  placeholder="0x... or 64 hex characters"
                  placeholderTextColor={COLORS.textDim}
                  value={input}
                  onChangeText={setInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

            <Alert type="warning">
              Never import on a shared or untrusted device. Your key is encrypted but the raw value passes through device memory during import.
            </Alert>

            <PrimaryButton
              title="Continue →"
              onPress={handleParse}
              disabled={!input.trim()}
            />
          </Card>
        )}

        {step === 'password' && preview && (
          <Card>
            <Text style={styles.cardTitle}>Secure This Wallet</Text>
            <Text style={styles.cardDesc}>Your private key will be AES-256 encrypted with this password.</Text>

            {/* Address preview */}
            <View style={styles.addressBox}>
              <View style={styles.addrAvatar}>
                <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '800' }}>
                  {preview.address.slice(2, 4).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 2 }}>Wallet Address</Text>
                <Text style={styles.addrText} numberOfLines={1}>{preview.address}</Text>
              </View>
            </View>

            <Input
              label="Wallet Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Confirm Password"
              placeholder="Repeat password"
              value={confirmPw}
              onChangeText={setConfirmPw}
              secureTextEntry
            />

            <Alert type="info">This password is only stored on your device. We never see it.</Alert>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="← Back" onPress={() => { setStep('input'); setPreview(null); setPassword(''); setConfirmPw('') }} style={{ flex: 1 }} />
              <PrimaryButton title="Import 🔒" onPress={handleSave} loading={loading} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  cardDesc:  { fontSize: 14, color: COLORS.textMuted, lineHeight: 20, marginBottom: SPACING.md },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm - 2, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6 },
  multiInput: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, color: COLORS.text, fontSize: 13,
    borderWidth: 1.5, borderColor: COLORS.border,
    minHeight: 100, fontFamily: 'monospace',
  },
  monoInput: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, color: COLORS.text, fontSize: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    fontFamily: 'monospace',
  },
  hint: { fontSize: 11, color: COLORS.textDim, marginTop: 4, marginBottom: SPACING.md },
  addressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  addrAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(124,111,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  addrText: { fontFamily: 'monospace', fontSize: 12, color: COLORS.text },
})
