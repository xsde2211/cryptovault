// src/services/blockchain/swapService.js
// Swap service with two modes:
//   1. EXECUTION mode (mainnets only): 0x Protocol — real on-chain swap with best routing
//   2. PRICE mode (all networks): CoinGecko prices — shows conversion rate / preview for any network

import axios from 'axios'
import { ethers } from 'ethers'
import { getProvider, approveToken, checkAllowance } from './walletService'

const isDev = import.meta.env.DEV

// ── 0x endpoints — MAINNET ONLY ──────────────────────────────────────────────
const ZEROX_BASE = isDev
  ? { eth_mainnet: '/api/0x', polygon_mainnet: '/api/0x-polygon', bsc_mainnet: '/api/0x-bsc' }
  : { eth_mainnet: 'https://api.0x.org', polygon_mainnet: 'https://polygon.api.0x.org', bsc_mainnet: 'https://bsc.api.0x.org' }

const CHAIN_IDS = { eth_mainnet: 1, polygon_mainnet: 137, bsc_mainnet: 56 }

// ── All supported swap tokens per network (including testnets for price preview) ──
export const SWAP_TOKENS = {
  // Mainnets — full on-chain swap via 0x
  eth_mainnet: [
    { symbol: 'ETH',  name: 'Ethereum',    address: 'ETH', decimals: 18, isNative: true,  coingeckoId: 'ethereum' },
    { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  coingeckoId: 'wrapped-bitcoin' },
    { symbol: 'USDC', name: 'USD Coin',    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  coingeckoId: 'usd-coin' },
    { symbol: 'USDT', name: 'Tether',      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  coingeckoId: 'tether' },
    { symbol: 'DAI',  name: 'Dai',         address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
    { symbol: 'LINK', name: 'Chainlink',   address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, coingeckoId: 'chainlink' },
    { symbol: 'UNI',  name: 'Uniswap',     address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, coingeckoId: 'uniswap' },
    { symbol: 'AAVE', name: 'Aave',        address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, coingeckoId: 'aave' },
    { symbol: 'MATIC',name: 'Polygon',     address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', decimals: 18, coingeckoId: 'matic-network' },
    { symbol: 'BNB',  name: 'BNB',         address: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', decimals: 18, coingeckoId: 'binancecoin' },
  ],
  polygon_mainnet: [
    { symbol: 'MATIC', name: 'Polygon',     address: 'ETH', decimals: 18, isNative: true,  coingeckoId: 'matic-network' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, coingeckoId: 'ethereum' },
    { symbol: 'WBTC',  name: 'Wrapped BTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8,  coingeckoId: 'wrapped-bitcoin' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6,  coingeckoId: 'usd-coin' },
    { symbol: 'USDT',  name: 'Tether',      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  coingeckoId: 'tether' },
    { symbol: 'DAI',   name: 'Dai',         address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, coingeckoId: 'dai' },
    { symbol: 'LINK',  name: 'Chainlink',   address: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', decimals: 18, coingeckoId: 'chainlink' },
    { symbol: 'AAVE',  name: 'Aave',        address: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', decimals: 18, coingeckoId: 'aave' },
  ],
  bsc_mainnet: [
    { symbol: 'BNB',   name: 'BNB',         address: 'ETH', decimals: 18, isNative: true,  coingeckoId: 'binancecoin' },
    { symbol: 'ETH',   name: 'Ethereum',    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18, coingeckoId: 'ethereum' },
    { symbol: 'BTCB',  name: 'Bitcoin BEP2',address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals: 18, coingeckoId: 'wrapped-bitcoin' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, coingeckoId: 'usd-coin' },
    { symbol: 'USDT',  name: 'Tether',      address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, coingeckoId: 'tether' },
    { symbol: 'BUSD',  name: 'BUSD',        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, coingeckoId: 'binance-usd' },
    { symbol: 'CAKE',  name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, coingeckoId: 'pancakeswap-token' },
    { symbol: 'MATIC', name: 'Polygon',     address: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', decimals: 18, coingeckoId: 'matic-network' },
  ],
  // Testnets — price preview only (no on-chain swap), same tokens as mainnet counterpart
  eth_sepolia: [
    { symbol: 'ETH',  name: 'Sepolia ETH',  address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'ethereum' },
    { symbol: 'USDC', name: 'USD Coin',     address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6, coingeckoId: 'usd-coin' },
    { symbol: 'WBTC', name: 'Wrapped BTC',  address: 'ETH', decimals: 8,  coingeckoId: 'wrapped-bitcoin', priceOnly: true },
    { symbol: 'LINK', name: 'Chainlink',    address: 'ETH', decimals: 18, coingeckoId: 'chainlink',      priceOnly: true },
    { symbol: 'MATIC',name: 'Polygon',      address: 'ETH', decimals: 18, coingeckoId: 'matic-network',  priceOnly: true },
    { symbol: 'BNB',  name: 'BNB',          address: 'ETH', decimals: 18, coingeckoId: 'binancecoin',    priceOnly: true },
  ],
  bsc_testnet: [
    { symbol: 'tBNB', name: 'Test BNB',     address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'binancecoin' },
    { symbol: 'ETH',  name: 'Ethereum',     address: 'ETH', decimals: 18, coingeckoId: 'ethereum',       priceOnly: true },
    { symbol: 'BTC',  name: 'Bitcoin',      address: 'ETH', decimals: 18, coingeckoId: 'bitcoin',        priceOnly: true },
    { symbol: 'USDT', name: 'Tether',       address: 'ETH', decimals: 6,  coingeckoId: 'tether',         priceOnly: true },
  ],
  polygon_amoy: [
    { symbol: 'MATIC', name: 'Test MATIC',  address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'matic-network' },
    { symbol: 'ETH',   name: 'Ethereum',    address: 'ETH', decimals: 18, coingeckoId: 'ethereum',       priceOnly: true },
    { symbol: 'BTC',   name: 'Bitcoin',     address: 'ETH', decimals: 18, coingeckoId: 'bitcoin',        priceOnly: true },
    { symbol: 'USDC',  name: 'USD Coin',    address: 'ETH', decimals: 6,  coingeckoId: 'usd-coin',       priceOnly: true },
    { symbol: 'BNB',   name: 'BNB',         address: 'ETH', decimals: 18, coingeckoId: 'binancecoin',    priceOnly: true },
  ],
}

// Native token address used by 0x API
const NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const toAddr  = (t) => (t.isNative || t.address === 'ETH') ? NATIVE : t.address

const apiHeaders = () => {
  const k = import.meta.env.VITE_ZEROX_API_KEY
  const h = { '0x-version': 'v2' }
  if (k) h['0x-api-key'] = k
  return h
}

const parseErr = (err) => {
  const d = err.response?.data
  if (!d) return err.message
  if (d.code && d.message) return `${d.message} (code: ${d.code})`
  if (Array.isArray(d.validationErrors) && d.validationErrors.length)
    return d.validationErrors[0].description || d.validationErrors[0].reason || err.message
  if (d.reason) return d.reason
  return d.message || (typeof d === 'string' ? d : err.message)
}

// ── CoinGecko price fetch (for preview on any network) ───────────────────────
const priceCache = new Map()
export const getCGPrices = async (coinIds) => {
  const ids = [...new Set(coinIds)].filter(Boolean)
  if (!ids.length) return {}
  const key = ids.sort().join(',')
  const hit = priceCache.get(key)
  if (hit && Date.now() - hit.ts < 60_000) return hit.data
  try {
    const base = isDev ? '/api/coingecko' : 'https://api.coingecko.com/api/v3'
    const { data } = await axios.get(`${base}/simple/price`, {
      params: { ids: ids.join(','), vs_currencies: 'usd' },
      timeout: 8000,
    })
    priceCache.set(key, { data, ts: Date.now() })
    return data
  } catch { return {} }
}

/**
 * Get a price-only swap preview using CoinGecko.
 * Works on ALL networks including testnets.
 * Returns { price, buyAmount, sources: ['CoinGecko'] }
 */
export const getSwapPriceFromCG = async ({ sellToken, buyToken, sellAmount }) => {
  const ids = [sellToken.coingeckoId, buyToken.coingeckoId].filter(Boolean)
  const prices = await getCGPrices(ids)
  const sellUsd = prices[sellToken.coingeckoId]?.usd
  const buyUsd  = prices[buyToken.coingeckoId]?.usd
  if (!sellUsd || !buyUsd) throw new Error('Price data not available for this pair')
  const rate      = sellUsd / buyUsd
  const buyAmount = (parseFloat(sellAmount) * rate).toFixed(8)
  return { price: rate.toString(), buyAmount, estimatedGas: null, sources: ['CoinGecko'] }
}

/**
 * Get swap price — tries 0x on mainnets, falls back to CoinGecko everywhere.
 */
export const getSwapPrice = async ({ sellToken, buyToken, sellAmount, networkId }) => {
  const base    = ZEROX_BASE[networkId]
  const chainId = CHAIN_IDS[networkId]

  // Non-mainnet or priceOnly tokens → CoinGecko preview
  if (!base || !chainId || sellToken.priceOnly || buyToken.priceOnly) {
    return getSwapPriceFromCG({ sellToken, buyToken, sellAmount })
  }

  const sellWei = ethers.parseUnits(String(sellAmount), sellToken.decimals).toString()
  try {
    const { data } = await axios.get(`${base}/swap/permit2/price`, {
      params: { chainId, sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei },
      headers: apiHeaders(), timeout: 12000,
    })
    return {
      price: data.price,
      buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals),
      estimatedGas: data.gas || data.estimatedGas,
      sources: (data.route?.fills || []).map(f => f.source).filter(Boolean),
    }
  } catch (err) {
    if (err.response?.status >= 400 && err.response?.status < 500) throw new Error(parseErr(err))
    // Network error → fallback to v1
    try {
      const { data } = await axios.get(`${base}/swap/v1/price`, {
        params: { sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei },
        headers: apiHeaders(), timeout: 12000,
      })
      return { price: data.price, buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals), estimatedGas: data.estimatedGas, sources: (data.sources || []).filter(s => parseFloat(s.proportion) > 0).map(s => s.name) }
    } catch (fb) {
      // Final fallback — CoinGecko
      return getSwapPriceFromCG({ sellToken, buyToken, sellAmount })
    }
  }
}

/**
 * Get a full quote with calldata — mainnets only.
 */
export const getSwapQuote = async ({ sellToken, buyToken, sellAmount, takerAddress, networkId, slippageBps = 100 }) => {
  const base    = ZEROX_BASE[networkId]
  const chainId = CHAIN_IDS[networkId]
  if (!base || !chainId) throw new Error('On-chain swap only available on Ethereum, Polygon, and BSC mainnet.')

  const sellWei = ethers.parseUnits(String(sellAmount), sellToken.decimals).toString()
  try {
    const { data } = await axios.get(`${base}/swap/permit2/quote`, {
      params: { chainId, sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei, taker: takerAddress, slippageBps },
      headers: apiHeaders(), timeout: 15000,
    })
    return {
      sellToken, buyToken, sellAmount,
      buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals),
      price: data.price, to: data.transaction?.to, data: data.transaction?.data,
      value: data.transaction?.value || '0', gas: data.transaction?.gas,
      allowanceTarget: data.issues?.allowance?.spender,
      sources: (data.route?.fills || []).map(f => f.source).filter(Boolean),
      priceImpact: data.estimatedPriceImpact,
    }
  } catch (err) {
    if (err.response?.status >= 400 && err.response?.status < 500) throw new Error(parseErr(err))
    try {
      const { data } = await axios.get(`${base}/swap/v1/quote`, {
        params: { sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei, takerAddress, slippagePercentage: (slippageBps / 10000).toString() },
        headers: apiHeaders(), timeout: 15000,
      })
      return {
        sellToken, buyToken, sellAmount,
        buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals),
        price: data.price, to: data.to, data: data.data, value: data.value || '0', gas: data.gas,
        allowanceTarget: data.allowanceTarget,
        sources: (data.sources || []).filter(s => parseFloat(s.proportion) > 0).map(s => s.name),
        priceImpact: data.estimatedPriceImpact,
      }
    } catch (fb) { throw new Error(parseErr(fb)) }
  }
}

export const executeSwap = async ({ quote, privateKey, networkId }) => {
  const provider = await getProvider(networkId)
  const wallet   = new ethers.Wallet(privateKey, provider)
  if (!quote.sellToken.isNative && quote.allowanceTarget) {
    const needed  = ethers.parseUnits(String(quote.sellAmount), quote.sellToken.decimals)
    const current = await checkAllowance(quote.sellToken.address, wallet.address, quote.allowanceTarget, networkId)
    if (BigInt(current) < BigInt(needed)) {
      const tx = await approveToken(privateKey, quote.sellToken.address, quote.allowanceTarget, quote.sellAmount, quote.sellToken.decimals, networkId)
      await tx.wait()
    }
  }
  const tx = await wallet.sendTransaction({
    to: quote.to, data: quote.data, value: BigInt(quote.value || '0'),
    ...(quote.gas ? { gasLimit: BigInt(quote.gas) } : {}),
  })
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const getSwapTokensForNetwork = (networkId) =>
  SWAP_TOKENS[networkId] || SWAP_TOKENS.eth_mainnet

// true = real on-chain swap available; false = price preview only
export const isExecutionSupported = (networkId) => !!ZEROX_BASE[networkId]
// keep old export name for compat
export const isSwapSupported = isExecutionSupported