// src/screens/main/TransactionsScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Linking,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { getTransactions } from '../../services/supabase/walletDbService'
import { getNetwork, getExplorerTxUrl } from '../../utils/networks'
import { useApp } from '../../context/AppContext'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

const STATUS_COLORS = {
  confirmed: COLORS.success,
  pending:   COLORS.warning,
  failed:    COLORS.danger,
}

const TYPE_ICONS  = { send: '↑', receive: '↓', swap: '⇄', buy: '$' }
const TYPE_COLORS = { send: COLORS.danger, receive: COLORS.success, swap: COLORS.accent, buy: COLORS.info }

export default function TransactionsScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const [txs,       setTxs]       = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [filter,    setFilter]    = useState('all')

  const load = useCallback(async () => {
    if (!activeWallet) return
    try {
      const data = await getTransactions(activeWallet.address)
      setTxs(data)
    } catch {} finally { setLoading(false); setRefreshing(false) }
  }, [activeWallet])

  useEffect(() => { load() }, [load])

  const FILTERS = ['all', 'send', 'swap', 'pending']
  const filtered = filter === 'all' ? txs
    : filter === 'pending' ? txs.filter(t => t.status === 'pending')
    : txs.filter(t => t.type === filter)

  const formatDate = (d) => {
    const dt = new Date(d)
    const now = new Date()
    const diff = (now - dt) / 1000
    if (diff < 60)    return 'Just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return dt.toLocaleDateString()
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={COLORS.accent} />}
    >
      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={{ gap: 8, paddingRight: 16 }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterPill, filter === f && styles.filterPillActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centered}><Spinner /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>📋</Text>
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyDesc}>Your transaction history will appear here after you send, receive, or swap.</Text>
        </View>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((tx, i) => {
            const network = getNetwork(tx.chain)
            const icon  = TYPE_ICONS[tx.type] || '•'
            const color = TYPE_COLORS[tx.type] || COLORS.accent
            return (
              <View key={tx.id}>
                <TouchableOpacity
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onLongPress={async () => { await Clipboard.setStringAsync(tx.tx_hash); Toast.show({ type: 'success', text1: 'TX hash copied!' }) }}
                >
                  {/* Icon */}
                  <View style={[styles.txIcon, { backgroundColor: `${color}18` }]}>
                    <Text style={{ fontSize: 18, color }}>{icon}</Text>
                  </View>

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text style={styles.txType}>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</Text>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[tx.status] || COLORS.textDim }]} />
                      <Text style={[styles.txStatus, { color: STATUS_COLORS[tx.status] || COLORS.textDim }]}>{tx.status}</Text>
                    </View>
                    <Text style={styles.txHash} numberOfLines={1}>{tx.tx_hash}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <View style={[styles.netDot, { backgroundColor: network.color }]} />
                      <Text style={styles.txMeta}>{network.name} · {formatDate(tx.created_at)}</Text>
                    </View>
                  </View>

                  {/* Amount + explorer */}
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {tx.amount && <Text style={styles.txAmount}>{parseFloat(tx.amount).toFixed(4)}</Text>}
                    <TouchableOpacity onPress={() => Linking.openURL(getExplorerTxUrl(tx.chain, tx.tx_hash))}>
                      <Text style={{ color: COLORS.accent, fontSize: 12 }}>🔗</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {i < filtered.length - 1 && <View style={styles.divider} />}
              </View>
            )
          })}
        </Card>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll:    { padding: SPACING.lg, paddingBottom: 40 },
  filtersScroll: { marginBottom: SPACING.md },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border },
  filterPillActive: { backgroundColor: COLORS.accentDim, borderColor: 'rgba(124,111,247,0.4)' },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: COLORS.accent },
  centered: { paddingVertical: 60, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txType:   { fontSize: 14, fontWeight: '700', color: COLORS.text },
  txHash:   { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace', marginVertical: 2 },
  txMeta:   { fontSize: 11, color: COLORS.textDim },
  txStatus: { fontSize: 11, fontWeight: '700' },
  txAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'monospace' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  netDot:    { width: 6, height: 6, borderRadius: 3 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
})
