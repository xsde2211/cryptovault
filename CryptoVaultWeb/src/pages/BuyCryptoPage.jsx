// src/pages/BuyCryptoPage.jsx
// Fiat on-ramp page. Integrates MoonPay + Transak widget URLs.
// Also shows a mock calculator so users can preview before redirecting.

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getNetwork } from '../utils/networks'

// ── Provider configs ────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    tagline: 'Fastest checkout · Cards & bank transfer',
    logo: '🌙',
    color: '#7B3FE4',
    fees: '1.0% + $0.50',
    minAmount: 20,
    maxAmount: 10000,
    currencies: ['ETH', 'BNB', 'MATIC', 'USDC', 'USDT'],
    buildUrl: ({ crypto, fiatAmount, walletAddress, apiKey }) => {
      const base = 'https://buy.moonpay.com'
      const params = new URLSearchParams({
        apiKey:          apiKey || 'pk_test_demo',
        currencyCode:    crypto.toLowerCase(),
        baseCurrencyAmount: fiatAmount,
        walletAddress,
        colorCode:       '%237B3FE4',
      })
      return `${base}?${params}`
    },
  },
  {
    id: 'transak',
    name: 'Transak',
    tagline: 'Global reach · 100+ payment methods',
    logo: '🔷',
    color: '#0052FF',
    fees: '0.99%',
    minAmount: 30,
    maxAmount: 15000,
    currencies: ['ETH', 'BNB', 'MATIC'],
    buildUrl: ({ crypto, fiatAmount, walletAddress, apiKey }) => {
      const base = 'https://global.transak.com'
      const params = new URLSearchParams({
        apiKey:            apiKey || import.meta.env.VITE_TRANSAK_API_KEY || 'demo',
        defaultCryptoCurrency: crypto,
        fiatAmount,
        walletAddress,
        network:           crypto === 'ETH' ? 'ethereum' : crypto === 'BNB' ? 'bsc' : 'polygon',
        themeColor:        '0052FF',
      })
      return `${base}?${params}`
    },
  },
  {
    id: 'ramp',
    name: 'Ramp Network',
    tagline: 'No KYC under limits · Instant',
    logo: '⚡',
    color: '#00D395',
    fees: '0.99–2.9%',
    minAmount: 10,
    maxAmount: 20000,
    currencies: ['ETH', 'MATIC'],
    buildUrl: ({ crypto, fiatAmount, walletAddress, apiKey }) => {
      const base = 'https://app.ramp.network'
      const params = new URLSearchParams({
        hostApiKey:    apiKey || import.meta.env.VITE_RAMP_API_KEY || 'demo',
        swapAsset:     crypto,
        fiatValue:     fiatAmount,
        userAddress:   walletAddress,
      })
      return `${base}?${params}`
    },
  },
]

// ── Mock rate data (in production fetch from CoinGecko or provider API) ─────
const MOCK_RATES = {
  ETH:  2850,
  BNB:  380,
  MATIC: 0.85,
  USDC:  1,
  USDT:  1,
}

