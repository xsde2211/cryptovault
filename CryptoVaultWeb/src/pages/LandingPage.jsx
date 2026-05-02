// src/pages/LandingPage.jsx
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'

const STATS = [
  { value: '100%', label: 'Non-Custodial' },
  { value: 'AES-256', label: 'Encryption' },
  { value: '3+', label: 'Chains' },
  { value: 'Open', label: 'Source' },
]

const FEATURES = [
  { icon: 'bi-key-fill',        gradient: 'linear-gradient(135deg,#7c6ff7,#4facfe)', title: 'True Self-Custody',  tag: 'Security', desc: 'BIP39 mnemonic generation with BIP44 key derivation. Private keys are AES-256 encrypted before any storage — never stored in plaintext.' },
  { icon: 'bi-broadcast',       gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', title: 'Multi-Chain Native', tag: 'Networks', desc: 'Ethereum, BNB Smart Chain, and Polygon — mainnet and testnet — all via direct RPC. No extensions or intermediaries.' },
  { icon: 'bi-arrow-left-right',gradient: 'linear-gradient(135deg,#10b981,#4facfe)', title: 'DEX Token Swaps',   tag: 'Trading',  desc: 'Swap tokens via 0x Protocol with best-price routing across all major decentralised exchanges. Powered by Permit2.' },
  { icon: 'bi-shield-lock-fill',gradient: 'linear-gradient(135deg,#a855f7,#ec4899)', title: 'Supabase Backend',  tag: 'Privacy',  desc: 'Row Level Security ensures your encrypted wallet data is only ever accessible by you. JWT authentication throughout.' },
  { icon: 'bi-coin',            gradient: 'linear-gradient(135deg,#f59e0b,#10b981)', title: 'Any ERC-20 Token',  tag: 'Tokens',   desc: 'Add any token by contract address. Real-time balances and prices fetched directly from the blockchain.' },
  { icon: 'bi-image',           gradient: 'linear-gradient(135deg,#7c6ff7,#ec4899)', title: 'NFT Portfolio',     tag: 'NFTs',     desc: 'View and manage your NFT collection across all supported chains. Powered by Alchemy API with graceful fallbacks.' },
]

const STEPS = [
  { n: '01', title: 'Create Account',   desc: 'Sign up with email. Secured by Supabase with JWT authentication and Row Level Security.' },
  { n: '02', title: 'Generate Wallet',  desc: "A BIP39 seed phrase is generated locally in your browser. Save it — it's your only key." },
  { n: '03', title: 'Send & Swap',      desc: 'Transact across Ethereum, BSC, and Polygon. Swap via 0x Protocol DEX aggregation.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const isDark = theme === 'dark'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cv-bg)',
      position: 'relative',
      overflowX: 'hidden',
      // Smooth background transition when theme changes
      transition: 'background 0.35s ease',
    }}>

      {/* ── Fixed background glows — uses CSS vars so they adapt to theme ── */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 800, borderRadius: '50%',
          background: `radial-gradient(circle, var(--lp-orb-1) 0%, transparent 65%)`,
          filter: 'blur(80px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-8%',
          width: 450, height: 450, borderRadius: '50%',
          background: `radial-gradient(circle, var(--lp-orb-2) 0%, transparent 65%)`,
          filter: 'blur(70px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `linear-gradient(var(--lp-grid) 1px, transparent 1px), linear-gradient(90deg, var(--lp-grid) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black 25%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 80% 55% at 50% 0%, black 25%, transparent 75%)',
        }} />
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        transition: 'background 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
        background:     scrolled ? (isDark ? 'rgba(5,6,8,0.88)' : 'rgba(240,242,250,0.88)') : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom:   scrolled ? '1px solid var(--cv-border)' : '1px solid transparent',
      }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, boxSizing: 'border-box' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, boxShadow: '0 4px 14px rgba(124,111,247,0.4)', flexShrink: 0 }}>
              <i className="bi bi-hexagon-fill" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--cv-text)', letterSpacing: '-0.03em', fontFamily: 'var(--font-sans)' }}>
              Crypto<span style={{ background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Vault</span>
            </span>
          </div>

          {/* Nav links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="landing-nav-links">
            {['Features', 'How it Works', 'Security'].map(label => (
              <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
                style={{ padding: '6px 14px', color: 'var(--cv-text-muted)', textDecoration: 'none', fontSize: 13.5, fontWeight: 600, borderRadius: 8, transition: 'color 0.2s ease, background 0.2s ease', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => { e.target.style.color = 'var(--cv-text)'; e.target.style.background = 'var(--cv-accent-dim)' }}
                onMouseLeave={e => { e.target.style.color = 'var(--cv-text-muted)'; e.target.style.background = 'transparent' }}>
                {label}
              </a>
            ))}
          </nav>

          {/* Right side actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{
                width: 36, height: 36, borderRadius: 9,
                background: 'var(--cv-surface-2)',
                border: '1px solid var(--cv-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--cv-text-muted)',
                fontSize: 15, transition: 'all 0.2s ease', flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--cv-accent)'; e.currentTarget.style.color = 'var(--cv-accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--cv-border)'; e.currentTarget.style.color = 'var(--cv-text-muted)' }}
            >
              <i className={`bi bi-${isDark ? 'sun' : 'moon-stars'}`} />
            </button>

            <Link to="/login"
              style={{ padding: '8px 16px', color: 'var(--cv-text-muted)', fontSize: 13.5, fontWeight: 600, border: '1px solid var(--cv-border)', borderRadius: 10, background: 'transparent', textDecoration: 'none', transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--cv-accent)'; e.target.style.color = 'var(--cv-text)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--cv-border)'; e.target.style.color = 'var(--cv-text-muted)' }}>
              Sign In
            </Link>
            <Link to="/signup"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', color: '#fff', fontSize: 13.5, fontWeight: 700, borderRadius: 10, textDecoration: 'none', boxShadow: '0 4px 16px rgba(124,111,247,0.3)', fontFamily: 'var(--font-sans)', transition: 'opacity 0.2s ease, transform 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none' }}>
              Get Started <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', zIndex: 1, paddingTop: 160, paddingBottom: 100 }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', textAlign: 'center', boxSizing: 'border-box' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--cv-accent-dim)', border: '1px solid rgba(124,111,247,0.25)', borderRadius: 100, padding: '7px 18px', fontSize: 12, fontWeight: 700, color: 'var(--cv-accent)', letterSpacing: '0.06em', marginBottom: 36, fontFamily: 'var(--font-sans)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cv-accent)', boxShadow: '0 0 8px rgba(124,111,247,0.8)', display: 'inline-block', flexShrink: 0 }} className="pulse" />
            Non-Custodial · Open Source · Multi-Chain
          </div>

          <h1 style={{ fontSize: 'clamp(44px,8vw,80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24, color: 'var(--cv-text)', fontFamily: 'var(--font-sans)', transition: 'color 0.35s ease' }}>
            The Web3 Wallet<br />
            <span style={{ background: 'linear-gradient(135deg,#7c6ff7 0%,#4facfe 50%,#00f2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Built for Builders</span>
          </h1>

          <p style={{ color: 'var(--cv-text-muted)', fontSize: 18, lineHeight: 1.7, maxWidth: 580, margin: '0 auto 48px', fontFamily: 'var(--font-sans)', transition: 'color 0.35s ease' }}>
            Production-grade decentralised wallet with BIP39/BIP44 key management, multi-chain support, and DEX swaps — running entirely in your browser.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 72 }}>
            <Link to="/signup" className="btn-lp-primary">
              <i className="bi bi-plus-circle-fill" /> Create Wallet
            </Link>
            <Link to="/login" className="btn-lp-secondary">
              <i className="bi bi-box-arrow-in-right" /> Import Existing
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', border: '1px solid var(--cv-border)', borderRadius: 18, background: 'var(--cv-surface)', overflow: 'hidden', maxWidth: 580, margin: '0 auto', transition: 'background 0.35s ease, border-color 0.35s ease' }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{ flex: 1, padding: '20px 16px', textAlign: 'center', borderRight: i < STATS.length - 1 ? '1px solid var(--cv-border)' : 'none', transition: 'border-color 0.35s ease' }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: 'var(--font-sans)' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--cv-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
          <SectionHeader tag="Features" title={<>Everything You Need<br />to Own Your Crypto</>} subtitle="Built with the same security standards used by professional traders and DeFi protocols." />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: f.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                    <i className={`bi ${f.icon}`} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', background: 'var(--cv-surface-3)', border: '1px solid var(--cv-border)', borderRadius: 100, padding: '3px 10px' }}>{f.tag}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px', fontFamily: 'var(--font-sans)', color: 'var(--cv-text)' }}>{f.title}</h3>
                <p style={{ color: 'var(--cv-text-muted)', fontSize: 13.5, lineHeight: 1.65, margin: 0, fontFamily: 'var(--font-sans)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ position: 'relative', zIndex: 1, padding: '100px 0', background: isDark ? 'linear-gradient(180deg, transparent, rgba(124,111,247,0.025) 50%, transparent)' : 'linear-gradient(180deg, transparent, rgba(96,85,232,0.025) 50%, transparent)', transition: 'background 0.35s ease' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
          <SectionHeader tag="How It Works" title={<>Up and Running<br />in 3 Steps</>} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {STEPS.map(s => (
              <div key={s.n} className="cv-card" style={{ padding: 32 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>{s.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', fontFamily: 'var(--font-sans)', color: 'var(--cv-text)' }}>{s.title}</h3>
                <p style={{ color: 'var(--cv-text-muted)', fontSize: 14, lineHeight: 1.65, margin: 0, fontFamily: 'var(--font-sans)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" style={{ position: 'relative', zIndex: 1, padding: '100px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
          <div className="cv-card" style={{ padding: '60px 60px', display: 'flex', alignItems: 'center', gap: 80, position: 'relative', overflow: 'hidden', borderColor: 'rgba(124,111,247,0.2)', flexWrap: 'wrap' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#7c6ff7,#4facfe,transparent)' }} />
            <div style={{ flex: 1, minWidth: 280 }}>
              <SectionTag>Security First</SectionTag>
              <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '16px 0 20px', lineHeight: 1.1, fontFamily: 'var(--font-sans)', color: 'var(--cv-text)' }}>Your Keys.<br />Your Crypto.</h2>
              <p style={{ color: 'var(--cv-text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
                CryptoVault never stores private keys in plaintext. Every key is AES-256 encrypted with a password only you know, stored in Supabase with Row Level Security.
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['BIP39 seed phrases generated locally', 'AES-256 private key encryption', 'Zero server-side key access', 'Supabase RLS — data visible only to you', 'No MetaMask or browser extension required'].map(item => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)', color: 'var(--cv-text)' }}>
                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--cv-success)', fontSize: 15, flexShrink: 0 }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Animated rings */}
            <div style={{ flexShrink: 0, width: 200, height: 200, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[200, 145, 90].map((sz, i) => (
                <div key={sz} style={{ position: 'absolute', width: sz, height: sz, borderRadius: '50%', border: `1px solid rgba(124,111,247,${0.15 + i * 0.08})`, animation: `spin ${20 - i * 5}s linear infinite ${i % 2 === 1 ? 'reverse' : ''}` }} />
              ))}
              <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', boxShadow: '0 8px 32px rgba(124,111,247,0.5)' }}>
                <i className="bi bi-shield-lock-fill" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 0 120px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', boxSizing: 'border-box' }}>
          <div className="cv-card" style={{ padding: '80px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', borderColor: 'rgba(124,111,247,0.2)' }}>
            <div style={{ position: 'absolute', inset: -40, background: 'radial-gradient(ellipse 80% 70% at 50% 50%, var(--cv-accent-dim) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <SectionTag style={{ position: 'relative' }}>Get Started Free</SectionTag>
            <h2 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '16px 0 18px', fontFamily: 'var(--font-sans)', position: 'relative', color: 'var(--cv-text)' }}>Own Your Financial Sovereignty</h2>
            <p style={{ color: 'var(--cv-text-muted)', fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: '0 auto 44px', fontFamily: 'var(--font-sans)', position: 'relative' }}>No credit card. No KYC. No middlemen. Just you and your keys.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap', position: 'relative' }}>
              <Link to="/signup" className="btn-lp-primary" style={{ fontSize: 16, padding: '15px 36px' }}>
                <i className="bi bi-plus-circle-fill" /> Create Free Wallet
              </Link>
              <Link to="/login" className="btn-lp-secondary" style={{ fontSize: 16, padding: '14px 30px' }}>
                <i className="bi bi-box-arrow-in-right" /> Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '28px 0', borderTop: '1px solid var(--cv-border)', transition: 'border-color 0.35s ease' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em', fontFamily: 'var(--font-sans)', color: 'var(--cv-text)' }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#7c6ff7,#4facfe)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}><i className="bi bi-hexagon-fill" /></div>
            CryptoVault
          </div>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, margin: 0, fontFamily: 'var(--font-sans)' }}>Built with ♥ · Non-custodial · Open Source</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Create Wallet', '/signup'], ['Sign In', '/login']].map(([label, to]) => (
              <Link key={to} to={to} style={{ color: 'var(--cv-text-muted)', textDecoration: 'none', fontSize: 13.5, fontWeight: 500, fontFamily: 'var(--font-sans)', transition: 'color 0.2s ease' }}
                onMouseEnter={e => e.target.style.color = 'var(--cv-accent)'}
                onMouseLeave={e => e.target.style.color = 'var(--cv-text-muted)'}>{label}</Link>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        .btn-lp-primary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 32px; background: linear-gradient(135deg,#7c6ff7,#4facfe);
          color: #fff; font-size: 16px; font-weight: 700; border-radius: 14px;
          text-decoration: none; transition: opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
          box-shadow: 0 8px 32px rgba(124,111,247,0.4); font-family: var(--font-sans);
          letter-spacing: -0.01em;
        }
        .btn-lp-primary:hover { opacity: 0.92; transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124,111,247,0.5); }

        .btn-lp-secondary {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 14px 30px;
          background: var(--cv-surface);
          color: var(--cv-text);
          font-size: 16px; font-weight: 600; border-radius: 14px;
          border: 1px solid var(--cv-border-2); text-decoration: none;
          transition: all 0.2s ease;
          font-family: var(--font-sans); letter-spacing: -0.01em;
          backdrop-filter: blur(8px);
        }
        .btn-lp-secondary:hover { background: var(--cv-surface-2); border-color: var(--cv-accent); transform: translateY(-2px); }

        .lp-feature-card {
          background: var(--cv-surface); border: 1px solid var(--cv-border);
          border-radius: 20px; padding: 28px;
          transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, background 0.3s ease;
        }
        .lp-feature-card:hover { transform: translateY(-4px); border-color: rgba(124,111,247,0.3); box-shadow: 0 16px 48px rgba(0,0,0,0.3); }

        .landing-nav-links a { letter-spacing: -0.01em; }
        @media (max-width: 768px) { .landing-nav-links { display: none; } }
        @media (max-width: 580px) {
          .btn-lp-primary, .btn-lp-secondary { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  )
}

function SectionTag({ children, style }) {
  return (
    <div style={{ display: 'inline-block', background: 'var(--cv-accent-dim)', color: 'var(--cv-accent)', border: '1px solid rgba(124,111,247,0.2)', borderRadius: 100, padding: '5px 15px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20, fontFamily: 'var(--font-sans)', ...style }}>
      {children}
    </div>
  )
}

function SectionHeader({ tag, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 64 }}>
      <SectionTag>{tag}</SectionTag>
      <h2 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--cv-text)', margin: '0 0 18px', fontFamily: 'var(--font-sans)' }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--cv-text-muted)', fontSize: 16, lineHeight: 1.7, maxWidth: 520, margin: '0 auto', fontFamily: 'var(--font-sans)' }}>{subtitle}</p>}
    </div>
  )
}