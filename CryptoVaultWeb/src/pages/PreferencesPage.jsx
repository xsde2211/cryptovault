// src/pages/PreferencesPage.jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro',      symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen',  symbol: '¥' },
  { code: 'INR', label: 'Indian Rupee',  symbol: '₹' },
  { code: 'BTC', label: 'Bitcoin',       symbol: '₿' },
]

export default function PreferencesPage() {
  const { prefs, updatePrefs } = useApp()
  const { theme, toggleTheme }  = useTheme()
  const toast = useToast()

  const handleToggle = (key) => {
    updatePrefs({ [key]: !prefs[key] })
    toast.success('Preference saved')
  }

  const handleCurrency = (code) => {
    updatePrefs({ currency: code })
    toast.success(`Display currency set to ${code}`)
  }

  return (
    <div style={{ maxWidth: 580 }}>
      <div className="page-header"><h2>Preferences</h2></div>

      {/* Appearance */}
      <Section title="Appearance" icon="bi-palette">
        <PrefRow
          label="Dark Mode"
          description="Use a dark color scheme throughout the app"
          action={
            <label className="cv-toggle">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="cv-toggle-slider"></span>
            </label>
          }
        />
      </Section>

      {/* Display */}
      <Section title="Display" icon="bi-eye">
        <PrefRow
          label="Hide Balances"
          description="Mask your balance amounts with *** for privacy"
          action={
            <label className="cv-toggle">
              <input type="checkbox" checked={!!prefs.hideBalances} onChange={() => handleToggle('hideBalances')} />
              <span className="cv-toggle-slider"></span>
            </label>
          }
        />
      </Section>

      {/* Currency */}
      <Section title="Display Currency" icon="bi-currency-exchange">
        <p style={{ fontSize: 13, color: 'var(--cv-text-muted)', marginBottom: 16 }}>
          Choose the fiat currency used for balance estimates and buy crypto.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {CURRENCIES.map(cur => (
            <button
              key={cur.code}
              onClick={() => handleCurrency(cur.code)}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: `1px solid ${prefs.currency === cur.code ? 'var(--cv-accent)' : 'var(--cv-border)'}`,
                background: prefs.currency === cur.code ? 'var(--cv-accent-dim)' : 'var(--cv-surface-2)',
                color: prefs.currency === cur.code ? 'var(--cv-accent)' : 'var(--cv-text)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 2 }}>{cur.symbol}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{cur.code}</div>
              <div style={{ fontSize: 10, color: prefs.currency === cur.code ? 'var(--cv-accent)' : 'var(--cv-text-dim)' }}>{cur.label}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Security */}
      <Section title="Security" icon="bi-shield-lock">
        <PrefRow
          label="Auto-Lock Wallet"
          description="Automatically require password after 15 minutes of inactivity"
          action={
            <label className="cv-toggle">
              <input type="checkbox" checked={!!prefs.autoLock} onChange={() => handleToggle('autoLock')} />
              <span className="cv-toggle-slider"></span>
            </label>
          }
        />
        <PrefRow
          label="Show Testnet Networks"
          description="Display testnet options in the network selector"
          action={
            <label className="cv-toggle">
              <input type="checkbox" checked={prefs.showTestnets !== false} onChange={() => handleToggle('showTestnets')} />
              <span className="cv-toggle-slider"></span>
            </label>
          }
          noBorder
        />
      </Section>

      {/* Data */}
      <Section title="Data & Privacy" icon="bi-database">
        <PrefRow
          label="Analytics"
          description="Help improve CryptoVault by sending anonymous usage data"
          action={
            <label className="cv-toggle">
              <input type="checkbox" checked={!!prefs.analytics} onChange={() => handleToggle('analytics')} />
              <span className="cv-toggle-slider"></span>
            </label>
          }
          noBorder
        />
      </Section>
    </div>
  )
}

function Section({ title, icon, children }) {
  return (
    <div className="cv-card mb-4">
      <div className="d-flex align-items-center gap-2 mb-4">
        <div style={{ width: 30, height: 30, background: 'var(--cv-accent-dim)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cv-accent)', fontSize: 14 }}>
          <i className={`bi ${icon}`}></i>
        </div>
        <h5 style={{ fontWeight: 800, margin: 0 }}>{title}</h5>
      </div>
      {children}
    </div>
  )
}

function PrefRow({ label, description, action, noBorder }) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-3 py-3" style={{ borderBottom: noBorder ? 'none' : '1px solid var(--cv-border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {description && <div style={{ fontSize: 12, color: 'var(--cv-text-muted)', marginTop: 2 }}>{description}</div>}
      </div>
      {action}
    </div>
  )
}
