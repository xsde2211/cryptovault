// src/services/priceService.js
// CoinGecko API — free public tier (30 req/min) with aggressive caching.
// In dev: requests go through Vite proxy at /api/coingecko (no CORS, shared rate limit).
// In prod: direct to api.coingecko.com (or pro endpoint if key is set).

import axios from 'axios'

const isDev = import.meta.env.DEV

// Use Vite proxy in development to avoid CORS and share rate limits server-side.
// In production, use the direct CoinGecko URL.
const BASE = isDev
  ? '/api/coingecko'
  : (import.meta.env.VITE_COINGECKO_API_KEY
      ? 'https://pro-api.coingecko.com/api/v3'
      : 'https://api.coingecko.com/api/v3')

// In-memory cache
const cache   = new Map()
const TTL     = 3 * 60_000   // 3 minutes fresh
const STALE   = 10 * 60_000  // serve stale for up to 10 min on rate-limit

// Dedup in-flight identical requests
const pending = new Map()

async function cgGet(path, params = {}) {
  const key = path + JSON.stringify(params)
  const now = Date.now()
  const hit = cache.get(key)

  if (hit && now - hit.ts < TTL) return hit.data
  if (pending.has(key)) return pending.get(key)

  const headers = {
    Accept: 'application/json',
    ...(import.meta.env.VITE_COINGECKO_API_KEY
      ? { 'x-cg-pro-api-key': import.meta.env.VITE_COINGECKO_API_KEY }
      : {}),
  }

  const promise = axios
    .get(`${BASE}${path}`, { params, timeout: 12000, headers })
    .then(({ data }) => {
      cache.set(key, { data, ts: Date.now() })
      return data
    })
    .catch((err) => {
      // On rate-limit (429) or server error, return stale data if within tolerance
      if (hit && now - hit.ts < STALE &&
          (err.response?.status === 429 || (err.response?.status ?? 0) >= 500)) {
        return hit.data
      }
      throw err
    })
    .finally(() => pending.delete(key))

  pending.set(key, promise)
  return promise
}

// ── Popular coins for Watchlist explore tab ──────────────────────────────
export const POPULAR_COINS = [
  { id: 'bitcoin',       symbol: 'BTC',  name: 'Bitcoin',       category: 'Layer 1'    },
  { id: 'ethereum',      symbol: 'ETH',  name: 'Ethereum',      category: 'Layer 1'    },
  { id: 'binancecoin',   symbol: 'BNB',  name: 'BNB',           category: 'Layer 1'    },
  { id: 'matic-network', symbol: 'MATIC',name: 'Polygon',       category: 'Layer 2'    },
  { id: 'solana',        symbol: 'SOL',  name: 'Solana',        category: 'Layer 1'    },
  { id: 'avalanche-2',   symbol: 'AVAX', name: 'Avalanche',     category: 'Layer 1'    },
  { id: 'chainlink',     symbol: 'LINK', name: 'Chainlink',     category: 'Oracle'     },
  { id: 'uniswap',       symbol: 'UNI',  name: 'Uniswap',       category: 'DeFi'       },
  { id: 'aave',          symbol: 'AAVE', name: 'Aave',          category: 'DeFi'       },
  { id: 'usd-coin',      symbol: 'USDC', name: 'USD Coin',      category: 'Stablecoin' },
  { id: 'tether',        symbol: 'USDT', name: 'Tether',        category: 'Stablecoin' },
  { id: 'dai',           symbol: 'DAI',  name: 'Dai',           category: 'Stablecoin' },
  { id: 'render-token',  symbol: 'RNDR', name: 'Render',        category: 'AI/DePIN'   },
  { id: 'the-sandbox',   symbol: 'SAND', name: 'The Sandbox',   category: 'Metaverse'  },
  { id: 'decentraland',  symbol: 'MANA', name: 'Decentraland',  category: 'Metaverse'  },
  { id: 'axie-infinity', symbol: 'AXS',  name: 'Axie Infinity', category: 'Gaming'     },
]

/**
 * Fetch current prices + 24h change for a list of CoinGecko coin IDs.
 * Returns: { [coinId]: { usd, usd_24h_change, usd_market_cap } }
 */
export const fetchPrices = async (coinIds, currency = 'usd') => {
  if (!coinIds?.length) return {}
  try {
    return await cgGet('/simple/price', {
      ids:                 coinIds.join(','),
      vs_currencies:       currency,
      include_24hr_change: true,
      include_market_cap:  true,
      include_24hr_vol:    true,
    })
  } catch (err) {
    console.warn('CoinGecko price fetch failed:', err.message)
    return {}
  }
}

/**
 * Fetch full market data for the watchlist explore tab.
 * Uses single price_change_percentage value — multi-value ('24h,7d') causes 400 on free tier.
 * Falls back to /simple/price data if markets endpoint fails.
 */
export const fetchCoinMarkets = async (coinIds, currency = 'usd') => {
  if (!coinIds?.length) return []
  try {
    return await cgGet('/coins/markets', {
      vs_currency:             currency,
      ids:                     coinIds.join(','),
      order:                   'market_cap_desc',
      per_page:                50,
      page:                    1,
      sparkline:               false,
      price_change_percentage: '24h',  // single value only — avoids 400 on free tier
    })
  } catch (err) {
    console.warn('CoinGecko markets fetch failed:', err.message)
    // Graceful fallback using /simple/price
    try {
      const priceData = await fetchPrices(coinIds, currency)
      return coinIds.map((id) => {
        const p    = priceData[id]
        const meta = POPULAR_COINS.find(c => c.id === id) || { symbol: id.toUpperCase(), name: id }
        return {
          id,
          symbol:                      meta.symbol?.toLowerCase(),
          name:                        meta.name,
          current_price:               p?.[currency] ?? null,
          price_change_percentage_24h: p?.[`${currency}_24h_change`] ?? null,
          market_cap:                  p?.[`${currency}_market_cap`] ?? null,
          total_volume:                null,
          image:                       null,
        }
      })
    } catch {
      return []
    }
  }
}

/**
 * Search CoinGecko for a coin by name or symbol.
 */
export const searchCoins = async (query) => {
  if (!query?.trim()) return []
  try {
    const data = await cgGet('/search', { query: query.trim() })
    return (data.coins || []).slice(0, 8).map(c => ({
      id:     c.id,
      symbol: c.symbol?.toUpperCase(),
      name:   c.name,
      thumb:  c.thumb,
    }))
  } catch {
    return []
  }
}

// ── Formatters ────────────────────────────────────────────────────────────

export const formatPrice = (price) => {
  if (price == null) return '—'
  if (price < 0.0001) return `$${price.toFixed(8)}`
  if (price < 0.01)   return `$${price.toFixed(6)}`
  if (price < 1)      return `$${price.toFixed(4)}`
  if (price < 1000)   return `$${price.toFixed(2)}`
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatChange = (pct) => {
  if (pct == null) return '—'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
}

export const formatMarketCap = (cap) => {
  if (!cap) return '—'
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(2)}B`
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(2)}M`
  return `$${cap.toLocaleString()}`
}