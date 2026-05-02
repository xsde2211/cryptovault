// src/pages/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../services/supabase/authService'
import { useToast } from '../context/ToastContext'
import { AuthLayout } from './SignupPage'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const navigate = useNavigate()
  const toast    = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to access your wallet">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="cv-alert cv-alert-danger mb-4">
            <i className="bi bi-exclamation-triangle-fill" /> {error}
          </div>
        )}
        <div className="mb-3">
          <label className="cv-label">Email Address</label>
          <input type="email" className="cv-input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label className="cv-label">Password</label>
          <input type="password" className="cv-input" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-cv-primary w-100 justify-content-center"
          disabled={loading} style={{ fontSize: 15, padding: '13px 24px' }}>
          {loading
            ? <><span className="cv-spinner cv-spinner-sm" /> Signing in…</>
            : <><i className="bi bi-box-arrow-in-right" /> Sign In</>}
        </button>
        <div className="auth-footer-row">
          <span>Don't have an account?</span>
          <Link to="/signup">Create one</Link>
        </div>
      </form>
    </AuthLayout>
  )
}