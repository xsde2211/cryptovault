// src/services/supabase/p2pService.js
// Client-side P2P service — calls Edge Functions for sensitive ops,
// Supabase directly for reads and realtime.

import { supabase } from './client'

const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session
}

// ── Edge Function caller ────────────────────────────────────────────────
const callEdgeFunction = async (fnName, body) => {
  const session = await getSession()
  const { data, error } = await supabase.functions.invoke(fnName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  })
  if (error) throw new Error(error.message || 'Edge function error')
  if (data?.error) throw new Error(data.error)
  return data
}

// ══════════════════════════════════════════════════════════════════════════
// LISTINGS
// ══════════════════════════════════════════════════════════════════════════

/**
 * Post a SELL listing — transfers crypto to escrow first, then creates listing.
 * All blockchain signing happens in the Edge Function (never on client).
 */
export const postSellListing = async ({
  crypto, fiat_currency, amount_crypto, price_per_unit,
  min_order, max_order, payment_methods, country,
  network, seller_address, private_key,
}) => {
  return callEdgeFunction('p2p-escrow-lock', {
    listing_payload: {
      type: 'sell', crypto, fiat_currency,
      amount_crypto: parseFloat(amount_crypto),
      price_per_unit: parseFloat(price_per_unit),
      min_order: parseFloat(min_order),
      max_order: parseFloat(max_order),
      payment_methods,
      country,
    },
    network,
    seller_address,
    private_key,
  })
}

/**
 * Post a BUY listing — standard DB insert (no escrow lock needed for buyer).
 * Buyer's fiat gets locked when seller accepts and buyer pays.
 */
export const postBuyListing = async ({
  crypto, fiat_currency, amount_crypto, price_per_unit,
  min_order, max_order, payment_methods, country, network,
}) => {
  const user = await getCurrentUser()
  const { data, error } = await supabase.from('p2p_listings').insert({
    user_id: user.id, type: 'buy', crypto, fiat_currency,
    amount_crypto: parseFloat(amount_crypto),
    price_per_unit: parseFloat(price_per_unit),
    min_order: parseFloat(min_order),
    max_order: parseFloat(max_order),
    payment_methods, country, network: network || 'eth_sepolia',
    escrow_status: 'none', status: 'active',
  }).select().single()
  if (error) throw error
  return data
}

export const getListings = async ({ type, crypto, country } = {}) => {
  // First expire stale reservations
  await supabase.rpc('expire_listing_reservations')

  let q = supabase
    .from('p2p_listings')
    .select('*')
    .in('status', ['active', 'reserved'])
    .order('created_at', { ascending: false })

  if (type)    q = q.eq('type', type)
  if (crypto)  q = q.eq('crypto', crypto)
  if (country) q = q.eq('country', country)

  const { data, error } = await q
  if (error) throw error
  return data || []
}

export const getMyListings = async () => {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('p2p_listings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const cancelListing = async (listing_id) => {
  return callEdgeFunction('p2p-payment', { action: 'cancel_listing', listing_id })
}

// ══════════════════════════════════════════════════════════════════════════
// ORDERS / PAYMENT
// ══════════════════════════════════════════════════════════════════════════

/**
 * Step 1: Creates Razorpay order + reserves listing.
 * Returns Razorpay credentials needed to open payment sheet.
 */
export const initiatePurchase = async ({ listing_id, amount_fiat, buyer_wallet_addr }) => {
  return callEdgeFunction('p2p-payment', {
    action: 'create_order',
    listing_id,
    amount_fiat: String(amount_fiat),
    buyer_wallet_addr,
  })
}

/**
 * Step 2: After Razorpay payment success, verify + trigger crypto release.
 */
export const completePurchase = async ({
  order_id, razorpay_payment_id, razorpay_order_id, razorpay_signature,
}) => {
  return callEdgeFunction('p2p-payment', {
    action: 'verify_payment',
    order_id,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
  })
}

export const getMyOrders = async () => {
  const user = await getCurrentUser()
  const { data, error } = await supabase
    .from('p2p_orders')
    .select(`
      *,
      listing:listing_id (
        crypto, fiat_currency, price_per_unit, network,
        payment_methods, escrow_wallet_addr
      )
    `)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(o => ({ ...o, _userId: user.id }))
}

export const getOrderEscrowTxns = async (order_id) => {
  const { data, error } = await supabase
    .from('escrow_transactions')
    .select('*')
    .eq('order_id', order_id)
    .order('created_at')
  if (error) throw error
  return data || []
}

// ══════════════════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════

export const subscribeToListing = (listingId, callback) => {
  return supabase
    .channel(`listing:${listingId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'p2p_listings',
      filter: `id=eq.${listingId}`,
    }, callback)
    .subscribe()
}

export const subscribeToOrder = (orderId, callback) => {
  return supabase
    .channel(`order:${orderId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'p2p_orders',
      filter: `id=eq.${orderId}`,
    }, callback)
    .subscribe()
}

export const subscribeToMyOrders = (userId, callback) => {
  return supabase
    .channel(`my_orders:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'p2p_orders',
      filter: `buyer_id=eq.${userId}`,
    }, callback)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'p2p_orders',
      filter: `seller_id=eq.${userId}`,
    }, callback)
    .subscribe()
}

export const subscribeToListings = (callback) => {
  return supabase
    .channel('p2p_listings_feed')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'p2p_listings',
    }, callback)
    .subscribe()
}
