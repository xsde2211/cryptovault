// src/screens/main/SettingsScreen.js
import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert as RNAlert, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as Clipboard from 'expo-clipboard'
import { signOut } from '../../services/supabase/authService'
import { deleteWallet } from '../../services/supabase/walletDbService'
import { shortenAddress } from '../../services/blockchain/walletService'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { getNetwork, NETWORKS } from '../../utils/networks'
import { SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import Toast from 'react-native-toast-message'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { user, wallets, activeWallet, activeNetwork, setActiveWallet, setActiveNetwork, loadWallets, prefs, updatePrefs } = useApp()
  const { colors, isDark, toggleTheme } = useTheme()
  const [signingOut, setSigningOut] = useState(false)
  const s = makeStyles(colors)

  const handleSignOut = () => {
    RNAlert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        setSigningOut(true)
        try { await signOut() } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
        finally { setSigningOut(false) }
      }},
    ])
  }

  const handleDelete = (wallet) => {
    RNAlert.alert('Delete Wallet', `Remove ${shortenAddress(wallet.address)}?\n\nBack up your seed phrase first.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteWallet(wallet.id); await loadWallets(); Toast.show({ type: 'success', text1: 'Wallet removed' }) }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
      }},
    ])
  }

  // ── Reusable row components ──────────────────────────────────
  const SectionLabel = ({ title, style }) => (
    <Text style={[s.sectionLabel, { color: colors.textSub }, style]}>{title}</Text>
  )

  const Divider = () => <View style={[s.divider, { backgroundColor: colors.border }]} />

  const Row = ({ icon, label, sub, onPress, danger, right, badge }) => (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[s.rowIconWrap, { backgroundColor: danger ? `${colors.danger}12` : colors.surface2 }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[s.rowLabel, { color: danger ? colors.danger : colors.text }]} numberOfLines={1}>{label}</Text>
          {badge && (
            <View style={[s.badgeWrap, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}40` }]}>
              {/* FIX: numberOfLines=1 prevents badge text from wrapping/clipping */}
              <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 }} numberOfLines={1}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        {sub && <Text style={[s.rowSub, { color: colors.textSub }]} numberOfLines={1}>{sub}</Text>}
      </View>
      {right || (onPress && <Text style={{ color: colors.textSub, fontSize: 18 }}>›</Text>)}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[s.pageTitle, { color: colors.text }]}>Settings</Text>

        {/* ── Account ── */}
        <SectionLabel title="ACCOUNT" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="📧" label="Email" sub={user?.email || '—'} />
          <Divider />
          <Row icon="🪪" label="KYC / Identity Verification" badge="FOR CARDS" onPress={() => navigation.navigate('KYC')} />
        </View>

        {/* ── Theme ── */}
        <SectionLabel title="APPEARANCE" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.row}>
            <View style={[s.rowIconWrap, { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontSize: 16 }}>{isDark ? '🌙' : '☀️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
              <Text style={[s.rowSub, { color: colors.textSub }]}>Tap to switch theme</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.surface3, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
          <Divider />
          <View style={s.row}>
            <View style={[s.rowIconWrap, { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontSize: 16 }}>🙈</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Hide Balances</Text>
              <Text style={[s.rowSub, { color: colors.textSub }]}>Mask all balance amounts</Text>
            </View>
            <Switch
              value={prefs.hideBalances}
              onValueChange={v => updatePrefs({ hideBalances: v })}
              trackColor={{ false: colors.surface3, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── EVM Wallets ── */}
        <SectionLabel title="EVM WALLETS  (ETH · BNB · POLYGON)" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {wallets.map((w, i) => (
            <View key={w.id}>
              <View style={s.walletRow}>
                <View style={[s.walletAvatar, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}40` }]}>
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '800' }}>{w.address.slice(2, 4).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, { color: colors.text }]} numberOfLines={1}>{shortenAddress(w.address)}</Text>
                  {activeWallet?.id === w.id && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <View style={[s.onlineDot, { backgroundColor: colors.success }]} />
                      <Text style={{ fontSize: 11, color: colors.success, fontWeight: '700' }}>Active</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                  onPress={async () => { await Clipboard.setStringAsync(w.address); Toast.show({ type: 'success', text1: 'Address copied!' }) }}>
                  <Text style={{ fontSize: 14 }}>📋</Text>
                </TouchableOpacity>
                {activeWallet?.id !== w.id && (
                  <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}40`, marginLeft: 6 }]}
                    onPress={() => setActiveWallet(w)}>
                    <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>Use</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.iconBtn, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30`, marginLeft: 6 }]}
                  onPress={() => handleDelete(w)}>
                  <Text style={{ fontSize: 14 }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {i < wallets.length - 1 && <Divider />}
            </View>
          ))}
          <Divider />
          <Row icon="➕" label="Create EVM Wallet" onPress={() => navigation.navigate('CreateWallet')} />
          <Divider />
          <Row icon="📥" label="Import EVM Wallet" onPress={() => navigation.navigate('ImportWallet')} />
        </View>

        {/* ── TRON ── */}
        <SectionLabel title="TRON WALLET" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="◈" label="TRON Wallet (TRX · TRC-20)" badge="NEW" onPress={() => navigation.navigate('TRON')} />
        </View>

        {/* ── Network ── */}
        <SectionLabel title="ACTIVE NETWORK" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {Object.values(NETWORKS).map((n, i, arr) => (
            <View key={n.id}>
              <TouchableOpacity style={s.netRow} onPress={() => setActiveNetwork(n.id)}>
                <View style={[s.netDotLg, { backgroundColor: n.color, shadowColor: n.color, shadowOpacity: activeNetwork === n.id ? 0.5 : 0, shadowRadius: 4, elevation: activeNetwork === n.id ? 3 : 0 }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowLabel, { color: activeNetwork === n.id ? n.color : colors.text }]}>{n.name}</Text>
                  {n.isTestnet && (
                    <Text style={{ fontSize: 10, color: colors.warning, fontWeight: '700', marginTop: 1 }}>TESTNET</Text>
                  )}
                </View>
                {activeNetwork === n.id && (
                  <View style={[s.checkBadge, { backgroundColor: `${n.color}18`, borderColor: `${n.color}40` }]}>
                    <Text style={{ color: n.color, fontSize: 12, fontWeight: '800' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
              {i < arr.length - 1 && <Divider />}
            </View>
          ))}
        </View>

        {/* ── Business ── */}
        <SectionLabel title="BUSINESS" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="🏪" label="Merchant QR Code" badge="NEW" onPress={() => navigation.navigate('Merchant')} />
          <Divider />
          <Row icon="🤝" label="P2P Marketplace"         onPress={() => navigation.navigate('P2P')} />
          <Divider />
          <View style={s.row}>
            <View style={[s.rowIconWrap, { backgroundColor: colors.surface2 }]}>
              <Text style={{ fontSize: 16 }}>💼</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: colors.text }]}>Business KYC Mode</Text>
              <Text style={[s.rowSub, { color: colors.textSub }]}>Enable merchant features</Text>
            </View>
            <Switch
              value={prefs.businessMode || false}
              onValueChange={v => updatePrefs({ businessMode: v })}
              trackColor={{ false: colors.surface3, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── More ── */}
        <SectionLabel title="ASSETS & ACTIVITY" />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row icon="🪙" label="Manage Tokens"       onPress={() => navigation.navigate('Tokens')} />
          <Divider />
          <Row icon="🖼️" label="NFT Gallery"          onPress={() => navigation.navigate('NFTs')} />
          <Divider />
          <Row icon="⭐" label="Watchlist"            onPress={() => navigation.navigate('Watchlist')} />
          <Divider />
          <Row icon="📋" label="Transaction History"  onPress={() => navigation.navigate('Transactions')} />
        </View>

        {/* ── Sign Out ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: `${colors.danger}30`, marginBottom: SPACING.xl }]}>
          <Row icon="🚪" label={signingOut ? 'Signing out…' : 'Sign Out'} onPress={handleSignOut} danger />
        </View>

        <Text style={[s.version, { color: colors.textDim }]}>CryptoVault v2.0.0 · Non-Custodial</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (C) => StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginTop: 4, paddingHorizontal: 2 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.md, overflow: 'hidden', ...SHADOWS.sm },
  divider: { height: 1, marginHorizontal: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, gap: 12 },
  rowIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '500' },
  rowSub:   { fontSize: 12, marginTop: 1 },
  // FIX: badge uses explicit size limits — no more clipping
  badgeWrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1, maxWidth: 120 },
  walletRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, gap: 10 },
  walletAvatar: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  iconBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  netRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 13, gap: 12 },
  netDotLg: { width: 12, height: 12, borderRadius: 6 },
  checkBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  version: { textAlign: 'center', fontSize: 12, marginTop: SPACING.sm, paddingBottom: SPACING.lg },
})
