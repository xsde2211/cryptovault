// src/utils/networks.js
export const NETWORKS = {
  eth_mainnet: {
    id: 'eth_mainnet', name: 'Ethereum', shortName: 'ETH', chainId: 1,
    rpcUrls: ['https://cloudflare-eth.com', 'https://rpc.ankr.com/eth'],
    explorer: 'https://etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false, color: '#627EEA', icon: '⟠', coingeckoId: 'ethereum',
  },
  eth_sepolia: {
    id: 'eth_sepolia', name: 'Ethereum Sepolia', shortName: 'ETH', chainId: 11155111,
    rpcUrls: ['https://rpc.ankr.com/eth_sepolia', 'https://sepolia.drpc.org'],
    explorer: 'https://sepolia.etherscan.io',
    currency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: true, color: '#627EEA', icon: '⟠', coingeckoId: 'ethereum',
  },
  bsc_mainnet: {
    id: 'bsc_mainnet', name: 'BNB Smart Chain', shortName: 'BNB', chainId: 56,
    rpcUrls: ['https://rpc.ankr.com/bsc', 'https://bsc.drpc.org'],
    explorer: 'https://bscscan.com',
    currency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    isTestnet: false, color: '#F3BA2F', icon: '⬡', coingeckoId: 'binancecoin',
  },
  bsc_testnet: {
    id: 'bsc_testnet', name: 'BSC Testnet', shortName: 'tBNB', chainId: 97,
    rpcUrls: ['https://rpc.ankr.com/bsc_testnet_chapel', 'https://bsc-testnet.drpc.org'],
    explorer: 'https://testnet.bscscan.com',
    currency: { name: 'Test BNB', symbol: 'tBNB', decimals: 18 },
    isTestnet: true, color: '#F3BA2F', icon: '⬡', coingeckoId: 'binancecoin',
  },
  polygon_mainnet: {
    id: 'polygon_mainnet', name: 'Polygon', shortName: 'MATIC', chainId: 137,
    rpcUrls: ['https://rpc.ankr.com/polygon', 'https://polygon.drpc.org'],
    explorer: 'https://polygonscan.com',
    currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    isTestnet: false, color: '#8247E5', icon: '⬟', coingeckoId: 'matic-network',
  },
  polygon_amoy: {
    id: 'polygon_amoy', name: 'Polygon Amoy', shortName: 'MATIC', chainId: 80002,
    rpcUrls: ['https://rpc.ankr.com/polygon_amoy', 'https://polygon-amoy.drpc.org'],
    explorer: 'https://amoy.polygonscan.com',
    currency: { name: 'Test MATIC', symbol: 'MATIC', decimals: 18 },
    isTestnet: true, color: '#8247E5', icon: '⬟', coingeckoId: 'matic-network',
  },
  // ── TRON ─────────────────────────────────────────────────────
  tron_mainnet: {
    id: 'tron_mainnet', name: 'TRON', shortName: 'TRX', chainId: 728126428,
    rpcUrls: ['https://api.trongrid.io'],
    explorer: 'https://tronscan.org',
    currency: { name: 'TRON', symbol: 'TRX', decimals: 6 },
    isTestnet: false, color: '#EF0027', icon: '◈', coingeckoId: 'tron',
    isTron: true,
  },
  tron_nile: {
    id: 'tron_nile', name: 'TRON Nile Testnet', shortName: 'TRX', chainId: 3448148188,
    rpcUrls: ['https://nile.trongrid.io'],
    explorer: 'https://nile.tronscan.org',
    currency: { name: 'Test TRX', symbol: 'TRX', decimals: 6 },
    isTestnet: true, color: '#EF0027', icon: '◈', coingeckoId: 'tron',
    isTron: true,
  },
}

export const DEFAULT_NETWORK = 'eth_sepolia'
export const getNetwork    = (id) => NETWORKS[id] || NETWORKS[DEFAULT_NETWORK]
export const isTronNetwork = (id) => !!NETWORKS[id]?.isTron
export const getExplorerTxUrl      = (id, hash)    => `${getNetwork(id).explorer}/#/transaction/${hash}`
export const getExplorerAddressUrl = (id, address) => `${getNetwork(id).explorer}/#/address/${address}`
