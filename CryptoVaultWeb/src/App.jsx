// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

// Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import CreateWalletPage from './pages/CreateWalletPage'
import ImportWalletPage from './pages/ImportWalletPage'
import DashboardPage from './pages/DashboardPage'
import SendPage from './pages/SendPage'
import ReceivePage from './pages/ReceivePage'
import TokensPage from './pages/TokensPage'
import TransactionsPage from './pages/TransactionsPage'
import SettingsPage from './pages/SettingsPage'
import SwapPage from './pages/SwapPage'
import BuyCryptoPage from './pages/BuyCryptoPage'
import WatchlistPage from './pages/WatchlistPage'
import NftPage from './pages/NftPage'
import PreferencesPage from './pages/PreferencesPage'
import AboutPage from './pages/AboutPage'
import WalletAddressPage from './pages/WalletAddressPage'

import Sidebar from './components/common/Sidebar'
import MobileNav from './components/common/MobileNav'
import LoadingSpinner from './components/common/LoadingSpinner'

const ProtectedRoute = ({ children }) => {
  const { user, authLoading } = useApp()
  if (authLoading) return <LoadingSpinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, authLoading } = useApp()
  if (authLoading) return <LoadingSpinner fullScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

const AppShell = () => {
  const { user } = useApp()
  return (
    <div className="app-shell">
      {user && <Sidebar />}
      {/*
        FIX: Public pages (/, /login, /signup) must NOT use 'main-content' class
        because that class adds `margin-left: sidebar-width`, causing left-alignment.
        Public pages get 'public-page' which is full-width with no sidebar offset.
      */}
      <main className={user ? 'main-content' : 'public-page'}>
        <Routes>
          <Route path="/"               element={<PublicRoute><LandingPage /></PublicRoute>} />
          <Route path="/login"          element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/signup"         element={<PublicRoute><SignupPage /></PublicRoute>} />

          <Route path="/dashboard"      element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/create-wallet"  element={<ProtectedRoute><CreateWalletPage /></ProtectedRoute>} />
          <Route path="/import-wallet"  element={<ProtectedRoute><ImportWalletPage /></ProtectedRoute>} />
          <Route path="/send"           element={<ProtectedRoute><SendPage /></ProtectedRoute>} />
          <Route path="/receive"        element={<ProtectedRoute><ReceivePage /></ProtectedRoute>} />
          <Route path="/tokens"         element={<ProtectedRoute><TokensPage /></ProtectedRoute>} />
          <Route path="/transactions"   element={<ProtectedRoute><TransactionsPage /></ProtectedRoute>} />
          <Route path="/swap"           element={<ProtectedRoute><SwapPage /></ProtectedRoute>} />
          <Route path="/buy"            element={<ProtectedRoute><BuyCryptoPage /></ProtectedRoute>} />
          <Route path="/watchlist"      element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
          <Route path="/nft"            element={<ProtectedRoute><NftPage /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/preferences"    element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
          <Route path="/about"          element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
          <Route path="/wallet-address" element={<ProtectedRoute><WalletAddressPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {user && <MobileNav />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AppProvider>
            <AppShell />
          </AppProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}