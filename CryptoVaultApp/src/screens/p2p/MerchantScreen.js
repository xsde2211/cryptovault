// src/screens/p2p/MerchantScreen.js
import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, Platform, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import * as Clipboard from 'expo-clipboard'
import { saveMerchantProfile, getMyMerchantProfile } from '../../services/supabase/cardService'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Input, Alert, Badge, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

const ACCEPTED_COINS = ['ETH', 'USDT', 'BNB', 'MATIC', 'TRX', 'BTC', 'USDC', 'DAI']
const CATEGORIES = ['Retail', 'Food & Beverage', 'Services', 'Technology', 'Travel', 'Healthcare', 'Education', 'Other']

export default function MerchantScreen({ navigation }) {
  const { user, activeWallet } = useApp()
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [editMode,   setEditMode]   = useState(false)
  const [activeQR,   setActiveQR]   = useState('all')   // 'all' | coinSymbol
  const [qrAmount,   setQrAmount]   = useState('')

  // Form
  const [bizName,    setBizName]    = useState('')
  const [category,   setCategory]   = useState('Retail')
  const [country,    setCountry]    = useState('')
  const [coins,      setCoins]      = useState(['ETH', 'USDT'])
  const [tronAddr,   setTronAddr]   = useState('')

  useEffect(() => {
    getMyMerchantProfile()
      .then(p => {
        setProfile(p)
        if (p) {
          setBizName(p.business_name)
          setCategory(p.category || 'Retail')
          setCountry(p.country || '')
          setCoins(p.accepted_coins || ['ETH', 'USDT'])
          setTronAddr(p.tron_address || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const buildQRData = (coin = null) => {
    const addr   = coin === 'TRX' || coin === 'USDT-TRC20' ? tronAddr : activeWallet?.address
    const amount = qrAmount ? `?amount=${qrAmount}` : ''
    if (coin) return `crypto:${addr}?coin=${coin}${qrAmount ? '&amount=' + qrAmount : ''}`
    // All-in-one QR: JSON blob scanned by any CryptoVault app
    return JSON.stringify({
      type:       'merchant_payment',
      business:   bizName,
      eth_address: activeWallet?.address,
      tron_address: tronAddr || null,
      accepted:   coins,
      amount:     qrAmount || null,
    })
  }

  const handleSave = async () => {
    if (!bizName.trim()) { Toast.show({ type: 'error', text1: 'Enter business name' }); return }
    if (!activeWallet)   { Toast.show({ type: 'error', text1: 'No wallet selected' }); return }
    setSaving(true)
    try {
      const qrData = buildQRData()
      const saved  = await saveMerchantProfile({
        user_id:        user.id,
        business_name:  bizName,
        wallet_address: activeWallet.address,
        tron_address:   tronAddr || null,
        accepted_coins: coins,
        qr_data:        qrData,
        country:        country || null,
        category,
      })
      setProfile(saved)
      setEditMode(false)
      Toast.show({ type: 'success', text1: 'Merchant profile saved! ✅' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setSaving(false)
  }

  const handleShare = async () => {
    const qr = buildQRData(activeQR === 'all' ? null : activeQR)
    await Share.share({ message: `Pay ${bizName} with crypto:\n${qr}` })
  }

  const toggleCoin = (c) => setCoins(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])

  if (loading) return <View style={styles.centered}><Spinner size="large" /></View>

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Merchant QR</Text>
        {profile && !editMode && (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
            <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13 }}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── SETUP FORM ── */}
        {(!profile || editMode) && (
          <Card style={{ marginBottom: SPACING.md }}>
            <Text style={styles.cardTitle}>{profile ? 'Edit Profile' : 'Set Up Merchant Profile'}</Text>
            <Text style={styles.cardDesc}>Create an all-in-one QR code for your business to accept crypto payments.</Text>

            <Input label="Business Name" value={bizName} onChangeText={setBizName} placeholder="e.g. Rahul's Coffee Shop" autoCapitalize="words" />
            <Input label="Country (optional)" value={country} onChangeText={setCountry} placeholder="e.g. India" autoCapitalize="words" />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.pill, category === c && styles.pillActive, { marginRight: 6 }]} onPress={() => setCategory(c)}>
                  <Text style={[styles.pillText, category === c && styles.pillTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Accepted Coins</Text>
            <View style={styles.coinGrid}>
              {ACCEPTED_COINS.map(c => (
                <TouchableOpacity key={c} style={[styles.coinBtn, coins.includes(c) && styles.coinBtnActive]} onPress={() => toggleCoin(c)}>
                  <Text style={[styles.coinBtnText, coins.includes(c) && { color: COLORS.accent }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input label="TRON Address (for TRX/USDT-TRC20)" value={tronAddr} onChangeText={setTronAddr} mono placeholder="T..." autoCapitalize="none" />

            <Alert type="info">Your EVM wallet address ({activeWallet?.address?.slice(0, 10)}…) will be used for ETH, USDT, BNB, MATIC payments.</Alert>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
              {editMode && <SecondaryButton title="Cancel" onPress={() => setEditMode(false)} style={{ flex: 1 }} />}
              <PrimaryButton title={profile ? 'Save Changes' : 'Create Profile'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* ── QR DISPLAY ── */}
        {profile && !editMode && (
          <>
            {/* Business header */}
            <Card style={[styles.bizCard, { marginBottom: SPACING.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.bizAvatar}>
                  <Text style={{ fontSize: 24 }}>🏪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bizName}>{profile.business_name}</Text>
                  <Text style={styles.bizMeta}>{profile.category} {profile.country ? '· ' + profile.country : ''}</Text>
                </View>
                <Badge label="Active" type="success" />
              </View>
            </Card>

            {/* Amount input */}
            <Card style={{ marginBottom: SPACING.md }}>
              <Text style={styles.sectionLabel}>Request Specific Amount (optional)</Text>
              <View style={styles.amtRow}>
                <TextInput
                  style={styles.amtInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textDim}
                  value={qrAmount}
                  onChangeText={setQrAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>USDT</Text>
              </View>
            </Card>

            {/* QR type selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {['all', ...coins].map(c => (
                <TouchableOpacity key={c} style={[styles.qrTab, activeQR === c && styles.qrTabActive, { marginRight: 8 }]} onPress={() => setActiveQR(c)}>
                  <Text style={[styles.qrTabText, activeQR === c && { color: COLORS.accent }]}>
                    {c === 'all' ? '🌐 All-in-One' : c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* QR Code */}
            <Card style={{ alignItems: 'center', marginBottom: SPACING.md }}>
              <Text style={styles.qrLabel}>
                {activeQR === 'all' ? 'Universal Payment QR' : `${activeQR} Payment QR`}
              </Text>
              {qrAmount ? (
                <Text style={styles.qrAmount}>Requesting: {qrAmount} USDT</Text>
              ) : (
                <Text style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 16 }}>Any amount</Text>
              )}
              <View style={styles.qrWrap}>
                <QRCode
                  value={buildQRData(activeQR === 'all' ? null : activeQR)}
                  size={220}
                  color="#000"
                  backgroundColor="#fff"
                />
              </View>
              <Text style={styles.scanHint}>Scan with CryptoVault or any crypto wallet</Text>

              {/* Address display */}
              <TouchableOpacity
                style={styles.addrBox}
                onPress={async () => {
                  const addr = activeQR === 'TRX' ? profile.tron_address : profile.wallet_address
                  if (addr) { await Clipboard.setStringAsync(addr); Toast.show({ type: 'success', text1: 'Address copied!' }) }
                }}
              >
                <Text style={styles.addrText} numberOfLines={1}>
                  {activeQR === 'TRX' ? (profile.tron_address || 'No TRON address') : profile.wallet_address}
                </Text>
                <Text style={{ fontSize: 16 }}>📋</Text>
              </TouchableOpacity>

              {/* Share */}
              <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 12 }}>
                <PrimaryButton title="📤 Share QR" onPress={handleShare} style={{ flex: 1 }} />
                <SecondaryButton title="🔄 Reset Amt" onPress={() => setQrAmount('')} style={{ flex: 1 }} />
              </View>
            </Card>

            {/* Accepted coins */}
            <Card>
              <Text style={styles.sectionLabel}>Accepted Currencies</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {profile.accepted_coins?.map(c => (
                  <View key={c} style={styles.coinChip}>
                    <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 12 }}>{c}</Text>
                  </View>
                ))}
              </View>
              <Alert type="info" style={{ marginTop: SPACING.md }}>
                The All-in-One QR contains all your payment details. The payer chooses which coin to pay with.
              </Alert>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  editBtn: { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  scroll:  { padding: SPACING.md, paddingBottom: 40 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACING.md },
  label:     { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 12 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.accentDim, borderColor: 'rgba(124,111,247,0.4)' },
  pillText:   { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  pillTextActive: { color: COLORS.accent },
  coinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  coinBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface2 },
  coinBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  coinBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  coinChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  bizCard:  {},
  bizAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center' },
  bizName:  { fontSize: 18, fontWeight: '800', color: COLORS.text },
  bizMeta:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  amtRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.border, gap: 10 },
  amtInput: { flex: 1, fontSize: 24, fontWeight: '700', color: COLORS.text, paddingVertical: 14, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  qrTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  qrTabActive: { backgroundColor: COLORS.accentDim, borderColor: 'rgba(124,111,247,0.4)' },
  qrTabText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  qrLabel:  { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  qrAmount: { fontSize: 13, color: COLORS.accent, fontWeight: '600', marginBottom: 16 },
  qrWrap:   { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 14, shadowColor: '#7c6ff7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  scanHint: { fontSize: 11, color: COLORS.textDim, marginBottom: 14 },
  addrBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8, width: '100%' },
  addrText: { flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 11, color: COLORS.text },
})
