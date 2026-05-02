// src/utils/networks.js
// Same network config as web — no proxy paths (mobile makes direct requests)

export const NETWORKS = {
  eth_mainnet: {
    id: 'eth_mainnet',
    name: 'Ethereum',
    shortName: 'ETH',
    chainId: 1,
    rpcUrls: [
      'https://mainnet.infura.io/v3/e64830f85de44253a17bcb4e51cb189f',
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
    explorer: 'https://etherscan.io',
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
      'https://sepolia.infura.io/v3/e64830f85de44253a17bcb4e51cb189f',
      'https://rpc.ankr.com/eth_sepolia',
      'https://sepolia.publicnode.com',
    ],
    explorer: 'https://sepolia.etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true,
    color: '#627EEA',
    icon: '⟠',
    coingeckoId: 'ethereum',
  },
  bsc_mainnet: {
    id: 'bsc_mainnet',
    name: 'BNB Smart Chain',
    shortName: 'BNB',
    chainId: 56,
    rpcUrls: [
      'https://bsc-dataseed1.binance.org/',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
    ],
    explorer: 'https://bscscan.com',
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
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
      'https://rpc.ankr.com/bsc_testnet',
    ],
    explorer: 'https://testnet.bscscan.com',
    currency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
    isTestnet: true,
    color: '#F3BA2F',
    icon: '⬡',
    coingeckoId: 'binancecoin',
  },
  polygon_mainnet: {
    id: 'polygon_mainnet',
    name: 'Polygon',
    shortName: 'MATIC',
    chainId: 137,
    rpcUrls: [
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon.publicnode.com',
    ],
    explorer: 'https://polygonscan.com',
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
      'https://rpc.ankr.com/polygon_amoy',
      'https://polygon-amoy.publicnode.com',
    ],
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'Test MATIC', symbol: 'MATIC', decimals: 18 },
    isTestnet: true,
    color: '#8247E5',
    icon: '⬟',
    coingeckoId: 'matic-network',
  },
}

export const DEFAULT_NETWORK = 'eth_sepolia'

export const getNetwork    = (id) => NETWORKS[id] || NETWORKS[DEFAULT_NETWORK]
export const getExplorerTxUrl      = (networkId, hash)    => `${getNetwork(networkId).explorer}/tx/${hash}`
export const getExplorerAddressUrl = (networkId, address) => `${getNetwork(networkId).explorer}/address/${address}`
