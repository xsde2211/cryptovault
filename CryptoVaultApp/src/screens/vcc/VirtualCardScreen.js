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
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Spinner, Input, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W - SPACING.lg * 2

// ── Physical card visual ──────────────────────────────────────
function CardVisual({ card, revealed, onToggle }) {
  const fmt = (n) => n.replace(/(\d{4})/g, '$1 ').trim()
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.92}>
      <LinearGradient
        colors={[card.color_from || '#7c6ff7', card.color_to || '#4facfe']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.cardVisual, SHADOWS.accent]}
      >
        {/* Chip */}
        <View style={styles.chip} />
        {/* Network */}
        <View style={styles.cardNetworkBadge}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 }}>{card.network_type}</Text>
        </View>
        {/* Number */}
        <Text style={styles.cardNumber}>
          {revealed ? fmt(card.card_number) : '•••• •••• •••• ' + card.card_number.slice(-4)}
        </Text>
        {/* Bottom row */}
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardSmallLabel}>Card Holder</Text>
            <Text style={styles.cardSmallValue}>{card.cardholder_name}</Text>
          </View>
          <View>
            <Text style={styles.cardSmallLabel}>Expires</Text>
            <Text style={styles.cardSmallValue}>{card.expiry_month}/{card.expiry_year}</Text>
          </View>
          <View>
            <Text style={styles.cardSmallLabel}>CVV</Text>
            <Text style={styles.cardSmallValue}>{revealed ? card.cvv : '•••'}</Text>
          </View>
          <View>
            <Text style={styles.cardSmallLabel}>Balance</Text>
            <Text style={styles.cardSmallValue}>${parseFloat(card.balance_usdt).toFixed(2)}</Text>
          </View>
        </View>
        {/* Reveal hint */}
        <View style={styles.revealHint}>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{revealed ? '👁 Tap to hide' : '👁 Tap to reveal'}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function VirtualCardScreen({ navigation }) {
  const { user, activeWallet } = useApp()
  const [cards,       setCards]       = useState([])
  const [variants,    setVariants]    = useState([])
  const [selectedCard,setSelectedCard]= useState(null)
  const [revealed,    setRevealed]    = useState({})
  const [txns,        setTxns]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState('cards')    // cards | apply
  const [applyModal,  setApplyModal]  = useState(false)
  const [topUpModal,  setTopUpModal]  = useState(false)
  const [spendModal,  setSpendModal]  = useState(false)

  // Apply form
  const [applyVariant, setApplyVariant] = useState(null)
  const [applyName,    setApplyName]    = useState('')
  const [applyNetwork, setApplyNetwork] = useState('VISA')
  const [applyLoading, setApplyLoading] = useState(false)

  // Top-up form
  const [topUpAmt, setTopUpAmt] = useState('')
  const [topUpLoading, setTopUpLoading] = useState(false)

  // Spend form
  const [spendAmt, setSpendAmt] = useState('')
  const [spendNote, setSpendNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [c, v] = await Promise.all([getUserCards(), getCardVariants()])
    setCards(c); setVariants(v)
    if (c.length > 0) { setSelectedCard(c[0]); loadTxns(c[0].id) }
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
      await topUpCard(selectedCard.id, topUpAmt, activeWallet?.address)
      setTopUpModal(false); setTopUpAmt('')
      await load(); loadTxns(selectedCard.id)
      Toast.show({ type: 'success', text1: `$${topUpAmt} added to card ✅` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setTopUpLoading(false)
  }

  const handleSpend = async () => {
    if (!spendAmt || parseFloat(spendAmt) <= 0) { Toast.show({ type: 'error', text1: 'Enter valid amount' }); return }
    try {
      await spendFromCard(selectedCard.id, spendAmt, spendNote || 'Spend')
      setSpendModal(false); setSpendAmt(''); setSpendNote('')
      await load(); loadTxns(selectedCard.id)
      Toast.show({ type: 'success', text1: `$${spendAmt} spent ✅` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const toggleReveal = (id) => setRevealed(p => ({ ...p, [id]: !p[id] }))

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Virtual Cards</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setApplyModal(true)}>
          <Text style={{ color: COLORS.accent, fontWeight: '700', fontSize: 13 }}>+ New Card</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><Spinner size="large" /></View>
      ) : cards.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 60, marginBottom: 16 }}>💳</Text>
          <Text style={styles.emptyTitle}>No Virtual Cards</Text>
          <Text style={styles.emptyText}>Apply for a virtual card to start spending your crypto balance as fiat.</Text>
          <PrimaryButton title="Apply for Card" onPress={() => setApplyModal(true)} />
          <TouchableOpacity onPress={() => navigation.navigate('KYC')} style={{ marginTop: 12 }}>
            <Text style={{ color: COLORS.accent, fontSize: 13 }}>Complete KYC first →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Card selector */}
          {cards.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
              {cards.map(c => (
                <TouchableOpacity key={c.id} onPress={() => { setSelectedCard(c); loadTxns(c.id) }}
                  style={[styles.cardTab, selectedCard?.id === c.id && styles.cardTabActive]}>
                  <Text style={{ color: selectedCard?.id === c.id ? COLORS.accent : COLORS.textMuted, fontSize: 12, fontWeight: '700' }}>
                    {c.variant} •••{c.card_number.slice(-4)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Card visual */}
          {selectedCard && (
            <>
              <CardVisual card={selectedCard} revealed={!!revealed[selectedCard.id]} onToggle={() => toggleReveal(selectedCard.id)} />

              {/* Card details strip */}
              <View style={styles.detailsStrip}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Variant</Text>
                  <Text style={styles.detailValue}>{selectedCard.variant}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Network</Text>
                  <Text style={styles.detailValue}>{selectedCard.network_type}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Badge label={selectedCard.status} type={selectedCard.status === 'active' ? 'success' : 'warning'} />
                </View>
              </View>

              {/* Copy strip */}
              {revealed[selectedCard.id] && (
                <View style={styles.copyStrip}>
                  {[
                    { label: 'Card Number', value: selectedCard.card_number },
                    { label: 'Expiry', value: `${selectedCard.expiry_month}/${selectedCard.expiry_year}` },
                    { label: 'CVV', value: selectedCard.cvv },
                  ].map(item => (
                    <TouchableOpacity key={item.label} style={styles.copyItem}
                      onPress={async () => { await Clipboard.setStringAsync(item.value); Toast.show({ type: 'success', text1: `${item.label} copied!` }) }}>
                      <Text style={styles.copyLabel}>{item.label}</Text>
                      <Text style={styles.copyValue}>{item.value}</Text>
                      <Text style={{ fontSize: 12 }}>📋</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setTopUpModal(true)}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>💰</Text>
                  <Text style={styles.actionLabel}>Top Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setSpendModal(true)}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>🛍️</Text>
                  <Text style={styles.actionLabel}>Spend</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('PhysicalCard', { card: selectedCard })}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>📦</Text>
                  <Text style={styles.actionLabel}>Physical</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('KYC')}>
                  <Text style={{ fontSize: 22, marginBottom: 4 }}>🪪</Text>
                  <Text style={styles.actionLabel}>KYC</Text>
                </TouchableOpacity>
              </View>

              {/* Features */}
              {selectedCard.features?.length > 0 && (
                <Card style={{ marginBottom: SPACING.md }}>
                  <Text style={styles.sectionLabel}>Card Features</Text>
                  {selectedCard.features.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ color: COLORS.success }}>✓</Text>
                      <Text style={{ color: COLORS.text, fontSize: 13 }}>{f}</Text>
                    </View>
                  ))}
                </Card>
              )}

              {/* Transactions */}
              <Card>
                <Text style={styles.sectionLabel}>Transactions</Text>
                {txns.length === 0 ? (
                  <Text style={{ color: COLORS.textDim, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>No transactions yet</Text>
                ) : txns.map(tx => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'top_up' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)' }]}>
                      <Text style={{ fontSize: 16 }}>{tx.type === 'top_up' ? '↓' : '↑'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 13 }}>{tx.note || tx.type}</Text>
                      <Text style={{ color: COLORS.textDim, fontSize: 11 }}>{new Date(tx.created_at).toLocaleDateString()}</Text>
                    </View>
                    <Text style={{ color: tx.type === 'top_up' ? COLORS.success : COLORS.danger, fontWeight: '700', fontSize: 14 }}>
                      {tx.type === 'top_up' ? '+' : '-'}${parseFloat(tx.amount_usdt).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Apply Modal ── */}
      <Modal visible={applyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Apply for Virtual Card</Text>
            <ScrollView>
              <Input label="Cardholder Name" value={applyName} onChangeText={setApplyName} placeholder="As on official ID" autoCapitalize="words" />

              <Text style={styles.label}>Card Network</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: SPACING.md }}>
                {['VISA', 'MASTERCARD'].map(n => (
                  <TouchableOpacity key={n} style={[styles.netBtn, applyNetwork === n && styles.netBtnActive]} onPress={() => setApplyNetwork(n)}>
                    <Text style={{ color: applyNetwork === n ? COLORS.accent : COLORS.textMuted, fontWeight: '700' }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Select Variant</Text>
              {variants.map(v => (
                <TouchableOpacity key={v.id} style={[styles.variantRow, applyVariant?.id === v.id && styles.variantRowActive]}
                  onPress={() => setApplyVariant(v)}>
                  <LinearGradient colors={[v.color_from, v.color_to]} style={styles.variantColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 14 }}>{v.name}</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>Limit: ${v.limit_usd} · Fee: ${v.fee_usd}</Text>
                    <Text style={{ color: COLORS.textDim, fontSize: 11 }}>{v.description}</Text>
                  </View>
                  {applyVariant?.id === v.id && <Text style={{ color: COLORS.accent, fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}

              <Alert type="info" style={{ marginTop: 8 }}>Card fee will be deducted from your wallet balance. Requires completed KYC.</Alert>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <SecondaryButton title="Cancel" onPress={() => setApplyModal(false)} style={{ flex: 1 }} />
                <PrimaryButton title="Apply" onPress={handleApply} loading={applyLoading} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Top-Up Modal ── */}
      <Modal visible={topUpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: 320 }]}>
            <Text style={styles.modalTitle}>Top Up Card</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.md }}>Transfer USDT from your wallet to this card.</Text>
            <Input label="Amount (USDT)" value={topUpAmt} onChangeText={setTopUpAmt} keyboardType="decimal-pad" placeholder="0.00" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="Cancel" onPress={() => setTopUpModal(false)} style={{ flex: 1 }} />
              <PrimaryButton title="Top Up" onPress={handleTopUp} loading={topUpLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Spend Modal ── */}
      <Modal visible={spendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: 360 }]}>
            <Text style={styles.modalTitle}>Simulate Spend</Text>
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
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  addBtn: { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptyText:  { color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  scroll: { padding: SPACING.md, paddingBottom: 40 },
  cardVisual: { width: CARD_W, height: CARD_W * 0.58, borderRadius: 20, padding: SPACING.lg, justifyContent: 'space-between', marginBottom: SPACING.md },
  chip: { width: 38, height: 28, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  cardNetworkBadge: { position: 'absolute', top: SPACING.md, right: SPACING.md },
  cardNumber: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 3, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardSmallLabel: { fontSize: 8, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  cardSmallValue: { fontSize: 12, color: '#fff', fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  revealHint: { position: 'absolute', bottom: 8, right: 12 },
  detailsStrip: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  detailItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRightWidth: 1, borderRightColor: COLORS.border },
  detailLabel: { fontSize: 9, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  copyStrip: { backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md, overflow: 'hidden' },
  copyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 10 },
  copyLabel: { fontSize: 11, color: COLORS.textMuted, width: 90 },
  copyValue: { flex: 1, color: COLORS.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.md },
  actionBtn: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6 },
  cardTab: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface2, borderRadius: 100, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  cardTabActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  netBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface2 },
  netBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  variantRowActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  variantColor: { width: 40, height: 40, borderRadius: 10 },
})