const FIAT_CURRENCIES = [
  { code: 'USD', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳' },
]

export default function BuyCryptoPage() {
  const { activeWallet, activeNetwork } = useApp()
  const toast = useToast()
  const network = getNetwork(activeNetwork)

  const [fiatAmount,    setFiatAmount]    = useState('100')
  const [fiatCurrency,  setFiatCurrency]  = useState('USD')
  const [cryptoAsset,   setCryptoAsset]   = useState('ETH')
  const [selectedProvider, setSelectedProvider] = useState('moonpay')
  const [cryptoReceived,   setCryptoReceived]   = useState('')
  const [rates,  setRates]   = useState(MOCK_RATES)
  const [loading, setLoading] = useState(false)

  // Auto-detect crypto from active network
  useEffect(() => {
    setCryptoAsset(network.currency.symbol === 'tBNB' ? 'BNB' : network.currency.symbol)
  }, [network])

  // Calculate received amount
  useEffect(() => {
    const usd = parseFloat(fiatAmount)
    if (!usd || usd <= 0) { setCryptoReceived(''); return }
    const rate = rates[cryptoAsset] || 1
    // Apply fee
    const provider = PROVIDERS.find(p => p.id === selectedProvider)
    const feeRate = parseFloat(provider?.fees?.split('%')[0] || '1') / 100
    const net = usd * (1 - feeRate)
    const fiatRate = fiatCurrency === 'INR' ? net / 84 : fiatCurrency === 'EUR' ? net / 0.92 : fiatCurrency === 'GBP' ? net / 0.79 : net
    setCryptoReceived((fiatRate / rate).toFixed(6))
  }, [fiatAmount, cryptoAsset, selectedProvider, fiatCurrency, rates])

  const provider = PROVIDERS.find(p => p.id === selectedProvider)
  const filteredProviders = PROVIDERS.filter(p => p.currencies.includes(cryptoAsset))

  const handleBuy = () => {
    if (!activeWallet) { toast.error('Select a wallet first'); return }
    const usd = parseFloat(fiatAmount)
    if (!usd || usd < provider.minAmount) {
      toast.warning(`Minimum amount is $${provider.minAmount}`)
      return
    }
    const url = provider.buildUrl({
      crypto: cryptoAsset,
      fiatAmount,
      walletAddress: activeWallet.address,
      apiKey: import.meta.env[`VITE_${provider.id.toUpperCase()}_API_KEY`],
    })
    window.open(url, '_blank', 'width=480,height=700,resizable=yes')
    toast.info(`Opening ${provider.name}…`)
  }

  const fiatSymbol = FIAT_CURRENCIES.find(f => f.code === fiatCurrency)?.symbol || '$'

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="page-header">
        <h2>Buy Crypto</h2>
        <span className="cv-badge cv-badge-accent">Fiat On-Ramp</span>
      </div>

      {!activeWallet && (
        <div className="cv-alert cv-alert-warning mb-4">
          <i className="bi bi-exclamation-triangle-fill"></i>
          Create or import a wallet to use this feature.
        </div>
      )}

      <div className="row g-3">
        {/* Calculator card */}
        <div className="col-12">
          <div className="cv-card">
            <div className="cv-label mb-3">How much do you want to spend?</div>

            {/* Fiat input */}
            <div className="d-flex gap-2 mb-3">
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--cv-text-muted)', fontWeight: 700 }}>
                  {fiatSymbol}
                </span>
                <input
                  className="cv-input mono"
                  type="number"
                  value={fiatAmount}
                  onChange={e => setFiatAmount(e.target.value)}
                  style={{ paddingLeft: 30 }}
                  min={provider?.minAmount}
                  max={provider?.maxAmount}
                  placeholder="100"
                />
              </div>
              <select
                className="cv-select"
                style={{ width: 100 }}
                value={fiatCurrency}
                onChange={e => setFiatCurrency(e.target.value)}
              >
                {FIAT_CURRENCIES.map(f => (
                  <option key={f.code} value={f.code}>{f.flag} {f.code}</option>
                ))}
              </select>
            </div>

            {/* Quick amounts */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
              {[50, 100, 250, 500].map(amt => (
                <button
                  key={amt}
                  className={`btn-cv-secondary ${fiatAmount === String(amt) ? 'active' : ''}`}
                  style={{ padding: '5px 14px', fontSize: 12, borderColor: fiatAmount === String(amt) ? 'var(--cv-accent)' : undefined }}
                  onClick={() => setFiatAmount(String(amt))}
                >
                  {fiatSymbol}{amt}
                </button>
              ))}
            </div>

            {/* Crypto selector */}
            <div className="cv-label mb-2">Asset to receive</div>
            <div className="d-flex gap-2 mb-4 flex-wrap">
              {['ETH', 'BNB', 'MATIC', 'USDC', 'USDT'].map(asset => (
                <button
                  key={asset}
                  className={`btn-cv-secondary ${cryptoAsset === asset ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    borderColor: cryptoAsset === asset ? 'var(--cv-accent)' : undefined,
                    background: cryptoAsset === asset ? 'var(--cv-accent-dim)' : undefined,
                    color: cryptoAsset === asset ? 'var(--cv-accent)' : undefined,
                  }}
                  onClick={() => setCryptoAsset(asset)}
                >
                  {asset}
                </button>
              ))}
            </div>

            {/* Preview */}
            {cryptoReceived && (
              <div className="buy-preview mb-4 fade-in">
                <div className="buy-preview-row">
                  <span>You pay</span>
                  <strong>{fiatSymbol}{fiatAmount} {fiatCurrency}</strong>
                </div>
                <div className="buy-preview-row">
                  <span>Provider fee ({provider?.fees})</span>
                  <strong style={{ color: 'var(--cv-warning)' }}>
                    {fiatSymbol}{(parseFloat(fiatAmount) * parseFloat(provider?.fees || '1') / 100).toFixed(2)}
                  </strong>
                </div>
                <div className="buy-preview-row" style={{ borderTop: '1px solid var(--cv-border)', paddingTop: 10, marginTop: 4 }}>
                  <span>You receive (est.)</span>
                  <strong style={{ color: 'var(--cv-success)', fontSize: 16 }}>
                    ~{cryptoReceived} {cryptoAsset}
                  </strong>
                </div>
              </div>
            )}

            {/* Wallet address */}
            {activeWallet && (
              <div className="mb-4">
                <div className="cv-label">Receiving Address</div>
                <div className="copy-box">
                  <code style={{ fontSize: 11 }}>{activeWallet.address}</code>
                  <button
                    className="btn-cv-ghost p-1"
                    onClick={() => { navigator.clipboard.writeText(activeWallet.address); toast.success('Copied!') }}
                  >
                    <i className="bi bi-clipboard"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Provider selection */}
        <div className="col-12">
          <div className="cv-label mb-2">Choose Provider</div>
          <div className="d-flex flex-column gap-2 mb-4">
            {filteredProviders.map(p => (
              <div
                key={p.id}
                className="provider-card"
                style={{
                  borderColor: selectedProvider === p.id ? p.color : undefined,
                  background: selectedProvider === p.id ? `${p.color}10` : undefined,
                }}
                onClick={() => setSelectedProvider(p.id)}
              >
                <div style={{ fontSize: 24 }}>{p.logo}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--cv-text-muted)' }}>{p.tagline}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cv-success)' }}>
                    {p.fees}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>
                    Min ${p.minAmount}
                  </div>
                </div>
                {selectedProvider === p.id && (
                  <div style={{ color: p.color }}>
                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className="btn-cv-primary w-100 justify-content-center"
            style={{ padding: '13px', fontSize: 14 }}
            onClick={handleBuy}
            disabled={!activeWallet || !fiatAmount}
          >
            <i className="bi bi-credit-card-fill"></i>
            Buy {cryptoAsset} with {provider?.name}
            <i className="bi bi-box-arrow-up-right" style={{ fontSize: 11 }}></i>
          </button>

          <p style={{ fontSize: 11, color: 'var(--cv-text-dim)', textAlign: 'center', marginTop: 10 }}>
            You will be redirected to {provider?.name}'s secure checkout.
            CryptoVault does not handle payment information.
          </p>
        </div>
      </div>

      <style>{`
        .buy-preview {
          background: var(--cv-surface-2);
          border: 1px solid var(--cv-border);
          border-radius: 12px;
          padding: 14px;
        }
        .buy-preview-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          font-size: 13px;
          color: var(--cv-text-muted);
        }
        .buy-preview-row strong { color: var(--cv-text); }
        .provider-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--cv-surface);
          border: 1px solid var(--cv-border);
          border-radius: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .provider-card:hover { border-color: var(--cv-accent); background: var(--cv-surface-2); }
      `}</style>
    </div>
  )
}
