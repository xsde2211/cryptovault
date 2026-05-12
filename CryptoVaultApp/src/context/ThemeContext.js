// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DARK, LIGHT } from '../utils/theme'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true)

  const colors = isDark ? DARK : LIGHT

  const toggleTheme = useCallback(async () => {
    const next = !isDark
    setIsDark(next)
    await AsyncStorage.setItem('cv_theme', next ? 'dark' : 'light').catch(() => {})
  }, [isDark])

  // Load saved preference
  React.useEffect(() => {
    AsyncStorage.getItem('cv_theme').then(v => {
      if (v === 'light') setIsDark(false)
    }).catch(() => {})
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider')
  return ctx
}
