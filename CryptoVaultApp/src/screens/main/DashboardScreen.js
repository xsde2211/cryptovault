// src/screens/main/DashboardScreen.js
// Changes from previous version:
// - Send icon: red circle with white up-arrow (visible in both modes)
// - Receive icon: green circle with white down-arrow
// - All action icons have solid colored backgrounds, not transparent
// - Full light/dark theme support via useTheme()

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { getNativeBalance, formatBalance, shortenAddress } from '../../services/blockchain/walletService'
import { fetchPrices, formatPrice } from '../../services/priceService'
import { getTokens, getTransactions } from '../../services/supabase/walletDbService'
import { getUserCards } from '../../services/supabase/cardService'
import { getNetwork } from '../../utils/networks'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS, GRADIENTS, FONT } from '../../utils/theme'
import { Spinner } from '../../components/UI'

// Simple sparkline using view bars
const SparkBar = ({ value, max, color }) => (
  <View style={{
    width: 3,
    height: Math.max(4, (value / max) * 48),
    backgroundColor: color,
    borderRadius: 2,
    marginHorizontal: 1,
  }} />
)

// ── Quick Actions config ──────────────────────────────────────
// Each action has a solid bg color so icon is always visible in both modes
const getActions = (colors) => [
  {
    screen: 'Send',
    label: 'Send',
    // Improved: solid red background with white arrow — visible in light & dark
    iconBg:   '#ff4d6d',
    iconColor:'#ffffff',
    icon:     '↑',
  },
  {
    screen: 'Receive',
    label: 'Receive',
    // Improved: solid green background with white arrow
    iconBg:   '#00d4aa',
    iconColor:'#ffffff',
    icon:     '↓',
  },
  {
    screen: 'Swap',
    label: 'Swap',
    iconBg:   '#6c63ff',
    iconColor:'#ffffff',
    icon:     '⇄',
  },
  {
    screen: 'TRON',
    label: 'TRON',
    iconBg:   '#ff2d55',
    iconColor:'#ffffff',
    icon:     '◈',
  },
  {
    screen: 'Cards',
    label: 'Cards',
    iconBg:   '#4facfe',
    iconColor:'#ffffff',
    icon:     '💳',
  },
  {
    screen: 'P2P',
    label: 'P2P',
    iconBg:   '#ffb830',
    iconColor:'#ffffff',
    icon:     '🏪',
  },
  {
    screen: 'Transactions',
    label: 'History',
    iconBg:   '#00bcd4',
    iconColor:'#ffffff',
    icon:     '📋',
  },
  {
    screen: 'Watchlist',
    label: 'Markets',
    iconBg:   '#a855f7',
    iconColor:'#ffffff',
    icon:     '⭐',
  },
]

