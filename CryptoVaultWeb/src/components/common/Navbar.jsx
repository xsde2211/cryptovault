// src/components/common/Navbar.jsx
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { signOut } from '../../services/supabase/authService'
import { NETWORKS } from '../../utils/networks'
import { shortenAddress } from '../../services/blockchain/walletService'

export default function Navbar() {
  const { user, activeWallet, activeNetwork, setActiveNetwork, wallets, setActiveWallet } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)

  const network = NETWORKS[activeNetwork]

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/')
    } catch (e) {
      console.error(e)
    } finally {
      setLoggingOut(false)
    }
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <nav className="cv-navbar">
      <div className="container-fluid px-4">
        <div className="d-flex align-items-center justify-content-between w-100">
          {/* Logo */}
          <Link to="/dashboard" className="cv-logo text-decoration-none d-flex align-items-center gap-2">
            <div className="cv-logo-icon">
              <i className="bi bi-hexagon-fill"></i>
            </div>
            <span>CryptoVault</span>
          </Link>

          {/* Nav links */}
          <div className="cv-nav-links d-none d-lg-flex gap-1">
            <Link to="/dashboard" className={`cv-nav-link ${isActive('/dashboard')}`}>
              <i className="bi bi-grid-1x2"></i> Dashboard
            </Link>
            <Link to="/send" className={`cv-nav-link ${isActive('/send')}`}>
              <i className="bi bi-arrow-up-right"></i> Send
            </Link>
            <Link to="/receive" className={`cv-nav-link ${isActive('/receive')}`}>
              <i className="bi bi-arrow-down-left"></i> Receive
            </Link>
            <Link to="/tokens" className={`cv-nav-link ${isActive('/tokens')}`}>
              <i className="bi bi-coin"></i> Tokens
            </Link>
            <Link to="/transactions" className={`cv-nav-link ${isActive('/transactions')}`}>
              <i className="bi bi-list-ul"></i> History
            </Link>
          </div>

          {/* Right side */}
          <div className="d-flex align-items-center gap-2">
            {/* Network selector */}
            <div className="dropdown">
              <button
                className="network-pill"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span
                  className="network-dot"
                  style={{ background: network?.color }}
                ></span>
                <span className="d-none d-sm-inline">{network?.name}</span>
                {network?.isTestnet && <span className="cv-badge cv-badge-warning ms-1">Test</span>}
              </button>
              <ul className="dropdown-menu dropdown-menu-end cv-dropdown">
                <li><h6 className="dropdown-header text-uppercase" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--cv-text-muted)' }}>Mainnet</h6></li>
                {Object.values(NETWORKS).filter(n => !n.isTestnet).map(n => (
                  <li key={n.id}>
                    <button
                      className={`dropdown-item cv-dropdown-item ${activeNetwork === n.id ? 'active' : ''}`}
                      onClick={() => setActiveNetwork(n.id)}
                    >
                      <span style={{ color: n.color }}>{n.icon}</span> {n.name}
                    </button>
                  </li>
                ))}
                <li><hr className="dropdown-divider" style={{ borderColor: 'var(--cv-border)' }} /></li>
                <li><h6 className="dropdown-header text-uppercase" style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--cv-text-muted)' }}>Testnet</h6></li>
                {Object.values(NETWORKS).filter(n => n.isTestnet).map(n => (
                  <li key={n.id}>
                    <button
                      className={`dropdown-item cv-dropdown-item ${activeNetwork === n.id ? 'active' : ''}`}
                      onClick={() => setActiveNetwork(n.id)}
                    >
                      <span style={{ color: n.color }}>{n.icon}</span> {n.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Wallet selector */}
            {wallets.length > 0 && (
              <div className="dropdown">
                <button className="cv-wallet-pill" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="bi bi-wallet2"></i>
                  <span className="d-none d-sm-inline mono" style={{ fontSize: 12 }}>
                    {activeWallet ? shortenAddress(activeWallet.address) : 'Select Wallet'}
                  </span>
                  <i className="bi bi-chevron-down" style={{ fontSize: 10 }}></i>
                </button>
                <ul className="dropdown-menu dropdown-menu-end cv-dropdown">
                  {wallets.map((w) => (
                    <li key={w.id}>
                      <button
                        className={`dropdown-item cv-dropdown-item ${activeWallet?.id === w.id ? 'active' : ''}`}
                        onClick={() => setActiveWallet(w)}
                      >
                        <i className="bi bi-circle-fill me-2" style={{ fontSize: 6, color: 'var(--cv-success)' }}></i>
                        <span className="mono" style={{ fontSize: 12 }}>{shortenAddress(w.address)}</span>
                      </button>
                    </li>
                  ))}
                  <li><hr className="dropdown-divider" style={{ borderColor: 'var(--cv-border)' }} /></li>
                  <li>
                    <Link className="dropdown-item cv-dropdown-item" to="/create-wallet">
                      <i className="bi bi-plus-circle me-2"></i> New Wallet
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item cv-dropdown-item" to="/import-wallet">
                      <i className="bi bi-download me-2"></i> Import Wallet
                    </Link>
                  </li>
                </ul>
              </div>
            )}

            {/* Settings + logout */}
            <div className="dropdown">
              <button className="btn-cv-ghost p-2" data-bs-toggle="dropdown">
                <i className="bi bi-person-circle" style={{ fontSize: 18 }}></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end cv-dropdown">
                <li>
                  <div className="px-3 py-2" style={{ fontSize: 12, color: 'var(--cv-text-muted)' }}>
                    {user?.email}
                  </div>
                </li>
                <li><hr className="dropdown-divider" style={{ borderColor: 'var(--cv-border)' }} /></li>
                <li>
                  <Link className="dropdown-item cv-dropdown-item" to="/settings">
                    <i className="bi bi-gear me-2"></i> Settings
                  </Link>
                </li>
                <li>
                  <button
                    className="dropdown-item cv-dropdown-item text-danger"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    {loggingOut ? 'Signing out…' : 'Sign Out'}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .cv-navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(10, 11, 15, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--cv-border);
          height: 60px;
          display: flex;
          align-items: center;
        }
        .cv-logo {
          font-family: var(--font-sans);
          font-size: 18px;
          font-weight: 800;
          color: var(--cv-text) !important;
          letter-spacing: -0.01em;
        }
        .cv-logo-icon {
          color: var(--cv-accent);
          font-size: 20px;
          line-height: 1;
        }
        .cv-nav-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          color: var(--cv-text-muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          transition: color 0.2s, background 0.2s;
        }
        .cv-nav-link:hover, .cv-nav-link.active {
          color: var(--cv-text);
          background: var(--cv-surface-2);
        }
        .cv-nav-link.active { color: var(--cv-accent); }
        .cv-wallet-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--cv-surface-2);
          border: 1px solid var(--cv-border);
          border-radius: var(--radius-md);
          padding: 5px 10px;
          color: var(--cv-text);
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .cv-wallet-pill:hover { border-color: var(--cv-accent); }
        .cv-dropdown {
          background: var(--cv-surface);
          border: 1px solid var(--cv-border-2);
          border-radius: var(--radius-md);
          padding: 6px;
          min-width: 200px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
        }
        .cv-dropdown-item {
          border-radius: var(--radius-sm);
          color: var(--cv-text-muted) !important;
          font-size: 13px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .cv-dropdown-item:hover { background: var(--cv-surface-2) !important; color: var(--cv-text) !important; }
        .cv-dropdown-item.active { color: var(--cv-accent) !important; background: var(--cv-accent-dim) !important; }
        .cv-dropdown-item.text-danger { color: var(--cv-danger) !important; }
      `}</style>
    </nav>
  )
}
