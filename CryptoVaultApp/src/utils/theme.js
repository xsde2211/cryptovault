// src/utils/theme.js
// Design tokens matching the web CryptoVault dark theme

export const COLORS = {
  // Backgrounds
  bg:        '#050608',
  surface:   '#0d0e14',
  surface2:  '#13151e',
  surface3:  '#1a1d28',
  surface4:  '#222637',

  // Borders
  border:    '#1e2131',
  border2:   '#272b3e',

  // Accent (purple-blue gradient base)
  accent:    '#7c6ff7',
  accent2:   '#4facfe',
  accentDim: 'rgba(124,111,247,0.15)',

  // Status
  success:   '#10b981',
  danger:    '#f43f5e',
  warning:   '#f59e0b',
  info:      '#06b6d4',

  // Text
  text:      '#eceef4',
  textMuted: '#7980a0',
  textDim:   '#3d4260',

  // Chain colors
  eth:     '#627EEA',
  bnb:     '#F3BA2F',
  matic:   '#8247E5',

  // White/black
  white: '#ffffff',
  black: '#000000',
}

export const FONTS = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
  mono:    Platform.OS === 'ios' ? 'Courier New' : 'monospace',
}

import { Platform } from 'react-native'

export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 100,
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  accent: {
    shadowColor: '#7c6ff7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
}

// Gradient stop pairs for LinearGradient
export const GRADIENTS = {
  accent:  ['#7c6ff7', '#4facfe'],
  success: ['#10b981', '#059669'],
  danger:  ['#f43f5e', '#dc2626'],
  dark:    ['#0d0e14', '#050608'],
}
