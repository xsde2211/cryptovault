// src/screens/main/TokensScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl, Alert as RNAlert,
} from 'react-native'
import { validateToken, getTokenBalance, isValidAddress, formatBalance } from '../../services/blockchain/walletService'
import { saveToken, getTokens, deleteToken, tokenExists } from '../../services/supabase/walletDbService'
import { getNetwork } from '../../utils/networks'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, Alert, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function TokensScreen({ navigation }) {
  const { activeWallet, activeNetwork } = useApp()
  const network = getNetwork(activeNetwork)
  const [tokens,      setTokens]      = useState([])
  const [balances,    setBalances]    = useState({})
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [contractAddr,setContractAddr]= useState('')
  const [preview,     setPreview]     = useState(null)
  const [prevLoading, setPrevLoading] = useState(false)
  const [addLoading,  setAddLoading]  = useState(false)
  const [error,       setError]       = useState('')
  const [showAdd,     setShowAdd]     = useState(false)

  const loadTokens = useCallback(async () => {
    if (!activeWallet) return
    try {
      const tks = await getTokens(activeWallet.address, activeNetwork)
      setTokens(tks)
      const bals = {}
      await Promise.allSettled(tks.map(async tk => {
        try { const info = await getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork); bals[tk.contract_address] = info.balance } catch { bals[tk.contract_address] = null }
      }))
      setBalances(bals)
    } catch {} finally { setLoading(false); setRefreshing(false) }
  }, [activeWallet, activeNetwork])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handlePreview = async () => {
    setError(''); setPreview(null)
    if (!isValidAddress(contractAddr)) { setError('Invalid contract address'); return }
    setPrevLoading(true)
    try {
      const info = await validateToken(contractAddr, activeNetwork)
      setPreview(info)
    } catch { setError('Token not found on this network') } finally { setPrevLoading(false) }
  }

  const handleAdd = async () => {
    if (!preview || !activeWallet) return
    setAddLoading(true); setError('')
    try {
      const exists = await tokenExists(preview.address, activeWallet.address, activeNetwork)
      if (exists) { setError('Token already added'); setAddLoading(false); return }
      await saveToken({ contractAddress: preview.address, symbol: preview.symbol, name: preview.name, decimals: preview.decimals, network: activeNetwork, walletAddress: activeWallet.address })
      await loadTokens()
      setContractAddr(''); setPreview(null); setShowAdd(false)
      Toast.show({ type: 'success', text1: `${preview.symbol} added! ✅` })
    } catch (err) { setError(err.message) } finally { setAddLoading(false) }
  }

  const handleDelete = (tk) => {
    RNAlert.alert('Remove Token', `Remove ${tk.symbol} from your wallet?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await deleteToken(tk.id); await loadTokens(); Toast.show({ type: 'success', text1: `${tk.symbol} removed` }) }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
      }},
    ])
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTokens() }} tintColor={COLORS.accent} />}
    >
      {/* Add token panel */}
      <Card style={{ marginBottom: SPACING.md }}>
        <TouchableOpacity style={styles.addHeader} onPress={() => setShowAdd(v => !v)}>
          <Text style={styles.addTitle}>+ Add ERC-20 Token</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>{showAdd ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAdd && (
          <>
            {error ? <Alert type="danger">{error}</Alert> : null}
            <View style={{ marginBottom: SPACING.sm }}>
              <Text style={styles.label}>Contract Address</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.monoInput, { flex: 1, marginRight: 8 }]}
                  placeholder="0x..."
                  placeholderTextColor={COLORS.textDim}
                  value={contractAddr}
                  onChangeText={t => { setContractAddr(t); setPreview(null); setError('') }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.lookupBtn} onPress={handlePreview} disabled={prevLoading}>
                  {prevLoading ? <Spinner size="small" /> : <Text style={{ color: COLORS.accent, fontWeight: '700' }}>Look up</Text>}
                </TouchableOpacity>
              </View>
            </View>

            {preview && (
              <View style={styles.previewBox}>
                <View style={styles.previewRow}>
                  <View style={styles.tokenAvatar}><Text style={styles.tokenAvatarText}>{preview.symbol.slice(0, 3)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>{preview.symbol}</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{preview.name} · {preview.decimals} decimals</Text>
                  </View>
                  <Text style={{ color: COLORS.success, fontSize: 18 }}>✓</Text>
                </View>
                <PrimaryButton title={`Add ${preview.symbol}`} onPress={handleAdd} loading={addLoading} style={{ marginTop: 12 }} />
              </View>
            )}
          </>
        )}
      </Card>

      {/* Token list */}
      {loading ? (
        <View style={styles.centered}><Spinner /></View>
      ) : tokens.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🪙</Text>
          <Text style={styles.emptyTitle}>No ERC-20 Tokens</Text>
          <Text style={styles.emptyDesc}>Add any ERC-20 token on {network.name} using its contract address above.</Text>
        </View>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {tokens.map((tk, i) => (
            <View key={tk.id}>
              <View style={styles.tokenRow}>
                <View style={styles.tokenAvatar}>
                  <Text style={styles.tokenAvatarText}>{tk.symbol.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tokenSymbol}>{tk.symbol}</Text>
                  <Text style={styles.tokenName} numberOfLines={1}>{tk.name}</Text>
                  <Text style={styles.tokenAddr} numberOfLines={1}>{tk.contract_address.slice(0, 14)}…</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.tokenBalance}>
                    {balances[tk.contract_address] != null ? formatBalance(balances[tk.contract_address]) : '…'}
                  </Text>
                  <Text style={styles.tokenBalanceSym}>{tk.symbol}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(tk)}>
                  <Text style={{ color: COLORS.danger, fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {i < tokens.length - 1 && <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md }} />}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll:    { padding: SPACING.lg, paddingBottom: 40 },
  centered:  { paddingVertical: 60, alignItems: 'center' },
  addHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.accent },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6, marginTop: SPACING.md },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  monoInput: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontSize: 12, borderWidth: 1.5, borderColor: COLORS.border, fontFamily: 'monospace' },
  lookupBtn: { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  previewBox: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  tokenAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center' },
  tokenAvatarText: { fontSize: 10, fontWeight: '800', color: COLORS.accent },
  tokenSymbol:  { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tokenName:    { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  tokenAddr:    { fontSize: 10, color: COLORS.textDim, fontFamily: 'monospace', marginTop: 1 },
  tokenBalance: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
  tokenBalanceSym: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  deleteBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
})
