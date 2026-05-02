// src/services/blockchain/walletService.js
// Same ethers.js logic as web — works identically in React Native

import { ethers } from 'ethers'
import { getNetwork } from '../../utils/networks'

const providerCache = {}
const RPC_TIMEOUT   = 10_000

const tryRpc = (url) => {
  const p = new ethers.JsonRpcProvider(url)
  return Promise.race([
    p.getBlockNumber().then(() => p),
    new Promise((_, r) => setTimeout(() => r(new Error(`Timeout: ${url}`)), RPC_TIMEOUT)),
  ])
}

export const getProvider = async (networkId) => {
  if (providerCache[networkId]) return providerCache[networkId]
  const net = getNetwork(networkId)
  for (const url of (net.rpcUrls || [])) {
    try {
      const p = await tryRpc(url)
      providerCache[networkId] = p
      return p
    } catch {}
  }
  throw new Error(`All RPC endpoints failed for ${net.name}`)
}

export const invalidateProvider = (id) => { delete providerCache[id] }

// ── Key generation ──────────────────────────────────────────────────────
export const generateWallet = () => {
  const w = ethers.Wallet.createRandom()
  return { mnemonic: w.mnemonic.phrase, address: w.address, privateKey: w.privateKey }
}

export const walletFromMnemonic = (mnemonic) => {
  try {
    const w = ethers.Wallet.fromPhrase(mnemonic.trim())
    return { address: w.address, privateKey: w.privateKey }
  } catch { throw new Error('Invalid mnemonic phrase') }
}

export const walletFromPrivateKey = (pk) => {
  try {
    const k = pk.trim().startsWith('0x') ? pk.trim() : `0x${pk.trim()}`
    const w = new ethers.Wallet(k)
    return { address: w.address, privateKey: w.privateKey }
  } catch { throw new Error('Invalid private key') }
}

// ── ERC-20 ABI ──────────────────────────────────────────────────────────
const ERC20 = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]

// ── Balances ────────────────────────────────────────────────────────────
export const getNativeBalance = async (address, networkId) => {
  const p = await getProvider(networkId)
  return ethers.formatEther(await p.getBalance(address))
}

export const getTokenBalance = async (tokenAddress, walletAddress, networkId) => {
  const p = await getProvider(networkId)
  const c = new ethers.Contract(tokenAddress, ERC20, p)
  const [balance, decimals, symbol, name] = await Promise.all([c.balanceOf(walletAddress), c.decimals(), c.symbol(), c.name()])
  return { balance: ethers.formatUnits(balance, decimals), decimals: Number(decimals), symbol, name }
}

export const validateToken = async (tokenAddress, networkId) => {
  const p = await getProvider(networkId)
  const c = new ethers.Contract(tokenAddress, ERC20, p)
  const [symbol, name, decimals] = await Promise.all([c.symbol(), c.name(), c.decimals()])
  return { symbol, name, decimals: Number(decimals), address: tokenAddress }
}

// ── Gas ─────────────────────────────────────────────────────────────────
export const estimateGas = async (from, to, value, networkId) => {
  const p = await getProvider(networkId)
  const feeData  = await p.getFeeData()
  const gasLimit = await p.estimateGas({ from, to, value: ethers.parseEther(String(value)) })
  const maxFee   = feeData.maxFeePerGas || feeData.gasPrice
  const net      = getNetwork(networkId)
  return {
    gasLimit: gasLimit.toString(),
    maxFeePerGas: ethers.formatUnits(maxFee, 'gwei'),
    estimatedCostFormatted: `${parseFloat(ethers.formatEther(gasLimit * maxFee)).toFixed(8)} ${net.currency.symbol}`,
  }
}

// ── Send ────────────────────────────────────────────────────────────────
export const sendNative = async (privateKey, to, amount, networkId) => {
  const p  = await getProvider(networkId)
  const w  = new ethers.Wallet(privateKey, p)
  const tx = await w.sendTransaction({ to, value: ethers.parseEther(String(amount)) })
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const sendToken = async (privateKey, tokenAddress, to, amount, networkId) => {
  const p  = await getProvider(networkId)
  const w  = new ethers.Wallet(privateKey, p)
  const c  = new ethers.Contract(tokenAddress, ERC20, w)
  const d  = await c.decimals()
  const tx = await c.transfer(to, ethers.parseUnits(String(amount), d))
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const approveToken   = async (pk, tokenAddr, spender, amount, decimals, networkId) => {
  const p = await getProvider(networkId)
  const w = new ethers.Wallet(pk, p)
  const c = new ethers.Contract(tokenAddr, ERC20, w)
  const tx = await c.approve(spender, ethers.parseUnits(String(amount), decimals))
  return { txHash: tx.hash, wait: () => tx.wait() }
}

export const checkAllowance = async (tokenAddr, owner, spender, networkId) => {
  const p = await getProvider(networkId)
  const c = new ethers.Contract(tokenAddr, ERC20, p)
  return c.allowance(owner, spender)
}

// ── Utils ────────────────────────────────────────────────────────────────
export const isValidAddress = (addr) => { try { return ethers.isAddress(addr) } catch { return false } }
export const shortenAddress  = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
export const formatBalance   = (bal, dec = 6) => { const n = parseFloat(bal); return isNaN(n) ? '0.000000' : n.toFixed(dec) }
