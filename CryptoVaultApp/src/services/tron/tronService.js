// src/services/tron/tronService.js
// TRON blockchain service using TronWeb
// Supports mainnet (TronGrid) and Nile testnet

import { encryptPrivateKey, decryptPrivateKey } from '../../utils/encryption'

// TronWeb loaded lazily to avoid Hermes issues
let _TronWeb = null
const getTronWeb = async (networkId = 'tron_mainnet') => {
  if (!_TronWeb) {
    const mod = await import('tronweb')
    _TronWeb = mod.default || mod
  }
  const fullNode = networkId === 'tron_nile'
    ? 'https://nile.trongrid.io'
    : 'https://api.trongrid.io'
  return new _TronWeb({
    fullHost: fullNode,
    headers: { 'TRON-PRO-API-KEY': process.env.EXPO_PUBLIC_TRONGRID_KEY || '' },
  })
}

// ── Key Generation ────────────────────────────────────────────
export const generateTronWallet = async () => {
  const tw = await getTronWeb()
  const account = await tw.createAccount()
  return {
    address:    account.address.base58,
    privateKey: account.privateKey,
    publicKey:  account.publicKey,
  }
}

export const tronWalletFromPrivateKey = async (privateKey) => {
  try {
    const tw  = await getTronWeb()
    const pk  = privateKey.trim().replace(/^0x/, '')
    tw.setPrivateKey(pk)
    const address = tw.address.fromPrivateKey(pk)
    return { address, privateKey: pk }
  } catch { throw new Error('Invalid TRON private key') }
}

// ── Balance ───────────────────────────────────────────────────
export const getTronBalance = async (address, networkId = 'tron_mainnet') => {
  try {
    const tw = await getTronWeb(networkId)
    const sun = await tw.trx.getBalance(address)
    return (sun / 1_000_000).toFixed(6)   // sun → TRX (6 decimals)
  } catch { return '0.000000' }
}

// TRC-20 token balance
export const getTRC20Balance = async (contractAddress, walletAddress, networkId = 'tron_mainnet') => {
  try {
    const tw       = await getTronWeb(networkId)
    const contract = await tw.contract().at(contractAddress)
    const raw      = await contract.balanceOf(walletAddress).call()
    const decimals = await contract.decimals().call()
    const bal      = Number(raw) / Math.pow(10, Number(decimals))
    return bal.toFixed(6)
  } catch { return '0.000000' }
}

// ── Send TRX ──────────────────────────────────────────────────
export const sendTRX = async (privateKey, toAddress, amount, networkId = 'tron_mainnet') => {
  const tw = await getTronWeb(networkId)
  tw.setPrivateKey(privateKey.replace(/^0x/, ''))
  const sunAmount = Math.floor(parseFloat(amount) * 1_000_000)
  const tx = await tw.trx.sendTransaction(toAddress, sunAmount)
  if (!tx.result) throw new Error('Transaction failed: ' + (tx.code || 'unknown error'))
  return { txHash: tx.txid, wait: async () => tx }
}

// ── Send TRC-20 ───────────────────────────────────────────────
export const sendTRC20 = async (privateKey, contractAddress, toAddress, amount, decimals = 6, networkId = 'tron_mainnet') => {
  const tw = await getTronWeb(networkId)
  tw.setPrivateKey(privateKey.replace(/^0x/, ''))
  const contract = await tw.contract().at(contractAddress)
  const rawAmt   = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)))
  const tx = await contract.transfer(toAddress, rawAmt).send()
  if (!tx) throw new Error('TRC-20 transfer failed')
  return { txHash: tx, wait: async () => tx }
}

// ── Validate address ──────────────────────────────────────────
export const isValidTronAddress = (address) => {
  return typeof address === 'string' && address.startsWith('T') && address.length === 34
}

// ── Known TRC-20 tokens ───────────────────────────────────────
export const TRC20_TOKENS = {
  tron_mainnet: [
    { symbol: 'USDT', name: 'Tether USD (TRC-20)', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6, coingeckoId: 'tether' },
    { symbol: 'USDC', name: 'USD Coin (TRC-20)',    address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', decimals: 6, coingeckoId: 'usd-coin' },
    { symbol: 'BTT',  name: 'BitTorrent',           address: 'TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4', decimals: 18, coingeckoId: 'bittorrent' },
  ],
  tron_nile: [
    { symbol: 'USDT', name: 'Test USDT (TRC-20)', address: 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj', decimals: 6, coingeckoId: 'tether' },
  ],
}
