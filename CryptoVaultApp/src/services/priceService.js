// src/services/priceService.js
import axios from 'axios'

const BASE = 'https://api.coingecko.com/api/v3'
const cache = new Map()
const TTL   = 60_000

async function cgGet(path, params = {}) {
  const key = path + JSON.stringify(params)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.ts < TTL) return hit.data
  try {
    const { data } = await axios.get(`${BASE}${path}`, { params, timeout: 10000 })
    cache.set(key, { data, ts: Date.now() })
    return data
  } catch (err) {
    if (err.response?.status === 429 && hit) return hit.data
    throw err
  }
}

export const POPULAR_COINS = [
  { id: 'bitcoin',       symbol: 'BTC',  name: 'Bitcoin' },
  { id: 'ethereum',      symbol: 'ETH',  name: 'Ethereum' },
  { id: 'binancecoin',   symbol: 'BNB',  name: 'BNB' },
  { id: 'matic-network', symbol: 'MATIC',name: 'Polygon' },
  { id: 'solana',        symbol: 'SOL',  name: 'Solana' },
  { id: 'avalanche-2',   symbol: 'AVAX', name: 'Avalanche' },
  { id: 'chainlink',     symbol: 'LINK', name: 'Chainlink' },
  { id: 'uniswap',       symbol: 'UNI',  name: 'Uniswap' },
  { id: 'aave',          symbol: 'AAVE', name: 'Aave' },
  { id: 'usd-coin',      symbol: 'USDC', name: 'USD Coin' },
  { id: 'tether',        symbol: 'USDT', name: 'Tether' },
  { id: 'dai',           symbol: 'DAI',  name: 'Dai' },
]

export const fetchPrices = async (coinIds) => {
  if (!coinIds?.length) return {}
  try {
    return await cgGet('/simple/price', {
      ids: coinIds.join(','),
      vs_currencies: 'usd',
      include_24hr_change: true,
      include_market_cap: true,
    })
  } catch { return {} }
}

export const fetchCoinMarkets = async (coinIds) => {
  if (!coinIds?.length) return []
  try {
    return await cgGet('/coins/markets', {
      vs_currency: 'usd',
      ids: coinIds.join(','),
      order: 'market_cap_desc',
      per_page: 50,
      sparkline: false,
      price_change_percentage: '24h',
    })
  } catch { return [] }
}

export const searchCoins = async (query) => {
  if (!query?.trim()) return []
  try {
    const data = await cgGet('/search', { query: query.trim() })
    return (data.coins || []).slice(0, 8).map(c => ({
      id: c.id, symbol: c.symbol?.toUpperCase(), name: c.name, thumb: c.thumb,
    }))
  } catch { return [] }
}

export const formatPrice = (p) => {
  if (p == null) return '—'
  if (p < 0.01)   return `$${p.toFixed(6)}`
  if (p < 1)      return `$${p.toFixed(4)}`
  if (p < 1000)   return `$${p.toFixed(2)}`
  return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatMarketCap = (cap) => {
  if (!cap) return '—'
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(2)}B`
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(2)}M`
  return `$${cap.toLocaleString()}`
}