export default function DashboardScreen() {
  const navigation = useNavigation()
  const { activeWallet, activeNetwork, wallets, prefs, loadWallets, user } = useApp()
  const { colors } = useTheme()
  const network = getNetwork(activeNetwork)

  const [balance,    setBalance]    = useState(null)
  const [price,      setPrice]      = useState(null)
  const [tokens,     setTokens]     = useState([])
  const [recentTxs,  setRecentTxs]  = useState([])
  const [cardCount,  setCardCount]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sparkData, setSparkData] = useState([])

  const load = useCallback(async () => {
    if (!activeWallet) { setLoading(false); return }
    try {
      const [bal, tks, txs, cards] = await Promise.all([
        getNativeBalance(activeWallet.address, activeNetwork),
        getTokens(activeWallet.address, activeNetwork),
        getTransactions(activeWallet.address).catch(() => []),
        getUserCards().catch(() => []),
      ])
      setBalance(bal)
      setTokens(tks.slice(0, 4))
      setRecentTxs(txs.slice(0, 3))
      setCardCount(cards.length)
      if (network.coingeckoId) {
        const p = await fetchPrices([network.coingeckoId]) 
        setPrice(p[network.coingeckoId]?.usd || null)

        try {
        const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/${network.coingeckoId}/market_chart?vs_currency=usd&days=7&interval=daily`
        )
        const json = await resp.json()
        if (json.prices) setSparkData(json.prices.map(p => p[1]))
        } catch {}
      }
    } catch {}
    setLoading(false); setRefreshing(false)
  }, [activeWallet, activeNetwork])

  useEffect(() => { load() }, [load])

  const usdBal      = balance && price ? parseFloat(balance) * price : null
  const userEmail   = user?.email || ''
  const firstName   = userEmail.split('@')[0].split('.')[0]
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  const ACTIONS = getActions(colors)

  const s = makeStyles(colors)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadWallets(); load() }}
            tintColor={colors.accent}
          />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <LinearGradient colors={GRADIENTS.accent} style={s.avatar}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.bg }} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.greetSub}>WELCOME BACK,</Text>
            <Text style={s.greetName}>{displayName || 'User'}</Text>
          </View>
          <TouchableOpacity style={[s.headerBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => navigation.navigate('Watchlist')}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* ── Portfolio Card ── */}
        <View style={[s.portfolioCard, { borderColor: colors.border2 }]}>
          <LinearGradient
            colors={colors === require('../../utils/theme').DARK
              ? ['#1e2040', '#13141f']
              : ['#e8eaf6', '#ffffff']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[s.cardGlow, { backgroundColor: `${colors.accent}15` }]} />

          <View style={s.portfolioTop}>
            <Text style={[s.portfolioLabel, { color: colors.textSub }]}>Total Portfolio Value</Text>
            {price && (
              <View style={[s.priceBadge, { backgroundColor: `${colors.success}18` }]}>
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
                  {network.currency.symbol} {formatPrice(price)}
                </Text>
              </View>
            )}
          </View>

          <Text style={[s.portfolioValue, { color: colors.text }]}>
            {loading ? '···'
              : prefs.hideBalances ? '••••••'
              : usdBal != null
                ? `$${usdBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : balance != null ? formatBalance(balance, 6) : '—'}
          </Text>

          {balance != null && !prefs.hideBalances && (
            <Text style={[s.portfolioSub, { color: colors.textSub }]}>
              ≈ {formatBalance(balance, 6)} {network.currency.symbol}
            </Text>
          )}

          {/* Spark */}
          {/* Replace the sparkRow View content */}
          <View style={s.sparkRow}>
            {sparkData.length > 0 ? (
              sparkData.map((v, i) => (
                <SparkBar
                  key={i}
                  value={v}
                  max={Math.max(...sparkData)}
                  color={i === sparkData.length - 1 ? colors.accent : `${colors.accent}60`}
                />
              ))
            ) : (
              // Fallback skeleton bars while loading
              Array.from({ length: 14 }, (_, i) => (
                <View key={i} style={{
                  width: 3,
                  height: Math.max(4, Math.random() * 40 + 8),
                  backgroundColor: `${colors.accent}30`,
                  borderRadius: 2,
                  marginHorizontal: 1,
                }} />
              ))
            )}
          </View>

          {/* Footer */}
          <View style={s.cardFooter}>
            <View style={[s.netPill, { backgroundColor: `${network.color}18`, borderColor: `${network.color}35` }]}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: network.color }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: network.color }}>{network.name}</Text>
              {network.isTestnet && <Text style={{ fontSize: 8, color: colors.warning, fontWeight: '800', marginLeft: 2 }}>TEST</Text>}
            </View>
            {activeWallet && (
              <Text style={[s.walletAddr, { color: colors.textSub }]}>{shortenAddress(activeWallet.address)}</Text>
            )}
          </View>

          {!activeWallet && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
          style={{
          backgroundColor: colors.accent,   // solid accent — visible in both modes
          borderRadius: RADIUS.md,
          paddingHorizontal: 18,
          paddingVertical: 10,
          ...SHADOWS.sm,
          }}
          onPress={() => navigation.navigate('CreateWallet')}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Create Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
          style={{
          backgroundColor: colors.surface,
          borderRadius: RADIUS.md,
          paddingHorizontal: 18,
          paddingVertical: 10,
          borderWidth: 1.5,
          borderColor: colors.accent,
          }}
          onPress={() => navigation.navigate('ImportWallet')}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>Import</Text>
          </TouchableOpacity>
          </View>
          )}
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.actionsGrid}>
          {ACTIONS.map(a => (
            <TouchableOpacity
              key={a.screen}
              style={s.actionBtn}
              onPress={() => navigation.navigate(a.screen)}
              activeOpacity={0.75}
            >
              {/* Solid colored circle — always visible in dark & light */}
              <View style={[s.actionIcon, { backgroundColor: a.iconBg }]}>
                <Text style={{ fontSize: 20, color: a.iconColor }}>{a.icon}</Text>
              </View>
              <Text style={[s.actionLabel, { color: colors.textSub }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Cards strip ── */}
        {cardCount > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Cards')} activeOpacity={0.85} style={{ marginBottom: SPACING.md }}>
            <LinearGradient colors={GRADIENTS.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[s.cardStrip, SHADOWS.accent]}>
              <Text style={{ fontSize: 24 }}>💳</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardStripTitle}>Virtual Cards Active</Text>
                <Text style={s.cardStripSub}>{cardCount} card{cardCount !== 1 ? 's' : ''} · Tap to manage</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Top Assets ── */}
        {(tokens.length > 0 || balance != null) && (
          <View style={{ marginBottom: SPACING.md }}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Top Assets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tokens')}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Native */}
            {balance != null && (
              <View style={[s.assetRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <LinearGradient colors={[`${network.color}30`, `${network.color}10`]} style={s.assetIcon}>
                  <Text style={{ fontSize: 20 }}>{network.icon}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.assetName, { color: colors.text }]}>{network.currency.name}</Text>
                  <Text style={[s.assetSym, { color: colors.textSub }]}>{network.currency.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.assetBal, { color: colors.text }]}>
                    {prefs.hideBalances ? '••••' : formatBalance(balance, 4)}
                  </Text>
                  {usdBal != null && !prefs.hideBalances && (
                    <Text style={[s.assetSym, { color: colors.textSub }]}>
                      ${usdBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ERC-20s */}
            {tokens.map(tk => (
              <View key={tk.id} style={[s.assetRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[s.assetIcon, { backgroundColor: colors.accentDim }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>{tk.symbol.slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.assetName, { color: colors.text }]}>{tk.symbol}</Text>
                  <Text style={[s.assetSym, { color: colors.textSub }]}>{tk.name}</Text>
                </View>
                <Text style={[s.assetSym, { color: colors.textSub }]}>ERC-20</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Recent Activity ── */}
        {recentTxs.length > 0 && (
          <View style={{ marginBottom: SPACING.md }}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={{ position: 'relative' }}>
              <View style={[s.timelineLine, { backgroundColor: colors.border }]} />
              {recentTxs.map(tx => {
                const isSend = tx.type === 'send' || tx.type === 'swap'
                return (
                  <View key={tx.id} style={s.activityRow}>
                    <View style={[s.timelineDot, { backgroundColor: isSend ? colors.danger : colors.success }]} />
                    <View style={[s.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {tx.type === 'swap' ? 'SWAPPED' : isSend ? 'SENT' : 'RECEIVED'} {network.currency.symbol}
                        </Text>
                        <Text style={{ color: colors.textSub, fontSize: 11 }}>{formatTimeAgo(tx.created_at)}</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                        {isSend ? '-' : '+'}{tx.amount ? parseFloat(tx.amount).toFixed(6) : '?'} {network.currency.symbol}
                      </Text>
                      <Text style={{ color: colors.textDim, fontSize: 10, fontFamily: FONT.mono, marginTop: 2 }}>
                        Trans ID: #{tx.tx_hash?.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* ── No wallet CTA ── */}
        {!activeWallet && !loading && (
          <View style={[s.noWalletCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>👛</Text>
            <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 8 }]}>Create Your First Wallet</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg }}>
              Generate a secure BIP39 seed phrase wallet or import an existing one.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
                onPress={() => navigation.navigate('CreateWallet')}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>+ Create</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctaBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ImportWallet')}>
                <Text style={{ color: colors.textSub, fontWeight: '700' }}>Import</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function formatTimeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const makeStyles = (C) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  // Header
  header:     { flexDirection: 'row', alignItems: 'center', paddingTop: SPACING.md, marginBottom: SPACING.lg },
  headerLeft: { position: 'relative' },
  avatar:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  greetSub:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.textSub, marginBottom: 1 },
  greetName:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerBtn:  { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  // Portfolio
  portfolioCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, overflow: 'hidden', minHeight: 200, ...SHADOWS.md,
  },
  cardGlow:     { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100 },
  portfolioTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  portfolioLabel:{ fontSize: 13, fontWeight: '500' },
  priceBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  portfolioValue:{ fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 4 },
  portfolioSub: { fontSize: 14, marginBottom: SPACING.md },
  sparkRow:     { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.md, height: 52 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netPill:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  walletAddr:   { fontSize: 11, fontFamily: FONT.mono },
  // Actions — 4 per row
  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.md },
  actionBtn:    { width: '25%', alignItems: 'center', paddingVertical: 10 },
  // Solid colored icon box — clearly visible in both light & dark
  actionIcon:   { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6, ...SHADOWS.sm },
  actionLabel:  { fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 0.1 },
  // Card strip
  cardStrip:    { borderRadius: RADIUS.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardStripTitle:{ color: '#fff', fontWeight: '800', fontSize: 15 },
  cardStripSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  // Assets
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  assetRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: RADIUS.lg, marginBottom: 8, borderWidth: 1, ...SHADOWS.sm },
  assetIcon:    { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  assetName:    { fontSize: 15, fontWeight: '700' },
  assetSym:     { fontSize: 12, marginTop: 1 },
  assetBal:     { fontSize: 15, fontWeight: '700', fontFamily: FONT.mono },
  // Activity timeline
  timelineLine: { position: 'absolute', left: 14, top: 20, bottom: 20, width: 1.5 },
  activityRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  timelineDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  activityCard: { flex: 1, padding: 14, borderRadius: RADIUS.lg, borderWidth: 1, ...SHADOWS.sm },
  // No wallet
  noWalletCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, marginBottom: SPACING.xl },
  ctaBtn:       { paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
})
