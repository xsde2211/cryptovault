// src/screens/main/SwapScreen.js
import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import axios from 'axios'
import { ethers } from 'ethers'
import {
  getProvider, approveToken, checkAllowance,
  getNativeBalance, getTokenBalance, formatBalance,
} from '../../services/blockchain/walletService'
import { decryptPrivateKey } from '../../utils/encryption'
import { saveTransaction, updateTransactionStatus } from '../../services/supabase/walletDbService'
import { getNetwork, getExplorerTxUrl } from '../../utils/networks'
import { fetchPrices } from '../../services/priceService'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Alert, Input, InfoRow, Spinner, Badge } from '../../components/UI'
import Toast from 'react-native-toast-message'
import * as Clipboard from 'expo-clipboard'

const SWAP_TOKENS = {
  eth_mainnet: [
    { symbol: 'ETH',  name: 'Ethereum',    address: 'ETH', decimals: 18, isNative: true,  coingeckoId: 'ethereum' },
    { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8,  coingeckoId: 'wrapped-bitcoin' },
    { symbol: 'USDC', name: 'USD Coin',    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6,  coingeckoId: 'usd-coin' },
    { symbol: 'USDT', name: 'Tether',      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6,  coingeckoId: 'tether' },
    { symbol: 'DAI',  name: 'Dai',         address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, coingeckoId: 'dai' },
    { symbol: 'LINK', name: 'Chainlink',   address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, coingeckoId: 'chainlink' },
    { symbol: 'UNI',  name: 'Uniswap',     address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, coingeckoId: 'uniswap' },
  ],
  polygon_mainnet: [
    { symbol: 'MATIC', name: 'Polygon',     address: 'ETH', decimals: 18, isNative: true,  coingeckoId: 'matic-network' },
    { symbol: 'WETH',  name: 'Wrapped ETH', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, coingeckoId: 'ethereum' },
    { symbol: 'USDC',  name: 'USD Coin',    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6,  coingeckoId: 'usd-coin' },
    { symbol: 'USDT',  name: 'Tether',      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6,  coingeckoId: 'tether' },
    { symbol: 'DAI',   name: 'Dai',         address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18, coingeckoId: 'dai' },
  ],
  bsc_mainnet: [
    { symbol: 'BNB',  name: 'BNB',         address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'binancecoin' },
    { symbol: 'USDT', name: 'Tether',      address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18, coingeckoId: 'tether' },
    { symbol: 'USDC', name: 'USD Coin',    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18, coingeckoId: 'usd-coin' },
    { symbol: 'BUSD', name: 'BUSD',        address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18, coingeckoId: 'binance-usd' },
    { symbol: 'CAKE', name: 'PancakeSwap', address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals: 18, coingeckoId: 'pancakeswap-token' },
  ],
  eth_sepolia: [
    { symbol: 'ETH',  name: 'Ethereum',  address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'ethereum' },
    { symbol: 'WBTC', name: 'BTC',       address: 'ETH', decimals: 8,  coingeckoId: 'wrapped-bitcoin', priceOnly: true },
    { symbol: 'USDC', name: 'USD Coin',  address: 'ETH', decimals: 6,  coingeckoId: 'usd-coin',        priceOnly: true },
    { symbol: 'LINK', name: 'Chainlink', address: 'ETH', decimals: 18, coingeckoId: 'chainlink',       priceOnly: true },
    { symbol: 'BNB',  name: 'BNB',       address: 'ETH', decimals: 18, coingeckoId: 'binancecoin',     priceOnly: true },
  ],
  bsc_testnet: [
    { symbol: 'tBNB', name: 'Test BNB', address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'binancecoin' },
    { symbol: 'ETH',  name: 'Ethereum', address: 'ETH', decimals: 18, coingeckoId: 'ethereum',  priceOnly: true },
    { symbol: 'USDT', name: 'Tether',   address: 'ETH', decimals: 6,  coingeckoId: 'tether',    priceOnly: true },
  ],
  polygon_amoy: [
    { symbol: 'MATIC', name: 'Test MATIC', address: 'ETH', decimals: 18, isNative: true, coingeckoId: 'matic-network' },
    { symbol: 'ETH',   name: 'Ethereum',  address: 'ETH', decimals: 18, coingeckoId: 'ethereum', priceOnly: true },
    { symbol: 'USDC',  name: 'USD Coin',  address: 'ETH', decimals: 6,  coingeckoId: 'usd-coin', priceOnly: true },
  ],
}

