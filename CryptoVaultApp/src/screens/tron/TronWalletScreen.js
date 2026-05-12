// src/screens/tron/TronWalletScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert as RNAlert, Linking, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import QRCode from 'react-native-qrcode-svg'
import { generateTronWallet, tronWalletFromPrivateKey, getTronBalance, sendTRX, isValidTronAddress, TRC20_TOKENS, getTRC20Balance } from '../../services/tron/tronService'
import { encryptPrivateKey, decryptPrivateKey } from '../../utils/encryption'
import { supabase } from '../../services/supabase/client'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS, GRADIENTS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Input, Alert, Spinner, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

const TRON_FAUCET = 'https://nile.tronscan.org/#/transfer/trx'

export default function TronWalletScreen({ navigation }) {
  const { user } = useApp()
  const [tronWallets, setTronWallets] = useState([])
  const [activeWallet, setActiveWallet] = useState(null)
  const [network, setNetwork] = useState('tron_nile')   // default testnet
  const [balance, setBalance] = useState(null)
  const [trc20Bals, setTrc20Bals] = useState({})
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('dashboard')           // dashboard | send | receive | import

  // Send state
  const [sendTo, setSendTo] = useState('')
  const [sendAmt, setSendAmt] = useState('')
  const [sendPw, setSendPw] = useState('')
  const [sendStep, setSendStep] = useState('form')      // form | confirm | sending | done
  const [txHash, setTxHash] = useState('')
  const [sendError, setSendError] = useState('')

  // Import state
  const [importPk, setImportPk] = useState('')
  const [importPw, setImportPw] = useState('')
  const [importPw2, setImportPw2] = useState('')

  const loadWallets = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('tron_wallets')
      .select('*').eq('user_id', user.id).order('created_at')
    setTronWallets(data || [])
    if (data?.length > 0 && !activeWallet) setActiveWallet(data[0])
  }, [user])

  useEffect(() => { loadWallets() }, [loadWallets])

  const loadBalance = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const bal = await getTronBalance(activeWallet.address, network)
      setBalance(bal)
      const tokens = TRC20_TOKENS[network] || []
      const bals = {}
      for (const tk of tokens) {
        bals[tk.symbol] = await getTRC20Balance(tk.address, activeWallet.address, network)
      }
      setTrc20Bals(bals)
    } catch {}
    setLoading(false)
  }, [activeWallet, network])

  useEffect(() => { loadBalance() }, [loadBalance])

  const handleCreate = async () => {
    try {
      const wData = await generateTronWallet()
      // Ask for password
      RNAlert.prompt('Set Wallet Password', 'This encrypts your TRON private key.',
        async (pw) => {
          if (!pw || pw.length < 8) { Toast.show({ type: 'error', text1: 'Password must be 8+ chars' }); return }
          const encrypted = encryptPrivateKey(wData.privateKey, pw)
          const { data, error } = await supabase.from('tron_wallets').insert({
            user_id: user.id, address: wData.address,
            encrypted_private_key: encrypted, network,
          }).select().single()
          if (error) { Toast.show({ type: 'error', text1: error.message }); return }
          await loadWallets()
          setActiveWallet(data)
          Toast.show({ type: 'success', text1: 'TRON wallet created! 🎉' })
        }, 'secure-text'
      )
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const handleImport = async () => {
    if (!importPk.trim()) { Toast.show({ type: 'error', text1: 'Enter private key' }); return }
    if (importPw.length < 8) { Toast.show({ type: 'error', text1: 'Password must be 8+ chars' }); return }
    if (importPw !== importPw2) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return }
    try {
      const wData = await tronWalletFromPrivateKey(importPk)
      const encrypted = encryptPrivateKey(wData.privateKey, importPw)
      const { data, error } = await supabase.from('tron_wallets').insert({
        user_id: user.id, address: wData.address,
        encrypted_private_key: encrypted, network,
      }).select().single()
      if (error) throw error
      await loadWallets()
      setActiveWallet(data)
      setImportPk(''); setImportPw(''); setImportPw2('')
      setTab('dashboard')
      Toast.show({ type: 'success', text1: 'TRON wallet imported! 🎉' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const handleSend = async () => {
    if (!sendPw) { setSendError('Enter wallet password'); return }
    setSendError(''); setSendStep('sending')
    try {
      const pk = decryptPrivateKey(activeWallet.encrypted_private_key, sendPw)
      const result = await sendTRX(pk, sendTo, sendAmt, network)
      setTxHash(result.txHash)
      setSendStep('done')
      Toast.show({ type: 'success', text1: 'TRX sent! 🎉' })
      await loadBalance()
    } catch (err) { setSendError(err.message); setSendStep('confirm') }
  }

  const isTestnet = network === 'tron_nile'

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TRON Wallet</Text>
          <TouchableOpacity onPress={() => setNetwork(n => n === 'tron_mainnet' ? 'tron_nile' : 'tron_mainnet')}>
            <View style={[styles.netPill, { backgroundColor: isTestnet ? 'rgba(245,158,11,0.15)' : 'rgba(239,0,39,0.15)' }]}>
              <View style={[styles.netDot, { backgroundColor: isTestnet ? COLORS.warning : COLORS.tron }]} />
              <Text style={{ fontSize: 11, color: isTestnet ? COLORS.warning : COLORS.tron, fontWeight: '700' }}>
                {isTestnet ? 'Nile Testnet' : 'TRON Mainnet'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        {activeWallet && (
          <TouchableOpacity style={styles.addrChip} onPress={async () => { await Clipboard.setStringAsync(activeWallet.address); Toast.show({ type: 'success', text1: 'Address copied!' }) }}>
            <Text style={styles.addrChipText}>{activeWallet.address.slice(0, 8)}…</Text>
            <Text style={{ fontSize: 12 }}>📋</Text>
          </TouchableOpacity>
        )}
      </View>

      {tronWallets.length === 0 ? (
        /* ── No wallet ── */
        <View style={styles.noWallet}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>◈</Text>
          <Text style={styles.noWalletTitle}>No TRON Wallet</Text>
          <Text style={styles.noWalletText}>Create a new TRON wallet or import an existing one.</Text>
          <PrimaryButton title="Create TRON Wallet" onPress={handleCreate} style={{ marginBottom: 12 }} />
          <SecondaryButton title="Import Private Key" onPress={() => setTab('import')} />
          {tab === 'import' && (
            <Card style={{ marginTop: 20, width: '100%' }}>
              <Text style={styles.cardTitle}>Import TRON Wallet</Text>
              <Input label="Private Key" value={importPk} onChangeText={setImportPk} mono placeholder="64-char hex" autoCapitalize="none" />
              <Input label="Password" value={importPw} onChangeText={setImportPw} secureTextEntry placeholder="Min 8 chars" />
              <Input label="Confirm Password" value={importPw2} onChangeText={setImportPw2} secureTextEntry placeholder="Repeat password" />
              <PrimaryButton title="Import" onPress={handleImport} />
            </Card>
          )}
        </View>
      ) : (
        <>
          {/* ── Tab bar ── */}
          <View style={styles.tabBar}>
            {[['dashboard','🏠','Dashboard'],['send','↗','Send'],['receive','↙','Receive'],['import','📥','Import']].map(([k, e, l]) => (
              <TouchableOpacity key={k} style={[styles.tabBtn, tab === k && styles.tabBtnActive]} onPress={() => { setTab(k); setSendStep('form'); setSendError('') }}>
                <Text style={{ fontSize: 16 }}>{e}</Text>
                <Text style={[styles.tabLabel, tab === k && { color: COLORS.accent }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBalance} tintColor={COLORS.tron} />}
          >
            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && (
              <>
                <LinearGradient colors={['#200010', '#0d0e14']} style={styles.balCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 22, color: COLORS.tron }}>◈</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>TRX Balance</Text>
                  </View>
                  <Text style={styles.balValue}>{loading ? '…' : balance !== null ? balance : '—'}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>TRX</Text>
                  {isTestnet && (
                    <TouchableOpacity style={styles.faucetBtn} onPress={() => Linking.openURL(TRON_FAUCET)}>
                      <Text style={{ color: COLORS.warning, fontWeight: '600', fontSize: 12 }}>⚗ Get Testnet TRX from Faucet →</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>

                {/* TRC-20 balances */}
                {Object.keys(trc20Bals).length > 0 && (
                  <Card style={{ marginTop: 12 }}>
                    <Text style={styles.sectionLabel}>TRC-20 Tokens</Text>
                    {Object.entries(trc20Bals).map(([sym, bal]) => (
                      <View key={sym} style={styles.tokenRow}>
                        <View style={styles.tokenAvatar}><Text style={{ color: COLORS.tron, fontSize: 10, fontWeight: '800' }}>{sym.slice(0,3)}</Text></View>
                        <Text style={{ flex: 1, color: COLORS.text, fontWeight: '700' }}>{sym}</Text>
                        <Text style={{ color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>{bal}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                {/* Wallet list */}
                {tronWallets.length > 1 && (
                  <Card style={{ marginTop: 12 }}>
                    <Text style={styles.sectionLabel}>Wallets</Text>
                    {tronWallets.map(w => (
                      <TouchableOpacity key={w.id} style={[styles.walletRow, activeWallet?.id === w.id && styles.walletRowActive]}
                        onPress={() => setActiveWallet(w)}>
                        <Text style={{ color: COLORS.tron, fontSize: 16 }}>◈</Text>
                        <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: COLORS.text }}>{w.address.slice(0, 16)}…</Text>
                        {activeWallet?.id === w.id && <Text style={{ color: COLORS.success }}>✓</Text>}
                      </TouchableOpacity>
                    ))}
                  </Card>
                )}

                <PrimaryButton title="+ Create Another Wallet" onPress={handleCreate} style={{ marginTop: 12 }} />
              </>
            )}

            {/* ── SEND ── */}
            {tab === 'send' && (
              <Card>
                {sendError ? <Alert type="danger">{sendError}</Alert> : null}

                {sendStep === 'form' && (
                  <>
                    <Text style={styles.cardTitle}>Send TRX</Text>
                    <Input label="Recipient TRON Address" value={sendTo} onChangeText={setSendTo} placeholder="T..." mono autoCapitalize="none" />
                    {sendTo && !isValidTronAddress(sendTo) && <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: -8, marginBottom: 8 }}>Invalid TRON address</Text>}
                    <View style={{ marginBottom: SPACING.md }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={styles.label}>Amount (TRX)</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Balance: {balance ?? '…'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="0.00" placeholderTextColor={COLORS.textDim} value={sendAmt} onChangeText={setSendAmt} keyboardType="decimal-pad" />
                        <TouchableOpacity style={styles.maxBtn} onPress={() => balance && setSendAmt(String((parseFloat(balance) * 0.99).toFixed(6)))}>
                          <Text style={{ color: COLORS.accent, fontWeight: '700' }}>MAX</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <PrimaryButton title="Review →" onPress={() => {
                      if (!isValidTronAddress(sendTo)) { setSendError('Invalid address'); return }
                      if (!sendAmt || parseFloat(sendAmt) <= 0) { setSendError('Enter amount'); return }
                      setSendError(''); setSendStep('confirm')
                    }} />
                  </>
                )}

                {sendStep === 'confirm' && (
                  <>
                    <Text style={styles.cardTitle}>Confirm Send</Text>
                    <InfoRow label="To"      value={sendTo} mono />
                    <InfoRow label="Amount"  value={`${sendAmt} TRX`} />
                    <InfoRow label="Network" value={isTestnet ? 'TRON Nile (Testnet)' : 'TRON Mainnet'} last />
                    <Alert type="warning" style={{ marginTop: SPACING.md }}>TRX transactions are irreversible.</Alert>
                    <Input label="Wallet Password" value={sendPw} onChangeText={setSendPw} secureTextEntry placeholder="••••••••" />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <SecondaryButton title="← Back" onPress={() => setSendStep('form')} style={{ flex: 1 }} />
                      <PrimaryButton title="Send TRX" onPress={handleSend} style={{ flex: 1 }} />
                    </View>
                  </>
                )}

                {sendStep === 'sending' && (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Spinner size="large" color={COLORS.tron} />
                    <Text style={[styles.cardTitle, { marginTop: 16, textAlign: 'center' }]}>Broadcasting…</Text>
                  </View>
                )}

                {sendStep === 'done' && (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <Text style={{ fontSize: 56, marginBottom: 12 }}>✅</Text>
                    <Text style={[styles.cardTitle, { textAlign: 'center' }]}>Sent!</Text>
                    <TouchableOpacity style={styles.txBox} onPress={async () => { await Clipboard.setStringAsync(txHash); Toast.show({ type: 'success', text1: 'TX Hash copied!' }) }}>
                      <Text style={{ fontFamily: 'monospace', fontSize: 10, color: COLORS.text, flex: 1 }} numberOfLines={1}>{txHash}</Text>
                      <Text>📋</Text>
                    </TouchableOpacity>
                    <PrimaryButton title="New Transfer" onPress={() => { setSendStep('form'); setSendTo(''); setSendAmt(''); setSendPw('') }} style={{ marginTop: 16, width: '100%' }} />
                  </View>
                )}
              </Card>
            )}

            {/* ── RECEIVE ── */}
            {tab === 'receive' && activeWallet && (
              <Card style={{ alignItems: 'center' }}>
                <View style={[styles.netPill, { backgroundColor: 'rgba(239,0,39,0.12)', marginBottom: 20 }]}>
                  <Text style={{ color: COLORS.tron, fontWeight: '700', fontSize: 12 }}>◈ {isTestnet ? 'TRON Nile' : 'TRON Mainnet'}</Text>
                </View>
                <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 20 }}>
                  <QRCode value={activeWallet.address} size={200} color="#000" backgroundColor="#fff" />
                </View>
                <Text style={styles.label}>Your TRON Address</Text>
                <TouchableOpacity style={styles.addrBox} onPress={async () => { await Clipboard.setStringAsync(activeWallet.address); Toast.show({ type: 'success', text1: 'Copied!' }) }}>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: COLORS.text, flex: 1 }}>{activeWallet.address}</Text>
                  <Text style={{ fontSize: 18 }}>📋</Text>
                </TouchableOpacity>
                {isTestnet && (
                  <Alert type="info" style={{ marginTop: 12, width: '100%' }}>
                    On testnet. Get free TRX from the Nile faucet to test transactions.
                  </Alert>
                )}
              </Card>
            )}

            {/* ── IMPORT ── */}
            {tab === 'import' && (
              <Card>
                <Text style={styles.cardTitle}>Import TRON Wallet</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.md }}>Enter your TRON private key (64 hex characters).</Text>
                <Input label="Private Key" value={importPk} onChangeText={setImportPk} mono placeholder="Enter private key" autoCapitalize="none" autoCorrect={false} />
                <Input label="Password" value={importPw} onChangeText={setImportPw} secureTextEntry placeholder="Min 8 characters" />
                <Input label="Confirm Password" value={importPw2} onChangeText={setImportPw2} secureTextEntry placeholder="Repeat password" />
                <Alert type="warning">Never share your private key. It gives full access to your wallet.</Alert>
                <PrimaryButton title="Import TRON Wallet" onPress={handleImport} />
              </Card>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: SPACING.md, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  netPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start' },
  netDot:  { width: 7, height: 7, borderRadius: 4 },
  addrChip:{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surface2, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  addrChipText: { fontFamily: 'monospace', fontSize: 12, color: COLORS.text },
  noWallet: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  noWalletTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  noWalletText:  { color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  tabBar: { flexDirection: 'row', marginHorizontal: SPACING.md, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 4, marginBottom: 4 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.sm - 2, gap: 2 },
  tabBtnActive: { backgroundColor: COLORS.surface },
  tabLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  balCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: 'rgba(239,0,39,0.2)' },
  balValue: { fontSize: 36, fontWeight: '800', color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  faucetBtn: { marginTop: 12, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 10 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tokenAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,0,39,0.12)', justifyContent: 'center', alignItems: 'center' },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8 },
  walletRowActive: { backgroundColor: COLORS.surface3 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontSize: 13, borderWidth: 1.5, borderColor: COLORS.border, fontFamily: 'monospace' },
  maxBtn: { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  addrBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, width: '100%', gap: 8, marginTop: 8 },
  txBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, width: '100%', gap: 8, marginTop: 12 },
})
