// src/pages/CreateWalletPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateWallet } from '../services/blockchain/walletService'
import { encryptPrivateKey } from '../utils/encryption'
import { saveWallet } from '../services/supabase/walletDbService'
import { useApp } from '../context/AppContext'

const STEPS = ['Generate', 'Backup Seed', 'Verify', 'Secure']

export default function CreateWalletPage() {
  const [step, setStep] = useState(0)
  const [walletData, setWalletData] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verifyWords, setVerifyWords] = useState({})
  const [verifyIndices, setVerifyIndices] = useState([])
  const [seedRevealed, setSeedRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { loadWallets, activeNetwork } = useApp()
  const navigate = useNavigate()

  // Step 0: Generate
  const handleGenerate = () => {
    const data = generateWallet()
    setWalletData(data)
    // Pick 3 random word indices to verify later
    const indices = []
    while (indices.length < 3) {
      const idx = Math.floor(Math.random() * 12)
      if (!indices.includes(idx)) indices.push(idx)
    }
    setVerifyIndices(indices.sort((a, b) => a - b))
    setStep(1)
  }

  // Step 2: Verify
  const handleVerify = () => {
    const words = walletData.mnemonic.split(' ')
    for (const idx of verifyIndices) {
      if ((verifyWords[idx] || '').trim().toLowerCase() !== words[idx].toLowerCase()) {
        setError(`Word #${idx + 1} is incorrect`)
        return
      }
    }
    setError('')
    setStep(3)
  }

  // Step 3: Save
  const handleSave = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const encrypted = encryptPrivateKey(walletData.privateKey, password)
      await saveWallet({
        address: walletData.address,
        encryptedPrivateKey: encrypted,
        network: activeNetwork,
      })
      await loadWallets()
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const words = walletData?.mnemonic?.split(' ') || []

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Progress */}
      <div className="mb-4">
        <div className="d-flex justify-content-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="d-flex flex-column align-items-center" style={{ flex: 1 }}>
              <div className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? <i className="bi bi-check-lg"></i> : i + 1}
              </div>
              <span style={{ fontSize: 11, marginTop: 4, color: i === step ? 'var(--cv-accent)' : 'var(--cv-text-dim)' }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="progress" style={{ height: 3, background: 'var(--cv-border)' }}>
          <div className="progress-bar" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'var(--cv-accent)' }}></div>
        </div>
      </div>

      {error && <div className="cv-alert cv-alert-danger mb-4"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}

      {/* Step 0: Generate */}
      {step === 0 && (
        <div className="cv-card fade-in">
          <div className="text-center py-4">
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔑</div>
            <h3 style={{ fontWeight: 800 }}>Create New Wallet</h3>
            <p style={{ color: 'var(--cv-text-muted)', marginBottom: 32 }}>
              We'll generate a 12-word seed phrase using BIP39. You must back it up — it's the only way to recover your wallet.
            </p>
            <div className="cv-alert cv-alert-warning mb-4 text-start">
              <i className="bi bi-exclamation-triangle-fill"></i>
              <div>
                <strong>Never share your seed phrase.</strong> Anyone with it has full access to your funds.
              </div>
            </div>
            <button className="btn-cv-primary" style={{ padding: '14px 40px', fontSize: 15 }} onClick={handleGenerate}>
              <i className="bi bi-stars"></i> Generate Wallet
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Backup seed */}
      {step === 1 && walletData && (
        <div className="cv-card fade-in">
          <h4 style={{ fontWeight: 800, marginBottom: 4 }}>Back Up Your Seed Phrase</h4>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>
            Write these 12 words in order on paper. Store them somewhere safe and offline.
          </p>

          <div className="cv-alert cv-alert-danger mb-3">
            <i className="bi bi-shield-exclamation"></i>
            <span>Never take a screenshot. Never store digitally.</span>
          </div>

          <div className="seed-reveal-wrap" style={{ position: 'relative' }}>
            <div className="seed-grid" style={{ filter: seedRevealed ? 'none' : 'blur(8px)', userSelect: seedRevealed ? 'text' : 'none' }}>
              {words.map((w, i) => (
                <div key={i} className="seed-word">
                  <span className="seed-word-num">{i + 1}.</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
            {!seedRevealed && (
              <div className="seed-overlay" onClick={() => setSeedRevealed(true)}>
                <i className="bi bi-eye-slash-fill" style={{ fontSize: 28 }}></i>
                <span>Tap to reveal</span>
              </div>
            )}
          </div>

          <div className="copy-box mt-3">
            <code>{seedRevealed ? walletData.mnemonic : '•'.repeat(60)}</code>
            {seedRevealed && (
              <button className="btn-cv-ghost p-1" onClick={() => { navigator.clipboard.writeText(walletData.mnemonic) }}>
                <i className="bi bi-clipboard"></i>
              </button>
            )}
          </div>

          <hr className="cv-divider" />
          <p style={{ fontSize: 12, color: 'var(--cv-text-dim)' }}>
            Address: <code className="mono" style={{ fontSize: 11 }}>{walletData.address}</code>
          </p>

          <div className="d-flex gap-2 justify-content-end mt-3">
            <button className="btn-cv-secondary" onClick={() => setStep(0)}>Back</button>
            <button className="btn-cv-primary" onClick={() => setStep(2)} disabled={!seedRevealed}>
              I've written it down <i className="bi bi-arrow-right"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Verify */}
      {step === 2 && (
        <div className="cv-card fade-in">
          <h4 style={{ fontWeight: 800, marginBottom: 4 }}>Verify Your Backup</h4>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 24 }}>
            Enter the requested words from your seed phrase to confirm you've saved it.
          </p>

          {verifyIndices.map((idx) => (
            <div key={idx} className="mb-3">
              <label className="cv-label">Word #{idx + 1}</label>
              <input
                className="cv-input mono"
                placeholder={`Enter word #${idx + 1}`}
                value={verifyWords[idx] || ''}
                onChange={e => setVerifyWords(p => ({ ...p, [idx]: e.target.value }))}
              />
            </div>
          ))}

          <div className="d-flex gap-2 justify-content-end mt-4">
            <button className="btn-cv-secondary" onClick={() => setStep(1)}>Back</button>
            <button className="btn-cv-primary" onClick={handleVerify}>
              Verify <i className="bi bi-check-circle"></i>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Password */}
      {step === 3 && (
        <div className="cv-card fade-in">
          <h4 style={{ fontWeight: 800, marginBottom: 4 }}>Secure Your Wallet</h4>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 24 }}>
            Set a strong password. Your private key will be AES-256 encrypted with this password before storage.
          </p>

          <div className="mb-3">
            <label className="cv-label">Wallet Password</label>
            <input type="password" className="cv-input" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="cv-label">Confirm Password</label>
            <input type="password" className="cv-input" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <div className="cv-alert cv-alert-info mb-4">
            <i className="bi bi-info-circle-fill"></i>
            <span style={{ fontSize: 12 }}>This password encrypts your key locally. We never see it. If you forget it, use your seed phrase to recover.</span>
          </div>

          <div className="d-flex gap-2 justify-content-end">
            <button className="btn-cv-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-cv-primary" onClick={handleSave} disabled={loading}>
              {loading ? <><span className="cv-spinner" style={{ width: 16, height: 16 }}></span> Saving…</> : <><i className="bi bi-lock-fill"></i> Save Wallet</>}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--cv-surface-2);
          border: 1px solid var(--cv-border);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          color: var(--cv-text-muted);
          transition: all 0.3s;
        }
        .step-dot.active { background: var(--cv-accent-dim); border-color: var(--cv-accent); color: var(--cv-accent); }
        .step-dot.done { background: var(--cv-success-dim); border-color: var(--cv-success); color: var(--cv-success); }
        .seed-reveal-wrap { position: relative; }
        .seed-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          cursor: pointer; gap: 8px;
          color: var(--cv-text-muted);
          font-size: 14px;
        }
        .seed-overlay:hover { color: var(--cv-text); }
      `}</style>
    </div>
  )
}
