// src/components/common/Sidebar.jsx
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'
import { signOut } from '../../services/supabase/authService'
import { NETWORKS } from '../../utils/networks'
import { shortenAddress } from '../../services/blockchain/walletService'

const NAV_MAIN = [
  { to: '/dashboard',    icon: 'bi-grid-1x2-fill',    label: 'Dashboard' },
  { to: '/send',         icon: 'bi-arrow-up-right',   label: 'Send' },
  { to: '/receive',      icon: 'bi-arrow-down-left',  label: 'Receive' },
  { to: '/swap',         icon: 'bi-arrow-left-right', label: 'Swap' },
  { to: '/buy',          icon: 'bi-credit-card-fill', label: 'Buy Crypto' },
]
const NAV_ASSETS = [
  { to: '/tokens',       icon: 'bi-coin',             label: 'Tokens' },
  { to: '/nft',          icon: 'bi-image',            label: 'NFTs' },
  { to: '/watchlist',    icon: 'bi-star-fill',        label: 'Watchlist' },
  { to: '/transactions', icon: 'bi-list-ul',          label: 'History' },
]
const NAV_SETTINGS = [
  { to: '/wallet-address', icon: 'bi-qr-code',              label: 'My Address' },
  { to: '/settings',       icon: 'bi-gear-fill',            label: 'Settings' },
  { to: '/preferences',    icon: 'bi-sliders',              label: 'Preferences' },
  { to: '/about',          icon: 'bi-info-circle-fill',     label: 'About' },
]

