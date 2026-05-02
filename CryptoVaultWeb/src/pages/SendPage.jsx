// src/pages/SendPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import {
  getNativeBalance, getTokenBalance, estimateGas,
  sendNative, sendToken, isValidAddress, formatBalance,
} from '../services/blockchain/walletService'
import { decryptPrivateKey } from '../utils/encryption'
import { saveTransaction, updateTransactionStatus, getTokens } from '../services/supabase/walletDbService'
import { getNetwork, getExplorerTxUrl, NETWORKS } from '../utils/networks'
import { fetchPrices, formatPrice } from '../services/priceService'

const STEPS = { FORM: 'form', CONFIRM: 'confirm', PASSWORD: 'password', SENDING: 'sending', DONE: 'done' }

export default function SendPage() {
  const { activeWallet, activeNetwork } = useApp()
  const toast = useToast()
  const [step, setStep] = useState(STEPS.FORM)

  const [to,            setTo]            = useState('')
  const [amount,        setAmount]        = useState('')
  const [selectedAsset, setSelectedAsset] = useState('native')
  const [tokens,        setTokens]        = useState([])
  const [nativeBalance, setNativeBalance] = useState(null)
  const [tokenBalance,  setTokenBalance]  = useState(null)
  const [gasInfo,       setGasInfo]       = useState(null)
  const [gasLoading,    setGasLoading]    = useState(false)
  const [password,      setPassword]      = useState('')
  const [txHash,        setTxHash]        = useState('')
  const [txStatus,      setTxStatus]      = useState('')
  const [error,         setError]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [nativePrice,   setNativePrice]   = useState(null)
  const [recentTxs,     setRecentTxs]     = useState([])

  const network = getNetwork(activeNetwork)

  useEffect(() => {
    if (!activeWallet) return
    getNativeBalance(activeWallet.address, activeNetwork).then(setNativeBalance).catch(() => {})
    getTokens(activeWallet.address, activeNetwork).then(setTokens).catch(() => {})
    // load recent (last 3) transactions for the panel
    import('../services/supabase/walletDbService').then(({ getTransactions }) =>
      getTransactions(activeWallet.address).then(txs => setRecentTxs(txs.slice(0, 3))).catch(() => {})
    )
    // price
    if (network.coingeckoId) {
      fetchPrices([network.coingeckoId]).then(p => {
        setNativePrice(p[network.coingeckoId]?.usd || null)
      }).catch(() => {})
    }
  }, [activeWallet, activeNetwork])

  useEffect(() => {
    if (selectedAsset !== 'native' && activeWallet) {
      const tk = tokens.find(t => t.contract_address === selectedAsset)
      if (tk) getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork).then(i => setTokenBalance(i.balance)).catch(() => {})
    }
  }, [selectedAsset, tokens, activeWallet, activeNetwork])

  const handleEstimateGas = async () => {
    if (!isValidAddress(to) || !amount || !activeWallet) return
    setGasLoading(true)
    try {
      const info = await estimateGas(activeWallet.address, to, amount, activeNetwork)
      setGasInfo(info)
      toast.info(`Est. gas: ${info.estimatedCostFormatted}`)
    } catch { setGasInfo(null) } finally { setGasLoading(false) }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault(); setError('')
    if (!isValidAddress(to))                                              { setError('Invalid recipient address'); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) { setError('Enter a valid amount'); return }
    const bal = selectedAsset === 'native' ? parseFloat(nativeBalance) : parseFloat(tokenBalance)
    if (parseFloat(amount) > bal)                                         { setError('Insufficient balance'); return }
    setStep(STEPS.CONFIRM)
  }

  const handleSend = async () => {
    if (!password) { setError('Enter your wallet password'); return }
    setError(''); setLoading(true); setStep(STEPS.SENDING)
    try {
      const pk = decryptPrivateKey(activeWallet.encrypted_private_key, password)
      const result = selectedAsset === 'native'
        ? await sendNative(pk, to, amount, activeNetwork)
        : await sendToken(pk, selectedAsset, to, amount, activeNetwork)
      setTxHash(result.txHash); setTxStatus('pending')
      await saveTransaction({ walletAddress: activeWallet.address, txHash: result.txHash, chain: activeNetwork, type: 'send', amount, toAddress: to })
      setStep(STEPS.DONE); toast.success('Transaction submitted!')
      result.wait().then(async () => { setTxStatus('confirmed'); await updateTransactionStatus(result.txHash, 'confirmed'); toast.success('Confirmed! ✓') })
        .catch(async () => { setTxStatus('failed'); await updateTransactionStatus(result.txHash, 'failed'); toast.error('Transaction failed on-chain') })
    } catch (err) { setError(err.message); setStep(STEPS.PASSWORD); toast.error(err.message) }
    finally { setLoading(false) }
  }

  const reset = () => {
    setStep(STEPS.FORM); setTo(''); setAmount(''); setPassword(''); setTxHash('')
    setTxStatus(''); setError(''); setGasInfo(null); setSelectedAsset('native')
  }

  const selectedToken  = tokens.find(t => t.contract_address === selectedAsset)
  const displaySymbol  = selectedAsset === 'native' ? network.currency.symbol : selectedToken?.symbol || ''
  const displayBalance = selectedAsset === 'native' ? (nativeBalance !== null ? formatBalance(nativeBalance) : '…') : (tokenBalance !== null ? formatBalance(tokenBalance) : '…')
  const usdValue       = amount && nativePrice && selectedAsset === 'native'
    ? (parseFloat(amount) * nativePrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : null

  if (!activeWallet) return (
    <div className="row g-3">
      <div className="col-12">
        <div className="cv-card text-center py-5">
          <div style={{ fontSize: 52, marginBottom: 12 }}>👛</div>
          <h5 style={{ fontWeight: 700 }}>No Wallet Selected</h5>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>Create or import a wallet to send crypto.</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/create-wallet" className="btn-cv-primary"><i className="bi bi-plus-circle" /> Create</Link>
            <Link to="/import-wallet" className="btn-cv-secondary"><i className="bi bi-download" /> Import</Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="row g-3 align-items-start">
      {/* ── LEFT: Form ── */}
      <div className="col-12 col-lg-7">
        <div className="page-header">
          <h2>Send</h2>
          <span className="cv-badge" style={{ background: `${network.color}20`, color: network.color }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: network.color, display: 'inline-block', marginRight: 6 }} />
            {network.name}
          </span>
        </div>

        {error && (
          <div className="cv-alert cv-alert-danger mb-3">
            <i className="bi bi-exclamation-circle-fill" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{error}</span>
            <button className="btn-cv-ghost p-0" onClick={() => setError('')}><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
          </div>
        )}

        {/* FORM */}
        {step === STEPS.FORM && (
          <form className="cv-card fade-in" onSubmit={handleFormSubmit} noValidate>
            <div className="mb-3">
              <label className="cv-label">Asset</label>
              <select className="cv-select" value={selectedAsset} onChange={e => { setSelectedAsset(e.target.value); setTokenBalance(null) }}>
                <option value="native">{network.currency.symbol} — {displayBalance} {network.currency.symbol}</option>
                {tokens.map(tk => <option key={tk.id} value={tk.contract_address}>{tk.symbol} — {tk.name}</option>)}
              </select>
            </div>

            <div className="mb-3">
              <label className="cv-label">Recipient Address</label>
              <input className="cv-input mono" placeholder="0x…" value={to} onChange={e => setTo(e.target.value)} required />
              {to && !isValidAddress(to) && <div style={{ fontSize: 11, color: 'var(--cv-danger)', marginTop: 4 }}><i className="bi bi-x-circle me-1" />Invalid address</div>}
            </div>

            <div className="mb-3">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="cv-label" style={{ margin: 0 }}>Amount</label>
                <span style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>Balance: <strong>{displayBalance}</strong> {displaySymbol}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="cv-input mono" type="number" step="any" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ flex: 1 }} required />
                <button type="button" className="btn-cv-secondary" style={{ padding: '10px 14px', fontSize: 12 }}
                  onClick={() => { const b = selectedAsset === 'native' ? nativeBalance : tokenBalance; if (b) setAmount(String((parseFloat(b) * 0.99).toFixed(8))) }}>
                  Max
                </button>
              </div>
              {usdValue && <div style={{ fontSize: 11, color: 'var(--cv-text-muted)', marginTop: 4 }}>≈ {usdValue}</div>}
            </div>

            <div className="mb-4">
              <button type="button" className="btn-cv-ghost" style={{ fontSize: 12, padding: '4px 0', color: gasInfo ? 'var(--cv-success)' : undefined }}
                onClick={handleEstimateGas} disabled={gasLoading || !to || !amount || !isValidAddress(to)}>
                {gasLoading ? <><span className="cv-spinner cv-spinner-sm" /> Estimating…</>
                  : gasInfo ? <><i className="bi bi-check-circle-fill" /> Gas: ~{gasInfo.estimatedCostFormatted}</>
                  : <><i className="bi bi-fuel-pump" /> Estimate Gas</>}
              </button>
              {gasInfo && <div style={{ fontSize: 11, color: 'var(--cv-text-dim)', marginTop: 2 }}>Limit: {gasInfo.gasLimit} · {parseFloat(gasInfo.maxFeePerGas).toFixed(2)} Gwei</div>}
            </div>

            <button type="submit" className="btn-cv-primary w-100 justify-content-center" style={{ padding: '13px' }}>
              Review Transaction <i className="bi bi-arrow-right" />
            </button>
          </form>
        )}

        {/* CONFIRM */}
        {step === STEPS.CONFIRM && (
          <div className="cv-card fade-in">
            <h5 style={{ fontWeight: 800, marginBottom: 20 }}>Confirm Transaction</h5>
            {[
              { label: 'From',    value: activeWallet.address, mono: true },
              { label: 'To',      value: to,                   mono: true },
              { label: 'Amount',  value: `${amount} ${displaySymbol}` },
              { label: 'Network', value: network.name },
              ...(usdValue ? [{ label: 'USD Value', value: usdValue }] : []),
              ...(gasInfo ? [{ label: 'Est. Gas', value: gasInfo.estimatedCostFormatted }] : []),
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--cv-border)', fontSize: 13 }}>
                <span style={{ color: 'var(--cv-text-muted)', minWidth: 80 }}>{row.label}</span>
                <span className={row.mono ? 'mono' : ''} style={{ fontSize: row.mono ? 11 : 13, fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.value}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn-cv-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(STEPS.FORM)}><i className="bi bi-arrow-left" /> Edit</button>
              <button className="btn-cv-primary"   style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(STEPS.PASSWORD)}>Continue <i className="bi bi-lock-fill" /></button>
            </div>
          </div>
        )}

        {/* PASSWORD */}
        {step === STEPS.PASSWORD && (
          <div className="cv-card fade-in">
            <h5 style={{ fontWeight: 800, marginBottom: 4 }}>Wallet Password</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>Your key is decrypted locally to sign this transaction.</p>
            <div className="mb-4">
              <label className="cv-label">Password</label>
              <input type="password" className="cv-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} autoFocus />
            </div>
            <div className="cv-alert cv-alert-info mb-4" style={{ fontSize: 12 }}>
              <i className="bi bi-shield-lock-fill" /> Your key is decrypted locally. Nothing is sent to any server.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-cv-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setStep(STEPS.CONFIRM)}><i className="bi bi-arrow-left" /> Back</button>
              <button className="btn-cv-primary"   style={{ flex: 1, justifyContent: 'center' }} onClick={handleSend} disabled={!password || loading}>
                <i className="bi bi-send-fill" /> Send {amount} {displaySymbol}
              </button>
            </div>
          </div>
        )}

        {/* SENDING */}
        {step === STEPS.SENDING && (
          <div className="cv-card fade-in text-center py-5">
            <div className="cv-spinner cv-spinner-lg mx-auto mb-3" />
            <h5 style={{ fontWeight: 700 }}>Broadcasting…</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>Signing and sending to {network.name}</p>
          </div>
        )}

        {/* DONE */}
        {step === STEPS.DONE && (
          <div className="cv-card fade-in text-center py-4">
            <div style={{ fontSize: 56, marginBottom: 12 }}>{txStatus === 'confirmed' ? '✅' : txStatus === 'failed' ? '❌' : '⏳'}</div>
            <h5 style={{ fontWeight: 700 }}>{txStatus === 'confirmed' ? 'Confirmed!' : txStatus === 'failed' ? 'Transaction Failed' : 'Transaction Submitted'}</h5>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 16 }}>
              {txStatus === 'confirmed' ? `${amount} ${displaySymbol} sent.` : txStatus === 'failed' ? 'Reverted on-chain.' : 'Waiting for confirmation…'}
            </p>
            {txStatus === 'pending' && <div className="cv-badge cv-badge-warning mb-3 pulse" style={{ fontSize: 11 }}><i className="bi bi-clock me-1" /> Pending…</div>}
            <div className="copy-box mb-4 text-start" style={{ cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(txHash); toast.success('Copied!') }}>
              <code style={{ fontSize: 11 }}>{txHash}</code>
              <i className="bi bi-clipboard" style={{ color: 'var(--cv-text-muted)', flexShrink: 0 }} />
            </div>
            <div className="d-flex gap-2 justify-content-center">
              <a href={getExplorerTxUrl(activeNetwork, txHash)} target="_blank" rel="noreferrer" className="btn-cv-secondary"><i className="bi bi-box-arrow-up-right" /> Explorer</a>
              <button className="btn-cv-primary" onClick={reset}><i className="bi bi-plus-circle" /> New Transfer</button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Info panel ── */}
      <div className="col-12 col-lg-5">
        {/* Balance card */}
        <div className="cv-card mb-3" style={{ background: `linear-gradient(135deg, var(--cv-surface), ${network.color}0a)`, borderColor: `${network.color}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${network.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: network.color }}>
              {network.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{network.name}</div>
              <div style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>Chain ID: {network.chainId}</div>
            </div>
            {network.isTestnet && <span className="cv-badge cv-badge-warning ms-auto" style={{ fontSize: 9 }}>Testnet</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--cv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Available Balance</div>
          <div className="balance-big" style={{ fontSize: 26 }}>
            {nativeBalance !== null ? formatBalance(nativeBalance, 6) : '—'}
            <span style={{ fontSize: 14, color: 'var(--cv-text-muted)', fontWeight: 400, marginLeft: 6 }}>{network.currency.symbol}</span>
          </div>
          {nativePrice && nativeBalance && (
            <div style={{ fontSize: 13, color: 'var(--cv-text-muted)', marginTop: 4 }}>
              ≈ {(parseFloat(nativeBalance) * nativePrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="cv-card mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)', marginBottom: 14 }}>How Sending Works</div>
          {[
            { icon: 'bi-pencil-fill',       color: '#7c6ff7', text: 'Enter recipient address and amount' },
            { icon: 'bi-shield-lock-fill',   color: '#10b981', text: 'Confirm details and enter your password' },
            { icon: 'bi-broadcast',          color: '#4facfe', text: 'Transaction is signed and broadcast on-chain' },
            { icon: 'bi-check-circle-fill',  color: '#f59e0b', text: 'Confirmation received after ~15 seconds' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: i < 3 ? 14 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 13, flexShrink: 0 }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--cv-text-muted)', lineHeight: 1.5, paddingTop: 6 }}>{s.text}</div>
            </div>
          ))}
        </div>

        {/* Recent transactions */}
        {recentTxs.length > 0 && (
          <div className="cv-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)' }}>Recent Sends</div>
              <Link to="/transactions" style={{ fontSize: 11, color: 'var(--cv-accent)', textDecoration: 'none' }}>View all →</Link>
            </div>
            {recentTxs.map(tx => (
              <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--cv-border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--cv-danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--cv-danger)', flexShrink: 0 }}>
                  <i className="bi bi-arrow-up-right" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--cv-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.tx_hash}</div>
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`cv-badge ${tx.status === 'confirmed' ? 'cv-badge-success' : tx.status === 'failed' ? 'cv-badge-danger' : 'cv-badge-warning'}`} style={{ fontSize: 9 }}>{tx.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Security tip */}
        <div className="cv-alert cv-alert-warning mt-3" style={{ fontSize: 12 }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ flexShrink: 0 }} />
          <span>Always verify the recipient address. Blockchain transactions are <strong>irreversible</strong>.</span>
        </div>
      </div>
    </div>
  )
}