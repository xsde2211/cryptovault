// src/services/blockchain/nftService.js
// Fetches NFTs via Alchemy API (primary) with Moralis fallback.
// Both are free-tier friendly.

import axios from 'axios'

const ALCHEMY_KEYS = {
  eth_mainnet:     import.meta.env.VITE_ALCHEMY_ETH_KEY,
  eth_sepolia:     import.meta.env.VITE_ALCHEMY_SEPOLIA_KEY,
  polygon_mainnet: import.meta.env.VITE_ALCHEMY_POLYGON_KEY,
  polygon_amoy:    import.meta.env.VITE_ALCHEMY_AMOY_KEY,
}

const ALCHEMY_BASE = {
  eth_mainnet:     'https://eth-mainnet.g.alchemy.com/nft/v3',
  eth_sepolia:     'https://eth-sepolia.g.alchemy.com/nft/v3',
  polygon_mainnet: 'https://polygon-mainnet.g.alchemy.com/nft/v3',
  polygon_amoy:    'https://polygon-amoy.g.alchemy.com/nft/v3',
}

// Moralis endpoints (requires VITE_MORALIS_API_KEY)
const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2'
const MORALIS_CHAINS = {
  eth_mainnet:     'eth',
  eth_sepolia:     'sepolia',
  polygon_mainnet: 'polygon',
  polygon_amoy:    'amoy',
  bsc_mainnet:     'bsc',
  bsc_testnet:     'bsc testnet',
}

/**
 * Fetch NFTs owned by an address using Alchemy.
 */
const fetchNFTsAlchemy = async (address, networkId) => {
  const key  = ALCHEMY_KEYS[networkId]
  const base = ALCHEMY_BASE[networkId]
  if (!key || !base) throw new Error('Alchemy not configured for this network')

  const url = `${base}/${key}/getNFTsForOwner`
  const { data } = await axios.get(url, {
    params: {
      owner: address,
      withMetadata: true,
      pageSize: 50,
      excludeFilters: ['SPAM'],
    },
    timeout: 15000,
  })

  return (data.ownedNfts || []).map(nft => ({
    id:         `${nft.contract.address}_${nft.tokenId}`,
    tokenId:    nft.tokenId,
    name:       nft.name || nft.raw?.metadata?.name || `#${nft.tokenId}`,
    collection: nft.contract.name || nft.contract.address.slice(0, 10) + '…',
    contractAddress: nft.contract.address,
    image:      resolveImage(nft.image?.cachedUrl || nft.image?.pngUrl || nft.image?.originalUrl || nft.raw?.metadata?.image),
    description: nft.description || nft.raw?.metadata?.description,
    attributes: nft.raw?.metadata?.attributes || [],
    tokenType:  nft.tokenType,
    floorPrice: nft.contract.openSeaMetadata?.floorPrice,
    symbol:     nft.contract.symbol,
  }))
}

/**
 * Fetch NFTs via Moralis (fallback or BSC support).
 */
const fetchNFTsMoralis = async (address, networkId) => {
  const key   = import.meta.env.VITE_MORALIS_API_KEY
  const chain = MORALIS_CHAINS[networkId]
  if (!key || !chain) throw new Error('Moralis not configured')

  const { data } = await axios.get(`${MORALIS_BASE}/${address}/nft`, {
    params: { chain, format: 'decimal', limit: 50, media_items: true },
    headers: { 'X-API-Key': key },
    timeout: 15000,
  })

  return (data.result || []).map(nft => {
    let meta = {}
    try { meta = JSON.parse(nft.metadata || '{}') } catch {}
    return {
      id:         `${nft.token_address}_${nft.token_id}`,
      tokenId:    nft.token_id,
      name:       meta.name || nft.name || `#${nft.token_id}`,
      collection: nft.name || nft.token_address.slice(0, 10) + '…',
      contractAddress: nft.token_address,
      image:      resolveImage(nft.media?.media_collection?.high?.url || meta.image),
      description: meta.description,
      attributes: meta.attributes || [],
      tokenType:  nft.contract_type,
    }
  })
}

/** Resolve IPFS and other image URLs to HTTP */
const resolveImage = (url) => {
  if (!url) return null
  if (url.startsWith('ipfs://')) {
    return `https://ipfs.io/ipfs/${url.replace('ipfs://', '')}`
  }
  if (url.startsWith('ar://')) {
    return `https://arweave.net/${url.replace('ar://', '')}`
  }
  return url
}

/**
 * Main export — tries Alchemy first, falls back to Moralis.
 */
export const fetchNFTs = async (address, networkId) => {
  // Try Alchemy
  if (ALCHEMY_KEYS[networkId] && ALCHEMY_BASE[networkId]) {
    try {
      return await fetchNFTsAlchemy(address, networkId)
    } catch (err) {
      console.warn('Alchemy NFT fetch failed, trying Moralis:', err.message)
    }
  }

  // Try Moralis
  if (import.meta.env.VITE_MORALIS_API_KEY && MORALIS_CHAINS[networkId]) {
    try {
      return await fetchNFTsMoralis(address, networkId)
    } catch (err) {
      console.warn('Moralis NFT fetch failed:', err.message)
    }
  }

  // Return empty with helpful message
  return []
}

export const isNFTSupported = (networkId) =>
  !!(ALCHEMY_KEYS[networkId] || (import.meta.env.VITE_MORALIS_API_KEY && MORALIS_CHAINS[networkId]))

export const getNFTExplorerUrl = (contractAddress, tokenId, networkId) => {
  const base = {
    eth_mainnet:     'https://opensea.io/assets/ethereum',
    eth_sepolia:     'https://testnets.opensea.io/assets/sepolia',
    polygon_mainnet: 'https://opensea.io/assets/matic',
  }[networkId] || 'https://opensea.io/assets'
  return `${base}/${contractAddress}/${tokenId}`
}
