// src/screens/main/WatchlistScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchCoinMarkets, searchCoins, formatPrice, POPULAR_COINS } from '../../services/priceService'
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../../services/supabase/watchlistService'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, Spinner, SectionHeader } from '../../components/UI'
import Toast from 'react-native-toast-message'

export default function WatchlistScreen() {
  const [tab,          setTab]          = useState('watchlist')
  const [watchlist,    setWatchlist]    = useState([])
  const [marketData,   setMarketData]   = useState([])
  const [exploreData,  setExploreData]  = useState([])
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults,setSearchResults]= useState([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [watchlistIds, setWatchlistIds] = useState(new Set())

  const loadWatchlist = useCallback(async () => {
    try {
      const wl = await getWatchlist()
      setWatchlist(wl)
      setWatchlistIds(new Set(wl.map(w => w.coin_id)))
      if (wl.length > 0) {
        const data = await fetchCoinMarkets(wl.map(w => w.coin_id))
        setMarketData(data)
      }
    } catch {} finally { setLoading(false); setRefreshing(false) }
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
      <TouchableOpacity style={styles.coinRow} activeOpacity={0.7} onPress={() => {}}>
        <View style={styles.coinAvatar}>
          <Text style={styles.coinAvatarText}>{coin.symbol?.slice(0, 3).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.coinSymbol}>{coin.symbol?.toUpperCase()}</Text>
          <Text style={styles.coinName} numberOfLines={1}>{coin.name}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
          <Text style={styles.coinPrice}>{formatPrice(coin.current_price)}</Text>
          {change != null && (
            <Text style={[styles.coinChange, { color: isUp ? COLORS.success : COLORS.danger }]}>
              {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
            </Text>
          )}
        </View>
        <TouchableOpacity style={[styles.starBtn, inWatchlist && styles.starBtnActive]} onPress={onToggle}>
          <Text style={{ fontSize: 16 }}>{inWatchlist ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {[['watchlist', '⭐ Watchlist'], ['explore', '🔍 Explore']].map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.tab, tab === k && styles.tabActive]} onPress={() => setTab(k)}>
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWatchlist(); loadExplore() }} tintColor={COLORS.accent} />}
      >
        {/* WATCHLIST TAB */}
        {tab === 'watchlist' && (
          <>
            {loading ? (
              <View style={styles.centered}><Spinner /></View>
            ) : watchlist.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={{ fontSize: 52, marginBottom: 12 }}>⭐</Text>
                <Text style={styles.emptyTitle}>No coins yet</Text>
                <Text style={styles.emptyDesc}>Switch to the Explore tab to add coins to your watchlist.</Text>
                <TouchableOpacity onPress={() => setTab('explore')} style={styles.exploreBtn}>
                  <Text style={{ color: COLORS.accent, fontWeight: '700' }}>Explore Markets →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {marketData.map((coin, i) => (
                  <View key={coin.id}>
                    <CoinRow
                      coin={coin}
                      inWatchlist={watchlistIds.has(coin.id)}
                      onToggle={() => handleRemove(coin.id, coin.symbol?.toUpperCase())}
                    />
                    {i < marketData.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* EXPLORE TAB */}
        {tab === 'explore' && (
          <>
            {/* Search */}
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or symbol…"
                placeholderTextColor={COLORS.textDim}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]) }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length > 0 ? (
              <Card style={{ padding: 0, overflow: 'hidden', marginBottom: SPACING.md }}>
                <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>Search Results</Text></View>
                {searchResults.map((c, i) => (
                  <View key={c.id}>
                    <TouchableOpacity style={styles.searchResultRow} onPress={() => handleAdd(c)}>
                      <View style={styles.coinAvatar}><Text style={styles.coinAvatarText}>{c.symbol?.slice(0, 3)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.coinSymbol}>{c.symbol}</Text>
                        <Text style={styles.coinName}>{c.name}</Text>
                      </View>
                      <Text style={{ color: watchlistIds.has(c.id) ? COLORS.accent : COLORS.textMuted, fontSize: 22 }}>
                        {watchlistIds.has(c.id) ? '⭐' : '+'}
                      </Text>
                    </TouchableOpacity>
                    {i < searchResults.length - 1 && <View style={styles.rowDivider} />}
                  </View>
                ))}
              </Card>
            ) : (
              exploreData.length > 0 && (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <View style={styles.sectionHeader}><Text style={styles.sectionLabel}>Popular Coins</Text></View>
                  {exploreData.map((coin, i) => (
                    <View key={coin.id}>
                      <CoinRow
                        coin={coin}
                        inWatchlist={watchlistIds.has(coin.id)}
                        onToggle={() => watchlistIds.has(coin.id) ? handleRemove(coin.id, coin.symbol?.toUpperCase()) : handleAdd({ id: coin.id, symbol: coin.symbol?.toUpperCase(), name: coin.name })}
                      />
                      {i < exploreData.length - 1 && <View style={styles.rowDivider} />}
                    </View>
                  ))}
                </Card>
              )
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  tabRow: { flexDirection: 'row', marginHorizontal: SPACING.lg, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  tab: { flex: 1, paddingVertical: 9, borderRadius: RADIUS.sm - 2, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.surface },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.text },
  scroll:  { padding: SPACING.lg, paddingTop: 0, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  exploreBtn: { backgroundColor: COLORS.accentDim, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(124,111,247,0.3)' },
  coinRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  coinAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center' },
  coinAvatarText: { fontSize: 11, fontWeight: '800', color: COLORS.accent },
  coinSymbol: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  coinName:   { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  coinPrice:  { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
  coinChange: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  starBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surface3, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  starBtnActive: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)' },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 10, marginBottom: SPACING.md },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  sectionHeader: { paddingHorizontal: SPACING.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted },
})
