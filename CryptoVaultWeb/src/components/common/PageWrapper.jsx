// src/components/common/PageWrapper.jsx
// Wraps page content with consistent header and optional back button

import { useNavigate } from 'react-router-dom'

export default function PageWrapper({ title, subtitle, actions, back, children, maxWidth = 900 }) {
  const navigate = useNavigate()
  return (
    <div style={{ maxWidth, width: '100%' }}>
      {(title || actions || back) && (
        <div className="page-header">
          <div className="d-flex align-items-center gap-3">
            {back && (
              <button className="btn-icon" onClick={() => navigate(back === true ? -1 : back)}>
                <i className="bi bi-arrow-left"></i>
              </button>
            )}
            <div>
              {title && <h2 style={{ margin: 0, fontWeight: 800, fontSize: 21, letterSpacing: '-0.02em' }}>{title}</h2>}
              {subtitle && <p style={{ margin: 0, fontSize: 13, color: 'var(--cv-text-muted)', marginTop: 2 }}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="d-flex gap-2 align-items-center">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
