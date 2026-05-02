// src/screens/main/NFTScreen.js
import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Modal, RefreshControl, Dimensions,
} from 'react-native'
import axios from 'axios'
import { useApp } from '../../context/AppContext'
import { getNetwork } from '../../utils/networks'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, Spinner, Alert } from '../../components/UI'

const { width } = Dimensions.get('window')
const COL_WIDTH = (width - SPACING.lg * 2 - SPACING.sm) / 2

// Alchemy NFT API
const fetchNFTs = async (address, networkId) => {
  const key = process.env.EXPO_PUBLIC_ALCHEMY_KEY
  if (!key) return []
  const chainMap = { eth_mainnet: 'eth-mainnet', polygon_mainnet: 'polygon-mainnet', eth_sepolia: 'eth-sepolia' }
  const chain = chainMap[networkId]
  if (!chain) return []
  try {
    const { data } = await axios.get(
      `https://${chain}.g.alchemy.com/nft/v3/${key}/getNFTsForOwner`,
      { params: { owner: address, withMetadata: true, pageSize: 50 }, timeout: 15000 }
    )
    return (data.ownedNfts || []).map(n => ({
      id:          `${n.contract.address}-${n.tokenId}`,
      name:        n.name || n.raw?.metadata?.name || `#${n.tokenId}`,
      collection:  n.contract.name || 'Unknown Collection',
      image:       n.image?.cachedUrl || n.image?.originalUrl || n.raw?.metadata?.image,
      tokenId:     n.tokenId,
      contract:    n.contract.address,
      description: n.description || n.raw?.metadata?.description,
    }))
  } catch { return [] }
}

export default function NFTScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const network = getNetwork(activeNetwork)
  const [nfts,       setNfts]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected,   setSelected]   = useState(null)
  const [error,      setError]      = useState('')

  const load = useCallback(async () => {
    if (!activeWallet) return
    setError('')
    try {
      const data = await fetchNFTs(activeWallet.address, activeNetwork)
      setNfts(data)
      if (data.length === 0 && !process.env.EXPO_PUBLIC_ALCHEMY_KEY) {
        setError('Add EXPO_PUBLIC_ALCHEMY_KEY to your .env to load NFTs')
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false); setRefreshing(false) }
  }, [activeWallet, activeNetwork])

  useEffect(() => { load() }, [load])

  const supportsNFTs = ['eth_mainnet', 'polygon_mainnet', 'eth_sepolia'].includes(activeNetwork)

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={COLORS.accent} />}
    >
      {!supportsNFTs && (
        <Alert type="warning">NFTs are only available on Ethereum and Polygon.</Alert>
      )}

      {error && <Alert type="warning">{error}</Alert>}

      {loading ? (
        <View style={styles.centered}><Spinner size="large" /></View>
      ) : nfts.length === 0 && supportsNFTs ? (
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🖼️</Text>
          <Text style={styles.emptyTitle}>No NFTs Found</Text>
          <Text style={styles.emptyDesc}>Your NFTs on {network.name} will appear here.</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {nfts.map(nft => (
            <TouchableOpacity key={nft.id} style={styles.nftCard} onPress={() => setSelected(nft)} activeOpacity={0.85}>
              {nft.image ? (
                <Image source={{ uri: nft.image }} style={styles.nftImage} resizeMode="cover" />
              ) : (
                <View style={[styles.nftImage, styles.nftPlaceholder]}>
                  <Text style={{ fontSize: 32 }}>🖼️</Text>
                </View>
              )}
              <View style={styles.nftBody}>
                <Text style={styles.nftName} numberOfLines={1}>{nft.name}</Text>
                <Text style={styles.nftCollection} numberOfLines={1}>{nft.collection}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected?.image ? (
              <Image source={{ uri: selected.image }} style={styles.modalImage} resizeMode="cover" />
            ) : (
              <View style={[styles.modalImage, styles.nftPlaceholder]}><Text style={{ fontSize: 64 }}>🖼️</Text></View>
            )}
            <ScrollView style={{ padding: SPACING.lg }}>
              <Text style={styles.modalName}>{selected?.name}</Text>
              <Text style={styles.modalCollection}>{selected?.collection}</Text>
              {selected?.description && (
                <Text style={styles.modalDesc}>{selected.description}</Text>
              )}
              <View style={styles.modalMeta}>
                <Text style={styles.metaLabel}>Token ID</Text>
                <Text style={styles.metaValue}>#{selected?.tokenId}</Text>
              </View>
              <View style={styles.modalMeta}>
                <Text style={styles.metaLabel}>Contract</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{selected?.contract?.slice(0, 20)}…</Text>
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll:    { padding: SPACING.lg, paddingBottom: 40 },
  centered:  { paddingVertical: 80, alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyDesc:  { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  nftCard: {
    width: COL_WIDTH, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  nftImage: { width: COL_WIDTH, height: COL_WIDTH, backgroundColor: COLORS.surface2 },
  nftPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  nftBody: { padding: 10 },
  nftName: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  nftCollection: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', overflow: 'hidden' },
  modalImage: { width: '100%', height: 320, backgroundColor: COLORS.surface2 },
  modalName: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalCollection: { fontSize: 14, color: COLORS.accent, fontWeight: '600', marginBottom: 12 },
  modalDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 16 },
  modalMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  metaLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  metaValue: { fontSize: 12, color: COLORS.text, fontFamily: 'monospace', maxWidth: 200 },
  closeBtn: { margin: SPACING.lg, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  closeBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
})
