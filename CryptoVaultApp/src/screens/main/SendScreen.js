// src/screens/main/SendScreen.js
import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import {
  getNativeBalance, getTokenBalance, estimateGas,
  sendNative, sendToken, isValidAddress, formatBalance,
} from '../../services/blockchain/walletService'
import { decryptPrivateKey } from '../../utils/encryption'
import { saveTransaction, updateTransactionStatus, getTokens } from '../../services/supabase/walletDbService'
import { getNetwork, getExplorerTxUrl } from '../../utils/networks'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Input, InfoRow, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

const STEPS = { FORM: 'form', CONFIRM: 'confirm', PASSWORD: 'password', SENDING: 'sending', DONE: 'done' }

export default function SendScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const { colors } = useTheme()
  const network = getNetwork(activeNetwork)

  const [step,          setStep]          = useState(STEPS.FORM)
  const [to,            setTo]            = useState('')
  const [amount,        setAmount]        = useState('')
  const [selectedAsset, setSelectedAsset] = useState('native')
  const [tokens,        setTokens]        = useState([])
  const [nativeBal,     setNativeBal]     = useState(null)
  const [tokenBal,      setTokenBal]      = useState(null)
  const [gasInfo,       setGasInfo]       = useState(null)
  const [gasLoading,    setGasLoading]    = useState(false)
  const [password,      setPassword]      = useState('')
  const [txHash,        setTxHash]        = useState('')
  const [txStatus,      setTxStatus]      = useState('pending')
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [showAssets,    setShowAssets]    = useState(false)

  useEffect(() => {
    if (!activeWallet) return
    getNativeBalance(activeWallet.address, activeNetwork).then(setNativeBal).catch(() => {})
    getTokens(activeWallet.address, activeNetwork).then(setTokens).catch(() => {})
  }, [activeWallet, activeNetwork])

  useEffect(() => {
    if (selectedAsset !== 'native' && activeWallet) {
      const tk = tokens.find(t => t.contract_address === selectedAsset)
      if (tk) getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
        .then(i => setTokenBal(i.balance)).catch(() => {})
    }
  }, [selectedAsset, tokens, activeWallet, activeNetwork])

  const handleEstimateGas = async () => {
    if (!isValidAddress(to) || !amount || !activeWallet) return
    setGasLoading(true)
    try {
      const info = await estimateGas(activeWallet.address, to, amount, activeNetwork)
      setGasInfo(info)
    } catch { setGasInfo(null) } finally { setGasLoading(false) }
  }

  const handleSubmit = () => {
    setError('')
    if (!isValidAddress(to))                                              { setError('Invalid recipient address'); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
    const bal = selectedAsset === 'native' ? parseFloat(nativeBal || 0) : parseFloat(tokenBal || 0)
    if (parseFloat(amount) > bal)                                         { setError('Insufficient balance'); return }
    setStep(STEPS.CONFIRM)
  }

  const handleSend = async () => {
    if (!password) { setError('Enter your wallet password'); return }
    setError(''); setLoading(true); setStep(STEPS.SENDING)
    try {
      const pk = decryptPrivateKey(activeWallet.encrypted_private_key, password)
      const result = selectedAsset === 'native'
        ? await sendNative(pk, to, amount, activeNetwork)
        : await sendToken(pk, selectedAsset, to, amount, activeNetwork)
      setTxHash(result.txHash); setTxStatus('pending')
      await saveTransaction({ walletAddress: activeWallet.address, txHash: result.txHash, chain: activeNetwork, type: 'send', amount, toAddress: to })
      setStep(STEPS.DONE)
      Toast.show({ type: 'success', text1: 'Transaction submitted! ⏳' })
      result.wait()
        .then(async () => { setTxStatus('confirmed'); await updateTransactionStatus(result.txHash, 'confirmed'); Toast.show({ type: 'success', text1: 'Confirmed! ✅' }) })
        .catch(async () => { setTxStatus('failed'); await updateTransactionStatus(result.txHash, 'failed') })
    } catch (err) { setError(err.message); setStep(STEPS.PASSWORD) }
    finally { setLoading(false) }
  }

  const reset = () => { setStep(STEPS.FORM); setTo(''); setAmount(''); setPassword(''); setTxHash(''); setTxStatus('pending'); setError(''); setGasInfo(null); setSelectedAsset('native') }

  const selectedToken  = tokens.find(t => t.contract_address === selectedAsset)
  const displaySymbol  = selectedAsset === 'native' ? network.currency.symbol : selectedToken?.symbol || ''
  const displayBalance = selectedAsset === 'native' ? (nativeBal !== null ? formatBalance(nativeBal) : '…') : (tokenBal !== null ? formatBalance(tokenBal) : '…')
  const allAssets = [
    { key: 'native', label: `${network.currency.symbol} (Native)`, balance: nativeBal ? formatBalance(nativeBal) : '0' },
    ...tokens.map(t => ({ key: t.contract_address, label: t.symbol, balance: '—' })),
  ]

  if (!activeWallet) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.textSub, fontSize: 15 }}>No wallet selected</Text>
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {error ? <Alert type="danger" style={{ marginBottom: SPACING.md }}>{error}</Alert> : null}

        {/* ── FORM ── */}
        {step === STEPS.FORM && (
          <Card>
            {/* Asset picker */}
            <Text style={[styles.label, { color: colors.textSub }]}>Asset</Text>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              onPress={() => setShowAssets(v => !v)}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{displaySymbol}</Text>
              <Text style={{ color: colors.textSub, fontSize: 12 }}>{displayBalance} available</Text>
              <Text style={{ color: colors.textSub }}>▾</Text>
            </TouchableOpacity>
            {showAssets && (
              <View style={[styles.assetList, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                {allAssets.map(a => (
                  <TouchableOpacity key={a.key}
                    style={[styles.assetRow, { borderBottomColor: colors.border }, selectedAsset === a.key && { backgroundColor: colors.accentDim }]}
                    onPress={() => { setSelectedAsset(a.key); setShowAssets(false) }}>
                    <Text style={{ color: selectedAsset === a.key ? colors.accent : colors.text, fontWeight: '600' }}>{a.label}</Text>
                    <Text style={{ color: colors.textSub, fontSize: 12 }}>{a.balance}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* To */}
            <View style={{ marginTop: SPACING.sm }}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSub }]}>Recipient Address</Text>
                <TouchableOpacity onPress={async () => { const t = await Clipboard.getStringAsync(); setTo(t) }}>
                  <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>📋 Paste</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.mono, { backgroundColor: colors.surface2, borderColor: to && !isValidAddress(to) ? colors.danger : colors.border, color: colors.text }]}
                placeholder="0x..." placeholderTextColor={colors.textDim}
                value={to} onChangeText={setTo} autoCapitalize="none" autoCorrect={false}
              />
              {to && !isValidAddress(to) && <Text style={{ color: colors.danger, fontSize: 11, marginTop: 4 }}>Invalid address</Text>}
            </View>

            {/* Amount */}
            <View style={{ marginTop: SPACING.sm }}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSub }]}>Amount</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>Balance: {displayBalance} {displaySymbol}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.mono, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
                  placeholder="0.00" placeholderTextColor={colors.textDim}
                  value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.maxBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
                  onPress={() => { const b = selectedAsset === 'native' ? nativeBal : tokenBal; if (b) setAmount(String((parseFloat(b) * 0.99).toFixed(8))) }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gas */}
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 4 }}
              onPress={handleEstimateGas} disabled={gasLoading || !to || !amount || !isValidAddress(to)}>
              {gasLoading
                ? <Spinner size="small" />
                : <Text style={{ color: gasInfo ? colors.success : colors.textSub, fontSize: 13 }}>
                    {gasInfo ? `⛽ Est. gas: ${gasInfo.estimatedCostFormatted}` : '⛽ Estimate Gas'}
                  </Text>
              }
            </TouchableOpacity>

            <PrimaryButton title="Review Transaction →" onPress={handleSubmit} style={{ marginTop: SPACING.sm }} />
          </Card>
        )}

        {/* ── CONFIRM ── */}
        {step === STEPS.CONFIRM && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Confirm Transaction</Text>
            <InfoRow label="To"      value={`${to.slice(0,10)}…${to.slice(-6)}`} mono />
            <InfoRow label="Amount"  value={`${amount} ${displaySymbol}`} />
            <InfoRow label="Network" value={network.name} />
            {gasInfo && <InfoRow label="Est. Gas" value={gasInfo.estimatedCostFormatted} last />}
            <Alert type="warning" style={{ marginTop: SPACING.md }}>Blockchain transactions are irreversible.</Alert>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
              <SecondaryButton title="← Edit" onPress={() => setStep(STEPS.FORM)} style={{ flex: 1 }} />
              <PrimaryButton title="Continue 🔒" onPress={() => setStep(STEPS.PASSWORD)} style={{ flex: 1.2 }} />
            </View>
          </Card>
        )}

        {/* ── PASSWORD ── */}
        {step === STEPS.PASSWORD && (
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Enter Password</Text>
            <Text style={{ color: colors.textSub, fontSize: 14, marginBottom: SPACING.md }}>Your key is decrypted on-device only.</Text>
            <Input label="Wallet Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
            <Alert type="info">Private key never leaves your device.</Alert>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
              <SecondaryButton title="← Back" onPress={() => setStep(STEPS.CONFIRM)} style={{ flex: 1 }} />
              <PrimaryButton title={`Send ${amount} ${displaySymbol}`} onPress={handleSend} loading={loading} style={{ flex: 1.3 }} />
            </View>
          </Card>
        )}

        {/* ── SENDING ── */}
        {step === STEPS.SENDING && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Spinner size="large" />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 20, textAlign: 'center' }]}>Broadcasting…</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center' }}>Sending to {network.name}</Text>
          </Card>
        )}

        {/* ── DONE ── */}
        {step === STEPS.DONE && (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 60, marginBottom: 12 }}>
              {txStatus === 'confirmed' ? '✅' : txStatus === 'failed' ? '❌' : '⏳'}
            </Text>
            <Text style={[styles.cardTitle, { color: colors.text, textAlign: 'center' }]}>
              {txStatus === 'confirmed' ? 'Confirmed!' : txStatus === 'failed' ? 'Failed' : 'Submitted!'}
            </Text>
            <Text style={{ color: colors.textSub, textAlign: 'center', marginBottom: SPACING.lg }}>
              {txStatus === 'pending' ? 'Waiting for confirmation…' : `${amount} ${displaySymbol} sent`}
            </Text>
            <TouchableOpacity
              style={[styles.txBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}
              onPress={async () => { await Clipboard.setStringAsync(txHash); Toast.show({ type: 'success', text1: 'TX hash copied!' }) }}>
              <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: colors.text }} numberOfLines={1}>{txHash}</Text>
              <Text>📋</Text>
            </TouchableOpacity>
            <PrimaryButton title="New Transfer" onPress={reset} style={{ marginTop: SPACING.lg, width: '100%' }} />
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  label:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  picker:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: RADIUS.md, borderWidth: 1.5, marginBottom: SPACING.sm },
  assetList:{ borderRadius: RADIUS.md, borderWidth: 1, marginBottom: SPACING.md, overflow: 'hidden' },
  assetRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 13, borderBottomWidth: 1 },
  mono:     { padding: 13, borderRadius: RADIUS.md, borderWidth: 1.5, fontFamily: 'monospace', fontSize: 13 },
  maxBtn:   { paddingHorizontal: 16, paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center' },
  cardTitle:{ fontSize: 20, fontWeight: '800', marginBottom: 6 },
  txBox:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, width: '100%', gap: 8 },
})
