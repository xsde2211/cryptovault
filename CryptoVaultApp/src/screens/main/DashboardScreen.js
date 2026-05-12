// src/screens/main/DashboardScreen.js
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

// Spark line using simple View bars (no chart lib needed)
const SparkBar = ({ value, max, color }) => (
  <View style={{ width: 3, height: Math.max(4, (value / max) * 48), backgroundColor: color, borderRadius: 2, marginHorizontal: 1 }} />
)

const MOCK_SPARK = [30, 45, 28, 60, 42, 75, 55, 80, 65, 90, 70, 95, 72, 85, 60, 88, 76, 92, 68, 100]

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
      }
    } catch {}
    setLoading(false); setRefreshing(false)
  }, [activeWallet, activeNetwork])

  useEffect(() => { load() }, [load])

  const usdBal    = balance && price ? parseFloat(balance) * price : null
  const userEmail = user?.email || ''
  const firstName = userEmail.split('@')[0].split('.')[0]
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1)

  // Quick actions
  const ACTIONS = [
    { icon: '↑', label: 'Send',    color: colors.danger,   screen: 'Send' },
    { icon: '↓', label: 'Receive', color: colors.success,  screen: 'Receive' },
    { icon: '⇄', label: 'Swap',    color: colors.accent,   screen: 'Swap' },
    { icon: '◈', label: 'TRON',    color: colors.tron,     screen: 'TRON' },
    { icon: '💳', label: 'Cards',   color: '#4facfe',       screen: 'Cards' },
    { icon: '🏪', label: 'P2P',     color: colors.warning,  screen: 'P2P' },
    { icon: '📋', label: 'History', color: colors.info,     screen: 'Transactions' },
    { icon: '⭐', label: 'Markets', color: '#a855f7',       screen: 'Watchlist' },
  ]

  const s = makeStyles(colors)

  return (
    <SafeAreaView style={[s.safe]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWallets(); load() }} tintColor={colors.accent} />
        }
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.avatarWrap}>
              <LinearGradient colors={GRADIENTS.accent} style={s.avatar}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={s.onlineDot} />
            </View>
            <View>
              <Text style={s.greetSub}>WELCOME BACK,</Text>
              <Text style={s.greetName}>{displayName || 'User'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate('Watchlist')}>
              <Text style={{ fontSize: 18 }}>🔔</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Portfolio Card ── */}
        <View style={s.portfolioCard}>
          {/* subtle background gradient */}
          <LinearGradient
            colors={[colors.surface2, colors.surface]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: RADIUS.xl }]}>
            <View style={s.cardGlow} />
          </View>

          <View style={s.portfolioTop}>
            <Text style={s.portfolioLabel}>Total Portfolio Value</Text>
            {price && (
              <View style={[s.changeBadge, { backgroundColor: `${colors.success}20` }]}>
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>
                  {network.currency.symbol} {formatPrice(price)}
                </Text>
              </View>
            )}
          </View>

          <Text style={s.portfolioValue}>
            {loading ? '···' : prefs.hideBalances ? '••••••' :
              usdBal != null ? `$${usdBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` :
              (balance != null ? formatBalance(balance, 6) : '—')}
          </Text>

          {balance != null && !prefs.hideBalances && (
            <Text style={s.portfolioSub}>
              ≈ {formatBalance(balance, 6)} {network.currency.symbol}
            </Text>
          )}

          {/* Spark line */}
          <View style={s.sparkRow}>
            {MOCK_SPARK.map((v, i) => (
              <SparkBar key={i} value={v} max={100} color={i > 15 ? colors.accent : `${colors.accent}50`} />
            ))}
          </View>

          {/* Network + Wallet row */}
          <View style={s.cardFooter}>
            <View style={[s.netPill, { backgroundColor: `${network.color}18`, borderColor: `${network.color}35` }]}>
              <View style={[s.netDot, { backgroundColor: network.color }]} />
              <Text style={[s.netText, { color: network.color }]}>{network.name}</Text>
              {network.isTestnet && <Text style={{ fontSize: 8, color: colors.warning, fontWeight: '800', marginLeft: 2 }}>TEST</Text>}
            </View>
            {activeWallet && (
              <Text style={s.walletAddr}>{shortenAddress(activeWallet.address)}</Text>
            )}
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={s.actionsGrid}>
          {ACTIONS.map(a => (
            <TouchableOpacity key={a.screen} style={s.actionBtn} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.75}>
              <View style={[s.actionIcon, { backgroundColor: `${a.color}18`, borderColor: `${a.color}30`, borderWidth: 1 }]}>
                <Text style={{ fontSize: 22, color: a.color }}>{a.icon}</Text>
              </View>
              <Text style={[s.actionLabel, { color: colors.textSub }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Cards strip ── */}
        {cardCount > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Cards')} activeOpacity={0.85} style={{ marginBottom: SPACING.md }}>
            <LinearGradient colors={GRADIENTS.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cardStrip}>
              <Text style={{ fontSize: 24 }}>💳</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardStripTitle}>Virtual Cards Active</Text>
                <Text style={s.cardStripSub}>{cardCount} card{cardCount !== 1 ? 's' : ''} • Tap to manage</Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── Top Assets ── */}
        {(tokens.length > 0 || balance != null) && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Top Assets</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Tokens')}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Native token */}
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
                    <Text style={[s.assetUsd, { color: colors.textSub }]}>
                      ${usdBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* ERC-20 tokens */}
            {tokens.map(tk => (
              <View key={tk.id} style={[s.assetRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[s.assetIcon, { backgroundColor: colors.accentDim }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: colors.accent }}>
                    {tk.symbol.slice(0, 3).toUpperCase()}
                  </Text>
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
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>See All</Text>
              </TouchableOpacity>
            </View>

            <View style={{ position: 'relative' }}>
              {/* timeline line */}
              <View style={[s.timelineLine, { backgroundColor: colors.border }]} />

              {recentTxs.map((tx, i) => {
                const isSend = tx.type === 'send' || tx.type === 'swap'
                return (
                  <View key={tx.id} style={s.activityRow}>
                    <View style={[s.timelineDot, { backgroundColor: isSend ? colors.danger : colors.success }]} />
                    <View style={[s.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {tx.type === 'swap' ? 'SWAPPED' : isSend ? 'SENT' : 'RECEIVED'} {network.currency.symbol}
                        </Text>
                        <Text style={{ color: colors.textSub, fontSize: 11 }}>
                          {formatTimeAgo(tx.created_at)}
                        </Text>
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
              <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
                onPress={() => navigation.navigate('CreateWallet')}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>+ Create</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.ctaBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
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
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SPACING.md, marginBottom: SPACING.lg },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar:     { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  onlineDot:  { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: C.success, borderWidth: 2, borderColor: C.bg },
  greetSub:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: C.textSub, marginBottom: 1 },
  greetName:  { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.3 },
  headerBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },

  // Portfolio card
  portfolioCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: C.border2, overflow: 'hidden',
    minHeight: 200, ...SHADOWS.md,
  },
  cardGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: `${C.accent}18`,
  },
  portfolioTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  portfolioLabel: { fontSize: 13, color: C.textSub, fontWeight: '500' },
  changeBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  portfolioValue: { fontSize: 38, fontWeight: '800', color: C.text, letterSpacing: -1, marginBottom: 4 },
  portfolioSub:   { fontSize: 14, color: C.textSub, marginBottom: SPACING.md },
  sparkRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: SPACING.md, height: 52 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  netPill:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1 },
  netDot:         { width: 7, height: 7, borderRadius: 4 },
  netText:        { fontSize: 12, fontWeight: '700' },
  walletAddr:     { fontSize: 11, color: C.textSub, fontFamily: FONT.mono },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: SPACING.lg, gap: 4 },
  actionBtn:   { width: '24%', alignItems: 'center', paddingVertical: 10 },
  actionIcon:  { width: 52, height: 52, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center', letterSpacing: 0.1 },

  // Card strip
  cardStrip:      { borderRadius: RADIUS.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...SHADOWS.accent },
  cardStripTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cardStripSub:   { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  // Assets
  section:     { marginBottom: SPACING.lg },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  assetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: RADIUS.lg, marginBottom: 8,
    borderWidth: 1, ...SHADOWS.sm,
  },
  assetIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  assetName: { fontSize: 15, fontWeight: '700' },
  assetSym:  { fontSize: 12, marginTop: 1 },
  assetBal:  { fontSize: 15, fontWeight: '700', fontFamily: FONT.mono },
  assetUsd:  { fontSize: 12, marginTop: 1 },

  // Activity
  timelineLine: { position: 'absolute', left: 14, top: 20, bottom: 20, width: 1.5 },
  activityRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  timelineDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 14 },
  activityCard: {
    flex: 1, padding: 14, borderRadius: RADIUS.lg,
    borderWidth: 1, ...SHADOWS.sm,
  },

  // No wallet
  noWalletCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, marginBottom: SPACING.xl },
  ctaBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
})
