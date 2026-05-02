// src/screens/main/ReceiveScreen.js
import React, { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { useApp } from '../../context/AppContext'
import { getNetwork, NETWORKS } from '../../utils/networks'
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { Card, Alert, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function ReceiveScreen() {
  const { activeWallet, activeNetwork, setActiveNetwork } = useApp()
  const network = getNetwork(activeNetwork)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!activeWallet) return
    await Clipboard.setStringAsync(activeWallet.address)
    setCopied(true)
    Toast.show({ type: 'success', text1: 'Address copied! 📋' })
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShare = async () => {
    if (!activeWallet) return
    await Share.share({ message: `My ${network.name} address: ${activeWallet.address}` })
  }

  if (!activeWallet) return (
    <View style={styles.centered}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>👛</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>No wallet selected</Text>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* QR Card */}
      <Card style={[styles.qrCard, { borderColor: `${network.color}40` }]}>
        {/* Network pill */}
        <View style={[styles.networkPill, { backgroundColor: `${network.color}15`, borderColor: `${network.color}40` }]}>
          <View style={[styles.networkDot, { backgroundColor: network.color }]} />
          <Text style={[styles.networkName, { color: network.color }]}>{network.name}</Text>
          {network.isTestnet && <Badge label="Testnet" type="warning" style={{ marginLeft: 4 }} />}
        </View>

        {/* QR Code */}
        <View style={[styles.qrWrap, { shadowColor: network.color }]}>
          <View style={styles.qrInner}>
            <QRCode
              value={activeWallet.address}
              size={200}
              color="#000000"
              backgroundColor="#ffffff"
            />
          </View>
        </View>

        {/* Address */}
        <Text style={styles.addrLabel}>Your Wallet Address</Text>
        <TouchableOpacity style={styles.addrBox} onPress={handleCopy} activeOpacity={0.7}>
          <Text style={styles.addrText}>{activeWallet.address}</Text>
          <Text style={{ fontSize: 18 }}>{copied ? '✅' : '📋'}</Text>
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1 }]} onPress={handleCopy} activeOpacity={0.8}>
            <View style={styles.actionBtnInner}>
              <Text style={styles.actionBtnIcon}>{copied ? '✅' : '📋'}</Text>
              <Text style={styles.actionBtnText}>{copied ? 'Copied!' : 'Copy'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { flex: 1, marginLeft: 10 }]} onPress={handleShare} activeOpacity={0.8}>
            <View style={styles.actionBtnInner}>
              <Text style={styles.actionBtnIcon}>📤</Text>
              <Text style={styles.actionBtnText}>Share</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Network switcher */}
      <Card style={{ marginBottom: SPACING.md }}>
        <Text style={styles.sectionLabel}>Receive On Network</Text>
        <View style={styles.networkGrid}>
          {Object.values(NETWORKS).map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.networkBtn, activeNetwork === n.id && { borderColor: n.color, backgroundColor: `${n.color}12` }]}
              onPress={() => setActiveNetwork(n.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.netDot, { backgroundColor: n.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.netName, activeNetwork === n.id && { color: n.color }]} numberOfLines={1}>{n.name}</Text>
                {n.isTestnet && <Text style={{ fontSize: 9, color: COLORS.warning, fontWeight: '700' }}>TESTNET</Text>}
              </View>
              {activeNetwork === n.id && <Text style={{ color: n.color, fontSize: 14 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Warning */}
      <Alert type="warning">
        Only send {network.currency.symbol} and ERC-20 tokens on {network.name}. Wrong-chain deposits may be unrecoverable.
      </Alert>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  qrCard: { alignItems: 'center', marginBottom: SPACING.md },
  networkPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, marginBottom: SPACING.lg,
  },
  networkDot: { width: 8, height: 8, borderRadius: 4 },
  networkName: { fontSize: 13, fontWeight: '700' },
  qrWrap: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: SPACING.lg, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  qrInner: { borderRadius: 8, overflow: 'hidden' },
  addrLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 8 },
  addrBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8,
    width: '100%', marginBottom: SPACING.md,
  },
  addrText: { flex: 1, fontFamily: 'monospace', fontSize: 11, color: COLORS.text, lineHeight: 18 },
  actionRow: { flexDirection: 'row', width: '100%' },
  actionBtn: {
    backgroundColor: COLORS.surface2, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 14 },
  networkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  networkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '47%', padding: 10, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border,
  },
  netDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  netName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
})
