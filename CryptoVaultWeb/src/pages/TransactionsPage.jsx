// src/pages/TransactionsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { getTransactions } from '../services/supabase/walletDbService'
import { getExplorerTxUrl, getNetwork, NETWORKS } from '../utils/networks'
import { shortenAddress } from '../services/blockchain/walletService'

const STATUS = {
  pending:   { label: 'Pending',   cls: 'cv-badge-warning', icon: 'bi-clock' },
  confirmed: { label: 'Confirmed', cls: 'cv-badge-success', icon: 'bi-check-circle-fill' },
  failed:    { label: 'Failed',    cls: 'cv-badge-danger',  icon: 'bi-x-circle-fill' },
  swap:      { label: 'Swap',      cls: 'cv-badge-accent',  icon: 'bi-arrow-left-right' },
}

export default function TransactionsPage() {
  const { activeWallet } = useApp()
  const toast = useToast()
  const [txs,     setTxs]     = useState([])
  const [loading, setLoading] = useState(false)
  const [filter,  setFilter]  = useState('all')

  const load = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    try {
      const data = await getTransactions(activeWallet.address)
      setTxs(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeWallet])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'all' ? txs : txs.filter(tx => tx.status === filter || tx.type === filter)

  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash)
    toast.success('TX hash copied!')
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="page-header">
        <h2>Transactions</h2>
        <button className="btn-cv-ghost" onClick={load} disabled={loading}>
          <i className={`bi bi-arrow-clockwise ${loading ? 'pulse' : ''}`}></i>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* Filter pills */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {[
          { key: 'all',       label: `All (${txs.length})` },
          { key: 'send',      label: 'Sent' },
          { key: 'swap',      label: 'Swaps' },
          { key: 'pending',   label: 'Pending' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'failed',    label: 'Failed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: `1px solid ${filter === f.key ? 'var(--cv-accent)' : 'var(--cv-border)'}`,
              background: filter === f.key ? 'var(--cv-accent-dim)' : 'var(--cv-surface-2)',
              color: filter === f.key ? 'var(--cv-accent)' : 'var(--cv-text-muted)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="cv-card text-center py-5">
          <div className="cv-spinner cv-spinner-lg mx-auto"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="cv-card text-center py-5 fade-in">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h5 style={{ fontWeight: 700 }}>No Transactions Found</h5>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>
            {filter !== 'all' ? `No ${filter} transactions.` : 'Your history will appear here after you send or swap.'}
          </p>
        </div>
      ) : (
        <div className="cv-card p-0" style={{ overflow: 'hidden' }}>
          {filtered.map((tx, i) => {
            const net    = NETWORKS[tx.chain] || {}
            const status = STATUS[tx.status] || STATUS.pending
            const isSwap = tx.type === 'swap'
            return (
              <div
                key={tx.id}
                className="fade-in"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--cv-border)' : 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--cv-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                {/* Type icon */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  background: isSwap ? 'var(--cv-accent-dim)' : tx.type === 'send' ? 'var(--cv-danger-dim)' : 'var(--cv-success-dim)',
                  color:      isSwap ? 'var(--cv-accent)'    : tx.type === 'send' ? 'var(--cv-danger)'     : 'var(--cv-success)',
                }}>
                  <i className={`bi ${isSwap ? 'bi-arrow-left-right' : tx.type === 'send' ? 'bi-arrow-up-right' : 'bi-arrow-down-left'}`}></i>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{tx.type}</span>
                    <span className={`cv-badge ${status.cls}`} style={{ fontSize: 9 }}>
                      <i className={`bi ${status.icon} me-1`} style={{ fontSize: 8 }}></i>
                      {status.label}
                    </span>
                    {net.name && (
                      <span className="cv-badge cv-badge-muted" style={{ fontSize: 9 }}>{net.name}</span>
                    )}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--cv-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                    onClick={() => handleCopyHash(tx.tx_hash)}
                    title="Click to copy"
                  >
                    {tx.tx_hash}
                  </div>
                  {tx.to_address && (
                    <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', marginTop: 1 }}>
                      To: {shortenAddress(tx.to_address)}
                    </div>
                  )}
                </div>

                {/* Amount + date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {tx.amount && (
                    <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: tx.type === 'send' ? 'var(--cv-danger)' : 'var(--cv-success)' }}>
                      {tx.type === 'send' ? '−' : '+'}{tx.amount}
                      {net.currency?.symbol ? ` ${net.currency.symbol}` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', marginTop: 2 }}>
                    {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <a
                    href={getExplorerTxUrl(tx.chain, tx.tx_hash)}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: 'var(--cv-accent)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}
                    onClick={e => e.stopPropagation()}
                  >
                    Explorer <i className="bi bi-arrow-up-right-square" style={{ fontSize: 9 }}></i>
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
