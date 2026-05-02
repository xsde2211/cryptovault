// src/pages/AboutPage.jsx
export default function AboutPage() {
  const version = '2.0.0'
  const links = [
    { label: 'GitHub Repository',    href: 'https://github.com',          icon: 'bi-github' },
    { label: 'Documentation',        href: '#',                           icon: 'bi-book' },
    { label: 'Report a Bug',         href: 'https://github.com/issues',   icon: 'bi-bug' },
    { label: 'Supabase Dashboard',   href: 'https://supabase.com',        icon: 'bi-database' },
  ]
  const techStack = [
    { name: 'React + Vite',        desc: 'Frontend framework',        color: '#61DAFB' },
    { name: 'ethers.js v6',        desc: 'Blockchain interaction',    color: '#627EEA' },
    { name: 'Supabase',            desc: 'Backend & Auth',            color: '#3ECF8E' },
    { name: '0x Protocol',         desc: 'Token swaps',              color: '#ffffff' },
    { name: 'CoinGecko',           desc: 'Price data',               color: '#8DC63F' },
    { name: 'Bootstrap 5',         desc: 'UI framework',             color: '#7952B3' },
  ]
  return (
    <div style={{ maxWidth: 580 }}>
      <div className="page-header"><h2>About</h2></div>

      {/* Hero */}
      <div className="cv-card mb-4 text-center" style={{ background: 'linear-gradient(135deg, var(--cv-surface) 0%, rgba(108,99,255,0.05) 100%)' }}>
        <div style={{ width: 60, height: 60, background: 'var(--cv-accent-dim)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: 'var(--cv-accent)' }}>
          <i className="bi bi-hexagon-fill"></i>
        </div>
        <h4 style={{ fontWeight: 800 }}>CryptoVault</h4>
        <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 12 }}>
          A production-ready, self-custody multi-chain crypto wallet.
          <br/>No MetaMask. No WalletConnect. Your keys, your crypto.
        </p>
        <div className="d-flex justify-content-center gap-2">
          <span className="cv-badge cv-badge-accent">v{version}</span>
          <span className="cv-badge cv-badge-success">Open Source</span>
          <span className="cv-badge cv-badge-muted">MIT License</span>
        </div>
      </div>

      {/* Features summary */}
      <div className="cv-card mb-4">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Features</h5>
        {[
          { icon: 'bi-key-fill',          text: 'BIP39/BIP44 key generation — seed phrase never stored' },
          { icon: 'bi-shield-lock-fill',   text: 'AES-256 encrypted private key storage in Supabase' },
          { icon: 'bi-broadcast',          text: 'Multi-chain: Ethereum, BSC, Polygon (mainnet + testnet)' },
          { icon: 'bi-arrow-left-right',   text: 'Token swap via 0x Protocol (aggregated DEX routing)' },
          { icon: 'bi-credit-card',        text: 'Fiat on-ramp via MoonPay, Transak, and Ramp Network' },
          { icon: 'bi-star-fill',          text: 'Token watchlist with live CoinGecko prices' },
          { icon: 'bi-image',              text: 'NFT gallery via Alchemy + Moralis APIs' },
          { icon: 'bi-moon-stars-fill',    text: 'Dark and Light mode with instant toggle' },
        ].map((f, i) => (
          <div key={i} className="d-flex align-items-start gap-3 py-2" style={{ borderBottom: i < 7 ? '1px solid var(--cv-border)' : 'none' }}>
            <i className={`bi ${f.icon}`} style={{ color: 'var(--cv-accent)', marginTop: 2, fontSize: 14, width: 16, flexShrink: 0 }}></i>
            <span style={{ fontSize: 13 }}>{f.text}</span>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div className="cv-card mb-4">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Technology Stack</h5>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {techStack.map(t => (
            <div key={t.name} style={{ background: 'var(--cv-surface-2)', border: '1px solid var(--cv-border)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }}></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="cv-card">
        <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Resources</h5>
        <div className="d-flex flex-column gap-2">
          {links.map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--cv-surface-2)', border: '1px solid var(--cv-border)', textDecoration: 'none', color: 'var(--cv-text)', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cv-accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cv-border)'}
            >
              <i className={`bi ${l.icon}`} style={{ color: 'var(--cv-accent)' }}></i>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{l.label}</span>
              <i className="bi bi-arrow-up-right ms-auto" style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}></i>
            </a>
          ))}
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--cv-text-dim)', fontSize: 12, marginTop: 24 }}>
        Built with ♥ — Not financial advice. Use at your own risk.
      </p>
    </div>
  )
}
