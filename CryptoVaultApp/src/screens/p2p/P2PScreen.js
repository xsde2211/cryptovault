// src/screens/p2p/P2PScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, RefreshControl, Alert as RNAlert, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import {
  getListings, createListing, createOrder,
  getMyOrders, updateOrderStatus,
} from '../../services/supabase/cardService'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Input, Alert, Spinner, Badge, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

const CRYPTOS   = ['USDT','ETH','BNB','MATIC','TRX','BTC']
const FIATS     = ['USD','EUR','GBP','INR','AED','SGD']
const COUNTRIES = ['US','GB','AE','IN','DE','SG','AU','CA','Other']
const PMETHODS  = ['Bank Transfer','PayPal','Wise','Revolut','UPI','Cash App']
const FLAG      = { US:'🇺🇸',GB:'🇬🇧',AE:'🇦🇪',IN:'🇮🇳',DE:'🇩🇪',SG:'🇸🇬',AU:'🇦🇺',CA:'🇨🇦',Other:'🌍' }
const COIN_COLOR= { USDT:'#26a17b',ETH:'#627EEA',BNB:'#F3BA2F',MATIC:'#8247E5',TRX:'#ff2d55',BTC:'#f7931a' }

export default function P2PScreen() {
  const { user, activeWallet } = useApp()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  const [tab,        setTab]        = useState('buy')
  const [listings,   setListings]   = useState([])
  const [myOrders,   setMyOrders]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterCoin, setFilterCoin] = useState('USDT')

  const [showCreate, setShowCreate] = useState(false)
  const [lType,  setLType]  = useState('sell')
  const [lCoin,  setLCoin]  = useState('USDT')
  const [lFiat,  setLFiat]  = useState('USD')
  const [lAmt,   setLAmt]   = useState('')
  const [lPrice, setLPrice] = useState('')
  const [lMin,   setLMin]   = useState('10')
  const [lMax,   setLMax]   = useState('')
  const [lCountry,setLCountry]=useState('US')
  const [lPMs,   setLPMs]   = useState([])
  const [creating,setCreating]=useState(false)

  const [orderModal,   setOrderModal]   = useState(false)
  const [orderListing, setOrderListing] = useState(null)
  const [orderAmt,     setOrderAmt]     = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, orders] = await Promise.all([
        getListings({ type: tab === 'myorders' ? undefined : tab, crypto: filterCoin }),
        user ? getMyOrders(user.id) : Promise.resolve([]),
      ])
      setListings(list); setMyOrders(orders)
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setLoading(false); setRefreshing(false)
  }, [tab, filterCoin, user])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!lAmt || !lPrice || !lMax) { Toast.show({ type: 'error', text1: 'Fill all required fields' }); return }
    if (lPMs.length === 0) { Toast.show({ type: 'error', text1: 'Select at least one payment method' }); return }
    setCreating(true)
    try {
      // user_id is now injected inside createListing via getCurrentUserId()
      await createListing({
        type: lType, crypto: lCoin, fiat_currency: lFiat,
        amount_crypto: parseFloat(lAmt), price_per_unit: parseFloat(lPrice),
        min_order: parseFloat(lMin), max_order: parseFloat(lMax),
        payment_methods: lPMs, country: lCountry,
      })
      setShowCreate(false); setLAmt(''); setLPrice(''); setLMax(''); setLPMs([])
      await load()
      Toast.show({ type: 'success', text1: 'Listing posted! ✅' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setCreating(false)
  }

  const handleOrder = async () => {
    const min = parseFloat(orderListing.min_order)
    const max = parseFloat(orderListing.max_order)
    const amt = parseFloat(orderAmt)
    if (!orderAmt || amt < min) { Toast.show({ type: 'error', text1: `Min: ${min} ${orderListing.fiat_currency}` }); return }
    if (amt > max) { Toast.show({ type: 'error', text1: `Max: ${max} ${orderListing.fiat_currency}` }); return }
    setPlacingOrder(true)
    try {
      const cryptoAmt = amt / parseFloat(orderListing.price_per_unit)
      await createOrder({
        listing_id:    orderListing.id,
        buyer_id:      tab === 'buy' ? user.id : orderListing.user_id,
        seller_id:     tab === 'buy' ? orderListing.user_id : user.id,
        amount_crypto: cryptoAmt.toFixed(8),
        amount_fiat:   orderAmt,
        fiat_currency: orderListing.fiat_currency,
        escrow_locked: false,
        expires_at:    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      setOrderModal(false); setOrderAmt('')
      await load()
      Toast.show({ type: 'success', text1: 'Order placed! Lock escrow to proceed ✅' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setPlacingOrder(false)
  }

  const handleEscrow = (order) => {
    RNAlert.alert('Lock Escrow 🔐', `Lock ${order.amount_crypto} ${order.listing?.crypto || ''} in escrow?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', onPress: async () => {
        try { await updateOrderStatus(order.id, 'escrow_locked', { escrow_locked: true }); await load(); Toast.show({ type: 'success', text1: 'Escrow locked 🔐' }) }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
      }},
    ])
  }

  const handleRelease = (order) => {
    RNAlert.alert('Release Funds', 'Confirm payment received and release funds to buyer?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Release', style: 'destructive', onPress: async () => {
        try { await updateOrderStatus(order.id, 'completed'); await load(); Toast.show({ type: 'success', text1: 'Funds released! ✅' }) }
        catch (err) { Toast.show({ type: 'error', text1: err.message }) }
      }},
    ])
  }

  const togglePM = (pm) => setLPMs(p => p.includes(pm) ? p.filter(x => x !== pm) : [...p, pm])

  // ── Listing Card ───────────────────────────────────────────
  const ListingCard = ({ listing }) => {
    const isBuy  = listing.type === 'buy'
    const col    = isBuy ? colors.success : colors.danger
    const coinCol = COIN_COLOR[listing.crypto] || colors.accent
    return (
      <View style={[s.listingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.listingHead}>
          <View style={[s.typeBadge, { backgroundColor: `${col}18` }]}>
            <Text style={{ color: col, fontWeight: '800', fontSize: 11 }}>{listing.type.toUpperCase()}</Text>
          </View>
          <View style={[s.coinTag, { backgroundColor: `${coinCol}18`, borderColor: `${coinCol}40` }]}>
            <Text style={{ color: coinCol, fontWeight: '800', fontSize: 13 }}>{listing.crypto}</Text>
          </View>
          <Text style={{ fontSize: 20, marginLeft: 'auto' }}>{FLAG[listing.country] || '🌍'}</Text>
        </View>

        <View style={s.priceRow}>
          <View>
            <Text style={[s.priceMain, { color: colors.text }]}>
              {listing.fiat_currency} {parseFloat(listing.price_per_unit).toLocaleString()}
              <Text style={{ fontSize: 12, color: colors.textSub, fontWeight: '400' }}> / {listing.crypto}</Text>
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 3 }}>
              Limit: {listing.fiat_currency} {listing.min_order} – {listing.max_order}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
              Available: {parseFloat(listing.amount_crypto).toFixed(4)} {listing.crypto}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.tradeBtn, { backgroundColor: `${col}18`, borderColor: `${col}40` }]}
            onPress={() => { setOrderListing(listing); setOrderModal(true) }}
          >
            <Text style={{ color: col, fontWeight: '800', fontSize: 14 }}>{isBuy ? 'Sell' : 'Buy'}</Text>
          </TouchableOpacity>
        </View>

        {listing.payment_methods?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {listing.payment_methods.map((pm, i) => (
              <View key={i} style={[s.pmChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600' }}>{pm}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    )
  }

  // ── Order Card ─────────────────────────────────────────────
  const OrderCard = ({ order }) => {
    const isSeller   = order.seller_id === user?.id
    const statusColor = { pending: colors.warning, escrow_locked: colors.info, completed: colors.success, disputed: colors.danger }[order.status] || colors.textSub
    return (
      <View style={[s.listingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {isSeller ? 'Selling' : 'Buying'} {parseFloat(order.amount_crypto).toFixed(6)} {order.listing?.crypto || ''}
          </Text>
          <View style={[s.typeBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>{order.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
        <InfoRow label="Fiat Amount" value={`${order.fiat_currency} ${order.amount_fiat}`} />
        <InfoRow label="Role"        value={isSeller ? '📦 Seller' : '🛒 Buyer'} last />
        {order.status === 'pending' && isSeller && (
          <PrimaryButton title="🔐 Lock Escrow" onPress={() => handleEscrow(order)} style={{ marginTop: 12 }} />
        )}
        {order.status === 'escrow_locked' && isSeller && (
          <PrimaryButton title="✅ Release Funds" onPress={() => handleRelease(order)} style={{ marginTop: 12 }} />
        )}
        {order.status === 'escrow_locked' && !isSeller && (
          <Alert type="info" style={{ marginTop: 10 }}>Funds locked. Send payment then notify seller.</Alert>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[s.safe]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>P2P Market</Text>
        <TouchableOpacity
          style={[s.postBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
          onPress={() => setShowCreate(true)}
        >
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface2 }]}>
        {[['buy','🟢 Buy'],['sell','🔴 Sell'],['myorders','📋 Orders']].map(([k, l]) => (
          <TouchableOpacity key={k}
            style={[s.tabBtn, tab === k && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
            onPress={() => setTab(k)}
          >
            <Text style={[s.tabLabel, { color: tab === k ? colors.text : colors.textSub }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FIX: Coin filter pills - horizontal scroll with fixed height, NOT column */}
      {tab !== 'myorders' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterContent}
          style={s.filterScroll}
        >
          {CRYPTOS.map(c => {
            const col    = COIN_COLOR[c] || colors.accent
            const active = filterCoin === c
            return (
              <TouchableOpacity
                key={c}
                style={[s.filterPill, {
                  backgroundColor: active ? `${col}18` : colors.surface2,
                  borderColor: active ? `${col}60` : colors.border,
                }]}
                onPress={() => setFilterCoin(c)}
              >
                <Text style={{ color: active ? col : colors.textSub, fontWeight: active ? '700' : '500', fontSize: 13 }}>
                  {c}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />}
      >
        {loading ? (
          <View style={s.centered}><Spinner /></View>
        ) : tab === 'myorders' ? (
          myOrders.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📋</Text>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Orders Yet</Text>
              <Text style={{ color: colors.textSub, textAlign: 'center' }}>Your P2P trade orders will appear here.</Text>
            </View>
          ) : myOrders.map(o => <OrderCard key={o.id} order={o} />)
        ) : listings.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No Listings</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center', marginBottom: SPACING.lg }}>
              No active {tab} listings for {filterCoin}. Be the first!
            </Text>
            <PrimaryButton title="+ Post Listing" onPress={() => setShowCreate(true)} />
          </View>
        ) : listings.map(l => <ListingCard key={l.id} listing={l} />)
        }
      </ScrollView>

      {/* Create Listing Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.border2 }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Post Listing</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Buy / Sell */}
              <View style={[s.segRow, { backgroundColor: colors.surface2 }]}>
                {['sell','buy'].map(t => (
                  <TouchableOpacity key={t}
                    style={[s.segBtn, lType === t && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
                    onPress={() => setLType(t)}
                  >
                    <Text style={{ color: lType === t ? colors.text : colors.textSub, fontWeight: '700', textTransform: 'uppercase' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Cryptocurrency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: SPACING.md }}>
                {CRYPTOS.map(c => {
                  const col = COIN_COLOR[c] || colors.accent
                  return (
                    <TouchableOpacity key={c}
                      style={[s.filterPill, { backgroundColor: lCoin === c ? `${col}18` : colors.surface2, borderColor: lCoin === c ? `${col}60` : colors.border }]}
                      onPress={() => setLCoin(c)}
                    >
                      <Text style={{ color: lCoin === c ? col : colors.textSub, fontWeight: lCoin === c ? '700' : '500', fontSize: 13 }}>{c}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Fiat Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: SPACING.md }}>
                {FIATS.map(f => (
                  <TouchableOpacity key={f}
                    style={[s.filterPill, { backgroundColor: lFiat === f ? colors.accentDim : colors.surface2, borderColor: lFiat === f ? `${colors.accent}60` : colors.border }]}
                    onPress={() => setLFiat(f)}
                  >
                    <Text style={{ color: lFiat === f ? colors.accent : colors.textSub, fontWeight: lFiat === f ? '700' : '500', fontSize: 13 }}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input label={`Amount (${lCoin})`} value={lAmt} onChangeText={setLAmt} keyboardType="decimal-pad" placeholder="e.g. 100" />
              <Input label={`Price per ${lCoin} (${lFiat})`} value={lPrice} onChangeText={setLPrice} keyboardType="decimal-pad" placeholder="e.g. 1.02" />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Input label={`Min (${lFiat})`} value={lMin} onChangeText={setLMin} keyboardType="decimal-pad" placeholder="10" /></View>
                <View style={{ flex: 1 }}><Input label={`Max (${lFiat})`} value={lMax} onChangeText={setLMax} keyboardType="decimal-pad" placeholder="1000" /></View>
              </View>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Your Country</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: SPACING.md }}>
                {COUNTRIES.map(c => (
                  <TouchableOpacity key={c}
                    style={[s.filterPill, { backgroundColor: lCountry === c ? colors.accentDim : colors.surface2, borderColor: lCountry === c ? `${colors.accent}60` : colors.border }]}
                    onPress={() => setLCountry(c)}
                  >
                    <Text style={{ color: lCountry === c ? colors.accent : colors.textSub, fontWeight: lCountry === c ? '700' : '500', fontSize: 12 }}>{FLAG[c]} {c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Payment Methods</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md }}>
                {PMETHODS.map(pm => (
                  <TouchableOpacity key={pm}
                    style={[s.filterPill, { backgroundColor: lPMs.includes(pm) ? colors.accentDim : colors.surface2, borderColor: lPMs.includes(pm) ? `${colors.accent}60` : colors.border }]}
                    onPress={() => togglePM(pm)}
                  >
                    <Text style={{ color: lPMs.includes(pm) ? colors.accent : colors.textSub, fontWeight: lPMs.includes(pm) ? '700' : '500', fontSize: 12 }}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <SecondaryButton title="Cancel" onPress={() => setShowCreate(false)} style={{ flex: 1 }} />
                <PrimaryButton title="Post Listing" onPress={handleCreate} loading={creating} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Order Modal */}
      <Modal visible={orderModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface, maxHeight: '60%' }]}>
            <View style={[s.sheetHandle, { backgroundColor: colors.border2 }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>
              {orderListing?.type === 'buy' ? 'Sell to Buyer' : 'Buy from Seller'}
            </Text>
            {orderListing && (
              <>
                <View style={[{ backgroundColor: colors.surface2, borderRadius: RADIUS.md, padding: 14, marginBottom: SPACING.md, borderWidth: 1, borderColor: colors.border }]}>
                  <InfoRow label="Price" value={`${orderListing.fiat_currency} ${orderListing.price_per_unit} / ${orderListing.crypto}`} />
                  <InfoRow label="Limits" value={`${orderListing.fiat_currency} ${orderListing.min_order} – ${orderListing.max_order}`} last />
                </View>
                <Input
                  label={`Amount (${orderListing.fiat_currency})`}
                  value={orderAmt} onChangeText={setOrderAmt}
                  keyboardType="decimal-pad"
                  placeholder={`Min: ${orderListing.min_order}`}
                />
                {orderAmt && parseFloat(orderAmt) > 0 && (
                  <Text style={{ color: colors.textSub, fontSize: 13, marginTop: -10, marginBottom: 12 }}>
                    ≈ {(parseFloat(orderAmt) / parseFloat(orderListing.price_per_unit)).toFixed(6)} {orderListing.crypto}
                  </Text>
                )}
                <Alert type="warning" style={{ marginBottom: SPACING.md }}>
                  Seller must lock escrow before you send payment.
                </Alert>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton title="Cancel" onPress={() => { setOrderModal(false); setOrderAmt('') }} style={{ flex: 1 }} />
              <PrimaryButton title="Place Order" onPress={handleOrder} loading={placingOrder} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (C) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.sm },
  tabBtn: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  // FIX: filterScroll is a proper horizontal scroll, not a column
  filterScroll: { flexGrow: 0, marginBottom: SPACING.sm },
  filterContent: { paddingHorizontal: SPACING.lg, gap: 8 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },
  centered: { paddingVertical: 60, alignItems: 'center' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  listingCard: { borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, ...SHADOWS.sm },
  listingHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  coinTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceMain: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  tradeBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  pmChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, marginRight: 6, borderWidth: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, maxHeight: '92%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', marginBottom: SPACING.lg },
  segRow: { flexDirection: 'row', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  formLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
})
