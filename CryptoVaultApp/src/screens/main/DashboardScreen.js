// src/screens/main/DashboardScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import { useApp } from '../../context/AppContext'
import { getNativeBalance, getTokenBalance, formatBalance, shortenAddress } from '../../services/blockchain/walletService'
import { getTokens } from '../../services/supabase/walletDbService'
import { fetchPrices } from '../../services/priceService'
import { getNetwork, NETWORKS } from '../../utils/networks'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { Card, Badge, Spinner, Alert } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function DashboardScreen({ navigation }) {
  const { activeWallet, activeNetwork, wallets, setActiveWallet, setActiveNetwork, prefs } = useApp()
  const [nativeBal,    setNativeBal]    = useState(null)
  const [tokens,       setTokens]       = useState([])
  const [tokenBals,    setTokenBals]    = useState({})
  const [price,        setPrice]        = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [showNetworks, setShowNetworks] = useState(false)
  const [showWallets,  setShowWallets]  = useState(false)
  const network = getNetwork(activeNetwork)

  const fetchAll = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const [bal, tks] = await Promise.all([
        getNativeBalance(activeWallet.address, activeNetwork),
        getTokens(activeWallet.address, activeNetwork),
      ])
      setNativeBal(bal); setTokens(tks)
      const bals = {}
      await Promise.allSettled(tks.map(async tk => {
        try {
          const info = await getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
          bals[tk.contract_address] = info.balance
        } catch { bals[tk.contract_address] = null }
      }))
      setTokenBals(bals)
      if (network.coingeckoId) {
        const p = await fetchPrices([network.coingeckoId])
        setPrice(p[network.coingeckoId]?.usd || null)
      }
    } catch (e) { Toast.show({ type: 'error', text1: 'Failed to load balances', text2: e.message }) }
    finally { setLoading(false) }
  }, [activeWallet, activeNetwork])

  useEffect(() => { fetchAll() }, [fetchAll])

  const copyAddress = async () => {
    await Clipboard.setStringAsync(activeWallet.address)
    Toast.show({ type: 'success', text1: '📋 Address copied!' })
  }

  const usd = nativeBal && price
    ? (parseFloat(nativeBal) * price).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null

  const hidden = prefs?.hideBalances

  if (!activeWallet) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.empty}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>👛</Text>
        <Text style={styles.emptyTitle}>No Wallet Yet</Text>
        <Text style={styles.emptyText}>Create or import a wallet to get started.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('CreateWallet')}>
          <LinearGradient colors={['#7c6ff7','#4facfe']} style={styles.btnGrad}>
            <Text style={styles.btnText}>+ Create Wallet</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSec} onPress={() => navigation.navigate('ImportWallet')}>
          <Text style={styles.btnSecText}>Import Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={COLORS.accent} />}
      >
        {/* ── Header bar ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.walletChip} onPress={() => setShowWallets(v => !v)}>
            <View style={styles.walletAvatar}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.accent, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                {activeWallet.address.slice(2, 4).toUpperCase()}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.text, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
              {shortenAddress(activeWallet.address)}
            </Text>
            <Text style={{ color: COLORS.textDim, fontSize: 11 }}>{showWallets ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.networkChip} onPress={() => setShowNetworks(v => !v)}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: network.color, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: COLORS.text, fontWeight: '600' }}>{network.name}</Text>
            {network.isTestnet && <Badge label="Test" type="warning" style={{ marginLeft: 6 }} />}
          </TouchableOpacity>
        </View>

        {/* ── Wallet switcher dropdown ── */}
        {showWallets && (
          <Card style={{ marginBottom: 12 }}>
            {wallets.map(w => (
              <TouchableOpacity key={w.id} style={[styles.walletRow, activeWallet?.id === w.id && styles.walletRowActive]}
                onPress={() => { setActiveWallet(w); setShowWallets(false) }}>
                <View style={styles.walletAvatar}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.accent }}>{w.address.slice(2,4).toUpperCase()}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 12, color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>{shortenAddress(w.address)}</Text>
                {activeWallet?.id === w.id && <Text style={{ color: COLORS.success }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 8 }} />
            <TouchableOpacity onPress={() => { setShowWallets(false); navigation.navigate('CreateWallet') }}>
              <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>+ New Wallet</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ── Network switcher dropdown ── */}
        {showNetworks && (
          <Card style={{ marginBottom: 12 }}>
            <Text style={styles.sectionLabel}>Select Network</Text>
            {Object.values(NETWORKS).map(n => (
              <TouchableOpacity key={n.id} style={[styles.networkRow, activeNetwork === n.id && { backgroundColor: COLORS.surface3 }]}
                onPress={() => { setActiveNetwork(n.id); setShowNetworks(false) }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: n.color, marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>{n.name}</Text>
                  {n.isTestnet && <Text style={{ color: COLORS.warning, fontSize: 10 }}>TESTNET</Text>}
                </View>
                {activeNetwork === n.id && <Text style={{ color: n.color }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* ── Balance hero card ── */}
        <LinearGradient colors={['#13151e', '#0d0e14']} style={[styles.balanceCard, SHADOWS.md]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <View>
              <Text style={styles.balLabel}>Total Balance</Text>
              <Text style={styles.balValue}>
                {loading ? '…' : hidden ? '••••••' : nativeBal !== null ? formatBalance(nativeBal, 6) : '—'}
                <Text style={{ fontSize: 18, color: COLORS.textMuted, fontWeight: '400' }}>  {network.currency.symbol}</Text>
              </Text>
              {usd && !hidden && <Text style={styles.usdVal}>≈ {usd}</Text>}
            </View>
            <TouchableOpacity onPress={fetchAll} style={styles.refreshBtn}>
              <Text style={{ fontSize: 18 }}>↻</Text>
            </TouchableOpacity>
          </View>

          {/* Address */}
          <TouchableOpacity style={styles.addressBox} onPress={copyAddress}>
            <Text style={styles.addressText} numberOfLines={1}>{activeWallet.address}</Text>
            <Text style={{ fontSize: 14 }}>📋</Text>
          </TouchableOpacity>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            {[
              { label: 'Send',    emoji: '↗', screen: 'Send',    color: '#f43f5e' },
              { label: 'Receive', emoji: '↙', screen: 'Receive', color: '#10b981' },
              { label: 'Swap',    emoji: '⇄', screen: 'Swap',    color: '#7c6ff7' },
              { label: 'Tokens',  emoji: '🪙', screen: 'Tokens',  color: '#f59e0b' },
            ].map(a => (
              <TouchableOpacity key={a.label} style={styles.quickBtn} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.quickIcon, { backgroundColor: `${a.color}20` }]}>
                  <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {network.isTestnet && (
            <View style={styles.testnetBanner}>
              <Text style={{ color: COLORS.warning, fontSize: 11 }}>⚗ Testnet — funds have no real value</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Assets list ── */}
        <Card style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={styles.sectionTitle}>Assets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Tokens')}>
              <Text style={{ color: COLORS.accent, fontSize: 13 }}>Manage →</Text>
            </TouchableOpacity>
          </View>

          {/* Native */}
          <AssetRow
            symbol={network.currency.symbol}
            name={network.currency.name}
            balance={nativeBal !== null ? formatBalance(nativeBal) : '…'}
            color={network.color}
            loading={loading}
            hidden={hidden}
          />

          {tokens.map(tk => (
            <AssetRow key={tk.id}
              symbol={tk.symbol} name={tk.name}
              balance={tokenBals[tk.contract_address] != null ? formatBalance(tokenBals[tk.contract_address]) : '…'}
              color={COLORS.accent}
              loading={loading}
              hidden={hidden}
            />
          ))}

          {tokens.length === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Tokens')}>
              <Text style={{ color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
                No tokens. Tap to add →
              </Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* ── More options ── */}
        <View style={styles.moreGrid}>
          {[
            { label: 'History',  emoji: '📋', screen: 'Transactions' },
            { label: 'NFTs',     emoji: '🖼',  screen: 'NFTs' },
          ].map(item => (
            <TouchableOpacity key={item.label} style={styles.moreCard} onPress={() => navigation.navigate(item.screen)}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>{item.emoji}</Text>
              <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function AssetRow({ symbol, name, balance, color, loading, hidden }) {
  return (
    <View style={styles.assetRow}>
      <View style={[styles.assetIcon, { backgroundColor: `${color}22` }]}>
        <Text style={{ fontSize: 11, fontWeight: '800', color, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
          {symbol.slice(0, 3)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>{symbol}</Text>
        <Text style={{ fontSize: 11, color: COLORS.textDim }}>{name}</Text>
      </View>
      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
        {loading ? '…' : hidden ? '••••' : balance}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.bg },
  scroll:{ padding: SPACING.md },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptyText:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  btn: { width: '100%', borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: 12 },
  btnGrad: { paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSec:  { width: '100%', paddingVertical: 13, alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border2 },
  btnSecText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface2, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },
  walletAvatar: { width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center' },
  networkChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border },

  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  balLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  balValue: { fontSize: 30, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  usdVal:   { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center' },
  addressBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface3, borderRadius: RADIUS.md, padding: 10, marginTop: 4, marginBottom: 16, gap: 8 },
  addressText: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { alignItems: 'center', flex: 1 },
  quickIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  testnetBanner: { marginTop: 12, padding: 8, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: RADIUS.md, alignItems: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  assetIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  moreGrid: { flexDirection: 'row', gap: 12, marginTop: 12 },
  moreCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8 },
  walletRowActive: { backgroundColor: COLORS.surface3 },
  networkRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 4 },
})
