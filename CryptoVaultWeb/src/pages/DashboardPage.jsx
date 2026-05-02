// src/pages/DashboardPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import {
  getNativeBalance, getTokenBalance, shortenAddress, formatBalance,
} from '../services/blockchain/walletService'
import { getTokens } from '../services/supabase/walletDbService'
import { fetchPrices, formatPrice } from '../services/priceService'
import { getNetwork, getExplorerAddressUrl } from '../utils/networks'

export default function DashboardPage() {
  const { activeWallet, activeNetwork, wallets, setActiveWallet, prefs } = useApp()
  const toast = useToast()
  const [nativeBalance, setNativeBalance] = useState(null)
  const [tokens,        setTokens]        = useState([])
  const [tokenBalances, setTokenBalances] = useState({})
  const [prices,        setPrices]        = useState({})
  const [loading,       setLoading]       = useState(false)
  const [balHidden,     setBalHidden]     = useState(false)

  const network   = getNetwork(activeNetwork)
  const hideAll   = prefs?.hideBalances || balHidden

  const fetchBalances = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const [bal, tks] = await Promise.all([
        getNativeBalance(activeWallet.address, activeNetwork),
        getTokens(activeWallet.address, activeNetwork),
      ])
      setNativeBalance(bal)
      setTokens(tks)

      // Token balances
      const bals = {}
      await Promise.allSettled(tks.map(async (tk) => {
        try {
          const info = await getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
          bals[tk.contract_address] = info.balance
        } catch { bals[tk.contract_address] = null }
      }))
      setTokenBalances(bals)

      // Fetch native price from CoinGecko
      if (network.coingeckoId) {
        try {
          const p = await fetchPrices([network.coingeckoId])
          setPrices(p)
        } catch {}
      }
    } catch (err) {
      toast.error(`Balance fetch failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [activeWallet, activeNetwork])

  useEffect(() => { fetchBalances() }, [fetchBalances])

  // Derived: USD value of native balance
  const nativePrice = prices[network.coingeckoId]?.usd || null
  const nativeUsd   = nativeBalance !== null && nativePrice
    ? (parseFloat(nativeBalance) * nativePrice).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    : null

  const handleCopy = () => {
    navigator.clipboard.writeText(activeWallet.address)
    toast.success('Address copied!')
  }

  if (!activeWallet) {
    return (
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>👛</div>
        <h3 style={{ fontWeight: 800 }}>No Wallet Yet</h3>
        <p style={{ color: 'var(--cv-text-muted)', marginBottom: 28 }}>
          Create a new wallet or import an existing one to get started.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <Link to="/create-wallet" className="btn-cv-primary">
            <i className="bi bi-plus-circle-fill"></i> Create Wallet
          </Link>
          <Link to="/import-wallet" className="btn-cv-secondary">
            <i className="bi bi-download"></i> Import
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <div className="row g-3">
        {/* ── Main balance card ── */}
        <div className="col-12 col-xl-8">
          <div className="cv-card mb-3" style={{ background: 'linear-gradient(135deg, var(--cv-surface) 0%, rgba(108,99,255,0.06) 100%)' }}>
            {/* Header row */}
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)' }}>
                    Total Balance
                  </span>
                  <button
                    className="btn-cv-ghost p-0"
                    style={{ fontSize: 13, color: 'var(--cv-text-dim)' }}
                    onClick={() => setBalHidden(v => !v)}
                    title={hideAll ? 'Show balance' : 'Hide balance'}
                  >
                    <i className={`bi bi-eye${hideAll ? '-slash' : ''}`}></i>
                  </button>
                </div>
                <div className="balance-big">
                  {loading
                    ? <span className="pulse" style={{ fontSize: 16, color: 'var(--cv-text-muted)' }}>Fetching…</span>
                    : hideAll
                      ? <span style={{ letterSpacing: 4 }}>••••••</span>
                      : nativeBalance !== null
                        ? <>{formatBalance(nativeBalance, 6)} <span style={{ fontSize: 18, color: 'var(--cv-text-muted)', fontWeight: 400 }}>{network.currency.symbol}</span></>
                        : '—'}
                </div>
                {!hideAll && nativeUsd && (
                  <div style={{ fontSize: 14, color: 'var(--cv-text-muted)', marginTop: 4 }}>
                    ≈ {nativeUsd}
                  </div>
                )}
              </div>

              <div className="d-flex gap-1">
                <button
                  className="btn-icon"
                  onClick={fetchBalances}
                  disabled={loading}
                  title="Refresh balances"
                >
                  <i className={`bi bi-arrow-clockwise ${loading ? 'pulse' : ''}`}></i>
                </button>
                <a
                  href={getExplorerAddressUrl(activeNetwork, activeWallet.address)}
                  target="_blank" rel="noreferrer"
                  className="btn-icon" title="View on Explorer"
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="copy-box mb-4" style={{ cursor: 'pointer' }} onClick={handleCopy}>
              <code style={{ fontSize: 11 }}>
                {hideAll ? '0x' + '•'.repeat(38) : activeWallet.address}
              </code>
              <button className="btn-cv-ghost p-1" title="Copy address">
                <i className="bi bi-clipboard"></i>
              </button>
            </div>

            {/* Quick actions */}
            <div className="d-flex gap-2 flex-wrap">
              {[
                { to: '/send',    icon: 'bi-arrow-up-right-circle-fill', label: 'Send',    primary: true },
                { to: '/receive', icon: 'bi-arrow-down-left-circle',     label: 'Receive', primary: false },
                { to: '/swap',    icon: 'bi-arrow-left-right',           label: 'Swap',    primary: false },
                { to: '/buy',     icon: 'bi-credit-card',                label: 'Buy',     primary: false },
              ].map(action => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={action.primary ? 'btn-cv-primary' : 'btn-cv-secondary'}
                  style={{ flex: 1, justifyContent: 'center', minWidth: 80, fontSize: 12 }}
                >
                  <i className={`bi ${action.icon}`}></i>
                  {action.label}
                </Link>
              ))}
            </div>

            {network.isTestnet && (
              <div className="cv-alert cv-alert-warning mt-3" style={{ fontSize: 12 }}>
                <i className="bi bi-flask-fill"></i>
                <span>You're on <strong>{network.name}</strong> testnet — funds have no real-world value.</span>
              </div>
            )}
          </div>

          {/* Assets */}
          <div className="cv-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 style={{ fontWeight: 700, margin: 0 }}>Assets</h5>
              <Link to="/tokens" className="btn-cv-ghost" style={{ fontSize: 12 }}>
                Manage <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            <AssetRow
              symbol={network.currency.symbol}
              name={network.currency.name}
              balance={nativeBalance !== null ? formatBalance(nativeBalance) : '—'}
              price={nativePrice ? formatPrice(nativePrice) : null}
              color={network.color}
              loading={loading}
              hidden={hideAll}
            />

            {tokens.map(tk => (
              <AssetRow
                key={tk.id}
                symbol={tk.symbol}
                name={tk.name}
                balance={tokenBalances[tk.contract_address] != null
                  ? formatBalance(tokenBalances[tk.contract_address])
                  : tokenBalances[tk.contract_address] === null ? '—' : '…'}
                color="var(--cv-accent)"
                loading={loading}
                hidden={hideAll}
              />
            ))}

            {tokens.length === 0 && (
              <div style={{ textAlign: 'center', padding: '16px 0 4px', color: 'var(--cv-text-dim)', fontSize: 13 }}>
                No custom tokens.{' '}
                <Link to="/tokens" style={{ color: 'var(--cv-accent)' }}>Add one</Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="col-12 col-xl-4">
          {/* Network info */}
          <div className="cv-card mb-3">
            <div className="cv-label mb-2">Network</div>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: network.color, boxShadow: `0 0 6px ${network.color}` }}></div>
              <span style={{ fontWeight: 700 }}>{network.name}</span>
              {network.isTestnet && <span className="cv-badge cv-badge-warning" style={{ fontSize: 9 }}>Testnet</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--cv-text-muted)' }}>
              {[
                { label: 'Chain ID', value: network.chainId, mono: true },
                { label: 'Currency', value: network.currency.symbol },
                ...(nativePrice ? [{ label: 'Price', value: formatPrice(nativePrice) }] : []),
              ].map((row, i, arr) => (
                <div key={row.label} className="d-flex justify-content-between py-1" style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--cv-border)' : 'none' }}>
                  <span>{row.label}</span>
                  <span className={row.mono ? 'mono' : ''} style={{ fontWeight: 600, color: 'var(--cv-text)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <Link to="/settings" className="btn-cv-secondary w-100 justify-content-center mt-3" style={{ fontSize: 12 }}>
              <i className="bi bi-sliders"></i> Switch Network
            </Link>
          </div>

          {/* Wallet list */}
          <div className="cv-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="cv-label" style={{ margin: 0 }}>My Wallets</span>
              <Link to="/create-wallet" className="btn-icon" title="Create wallet">
                <i className="bi bi-plus-lg" style={{ fontSize: 13 }}></i>
              </Link>
            </div>
            <div className="d-flex flex-column gap-1">
              {wallets.map(w => (
                <div
                  key={w.id}
                  onClick={() => setActiveWallet(w)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                    borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s',
                    background: activeWallet?.id === w.id ? 'var(--cv-accent-dim)' : undefined,
                  }}
                  onMouseEnter={e => { if (activeWallet?.id !== w.id) e.currentTarget.style.background = 'var(--cv-surface-2)' }}
                  onMouseLeave={e => { if (activeWallet?.id !== w.id) e.currentTarget.style.background = '' }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cv-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cv-accent)', flexShrink: 0 }}>
                    {w.address.slice(2, 4).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className="mono" style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shortenAddress(w.address)}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>
                      {new Date(w.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {activeWallet?.id === w.id && (
                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--cv-success)', fontSize: 13 }}></i>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetRow({ symbol, name, balance, price, color, loading, hidden }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--cv-border)' }}
      className="asset-row-item">
      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)', color, flexShrink: 0 }}>
        {symbol.slice(0, 2)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{symbol}</div>
        <div style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
          {loading
            ? <span className="cv-spinner cv-spinner-sm"></span>
            : hidden
              ? '••••'
              : balance}
        </div>
        {price && !hidden && (
          <div style={{ fontSize: 11, color: 'var(--cv-text-muted)' }}>{price}</div>
        )}
      </div>
      <style>{`.asset-row-item:last-child { border-bottom: none; }`}</style>
    </div>
  )
}
