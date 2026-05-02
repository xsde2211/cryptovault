// src/pages/ImportWalletPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { walletFromMnemonic, walletFromPrivateKey } from '../services/blockchain/walletService'
import { encryptPrivateKey } from '../utils/encryption'
import { saveWallet } from '../services/supabase/walletDbService'
import { useApp } from '../context/AppContext'

export default function ImportWalletPage() {
  const [mode, setMode] = useState('mnemonic') // 'mnemonic' | 'privatekey'
  const [inputValue, setInputValue] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { loadWallets, activeNetwork } = useApp()
  const navigate = useNavigate()

  const handlePreview = () => {
    setError('')
    setPreview(null)
    try {
      const wallet = mode === 'mnemonic'
        ? walletFromMnemonic(inputValue)
        : walletFromPrivateKey(inputValue)
      setPreview(wallet)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleImport = async () => {
    if (!preview) return
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const encrypted = encryptPrivateKey(preview.privateKey, password)
      await saveWallet({
        address: preview.address,
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

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="mb-4">
        <h2 style={{ fontWeight: 800 }}>Import Wallet</h2>
        <p style={{ color: 'var(--cv-text-muted)' }}>Restore an existing wallet using your seed phrase or private key.</p>
      </div>

      {error && <div className="cv-alert cv-alert-danger mb-4"><i className="bi bi-exclamation-triangle-fill"></i> {error}</div>}

      <div className="cv-card mb-4 fade-in">
        {/* Mode toggle */}
        <div className="d-flex gap-2 mb-4">
          <button
            className={mode === 'mnemonic' ? 'btn-cv-primary' : 'btn-cv-secondary'}
            onClick={() => { setMode('mnemonic'); setPreview(null); setInputValue('') }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <i className="bi bi-card-text"></i> Seed Phrase
          </button>
          <button
            className={mode === 'privatekey' ? 'btn-cv-primary' : 'btn-cv-secondary'}
            onClick={() => { setMode('privatekey'); setPreview(null); setInputValue('') }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <i className="bi bi-key"></i> Private Key
          </button>
        </div>

        {mode === 'mnemonic' ? (
          <div className="mb-3">
            <label className="cv-label">12 or 24 Word Seed Phrase</label>
            <textarea
              className="cv-input mono"
              rows={3}
              placeholder="word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              style={{ resize: 'vertical', lineHeight: 1.8 }}
            />
            <p style={{ fontSize: 11, color: 'var(--cv-text-dim)', marginTop: 4 }}>
              Separate each word with a space
            </p>
          </div>
        ) : (
          <div className="mb-3">
            <label className="cv-label">Private Key (hex)</label>
            <input
              type="password"
              className="cv-input mono"
              placeholder="0x... or without 0x prefix"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
          </div>
        )}

        <button
          className="btn-cv-secondary w-100 justify-content-center"
          onClick={handlePreview}
          disabled={!inputValue.trim()}
        >
          <i className="bi bi-search"></i> Preview Wallet
        </button>

        {/* Address preview */}
        {preview && (
          <div className="cv-alert cv-alert-success mt-3 fade-in">
            <i className="bi bi-check-circle-fill"></i>
            <div>
              <strong>Wallet found</strong>
              <div className="mono mt-1" style={{ fontSize: 12, wordBreak: 'break-all' }}>{preview.address}</div>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="cv-card fade-in">
          <h5 style={{ fontWeight: 700, marginBottom: 4 }}>Set Wallet Password</h5>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>
            Encrypt this wallet's private key before storing it.
          </p>

          <div className="mb-3">
            <label className="cv-label">Password</label>
            <input type="password" className="cv-input" placeholder="Min. 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="cv-label">Confirm Password</label>
            <input type="password" className="cv-input" placeholder="Repeat password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <div className="cv-alert cv-alert-warning mb-4">
            <i className="bi bi-shield-exclamation"></i>
            <span style={{ fontSize: 12 }}>Make sure you're on a trusted device. Clear this page after importing.</span>
          </div>

          <button className="btn-cv-primary w-100 justify-content-center" onClick={handleImport} disabled={loading}>
            {loading
              ? <><span className="cv-spinner" style={{ width: 16, height: 16 }}></span> Importing…</>
              : <><i className="bi bi-download"></i> Import Wallet</>}
          </button>
        </div>
      )}
    </div>
  )
}
