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
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'
import { Spinner } from '../../components/UI'
import Toast from 'react-native-toast-message'

const TYPE_ICONS  = { send: '↑', receive: '↓', swap: '⇄', buy: '$' }

export default function TransactionsScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const { colors } = useTheme()
  const [txs,       setTxs]       = useState([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)
  const [filter,    setFilter]    = useState('all')

const load = useCallback(async () => {
  if (!activeWallet) {
    setLoading(false)  
    return
  }
  try {
    const data = await getTransactions(activeWallet.address)
    setTxs(data)
  } catch {}
  finally {
    setLoading(false)   
    setRefreshing(false)
  }
}, [activeWallet])

  useEffect(() => { load() }, [load])

  const FILTERS = ['all', 'send', 'swap', 'pending']

  const filtered = filter === 'all'
    ? txs
    : filter === 'pending'
      ? txs.filter(t => t.status === 'pending')
      : txs.filter(t => t.type === filter)

  const getStatusColor = (s) => {
    if (s === 'confirmed') return colors.success
    if (s === 'failed')    return colors.danger
    return colors.warning
  }

  const getTypeColor = (t) => {
    if (t === 'send')    return colors.danger
    if (t === 'receive') return colors.success
    if (t === 'swap')    return colors.accent
    return colors.info
  }

  const formatTimeAgo = (d) => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60)    return 'Just now'
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.accent} />
      }
    >
      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginBottom: SPACING.md }}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, {
              backgroundColor: filter === f ? colors.accentDim : colors.surface2,
              borderColor: filter === f ? `${colors.accent}60` : colors.border,
            }]}
            onPress={() => setFilter(f)}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: filter === f ? colors.accent : colors.textSub }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}><Spinner /></View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>📋</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>No Transactions</Text>
          <Text style={{ fontSize: 14, color: colors.textSub, textAlign: 'center', lineHeight: 20 }}>
            Your transaction history will appear here.
          </Text>
        </View>
      ) : (
        <View style={[styles.txList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filtered.map((tx, i) => {
            const net      = getNetwork(tx.chain)
            const icon     = TYPE_ICONS[tx.type] || '•'
            const typeCol  = getTypeColor(tx.type)
            const statCol  = getStatusColor(tx.status)
            return (
              <View key={tx.id}>
                <TouchableOpacity
                  style={styles.txRow}
                  activeOpacity={0.7}
                  onLongPress={async () => {
                    await Clipboard.setStringAsync(tx.tx_hash)
                    Toast.show({ type: 'success', text1: 'TX hash copied!' })
                  }}
                >
                  {/* Icon */}
                  <View style={[styles.txIcon, { backgroundColor: `${typeCol}18` }]}>
                    <Text style={{ fontSize: 18, color: typeCol, fontWeight: '700' }}>{icon}</Text>
                  </View>

                  {/* Details */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </Text>
                      <View style={[styles.statusDot, { backgroundColor: statCol }]} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: statCol }}>{tx.status}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: colors.textSub, fontFamily: 'monospace' }} numberOfLines={1}>
                      {tx.tx_hash}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: net.color }} />
                      <Text style={{ fontSize: 11, color: colors.textDim }}>{net.name} · {formatTimeAgo(tx.created_at)}</Text>
                    </View>
                  </View>

                  {/* Amount + link */}
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {tx.amount && (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: 'monospace' }}>
                        {parseFloat(tx.amount).toFixed(4)}
                      </Text>
                    )}
                    <TouchableOpacity onPress={() => Linking.openURL(getExplorerTxUrl(tx.chain, tx.tx_hash))}>
                      <Text style={{ color: colors.accent, fontSize: 13 }}>🔗</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
                {i < filtered.length - 1 && (
                  <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: SPACING.md }} />
                )}
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  txList:     { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  txRow:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  txIcon:     { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
})
