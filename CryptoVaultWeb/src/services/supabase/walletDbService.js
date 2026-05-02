// src/services/supabase/walletDbService.js
// All database operations for wallets, transactions, and tokens.
// RLS is enforced at DB level — user_id is set to auth.uid() automatically.

import { supabase } from './client'

// ─── Wallets ───────────────────────────────────────────────────────────────

export const saveWallet = async ({ address, encryptedPrivateKey, network }) => {
  const { data, error } = await supabase
    .from('wallets')
    .insert({
      address,
      encrypted_private_key: encryptedPrivateKey,
      network: network || 'eth_sepolia',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getWallets = async () => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const getWalletByAddress = async (address) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('address', address)
    .single()

  if (error) throw error
  return data
}

export const deleteWallet = async (walletId) => {
  const { error } = await supabase.from('wallets').delete().eq('id', walletId)
  if (error) throw error
}

export const updateWalletNetwork = async (walletId, network) => {
  const { data, error } = await supabase
    .from('wallets')
    .update({ network })
    .eq('id', walletId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Transactions ──────────────────────────────────────────────────────────

export const saveTransaction = async ({ walletAddress, txHash, chain, type, amount, toAddress }) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      wallet_address: walletAddress,
      tx_hash: txHash,
      chain,
      type: type || 'send',
      amount,
      to_address: toAddress,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateTransactionStatus = async (txHash, status) => {
  const { data, error } = await supabase
    .from('transactions')
    .update({ status })
    .eq('tx_hash', txHash)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getTransactions = async (walletAddress) => {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (walletAddress) {
    query = query.eq('wallet_address', walletAddress)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ─── Tokens ────────────────────────────────────────────────────────────────

export const saveToken = async ({ contractAddress, symbol, name, decimals, network, walletAddress }) => {
  const { data, error } = await supabase
    .from('tokens')
    .insert({
      contract_address: contractAddress,
      symbol,
      name,
      decimals: decimals || 18,
      network,
      wallet_address: walletAddress,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const getTokens = async (walletAddress, network) => {
  let query = supabase.from('tokens').select('*')

  if (walletAddress) query = query.eq('wallet_address', walletAddress)
  if (network) query = query.eq('network', network)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const deleteToken = async (tokenId) => {
  const { error } = await supabase.from('tokens').delete().eq('id', tokenId)
  if (error) throw error
}

export const tokenExists = async (contractAddress, walletAddress, network) => {
  const { data } = await supabase
    .from('tokens')
    .select('id')
    .eq('contract_address', contractAddress.toLowerCase())
    .eq('wallet_address', walletAddress)
    .eq('network', network)
    .single()
  return !!data
}
