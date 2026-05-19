// src/screens/p2p/P2PScreen.js
// REAL P2P FIX:
// 1. buyer_id / seller_id now set based on LISTING OWNERSHIP, not current tab
//    - If YOU own the listing → you are the SELLER → someone else is the BUYER
//    - If SOMEONE ELSE owns the listing → you are the BUYER → they are the SELLER
// 2. Self-trade prevention: cannot place an order on your own listing
// 3. My Orders filter: only shows orders WHERE YOU ARE A PARTY
// 4. Escrow explanation shown inline so users understand the flow

import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, RefreshControl, Alert as RNAlert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  getListings, createListing, createOrder,
  getMyOrders, updateOrderStatus,
} from '../../services/supabase/cardService'
import { supabase } from '../../services/supabase/client'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { PrimaryButton, SecondaryButton, Input, Alert, Spinner, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

const CRYPTOS   = ['USDT','ETH','BNB','MATIC','TRX','BTC']
const FIATS     = ['USD','EUR','GBP','INR','AED','SGD']
const COUNTRIES = ['US','GB','AE','IN','DE','SG','AU','CA','Other']
const PMETHODS  = ['Bank Transfer','PayPal','Wise','Revolut','UPI','Cash App','Venmo']
const FLAG      = { US:'🇺🇸',GB:'🇬🇧',AE:'🇦🇪',IN:'🇮🇳',DE:'🇩🇪',SG:'🇸🇬',AU:'🇦🇺',CA:'🇨🇦',Other:'🌍' }
const COIN_COLOR= { USDT:'#26a17b',ETH:'#627EEA',BNB:'#F3BA2F',MATIC:'#8247E5',TRX:'#ff2d55',BTC:'#f7931a' }

// ── Escrow Flow Explanation ────────────────────────────────────
// When you post a BUY listing:
//   You = Buyer  |  Others click "Sell to me" → they become Seller
//   Seller must lock crypto in escrow (database flag for now)
//   Buyer sends fiat payment OUTSIDE the app (bank/UPI/PayPal etc.)
//   Seller confirms payment received → releases escrow → trade complete
//
// When you post a SELL listing:
//   You = Seller | Others click "Buy from me" → they become Buyer
//   YOU must lock escrow once order is placed
//   Buyer sends fiat payment outside the app
//   YOU release escrow after confirming payment received

export default function P2PScreen() {
  const { user } = useApp()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  const [tab,        setTab]        = useState('buy')    // buy listings | sell listings | myorders
  const [listings,   setListings]   = useState([])
  const [myOrders,   setMyOrders]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterCoin, setFilterCoin] = useState('USDT')

  // Create listing
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

  // Order modal
  const [orderModal,   setOrderModal]   = useState(false)
  const [orderListing, setOrderListing] = useState(null)
  const [orderAmt,     setOrderAmt]     = useState('')
  const [placingOrder, setPlacingOrder] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, orders] = await Promise.all([
        // Show BUY listings on Buy tab, SELL listings on Sell tab
        getListings({ type: tab === 'myorders' ? undefined : tab, crypto: filterCoin }),
        user ? getMyOrders(user.id) : Promise.resolve([]),
      ])
      setListings(list)
      setMyOrders(orders)
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setLoading(false); setRefreshing(false)
  }, [tab, filterCoin, user])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!lAmt || !lPrice || !lMax)  { Toast.show({ type: 'error', text1: 'Fill all required fields' }); return }
    if (lPMs.length === 0)          { Toast.show({ type: 'error', text1: 'Select at least one payment method' }); return }
    setCreating(true)
    try {
      // user_id injected in service via getCurrentUserId()
      await createListing({
        type: lType, crypto: lCoin, fiat_currency: lFiat,
        amount_crypto: parseFloat(lAmt),
        price_per_unit: parseFloat(lPrice),
        min_order: parseFloat(lMin),
        max_order: parseFloat(lMax),
        payment_methods: lPMs,
        country: lCountry,
      })
      setShowCreate(false); setLAmt(''); setLPrice(''); setLMax(''); setLPMs([])
      await load()
      Toast.show({ type: 'success', text1: 'Listing posted! ✅' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setCreating(false)
  }

  const handleOrderPress = (listing) => {
    // SELF-TRADE PREVENTION: cannot trade on your own listing
    if (listing.user_id === user?.id) {
      Toast.show({ type: 'warning', text1: "Can't trade on your own listing" })
      return
    }
    setOrderListing(listing)
    setOrderModal(true)
  }

  const handlePlaceOrder = async () => {
    if (!orderListing) return
    const min = parseFloat(orderListing.min_order)
    const max = parseFloat(orderListing.max_order)
    const amt = parseFloat(orderAmt)
    if (!orderAmt || amt < min) { Toast.show({ type: 'error', text1: `Minimum order: ${min} ${orderListing.fiat_currency}` }); return }
    if (amt > max)              { Toast.show({ type: 'error', text1: `Maximum order: ${max} ${orderListing.fiat_currency}` }); return }

    setPlacingOrder(true)
    try {
      const cryptoAmt = amt / parseFloat(orderListing.price_per_unit)

      // CORRECT BUYER/SELLER LOGIC based on listing ownership:
      // listing.type === 'buy'  → listing owner wants to BUY  → they are BUYER,  you are SELLER
      // listing.type === 'sell' → listing owner wants to SELL → they are SELLER, you are BUYER
      const isListingBuy = orderListing.type === 'buy'
      const buyerId  = isListingBuy ? orderListing.user_id : user.id
      const sellerId = isListingBuy ? user.id               : orderListing.user_id

      await createOrder({
        listing_id:    orderListing.id,
        buyer_id:      buyerId,
        seller_id:     sellerId,
        amount_crypto: cryptoAmt.toFixed(8),
        amount_fiat:   orderAmt,
        fiat_currency: orderListing.fiat_currency,
        escrow_locked: false,
        status:        'pending',
        expires_at:    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      setOrderModal(false); setOrderAmt('')
      await load()

      const msg = isListingBuy
        ? 'Order placed! Wait for the buyer to lock escrow.'
        : 'Order placed! Lock escrow to proceed.'
      Toast.show({ type: 'success', text1: msg })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setPlacingOrder(false)
  }

  const handleEscrow = (order) => {
    RNAlert.alert(
      'Lock Escrow 🔐',
      `Lock ${order.amount_crypto} ${order.listing?.crypto || 'crypto'} in escrow?\n\nThis signals to the buyer that funds are reserved. They will then send you ${order.fiat_currency} ${order.amount_fiat} via ${order.listing?.payment_methods?.[0] || 'agreed method'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Lock Escrow', onPress: async () => {
          try {
            await updateOrderStatus(order.id, 'escrow_locked', { escrow_locked: true })
            await load()
            Toast.show({ type: 'success', text1: 'Escrow locked 🔐 — Buyer will now send payment' })
          } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
        }},
      ]
    )
  }

  const handleRelease = (order) => {
    RNAlert.alert(
      'Release Funds ✅',
      `Have you received ${order.fiat_currency} ${order.amount_fiat} from the buyer?\n\nOnly release funds AFTER confirming payment. This action is irreversible.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Yes, Release Funds', style: 'destructive', onPress: async () => {
          try {
            await updateOrderStatus(order.id, 'completed')
            await load()
            Toast.show({ type: 'success', text1: 'Trade complete! Funds released ✅' })
          } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
        }},
      ]
    )
  }

  const handleDispute = (order) => {
    RNAlert.alert(
      'Open Dispute',
      'Flag this trade for review. Use this if you have not received payment after the escrow deadline.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Dispute', style: 'destructive', onPress: async () => {
          try {
            await updateOrderStatus(order.id, 'disputed', { dispute_reason: 'Payment not received' })
            await load()
            Toast.show({ type: 'warning', text1: 'Dispute opened — under review' })
          } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
        }},
      ]
    )
  }

  const togglePM = (pm) => setLPMs(p => p.includes(pm) ? p.filter(x => x !== pm) : [...p, pm])

  // ── Listing Card ──────────────────────────────────────────
  const ListingCard = ({ listing }) => {
    const isOwn     = listing.user_id === user?.id
    const coinCol   = COIN_COLOR[listing.crypto] || colors.accent
    const isBuyList = listing.type === 'buy'
    // Button label: on a BUY listing → others can SELL to the poster
    //               on a SELL listing → others can BUY from the poster
    const btnLabel  = isBuyList ? 'Sell to Buyer' : 'Buy Now'
    const btnColor  = isBuyList ? colors.danger   : colors.success

    return (
      <View style={[s.listingCard, { backgroundColor: colors.surface, borderColor: isOwn ? `${colors.accent}50` : colors.border }]}>
        {isOwn && (
          <View style={[s.ownBadge, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}>
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>YOUR LISTING</Text>
          </View>
        )}
        <View style={s.listingHead}>
          <View style={[s.typePill, { backgroundColor: `${isBuyList ? colors.success : colors.danger}15` }]}>
            <Text style={{ color: isBuyList ? colors.success : colors.danger, fontWeight: '800', fontSize: 11 }}>
              {listing.type.toUpperCase()}
            </Text>
          </View>
          <View style={[s.coinPill, { backgroundColor: `${coinCol}15`, borderColor: `${coinCol}40` }]}>
            <Text style={{ color: coinCol, fontWeight: '800', fontSize: 13 }}>{listing.crypto}</Text>
          </View>
          <Text style={{ fontSize: 20, marginLeft: 'auto' }}>{FLAG[listing.country] || '🌍'}</Text>
        </View>

        <View style={s.priceRow}>
          <View>
            <Text style={[s.priceMain, { color: colors.text }]}>
              {listing.fiat_currency} {parseFloat(listing.price_per_unit).toLocaleString()}
              <Text style={{ fontSize: 12, color: colors.textSub }}> / {listing.crypto}</Text>
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 3 }}>
              Limit: {listing.fiat_currency} {listing.min_order}–{listing.max_order}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
              Available: {parseFloat(listing.amount_crypto).toFixed(4)} {listing.crypto}
            </Text>
          </View>
          {!isOwn && (
            <TouchableOpacity
              style={[s.tradeBtn, { backgroundColor: `${btnColor}15`, borderColor: `${btnColor}40` }]}
              onPress={() => handleOrderPress(listing)}
            >
              <Text style={{ color: btnColor, fontWeight: '800', fontSize: 13 }}>{btnLabel}</Text>
            </TouchableOpacity>
          )}
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

  // ── Order Card ────────────────────────────────────────────
  const OrderCard = ({ order }) => {
    const isSeller   = order.seller_id === user?.id
    const isBuyer    = order.buyer_id  === user?.id
    const statusCols = {
      pending:      colors.warning,
      escrow_locked:colors.info,
      completed:    colors.success,
      disputed:     colors.danger,
    }
    const statusColor = statusCols[order.status] || colors.textSub

    return (
      <View style={[s.listingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {isSeller ? '📦 Selling' : '🛒 Buying'} {parseFloat(order.amount_crypto).toFixed(6)} {order.listing?.crypto || ''}
          </Text>
          <View style={[s.statusPill, { backgroundColor: `${statusColor}15` }]}>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {order.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <InfoRow label="Fiat Amount" value={`${order.fiat_currency} ${order.amount_fiat}`} />
        <InfoRow label="Your role"   value={isSeller ? 'Seller (you have the crypto)' : 'Buyer (you send fiat)'} />
        {order.expires_at && <InfoRow label="Expires"  value={new Date(order.expires_at).toLocaleTimeString()} last />}

        {/* Flow explanation */}
        {order.status === 'pending' && (
          <View style={[s.flowBox, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>
              {isSeller
                ? '👇 You need to lock your crypto in escrow. This shows the buyer you have the funds. They will then send you fiat payment.'
                : '⏳ Waiting for seller to lock escrow. Once locked, send fiat payment and notify them.'}
            </Text>
          </View>
        )}

        {order.status === 'escrow_locked' && (
          <View style={[s.flowBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30` }]}>
            <Text style={{ color: colors.info, fontSize: 12, lineHeight: 18 }}>
              {isSeller
                ? '🔐 Escrow locked. Waiting for buyer to send fiat payment. Release funds ONLY after confirming you received payment.'
                : `💸 Escrow is locked! Now send ${order.fiat_currency} ${order.amount_fiat} to the seller via agreed payment method. Then notify them.`}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ marginTop: 12, gap: 8 }}>
          {order.status === 'pending' && isSeller && (
            <PrimaryButton title="🔐 Lock Escrow" onPress={() => handleEscrow(order)} />
          )}
          {order.status === 'escrow_locked' && isSeller && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <PrimaryButton title="✅ Release Funds" onPress={() => handleRelease(order)} style={{ flex: 1 }} />
              <TouchableOpacity
                style={[s.disputeBtn, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}40` }]}
                onPress={() => handleDispute(order)}>
                <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>⚠ Dispute</Text>
              </TouchableOpacity>
            </View>
          )}
          {order.status === 'completed' && (
            <View style={[s.flowBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                ✅ Trade Complete!
              </Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.text }]}>P2P Market</Text>
        <TouchableOpacity
          style={[s.postBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
          onPress={() => setShowCreate(true)}>
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[s.tabRow, { backgroundColor: colors.surface2 }]}>
        {[['buy','🟢 Buy'],['sell','🔴 Sell'],['myorders','📋 My Orders']].map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.tabBtn, tab === k && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
            onPress={() => setTab(k)}>
            <Text style={[s.tabLabel, { color: tab === k ? colors.text : colors.textSub }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coin filter pills — FIX: proper horizontal scroll, not column */}
      {tab !== 'myorders' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8, paddingBottom: 4 }}
          style={{ flexGrow: 0, marginBottom: 8 }}
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

      {/* ── Create Listing Modal ── */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border2 }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Post Listing</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Buy/Sell toggle */}
              <View style={[s.segRow, { backgroundColor: colors.surface2 }]}>
                {['sell','buy'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.segBtn, lType === t && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
                    onPress={() => setLType(t)}>
                    <Text style={{ color: lType === t ? colors.text : colors.textSub, fontWeight: '700', textTransform: 'uppercase' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[s.infoBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}30` }]}>
                <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>
                  {lType === 'sell'
                    ? '📢 You are advertising to SELL crypto. Buyers will contact you and pay fiat. You release crypto after receiving payment.'
                    : '📢 You are advertising to BUY crypto. Sellers will offer their crypto. You send fiat payment after they lock escrow.'}
                </Text>
              </View>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Cryptocurrency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                {CRYPTOS.map(c => {
                  const col = COIN_COLOR[c] || colors.accent
                  return (
                    <TouchableOpacity key={c}
                      style={[s.filterPill, { backgroundColor: lCoin === c ? `${col}18` : colors.surface2, borderColor: lCoin === c ? `${col}60` : colors.border }]}
                      onPress={() => setLCoin(c)}>
                      <Text style={{ color: lCoin === c ? col : colors.textSub, fontWeight: lCoin === c ? '700' : '500', fontSize: 13 }}>{c}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Fiat Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                {FIATS.map(f => (
                  <TouchableOpacity key={f}
                    style={[s.filterPill, { backgroundColor: lFiat === f ? colors.accentDim : colors.surface2, borderColor: lFiat === f ? `${colors.accent}60` : colors.border }]}
                    onPress={() => setLFiat(f)}>
                    <Text style={{ color: lFiat === f ? colors.accent : colors.textSub, fontWeight: lFiat === f ? '700' : '500', fontSize: 13 }}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input label={`Amount (${lCoin})`}            value={lAmt}   onChangeText={setLAmt}   keyboardType="decimal-pad" placeholder="e.g. 100" />
              <Input label={`Your price per ${lCoin} (${lFiat})`} value={lPrice} onChangeText={setLPrice} keyboardType="decimal-pad" placeholder="e.g. 1.02" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Input label={`Min Order (${lFiat})`} value={lMin} onChangeText={setLMin} keyboardType="decimal-pad" placeholder="10" /></View>
                <View style={{ flex: 1 }}><Input label={`Max Order (${lFiat})`} value={lMax} onChangeText={setLMax} keyboardType="decimal-pad" placeholder="1000" /></View>
              </View>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Country</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                {COUNTRIES.map(c => (
                  <TouchableOpacity key={c}
                    style={[s.filterPill, { backgroundColor: lCountry === c ? colors.accentDim : colors.surface2, borderColor: lCountry === c ? `${colors.accent}60` : colors.border }]}
                    onPress={() => setLCountry(c)}>
                    <Text style={{ color: lCountry === c ? colors.accent : colors.textSub, fontWeight: lCountry === c ? '700' : '500', fontSize: 12 }}>{FLAG[c]} {c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[s.formLabel, { color: colors.textSub }]}>Payment Methods</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md }}>
                {PMETHODS.map(pm => (
                  <TouchableOpacity key={pm}
                    style={[s.filterPill, { backgroundColor: lPMs.includes(pm) ? colors.accentDim : colors.surface2, borderColor: lPMs.includes(pm) ? `${colors.accent}60` : colors.border }]}
                    onPress={() => togglePM(pm)}>
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

      {/* ── Order Modal ── */}
      <Modal visible={orderModal} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.sheet, { backgroundColor: colors.surface, maxHeight: '65%' }]}>
            <View style={[s.handle, { backgroundColor: colors.border2 }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>
              {orderListing?.type === 'buy' ? 'Sell to This Buyer' : 'Buy from This Seller'}
            </Text>
            {orderListing && (
              <>
                <View style={[s.infoBox, { backgroundColor: colors.surface2, borderColor: colors.border, marginBottom: SPACING.md }]}>
                  <InfoRow label="Price"       value={`${orderListing.fiat_currency} ${orderListing.price_per_unit} / ${orderListing.crypto}`} />
                  <InfoRow label="Order Limits" value={`${orderListing.fiat_currency} ${orderListing.min_order} – ${orderListing.max_order}`} last />
                </View>

                <Input
                  label={`Your Amount (${orderListing.fiat_currency})`}
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
                  {orderListing.type === 'buy'
                    ? '🔐 After placing order, you (seller) must lock escrow. The buyer then sends fiat payment. Release funds after confirming receipt.'
                    : '⏳ After placing order, wait for seller to lock escrow. Then send fiat payment via agreed method.'}
                </Alert>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton title="Cancel" onPress={() => { setOrderModal(false); setOrderAmt('') }} style={{ flex: 1 }} />
              <PrimaryButton title="Place Order" onPress={handlePlaceOrder} loading={placingOrder} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const makeStyles = (C) => StyleSheet.create({
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerTitle:{ fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  postBtn:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  tabRow:    { flexDirection: 'row', marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: 4, marginBottom: 8 },
  tabBtn:    { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabLabel:  { fontSize: 12, fontWeight: '600' },
  filterPill:{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  scroll:    { padding: SPACING.lg, paddingBottom: 100 },
  centered:  { paddingVertical: 60, alignItems: 'center' },
  empty:     { paddingVertical: 60, alignItems: 'center' },
  emptyTitle:{ fontSize: 20, fontWeight: '800', marginBottom: 8 },
  listingCard:{ borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, ...SHADOWS.sm, position: 'relative' },
  ownBadge:  { position: 'absolute', top: 12, right: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  listingHead:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typePill:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  coinPill:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
  priceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceMain: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  tradeBtn:  { paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  pmChip:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, marginRight: 6, borderWidth: 1 },
  statusPill:{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full },
  flowBox:   { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginTop: 8 },
  infoBox:   { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginBottom: SPACING.md },
  disputeBtn:{ paddingHorizontal: 16, paddingVertical: 13, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, maxHeight: '92%' },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:{ fontSize: 20, fontWeight: '800', marginBottom: SPACING.md },
  segRow:    { flexDirection: 'row', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  segBtn:    { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  formLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
})
