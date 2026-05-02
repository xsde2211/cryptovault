// src/pages/TokensPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { validateToken, getTokenBalance, isValidAddress, formatBalance } from '../services/blockchain/walletService'
import { saveToken, getTokens, deleteToken, tokenExists } from '../services/supabase/walletDbService'
import { getNetwork } from '../utils/networks'

export default function TokensPage() {
  const { activeWallet, activeNetwork } = useApp()
  const toast = useToast()
  const [tokens,   setTokens]   = useState([])
  const [balances, setBalances] = useState({})
  const [loading,  setLoading]  = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  const [contractAddress, setContractAddress] = useState('')
  const [tokenPreview,    setTokenPreview]    = useState(null)
  const [previewLoading,  setPreviewLoading]  = useState(false)
  const [error,  setError]  = useState('')

  const network = getNetwork(activeNetwork)

  const loadTokens = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const tks = await getTokens(activeWallet.address, activeNetwork)
      setTokens(tks)
      const bals = {}
      await Promise.allSettled(tks.map(async (tk) => {
        try {
          const info = await getTokenBalance(tk.contract_address, activeWallet.address, activeNetwork)
          bals[tk.contract_address] = info.balance
        } catch {
          bals[tk.contract_address] = null
        }
      }))
      setBalances(bals)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeWallet, activeNetwork])

  useEffect(() => { loadTokens() }, [loadTokens])

  const handlePreview = async () => {
    setError(''); setTokenPreview(null)
    if (!contractAddress.trim()) return
    if (!isValidAddress(contractAddress)) { setError('Invalid contract address'); return }
    setPreviewLoading(true)
    try {
      const info = await validateToken(contractAddress, activeNetwork)
      setTokenPreview(info)
    } catch {
      setError('Could not fetch token info. Check the address and selected network.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!tokenPreview || !activeWallet) return
    setError('')
    setAddLoading(true)
    try {
      const exists = await tokenExists(contractAddress, activeWallet.address, activeNetwork)
      if (exists) { toast.warning(`${tokenPreview.symbol} is already in your list`); setAddLoading(false); return }
      await saveToken({
        contractAddress: contractAddress.toLowerCase(),
        symbol: tokenPreview.symbol,
        name: tokenPreview.name,
        decimals: tokenPreview.decimals,
        network: activeNetwork,
        walletAddress: activeWallet.address,
      })
      toast.success(`${tokenPreview.symbol} added!`)
      setContractAddress(''); setTokenPreview(null)
      loadTokens()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleDelete = async (tokenId, symbol) => {
    if (!window.confirm(`Remove ${symbol} from your wallet?`)) return
    try {
      await deleteToken(tokenId)
      setTokens(prev => prev.filter(t => t.id !== tokenId))
      toast.success(`${symbol} removed`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Tokens</h2>
        <span className="cv-badge cv-badge-muted">{network.name}</span>
      </div>

      <div className="row g-4">
        {/* Token list */}
        <div className="col-lg-7">
          {loading ? (
            <div className="cv-card text-center py-5"><div className="cv-spinner cv-spinner-lg mx-auto"></div></div>
          ) : tokens.length === 0 ? (
            <div className="cv-card text-center py-5">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🪙</div>
              <h5 style={{ fontWeight: 700 }}>No Tokens Yet</h5>
              <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>
                Add any ERC-20 / BEP-20 token using its contract address.
              </p>
            </div>
          ) : (
            <div className="cv-card p-0" style={{ overflow: 'hidden' }}>
              {tokens.map((tk, i) => (
                <div
                  key={tk.id}
                  className="d-flex align-items-center gap-3 px-4 py-3 fade-in"
                  style={{ borderBottom: i < tokens.length - 1 ? '1px solid var(--cv-border)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--cv-surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--cv-accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cv-accent)', flexShrink: 0, textTransform: 'uppercase' }}>
                    {tk.symbol.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{tk.symbol}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--cv-text-dim)' }}>{tk.contract_address.slice(0, 16)}…</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontWeight: 700, fontSize: 14 }}>
                      {balances[tk.contract_address] !== undefined
                        ? balances[tk.contract_address] !== null
                          ? formatBalance(balances[tk.contract_address])
                          : '—'
                        : <span className="cv-spinner cv-spinner-sm"></span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}>{tk.name}</div>
                  </div>
                  <button
                    className="btn-cv-ghost p-1"
                    style={{ color: 'var(--cv-danger)', opacity: 0.6 }}
                    onClick={() => handleDelete(tk.id, tk.symbol)}
                    title="Remove token"
                  >
                    <i className="bi bi-trash3"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add token */}
        <div className="col-lg-5">
          <div className="cv-card fade-in">
            <h5 style={{ fontWeight: 800, marginBottom: 16 }}>Add Custom Token</h5>

            {error && (
              <div className="cv-alert cv-alert-danger mb-3">
                <i className="bi bi-exclamation-circle-fill"></i>
                <span style={{ flex: 1 }}>{error}</span>
                <button className="btn-cv-ghost p-0" onClick={() => setError('')}><i className="bi bi-x-lg" style={{ fontSize: 11 }}></i></button>
              </div>
            )}

            <div className="mb-3">
              <label className="cv-label">Contract Address</label>
              <input
                className="cv-input mono"
                placeholder="0x…"
                value={contractAddress}
                onChange={e => { setContractAddress(e.target.value); setTokenPreview(null) }}
                onKeyDown={e => e.key === 'Enter' && handlePreview()}
              />
            </div>

            <button
              className="btn-cv-secondary w-100 justify-content-center mb-3"
              onClick={handlePreview}
              disabled={previewLoading || !contractAddress.trim()}
            >
              {previewLoading
                ? <><span className="cv-spinner cv-spinner-sm"></span> Looking up…</>
                : <><i className="bi bi-search"></i> Lookup Token</>}
            </button>

            {tokenPreview && (
              <div className="fade-in">
                <div className="cv-alert cv-alert-success mb-3">
                  <i className="bi bi-check-circle-fill"></i>
                  <div>
                    <strong>{tokenPreview.symbol}</strong> — {tokenPreview.name}
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>Decimals: {tokenPreview.decimals}</div>
                  </div>
                </div>
                <button
                  className="btn-cv-primary w-100 justify-content-center"
                  onClick={handleAdd}
                  disabled={addLoading}
                >
                  {addLoading
                    ? <><span className="cv-spinner cv-spinner-sm"></span> Adding…</>
                    : <><i className="bi bi-plus-circle-fill"></i> Add {tokenPreview.symbol}</>}
                </button>
              </div>
            )}

            <hr className="cv-divider" />
            <div style={{ fontSize: 12, color: 'var(--cv-text-dim)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <i className="bi bi-info-circle" style={{ flexShrink: 0, marginTop: 1 }}></i>
              Token balances are fetched live from <strong>{network.name}</strong>.
              Make sure the token contract exists on this network.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
