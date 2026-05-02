// src/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

let _id = 0

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_id
    setToasts(prev => [...prev.slice(-4), { id, message, type }])
    if (duration > 0) setTimeout(() => remove(id), duration)
    return id
  }, [remove])

  const success = useCallback((msg, dur) => toast(msg, 'success', dur), [toast])
  const error   = useCallback((msg, dur) => toast(msg, 'error',   dur), [toast])
  const warning = useCallback((msg, dur) => toast(msg, 'warning', dur), [toast])
  const info    = useCallback((msg, dur) => toast(msg, 'info',    dur), [toast])

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

// ── Toast Container ──────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null

  const icons = {
    success: 'bi-check-circle-fill',
    error:   'bi-exclamation-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info:    'bi-info-circle-fill',
  }

  return (
    <div style={{
      position: 'fixed',
      top: 72,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 380,
      minWidth: 280,
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            pointerEvents: 'all',
            animation: 'toastSlideIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid transparent',
            // Use CSS vars so both dark and light look correct
            ...getToastStyle(t.type),
          }}
        >
          <i className={`bi ${icons[t.type] || icons.info}`} style={{ flexShrink: 0, fontSize: 15 }} />
          <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          <button
            onClick={() => onRemove(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'inherit', opacity: 0.55, padding: 0,
              lineHeight: 1, fontSize: 12, flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.55'}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

// Returns inline style for each toast type — uses CSS vars to adapt to theme
function getToastStyle(type) {
  const base = {
    success: {
      background: 'var(--cv-success-dim)',
      borderColor: 'rgba(16,185,129,0.3)',
      color: 'var(--cv-success)',
    },
    error: {
      background: 'var(--cv-danger-dim)',
      borderColor: 'rgba(244,63,94,0.3)',
      color: 'var(--cv-danger)',
    },
    warning: {
      background: 'var(--cv-warning-dim)',
      borderColor: 'rgba(245,158,11,0.3)',
      color: 'var(--cv-warning)',
    },
    info: {
      background: 'var(--cv-accent-dim)',
      borderColor: 'rgba(124,111,247,0.3)',
      color: 'var(--cv-accent)',
    },
  }
  return base[type] || base.info
}