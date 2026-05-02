// src/pages/WalletAddressPage.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getNetwork, getExplorerAddressUrl, NETWORKS } from '../utils/networks'
import { shortenAddress } from '../services/blockchain/walletService'

export default function WalletAddressPage() {
  const { activeWallet, wallets, setActiveWallet, activeNetwork, setActiveNetwork } = useApp()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const network = getNetwork(activeNetwork)

  const handleCopy = () => {
    if (!activeWallet) return
    navigator.clipboard.writeText(activeWallet.address)
    setCopied(true)
    toast.success('Address copied to clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  const qrUrl = activeWallet
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeWallet.address)}&bgcolor=ffffff&color=000000&margin=10`
    : null

  if (!activeWallet) {
    return (
      <div className="cv-card text-center py-5" style={{ maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👛</div>
        <h5 style={{ fontWeight: 700 }}>No wallet selected</h5>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <Link to="/create-wallet" className="btn-cv-primary"><i className="bi bi-plus-circle"></i> Create</Link>
          <Link to="/import-wallet" className="btn-cv-secondary"><i className="bi bi-download"></i> Import</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="page-header"><h2>My Address</h2></div>

      {/* Main card */}
      <div className="cv-card mb-4 text-center">
        {/* Network badge */}
        <div className="d-flex justify-content-center mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--cv-surface-2)', border: '1px solid var(--cv-border)', borderRadius: 100, padding: '6px 16px' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: network.color, boxShadow: `0 0 8px ${network.color}`, display: 'inline-block' }}></span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{network.name}</span>
            {network.isTestnet && <span className="cv-badge cv-badge-warning" style={{ fontSize: 9 }}>Testnet</span>}
          </div>
        </div>

        {/* QR Code */}
        <div style={{ display: 'inline-block', background: '#fff', borderRadius: 16, padding: 12, marginBottom: 24, boxShadow: `0 0 0 4px var(--cv-border), 0 8px 32px rgba(0,0,0,0.2)` }}>
          <img
            src={qrUrl}
            alt="Wallet QR Code"
            width={180} height={180}
            style={{ display: 'block', borderRadius: 8 }}
          />
        </div>

        {/* Address display */}
        <div className="cv-label mb-2">Wallet Address</div>
        <div className="copy-box mb-2" style={{ cursor: 'pointer' }} onClick={handleCopy}>
          <code style={{ wordBreak: 'break-all', lineHeight: 1.8 }}>
            {activeWallet.address}
          </code>
          <button
            className="btn-cv-ghost p-1 flex-shrink-0"
            style={{ color: copied ? 'var(--cv-success)' : undefined }}
            title="Copy address"
          >
            <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
          </button>
        </div>

        {copied && (
          <div className="cv-badge cv-badge-success mb-3 fade-in">
            <i className="bi bi-check-circle-fill me-1"></i> Copied!
          </div>
        )}

        {/* Action buttons */}
        <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
          <button className="btn-cv-primary" onClick={handleCopy}>
            <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <a
            href={getExplorerAddressUrl(activeNetwork, activeWallet.address)}
            target="_blank"
            rel="noreferrer"
            className="btn-cv-secondary"
          >
            <i className="bi bi-box-arrow-up-right"></i> Explorer
          </a>
        </div>

        {/* Warning */}
        <div className="cv-alert cv-alert-warning text-start mt-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <div style={{ fontSize: 12 }}>
            Only send <strong>{network.currency.symbol}</strong> and compatible ERC-20 tokens to this address.
            Sending assets from the wrong chain may result in <strong>permanent loss</strong>.
          </div>
        </div>
      </div>

      {/* Network switcher */}
      <div className="cv-card mb-4">
        <div className="cv-label mb-3">Switch Network</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {Object.values(NETWORKS).map(n => (
            <button
              key={n.id}
              onClick={() => setActiveNetwork(n.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${activeNetwork === n.id ? n.color : 'var(--cv-border)'}`,
                background: activeNetwork === n.id ? `${n.color}18` : 'var(--cv-surface-2)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0, boxShadow: activeNetwork === n.id ? `0 0 6px ${n.color}` : 'none' }}></span>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: activeNetwork === n.id ? n.color : 'var(--cv-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</div>
                {n.isTestnet && <div style={{ fontSize: 9, color: 'var(--cv-warning)', fontWeight: 700 }}>TESTNET</div>}
              </div>
              {activeNetwork === n.id && <i className="bi bi-check-circle-fill" style={{ color: n.color, fontSize: 12 }}></i>}
            </button>
          ))}
        </div>
      </div>

      {/* All wallets */}
      {wallets.length > 1 && (
        <div className="cv-card">
          <div className="cv-label mb-3">Switch Wallet</div>
          <div className="d-flex flex-column gap-2">
            {wallets.map(w => (
              <div
                key={w.id}
                className="d-flex align-items-center gap-3 p-3"
                style={{
                  borderRadius: 10,
                  border: `1px solid ${activeWallet?.id === w.id ? 'var(--cv-accent)' : 'var(--cv-border)'}`,
                  background: activeWallet?.id === w.id ? 'var(--cv-accent-dim)' : 'var(--cv-surface-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onClick={() => setActiveWallet(w)}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--cv-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11, color: 'var(--cv-accent)', flexShrink: 0 }}>
                  {w.address.slice(2, 4).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{shortenAddress(w.address)}</div>
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>Added {new Date(w.created_at).toLocaleDateString()}</div>
                </div>
                {activeWallet?.id === w.id && <i className="bi bi-check-circle-fill" style={{ color: 'var(--cv-accent)' }}></i>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
