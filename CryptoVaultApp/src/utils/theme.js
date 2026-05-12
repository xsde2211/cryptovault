// src/utils/theme.js
// Professional Finance App Design System — Dark & Light Mode
import { Platform, Dimensions } from 'react-native'

const { width: W, height: H } = Dimensions.get('window')
export const SCREEN = { width: W, height: H }

// ── Dark Mode (default) ───────────────────────────────────────
export const DARK = {
  bg:        '#0a0b10',
  bg2:       '#0f1018',
  surface:   '#13141f',
  surface2:  '#1a1b2e',
  surface3:  '#21233a',
  surface4:  '#282b42',
  border:    '#1f2235',
  border2:   '#252840',
  accent:    '#6c63ff',
  accentSoft:'#7c6ff7',
  accent2:   '#4facfe',
  accentDim: 'rgba(108,99,255,0.15)',
  accentGlow:'rgba(108,99,255,0.3)',
  success:   '#00d4aa',
  successDim:'rgba(0,212,170,0.12)',
  danger:    '#ff4d6d',
  dangerDim: 'rgba(255,77,109,0.12)',
  warning:   '#ffb830',
  warningDim:'rgba(255,184,48,0.12)',
  info:      '#00bcd4',
  text:      '#f0f1ff',
  textSub:   '#8b8fa8',
  textDim:   '#3d4168',
  card:      '#13141f',
  tron:      '#ff2d55',
  eth:       '#627EEA',
  bnb:       '#F3BA2F',
  matic:     '#8247E5',
}

// ── Light Mode ────────────────────────────────────────────────
export const LIGHT = {
  bg:        '#f0f2ff',
  bg2:       '#e8eaf6',
  surface:   '#ffffff',
  surface2:  '#f4f5ff',
  surface3:  '#eceeff',
  surface4:  '#e4e6ff',
  border:    '#e0e2f0',
  border2:   '#d0d2e8',
  accent:    '#5c55f0',
  accentSoft:'#6c63ff',
  accent2:   '#3a8fd6',
  accentDim: 'rgba(92,85,240,0.1)',
  accentGlow:'rgba(92,85,240,0.2)',
  success:   '#00b894',
  successDim:'rgba(0,184,148,0.1)',
  danger:    '#e84393',
  dangerDim: 'rgba(232,67,147,0.1)',
  warning:   '#f09c00',
  warningDim:'rgba(240,156,0,0.1)',
  info:      '#0097a7',
  text:      '#0d0f2b',
  textSub:   '#5c5f7a',
  textDim:   '#9fa3c0',
  card:      '#ffffff',
  tron:      '#ff2d55',
  eth:       '#627EEA',
  bnb:       '#c89500',
  matic:     '#6c35b5',
}

// Default to dark
export const COLORS = DARK

export const RADIUS = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, full: 999 }

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 20, xl: 28, xxl: 36 }

export const FONT = {
  mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  sans: Platform.select({ ios: 'SF Pro Display', android: 'Roboto', default: 'System' }),
}

export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 7 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 12 },
  accent: { shadowColor: '#6c63ff', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  card:   { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
}

export const GRADIENTS = {
  accent:   ['#6c63ff', '#4facfe'],
  accentV:  ['#7c6ff7', '#6c63ff'],
  success:  ['#00d4aa', '#00b4d8'],
  danger:   ['#ff4d6d', '#ff6b35'],
  gold:     ['#ffb830', '#ff8c00'],
  platinum: ['#b0b8d0', '#6c7a9c'],
  travel:   ['#00bcd4', '#3f51b5'],
  dark:     ['#13141f', '#0a0b10'],
  tron:     ['#ff2d55', '#ff6b35'],
  card:     ['#1e2040', '#13141f'],
  green:    ['#00d4aa', '#00897b'],
}
