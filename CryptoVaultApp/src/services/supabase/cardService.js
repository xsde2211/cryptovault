// src/services/supabase/cardService.js
// FIXES: user_id now injected server-side via auth.uid() in RLS,
// but we also pass it explicitly so inserts don't fail.

import { supabase } from './client'

// ── Helpers ───────────────────────────────────────────────────
const genCardNumber = () => {
  const base = '4' + Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')
  let sum = 0
  for (let i = 0; i < 15; i++) {
    let d = parseInt(base[i])
    if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9 }
    sum += d
  }
  return base + ((10 - (sum % 10)) % 10)
}

const genExpiry = () => {
  const d = new Date(); d.setFullYear(d.getFullYear() + 4)
  return { month: String(d.getMonth() + 1).padStart(2, '0'), year: String(d.getFullYear()).slice(-2) }
}

const genCVV = () => String(Math.floor(100 + Math.random() * 900))

const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── Virtual Cards ─────────────────────────────────────────────

export const applyVirtualCard = async ({ walletId, cardholderName, variantName, networkType = 'VISA' }) => {
  const userId = await getCurrentUserId()
  const { data: variant } = await supabase.from('card_variants').select('*').eq('name', variantName).single()
  const expiry = genExpiry()
  const { data, error } = await supabase.from('virtual_cards').insert({
    user_id:         userId,          // ← explicit user_id for RLS
    wallet_id:       walletId,
    card_number:     genCardNumber(),
    cardholder_name: cardholderName.toUpperCase(),
    expiry_month:    expiry.month,
    expiry_year:     expiry.year,
    cvv:             genCVV(),
    variant:         variantName,
    network_type:    networkType,
    status:          'active',
    balance_usdt:    0,
    color_from:      variant?.color_from || '#7c6ff7',
    color_to:        variant?.color_to   || '#4facfe',
    features:        variant?.features   || [],
  }).select().single()
  if (error) throw error
  return data
}

export const getUserCards = async () => {
  const { data, error } = await supabase.from('virtual_cards').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const getCardVariants = async () => {
  const { data, error } = await supabase.from('card_variants').select('*').eq('active', true).order('sort_order')
  if (error) throw error
  return data || []
}

export const topUpCard = async (cardId, amountUsdt, fromAddr) => {
  const userId = await getCurrentUserId()
  const { data: card } = await supabase.from('virtual_cards').select('balance_usdt').eq('id', cardId).single()
  const newBal = (parseFloat(card.balance_usdt) + parseFloat(amountUsdt)).toFixed(6)
  await supabase.from('virtual_cards').update({ balance_usdt: newBal }).eq('id', cardId)
  await supabase.from('card_transactions').insert({
    user_id: userId, card_id: cardId, type: 'top_up',
    amount_usdt: amountUsdt, from_addr: fromAddr, status: 'completed', note: 'Wallet to Card',
  })
  return newBal
}

export const spendFromCard = async (cardId, amountUsdt, note = 'Spend') => {
  const userId = await getCurrentUserId()
  const { data: card } = await supabase.from('virtual_cards').select('balance_usdt').eq('id', cardId).single()
  if (parseFloat(card.balance_usdt) < parseFloat(amountUsdt)) throw new Error('Insufficient card balance')
  const newBal = (parseFloat(card.balance_usdt) - parseFloat(amountUsdt)).toFixed(6)
  await supabase.from('virtual_cards').update({ balance_usdt: newBal }).eq('id', cardId)
  await supabase.from('card_transactions').insert({
    user_id: userId, card_id: cardId, type: 'spend',
    amount_usdt: amountUsdt, status: 'completed', note,
  })
  return newBal
}

export const getCardTransactions = async (cardId) => {
  const { data, error } = await supabase.from('card_transactions').select('*')
    .eq('card_id', cardId).order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── KYC ──────────────────────────────────────────────────────
// FIX: user_id was missing — caused RLS violation

export const submitKYC = async (payload) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase.from('kyc_applications')
    .insert({ ...payload, user_id: userId })   // ← inject user_id
    .select().single()
  if (error) throw error
  return data
}

export const getMyKYC = async () => {
  const { data } = await supabase.from('kyc_applications').select('*')
    .order('created_at', { ascending: false }).limit(1).single()
  return data
}

export const generateUniqueCode = () => {
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-')
}

// ── Storage upload (KYC docs) ─────────────────────────────────
// FIX: use ArrayBuffer instead of Blob — Blob often fails in RN

export const uploadKYCFile = async (uri, folder) => {
  const userId  = await getCurrentUserId()
  const ext     = (uri.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
  const mime    = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`
  const fileName = `${folder}/${userId}_${Date.now()}.${ext}`

  // Fetch as ArrayBuffer — works reliably in React Native
  const response = await fetch(uri)
  const buffer   = await response.arrayBuffer()

  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(fileName, buffer, { contentType: mime, upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(fileName)
  return urlData.publicUrl
}

// ── Physical Card ─────────────────────────────────────────────

export const requestPhysicalCard = async (payload) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase.from('physical_card_requests')
    .insert({ ...payload, user_id: userId })
    .select().single()
  if (error) throw error
  return data
}

export const getShippingFees = async () => {
  const { data, error } = await supabase.from('shipping_fees').select('*').order('country')
  if (error) throw error
  return data || []
}

// ── P2P ──────────────────────────────────────────────────────
// FIX: user_id was missing — caused RLS violation

export const createListing = async (payload) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase.from('p2p_listings')
    .insert({ ...payload, user_id: userId })   // ← inject user_id
    .select().single()
  if (error) throw error
  return data
}

export const getListings = async (filters = {}) => {
  let q = supabase.from('p2p_listings').select('*').eq('status', 'active')
  if (filters.type)    q = q.eq('type', filters.type)
  if (filters.crypto)  q = q.eq('crypto', filters.crypto)
  if (filters.country) q = q.eq('country', filters.country)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const createOrder = async (payload) => {
  const { data, error } = await supabase.from('p2p_orders').insert(payload).select().single()
  if (error) throw error
  return data
}

export const getMyOrders = async (userId) => {
  const { data, error } = await supabase.from('p2p_orders')
    .select('*, listing:listing_id(*)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export const updateOrderStatus = async (orderId, status, extra = {}) => {
  const { data, error } = await supabase.from('p2p_orders')
    .update({ status, ...extra }).eq('id', orderId).select().single()
  if (error) throw error
  return data
}

// ── Merchant ─────────────────────────────────────────────────

export const saveMerchantProfile = async (payload) => {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase.from('merchant_profiles')
    .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id' })
    .select().single()
  if (error) throw error
  return data
}

export const getMyMerchantProfile = async () => {
  const { data } = await supabase.from('merchant_profiles').select('*').single()
  return data
}
