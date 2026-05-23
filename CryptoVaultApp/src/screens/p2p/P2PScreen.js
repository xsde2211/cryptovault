// src/screens/p2p/P2PScreen.js
// Full escrow-based P2P trading system.
// Sell listings: crypto locked on-chain before listing is created.
// Buy flow: Razorpay payment → automatic crypto release.
// Realtime updates via Supabase channels.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, RefreshControl, Alert as RNAlert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApp }   from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS } from '../../utils/theme'
import { PrimaryButton, SecondaryButton, Input, Alert, Spinner, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

import {
  getListings, postSellListing, postBuyListing,
  getMyOrders, cancelListing, initiatePurchase, completePurchase,
  subscribeToListings, subscribeToMyOrders,
} from '../../services/supabase/p2pService'
import { openRazorpayCheckout } from '../../services/razorpay/razorpayService'
import { NETWORKS } from '../../utils/networks'

// ── Constants ──────────────────────────────────────────────────────────
const CRYPTOS   = ['USDT','ETH','BNB','MATIC','TRX','BTC']
const FIATS     = ['INR','USD','EUR','GBP','AED','SGD']
const COUNTRIES = ['US','GB','AE','IN','DE','SG','AU','CA','Other']
const PMETHODS  = ['Bank Transfer','UPI','PayPal','Wise','Revolut','Cash App','Venmo']
const FLAG      = { US:'🇺🇸',GB:'🇬🇧',AE:'🇦🇪',IN:'🇮🇳',DE:'🇩🇪',SG:'🇸🇬',AU:'🇦🇺',CA:'🇨🇦',Other:'🌍' }
const COIN_COLOR = { USDT:'#26a17b',ETH:'#627EEA',BNB:'#F3BA2F',MATIC:'#8247E5',TRX:'#ff2d55',BTC:'#f7931a' }

const P2P_NETWORKS = {
  eth_sepolia:     { label: 'Ethereum Sepolia (Testnet)', cryptos: ['ETH','USDT'] },
  eth_mainnet:     { label: 'Ethereum',                   cryptos: ['ETH','USDT','BTC'] },
  bsc_mainnet:     { label: 'BNB Smart Chain',            cryptos: ['BNB','USDT','BTC'] },
  polygon_mainnet: { label: 'Polygon',                    cryptos: ['MATIC','USDT'] },
}

const STATUS_COLORS = {
  active:            '#26a17b',
  reserved:          '#f59e0b',
  completed:         '#627EEA',
  cancelled:         '#ef4444',
  payment_initiated: '#f59e0b',
  payment_confirmed: '#3b82f6',
  crypto_releasing:  '#8247E5',
  disputed:          '#ef4444',
}

const STATUS_LABELS = {
  active:            '● Active',
  reserved:          '⏳ Reserved',
  completed:         '✓ Completed',
  cancelled:         '✗ Cancelled',
  payment_initiated: '💳 Paying...',
  payment_confirmed: '✓ Paid',
  crypto_releasing:  '⛓ Releasing...',
  disputed:          '⚠ Disputed',
}

// ── Countdown Timer Hook ────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!targetDate) return
    const tick = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) { setTimeLeft('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return timeLeft
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════
export default function P2PScreen() {
  const { user }   = useApp()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  // ── Tabs & filters ─────────────────────────────────────────────────
  const [tab,        setTab]        = useState('buy')
  const [filterCoin, setFilterCoin] = useState('USDT')
  const [listings,   setListings]   = useState([])
  const [myOrders,   setMyOrders]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Create listing modal ────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [lType,   setLType]   = useState('sell')
  const [lCoin,   setLCoin]   = useState('USDT')
  const [lFiat,   setLFiat]   = useState('INR')
  const [lAmt,    setLAmt]    = useState('')
  const [lPrice,  setLPrice]  = useState('')
  const [lMin,    setLMin]    = useState('')
  const [lMax,    setLMax]    = useState('')
  const [lCountry,setLCountry]= useState('IN')
  const [lPMs,    setLPMs]    = useState([])
  const [lNetwork,setLNetwork]= useState('eth_sepolia')

  // ── Escrow confirmation modal (sell listing) ────────────────────────
  const [showEscrowConfirm, setShowEscrowConfirm] = useState(false)
  const [escrowFormData,    setEscrowFormData]    = useState(null)
  const [sellerAddr,   setSellerAddr]   = useState('')
  const [sellerPK,     setSellerPK]     = useState('')
  const [showPK,       setShowPK]       = useState(false)
  const [postingListing,setPostingListing] = useState(false)
  const [postStep,      setPostStep]    = useState('form') // 'form' | 'escrow' | 'confirming' | 'done'
  const [gasEstimate,   setGasEstimate] = useState(null)

  // ── Buy modal ───────────────────────────────────────────────────────
  const [buyModal,    setBuyModal]    = useState(false)
  const [buyListing,  setBuyListing]  = useState(null)
  const [buyAmt,      setBuyAmt]      = useState('')
  const [buyWallet,   setBuyWallet]   = useState('')
  const [buyStep,     setBuyStep]     = useState('form') // 'form' | 'paying' | 'releasing' | 'done'
  const [buyOrder,    setBuyOrder]    = useState(null)
  const [buyReservedUntil, setBuyReservedUntil] = useState(null)
  const buyTimer = useCountdown(buyReservedUntil)

  // ── Load data ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, orders] = await Promise.all([
        tab !== 'myorders' ? getListings({ type: tab, crypto: filterCoin }) : Promise.resolve([]),
        user ? getMyOrders() : Promise.resolve([]),
      ])
      setListings(list)
      setMyOrders(orders)
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setLoading(false)
    setRefreshing(false)
  }, [tab, filterCoin, user])

  useEffect(() => { load() }, [load])

  // ── Realtime subscriptions ──────────────────────────────────────────
  useEffect(() => {
    const listingsSub = subscribeToListings(() => load())
    const ordersSub   = user ? subscribeToMyOrders(user.id, () => {
      getMyOrders().then(setMyOrders).catch(() => {})
    }) : null

    return () => {
      listingsSub.unsubscribe()
      ordersSub?.unsubscribe()
    }
  }, [user])

  // ── Auto-fill max order ─────────────────────────────────────────────
  useEffect(() => {
    if (lAmt && lPrice) {
      const calculated = (parseFloat(lAmt) * parseFloat(lPrice)).toFixed(2)
      if (!isNaN(calculated)) setLMax(calculated)
    }
  }, [lAmt, lPrice])

  // ══════════════════════════════════════════════════════════════════════
  // POST LISTING HANDLERS
  // ══════════════════════════════════════════════════════════════════════
  const handleCreatePress = () => {
    if (!lAmt || !lPrice || !lMin || !lMax) {
      Toast.show({ type: 'error', text1: 'Fill in all required fields' }); return
    }
    if (lPMs.length === 0) {
      Toast.show({ type: 'error', text1: 'Select at least one payment method' }); return
    }
    const maxAllowed = parseFloat(lAmt) * parseFloat(lPrice)
    if (parseFloat(lMax) > maxAllowed) {
      Toast.show({ type: 'error', text1: `Max order cannot exceed ${maxAllowed.toFixed(2)} (amount × price)` }); return
    }
    const formData = {
      crypto: lCoin, fiat_currency: lFiat,
      amount_crypto: lAmt, price_per_unit: lPrice,
      min_order: lMin, max_order: lMax,
      payment_methods: lPMs, country: lCountry, network: lNetwork,
    }
    if (lType === 'sell') {
      setEscrowFormData(formData)
      setPostStep('escrow')
      setShowEscrowConfirm(true)
    } else {
      handlePostBuyListing(formData)
    }
  }

  const handlePostBuyListing = async (formData) => {
    setPostingListing(true)
    try {
      await postBuyListing({ ...formData, type: 'buy' })
      setShowCreate(false); resetCreateForm()
      await load()
      Toast.show({ type: 'success', text1: '📢 Buy listing posted!' })
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setPostingListing(false)
  }

  const handleConfirmEscrow = async () => {
    if (!sellerAddr.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your wallet address' }); return
    }
    if (!sellerPK.trim()) {
      Toast.show({ type: 'error', text1: 'Enter your private key' }); return
    }
    if (sellerAddr.trim().length < 40) {
      Toast.show({ type: 'error', text1: 'Invalid wallet address' }); return
    }

    setPostStep('confirming')
    setPostingListing(true)

    try {
      const result = await postSellListing({
        ...escrowFormData,
        seller_address: sellerAddr.trim(),
        private_key:    sellerPK.trim(),
      })
      setGasEstimate(result.gas_estimate)
      setPostStep('done')
      await load()
      Toast.show({ type: 'success', text1: `✅ Listing live! Escrow TX: ${result.tx_hash?.slice(0, 10)}…` })
      setTimeout(() => {
        setShowEscrowConfirm(false)
        setShowCreate(false)
        resetCreateForm()
        setPostStep('form')
      }, 3000)
    } catch (err) {
      setPostStep('escrow')
      Toast.show({ type: 'error', text1: err.message })
    }
    setPostingListing(false)
  }

  const resetCreateForm = () => {
    setLAmt(''); setLPrice(''); setLMin(''); setLMax(''); setLPMs([])
    setSellerAddr(''); setSellerPK(''); setShowPK(false)
    setGasEstimate(null); setEscrowFormData(null)
  }

  // ══════════════════════════════════════════════════════════════════════
  // BUY / PURCHASE FLOW
  // ══════════════════════════════════════════════════════════════════════
  const handleBuyPress = (listing) => {
    if (listing.user_id === user?.id) {
      Toast.show({ type: 'warning', text1: "Can't trade on your own listing" }); return
    }
    if (listing.status === 'reserved') {
      Toast.show({ type: 'info', text1: '⏳ This listing is in payment process' }); return
    }
    setBuyListing(listing)
    setBuyAmt('')
    setBuyWallet('')
    setBuyStep('form')
    setBuyModal(true)
  }

  const handleInitiatePurchase = async () => {
    if (!buyAmt || parseFloat(buyAmt) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter amount' }); return
    }
    if (!buyWallet || buyWallet.length < 40) {
      Toast.show({ type: 'error', text1: 'Enter your wallet address to receive crypto' }); return
    }
    const fiat = parseFloat(buyAmt)
    if (fiat < buyListing.min_order) {
      Toast.show({ type: 'error', text1: `Minimum: ${buyListing.fiat_currency} ${buyListing.min_order}` }); return
    }
    if (fiat > buyListing.max_order) {
      Toast.show({ type: 'error', text1: `Maximum: ${buyListing.fiat_currency} ${buyListing.max_order}` }); return
    }

    setBuyStep('paying')
    try {
      // Create Razorpay order + reserve listing
      const result = await initiatePurchase({
        listing_id:       buyListing.id,
        amount_fiat:      buyAmt,
        buyer_wallet_addr: buyWallet.trim(),
      })

      setBuyOrder({ id: result.order_id, ...result })
      setBuyReservedUntil(result.reserved_until)

      // Open Razorpay payment sheet
      const { data: { session } } = await import('../../services/supabase/client').then(m => m.supabase.auth.getSession())
      const rzResult = await openRazorpayCheckout({
        orderId:     result.razorpay_order_id,
        amount:      result.amount,
        currency:    result.currency,
        description: `Buy ${result.crypto_amount} ${result.crypto}`,
        userName:    user?.email?.split('@')[0] || '',
        userEmail:   user?.email || '',
      })

      // Payment succeeded — trigger crypto release
      setBuyStep('releasing')
      Toast.show({ type: 'success', text1: '💳 Payment confirmed! Releasing crypto…' })

      const completion = await completePurchase({
        order_id:            result.order_id,
        razorpay_payment_id: rzResult.razorpay_payment_id,
        razorpay_order_id:   rzResult.razorpay_order_id,
        razorpay_signature:  rzResult.razorpay_signature,
      })

      setBuyStep('done')
      Toast.show({
        type: 'success',
        text1: `🎉 ${result.crypto_amount} ${result.crypto} sent to your wallet!`,
        text2: `TX: ${completion.crypto_release_tx?.slice(0, 16)}…`,
        visibilityTime: 6000,
      })

      setTimeout(() => {
        setBuyModal(false)
        load()
      }, 3000)

    } catch (err) {
      setBuyStep('form')
      if (err.message?.includes('cancel')) {
        Toast.show({ type: 'info', text1: 'Payment cancelled' })
      } else {
        Toast.show({ type: 'error', text1: err.message })
      }
    }
  }

  // ── Delete listing ──────────────────────────────────────────────────
  const handleDeleteListing = (listing) => {
    const warningMsg = listing.escrow_status === 'locked'
      ? `Your ${listing.amount_crypto} ${listing.crypto} will be refunded to your wallet.`
      : 'This listing will be removed.'

    RNAlert.alert('Delete Listing', warningMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelListing(listing.id)
            await load()
            Toast.show({ type: 'success', text1: listing.escrow_status === 'locked' ? 'Listing deleted + refund initiated' : 'Listing deleted' })
          } catch (err) {
            Toast.show({ type: 'error', text1: err.message })
          }
        },
      },
    ])
  }

  const togglePM = (pm) => setLPMs(p => p.includes(pm) ? p.filter(x => x !== pm) : [...p, pm])

  // ══════════════════════════════════════════════════════════════════════
  // RENDER: LISTING CARD
  // ══════════════════════════════════════════════════════════════════════
  const ListingCard = ({ listing }) => {
    const isOwn      = listing.user_id === user?.id
    const coinCol    = COIN_COLOR[listing.crypto] || colors.accent
    const isBuyList  = listing.type === 'buy'
    const isReserved = listing.status === 'reserved'
    const btnLabel   = isBuyList ? 'Sell to Buyer' : 'Buy Now'
    const btnColor   = isBuyList ? colors.danger : colors.success

    return (
      <View style={[s.card, {
        backgroundColor: colors.surface,
        borderColor:     isOwn ? `${colors.accent}50` : colors.border,
        opacity:         isReserved && !isOwn ? 0.7 : 1,
      }]}>
        {/* Header row */}
        <View style={s.cardHead}>
          <View style={[s.typePill, { backgroundColor: `${isBuyList ? colors.success : colors.danger}15` }]}>
            <Text style={{ color: isBuyList ? colors.success : colors.danger, fontWeight: '800', fontSize: 11 }}>
              {listing.type.toUpperCase()}
            </Text>
          </View>
          <View style={[s.coinPill, { backgroundColor: `${coinCol}15`, borderColor: `${coinCol}40` }]}>
            <Text style={{ color: coinCol, fontWeight: '800', fontSize: 13 }}>{listing.crypto}</Text>
          </View>
          {listing.escrow_status === 'locked' && (
            <View style={[s.escrowBadge, { backgroundColor: `${colors.success}15` }]}>
              <Text style={{ color: colors.success, fontSize: 10, fontWeight: '700' }}>🔐 Escrow</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={s.flag}>{FLAG[listing.country] || '🌍'}</Text>
        </View>

        {/* Reserved banner */}
        {isReserved && (
          <View style={[s.reservedBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}>
            <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '600' }}>
              {isOwn ? '⏳ Someone is in payment process' : '⏳ Currently reserved — check back in a few minutes'}
            </Text>
          </View>
        )}

        {/* Price row */}
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.priceMain, { color: colors.text }]}>
              {listing.fiat_currency} {parseFloat(listing.price_per_unit).toLocaleString()}
              <Text style={{ fontSize: 12, color: colors.textSub }}> / {listing.crypto}</Text>
            </Text>
            <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 3 }}>
              Limit: {listing.fiat_currency} {listing.min_order}–{listing.max_order}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
              Available: {parseFloat(listing.amount_crypto).toFixed(6)} {listing.crypto}
            </Text>
          </View>

          {!isOwn && !isReserved && (
            <TouchableOpacity
              style={[s.tradeBtn, { backgroundColor: `${btnColor}15`, borderColor: `${btnColor}40` }]}
              onPress={() => handleBuyPress(listing)}
            >
              <Text style={{ color: btnColor, fontWeight: '800', fontSize: 13 }}>{btnLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment methods */}
        {listing.payment_methods?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {listing.payment_methods.map((pm, i) => (
              <View key={i} style={[s.pmChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                <Text style={{ color: colors.textSub, fontSize: 10, fontWeight: '600' }}>{pm}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Own listing controls */}
        {isOwn && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={[s.ownBadge, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>YOUR LISTING</Text>
            </View>
            <TouchableOpacity
              style={[s.deleteBtnSmall, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}40` }]}
              onPress={() => handleDeleteListing(listing)}
            >
              <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER: ORDER CARD
  // ══════════════════════════════════════════════════════════════════════
  const OrderCard = ({ order }) => {
    const isSeller    = order.seller_id === user?.id
    const statusColor = STATUS_COLORS[order.status] || colors.textSub
    const timer       = useCountdown(order.status === 'payment_initiated' ? order.expires_at : null)

    return (
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>
            {isSeller ? '📦 Selling' : '🛒 Buying'}{' '}
            {parseFloat(order.amount_crypto || 0).toFixed(6)}{' '}
            {order.listing?.crypto || ''}
          </Text>
          <View style={[s.statusPill, { backgroundColor: `${statusColor}15` }]}>
            <Text style={{ color: statusColor, fontWeight: '700', fontSize: 10 }}>
              {STATUS_LABELS[order.status] || order.status}
            </Text>
          </View>
        </View>

        <InfoRow label="Fiat"     value={`${order.fiat_currency} ${order.amount_fiat}`} />
        <InfoRow label="Role"     value={isSeller ? 'Seller' : 'Buyer'} />
        <InfoRow label="Network"  value={NETWORKS[order.network]?.name || order.network || '—'} />
        {order.crypto_release_tx && (
          <InfoRow label="Release TX" value={`${order.crypto_release_tx.slice(0, 16)}…`} last />
        )}

        {/* Timer for active payment */}
        {order.status === 'payment_initiated' && timer && timer !== 'Expired' && (
          <View style={[s.flowBox, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
            <Text style={{ color: colors.warning, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              ⏱ Payment window: {timer}
            </Text>
          </View>
        )}

        {/* Status messages */}
        {order.status === 'crypto_releasing' && (
          <View style={[s.flowBox, { backgroundColor: `${colors.info}10`, borderColor: `${colors.info}30`, flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={colors.info} />
            <Text style={{ color: colors.info, fontSize: 12, flex: 1 }}>
              Transferring {order.listing?.crypto} to your wallet…
            </Text>
          </View>
        )}

        {order.status === 'completed' && (
          <View style={[s.flowBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
            <Text style={{ color: colors.success, fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
              ✅ Trade Complete!
            </Text>
            {order.crypto_release_tx && (
              <Text style={{ color: colors.success, fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                {isSeller ? 'Fiat payout pending (1–2 business days)' : `${order.listing?.crypto} sent to your wallet`}
              </Text>
            )}
          </View>
        )}

        {order.status === 'disputed' && (
          <View style={[s.flowBox, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}30` }]}>
            <Text style={{ color: colors.danger, fontSize: 12, textAlign: 'center' }}>
              ⚠️ Under review — our team will contact you within 24h
            </Text>
            {order.dispute_reason && (
              <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                {order.dispute_reason}
              </Text>
            )}
          </View>
        )}
      </View>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // RENDER: BUY STEP INDICATOR
  // ══════════════════════════════════════════════════════════════════════
  const BuyStepIndicator = ({ step }) => {
    const steps = [
      { key: 'form',      label: '1. Details' },
      { key: 'paying',    label: '2. Pay' },
      { key: 'releasing', label: '3. Transfer' },
      { key: 'done',      label: '4. Done' },
    ]
    const idx = steps.findIndex(s => s.key === step)
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
        {steps.map((st, i) => (
          <View key={st.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: i <= idx ? colors.accent : colors.surface2,
              justifyContent: 'center', alignItems: 'center',
            }}>
              <Text style={{ color: i <= idx ? '#fff' : colors.textDim, fontSize: 10, fontWeight: '800' }}>
                {i < idx ? '✓' : i + 1}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={{ width: 20, height: 2, backgroundColor: i < idx ? colors.accent : colors.border, marginHorizontal: 2 }} />
            )}
          </View>
        ))}
      </View>
    )
  }

  // ══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>P2P Market</Text>
          <Text style={{ color: colors.textSub, fontSize: 12 }}>Escrow-secured trading</Text>
        </View>
        <TouchableOpacity
          style={[s.postBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
          onPress={() => { setShowCreate(true); setLType('sell') }}
        >
          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 13 }}>+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface2 }]}>
        {[['buy','🟢 Buy'],['sell','🔴 Sell'],['myorders','📋 Orders']].map(([k, l]) => (
          <TouchableOpacity
            key={k}
            style={[s.tabBtn, tab === k && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
            onPress={() => setTab(k)}
          >
            <Text style={[s.tabLabel, { color: tab === k ? colors.text : colors.textSub }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coin filter */}
      {tab !== 'myorders' && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: 8, paddingBottom: 4 }}
          style={{ flexGrow: 0, marginBottom: 8 }}
        >
          {CRYPTOS.map(c => {
            const col = COIN_COLOR[c] || colors.accent
            const active = filterCoin === c
            return (
              <TouchableOpacity
                key={c}
                style={[s.filterPill, {
                  backgroundColor: active ? `${col}18` : colors.surface2,
                  borderColor:     active ? `${col}60` : colors.border,
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

      {/* Content */}
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
              <Text style={{ color: colors.textSub, textAlign: 'center' }}>Your P2P trades appear here.</Text>
            </View>
          ) : myOrders.map(o => <OrderCard key={o.id} order={o} />)
        ) : listings.length === 0 ? (
          <View style={s.empty}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏪</Text>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No Listings</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center', marginBottom: SPACING.lg }}>
              No active {tab} listings for {filterCoin}.
            </Text>
            <PrimaryButton title="+ Post Listing" onPress={() => setShowCreate(true)} />
          </View>
        ) : (
          listings.map(l => <ListingCard key={l.id} listing={l} />)
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: CREATE LISTING
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: colors.surface }]}>
              <View style={[s.handle, { backgroundColor: colors.border2 }]} />
              <Text style={[s.sheetTitle, { color: colors.text }]}>Post Listing</Text>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Type toggle */}
                <View style={[s.segRow, { backgroundColor: colors.surface2 }]}>
                  {['sell', 'buy'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.segBtn, lType === t && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
                      onPress={() => setLType(t)}
                    >
                      <Text style={{ color: lType === t ? colors.text : colors.textSub, fontWeight: '700', textTransform: 'uppercase' }}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[s.infoBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}30` }]}>
                  <Text style={{ color: colors.textSub, fontSize: 12, lineHeight: 18 }}>
                    {lType === 'sell'
                      ? '🔐 SELL listing: your crypto will be locked in escrow on-chain before the listing goes live. Buyers pay via Razorpay — funds automatically released.'
                      : '📢 BUY listing: post what you want to buy. Sellers can respond. You\'ll pay via Razorpay when a seller accepts.'}
                  </Text>
                </View>

                {/* Cryptocurrency */}
                <Text style={[s.formLabel, { color: colors.textSub }]}>Cryptocurrency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
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

                {/* Network (for sell listings) */}
                {lType === 'sell' && (
                  <>
                    <Text style={[s.formLabel, { color: colors.textSub }]}>Network</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                      {Object.entries(P2P_NETWORKS).map(([netId, net]) => {
                        if (!net.cryptos.includes(lCoin)) return null
                        return (
                          <TouchableOpacity key={netId}
                            style={[s.filterPill, { backgroundColor: lNetwork === netId ? colors.accentDim : colors.surface2, borderColor: lNetwork === netId ? `${colors.accent}60` : colors.border }]}
                            onPress={() => setLNetwork(netId)}
                          >
                            <Text style={{ color: lNetwork === netId ? colors.accent : colors.textSub, fontWeight: lNetwork === netId ? '700' : '500', fontSize: 12 }}>{net.label}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </ScrollView>
                  </>
                )}

                {/* Fiat */}
                <Text style={[s.formLabel, { color: colors.textSub }]}>Fiat Currency</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                  {FIATS.map(f => (
                    <TouchableOpacity key={f}
                      style={[s.filterPill, { backgroundColor: lFiat === f ? colors.accentDim : colors.surface2, borderColor: lFiat === f ? `${colors.accent}60` : colors.border }]}
                      onPress={() => setLFiat(f)}
                    >
                      <Text style={{ color: lFiat === f ? colors.accent : colors.textSub, fontWeight: lFiat === f ? '700' : '500', fontSize: 13 }}>{f}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Input label={`Amount (${lCoin})`}             value={lAmt}   onChangeText={setLAmt}   keyboardType="decimal-pad" placeholder="e.g. 0.5" />
                <Input label={`Your price per ${lCoin} (${lFiat})`} value={lPrice} onChangeText={setLPrice} keyboardType="decimal-pad" placeholder="e.g. 250000" />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input label={`Min order (${lFiat})`} value={lMin} onChangeText={setLMin} keyboardType="decimal-pad" placeholder="e.g. 1000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={`Max order (${lFiat})`}
                      value={lMax}
                      onChangeText={setLMax}
                      keyboardType="decimal-pad"
                      placeholder="Auto-calculated"
                    />
                  </View>
                </View>
                {lAmt && lPrice && (
                  <Text style={{ color: colors.textSub, fontSize: 11, marginTop: -12, marginBottom: 12 }}>
                    Max allowed: {lFiat} {(parseFloat(lAmt || 0) * parseFloat(lPrice || 0)).toFixed(2)}
                  </Text>
                )}

                {/* Country */}
                <Text style={[s.formLabel, { color: colors.textSub }]}>Country</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginBottom: SPACING.md }}>
                  {COUNTRIES.map(c => (
                    <TouchableOpacity key={c}
                      style={[s.filterPill, { backgroundColor: lCountry === c ? colors.accentDim : colors.surface2, borderColor: lCountry === c ? `${colors.accent}60` : colors.border }]}
                      onPress={() => setLCountry(c)}
                    >
                      <Text style={{ color: lCountry === c ? colors.accent : colors.textSub, fontWeight: lCountry === c ? '700' : '500', fontSize: 12 }}>{FLAG[c]} {c}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Payment Methods */}
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
                  <SecondaryButton title="Cancel" onPress={() => { setShowCreate(false); resetCreateForm() }} style={{ flex: 1 }} />
                  <PrimaryButton title={lType === 'sell' ? '🔐 Next: Escrow' : 'Post Listing'} onPress={handleCreatePress} loading={postingListing} style={{ flex: 1 }} />
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: ESCROW CONFIRMATION (sell listings)
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showEscrowConfirm} transparent animationType="slide" onRequestClose={() => {
        if (!postingListing) { setShowEscrowConfirm(false); setPostStep('form') }
      }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: colors.surface }]}>
              <View style={[s.handle, { backgroundColor: colors.border2 }]} />
              <Text style={[s.sheetTitle, { color: colors.text }]}>🔐 Lock Escrow</Text>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {postStep === 'done' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
                    <Text style={{ color: colors.success, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Listing Live!</Text>
                    <Text style={{ color: colors.textSub, textAlign: 'center' }}>
                      {escrowFormData?.amount_crypto} {escrowFormData?.crypto} locked in escrow.
                    </Text>
                    {gasEstimate && (
                      <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 8 }}>Gas paid: {gasEstimate} ETH</Text>
                    )}
                  </View>
                ) : postStep === 'confirming' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 16 }}>
                      Locking {escrowFormData?.amount_crypto} {escrowFormData?.crypto}…
                    </Text>
                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                      Broadcasting transaction. Do not close the app.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Summary */}
                    <View style={[s.infoBox, { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}30` }]}>
                      <InfoRow label="Locking"  value={`${escrowFormData?.amount_crypto} ${escrowFormData?.crypto}`} />
                      <InfoRow label="Network"  value={P2P_NETWORKS[lNetwork]?.label || lNetwork} />
                      <InfoRow label="Price"    value={`${escrowFormData?.fiat_currency} ${escrowFormData?.price_per_unit} / ${escrowFormData?.crypto}`} />
                      <InfoRow label="Max order" value={`${escrowFormData?.fiat_currency} ${escrowFormData?.max_order}`} last />
                    </View>

                    <Alert type="warning" style={{ marginBottom: SPACING.md }}>
                      Your private key is sent encrypted to our server, used once to sign the transaction, then discarded. It is never stored.
                    </Alert>

                    <Input
                      label="Your Wallet Address"
                      value={sellerAddr}
                      onChangeText={setSellerAddr}
                      placeholder="0x..."
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    {/* Secure private key input */}
                    <View style={{ marginBottom: SPACING.md }}>
                      <Text style={[s.formLabel, { color: colors.textSub }]}>Private Key</Text>
                      <View style={[s.pkRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <TextInput
                          style={[s.pkInput, { color: colors.text }]}
                          value={sellerPK}
                          onChangeText={setSellerPK}
                          placeholder="0x..."
                          placeholderTextColor={colors.textDim}
                          secureTextEntry={!showPK}
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="off"
                          textContentType="none"
                        />
                        <TouchableOpacity onPress={() => setShowPK(v => !v)} style={{ padding: 8 }}>
                          <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>
                            {showPK ? 'Hide' : 'Show'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <SecondaryButton
                        title="Back"
                        onPress={() => { setShowEscrowConfirm(false); setPostStep('form') }}
                        style={{ flex: 1 }}
                        disabled={postingListing}
                      />
                      <PrimaryButton
                        title={`Lock ${escrowFormData?.amount_crypto} ${escrowFormData?.crypto}`}
                        onPress={handleConfirmEscrow}
                        loading={postingListing}
                        style={{ flex: 2 }}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
          MODAL: BUY / PAYMENT FLOW
      ══════════════════════════════════════════════════════════════ */}
      <Modal visible={buyModal} transparent animationType="slide" onRequestClose={() => {
        if (buyStep === 'form') { setBuyModal(false) }
      }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={s.overlay}>
            <View style={[s.sheet, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
              <View style={[s.handle, { backgroundColor: colors.border2 }]} />
              <Text style={[s.sheetTitle, { color: colors.text }]}>
                {buyListing?.type === 'buy' ? 'Sell to Buyer' : 'Buy Now'}
              </Text>

              <BuyStepIndicator step={buyStep} />

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {buyStep === 'done' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>🎉</Text>
                    <Text style={{ color: colors.success, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Trade Complete!</Text>
                    <Text style={{ color: colors.textSub, textAlign: 'center' }}>
                      Crypto sent to your wallet. Check your balance.
                    </Text>
                  </View>
                ) : buyStep === 'releasing' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 16 }}>
                      Releasing Crypto…
                    </Text>
                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                      Payment confirmed! Transferring {buyListing?.crypto} to your wallet.
                    </Text>
                    {buyReservedUntil && (
                      <View style={[s.flowBox, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30`, marginTop: 16 }]}>
                        <Text style={{ color: colors.success, textAlign: 'center', fontWeight: '600' }}>
                          💳 Payment received ✓
                        </Text>
                      </View>
                    )}
                  </View>
                ) : buyStep === 'paying' ? (
                  <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 16 }}>
                      Opening Payment…
                    </Text>
                    {buyTimer && buyTimer !== 'Expired' && (
                      <Text style={{ color: colors.warning, fontSize: 12, marginTop: 8 }}>
                        Reserved for: {buyTimer}
                      </Text>
                    )}
                  </View>
                ) : (
                  /* buyStep === 'form' */
                  buyListing && (
                    <>
                      <View style={[s.infoBox, { backgroundColor: colors.surface2, borderColor: colors.border, marginBottom: SPACING.md }]}>
                        <InfoRow label="Price"     value={`${buyListing.fiat_currency} ${parseFloat(buyListing.price_per_unit).toLocaleString()} / ${buyListing.crypto}`} />
                        <InfoRow label="Limits"    value={`${buyListing.fiat_currency} ${buyListing.min_order} – ${buyListing.max_order}`} />
                        <InfoRow label="Available" value={`${parseFloat(buyListing.amount_crypto).toFixed(6)} ${buyListing.crypto}`} />
                        <InfoRow label="Network"   value={NETWORKS[buyListing.network]?.name || buyListing.network || '—'} last />
                      </View>

                      <Input
                        label={`Amount to pay (${buyListing.fiat_currency})`}
                        value={buyAmt}
                        onChangeText={setBuyAmt}
                        keyboardType="decimal-pad"
                        placeholder={`Min: ${buyListing.min_order}`}
                      />
                      {buyAmt && parseFloat(buyAmt) > 0 && (
                        <Text style={{ color: colors.textSub, fontSize: 13, marginTop: -10, marginBottom: 12 }}>
                          ≈ {(parseFloat(buyAmt) / parseFloat(buyListing.price_per_unit)).toFixed(6)} {buyListing.crypto} will be sent to your wallet
                        </Text>
                      )}

                      <Input
                        label="Your wallet address (to receive crypto)"
                        value={buyWallet}
                        onChangeText={setBuyWallet}
                        placeholder="0x..."
                        autoCapitalize="none"
                        autoCorrect={false}
                      />

                      <Alert type="info" style={{ marginBottom: SPACING.md }}>
                        🔐 Seller's crypto is locked in escrow. After you pay, it will be automatically sent to your wallet. No manual steps needed.
                      </Alert>

                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <SecondaryButton title="Cancel" onPress={() => setBuyModal(false)} style={{ flex: 1 }} />
                        <PrimaryButton title={`Pay ${buyListing.fiat_currency} ${buyAmt || '—'}`} onPress={handleInitiatePurchase} style={{ flex: 2 }} />
                      </View>
                    </>
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────
const makeStyles = (C) => StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  postBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1 },
  tabRow:      { flexDirection: 'row', marginHorizontal: SPACING.lg, borderRadius: RADIUS.md, padding: 4, marginBottom: 8 },
  tabBtn:      { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm, alignItems: 'center' },
  tabLabel:    { fontSize: 12, fontWeight: '600' },
  filterPill:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  scroll:      { padding: SPACING.lg, paddingBottom: 100 },
  centered:    { paddingVertical: 60, alignItems: 'center' },
  empty:       { paddingVertical: 60, alignItems: 'center' },
  emptyTitle:  { fontSize: 20, fontWeight: '800', marginBottom: 8 },

  card:         { borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, ...SHADOWS.sm },
  cardHead:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  typePill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  coinPill:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
  escrowBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  flag:         { fontSize: 20 },
  reservedBanner: { borderRadius: RADIUS.sm, padding: 8, borderWidth: 1, marginBottom: 10 },
  priceRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceMain:    { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  tradeBtn:     { paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1 },
  pmChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, marginRight: 6, borderWidth: 1 },
  ownBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  deleteBtnSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1 },
  statusPill:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.full },
  flowBox:      { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginTop: 8 },
  infoBox:      { borderRadius: RADIUS.md, padding: 12, borderWidth: 1, marginBottom: SPACING.md },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: SPACING.lg, maxHeight: '92%' },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 20, fontWeight: '800', marginBottom: SPACING.md },
  segRow:      { flexDirection: 'row', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  segBtn:      { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  formLabel:   { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },

  pkRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12 },
  pkInput:     { flex: 1, paddingVertical: 14, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
})
