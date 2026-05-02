// src/pages/ReceivePage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getNetwork, NETWORKS } from '../utils/networks'

export default function ReceivePage() {
  const { activeWallet, activeNetwork, setActiveNetwork } = useApp()
  const toast  = useToast()
  const [copied, setCopied] = useState(false)
  const network = getNetwork(activeNetwork)

  const handleCopy = () => {
    if (!activeWallet) return
    navigator.clipboard.writeText(activeWallet.address)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2500)
  }

  const qrUrl = activeWallet
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeWallet.address)}&bgcolor=ffffff&color=000000&margin=12&qzone=1`
    : null

  if (!activeWallet) return (
    <div className="row g-3">
      <div className="col-12">
        <div className="cv-card text-center py-5">
          <div style={{ fontSize: 52, marginBottom: 12 }}>👛</div>
          <h5 style={{ fontWeight: 700 }}>No Wallet Selected</h5>
          <div className="d-flex gap-2 justify-content-center mt-3">
            <Link to="/create-wallet" className="btn-cv-primary"><i className="bi bi-plus-circle" /> Create</Link>
            <Link to="/import-wallet" className="btn-cv-secondary"><i className="bi bi-download" /> Import</Link>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="row g-3 align-items-start">
      {/* ── LEFT: QR + address ── */}
      <div className="col-12 col-lg-6">
        <div className="page-header"><h2>Receive</h2></div>

        <div className="cv-card text-center" style={{ borderColor: `${network.color}30` }}>
          {/* Network badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${network.color}15`, border: `1px solid ${network.color}40`, borderRadius: 100, padding: '5px 14px', marginBottom: 24 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: network.color, boxShadow: `0 0 6px ${network.color}`, display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: network.color }}>{network.name}</span>
            {network.isTestnet && <span className="cv-badge cv-badge-warning" style={{ fontSize: 9 }}>Testnet</span>}
          </div>

          {/* QR */}
          <div style={{ display: 'inline-flex', background: '#fff', borderRadius: 18, padding: 12, marginBottom: 24, boxShadow: `0 0 0 4px ${network.color}20, 0 8px 28px rgba(0,0,0,0.2)` }}>
            <img src={qrUrl} alt="QR" width={200} height={200} style={{ display: 'block', borderRadius: 8 }} />
          </div>

          {/* Address */}
          <div className="cv-label mb-2">Your Wallet Address</div>
          <div className="copy-box mb-3" style={{ cursor: 'pointer', textAlign: 'left' }} onClick={handleCopy}>
            <code style={{ wordBreak: 'break-all', lineHeight: 1.8, fontSize: 11 }}>{activeWallet.address}</code>
            <button className="btn-cv-ghost p-1 flex-shrink-0" style={{ color: copied ? 'var(--cv-success)' : undefined }}>
              <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`} />
            </button>
          </div>

          {copied && (
            <div className="cv-badge cv-badge-success mb-3 fade-in">
              <i className="bi bi-check-circle-fill me-1" /> Copied to clipboard!
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-cv-primary" style={{ flex: 1, justifyContent: 'center', padding: '11px' }} onClick={handleCopy}>
              <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`} /> {copied ? 'Copied!' : 'Copy Address'}
            </button>
            <button className="btn-cv-secondary" style={{ padding: '11px 14px' }}
              onClick={() => { const el = document.querySelector('img[alt="QR"]'); if (el) { const link = document.createElement('a'); link.href = el.src; link.download = 'wallet-qr.png'; link.click() } }}>
              <i className="bi bi-download" />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Network selector + tips ── */}
      <div className="col-12 col-lg-6">
        <div style={{ height: 52 }} /> {/* align with page-header */}

        {/* Network selector */}
        <div className="cv-card mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)', marginBottom: 14 }}>Receive On Network</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {Object.values(NETWORKS).map(n => (
              <button key={n.id} onClick={() => setActiveNetwork(n.id)} style={{
                padding: '10px 12px', borderRadius: 11, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${activeNetwork === n.id ? n.color : 'var(--cv-border)'}`,
                background: activeNetwork === n.id ? `${n.color}12` : 'var(--cv-surface-2)',
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, flexShrink: 0, boxShadow: activeNetwork === n.id ? `0 0 5px ${n.color}` : 'none' }} />
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: activeNetwork === n.id ? n.color : 'var(--cv-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</div>
                  {n.isTestnet && <div style={{ fontSize: 9, color: 'var(--cv-warning)', fontWeight: 700 }}>TESTNET</div>}
                </div>
                {activeNetwork === n.id && <i className="bi bi-check-circle-fill" style={{ color: n.color, fontSize: 11, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Safety tips */}
        <div className="cv-card mb-3">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)', marginBottom: 14 }}>Before You Share</div>
          {[
            { icon: 'bi-check2-circle', color: 'var(--cv-success)', text: `Only share on ${network.name} — sending from another chain may be lost` },
            { icon: 'bi-check2-circle', color: 'var(--cv-success)', text: `Compatible with ${network.currency.symbol} and any ERC-20 token on ${network.name}` },
            { icon: 'bi-exclamation-triangle-fill', color: 'var(--cv-warning)', text: 'Cross-chain deposits without bridging are unrecoverable' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 10 : 0 }}>
              <i className={`bi ${t.icon}`} style={{ color: t.color, flexShrink: 0, marginTop: 2, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: 'var(--cv-text-muted)', lineHeight: 1.5 }}>{t.text}</span>
            </div>
          ))}
        </div>

        {/* Share link */}
        <div className="cv-card">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-muted)', marginBottom: 10 }}>Request Payment</div>
          <p style={{ fontSize: 12, color: 'var(--cv-text-muted)', marginBottom: 12 }}>Share this deep link so anyone can pre-fill your address in their wallet app.</p>
          <div className="copy-box" style={{ cursor: 'pointer' }}
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/send?to=${activeWallet?.address}`); toast.success('Link copied!') }}>
            <code style={{ fontSize: 10, color: 'var(--cv-text-muted)' }}>{window.location.origin}/send?to={activeWallet?.address?.slice(0, 16)}…</code>
            <i className="bi bi-link-45deg" style={{ color: 'var(--cv-accent)', flexShrink: 0 }} />
          </div>
        </div>
      </div>
    </div>
  )
}