const ZEROX_BASE = { eth_mainnet: 'https://api.0x.org', polygon_mainnet: 'https://polygon.api.0x.org', bsc_mainnet: 'https://bsc.api.0x.org' }
const CHAIN_IDS  = { eth_mainnet: 1, polygon_mainnet: 137, bsc_mainnet: 56 }
const NATIVE     = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
const toAddr     = (t) => (t.isNative || t.address === 'ETH') ? NATIVE : t.address

export default function SwapScreen() {
  const { activeWallet, activeNetwork } = useApp()
  const { colors } = useTheme()
  const network    = getNetwork(activeNetwork)
  const canExecute = !!ZEROX_BASE[activeNetwork]
  const tokens     = SWAP_TOKENS[activeNetwork] || SWAP_TOKENS.eth_mainnet

  const [sellToken,  setSellToken]  = useState(tokens[0])
  const [buyToken,   setBuyToken]   = useState(tokens[1] || tokens[0])
  const [sellAmount, setSellAmount] = useState('')
  const [buyAmount,  setBuyAmount]  = useState('')
  const [balances,   setBalances]   = useState({})
  const [prices,     setPrices]     = useState({})
  const [priceInfo,  setPriceInfo]  = useState(null)
  const [quote,      setQuote]      = useState(null)
  const [step,       setStep]       = useState('form')
  const [password,   setPassword]   = useState('')
  const [txHash,     setTxHash]     = useState('')
  const [error,      setError]      = useState('')
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [showSellPicker, setShowSellPicker] = useState(false)
  const [showBuyPicker,  setShowBuyPicker]  = useState(false)
  const priceTimer = useRef(null)

  useEffect(() => {
    const t = SWAP_TOKENS[activeNetwork] || SWAP_TOKENS.eth_mainnet
    setSellToken(t[0]); setBuyToken(t[1] || t[0])
    setSellAmount(''); setBuyAmount(''); setPriceInfo(null); setError(''); setStep('form')
  }, [activeNetwork])

  useEffect(() => {
    if (!activeWallet) return
    const t = SWAP_TOKENS[activeNetwork] || SWAP_TOKENS.eth_mainnet
    t.filter(tk => !tk.priceOnly).forEach(async (tk) => {
      try {
        const bal = tk.isNative
          ? await getNativeBalance(activeWallet.address, activeNetwork)
          : (await getTokenBalance(tk.address, activeWallet.address, activeNetwork)).balance
        setBalances(p => ({ ...p, [tk.symbol]: bal }))
      } catch {}
    })
    const ids = [...new Set(t.map(tk => tk.coingeckoId).filter(Boolean))]
    fetchPrices(ids).then(data => {
      const p = {}; ids.forEach(id => { if (data[id]?.usd) p[id] = data[id].usd }); setPrices(p)
    }).catch(() => {})
  }, [activeWallet, activeNetwork])

  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) { setBuyAmount(''); setPriceInfo(null); return }
    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(async () => {
      setLoadingPrice(true); setError('')
      try {
        let info
        if (!canExecute || sellToken.priceOnly || buyToken.priceOnly) {
          const ids  = [sellToken.coingeckoId, buyToken.coingeckoId].filter(Boolean)
          const data = await fetchPrices(ids)
          const sUsd = data[sellToken.coingeckoId]?.usd
          const bUsd = data[buyToken.coingeckoId]?.usd
          if (!sUsd || !bUsd) throw new Error('Price data unavailable')
          const rate = sUsd / bUsd
          info = { price: rate.toString(), buyAmount: (parseFloat(sellAmount) * rate).toFixed(8), sources: ['CoinGecko'] }
        } else {
          const base    = ZEROX_BASE[activeNetwork]
          const chainId = CHAIN_IDS[activeNetwork]
          const sellWei = ethers.parseUnits(String(sellAmount), sellToken.decimals).toString()
          const { data } = await axios.get(`${base}/swap/permit2/price`, {
            params: { chainId, sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei },
            headers: { '0x-version': 'v2', ...(process.env.EXPO_PUBLIC_ZEROX_API_KEY ? { '0x-api-key': process.env.EXPO_PUBLIC_ZEROX_API_KEY } : {}) },
            timeout: 12000,
          })
          info = { price: data.price, buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals), sources: (data.route?.fills || []).map(f => f.source).filter(Boolean) }
        }
        setBuyAmount(parseFloat(info.buyAmount).toFixed(6)); setPriceInfo(info)
      } catch (err) { setError(err.message); setBuyAmount('') }
      finally { setLoadingPrice(false) }
    }, 800)
    return () => clearTimeout(priceTimer.current)
  }, [sellAmount, sellToken, buyToken, activeNetwork, canExecute])

  const swapDir = () => { setSellToken(buyToken); setBuyToken(sellToken); setSellAmount(buyAmount); setBuyAmount(''); setPriceInfo(null); setError('') }

  const handleReview = async () => {
    if (!canExecute) { Toast.show({ type: 'info', text1: 'Preview only on testnet' }); return }
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    setError(''); setLoadingQuote(true)
    try {
      const base    = ZEROX_BASE[activeNetwork]
      const chainId = CHAIN_IDS[activeNetwork]
      const sellWei = ethers.parseUnits(String(sellAmount), sellToken.decimals).toString()
      const { data } = await axios.get(`${base}/swap/permit2/quote`, {
        params: { chainId, sellToken: toAddr(sellToken), buyToken: toAddr(buyToken), sellAmount: sellWei, taker: activeWallet.address, slippageBps: 100 },
        headers: { '0x-version': 'v2', ...(process.env.EXPO_PUBLIC_ZEROX_API_KEY ? { '0x-api-key': process.env.EXPO_PUBLIC_ZEROX_API_KEY } : {}) },
        timeout: 15000,
      })
      setQuote({ sellToken, buyToken, sellAmount, buyAmount: ethers.formatUnits(data.buyAmount || '0', buyToken.decimals), price: data.price, to: data.transaction?.to, data: data.transaction?.data, value: data.transaction?.value || '0', gas: data.transaction?.gas, allowanceTarget: data.issues?.allowance?.spender, sources: (data.route?.fills || []).map(f => f.source).filter(Boolean) })
      setStep('confirm')
    } catch (err) { setError(err.response?.data?.message || err.message) }
    finally { setLoadingQuote(false) }
  }

  const handleExecute = async () => {
    if (!password) { setError('Enter wallet password'); return }
    setError(''); setStep('sending')
    try {
      const pk       = decryptPrivateKey(activeWallet.encrypted_private_key, password)
      const provider = await getProvider(activeNetwork)
      const wallet   = new ethers.Wallet(pk, provider)
      if (!quote.sellToken.isNative && quote.allowanceTarget) {
        const needed  = ethers.parseUnits(String(quote.sellAmount), quote.sellToken.decimals)
        const current = await checkAllowance(quote.sellToken.address, wallet.address, quote.allowanceTarget, activeNetwork)
        if (BigInt(current) < BigInt(needed)) { const tx = await approveToken(pk, quote.sellToken.address, quote.allowanceTarget, quote.sellAmount, quote.sellToken.decimals, activeNetwork); await tx.wait() }
      }
      const tx = await wallet.sendTransaction({ to: quote.to, data: quote.data, value: BigInt(quote.value || '0'), ...(quote.gas ? { gasLimit: BigInt(quote.gas) } : {}) })
      setTxHash(tx.hash)
      await saveTransaction({ walletAddress: activeWallet.address, txHash: tx.hash, chain: activeNetwork, type: 'swap', amount: quote.sellAmount, toAddress: activeWallet.address })
      setStep('done')
      Toast.show({ type: 'success', text1: 'Swap submitted! 🎉' })
      tx.wait().then(() => { updateTransactionStatus(tx.hash, 'confirmed'); Toast.show({ type: 'success', text1: 'Swap confirmed! ✅' }) })
        .catch(() => updateTransactionStatus(tx.hash, 'failed'))
    } catch (err) { setError(err.message); setStep('password') }
  }

  const reset = () => { setStep('form'); setPassword(''); setTxHash(''); setError(''); setQuote(null); setSellAmount(''); setBuyAmount(''); setPriceInfo(null) }

  // Token picker modal
  const TokenPicker = ({ tokens: tks, selected, onSelect, onClose }) => (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, maxHeight: '80%' }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: SPACING.md }}>Select Token</Text>
        <ScrollView>
          {tks.map(tk => (
            <TouchableOpacity key={tk.symbol}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: RADIUS.md, marginBottom: 4 },
                selected.symbol === tk.symbol && { backgroundColor: colors.accentDim }]}
              onPress={() => { onSelect(tk); onClose() }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{tk.symbol.slice(0, 3)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{tk.symbol}{tk.priceOnly ? ' ●' : ''}</Text>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>{tk.name}</Text>
              </View>
              {prices[tk.coingeckoId] && (
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                  ${prices[tk.coingeckoId] >= 1 ? prices[tk.coingeckoId].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : prices[tk.coingeckoId].toFixed(4)}
                </Text>
              )}
              {selected.symbol === tk.symbol && <Text style={{ color: colors.accent, marginLeft: 4 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', paddingTop: SPACING.md }}>
          <Text style={{ color: colors.textSub, fontWeight: '600' }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  if (!activeWallet) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={{ color: colors.textSub }}>Select a wallet first</Text>
    </View>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Swap</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, backgroundColor: `${network.color}18`, borderColor: `${network.color}50` }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: network.color }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: network.color }}>{network.shortName || network.name}</Text>
            </View>
            {!canExecute && <Badge label="Preview" type="warning" />}
          </View>
        </View>

        {!canExecute && (
          <Alert type="info" style={{ marginBottom: SPACING.md }}>
            Price preview — {network.name} testnet. Switch to Ethereum, Polygon, or BSC mainnet to execute real swaps.
          </Alert>
        )}

        {error ? <Alert type="danger" style={{ marginBottom: SPACING.md }}>{error}</Alert> : null}

        {/* FORM */}
        {step === 'form' && (
          <>
            {/* Sell */}
            <Card style={{ marginBottom: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.textSub }}>You Pay</Text>
                {balances[sellToken.symbol] !== undefined && (
                  <Text style={{ fontSize: 12, color: colors.textSub }}>
                    Balance: {formatBalance(balances[sellToken.symbol] || '0')} {sellToken.symbol}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: RADIUS.md, padding: 10, gap: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}
                onPress={() => setShowSellPicker(true)}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{sellToken.symbol.slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{sellToken.symbol}</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11 }}>{sellToken.name}</Text>
                </View>
                <Text style={{ color: colors.textSub }}>▾</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={{ flex: 1, fontSize: 24, fontWeight: '600', color: colors.text, paddingVertical: 4, fontFamily: 'monospace' }}
                  placeholder="0.00" placeholderTextColor={colors.textDim}
                  value={sellAmount} onChangeText={setSellAmount} keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={{ backgroundColor: colors.accentDim, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: `${colors.accent}50` }}
                  onPress={() => { const b = balances[sellToken.symbol]; if (b) setSellAmount(String((parseFloat(b) * 0.995).toFixed(8))) }}>
                  <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 12 }}>MAX</Text>
                </TouchableOpacity>
              </View>
              {sellAmount && prices[sellToken.coingeckoId] && (
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>
                  ≈ ${(parseFloat(sellAmount) * prices[sellToken.coingeckoId]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </Card>

            {/* Swap arrow */}
            <TouchableOpacity
              style={{ alignSelf: 'center', backgroundColor: colors.surface2, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border, zIndex: 10, marginVertical: -6 }}
              onPress={swapDir}>
              <Text style={{ fontSize: 18 }}>⇅</Text>
            </TouchableOpacity>

            {/* Buy */}
            <Card style={{ marginTop: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.textSub }}>You Receive</Text>
                {balances[buyToken.symbol] !== undefined && (
                  <Text style={{ fontSize: 12, color: colors.textSub }}>
                    Balance: {formatBalance(balances[buyToken.symbol] || '0')} {buyToken.symbol}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: RADIUS.md, padding: 10, gap: 10, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}
                onPress={() => setShowBuyPicker(true)}>
                <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accentDim, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: colors.accent }}>{buyToken.symbol.slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{buyToken.symbol}</Text>
                  <Text style={{ color: colors.textSub, fontSize: 11 }}>{buyToken.name}</Text>
                </View>
                <Text style={{ color: colors.textSub }}>▾</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                  {loadingPrice
                    ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={{ color: colors.textSub, fontSize: 13 }}>Fetching rate…</Text>
                      </View>
                    : <Text style={{ flex: 1, fontSize: 24, fontWeight: '600', color: colors.text, fontFamily: 'monospace' }}>{buyAmount || '0.00'}</Text>
                  }
                </View>
              </View>
              {buyAmount && prices[buyToken.coingeckoId] && (
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 4 }}>
                  ≈ ${(parseFloat(buyAmount) * prices[buyToken.coingeckoId]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              )}
            </Card>

            {priceInfo && !loadingPrice && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: colors.textSub, fontSize: 12 }}>
                  1 {sellToken.symbol} ≈ {parseFloat(priceInfo.price).toFixed(6)} {buyToken.symbol}
                </Text>
                {priceInfo.sources?.length > 0 && (
                  <Text style={{ color: colors.accent, fontSize: 11 }}>via {priceInfo.sources.slice(0, 2).join(', ')}</Text>
                )}
              </View>
            )}

            <PrimaryButton
              title={canExecute ? 'Review Swap →' : '👁 Preview Only (Testnet)'}
              onPress={handleReview}
              loading={loadingQuote}
              disabled={!sellAmount || parseFloat(sellAmount || 0) <= 0 || loadingPrice || loadingQuote}
              style={{ marginTop: SPACING.md }}
            />
          </>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && quote && (
          <Card>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16 }}>Confirm Swap</Text>
            <InfoRow label="You Pay"     value={`${quote.sellAmount} ${quote.sellToken.symbol}`} />
            <InfoRow label="You Receive" value={`≥ ${parseFloat(quote.buyAmount).toFixed(6)} ${quote.buyToken.symbol}`} />
            <InfoRow label="Rate"        value={`1 ${quote.sellToken.symbol} = ${parseFloat(quote.price).toFixed(6)} ${quote.buyToken.symbol}`} />
            {quote.sources?.length > 0 && <InfoRow label="Route" value={quote.sources.join(' → ')} last />}
            <Alert type="info" style={{ marginTop: SPACING.md }}>Quote valid ~30s · Slippage 1%</Alert>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
              <SecondaryButton title="← Back" onPress={() => setStep('form')} style={{ flex: 1 }} />
              <PrimaryButton title="Continue 🔒" onPress={() => setStep('password')} style={{ flex: 1.2 }} />
            </View>
          </Card>
        )}

        {/* PASSWORD */}
        {step === 'password' && (
          <Card>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 }}>Wallet Password</Text>
            <Text style={{ color: colors.textSub, fontSize: 14, marginBottom: SPACING.md }}>Decrypt your key to sign the swap.</Text>
            <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SecondaryButton title="← Back" onPress={() => setStep('confirm')} style={{ flex: 1 }} />
              <PrimaryButton title="Execute Swap" onPress={handleExecute} disabled={!password} style={{ flex: 1.2 }} />
            </View>
          </Card>
        )}

        {/* SENDING */}
        {step === 'sending' && (
          <Card style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Spinner size="large" />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 20, textAlign: 'center' }}>Executing Swap…</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center' }}>Broadcasting to {network.name}</Text>
          </Card>
        )}

        {/* DONE */}
        {step === 'done' && (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 60, marginBottom: 12 }}>🎉</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Swap Submitted!</Text>
            <Text style={{ color: colors.textSub, textAlign: 'center', marginBottom: SPACING.lg }}>
              {quote?.sellAmount} {quote?.sellToken.symbol} → ~{parseFloat(quote?.buyAmount || 0).toFixed(4)} {quote?.buyToken.symbol}
            </Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface2, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: colors.border, width: '100%', gap: 8 }}
              onPress={async () => { await Clipboard.setStringAsync(txHash); Toast.show({ type: 'success', text1: 'Copied!' }) }}>
              <Text style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: colors.text }} numberOfLines={1}>{txHash}</Text>
              <Text>📋</Text>
            </TouchableOpacity>
            <PrimaryButton title="New Swap" onPress={reset} style={{ marginTop: SPACING.lg, width: '100%' }} />
          </Card>
        )}

        {showSellPicker && <TokenPicker tokens={tokens} selected={sellToken} onSelect={t => { setSellToken(t); setBuyAmount(''); setPriceInfo(null) }} onClose={() => setShowSellPicker(false)} />}
        {showBuyPicker  && <TokenPicker tokens={tokens} selected={buyToken}  onSelect={t => { setBuyToken(t);  setBuyAmount(''); setPriceInfo(null) }} onClose={() => setShowBuyPicker(false)} />}

      </ScrollView>
    </SafeAreaView>
  )
}
