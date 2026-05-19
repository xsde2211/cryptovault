// src/screens/vcc/VirtualCardScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Platform, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import {
  getUserCards, getCardVariants, applyVirtualCard,
  topUpCard, spendFromCard, getCardTransactions,
} from '../../services/supabase/cardService'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Spinner, Input, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - SPACING.lg * 2

function CardVisual({ card, revealed, onToggle }) {
  const fmt = (n) => n.replace(/(\d{4})/g, '$1 ').trim()
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.92}>
      <LinearGradient
        colors={[card.color_from || '#7c6ff7', card.color_to || '#4facfe']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.cardVisual, SHADOWS.accent]}
      >
        <View style={styles.chip} />
        <View style={styles.cardNetBadge}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>{card.network_type}</Text>
        </View>
        <Text style={styles.cardNumber}>
          {revealed ? fmt(card.card_number) : '•••• •••• •••• ' + card.card_number.slice(-4)}
        </Text>
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardSmLabel}>Card Holder</Text>
            <Text style={styles.cardSmValue}>{card.cardholder_name}</Text>
          </View>
          <View>
            <Text style={styles.cardSmLabel}>Expires</Text>
            <Text style={styles.cardSmValue}>{card.expiry_month}/{card.expiry_year}</Text>
          </View>
          <View>
            <Text style={styles.cardSmLabel}>CVV</Text>
            <Text style={styles.cardSmValue}>{revealed ? card.cvv : '•••'}</Text>
          </View>
          <View>
            <Text style={styles.cardSmLabel}>Balance</Text>
            <Text style={styles.cardSmValue}>${parseFloat(card.balance_usdt).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.revealHint}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
            {revealed ? '👁 Tap to hide' : '👁 Tap to reveal'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function VirtualCardScreen({ navigation }) {
  const { activeWallet } = useApp()
  const { colors } = useTheme()

  const [cards,      setCards]      = useState([])
  const [variants,   setVariants]   = useState([])
  const [selCard,    setSelCard]     = useState(null)
  const [revealed,   setRevealed]   = useState({})
  const [txns,       setTxns]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [applyModal, setApplyModal] = useState(false)
  const [topUpModal, setTopUpModal] = useState(false)
  const [spendModal, setSpendModal] = useState(false)

  const [applyVariant, setApplyVariant] = useState(null)
  const [applyName,    setApplyName]    = useState('')
  const [applyNetwork, setApplyNetwork] = useState('VISA')
  const [applyLoading, setApplyLoading] = useState(false)
  const [topUpAmt,     setTopUpAmt]     = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)
  const [spendAmt,     setSpendAmt]     = useState('')
  const [spendNote,    setSpendNote]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [c, v] = await Promise.all([getUserCards(), getCardVariants()])
    setCards(c); setVariants(v)
    if (c.length > 0) { setSelCard(c[0]); loadTxns(c[0].id) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const loadTxns = async (cardId) => {
    const data = await getCardTransactions(cardId)
    setTxns(data)
  }

  const handleApply = async () => {
    if (!applyVariant) { Toast.show({ type: 'error', text1: 'Select a card variant' }); return }
    if (!applyName.trim()) { Toast.show({ type: 'error', text1: 'Enter cardholder name' }); return }
    if (!activeWallet) { Toast.show({ type: 'error', text1: 'No wallet selected' }); return }
    setApplyLoading(true)
    try {
      await applyVirtualCard({ walletId: activeWallet.id, cardholderName: applyName, variantName: applyVariant.name, networkType: applyNetwork })
      setApplyModal(false); setApplyName(''); setApplyVariant(null)
      await load()
      Toast.show({ type: 'success', text1: 'Virtual card created! 🎉' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setApplyLoading(false)
  }

  const handleTopUp = async () => {
    if (!topUpAmt || parseFloat(topUpAmt) <= 0) { Toast.show({ type: 'error', text1: 'Enter valid amount' }); return }
    setTopUpLoading(true)
    try {
      await topUpCard(selCard.id, topUpAmt, activeWallet?.address)
      setTopUpModal(false); setTopUpAmt('')
      await load(); loadTxns(selCard.id)
      Toast.show({ type: 'success', text1: `$${topUpAmt} added to card ✅` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setTopUpLoading(false)
  }

  const handleSpend = async () => {
    if (!spendAmt || parseFloat(spendAmt) <= 0) { Toast.show({ type: 'error', text1: 'Enter valid amount' }); return }
    try {
      await spendFromCard(selCard.id, spendAmt, spendNote || 'Spend')
      setSpendModal(false); setSpendAmt(''); setSpendNote('')
      await load(); loadTxns(selCard.id)
      Toast.show({ type: 'success', text1: `$${spendAmt} spent ✅` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const toggleReveal = (id) => setRevealed(p => ({ ...p, [id]: !p[id] }))

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Virtual Cards</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
          onPress={() => setApplyModal(true)}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>+ New Card</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><Spinner size="large" /></View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>💳</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Virtual Cards</Text>
          <Text style={{ color: colors.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Apply for a virtual card to start spending your crypto balance.
          </Text>
          <PrimaryButton title="Apply for Card" onPress={() => setApplyModal(true)} />
          <TouchableOpacity onPress={() => navigation.navigate('KYC')} style={{ marginTop: 14 }}>
            <Text style={{ color: colors.accent, fontSize: 13 }}>Complete KYC first →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Card tab selector */}
          {cards.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {cards.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.cardTab, {
                    backgroundColor: selCard?.id === c.id ? colors.accentDim : colors.surface2,
                    borderColor: selCard?.id === c.id ? `${colors.accent}60` : colors.border,
                  }]}
                  onPress={() => { setSelCard(c); loadTxns(c.id) }}>
                  <Text style={{ color: selCard?.id === c.id ? colors.accent : colors.textSub, fontSize: 12, fontWeight: '700' }}>
                    {c.variant} •••{c.card_number.slice(-4)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {selCard && (
            <>
              {/* Card visual */}
              <CardVisual card={selCard} revealed={!!revealed[selCard.id]} onToggle={() => toggleReveal(selCard.id)} />

              {/* Details strip */}
              <View style={[styles.detailsStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[{ label: 'Variant', value: selCard.variant }, { label: 'Network', value: selCard.network_type }, { label: 'Status', value: selCard.status }].map((d, i) => (
                  <View key={d.label} style={[styles.detailItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <Text style={{ fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{d.label}</Text>
                    {d.label === 'Status'
                      ? <Badge label={d.value} type={d.value === 'active' ? 'success' : 'warning'} />
                      : <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{d.value}</Text>}
                  </View>
                ))}
              </View>

              {/* Copy strip (when revealed) */}
              {revealed[selCard.id] && (
                <View style={[styles.copyStrip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                  {[
                    { label: 'Card Number', value: selCard.card_number },
                    { label: 'Expiry',      value: `${selCard.expiry_month}/${selCard.expiry_year}` },
                    { label: 'CVV',         value: selCard.cvv },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.copyItem, { borderBottomColor: colors.border }]}
                      onPress={async () => { await Clipboard.setStringAsync(item.value); Toast.show({ type: 'success', text1: `${item.label} copied!` }) }}>
                      <Text style={{ fontSize: 11, color: colors.textSub, width: 90 }}>{item.label}</Text>
                      <Text style={{ flex: 1, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, fontWeight: '600', color: colors.text }}>
                        {item.value}
                      </Text>
                      <Text style={{ fontSize: 12 }}>📋</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                {[
                  { emoji: '💰', label: 'Top Up',   onPress: () => setTopUpModal(true) },
                  { emoji: '🛍️',  label: 'Spend',    onPress: () => setSpendModal(true) },
                  { emoji: '📦', label: 'Physical', onPress: () => navigation.navigate('PhysicalCard', { card: selCard }) },
                  { emoji: '🪪', label: 'KYC',      onPress: () => navigation.navigate('KYC') },
                ].map(a => (
                  <TouchableOpacity
                    key={a.label}
                    style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={a.onPress}>
                    <Text style={{ fontSize: 22, marginBottom: 4 }}>{a.emoji}</Text>
                    <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '600' }}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Features */}
              {selCard.features?.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSub }]}>Card Features</Text>
                  {selCard.features.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <Text style={{ color: colors.success }}>✓</Text>
                      <Text style={{ color: colors.text, fontSize: 13 }}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Transactions */}
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.textSub }]}>Transactions</Text>
                {txns.length === 0 ? (
                  <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>No transactions yet</Text>
                ) : txns.map(tx => (
                  <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'top_up' ? `${colors.success}18` : `${colors.danger}18` }]}>
                      <Text style={{ fontSize: 16, color: tx.type === 'top_up' ? colors.success : colors.danger }}>
                        {tx.type === 'top_up' ? '↓' : '↑'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{tx.note || tx.type}</Text>
                      <Text style={{ color: colors.textDim, fontSize: 11 }}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={{ color: tx.type === 'top_up' ? colors.success : colors.danger, fontWeight: '700', fontSize: 14 }}>
                      {tx.type === 'top_up' ? '+' : '-'}${parseFloat(tx.amount_usdt).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Apply Modal */}
      <Modal visible={applyModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Apply for Virtual Card</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Input label="Cardholder Name" value={applyName} onChangeText={setApplyName} placeholder="As on official ID" autoCapitalize="words" />
              <Text style={[styles.formLabel, { color: colors.textSub }]}>Card Network</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
                {['VISA', 'MASTERCARD'].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.netBtn, { backgroundColor: applyNetwork === n ? colors.accentDim : colors.surface2, borderColor: applyNetwork === n ? `${colors.accent}60` : colors.border }]}
                    onPress={() => setApplyNetwork(n)}>
                    <Text style={{ color: applyNetwork === n ? colors.accent : colors.textSub, fontWeight: '700' }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.formLabel, { color: colors.textSub }]}>Select Variant</Text>
              {variants.map(v => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.variantRow, { backgroundColor: applyVariant?.id === v.id ? colors.accentDim : colors.surface2, borderColor: applyVariant?.id === v.id ? `${colors.accent}60` : colors.border }]}
                  onPress={() => setApplyVariant(v)}>
                  <LinearGradient colors={[v.color_from, v.color_to]} style={styles.variantColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{v.name}</Text>
                    <Text style={{ color: colors.textSub, fontSize: 11 }}>Limit: ${v.limit_usd} · Fee: ${v.fee_usd}</Text>
                    <Text style={{ color: colors.textDim, fontSize: 11 }}>{v.description}</Text>
                  </View>
                  {applyVariant?.id === v.id && <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}
              <Alert type="info" style={{ marginTop: 8 }}>Card fee will be deducted from your wallet. Requires completed KYC.</Alert>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <SecondaryButton title="Cancel" onPress={() => setApplyModal(false)} style={{ flex: 1 }} />
                <PrimaryButton title="Apply" onPress={handleApply} loading={applyLoading} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Top-Up Modal */}
      <Modal visible={topUpModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: 300 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Top Up Card</Text>
            <Text style={{ color: colors.textSub, fontSize: 13, marginBottom: SPACING.md }}>Transfer USDT from wallet to card.</Text>
            <Input label="Amount (USDT)" value={topUpAmt} onChangeText={setTopUpAmt} keyboardType="decimal-pad" placeholder="0.00" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="Cancel" onPress={() => setTopUpModal(false)} style={{ flex: 1 }} />
              <PrimaryButton title="Top Up" onPress={handleTopUp} loading={topUpLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Spend Modal */}
      <Modal visible={spendModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface, maxHeight: 340 }]}>
            <View style={[styles.handle, { backgroundColor: colors.border2 }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Simulate Spend</Text>
            <Input label="Amount (USDT)" value={spendAmt} onChangeText={setSpendAmt} keyboardType="decimal-pad" placeholder="0.00" />
            <Input label="Note (optional)" value={spendNote} onChangeText={setSpendNote} placeholder="e.g. Amazon purchase" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="Cancel" onPress={() => setSpendModal(false)} style={{ flex: 1 }} />
              <PrimaryButton title="Confirm Spend" onPress={handleSpend} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:       { flex: 1 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  headerTitle:{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  addBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  centered:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  scroll:     { padding: SPACING.lg, paddingBottom: 100 },
  cardVisual: { width: CARD_W, height: CARD_W * 0.58, borderRadius: 20, padding: SPACING.lg, justifyContent: 'space-between', marginBottom: SPACING.md },
  chip:       { width: 38, height: 28, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cardNetBadge:{ position: 'absolute', top: SPACING.md, right: SPACING.md },
  cardNumber: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardSmLabel:{ fontSize: 8, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardSmValue:{ fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  revealHint: { position: 'absolute', bottom: 8, right: 12 },
  detailsStrip:{ flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1, marginBottom: SPACING.md },
  detailItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  copyStrip:  { borderRadius: RADIUS.md, borderWidth: 1, marginBottom: SPACING.md, overflow: 'hidden' },
  copyItem:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  actionRow:  { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  actionBtn:  { flex: 1, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1 },
  card:       { borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  txRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 12 },
  txIcon:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTab:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, marginRight: 8, borderWidth: 1 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:      { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, maxHeight: '90%' },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: SPACING.md },
  formLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  netBtn:     { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center' },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 8 },
  variantColor:{ width: 40, height: 40, borderRadius: 10 },
})