export default function Sidebar() {
  const { user, activeWallet, activeNetwork, wallets, setActiveWallet, setActiveNetwork } = useApp()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [signingOut,    setSigningOut]    = useState(false)
  const [showNetworks,  setShowNetworks]  = useState(false)
  const [showWallets,   setShowWallets]   = useState(false)   // ← pure React, no Bootstrap JS
  const walletDropRef = useRef(null)

  const network = NETWORKS[activeNetwork]

  // Close wallet dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (walletDropRef.current && !walletDropRef.current.contains(e.target)) {
        setShowWallets(false)
      }
    }
    if (showWallets) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showWallets])

  const handleLogout = async () => {
    setSigningOut(true)
    try { await signOut(); navigate('/') } catch {} finally { setSigningOut(false) }
  }

  const handleSelectWallet = (w) => {
    setActiveWallet(w)
    setShowWallets(false)
  }

  return (
    <aside className="cv-sidebar">
      {/* Logo */}
      <Link to="/dashboard" className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <i className="bi bi-hexagon-fill" />
        </div>
        <span className="sidebar-logo-text">Crypto<span>Vault</span></span>
      </Link>

      {/* Wallet card */}
      {activeWallet && (
        <div style={{ padding: '8px 10px 4px' }}>
          <div className="sidebar-wallet-card">
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', marginBottom: 8 }}>
              Active Wallet
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(124,111,247,0.3), rgba(79,172,254,0.2))',
                border: '1px solid rgba(124,111,247,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, fontFamily: 'var(--font-mono)',
                color: 'var(--cv-accent)',
              }}>
                {activeWallet.address.slice(2, 4).toUpperCase()}
              </div>
              {/* Address */}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div className="mono" style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cv-text)' }}>
                  {shortenAddress(activeWallet.address)}
                </div>
              </div>
              {/* Pure React wallet picker — no Bootstrap JS needed */}
              {wallets.length > 1 && (
                <div ref={walletDropRef} style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onClick={() => setShowWallets(v => !v)}
                    style={{
                      width: 24, height: 24, borderRadius: 6, fontSize: 10,
                      background: 'var(--cv-surface-3)', border: '1px solid var(--cv-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: 'var(--cv-text-muted)', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cv-accent)'; e.currentTarget.style.color = 'var(--cv-accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cv-border)'; e.currentTarget.style.color = 'var(--cv-text-muted)' }}
                  >
                    <i className="bi bi-chevron-down" style={{ fontSize: 9 }} />
                  </button>

                  {showWallets && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: 'var(--cv-surface)',
                      border: '1px solid var(--cv-border-2)',
                      borderRadius: 12, padding: 6,
                      minWidth: 190, zIndex: 200,
                      boxShadow: 'var(--shadow-lg)',
                      animation: 'fadeIn 0.15s ease',
                    }}>
                      {wallets.map(w => (
                        <button
                          key={w.id}
                          onClick={() => handleSelectWallet(w)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 10px', borderRadius: 8, border: 'none',
                            background: activeWallet?.id === w.id ? 'var(--cv-accent-dim)' : 'transparent',
                            color: activeWallet?.id === w.id ? 'var(--cv-accent)' : 'var(--cv-text-muted)',
                            cursor: 'pointer', fontSize: 12, transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => { if (activeWallet?.id !== w.id) e.currentTarget.style.background = 'var(--cv-surface-2)' }}
                          onMouseLeave={e => { if (activeWallet?.id !== w.id) e.currentTarget.style.background = 'transparent' }}
                        >
                          <i className="bi bi-circle-fill" style={{ fontSize: 5, color: activeWallet?.id === w.id ? 'var(--cv-success)' : 'var(--cv-text-dim)', flexShrink: 0 }} />
                          <span className="mono" style={{ fontSize: 11 }}>{shortenAddress(w.address)}</span>
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid var(--cv-border)', margin: '4px 0' }} />
                      <Link
                        to="/create-wallet"
                        onClick={() => setShowWallets(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: 'var(--cv-text-muted)', textDecoration: 'none', fontSize: 12, transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cv-surface-2)'; e.currentTarget.style.color = 'var(--cv-text)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv-text-muted)' }}
                      >
                        <i className="bi bi-plus-circle" /> New Wallet
                      </Link>
                      <Link
                        to="/import-wallet"
                        onClick={() => setShowWallets(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: 'var(--cv-text-muted)', textDecoration: 'none', fontSize: 12, transition: 'all 0.15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cv-surface-2)'; e.currentTarget.style.color = 'var(--cv-text)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--cv-text-muted)' }}
                      >
                        <i className="bi bi-download" /> Import Wallet
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network selector */}
      <div style={{ padding: '4px 10px 6px' }}>
        <button
          className="sidebar-nav-item"
          onClick={() => setShowNetworks(v => !v)}
          style={{ justifyContent: 'space-between', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: network?.color, boxShadow: `0 0 6px ${network?.color}`, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cv-text)' }}>{network?.name}</span>
            {network?.isTestnet && <span className="cv-badge cv-badge-warning" style={{ fontSize: 9, padding: '2px 6px' }}>Test</span>}
          </div>
          <i className={`bi bi-chevron-${showNetworks ? 'up' : 'down'}`} style={{ fontSize: 10, color: 'var(--cv-text-dim)', transition: 'transform 0.2s ease' }} />
        </button>
        {showNetworks && (
          <div style={{ paddingBottom: 4, paddingTop: 2, animation: 'fadeIn 0.15s ease' }}>
            {Object.values(NETWORKS).map(n => (
              <button
                key={n.id}
                className={`sidebar-nav-item ${activeNetwork === n.id ? 'active' : ''}`}
                onClick={() => { setActiveNetwork(n.id); setShowNetworks(false) }}
                style={{ fontSize: 12, padding: '7px 12px', width: '100%' }}
              >
                <span style={{ color: n.color, fontSize: 14 }}>{n.icon}</span>
                {n.name}
                {n.isTestnet && <span className="cv-badge cv-badge-warning" style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px' }}>T</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main navigation */}
      <div className="sidebar-section-label">Main</div>
      {NAV_MAIN.map(item => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
          <i className={`bi ${item.icon}`} />
          {item.label}
        </NavLink>
      ))}

      <div className="sidebar-section-label">Assets</div>
      {NAV_ASSETS.map(item => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
          <i className={`bi ${item.icon}`} />
          {item.label}
        </NavLink>
      ))}

      <div className="sidebar-section-label">Account</div>
      {NAV_SETTINGS.map(item => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}>
          <i className={`bi ${item.icon}`} />
          {item.label}
        </NavLink>
      ))}

      {/* Footer — theme toggle + sign out */}
      <div className="sidebar-footer">
        <button className="sidebar-nav-item" onClick={toggleTheme} style={{ width: '100%' }}>
          <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          className="sidebar-nav-item"
          onClick={handleLogout}
          disabled={signingOut}
          style={{ width: '100%', color: 'var(--cv-danger)', opacity: signingOut ? 0.5 : 1 }}
        >
          <i className="bi bi-box-arrow-right" />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
        {user?.email && (
          <div style={{ fontSize: 11, color: 'var(--cv-text-dim)', padding: '8px 14px 2px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {user.email.length > 26 ? user.email.slice(0, 23) + '…' : user.email}
          </div>
        )}
      </div>
    </aside>
  )
}