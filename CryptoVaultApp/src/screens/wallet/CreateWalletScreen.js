// src/screens/wallet/CreateWalletScreen.js
import React, { useState } from 'react'
import { useTheme } from '../../context/ThemeContext'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert as RNAlert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { generateWallet } from '../../services/blockchain/walletService'
import { encryptPrivateKey } from '../../utils/encryption'
import { saveWallet } from '../../services/supabase/walletDbService'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Input } from '../../components/UI'
import Toast from 'react-native-toast-message'

const STEPS = ['Generate', 'Backup', 'Verify', 'Secure']
const { colors } = useTheme()

export default function CreateWalletScreen({ navigation }) {
  const { loadWallets, activeNetwork } = useApp()
  const [step,        setStep]        = useState(0)
  const [walletData,  setWalletData]  = useState(null)
  const [revealed,    setRevealed]    = useState(false)
  const [verifyWords, setVerifyWords] = useState({})
  const [verifyIdxs,  setVerifyIdxs]  = useState([])
  const [password,    setPassword]    = useState('')
  const [confirmPw,   setConfirmPw]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  const handleGenerate = () => {
    const data = generateWallet()
    const idxs = []
    while (idxs.length < 3) {
      const i = Math.floor(Math.random() * 12)
      if (!idxs.includes(i)) idxs.push(i)
    }
    setWalletData(data)
    setVerifyIdxs(idxs.sort((a, b) => a - b))
    setStep(1)
  }

  const handleVerify = () => {
    const words = walletData.mnemonic.split(' ')
    for (const idx of verifyIdxs) {
      if ((verifyWords[idx] || '').trim().toLowerCase() !== words[idx].toLowerCase()) {
        setError(`Word #${idx + 1} is incorrect`)
        return
      }
    }
    setError('')
    setStep(3)
  }

  const handleSave = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    setError(''); setLoading(true)
    try {
      const encrypted = encryptPrivateKey(walletData.privateKey, password)
      await saveWallet({ address: walletData.address, encryptedPrivateKey: encrypted, network: activeNetwork })
      await loadWallets()
      Toast.show({ type: 'success', text1: 'Wallet created! 🎉' })
      navigation.goBack()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const words = walletData?.mnemonic?.split(' ') || []

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Progress */}
        <View style={styles.progressRow}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ alignItems: 'center', flex: 1 }}>
              <View style={[styles.stepDot, i < step && styles.stepDone, i === step && styles.stepActive]}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: i <= step ? '#fff' : colors.textMuted }}>
                  {i < step ? '✓' : i + 1}
                </Text>
              </View>
              <Text style={{ fontSize: 9, marginTop: 4, color: i === step ? colors.accent : colors.textDim }}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(step / (STEPS.length - 1)) * 100}%` }]} />
        </View>

        {error ? <Alert type="danger">{error}</Alert> : null}

        {/* Step 0: Generate */}
        {step === 0 && (
          <Card>
            <Text style={styles.emoji}>🔑</Text>
            <Text style={styles.cardTitle}>Create New Wallet</Text>
            <Text style={styles.cardDesc}>
              We'll generate a 12-word seed phrase using BIP39. You must back it up — it's the only way to recover your wallet.
            </Text>
            <Alert type="warning">Never share your seed phrase. Anyone with it has full access to your funds.</Alert>
            <PrimaryButton title="Generate Wallet" onPress={handleGenerate} />
          </Card>
        )}

        {/* Step 1: Backup */}
        {step === 1 && walletData && (
          <Card>
            <Text style={styles.cardTitle}>Back Up Seed Phrase</Text>
            <Text style={styles.cardDesc}>Write these 12 words on paper. Store them somewhere safe and offline.</Text>
            <Alert type="danger">Never screenshot or store digitally.</Alert>

            {!revealed ? (
              <TouchableOpacity style={styles.revealBtn} onPress={() => setRevealed(true)}>
                <Text style={{ fontSize: 28 }}>👁</Text>
                <Text style={{ color: colors.textMuted, marginTop: 8, fontWeight: '600' }}>Tap to reveal seed phrase</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.seedGrid}>
                  {words.map((w, i) => (
                    <View key={i} style={styles.seedWord}>
                      <Text style={styles.seedNum}>{i + 1}.</Text>
                      <Text style={styles.seedTxt}>{w}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={styles.copyBtn} onPress={async () => { await Clipboard.setStringAsync(walletData.mnemonic); Toast.show({ type: 'success', text1: 'Copied!' }) }}>
                  <Text style={{ color: colors.accent, fontWeight: '600' }}>📋 Copy to clipboard</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.btnRow}>
              <SecondaryButton title="Back" onPress={() => setStep(0)} style={{ flex: 1 }} />
              <PrimaryButton title="I've written it down →" onPress={() => setStep(2)} style={{ flex: 1.5, marginLeft: 8 }} />
            </View>
          </Card>
        )}

        {/* Step 2: Verify */}
        {step === 2 && (
          <Card>
            <Text style={styles.cardTitle}>Verify Your Backup</Text>
            <Text style={styles.cardDesc}>Enter the requested words to confirm you've saved your seed phrase.</Text>
            {verifyIdxs.map(idx => (
              <View key={idx} style={{ marginBottom: SPACING.md }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.textMuted, marginBottom: 6 }}>
                  Word #{idx + 1}
                </Text>
                <TextInput
                  style={styles.verifyInput}
                  placeholder={`Enter word #${idx + 1}`}
                  placeholderTextColor={colors.textDim}
                  value={verifyWords[idx] || ''}
                  onChangeText={t => setVerifyWords(p => ({ ...p, [idx]: t }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}
            <View style={styles.btnRow}>
              <SecondaryButton title="Back" onPress={() => setStep(1)} style={{ flex: 1 }} />
              <PrimaryButton title="Verify ✓" onPress={handleVerify} style={{ flex: 1, marginLeft: 8 }} />
            </View>
          </Card>
        )}

        {/* Step 3: Secure */}
        {step === 3 && (
          <Card>
            <Text style={styles.cardTitle}>Secure Your Wallet</Text>
            <Text style={styles.cardDesc}>Set a strong password. Your private key is AES-256 encrypted with this password before storage.</Text>
            <Input label="Wallet Password" placeholder="Min. 8 characters" value={password} onChangeText={setPassword} secureTextEntry />
            <Input label="Confirm Password" placeholder="Repeat password" value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
            <Alert type="info">This password encrypts your key locally. We never see it.</Alert>
            <View style={styles.btnRow}>
              <SecondaryButton title="Back" onPress={() => setStep(2)} style={{ flex: 1 }} />
              <PrimaryButton title="Save Wallet 🔒" onPress={handleSave} loading={loading} style={{ flex: 1.3, marginLeft: 8 }} />
            </View>
          </Card>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface2, borderWidth: 1.5, borderColor: colors.border,
  },
  stepActive: { backgroundColor: 'rgba(124,111,247,0.2)', borderColor: colors.accent },
  stepDone:   { backgroundColor: colors.accent, borderColor: colors.accent },
  progressBar:  { height: 3, backgroundColor: colors.border, borderRadius: 2, marginBottom: SPACING.lg },
  progressFill: { height: 3, backgroundColor: colors.accent, borderRadius: 2 },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginBottom: SPACING.md },
  revealBtn: {
    backgroundColor: colors.surface2, borderRadius: RADIUS.md,
    padding: SPACING.lg * 1.5, alignItems: 'center', marginBottom: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  seedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  seedWord: {
    width: '30%', backgroundColor: colors.surface2, borderRadius: RADIUS.sm,
    padding: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  seedNum: { fontSize: 10, color: colors.textDim, marginRight: 4, minWidth: 16 },
  seedTxt: { fontSize: 13, color: colors.text, fontFamily: 'monospace', fontWeight: '500' },
  copyBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: SPACING.md },
  verifyInput: {
    backgroundColor: colors.surface2, borderRadius: RADIUS.md,
    padding: 12, color: colors.text, fontSize: 14, borderWidth: 1.5, borderColor: colors.border,
    fontFamily: 'monospace',
  },
  btnRow: { flexDirection: 'row', marginTop: SPACING.md },
})
