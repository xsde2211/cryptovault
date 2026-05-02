// src/pages/SwapPage.jsx
// Works on ALL networks:
//   • Mainnets: real on-chain swap via 0x Protocol
//   • Testnets:  price preview via CoinGecko (no on-chain tx — test tokens have no liquidity)

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { decryptPrivateKey } from '../utils/encryption'
import {
  getSwapPrice, getSwapQuote, executeSwap,
  getSwapTokensForNetwork, isExecutionSupported, getCGPrices,
} from '../services/blockchain/swapService'
import { getNativeBalance, getTokenBalance, formatBalance } from '../services/blockchain/walletService'
import { saveTransaction, updateTransactionStatus } from '../services/supabase/walletDbService'
import { getExplorerTxUrl, getNetwork } from '../utils/networks'

export default function SwapPage() {
  const { activeWallet, activeNetwork } = useApp()
  const toast   = useToast()
  const network  = getNetwork(activeNetwork)
  const canExecute = isExecutionSupported(activeNetwork)

  const tokens = getSwapTokensForNetwork(activeNetwork)

  const [sellToken,  setSellToken]  = useState(tokens[0])
  const [buyToken,   setBuyToken]   = useState(tokens[1] || tokens[0])
  const [sellAmount, setSellAmount] = useState('')
  const [buyAmount,  setBuyAmount]  = useState('')
  const [balances,   setBalances]   = useState({})
  const [prices,     setPrices]     = useState({})   // { coingeckoId: usdPrice }
  const [quote,      setQuote]      = useState(null)
  const [priceInfo,  setPriceInfo]  = useState(null)

  const [loadingPrice, setLoadingPrice] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [step,     setStep]     = useState('form')
  const [password, setPassword] = useState('')
  const [txHash,   setTxHash]   = useState('')
  const [error,    setError]    = useState('')

  const priceTimer = useRef(null)

  // Reset on network change
  useEffect(() => {
    const t = getSwapTokensForNetwork(activeNetwork)
    setSellToken(t[0]); setBuyToken(t[1] || t[0])
    setSellAmount(''); setBuyAmount(''); setPriceInfo(null); setError(''); setStep('form')
  }, [activeNetwork])

  // Load balances + market prices for right panel
  const loadData = useCallback(async () => {
    if (!activeWallet) return
    const t = getSwapTokensForNetwork(activeNetwork)
    const bals = {}
    await Promise.allSettled(t.filter(tk => !tk.priceOnly).map(async (tk) => {
      try {
        bals[tk.symbol] = tk.isNative
          ? await getNativeBalance(activeWallet.address, activeNetwork)
          : (await getTokenBalance(tk.address, activeWallet.address, activeNetwork)).balance
      } catch { bals[tk.symbol] = '0' }
    }))
    setBalances(bals)

    // Fetch USD prices for all tokens in the list
    const ids = [...new Set(t.map(tk => tk.coingeckoId).filter(Boolean))]
    getCGPrices(ids).then(data => {
      const p = {}
      ids.forEach(id => { if (data[id]?.usd) p[id] = data[id].usd })
      setPrices(p)
    }).catch(() => {})
  }, [activeWallet, activeNetwork])

  useEffect(() => { loadData() }, [loadData])

  // Debounced price fetch
  useEffect(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) { setBuyAmount(''); setPriceInfo(null); return }
    clearTimeout(priceTimer.current)
    priceTimer.current = setTimeout(async () => {
      setLoadingPrice(true); setError('')
      try {
        const info = await getSwapPrice({ sellToken, buyToken, sellAmount, networkId: activeNetwork })
        setBuyAmount(parseFloat(info.buyAmount).toFixed(6))
        setPriceInfo(info)
      } catch (err) { setError(err.message); setBuyAmount('') }
      finally { setLoadingPrice(false) }
    }, 700)
    return () => clearTimeout(priceTimer.current)
  }, [sellAmount, sellToken, buyToken, activeNetwork])

  const swapDir = () => {
    setSellToken(buyToken); setBuyToken(sellToken)
    setSellAmount(buyAmount); setBuyAmount(''); setPriceInfo(null); setError('')
  }

  const handleReview = async () => {
    if (!sellAmount || parseFloat(sellAmount) <= 0) return
    if (!canExecute) { toast.warning('On-chain swap not available on testnet — this is a price preview only'); return }
    setError(''); setLoadingQuote(true)
    try {
      const q = await getSwapQuote({ sellToken, buyToken, sellAmount, takerAddress: activeWallet.address, networkId: activeNetwork })
      setQuote(q); setStep('confirm')
    } catch (err) { setError(err.message) }
    finally { setLoadingQuote(false) }
  }

  const handleExecute = async () => {
    if (!password) { setError('Enter your wallet password'); return }
    setError(''); setStep('sending')
    try {
      const pk     = decryptPrivateKey(activeWallet.encrypted_private_key, password)
      const result = await executeSwap({ quote, privateKey: pk, networkId: activeNetwork })
      setTxHash(result.txHash)
      await saveTransaction({ walletAddress: activeWallet.address, txHash: result.txHash, chain: activeNetwork, type: 'swap', amount: sellAmount, toAddress: activeWallet.address })
      setStep('done'); toast.success('Swap submitted!')
      result.wait()
        .then(() => { updateTransactionStatus(result.txHash, 'confirmed'); toast.success('Swap confirmed! ✓') })
        .catch(() => updateTransactionStatus(result.txHash, 'failed'))
    } catch (err) { setError(err.message); setStep('password'); toast.error(err.message) }
  }

  const reset = () => { setStep('form'); setPassword(''); setTxHash(''); setError(''); setQuote(null); setSellAmount(''); setBuyAmount(''); setPriceInfo(null) }

  // Helpers
  const usdSell = sellAmount && prices[sellToken.coingeckoId]
    ? (parseFloat(sellAmount) * prices[sellToken.coingeckoId]).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null
  const usdBuy = buyAmount && prices[buyToken.coingeckoId]
    ? (parseFloat(buyAmount) * prices[buyToken.coingeckoId]).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null

  if (!activeWallet) return (
    <div className="cv-card text-center py-5"><p style={{ color: 'var(--cv-text-muted)' }}>Select a wallet to use Swap.</p></div>
  )

  return (
    <div className="row g-3 align-items-start">
      {/* ── LEFT: Swap form ── */}
      <div className="col-12 col-lg-7">
        <div className="page-header">
          <h2>Swap</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cv-badge" style={{ background: `${network.color}20`, color: network.color }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: network.color, display: 'inline-block', marginRight: 6 }} />
              {network.name}
            </span>
            {!canExecute && (
              <span className="cv-badge cv-badge-warning" style={{ fontSize: 9 }}>Preview Only</span>
            )}
          </div>
        </div>

        {/* Testnet info banner */}
        {!canExecute && (
          <div className="cv-alert cv-alert-info mb-3" style={{ fontSize: 12 }}>
            <i className="bi bi-info-circle-fill" style={{ flexShrink: 0 }} />
            <span>
              <strong>Price preview mode</strong> — You're on <strong>{network.name}</strong>. Real-time conversion rates via CoinGecko.
              Switch to Ethereum, Polygon, or BSC mainnet to execute actual swaps.
            </span>
          </div>
        )}

        {error && (
          <div className="cv-alert cv-alert-danger mb-3">
            <i className="bi bi-exclamation-circle-fill" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button className="btn-cv-ghost p-0" onClick={() => setError('')}><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="cv-card fade-in">
            {/* You Pay */}
            <div className="mb-1">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="cv-label" style={{ margin: 0 }}>You Pay</span>
                <span style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>
                  {balances[sellToken.symbol] !== undefined ? <>Balance: <strong>{formatBalance(balances[sellToken.symbol] || '0')}</strong> {sellToken.symbol}</> : ''}
                </span>
              </div>
              <div className="token-amount-input">
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select className="cv-select" style={{ flex: 1 }} value={sellToken.symbol}
                    onChange={e => { const t = tokens.find(tk => tk.symbol === e.target.value); if (t) { setSellToken(t); setBuyAmount(''); setPriceInfo(null) } }}>
                    {tokens.map(tk => (
                      <option key={tk.symbol} value={tk.symbol}>
                        {tk.symbol}{prices[tk.coingeckoId] ? ` · $${prices[tk.coingeckoId].toLocaleString()}` : ''} — {tk.name}{tk.priceOnly ? ' (preview)' : ''}
                      </option>
                    ))}
                  </select>
                  <button className="btn-cv-ghost" style={{ fontSize: 11, padding: '4px 10px', whiteSpace: 'nowrap' }}
                    onClick={() => { const b = balances[sellToken.symbol]; if (b) setSellAmount(String((parseFloat(b) * 0.995).toFixed(8))) }}>
                    Max
                  </button>
                </div>
                <input type="number" placeholder="0.00" value={sellAmount} onChange={e => setSellAmount(e.target.value)} min="0" step="any" />
              </div>
              {usdSell && <div style={{ fontSize: 11, color: 'var(--cv-text-muted)', marginTop: 4, paddingLeft: 2 }}>≈ {usdSell}</div>}
            </div>

            {/* Arrow */}
            <div style={{ textAlign: 'center', margin: '4px 0' }}>
              <button className="swap-arrow-btn" onClick={swapDir} title="Reverse">
                <i className="bi bi-arrow-down-up" />
              </button>
            </div>

            {/* You Receive */}
            <div className="mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className="cv-label" style={{ margin: 0 }}>You Receive</span>
                <span style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>
                  {balances[buyToken.symbol] !== undefined ? <>Balance: <strong>{formatBalance(balances[buyToken.symbol] || '0')}</strong> {buyToken.symbol}</> : ''}
                </span>
              </div>
              <div className="token-amount-input">
                <div style={{ marginBottom: 8 }}>
                  <select className="cv-select" value={buyToken.symbol}
                    onChange={e => { const t = tokens.find(tk => tk.symbol === e.target.value); if (t) { setBuyToken(t); setBuyAmount(''); setPriceInfo(null) } }}>
                    {tokens.map(tk => (
                      <option key={tk.symbol} value={tk.symbol}>
                        {tk.symbol}{prices[tk.coingeckoId] ? ` · $${prices[tk.coingeckoId].toLocaleString()}` : ''} — {tk.name}{tk.priceOnly ? ' (preview)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <input type="number" placeholder={loadingPrice ? 'Calculating…' : '0.00'} value={loadingPrice ? '' : buyAmount} readOnly style={{ opacity: loadingPrice ? 0.4 : 1, cursor: 'default' }} />
              </div>
              {usdBuy && <div style={{ fontSize: 11, color: 'var(--cv-text-muted)', marginTop: 4, paddingLeft: 2 }}>≈ {usdBuy}</div>}
            </div>

            {/* Rate row */}
            {loadingPrice && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: 'var(--cv-text-muted)' }}><span className="cv-spinner cv-spinner-sm" /> Fetching rate…</div>}
            {priceInfo && !loadingPrice && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, fontSize: 12 }}>
                <span style={{ color: 'var(--cv-text-muted)' }}>
                  1 {sellToken.symbol} = {parseFloat(priceInfo.price).toFixed(6)} {buyToken.symbol}
                </span>
                {priceInfo.sources?.length > 0 && (
                  <span style={{ color: 'var(--cv-accent)', fontSize: 11 }}>
                    via {priceInfo.sources.slice(0, 2).join(', ')}
                  </span>
                )}
              </div>
            )}

            <button
              className={`${canExecute ? 'btn-cv-primary' : 'btn-cv-secondary'} w-100 justify-content-center`}
              onClick={handleReview}
              disabled={!sellAmount || parseFloat(sellAmount) <= 0 || loadingQuote || loadingPrice}
              style={{ padding: '13px' }}
            >
              {loadingQuote
                ? <><span className="cv-spinner cv-spinner-sm" /> Getting Quote…</>
                : canExecute
                  ? <><i className="bi bi-arrow-left-right" /> Review Swap</>
                  : <><i className="bi bi-eye" /> Preview Only (Testnet)</>}
            </button>
          </div>
        )}

        {/* CONFIRM */}
        {step === 'confirm' && quote && (
          <div className="cv-card fade-in">
            <h5 style={{ fontWeight: 800, marginBottom: 20 }}>Confirm Swap</h5>
            {[
              { label: 'You Pay',      value: `${quote.sellAmount} ${quote.sellToken.symbol}` },
              { label: 'You Receive',  value: `≥ ${parseFloat(quote.buyAmount).toFixed(6)} ${quote.buyToken.symbol}`, highlight: true },
              { label: 'Rate',         value: `1 ${quote.sellToken.symbol} = ${parseFloat(quote.price).toFixed(6)} ${quote.buyToken.symbol}` },
              ...(usdSell ? [{ label: 'USD Value', value: usdSell }] : []),
              ...(quote.priceImpact && parseFloat(quote.priceImpact) > 0.01 ? [{ label: 'Price Impact', value: `${parseFloat(quote.priceImpact).toFixed(2)}%`, danger: parseFloat(quote.priceImpact) > 3 }] : []),
              ...(quote.sources?.length ? [{ label: 'Route', value: quote.sources.join(' → ') }] : []),
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--cv-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--cv-text-muted)' }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.highlight ? 'var(--cv-success)' : r.danger ? 'var(--cv-danger)' : 'var(--cv-text)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.value}</span>
              </div>
            ))}
            <div className="cv-alert cv-alert-info mt-4 mb-3" style={{ fontSize: 12 }}>
              <i className="bi bi-info-circle-fill" /> Quote valid ~30s · Slippage: 1%
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-cv-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('form')}><i className="bi bi-arrow-left" /> Back</button>
              <button className="btn-cv-primary"   style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('password')}>Continue <i className="bi bi-lock-fill" /></button>
            </div>
          </div>
        )}

        {/* PASSWORD */}
        {step === 'password' && (
          <div className="cv-card fade-in">
            <h5 style={{ fontWeight: 800, marginBottom: 4 }}>Wallet Password</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>Your key is decrypted locally to sign the swap.</p>
            <div style={{ marginBottom: 24 }}>
              <label className="cv-label">Password</label>
              <input type="password" className="cv-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleExecute()} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-cv-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep('confirm')}><i className="bi bi-arrow-left" /> Back</button>
              <button className="btn-cv-primary"   style={{ flex: 1, justifyContent: 'center' }} onClick={handleExecute} disabled={!password}><i className="bi bi-send-fill" /> Execute Swap</button>
            </div>
          </div>
        )}

        {step === 'sending' && (
          <div className="cv-card fade-in text-center py-5">
            <div className="cv-spinner cv-spinner-lg mx-auto mb-3" />
            <h5 style={{ fontWeight: 700 }}>Executing Swap…</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>Broadcasting to {network.name}</p>
          </div>
        )}

        {step === 'done' && (
          <div className="cv-card fade-in text-center py-4">
            <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
            <h5 style={{ fontWeight: 700 }}>Swap Submitted!</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 16 }}>
              {quote?.sellAmount} {quote?.sellToken.symbol} → ~{parseFloat(quote?.buyAmount || 0).toFixed(4)} {quote?.buyToken.symbol}
            </p>
            <div className="copy-box mb-4" style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(txHash); toast.success('Copied!') }}>
              <code style={{ fontSize: 11 }}>{txHash}</code>
              <i className="bi bi-clipboard" style={{ color: 'var(--cv-text-muted)', flexShrink: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <a href={getExplorerTxUrl(activeNetwork, txHash)} target="_blank" rel="noreferrer" className="btn-cv-secondary"><i className="bi bi-box-arrow-up-right" /> Explorer</a>
              <button className="btn-cv-primary" onClick={reset}><i className="bi bi-arrow-left-right" /> New Swap</button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Market prices + info panel ── */}
      <div className="col-12 col-lg-5">
        <div style={{ height: 52 }} />

        {/* Market rates card */}
        <div className="cv-card mb-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)' }}>Live Market Prices</div>
            <span style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>via CoinGecko</span>
          </div>
          {tokens.slice(0, 6).map(tk => {
            const usd = prices[tk.coingeckoId]
            return (
              <div key={tk.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cv-border)', cursor: 'pointer', transition: 'background 0.1s', borderRadius: 6, paddingLeft: 6, paddingRight: 6 }}
                onClick={() => { setSellToken(tk); setSellAmount(''); setBuyAmount(''); setPriceInfo(null) }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cv-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cv-accent)', flexShrink: 0, textTransform: 'uppercase' }}>
                  {tk.symbol.slice(0, 3)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{tk.symbol}</div>
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>{tk.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {usd ? (
                    <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      ${usd >= 1 ? usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : usd.toFixed(4)}
                    </div>
                  ) : (
                    <div className="skeleton" style={{ width: 60, height: 14, display: 'inline-block' }} />
                  )}
                  {(sellToken.symbol === tk.symbol || buyToken.symbol === tk.symbol) && (
                    <div style={{ fontSize: 9, color: 'var(--cv-accent)', fontWeight: 700 }}>SELECTED</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mode info */}
        <div className="cv-card mb-3" style={{ borderColor: canExecute ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: canExecute ? 'var(--cv-success-dim)' : 'var(--cv-warning-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: canExecute ? 'var(--cv-success)' : 'var(--cv-warning)', fontSize: 15 }}>
              <i className={`bi bi-${canExecute ? 'lightning-charge-fill' : 'eye'}`} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{canExecute ? 'Execution Mode' : 'Preview Mode'}</div>
              <div style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>{network.name}</div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--cv-text-muted)', margin: 0, lineHeight: 1.6 }}>
            {canExecute
              ? 'Real on-chain swap via 0x Protocol. Aggregates liquidity from Uniswap, Curve, Balancer and more for best price.'
              : 'On testnet — swap prices shown for reference using CoinGecko real-time data. No actual tokens are exchanged.'}
          </p>
        </div>

        {/* Supported tokens count */}
        <div className="cv-card">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)', marginBottom: 12 }}>Available on {network.name}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tokens.map(tk => (
              <button key={tk.symbol}
                onClick={() => { setSellToken(tk); setSellAmount(''); setBuyAmount(''); setPriceInfo(null) }}
                style={{
                  padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                  border: `1px solid ${sellToken.symbol === tk.symbol || buyToken.symbol === tk.symbol ? 'var(--cv-accent)' : 'var(--cv-border)'}`,
                  background: sellToken.symbol === tk.symbol || buyToken.symbol === tk.symbol ? 'var(--cv-accent-dim)' : 'var(--cv-surface-2)',
                  color: sellToken.symbol === tk.symbol || buyToken.symbol === tk.symbol ? 'var(--cv-accent)' : 'var(--cv-text-muted)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {tk.symbol}
                {tk.priceOnly && <span style={{ fontSize: 8, opacity: 0.6, marginLeft: 3 }}>●</span>}
              </button>
            ))}
          </div>
          {tokens.some(t => t.priceOnly) && (
            <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', marginTop: 8 }}>● = price preview only on this network</div>
          )}
        </div>
      </div>
    </div>
  )
}