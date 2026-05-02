// src/pages/SignupPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../services/supabase/authService'

// ─── Shared auth layout ─────────────────────────────────────────────────────
export function AuthLayout({ title, subtitle, children }) {
  return (
    <>
      {/* Full page wrapper — fixed background, flex-centered content */}
      <div style={{
        position:       'fixed',
        inset:          0,
        background:     'var(--cv-bg)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         0,
        overflow:       'hidden',
      }}>
        {/* Background orb 1 */}
        <div style={{
          position:   'absolute', top: '-15%', left: '50%',
          transform:  'translateX(-50%)',
          width:      600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,111,247,0.18) 0%, transparent 65%)',
          filter:     'blur(60px)', pointerEvents: 'none',
        }} />
        {/* Background orb 2 */}
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-5%',
          width: 350, height: 350, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,172,254,0.12) 0%, transparent 65%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        {/* Grid */}
        <div style={{
          position:          'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage:   'linear-gradient(rgba(124,111,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,247,0.04) 1px, transparent 1px)',
          backgroundSize:    '48px 48px',
          WebkitMaskImage:   'radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)',
          maskImage:         'radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%)',
        }} />
      </div>

      {/* Scrollable content layer — sits on top of fixed background */}
      <div style={{
        position:       'relative',
        zIndex:         1,
        minHeight:      '100vh',
        width:          '100%',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '40px 16px',
        boxSizing:      'border-box',
      }}>
        {/* Card */}
        <div style={{ width: '100%', maxWidth: 460 }} className="auth-anim">
          <div className="cv-card" style={{
            padding:    40,
            border:     '1px solid rgba(124,111,247,0.18)',
            boxShadow:  '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,111,247,0.08)',
          }}>
            {/* Logo + header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                width:        58, height: 58,
                background:   'linear-gradient(135deg, #7c6ff7, #4facfe)',
                borderRadius: 18,
                display:      'flex', alignItems: 'center', justifyContent: 'center',
                margin:       '0 auto 14px',
                fontSize:     28, color: '#fff',
                boxShadow:    '0 10px 30px rgba(124,111,247,0.4)',
              }}>
                <i className="bi bi-hexagon-fill" />
              </div>
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                color: 'var(--cv-text-muted)', marginBottom: 10,
                textTransform: 'uppercase', fontFamily: 'var(--font-sans)',
              }}>CryptoVault</div>
              <h2 style={{
                fontWeight: 800, margin: '0 0 6px', fontSize: 26,
                letterSpacing: '-0.03em', color: 'var(--cv-text)',
                fontFamily: 'var(--font-sans)',
              }}>{title}</h2>
              <p style={{
                color: 'var(--cv-text-muted)', fontSize: 14, margin: 0,
                lineHeight: 1.5, fontFamily: 'var(--font-sans)',
              }}>{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: none; }
        }
        .auth-anim { animation: authFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .auth-footer-row {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 24px; font-size: 13.5px; color: var(--cv-text-muted);
          font-family: var(--font-sans);
        }
        .auth-footer-row a {
          color: var(--cv-accent); font-weight: 700; text-decoration: none; transition: opacity 0.15s;
        }
        .auth-footer-row a:hover { opacity: 0.75; text-decoration: underline; }
      `}</style>
    </>
  )
}

// ─── Signup page ────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      await signUp(email, password)
      setSuccess(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="We've sent you a confirmation link">
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'var(--cv-success-dim)', border: '2px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 20px',
          }}>
            <i className="bi bi-envelope-check-fill" style={{ color: 'var(--cv-success)' }} />
          </div>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Confirmation sent to <strong style={{ color: 'var(--cv-text)' }}>{email}</strong>.
            Click the link to activate your account.
          </p>
          <Link to="/login" className="btn-cv-primary w-100 justify-content-center">
            <i className="bi bi-box-arrow-in-right" /> Go to Sign In
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create Account" subtitle="Start managing your crypto today">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="cv-alert cv-alert-danger mb-4">
            <i className="bi bi-exclamation-triangle-fill" /> {error}
          </div>
        )}
        <div className="mb-3">
          <label className="cv-label">Email Address</label>
          <input type="email" className="cv-input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="cv-label">Password</label>
          <input type="password" className="cv-input" placeholder="Min. 8 characters"
            value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label className="cv-label">Confirm Password</label>
          <input type="password" className="cv-input" placeholder="Repeat your password"
            value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" className="btn-cv-primary w-100 justify-content-center"
          disabled={loading} style={{ fontSize: 15, padding: '13px 24px' }}>
          {loading
            ? <><span className="cv-spinner cv-spinner-sm" /> Creating account…</>
            : <><i className="bi bi-person-plus-fill" /> Create Account</>}
        </button>
        <div className="auth-footer-row">
          <span>Already have an account?</span>
          <Link to="/login">Sign In</Link>
        </div>
      </form>
    </AuthLayout>
  )
}