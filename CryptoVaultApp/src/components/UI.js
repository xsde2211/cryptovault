// src/components/UI.js
// All reusable UI primitives — equivalent to the web CSS classes

import React from 'react'
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, RADIUS, SPACING, SHADOWS } from '../utils/theme'

// ── Card ───────────────────────────────────────────────────────────────
export const Card = ({ children, style, glow }) => (
  <View style={[styles.card, glow && styles.cardGlow, style]}>
    {children}
  </View>
)

// ── Primary Button ─────────────────────────────────────────────────────
export const PrimaryButton = ({ title, onPress, disabled, loading, icon, style }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.82} style={style}>
    <LinearGradient
      colors={disabled ? ['#3a3660', '#2a3450'] : ['#7c6ff7', '#4facfe']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={[styles.primaryBtn, disabled && { opacity: 0.45 }]}
    >
      {loading
        ? <ActivityIndicator color="#fff" size="small" />
        : <>
            {icon && <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>}
            <Text style={styles.primaryBtnText}>{title}</Text>
          </>
      }
    </LinearGradient>
  </TouchableOpacity>
)

// ── Secondary Button ───────────────────────────────────────────────────
export const SecondaryButton = ({ title, onPress, disabled, icon, style }) => (
  <TouchableOpacity
    onPress={onPress} disabled={disabled} activeOpacity={0.75}
    style={[styles.secondaryBtn, disabled && { opacity: 0.4 }, style]}
  >
    {icon && <Text style={{ fontSize: 15, marginRight: 7 }}>{icon}</Text>}
    <Text style={styles.secondaryBtnText}>{title}</Text>
  </TouchableOpacity>
)

// ── Ghost Button ───────────────────────────────────────────────────────
export const GhostButton = ({ title, onPress, style, textStyle }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={style}>
    <Text style={[{ color: COLORS.textMuted, fontSize: 14 }, textStyle]}>{title}</Text>
  </TouchableOpacity>
)

// ── Input ──────────────────────────────────────────────────────────────
export const Input = ({ label, error, mono, ...props }) => (
  <View style={{ marginBottom: SPACING.md }}>
    {label && <Text style={styles.label}>{label}</Text>}
    <TextInput
      style={[styles.input, mono && styles.inputMono, error && styles.inputError]}
      placeholderTextColor={COLORS.textDim}
      {...props}
    />
    {error && <Text style={styles.inputErrorText}>{error}</Text>}
  </View>
)

// ── Alert ──────────────────────────────────────────────────────────────
export const Alert = ({ type = 'info', children, style }) => {
  const configs = {
    danger:  { bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.3)',  text: '#fca5a5' },
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d' },
    info:    { bg: 'rgba(124,111,247,0.12)',border: 'rgba(124,111,247,0.3)',text: '#a5b4fc' },
  }
  const c = configs[type] || configs.info
  return (
    <View style={[styles.alert, { backgroundColor: c.bg, borderColor: c.border }, style]}>
      <Text style={{ color: c.text, fontSize: 13, lineHeight: 19 }}>{children}</Text>
    </View>
  )
}

// ── Badge ──────────────────────────────────────────────────────────────
export const Badge = ({ label, type = 'muted', style }) => {
  const configs = {
    success: { bg: 'rgba(16,185,129,0.12)',  text: '#10b981' },
    danger:  { bg: 'rgba(244,63,94,0.12)',   text: '#f43f5e' },
    warning: { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
    accent:  { bg: 'rgba(124,111,247,0.15)', text: '#7c6ff7' },
    muted:   { bg: COLORS.surface3,          text: COLORS.textMuted },
  }
  const c = configs[type] || configs.muted
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={{ color: c.text, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

// ── Section Header ─────────────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={{ color: COLORS.accent, fontSize: 13 }}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
)

// ── Row (key-value) ────────────────────────────────────────────────────
export const InfoRow = ({ label, value, mono, last }) => (
  <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, mono && { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 11 }]} numberOfLines={1}>
      {value}
    </Text>
  </View>
)

// ── Divider ────────────────────────────────────────────────────────────
export const Divider = ({ style }) => (
  <View style={[{ height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md }, style]} />
)

// ── Network dot ────────────────────────────────────────────────────────
export const NetworkDot = ({ color, size = 8 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
)

// ── Copy box ───────────────────────────────────────────────────────────
export const CopyBox = ({ text, onCopy }) => (
  <TouchableOpacity style={styles.copyBox} onPress={onCopy} activeOpacity={0.7}>
    <Text style={styles.copyText} numberOfLines={2}>{text}</Text>
    <Text style={{ fontSize: 16 }}>📋</Text>
  </TouchableOpacity>
)

// ── Loading Spinner ────────────────────────────────────────────────────
export const Spinner = ({ size = 'small', color = COLORS.accent, fullScreen }) => {
  if (fullScreen) return (
    <View style={styles.spinnerFull}>
      <ActivityIndicator size="large" color={color} />
    </View>
  )
  return <ActivityIndicator size={size} color={color} />
}

// ── Screen Wrapper ─────────────────────────────────────────────────────
export const ScreenTitle = ({ title, subtitle }) => (
  <View style={{ marginBottom: SPACING.lg }}>
    <Text style={styles.screenTitle}>{title}</Text>
    {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
  </View>
)

// ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  cardGlow: {
    borderColor: 'rgba(124,111,247,0.3)',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...SHADOWS.accent,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingVertical: 13, paddingHorizontal: 20,
    borderWidth: 1, borderColor: COLORS.border2,
  },
  secondaryBtnText: { color: COLORS.text, fontWeight: '600', fontSize: 14 },
  label: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    paddingVertical: 12, paddingHorizontal: 14,
    color: COLORS.text, fontSize: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  inputMono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12 },
  inputError: { borderColor: COLORS.danger },
  inputErrorText: { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  alert: {
    borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 100, alignSelf: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: COLORS.textMuted,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
  },
  infoLabel: { color: COLORS.textMuted, fontSize: 13, flex: 1 },
  infoValue: { color: COLORS.text, fontWeight: '600', fontSize: 13, maxWidth: 220, textAlign: 'right' },
  copyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md, padding: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  copyText: {
    flex: 1, color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11, lineHeight: 18,
  },
  spinnerFull: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  screenTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14, color: COLORS.textMuted, marginTop: 4, lineHeight: 20,
  },
})
