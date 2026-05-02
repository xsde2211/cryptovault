// src/pages/SettingsPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { NETWORKS } from '../utils/networks'
import { deleteWallet } from '../services/supabase/walletDbService'
import { shortenAddress } from '../services/blockchain/walletService'

export default function SettingsPage() {
  const { activeNetwork, setActiveNetwork, wallets, activeWallet, setActiveWallet, loadWallets, user } = useApp()
  const toast = useToast()
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const mainnets = Object.values(NETWORKS).filter(n => !n.isTestnet)
  const testnets = Object.values(NETWORKS).filter(n => n.isTestnet)

  const handleDeleteWallet = async (wallet) => {
    if (deleteConfirm !== wallet.id) { setDeleteConfirm(wallet.id); return }
    setDeleting(true)
    try {
      await deleteWallet(wallet.id)
      await loadWallets()
      if (activeWallet?.id === wallet.id) setActiveWallet(null)
      setDeleteConfirm(null)
      toast.success('Wallet removed successfully')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleNetworkSelect = (id) => {
    setActiveNetwork(id)
    toast.success(`Switched to ${NETWORKS[id]?.name}`)
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header"><h2>Settings</h2></div>

      {/* Account */}
      <div className="cv-card mb-4">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Account</h5>
        <div className="d-flex align-items-center gap-3">
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--cv-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cv-accent)', fontWeight: 800, fontSize: 18 }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--cv-text-dim)' }}>Supabase Auth — JWT secured</div>
          </div>
        </div>
        <hr className="cv-divider" />
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/preferences" className="btn-cv-secondary" style={{ fontSize: 13 }}>
            <i className="bi bi-sliders"></i> Preferences
          </Link>
          <Link to="/wallet-address" className="btn-cv-secondary" style={{ fontSize: 13 }}>
            <i className="bi bi-qr-code"></i> My Address
          </Link>
          <Link to="/about" className="btn-cv-secondary" style={{ fontSize: 13 }}>
            <i className="bi bi-info-circle"></i> About
          </Link>
        </div>
      </div>

      {/* Network */}
      <div className="cv-card mb-4">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Network</h5>
        <div className="mb-3">
          <div className="cv-label">Mainnet</div>
          <div className="d-flex flex-column gap-2">
            {mainnets.map(n => (
              <NetworkOption key={n.id} network={n} active={activeNetwork === n.id} onSelect={handleNetworkSelect} />
            ))}
          </div>
        </div>
        <div>
          <div className="cv-label">Testnet</div>
          <div className="d-flex flex-column gap-2">
            {testnets.map(n => (
              <NetworkOption key={n.id} network={n} active={activeNetwork === n.id} onSelect={handleNetworkSelect} />
            ))}
          </div>
        </div>
      </div>

      {/* Wallets */}
      <div className="cv-card mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 style={{ fontWeight: 800, margin: 0 }}>Wallets</h5>
          <div className="d-flex gap-2">
            <Link to="/create-wallet" className="btn-cv-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
              <i className="bi bi-plus-circle"></i> New
            </Link>
            <Link to="/import-wallet" className="btn-cv-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
              <i className="bi bi-download"></i> Import
            </Link>
          </div>
        </div>
        {wallets.length === 0 ? (
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>No wallets configured.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {wallets.map(w => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: 'var(--cv-surface-2)', borderRadius: 12,
                border: `1px solid ${activeWallet?.id === w.id ? 'var(--cv-accent)' : 'var(--cv-border)'}`,
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: activeWallet?.id === w.id ? 'var(--cv-accent-dim)' : 'var(--cv-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11, color: 'var(--cv-accent)', flexShrink: 0 }}>
                  {w.address.slice(2, 4).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{shortenAddress(w.address)}</div>
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>Added {new Date(w.created_at).toLocaleDateString()}</div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {activeWallet?.id === w.id
                    ? <span className="cv-badge cv-badge-success">Active</span>
                    : <button className="btn-cv-secondary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => setActiveWallet(w)}>Select</button>
                  }
                  <button
                    className="btn-cv-ghost p-1"
                    style={{ color: deleteConfirm === w.id ? 'var(--cv-danger)' : 'var(--cv-text-dim)' }}
                    onClick={() => handleDeleteWallet(w)}
                    disabled={deleting}
                    title={deleteConfirm === w.id ? 'Click again to confirm deletion' : 'Remove wallet'}
                  >
                    <i className="bi bi-trash3"></i>
                    {deleteConfirm === w.id && <span style={{ fontSize: 10, marginLeft: 4 }}>Confirm?</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="cv-alert cv-alert-warning mt-3">
          <i className="bi bi-exclamation-triangle-fill"></i>
          <span style={{ fontSize: 12 }}>Removing a wallet only removes it from this app. Your funds remain on-chain. Ensure you have your seed phrase saved.</span>
        </div>
      </div>

      {/* Security info */}
      <div className="cv-card">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Security</h5>
        <div className="d-flex flex-column gap-3">
          {[
            { icon: 'bi-shield-lock-fill', color: 'var(--cv-success)', label: 'AES-256 Encryption', desc: 'Private keys encrypted before storage' },
            { icon: 'bi-key-fill',          color: 'var(--cv-accent)',  label: 'PBKDF2 Key Derivation', desc: '10,000 iterations, SHA-256' },
            { icon: 'bi-person-lock',       color: 'var(--cv-info)',    label: 'Row Level Security', desc: 'Supabase RLS — data isolated per user' },
            { icon: 'bi-incognito',         color: 'var(--cv-warning)', label: 'Zero Knowledge', desc: 'Raw private keys never leave your device' },
          ].map(item => (
            <div key={item.label} className="d-flex align-items-start gap-3">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, fontSize: 14, flexShrink: 0 }}>
                <i className={`bi ${item.icon}`}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--cv-text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NetworkOption({ network, active, onSelect }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 11,
        background: active ? `${network.color}12` : 'var(--cv-surface-2)',
        border: `1px solid ${active ? network.color : 'var(--cv-border)'}`,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onClick={() => onSelect(network.id)}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: network.color, flexShrink: 0, boxShadow: active ? `0 0 8px ${network.color}` : 'none' }}></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{network.name}</div>
        <div style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}>Chain ID: {network.chainId} · {network.currency.symbol}</div>
      </div>
      {active && <i className="bi bi-check-circle-fill" style={{ color: network.color }}></i>}
    </div>
  )
}
