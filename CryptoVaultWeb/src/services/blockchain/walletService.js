// src/services/blockchain/walletService.js
// BIP39/44 wallet generation, balance queries, signing, sending.
// Uses ethers.js v6 — NO MetaMask dependency.
// Multi-RPC fallback with per-endpoint timeout.

import { ethers } from 'ethers'
import { getNetwork } from '../../utils/networks'

// ── Provider cache ──────────────────────────────────────────────────────
const providerCache = {}
const RPC_TIMEOUT   = 8_000   // ms per RPC attempt

/** Race a single RPC provider against a timeout. */
const tryRpc = (rpcUrl) => {
  const provider = new ethers.JsonRpcProvider(rpcUrl)
  return Promise.race([
    provider.getBlockNumber().then(() => provider),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`RPC timeout: ${rpcUrl}`)), RPC_TIMEOUT)
    ),
  ])
}

/**
 * Get a live provider for networkId.
 * Tries each rpcUrls[] entry in order; first success is cached.
 */
export const getProvider = async (networkId) => {
  if (providerCache[networkId]) return providerCache[networkId]

  const network = getNetwork(networkId)
  const urls    = network.rpcUrls || []
  if (urls.length === 0) throw new Error(`No RPC URLs configured for ${networkId}`)

  const errs = []
  for (const url of urls) {
    try {
      const provider = await tryRpc(url)
      providerCache[networkId] = provider
      return provider
    } catch (e) {
      errs.push(`${url} — ${e.message}`)
    }
  }
  throw new Error(`All RPC endpoints failed for ${network.name}:\n${errs.join('\n')}`)
}

/** Force re-probe on next getProvider call (e.g. after network error). */
export const invalidateProvider = (networkId) => {
  delete providerCache[networkId]
}

// ── Wallet Generation (BIP39 / BIP44) ──────────────────────────────────

export const generateWallet = () => {
  const w = ethers.Wallet.createRandom()
  return { mnemonic: w.mnemonic.phrase, address: w.address, privateKey: w.privateKey }
}

export const walletFromMnemonic = (mnemonic) => {
  try {
    const w = ethers.Wallet.fromPhrase(mnemonic.trim())
    return { address: w.address, privateKey: w.privateKey }
  } catch {
    throw new Error('Invalid mnemonic phrase — check word count and spelling')
  }
}

export const walletFromPrivateKey = (privateKey) => {
  try {
    const pk = privateKey.trim().startsWith('0x') ? privateKey.trim() : `0x${privateKey.trim()}`
    const w  = new ethers.Wallet(pk)
    return { address: w.address, privateKey: w.privateKey }
  } catch {
    throw new Error('Invalid private key — must be 64 hex characters')
  }
}

// ── ERC-20 ABI (minimal) ────────────────────────────────────────────────
const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

// ── Balance Queries ─────────────────────────────────────────────────────

export const getNativeBalance = async (address, networkId) => {
  const provider = await getProvider(networkId)
  const balance  = await provider.getBalance(address)
  return ethers.formatEther(balance)
}

export const getTokenBalance = async (tokenAddress, walletAddress, networkId) => {
  const provider = await getProvider(networkId)
  const contract = new ethers.Contract(tokenAddress, ERC20, provider)
  const [balance, decimals, symbol, name] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals(),
    contract.symbol(),
    contract.name(),
  ])
  return {
    balance:  ethers.formatUnits(balance, decimals),
    decimals: Number(decimals),
    symbol,
    name,
    raw: balance,
  }
}

export const validateToken = async (tokenAddress, networkId) => {
  const provider = await getProvider(networkId)
  const contract = new ethers.Contract(tokenAddress, ERC20, provider)
  const [symbol, name, decimals] = await Promise.all([
    contract.symbol(),
    contract.name(),
    contract.decimals(),
  ])
  return { symbol, name, decimals: Number(decimals), address: tokenAddress }
}

// ── Gas Estimation ──────────────────────────────────────────────────────

export const estimateGas = async (from, to, value, networkId) => {
  const provider = await getProvider(networkId)
  const feeData  = await provider.getFeeData()
  const gasLimit = await provider.estimateGas({
    from, to, value: ethers.parseEther(String(value)),
  })
  const maxFee   = feeData.maxFeePerGas || feeData.gasPrice
  const cost     = gasLimit * maxFee
  const network  = getNetwork(networkId)
  return {
    gasLimit:             gasLimit.toString(),
    maxFeePerGas:         ethers.formatUnits(maxFee, 'gwei'),
    estimatedCostEth:     ethers.formatEther(cost),
    estimatedCostFormatted: `${parseFloat(ethers.formatEther(cost)).toFixed(8)} ${network.currency.symbol}`,
  }
}

// ── Send Transactions ───────────────────────────────────────────────────

export const sendNative = async (privateKey, to, amount, networkId) => {
  const provider = await getProvider(networkId)
  const wallet   = new ethers.Wallet(privateKey, provider)
  const tx       = await wallet.sendTransaction({
    to, value: ethers.parseEther(String(amount)),
  })
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const sendToken = async (privateKey, tokenAddress, to, amount, networkId) => {
  const provider = await getProvider(networkId)
  const wallet   = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(tokenAddress, ERC20, wallet)
  const decimals = await contract.decimals()
  const tx       = await contract.transfer(to, ethers.parseUnits(String(amount), decimals))
  return { txHash: tx.hash, wait: () => tx.wait() }
}

// ── Token Approval (for swaps) ──────────────────────────────────────────

export const approveToken = async (privateKey, tokenAddress, spender, amount, decimals, networkId) => {
  const provider = await getProvider(networkId)
  const wallet   = new ethers.Wallet(privateKey, provider)
  const contract = new ethers.Contract(tokenAddress, ERC20, wallet)
  const amtBN    = ethers.parseUnits(String(amount), decimals)
  const tx       = await contract.approve(spender, amtBN)
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const checkAllowance = async (tokenAddress, owner, spender, networkId) => {
  const provider = await getProvider(networkId)
  const contract = new ethers.Contract(tokenAddress, ERC20, provider)
  return contract.allowance(owner, spender)
}

// ── Transaction Queries ─────────────────────────────────────────────────

export const getTransactionReceipt = async (txHash, networkId) => {
  const provider = await getProvider(networkId)
  return provider.getTransactionReceipt(txHash)
}

export const getTransactionDetails = async (txHash, networkId) => {
  const provider = await getProvider(networkId)
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ])
  return { tx, receipt }
}

export const getChainId = async (networkId) => {
  const provider = await getProvider(networkId)
  const net = await provider.getNetwork()
  return Number(net.chainId)
}

// ── Utilities ───────────────────────────────────────────────────────────

export const isValidAddress = (addr) => {
  try { return ethers.isAddress(addr) } catch { return false }
}

export const shortenAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''

export const formatBalance = (balance, decimals = 6) => {
  const n = parseFloat(balance)
  if (isNaN(n)) return '0.000000'
  return n.toFixed(decimals)
}
