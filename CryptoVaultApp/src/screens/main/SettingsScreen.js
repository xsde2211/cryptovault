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
import { getNetwork, NETWORKS } from '../../utils/networks'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { user, wallets, activeWallet, activeNetwork, setActiveWallet, setActiveNetwork, loadWallets, prefs, updatePrefs } = useApp()
  const network = getNetwork(activeNetwork)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = () => {
    RNAlert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        setSigningOut(true)
        try { await signOut() }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
        finally { setSigningOut(false) }
      }},
    ])
  }

  const handleDeleteWallet = (wallet) => {
    RNAlert.alert('Delete Wallet', `Remove ${shortenAddress(wallet.address)}?\n\nMake sure you have your seed phrase backed up — this cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteWallet(wallet.id); await loadWallets(); Toast.show({ type: 'success', text1: 'Wallet removed' }) }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
      }},
    ])
  }

  const SettingRow = ({ icon, label, value, onPress, danger, right }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, danger && { color: COLORS.danger }]}>{label}</Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {right || (onPress && <Text style={{ color: COLORS.textMuted, fontSize: 16 }}>›</Text>)}
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Account */}
        <Text style={styles.sectionLabel}>Account</Text>
        <Card style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
          <SettingRow icon="📧" label="Email" value={user?.email || '—'} />
          <View style={styles.divider} />
          <SettingRow icon="🔑" label="Supabase UID" value={user?.id?.slice(0, 16) + '…' || '—'} />
        </Card>

        {/* Wallets */}
        <Text style={styles.sectionLabel}>Wallets</Text>
        <Card style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
          {wallets.map((w, i) => (
            <View key={w.id}>
              <View style={styles.walletRow}>
                <View style={styles.walletAvatar}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.accent }}>
                    {w.address.slice(2, 4).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletAddr} numberOfLines={1}>{shortenAddress(w.address)}</Text>
                  {activeWallet?.id === w.id && <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '600' }}>Active</Text>}
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={async () => { await Clipboard.setStringAsync(w.address); Toast.show({ type: 'success', text1: 'Address copied!' }) }}>
                  <Text>📋</Text>
                </TouchableOpacity>
                {activeWallet?.id !== w.id && (
                  <TouchableOpacity style={[styles.copyBtn, { marginLeft: 4 }]} onPress={() => setActiveWallet(w)}>
                    <Text style={{ color: COLORS.accent, fontSize: 12, fontWeight: '700' }}>Use</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.copyBtn, { marginLeft: 4 }]} onPress={() => handleDeleteWallet(w)}>
                  <Text style={{ color: COLORS.danger }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {i < wallets.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={styles.divider} />
          <SettingRow icon="➕" label="Create New Wallet"  onPress={() => navigation.navigate('CreateWallet')} />
          <View style={styles.divider} />
          <SettingRow icon="📥" label="Import Wallet"      onPress={() => navigation.navigate('ImportWallet')} />
        </Card>

        {/* Network */}
        <Text style={styles.sectionLabel}>Network</Text>
        <Card style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
          {Object.values(NETWORKS).map((n, i) => (
            <View key={n.id}>
              <TouchableOpacity style={styles.networkRow} onPress={() => setActiveNetwork(n.id)}>
                <View style={[styles.netDot, { backgroundColor: n.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, activeNetwork === n.id && { color: n.color }]}>{n.name}</Text>
                  {n.isTestnet && <Text style={{ fontSize: 10, color: COLORS.warning, fontWeight: '700' }}>TESTNET</Text>}
                </View>
                {activeNetwork === n.id && <Text style={{ color: n.color, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
              {i < Object.values(NETWORKS).length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>Preferences</Text>
        <Card style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>🙈</Text>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Hide Balances</Text>
            <Switch
              value={prefs.hideBalances}
              onValueChange={v => updatePrefs({ hideBalances: v })}
              trackColor={{ false: COLORS.surface3, true: COLORS.accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        {/* Navigate */}
        <Text style={styles.sectionLabel}>More</Text>
        <Card style={{ marginBottom: SPACING.md, padding: 0, overflow: 'hidden' }}>
          <SettingRow icon="🪙" label="Manage Tokens"  onPress={() => navigation.navigate('Tokens')} />
          <View style={styles.divider} />
          <SettingRow icon="🖼️" label="NFT Gallery"     onPress={() => navigation.navigate('NFTs')} />
          <View style={styles.divider} />
          <SettingRow icon="📋" label="Transaction History" onPress={() => navigation.navigate('Transactions')} />
        </Card>

        {/* Sign out */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <SettingRow icon="🚪" label={signingOut ? 'Signing out…' : 'Sign Out'} onPress={handleSignOut} danger />
        </Card>

        <Text style={styles.version}>CryptoVault v1.0.0 · Non-Custodial</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: COLORS.bg },
  scroll:{ padding: SPACING.lg, paddingBottom: 50 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.lg },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 8, marginTop: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: 12 },
  settingIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  settingLabel: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  settingValue: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  walletRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, gap: 10 },
  walletAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,111,247,0.15)', borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)', justifyContent: 'center', alignItems: 'center' },
  walletAddr: { fontFamily: 'monospace', fontSize: 13, color: COLORS.text, fontWeight: '600' },
  copyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  networkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, gap: 12 },
  netDot: { width: 10, height: 10, borderRadius: 5 },
  version: { textAlign: 'center', color: COLORS.textDim, fontSize: 12, marginTop: SPACING.lg },
})
