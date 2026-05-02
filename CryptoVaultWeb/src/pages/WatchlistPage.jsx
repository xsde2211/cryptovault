// src/pages/WatchlistPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../context/ToastContext'
import {
  getWatchlist, addToWatchlist, removeFromWatchlist,
} from '../services/supabase/watchlistService'
import {
  fetchCoinMarkets, searchCoins, POPULAR_COINS,
  formatPrice, formatChange, formatMarketCap,
} from '../services/priceService'

export default function WatchlistPage() {
  const toast = useToast()
  const [watchlist,   setWatchlist]   = useState([])
  const [markets,     setMarkets]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [refreshing,  setRefreshing]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching,   setSearching]   = useState(false)
  const [activeTab,   setActiveTab]   = useState('watchlist') // 'watchlist' | 'explore'
  const [exploreMarkets, setExploreMarkets] = useState([])
  const [exploreLoading, setExploreLoading] = useState(false)

  // ── Load watchlist ────────────────────────────────────────────────────
  const loadWatchlist = useCallback(async () => {
    try {
      const list = await getWatchlist()
      setWatchlist(list)
      if (list.length > 0) {
        const data = await fetchCoinMarkets(list.map(c => c.coin_id))
        setMarkets(data)
      } else {
        setMarkets([])
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadWatchlist() }, [loadWatchlist])

  // ── Load explore tab ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'explore' || exploreMarkets.length > 0) return
    setExploreLoading(true)
    fetchCoinMarkets(POPULAR_COINS.map(c => c.id))
      .then(data => setExploreMarkets(data))
      .catch(() => {})
      .finally(() => setExploreLoading(false))
  }, [activeTab])

  // ── Refresh prices ────────────────────────────────────────────────────
  const refresh = async () => {
    if (!watchlist.length) return
    setRefreshing(true)
    try {
      const data = await fetchCoinMarkets(watchlist.map(c => c.coin_id))
      setMarkets(data)
      toast.success('Prices updated')
    } catch {
      toast.error('Failed to refresh prices')
    } finally {
      setRefreshing(false)
    }
  }

  // ── Search ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const results = await searchCoins(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 500)
    return () => clearTimeout(t)
  }, [searchQuery])

  const handleAdd = async (coin) => {
    const alreadyIn = watchlist.some(w => w.coin_id === coin.id)
    if (alreadyIn) { toast.warning(`${coin.symbol} is already in your watchlist`); return }
    try {
      await addToWatchlist({
        coinId: coin.id,
        symbol: coin.symbol?.toUpperCase() || coin.id,
        name: coin.name,
        thumb: coin.thumb || coin.image,
      })
      toast.success(`Added ${coin.symbol || coin.name} to watchlist`)
      setSearchQuery('')
      loadWatchlist()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleRemove = async (coinId, symbol) => {
    try {
      await removeFromWatchlist(coinId)
      toast.success(`Removed ${symbol} from watchlist`)
      setWatchlist(prev => prev.filter(w => w.coin_id !== coinId))
      setMarkets(prev => prev.filter(m => m.id !== coinId))
    } catch (err) {
      toast.error(err.message)
    }
  }

  const getMarket = (coinId) => markets.find(m => m.id === coinId)
  const watchlistIds = new Set(watchlist.map(w => w.coin_id))

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Header */}
      <div className="page-header">
        <h2>Watchlist</h2>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn-cv-ghost" onClick={refresh} disabled={refreshing || !watchlist.length}>
            <i className={`bi bi-arrow-clockwise ${refreshing ? 'pulse' : ''}`}></i>
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cv-tabs mb-4">
        <button className={`cv-tab ${activeTab === 'watchlist' ? 'active' : ''}`} onClick={() => setActiveTab('watchlist')}>
          <i className="bi bi-star me-1"></i> My Watchlist {watchlist.length > 0 && `(${watchlist.length})`}
        </button>
        <button className={`cv-tab ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
          <i className="bi bi-compass me-1"></i> Explore Markets
        </button>
      </div>

      {/* Search bar (both tabs) */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <i className="bi bi-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--cv-text-dim)', fontSize: 14 }}></i>
        <input
          className="cv-input"
          placeholder="Search coins to add…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 40 }}
        />
        {searching && (
          <span className="cv-spinner cv-spinner-sm" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}></span>
        )}
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="cv-card p-0 mb-4 fade-in" style={{ overflow: 'hidden' }}>
          {searchResults.map((coin, i) => (
            <div
              key={coin.id}
              className="d-flex align-items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < searchResults.length - 1 ? '1px solid var(--cv-border)' : 'none', transition: 'background 0.15s', cursor: 'default' }}
            >
              {coin.thumb && <img src={coin.thumb} alt={coin.symbol} width={28} height={28} style={{ borderRadius: '50%' }} />}
              {!coin.thumb && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cv-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{coin.symbol?.[0]}</div>}
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{coin.symbol}</span>
                <span style={{ color: 'var(--cv-text-muted)', fontSize: 12, marginLeft: 8 }}>{coin.name}</span>
              </div>
              <button
                className={watchlistIds.has(coin.id) ? 'btn-cv-secondary' : 'btn-cv-primary'}
                style={{ padding: '5px 12px', fontSize: 12 }}
                onClick={() => watchlistIds.has(coin.id) ? handleRemove(coin.id, coin.symbol) : handleAdd(coin)}
              >
                {watchlistIds.has(coin.id) ? <><i className="bi bi-star-fill"></i> Watching</> : <><i className="bi bi-star"></i> Add</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Watchlist tab */}
      {activeTab === 'watchlist' && (
        <>
          {loading ? (
            <div className="cv-card text-center py-5"><div className="cv-spinner cv-spinner-lg mx-auto"></div></div>
          ) : watchlist.length === 0 ? (
            <div className="cv-card text-center py-5 fade-in">
              <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
              <h5 style={{ fontWeight: 700 }}>No coins yet</h5>
              <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>
                Search above or explore markets to add coins to your watchlist.
              </p>
              <button className="btn-cv-secondary" onClick={() => setActiveTab('explore')}>
                <i className="bi bi-compass"></i> Browse Markets
              </button>
            </div>
          ) : (
            <div className="cv-card p-0" style={{ overflow: 'hidden' }}>
              {/* Table header */}
              <div className="watchlist-header">
                <span style={{ flex: 2 }}>Coin</span>
                <span className="d-none d-md-block" style={{ flex: 1, textAlign: 'right' }}>Market Cap</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                <span style={{ flex: 1, textAlign: 'right' }}>24h Change</span>
                <span style={{ width: 36 }}></span>
              </div>

              {watchlist.map((item, i) => {
                const m = getMarket(item.coin_id)
                const change = m?.price_change_percentage_24h
                return (
                  <div
                    key={item.coin_id}
                    className="watchlist-row"
                    style={{ borderBottom: i < watchlist.length - 1 ? '1px solid var(--cv-border)' : 'none' }}
                  >
                    {/* Coin info */}
                    <div className="d-flex align-items-center gap-3" style={{ flex: 2 }}>
                      {(m?.image || item.thumb) ? (
                        <img src={m?.image || item.thumb} alt={item.symbol} width={32} height={32} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div className="coin-avatar">{item.symbol?.[0]}</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.symbol}</div>
                        <div style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>{item.name}</div>
                      </div>
                    </div>

                    {/* Market cap */}
                    <div className="d-none d-md-block mono" style={{ flex: 1, textAlign: 'right', fontSize: 12, color: 'var(--cv-text-muted)' }}>
                      {m ? formatMarketCap(m.market_cap) : <span className="skeleton" style={{ width: 60, height: 14, display: 'inline-block' }}></span>}
                    </div>

                    {/* Price */}
                    <div className="mono" style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                      {m ? formatPrice(m.current_price) : <span className="skeleton" style={{ width: 70, height: 16, display: 'inline-block' }}></span>}
                    </div>

                    {/* 24h change */}
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      {m ? (
                        <span className={`cv-badge ${change >= 0 ? 'cv-badge-success' : 'cv-badge-danger'}`} style={{ fontSize: 11 }}>
                          <i className={`bi bi-arrow-${change >= 0 ? 'up' : 'down'}-right me-1`} style={{ fontSize: 9 }}></i>
                          {Math.abs(change).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="skeleton" style={{ width: 50, height: 18, display: 'inline-block', borderRadius: 9 }}></span>
                      )}
                    </div>

                    {/* Remove */}
                    <button
                      className="btn-cv-ghost p-1"
                      style={{ width: 36, color: 'var(--cv-text-dim)' }}
                      onClick={() => handleRemove(item.coin_id, item.symbol)}
                      title="Remove from watchlist"
                    >
                      <i className="bi bi-star-fill" style={{ color: 'var(--cv-warning)' }}></i>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Explore tab */}
      {activeTab === 'explore' && (
        <div className="fade-in">
          {exploreLoading ? (
            <div className="cv-card text-center py-5"><div className="cv-spinner cv-spinner-lg mx-auto"></div></div>
          ) : (
            <div className="cv-card p-0" style={{ overflow: 'hidden' }}>
              <div className="watchlist-header">
                <span style={{ flex: 2 }}>Coin</span>
                <span className="d-none d-md-block" style={{ flex: 1, textAlign: 'right' }}>Market Cap</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                <span style={{ flex: 1, textAlign: 'right' }}>24h</span>
                <span style={{ width: 80, textAlign: 'right' }}></span>
              </div>
              {(exploreMarkets.length > 0 ? exploreMarkets : POPULAR_COINS).map((coin, i) => {
                const m = exploreMarkets.find(mk => mk.id === (coin.id || coin.coinId))
                const change = m?.price_change_percentage_24h
                const inList = watchlistIds.has(coin.id)
                return (
                  <div
                    key={coin.id}
                    className="watchlist-row"
                    style={{ borderBottom: i < (exploreMarkets.length || POPULAR_COINS.length) - 1 ? '1px solid var(--cv-border)' : 'none' }}
                  >
                    <div className="d-flex align-items-center gap-3" style={{ flex: 2 }}>
                      {m?.image ? (
                        <img src={m.image} alt={coin.symbol} width={32} height={32} style={{ borderRadius: '50%' }} />
                      ) : (
                        <div className="coin-avatar">{(coin.symbol || coin.name)?.[0]}</div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{coin.symbol || m?.symbol?.toUpperCase()}</div>
                        <div style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>{coin.name || m?.name}</div>
                      </div>
                    </div>
                    <div className="d-none d-md-block mono" style={{ flex: 1, textAlign: 'right', fontSize: 12, color: 'var(--cv-text-muted)' }}>
                      {m ? formatMarketCap(m.market_cap) : '—'}
                    </div>
                    <div className="mono" style={{ flex: 1, textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                      {m ? formatPrice(m.current_price) : '—'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      {m && change !== undefined ? (
                        <span className={`cv-badge ${change >= 0 ? 'cv-badge-success' : 'cv-badge-danger'}`} style={{ fontSize: 11 }}>
                          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                        </span>
                      ) : '—'}
                    </div>
                    <div style={{ width: 80, textAlign: 'right' }}>
                      <button
                        className={inList ? 'btn-cv-secondary' : 'btn-cv-ghost'}
                        style={{ padding: '4px 10px', fontSize: 11 }}
                        onClick={() => inList
                          ? handleRemove(coin.id, coin.symbol)
                          : handleAdd({ id: coin.id, symbol: coin.symbol, name: coin.name, image: m?.image })
                        }
                      >
                        <i className={`bi bi-star${inList ? '-fill' : ''}`} style={{ color: inList ? 'var(--cv-warning)' : undefined }}></i>
                        {inList ? ' Watching' : ' Watch'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        .watchlist-header {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 18px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--cv-text-dim);
          border-bottom: 1px solid var(--cv-border);
        }
        .watchlist-row {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px;
          transition: background 0.15s;
        }
        .watchlist-row:hover { background: var(--cv-surface-2); }
        .coin-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--cv-accent-dim); display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 13px; color: var(--cv-accent); flex-shrink: 0;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}
