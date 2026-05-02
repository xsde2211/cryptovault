// src/utils/networks.js
// Central registry of all supported networks with multi-RPC fallback.
//
// WHY PROXY PATHS?
// Public RPC nodes (publicnode.com, ankr.com, etc.) block browser requests from
// localhost with CORS errors. In dev, we route through Vite's proxy which re-issues
// requests server-side. In production, direct URLs work fine from real domains.

const isDev = import.meta.env.DEV

// Helper: returns proxy path in dev, direct URL in prod
const rpc = (proxyPath, directUrl) => isDev ? proxyPath : directUrl

export const NETWORKS = {
  // ── Ethereum ──────────────────────────────────────────────────────────
  eth_mainnet: {
    id: 'eth_mainnet',
    name: 'Ethereum',
    shortName: 'ETH',
    chainId: 1,
    rpcUrls: [
      import.meta.env.VITE_ETH_MAINNET_RPC,
      rpc('/rpc/eth-mainnet', 'https://eth.llamarpc.com'),
    ].filter(Boolean),
    explorer: import.meta.env.VITE_ETH_MAINNET_EXPLORER || 'https://etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false,
    color: '#627EEA',
    icon: '⟠',
    coingeckoId: 'ethereum',
  },

  eth_sepolia: {
    id: 'eth_sepolia',
    name: 'Ethereum Sepolia',
    shortName: 'ETH',
    chainId: 11155111,
    rpcUrls: [
      import.meta.env.VITE_ETH_SEPOLIA_RPC,
      rpc('/rpc/eth-sepolia', 'https://rpc.ankr.com/eth_sepolia'),
    ].filter(Boolean),
    explorer: import.meta.env.VITE_ETH_SEPOLIA_EXPLORER || 'https://sepolia.etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
    color: '#627EEA',
    icon: '⟠',
    coingeckoId: 'ethereum',
  },

  // ── Binance Smart Chain ───────────────────────────────────────────────
  bsc_mainnet: {
    id: 'bsc_mainnet',
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    chainId: 56,
    rpcUrls: [
      import.meta.env.VITE_BSC_MAINNET_RPC,
      rpc('/rpc/bsc-mainnet', 'https://rpc.ankr.com/bsc'),
    ].filter(Boolean),
    explorer: import.meta.env.VITE_BSC_MAINNET_EXPLORER || 'https://bscscan.com',
    currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    isTestnet: false,
    color: '#F3BA2F',
    icon: '⬡',
    coingeckoId: 'binancecoin',
  },

  bsc_testnet: {
    id: 'bsc_testnet',
    name: 'BSC Testnet',
    shortName: 'tBNB',
    chainId: 97,
    rpcUrls: [
      import.meta.env.VITE_BSC_TESTNET_RPC,
      rpc('/rpc/bsc-testnet', 'https://rpc.ankr.com/bsc_testnet'),
    ].filter(Boolean),
    explorer: import.meta.env.VITE_BSC_TESTNET_EXPLORER || 'https://testnet.bscscan.com',
    currency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
    isTestnet: true,
    color: '#F3BA2F',
    icon: '⬡',
    coingeckoId: 'binancecoin',
  },

  // ── Polygon ───────────────────────────────────────────────────────────
  polygon_mainnet: {
    id: 'polygon_mainnet',
    name: 'Polygon',
    shortName: 'MATIC',
    chainId: 137,
    rpcUrls: [
      import.meta.env.VITE_POLYGON_MAINNET_RPC,
      rpc('/rpc/polygon-mainnet', 'https://rpc.ankr.com/polygon'),
    ].filter(Boolean),
    explorer: import.meta.env.VITE_POLYGON_MAINNET_EXPLORER || 'https://polygonscan.com',
    currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    isTestnet: false,
    color: '#8247E5',
    icon: '⬟',
    coingeckoId: 'matic-network',
  },

  polygon_amoy: {
    id: 'polygon_amoy',
    name: 'Polygon Amoy',
    shortName: 'MATIC',
    chainId: 80002,
    rpcUrls: [
      import.meta.env.VITE_POLYGON_AMOY_RPC,
      rpc('/rpc/polygon-amoy', 'https://rpc.ankr.com/polygon_amoy'),
    ].filter(Boolean),
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'Test MATIC', symbol: 'MATIC', decimals: 18 },
    isTestnet: true,
    color: '#8247E5',
    icon: '⬟',
    coingeckoId: 'matic-network',
  },
}

export const DEFAULT_NETWORK = 'eth_sepolia'

export const getNetwork    = (networkId) => NETWORKS[networkId] || NETWORKS[DEFAULT_NETWORK]
export const getPrimaryRpc = (networkId) => getNetwork(networkId).rpcUrls?.[0] || null

export const getNetworksByChain = (chain) =>
  Object.values(NETWORKS).filter((n) => n.shortName === chain)

export const getExplorerTxUrl = (networkId, txHash) =>
  `${getNetwork(networkId).explorer}/tx/${txHash}`

export const getExplorerAddressUrl = (networkId, address) =>
  `${getNetwork(networkId).explorer}/address/${address}`