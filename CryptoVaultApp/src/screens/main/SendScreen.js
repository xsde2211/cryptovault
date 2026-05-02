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
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Input, InfoRow, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

const STEPS = { FORM: 'form', CONFIRM: 'confirm', PASSWORD: 'password', SENDING: 'sending', DONE: 'done' }

export default function SendScreen({ navigation }) {
  const { activeWallet, activeNetwork } = useApp()
  const network = getNetwork(activeNetwork)
  const [step,           setStep]           = useState(STEPS.FORM)
  const [to,             setTo]             = useState('')
  const [amount,         setAmount]         = useState('')
  const [selectedAsset,  setSelectedAsset]  = useState('native')
  const [tokens,         setTokens]         = useState([])
  const [nativeBalance,  setNativeBalance]  = useState(null)
  const [tokenBalance,   setTokenBalance]   = useState(null)
  const [gasInfo,        setGasInfo]        = useState(null)
  const [gasLoading,     setGasLoading]     = useState(false)
  const [password,       setPassword]       = useState('')
  const [txHash,         setTxHash]         = useState('')
  const [txStatus,       setTxStatus]       = useState('pending')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [showAssets,     setShowAssets]     = useState(false)

  useEffect(() => {
    if (!activeWallet) return
    getNativeBalance(activeWallet.address, activeNetwork).then(setNativeBalance).catch(() => {})
    getTokens(activeWallet.address, activeNetwork).then(setTokens).catch(() => {})
  }, [activeWallet, activeNetwork])

  useEffect(() => {
    if (selectedAsset !== 'native' && activeWallet) {
      const tk = tokens.find(t => t.contract_address === selectedAsset)
      if (tk) getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
        .then(i => setTokenBalance(i.balance)).catch(() => {})
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

  const handleFormSubmit = () => {
    setError('')
    if (!isValidAddress(to))                                              { setError('Invalid recipient address'); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
    const bal = selectedAsset === 'native' ? parseFloat(nativeBalance || 0) : parseFloat(tokenBalance || 0)
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
        .then(async () => { setTxStatus('confirmed'); await updateTransactionStatus(result.txHash, 'confirmed'); Toast.show({ type: 'success', text1: 'Confirmed on-chain! ✅' }) })
        .catch(async () => { setTxStatus('failed'); await updateTransactionStatus(result.txHash, 'failed') })
    } catch (err) { setError(err.message); setStep(STEPS.PASSWORD) }
    finally { setLoading(false) }
  }

  const reset = () => { setStep(STEPS.FORM); setTo(''); setAmount(''); setPassword(''); setTxHash(''); setTxStatus('pending'); setError(''); setGasInfo(null); setSelectedAsset('native') }

  const selectedToken  = tokens.find(t => t.contract_address === selectedAsset)
  const displaySymbol  = selectedAsset === 'native' ? network.currency.symbol : selectedToken?.symbol || ''
  const displayBalance = selectedAsset === 'native' ? (nativeBalance !== null ? formatBalance(nativeBalance) : '…') : (tokenBalance !== null ? formatBalance(tokenBalance) : '…')

  const allAssets = [
    { key: 'native', label: `${network.currency.symbol} (Native)`, balance: nativeBalance ? formatBalance(nativeBalance) : '0' },
    ...tokens.map(t => ({ key: t.contract_address, label: t.symbol, balance: '—' })),
  ]

  if (!activeWallet) return (
    <View style={styles.centered}>
      <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>No wallet selected</Text>
    </View>
  )

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {error ? <Alert type="danger">{error}</Alert> : null}

        {/* ── FORM ── */}
        {step === STEPS.FORM && (
          <Card>
            {/* Asset picker */}
            <Text style={styles.label}>Asset</Text>
            <TouchableOpacity style={styles.assetPicker} onPress={() => setShowAssets(v => !v)}>
              <Text style={{ color: COLORS.text, fontWeight: '600' }}>{displaySymbol}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{displayBalance} available</Text>
              <Text style={{ color: COLORS.textMuted }}>▾</Text>
            </TouchableOpacity>
            {showAssets && (
              <View style={styles.assetList}>
                {allAssets.map(a => (
                  <TouchableOpacity key={a.key} style={[styles.assetRow, selectedAsset === a.key && styles.assetRowActive]}
                    onPress={() => { setSelectedAsset(a.key); setShowAssets(false) }}>
                    <Text style={{ color: selectedAsset === a.key ? COLORS.accent : COLORS.text, fontWeight: '600' }}>{a.label}</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{a.balance}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recipient */}
            <View style={{ marginBottom: SPACING.md }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Recipient Address</Text>
                <TouchableOpacity onPress={async () => { const t = await Clipboard.getStringAsync(); setTo(t) }}>
                  <Text style={{ color: COLORS.accent, fontSize: 12 }}>📋 Paste</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.monoInput, to && !isValidAddress(to) && { borderColor: COLORS.danger }]}
                placeholder="0x..."
                placeholderTextColor={COLORS.textDim}
                value={to}
                onChangeText={setTo}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {to && !isValidAddress(to) && <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 4 }}>Invalid address</Text>}
            </View>

            {/* Amount */}
            <View style={{ marginBottom: SPACING.md }}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Amount</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Balance: {displayBalance} {displaySymbol}</Text>
              </View>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.monoInput, { flex: 1, marginRight: 8 }]}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textDim}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity style={styles.maxBtn}
                  onPress={() => { const b = selectedAsset === 'native' ? nativeBalance : tokenBalance; if (b) setAmount(String((parseFloat(b) * 0.99).toFixed(8))) }}>
                  <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13 }}>MAX</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gas */}
            <TouchableOpacity style={styles.gasBtn}
              onPress={handleEstimateGas}
              disabled={gasLoading || !to || !amount || !isValidAddress(to)}>
              {gasLoading
                ? <Spinner size="small" />
                : <Text style={{ color: gasInfo ? COLORS.success : COLORS.textMuted, fontSize: 13 }}>
                    {gasInfo ? `⛽ Est. gas: ${gasInfo.estimatedCostFormatted}` : '⛽ Estimate Gas'}
                  </Text>
              }
            </TouchableOpacity>

            <PrimaryButton title="Review Transaction →" onPress={handleFormSubmit} style={{ marginTop: SPACING.sm }} />
          </Card>
        )}

        {/* ── CONFIRM ── */}
        {step === STEPS.CONFIRM && (
          <Card>
            <Text style={styles.cardTitle}>Confirm Transaction</Text>
            <InfoRow label="From"    value={`${to.slice(0,6)}…${activeWallet.address.slice(-4)}`} mono />
            <InfoRow label="To"      value={`${to.slice(0,6)}…${to.slice(-4)}`} mono />
            <InfoRow label="Amount"  value={`${amount} ${displaySymbol}`} />
            <InfoRow label="Network" value={network.name} />
            {gasInfo && <InfoRow label="Est. Gas" value={gasInfo.estimatedCostFormatted} last />}
            <Alert type="warning" style={{ marginTop: SPACING.md }}>Blockchain transactions are irreversible. Double-check the address.</Alert>
            <View style={styles.btnRow}>
              <SecondaryButton title="← Edit" onPress={() => setStep(STEPS.FORM)} style={{ flex: 1 }} />
              <PrimaryButton title="Continue 🔒" onPress={() => setStep(STEPS.PASSWORD)} style={{ flex: 1.2, marginLeft: 8 }} />
            </View>
          </Card>
        )}

        {/* ── PASSWORD ── */}
        {step === STEPS.PASSWORD && (
          <Card>
            <Text style={styles.cardTitle}>Enter Password</Text>
            <Text style={styles.cardDesc}>Decrypt your key to sign this transaction.</Text>
            <Input label="Wallet Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
            <Alert type="info">Your key is decrypted on-device only.</Alert>
            <View style={styles.btnRow}>
              <SecondaryButton title="← Back" onPress={() => setStep(STEPS.CONFIRM)} style={{ flex: 1 }} />
              <PrimaryButton title={`Send ${amount} ${displaySymbol}`} onPress={handleSend} loading={loading} style={{ flex: 1.3, marginLeft: 8 }} />
            </View>
          </Card>
        )}

        {/* ── SENDING ── */}
        {step === STEPS.SENDING && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Spinner size="large" />
            <Text style={[styles.cardTitle, { marginTop: 20, textAlign: 'center' }]}>Broadcasting…</Text>
            <Text style={{ color: COLORS.textMuted, textAlign: 'center' }}>Signing and sending to {network.name}</Text>
          </Card>
        )}

        {/* ── DONE ── */}
        {step === STEPS.DONE && (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 60, marginBottom: 12 }}>
              {txStatus === 'confirmed' ? '✅' : txStatus === 'failed' ? '❌' : '⏳'}
            </Text>
            <Text style={[styles.cardTitle, { textAlign: 'center' }]}>
              {txStatus === 'confirmed' ? 'Confirmed!' : txStatus === 'failed' ? 'Failed' : 'Submitted!'}
            </Text>
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg }}>
              {txStatus === 'pending' ? 'Waiting for block confirmation…' : `${amount} ${displaySymbol} sent`}
            </Text>
            <TouchableOpacity style={styles.txBox} onPress={async () => { await Clipboard.setStringAsync(txHash); Toast.show({ type: 'success', text1: 'TX hash copied!' }) }}>
              <Text style={styles.txText} numberOfLines={1}>{txHash}</Text>
              <Text>📋</Text>
            </TouchableOpacity>
            <View style={[styles.btnRow, { marginTop: SPACING.lg }]}>
              <PrimaryButton title="New Transfer" onPress={reset} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  scroll:   { padding: SPACING.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  assetPicker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: SPACING.sm,
  },
  assetList: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  assetRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  assetRowActive: { backgroundColor: COLORS.accentDim },
  monoInput: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, color: COLORS.text, fontSize: 13,
    borderWidth: 1.5, borderColor: COLORS.border, fontFamily: 'monospace',
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  maxBtn: { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  gasBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, marginBottom: 4 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  cardDesc:  { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.md },
  btnRow: { flexDirection: 'row', marginTop: SPACING.md },
  txBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, width: '100%', gap: 8 },
  txText: { flex: 1, fontFamily: 'monospace', fontSize: 11, color: COLORS.text },
})
