// src/components/common/CopyButton.jsx
import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

export default function CopyButton({ text, label, className, style }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(label ? `${label} copied!` : 'Copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <button
      className={className || 'btn-cv-ghost p-1'}
      style={style}
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${label || ''}`}
    >
      <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}
         style={{ color: copied ? 'var(--cv-success)' : undefined }}
      ></i>
    </button>
  )
}
