// src/screens/main/WatchlistScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchCoinMarkets, searchCoins, formatPrice, POPULAR_COINS } from '../../services/priceService'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../../services/supabase/watchlistService'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'
import { Card, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function WatchlistScreen() {
  const { colors } = useTheme()
  const [tab,           setTab]           = useState('watchlist')
  const [watchlist,     setWatchlist]     = useState([])
  const [marketData,    setMarketData]    = useState([])
  const [exploreData,   setExploreData]   = useState([])
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [refreshing,    setRefreshing]    = useState(false)
  const [watchlistIds,  setWatchlistIds]  = useState(new Set())

  const loadWatchlist = useCallback(async () => {
    try {
      const wl = await getWatchlist()
      setWatchlist(wl)
      setWatchlistIds(new Set(wl.map(w => w.coin_id)))
      if (wl.length > 0) {
        const data = await fetchCoinMarkets(wl.map(w => w.coin_id))
        setMarketData(data)
      }
    } catch {}
    setLoading(false); setRefreshing(false)
  }, [])

  const loadExplore = useCallback(async () => {
    try {
      const data = await fetchCoinMarkets(POPULAR_COINS.map(c => c.id))
      setExploreData(data)
    } catch {}
  }, [])

  useEffect(() => { loadWatchlist(); loadExplore() }, [])

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q)
    if (q.trim().length < 2) { setSearchResults([]); return }
    try {
      const results = await searchCoins(q)
      setSearchResults(results)
    } catch {}
  }, [])

  const handleAdd = async (coin) => {
    if (watchlistIds.has(coin.id)) { Toast.show({ type: 'info', text1: 'Already in watchlist' }); return }
    try {
      await addToWatchlist({ coinId: coin.id, symbol: coin.symbol, name: coin.name, thumb: coin.thumb })
      setWatchlistIds(p => new Set([...p, coin.id]))
      await loadWatchlist()
      Toast.show({ type: 'success', text1: `${coin.symbol} added! ⭐` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const handleRemove = async (coinId, symbol) => {
    try {
      await removeFromWatchlist(coinId)
      setWatchlistIds(p => { const s = new Set(p); s.delete(coinId); return s })
      setWatchlist(p => p.filter(w => w.coin_id !== coinId))
      setMarketData(p => p.filter(m => m.id !== coinId))
      Toast.show({ type: 'success', text1: `${symbol} removed` })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
  }

  const CoinRow = ({ coin, inWatchlist, onToggle }) => {
    const change = coin.price_change_percentage_24h
    const isUp   = change >= 0
    return (
      <View style={[styles.coinRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.coinAvatar, { backgroundColor: colors.surface2 }]}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{coin.symbol?.slice(0, 3).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{coin.symbol?.toUpperCase()}</Text>
          <Text style={{ fontSize: 11, color: colors.textSub, marginTop: 1 }} numberOfLines={1}>{coin.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>
            {formatPrice(coin.current_price)}
          </Text>
          {change != null && (
            <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 2, color: isUp ? colors.success : colors.danger }}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: inWatchlist
              ? 'rgba(255,184,48,0.18)'
              : colors.surface2,
            borderWidth: 1.5,
            borderColor: inWatchlist
              ? 'rgba(255,184,48,0.6)'
              : colors.border,
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={onToggle}>
          <Text style={{ fontSize: 18 }}>{inWatchlist ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Market</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface2, marginHorizontal: SPACING.lg }]}>
        {[['watchlist', '⭐ Watchlist'], ['explore', '🔍 Explore']].map(([k, label]) => (
          <TouchableOpacity
            key={k}
            style={[styles.tabBtn, tab === k && { backgroundColor: colors.surface }]}
            onPress={() => setTab(k)}>
            <Text style={[styles.tabLabel, { color: tab === k ? colors.text : colors.textSub }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadWatchlist(); loadExplore() }}
            tintColor={colors.accent}
          />
        }
      >
        {/* WATCHLIST TAB */}
        {tab === 'watchlist' && (
          loading ? (
            <View style={styles.centered}><Spinner /></View>
          ) : watchlist.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>⭐</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No coins yet</Text>
              <Text style={{ color: colors.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
                Switch to the Explore tab to add coins to your watchlist.
              </Text>
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: colors.accentDim, borderColor: `${colors.accent}50` }]}
                onPress={() => setTab('explore')}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Explore Markets →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {marketData.map((coin, i) => (
                <CoinRow
                  key={coin.id} coin={coin}
                  inWatchlist={watchlistIds.has(coin.id)}
                  onToggle={() => handleRemove(coin.id, coin.symbol?.toUpperCase())}
                />
              ))}
            </View>
          )
        )}

        {/* EXPLORE TAB */}
        {tab === 'explore' && (
          <>
            {/* Search bar */}
            <View style={[styles.searchWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Text style={{ fontSize: 16 }}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name or symbol…"
                placeholderTextColor={colors.textDim}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]) }}>
                  <Text style={{ color: colors.textSub, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length > 0 ? (
              <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.sectionHead, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.textSub }]}>Search Results</Text>
                </View>
                {searchResults.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.coinRow, { borderBottomColor: colors.border }]} onPress={() => handleAdd(c)}>
                    <View style={[styles.coinAvatar, { backgroundColor: colors.surface2 }]}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{c.symbol?.slice(0, 3)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{c.symbol}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSub }}>{c.name}</Text>
                    </View>
                    <Text style={{ color: watchlistIds.has(c.id) ? colors.accent : colors.textSub, fontSize: 22 }}>
                      {watchlistIds.has(c.id) ? '⭐' : '+'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              exploreData.length > 0 && (
                <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.sectionHead, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionLabel, { color: colors.textSub }]}>Popular Coins</Text>
                  </View>
                  {exploreData.map(coin => (
                    <CoinRow
                      key={coin.id} coin={coin}
                      inWatchlist={watchlistIds.has(coin.id)}
                      onToggle={() =>
                        watchlistIds.has(coin.id)
                          ? handleRemove(coin.id, coin.symbol?.toUpperCase())
                          : handleAdd({ id: coin.id, symbol: coin.symbol?.toUpperCase(), name: coin.name })
                      }
                    />
                  ))}
                </View>
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:      { flex: 1 },
  header:    { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  tabRow:    { flexDirection: 'row', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  tabBtn:    { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm - 2, alignItems: 'center' },
  tabLabel:  { fontSize: 13, fontWeight: '600' },
  centered:  { paddingVertical: 60, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle:{ fontSize: 18, fontWeight: '700', marginBottom: 8 },
  exploreBtn:{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1 },
  listCard:  { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  coinRow:   { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12, borderBottomWidth: 1 },
  coinAvatar:{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  starBtn:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  searchWrap:{ flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, gap: 10, marginBottom: SPACING.md },
  searchInput:{ flex: 1, fontSize: 14 },
  sectionHead:{ paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
})
