// src/screens/main/ReceiveScreen.js
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { getNetwork, NETWORKS } from '../../utils/networks'
import { SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { Alert, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function ReceiveScreen() {
  const { activeWallet, activeNetwork, setActiveNetwork } = useApp()
  const { colors } = useTheme()
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
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>👛</Text>
      <Text style={{ color: colors.textSub, fontSize: 15 }}>No wallet selected</Text>
    </View>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>

      {/* QR Card */}
      <View style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: `${network.color}40` }]}>
        {/* Network pill */}
        <View style={[styles.netPill, { backgroundColor: `${network.color}15`, borderColor: `${network.color}40` }]}>
          <View style={[styles.netDot, { backgroundColor: network.color }]} />
          <Text style={{ color: network.color, fontSize: 13, fontWeight: '700' }}>{network.name}</Text>
          {network.isTestnet && <Badge label="Testnet" type="warning" style={{ marginLeft: 6 }} />}
        </View>

        {/* QR */}
        <View style={[styles.qrWrap, { shadowColor: network.color }]}>
          <QRCode value={activeWallet.address} size={200} color="#000" backgroundColor="#fff" />
        </View>

        {/* Address */}
        <Text style={[styles.addrLabel, { color: colors.textSub }]}>Your Wallet Address</Text>
        <TouchableOpacity
          style={[styles.addrBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}
          onPress={handleCopy} activeOpacity={0.7}>
          <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: colors.text, lineHeight: 18 }}>
            {activeWallet.address}
          </Text>
          <Text style={{ fontSize: 18 }}>{copied ? '✅' : '📋'}</Text>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={handleCopy} activeOpacity={0.8}>
            <Text style={{ fontSize: 18 }}>{copied ? '✅' : '📋'}</Text>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={handleShare} activeOpacity={0.8}>
            <Text style={{ fontSize: 18 }}>📤</Text>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Network switcher */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.textSub }]}>Receive On Network</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.values(NETWORKS).map(n => (
            <TouchableOpacity
              key={n.id}
              style={[styles.netBtn, {
                backgroundColor: activeNetwork === n.id ? `${n.color}12` : colors.surface2,
                borderColor: activeNetwork === n.id ? n.color : colors.border,
              }]}
              onPress={() => setActiveNetwork(n.id)}
              activeOpacity={0.7}
            >
              <View style={[{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, backgroundColor: n.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: activeNetwork === n.id ? n.color : colors.text }} numberOfLines={1}>
                  {n.name}
                </Text>
                {n.isTestnet && <Text style={{ fontSize: 9, color: colors.warning, fontWeight: '700' }}>TESTNET</Text>}
              </View>
              {activeNetwork === n.id && <Text style={{ color: n.color, fontSize: 13 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Alert type="warning">
        Only send {network.currency.symbol} and ERC-20 tokens on {network.name}. Wrong-chain deposits may be unrecoverable.
      </Alert>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  qrCard:     { borderRadius: RADIUS.xl, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1, ...SHADOWS.sm },
  netPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, marginBottom: SPACING.lg },
  netDot:     { width: 8, height: 8, borderRadius: 4 },
  qrWrap:     { backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: SPACING.lg, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  addrLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  addrBox:    { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: RADIUS.md, borderWidth: 1, gap: 8, width: '100%', marginBottom: SPACING.md },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1 },
  card:       { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },
  netBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, width: '47%', padding: 10, borderRadius: RADIUS.md, borderWidth: 1 },
})
