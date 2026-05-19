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
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, Alert, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function TokensScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const { colors } = useTheme()
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
        try {
          const info = await getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
          bals[tk.contract_address] = info.balance
        } catch { bals[tk.contract_address] = null }
      }))
      setBalances(bals)
    } catch {}
    setLoading(false); setRefreshing(false)
  }, [activeWallet, activeNetwork])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handlePreview = async () => {
    setError(''); setPreview(null)
    if (!isValidAddress(contractAddr)) { setError('Invalid contract address'); return }
    setPrevLoading(true)
    try {
      const info = await validateToken(contractAddr, activeNetwork)
      setPreview(info)
    } catch { setError('Token not found on this network') }
    setPrevLoading(false)
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
    } catch (err) { setError(err.message) }
    setAddLoading(false)
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
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTokens() }} tintColor={colors.accent} />
      }
    >
      {/* Add Token Panel */}
      <View style={[styles.addCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.addHeader} onPress={() => setShowAdd(v => !v)}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>+ Add ERC-20 Token</Text>
          <Text style={{ color: colors.textSub, fontSize: 18 }}>{showAdd ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showAdd && (
          <View style={{ marginTop: SPACING.md }}>
            {error ? <Alert type="danger" style={{ marginBottom: SPACING.md }}>{error}</Alert> : null}

            <Text style={[styles.label, { color: colors.textSub }]}>Contract Address</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.monoInput, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border, color: colors.text }]}
                placeholder="0x..."
                placeholderTextColor={colors.textDim}
                value={contractAddr}
                onChangeText={t => { setContractAddr(t); setPreview(null); setError('') }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.lookupBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
                onPress={handlePreview}
                disabled={prevLoading}
              >
                {prevLoading ? <Spinner size="small" /> : <Text style={{ color: colors.accent, fontWeight: '700' }}>Look up</Text>}
              </TouchableOpacity>
            </View>

            {preview && (
              <View style={[styles.previewBox, { backgroundColor: colors.surface2, borderColor: `${colors.success}40` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.tokenAvatar, { backgroundColor: colors.accentDim }]}>
                    <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>{preview.symbol.slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{preview.symbol}</Text>
                    <Text style={{ color: colors.textSub, fontSize: 12 }}>{preview.name} · {preview.decimals} decimals</Text>
                  </View>
                  <Text style={{ color: colors.success, fontSize: 18 }}>✓</Text>
                </View>
                <PrimaryButton title={`Add ${preview.symbol}`} onPress={handleAdd} loading={addLoading} style={{ marginTop: 12 }} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Token list */}
      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}><Spinner /></View>
      ) : tokens.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🪙</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No ERC-20 Tokens</Text>
          <Text style={{ fontSize: 14, color: colors.textSub, textAlign: 'center', lineHeight: 20 }}>
            Add any ERC-20 token on {network.name} using its contract address above.
          </Text>
        </View>
      ) : (
        <View style={[styles.tokenList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {tokens.map((tk, i) => (
            <View key={tk.id}>
              <View style={styles.tokenRow}>
                <View style={[styles.tokenAvatar, { backgroundColor: colors.surface2 }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{tk.symbol.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{tk.symbol}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 1 }}>{tk.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.textDim, fontFamily: 'monospace', marginTop: 1 }}>
                    {tk.contract_address.slice(0, 14)}…
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>
                    {balances[tk.contract_address] != null ? formatBalance(balances[tk.contract_address]) : '…'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 1 }}>{tk.symbol}</Text>
                </View>
                <TouchableOpacity
                  style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => handleDelete(tk)}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {i < tokens.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: SPACING.md }} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  addCard:    { borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.md },
  addHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  monoInput:  { padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, fontFamily: 'monospace', fontSize: 12 },
  lookupBtn:  { padding: 12, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  previewBox: { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginTop: SPACING.md },
  tokenList:  { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  tokenRow:   { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  tokenAvatar:{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
})
