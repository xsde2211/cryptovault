// src/components/common/LoadingSpinner.jsx
export default function LoadingSpinner({ fullScreen, size = 'md', text }) {
  const spinner = (
    <div className="d-flex flex-column align-items-center gap-3">
      <div className={`cv-spinner ${size === 'lg' ? 'cv-spinner-lg' : ''}`}></div>
      {text && <p style={{ color: 'var(--cv-text-muted)', fontSize: 13, margin: 0 }}>{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'var(--cv-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    )
  }

  return spinner
}
