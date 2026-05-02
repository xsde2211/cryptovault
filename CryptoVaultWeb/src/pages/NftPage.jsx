// src/pages/NftPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../context/ToastContext'
import { fetchNFTs, isNFTSupported, getNFTExplorerUrl } from '../services/blockchain/nftService'
import { getNetwork } from '../utils/networks'
import { shortenAddress } from '../services/blockchain/walletService'

export default function NftPage() {
  const { activeWallet, activeNetwork } = useApp()
  const toast = useToast()
  const [nfts,    setNfts]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [selected, setSelected] = useState(null)  // NFT detail modal
  const [view,    setView]    = useState('grid')  // 'grid' | 'list'
  const [filter,  setFilter]  = useState('all')   // 'all' | collection name
  const network = getNetwork(activeNetwork)
  const supported = isNFTSupported(activeNetwork)

  const load = useCallback(async () => {
    if (!activeWallet) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchNFTs(activeWallet.address, activeNetwork)
      setNfts(data)
      if (data.length === 0 && supported) {
        toast.info('No NFTs found on this network')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeWallet, activeNetwork])

  useEffect(() => { load() }, [load])

  // Group NFTs by collection
  const collections = [...new Set(nfts.map(n => n.collection))]
  const filtered = filter === 'all' ? nfts : nfts.filter(n => n.collection === filter)

  if (!activeWallet) {
    return (
      <div className="cv-card text-center py-5">
        <p style={{ color: 'var(--cv-text-muted)' }}>Select a wallet to view NFTs.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h2>NFT Gallery</h2>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn-icon" onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} title="Toggle view">
            <i className={`bi bi-${view === 'grid' ? 'list-ul' : 'grid'}`}></i>
          </button>
          <button className="btn-cv-ghost" onClick={load} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? 'pulse' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* No API key warning */}
      {!supported && (
        <div className="cv-alert cv-alert-warning mb-4">
          <i className="bi bi-key-fill"></i>
          <div>
            <strong>API key required</strong>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              Add <code>VITE_ALCHEMY_ETH_KEY</code> or <code>VITE_MORALIS_API_KEY</code> to your
              <code>.env</code> file to enable NFT fetching.
              Both offer free tiers — see the README for setup.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="cv-alert cv-alert-danger mb-4">
          <i className="bi bi-exclamation-circle-fill"></i> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="cv-card text-center py-5">
          <div className="cv-spinner cv-spinner-lg mx-auto mb-3"></div>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13 }}>
            Scanning {network.name} for NFTs…
          </p>
        </div>
      )}

      {!loading && nfts.length > 0 && (
        <>
          {/* Stats bar */}
          <div className="d-flex gap-3 mb-4 flex-wrap">
            <div className="cv-card cv-card-sm" style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total NFTs</div>
              <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'var(--font-mono)' }}>{nfts.length}</div>
            </div>
            <div className="cv-card cv-card-sm" style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Collections</div>
              <div style={{ fontWeight: 800, fontSize: 22, fontFamily: 'var(--font-mono)' }}>{collections.length}</div>
            </div>
            <div className="cv-card cv-card-sm" style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, color: 'var(--cv-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Network</div>
              <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: network.color, display: 'inline-block' }}></span>
                {network.name}
              </div>
            </div>
          </div>

          {/* Collection filter */}
          {collections.length > 1 && (
            <div className="d-flex gap-2 mb-4 flex-wrap">
              <button
                className={`btn-cv-secondary ${filter === 'all' ? '' : ''}`}
                style={{ padding: '5px 12px', fontSize: 11, background: filter === 'all' ? 'var(--cv-accent-dim)' : undefined, borderColor: filter === 'all' ? 'var(--cv-accent)' : undefined, color: filter === 'all' ? 'var(--cv-accent)' : undefined }}
                onClick={() => setFilter('all')}
              >
                All ({nfts.length})
              </button>
              {collections.map(col => {
                const count = nfts.filter(n => n.collection === col).length
                return (
                  <button
                    key={col}
                    className="btn-cv-secondary"
                    style={{
                      padding: '5px 12px', fontSize: 11,
                      background: filter === col ? 'var(--cv-accent-dim)' : undefined,
                      borderColor: filter === col ? 'var(--cv-accent)' : undefined,
                      color: filter === col ? 'var(--cv-accent)' : undefined,
                      maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    onClick={() => setFilter(col)}
                  >
                    {col} ({count})
                  </button>
                )
              })}
            </div>
          )}

          {/* Grid view */}
          {view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {filtered.map(nft => (
                <div key={nft.id} className="nft-card fade-in" onClick={() => setSelected(nft)}>
                  <NftImage src={nft.image} name={nft.name} />
                  <div className="nft-card-body">
                    <div className="nft-card-name">{nft.name}</div>
                    <div className="nft-card-collection">{nft.collection}</div>
                    {nft.floorPrice && (
                      <div style={{ fontSize: 10, color: 'var(--cv-accent)', marginTop: 4, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        ◎ {nft.floorPrice} ETH floor
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div className="cv-card p-0" style={{ overflow: 'hidden' }}>
              {filtered.map((nft, i) => (
                <div
                  key={nft.id}
                  className="d-flex align-items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--cv-border)' : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                  onClick={() => setSelected(nft)}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                    <NftImage src={nft.image} name={nft.name} size={48} />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nft.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--cv-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nft.collection}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="cv-badge cv-badge-muted">{nft.tokenType}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && nfts.length === 0 && supported && !error && (
        <div className="cv-card text-center py-5 fade-in">
          <div style={{ fontSize: 56, marginBottom: 12 }}>🖼️</div>
          <h5 style={{ fontWeight: 700 }}>No NFTs Found</h5>
          <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, marginBottom: 20 }}>
            No NFTs were found for this wallet on {network.name}.
          </p>
          <div className="mono" style={{ fontSize: 11, color: 'var(--cv-text-dim)' }}>
            {shortenAddress(activeWallet.address)}
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selected && (
        <NftModal nft={selected} networkId={activeNetwork} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function NftImage({ src, name, size = null }) {
  const [errored, setErrored] = useState(false)
  if (!src || errored) {
    return (
      <div style={{
        width: size || '100%', height: size || '100%',
        aspectRatio: size ? undefined : '1',
        background: 'var(--cv-surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size ? 20 : 32, color: 'var(--cv-text-dim)',
      }}>
        🖼️
      </div>
    )
  }
  return (
    <img
      src={src} alt={name}
      style={{ width: size || '100%', height: size || '100%', objectFit: 'cover', display: 'block' }}
      onError={() => setErrored(true)}
      loading="lazy"
    />
  )
}

function NftModal({ nft, networkId, onClose }) {
  const osUrl = getNFTExplorerUrl(nft.contractAddress, nft.tokenId, networkId)
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="cv-card fade-in" style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h5 style={{ fontWeight: 800, margin: 0 }}>{nft.name}</h5>
            <div style={{ fontSize: 12, color: 'var(--cv-text-muted)' }}>{nft.collection}</div>
          </div>
          <button className="btn-cv-ghost p-1" onClick={onClose}><i className="bi bi-x-lg" style={{ fontSize: 18 }}></i></button>
        </div>

        {/* Image */}
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <NftImage src={nft.image} name={nft.name} />
        </div>

        {/* Details */}
        <div className="d-flex flex-column gap-2 mb-3" style={{ fontSize: 13 }}>
          <InfoRow label="Token ID"   value={`#${nft.tokenId}`} mono />
          <InfoRow label="Contract"   value={shortenAddress(nft.contractAddress)} mono />
          <InfoRow label="Type"       value={nft.tokenType || 'ERC-721'} />
          {nft.floorPrice && <InfoRow label="Floor Price" value={`${nft.floorPrice} ETH`} />}
        </div>

        {/* Description */}
        {nft.description && (
          <p style={{ fontSize: 13, color: 'var(--cv-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            {nft.description.slice(0, 200)}{nft.description.length > 200 ? '…' : ''}
          </p>
        )}

        {/* Attributes */}
        {nft.attributes?.length > 0 && (
          <div className="mb-4">
            <div className="cv-label mb-2">Attributes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {nft.attributes.slice(0, 12).map((attr, i) => (
                <div key={i} style={{ background: 'var(--cv-accent-dim)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11 }}>
                  <div style={{ color: 'var(--cv-accent)', fontWeight: 700, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em' }}>{attr.trait_type}</div>
                  <div style={{ fontWeight: 600, color: 'var(--cv-text)' }}>{String(attr.value)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="d-flex gap-2">
          <a href={osUrl} target="_blank" rel="noreferrer" className="btn-cv-secondary" style={{ flex: 1, justifyContent: 'center' }}>
            <i className="bi bi-box-arrow-up-right"></i> View on OpenSea
          </a>
          <button
            className="btn-cv-ghost"
            onClick={() => { navigator.clipboard.writeText(nft.contractAddress); }}
            title="Copy contract address"
          >
            <i className="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-1" style={{ borderBottom: '1px solid var(--cv-border)' }}>
      <span style={{ color: 'var(--cv-text-muted)', fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 12, fontWeight: 600 }}>{value}</span>
    </div>
  )
}


