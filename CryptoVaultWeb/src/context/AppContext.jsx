// src/context/AppContext.jsx
import { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { onAuthStateChange, getUser } from '../services/supabase/authService'
import { getWallets } from '../services/supabase/walletDbService'
import { DEFAULT_NETWORK } from '../utils/networks'

const initialState = {
  user:           null,
  authLoading:    true,
  wallets:        [],
  activeWallet:   null,
  walletsLoading: false,
  activeNetwork:  DEFAULT_NETWORK,
  error:          null,
  prefs: {
    currency:     'USD',
    hideBalances: false,
    autoLock:     false,
    showTestnets: true,
    analytics:    false,
  },
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, authLoading: false }
    case 'AUTH_LOADING_DONE':
      return { ...state, authLoading: false }
    case 'SET_WALLETS':
      return { ...state, wallets: action.payload, walletsLoading: false }
    case 'SET_ACTIVE_WALLET':
      return { ...state, activeWallet: action.payload }
    case 'SET_NETWORK':
      return { ...state, activeNetwork: action.payload }
    case 'SET_WALLETS_LOADING':
      return { ...state, walletsLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    case 'SET_PREFS':
      return { ...state, prefs: { ...state.prefs, ...action.payload } }
    case 'LOGOUT':
      return { ...initialState, authLoading: false }
    default:
      return state
  }
}

const AppContext = createContext(null)

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const savedPrefs   = localStorage.getItem('cv_prefs')
      const savedNetwork = localStorage.getItem('cv_network')
      return {
        ...init,
        prefs:         savedPrefs   ? { ...init.prefs, ...JSON.parse(savedPrefs) } : init.prefs,
        activeNetwork: savedNetwork || init.activeNetwork,
      }
    } catch {
      return init
    }
  })

  useEffect(() => {
    localStorage.setItem('cv_prefs', JSON.stringify(state.prefs))
  }, [state.prefs])

  useEffect(() => {
    localStorage.setItem('cv_network', state.activeNetwork)
  }, [state.activeNetwork])

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (session?.user) {
        dispatch({ type: 'SET_USER', payload: session.user })
        loadWallets()
      } else {
        dispatch({ type: 'LOGOUT' })
      }
    })

    getUser()
      .then((user) => {
        if (user) {
          dispatch({ type: 'SET_USER', payload: user })
          loadWallets()
        } else {
          dispatch({ type: 'AUTH_LOADING_DONE' })
        }
      })
      .catch(() => dispatch({ type: 'AUTH_LOADING_DONE' }))

    return () => subscription?.unsubscribe()
  }, [])

  // FIX: preserve previously selected wallet across reloads
  const loadWallets = useCallback(async () => {
    dispatch({ type: 'SET_WALLETS_LOADING', payload: true })
    try {
      const wallets = await getWallets()
      dispatch({ type: 'SET_WALLETS', payload: wallets })
      if (wallets.length > 0) {
        // Restore last-used wallet from localStorage, fall back to first
        const savedId = localStorage.getItem('cv_active_wallet_id')
        const restored = savedId ? wallets.find(w => w.id === savedId) : null
        dispatch({ type: 'SET_ACTIVE_WALLET', payload: restored || wallets[0] })
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message })
      dispatch({ type: 'SET_WALLETS_LOADING', payload: false })
    }
  }, [])

  const setActiveWallet = useCallback((w) => {
    dispatch({ type: 'SET_ACTIVE_WALLET', payload: w })
    // Persist selection so it survives page refresh
    if (w?.id) localStorage.setItem('cv_active_wallet_id', w.id)
  }, [])

  const setActiveNetwork = useCallback((n) => dispatch({ type: 'SET_NETWORK',  payload: n }), [])
  const clearError       = useCallback(()  => dispatch({ type: 'CLEAR_ERROR' }),              [])
  const updatePrefs      = useCallback((p) => dispatch({ type: 'SET_PREFS',    payload: p }), [])

  return (
    <AppContext.Provider value={{
      ...state,
      loadWallets,
      setActiveWallet,
      setActiveNetwork,
      clearError,
      updatePrefs,
      dispatch,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
