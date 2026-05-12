// src/components/UI.js
// Professional Finance App Component Library

import React from 'react'
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../context/ThemeContext'
import { RADIUS, SPACING, SHADOWS, FONT, GRADIENTS } from '../utils/theme'

// ── useC hook — gets colors from theme context ────────────────
export const useC = () => useTheme().colors

// ── Card ──────────────────────────────────────────────────────
export const Card = ({ children, style, onPress, gradient }) => {
  const C = useC()
  const base = {
    backgroundColor: C.surface, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: C.border,
    padding: SPACING.lg, ...SHADOWS.card,
  }
  if (gradient) return (
    <LinearGradient colors={gradient} style={[base, style]}>{children}</LinearGradient>
  )
  if (onPress) return (
    <TouchableOpacity style={[base, style]} onPress={onPress} activeOpacity={0.85}>{children}</TouchableOpacity>
  )
  return <View style={[base, style]}>{children}</View>
}

// ── PrimaryButton ─────────────────────────────────────────────
export const PrimaryButton = ({ title, onPress, disabled, loading, icon, style, small, danger }) => {
  const colors = danger ? GRADIENTS.danger : GRADIENTS.accent
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.82} style={style}>
      <LinearGradient
        colors={disabled ? ['#2a2b40', '#1e2035'] : colors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.primaryBtn, small && styles.primaryBtnSm, (disabled || loading) && { opacity: 0.5 }]}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              {icon && <Text style={{ fontSize: small ? 14 : 16, marginRight: 7 }}>{icon}</Text>}
              <Text style={[styles.primaryBtnText, small && { fontSize: 13 }]}>{title}</Text>
            </>
        }
      </LinearGradient>
    </TouchableOpacity>
  )
}

// ── SecondaryButton ───────────────────────────────────────────
export const SecondaryButton = ({ title, onPress, disabled, icon, style, small }) => {
  const C = useC()
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled} activeOpacity={0.75}
      style={[{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.surface2, borderRadius: RADIUS.md,
        paddingVertical: small ? 10 : 13, paddingHorizontal: small ? 14 : 20,
        borderWidth: 1.5, borderColor: C.border2,
        opacity: disabled ? 0.45 : 1,
      }, style]}
    >
      {icon && <Text style={{ fontSize: 15, marginRight: 7 }}>{icon}</Text>}
      <Text style={{ color: C.text, fontWeight: '600', fontSize: small ? 13 : 14 }}>{title}</Text>
    </TouchableOpacity>
  )
}

// ── IconButton ─────────────────────────────────────────────────
export const IconButton = ({ icon, onPress, style, size = 40 }) => {
  const C = useC()
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}
      style={[{ width: size, height: size, borderRadius: size / 2.5, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.4 }}>{icon}</Text>
    </TouchableOpacity>
  )
}

// ── Input ─────────────────────────────────────────────────────
export const Input = ({ label, error, mono, right, style, inputStyle, ...props }) => {
  const C = useC()
  return (
    <View style={[{ marginBottom: SPACING.md }, style]}>
      {label && <Text style={[styles.label, { color: C.textSub }]}>{label}</Text>}
      <View style={[styles.inputWrap, { backgroundColor: C.surface2, borderColor: error ? C.danger : C.border }]}>
        <TextInput
          style={[styles.input, { color: C.text }, mono && { fontFamily: FONT.mono, fontSize: 12 }, inputStyle]}
          placeholderTextColor={C.textDim}
          {...props}
        />
        {right}
      </View>
      {error && <Text style={[styles.inputError, { color: C.danger }]}>{error}</Text>}
    </View>
  )
}

// ── Alert ─────────────────────────────────────────────────────
export const Alert = ({ type = 'info', children, style, icon }) => {
  const C = useC()
  const cfg = {
    danger:  { bg: C.dangerDim,  border: `${C.danger}40`,  text: C.danger,  defaultIcon: '⚠️' },
    success: { bg: C.successDim, border: `${C.success}40`, text: C.success, defaultIcon: '✅' },
    warning: { bg: C.warningDim, border: `${C.warning}40`, text: C.warning, defaultIcon: '⚡' },
    info:    { bg: C.accentDim,  border: `${C.accent}40`,  text: C.accent,  defaultIcon: 'ℹ️' },
  }[type] || {}
  return (
    <View style={[{ flexDirection: 'row', gap: 10, backgroundColor: cfg.bg, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: cfg.border, alignItems: 'flex-start' }, style]}>
      <Text style={{ fontSize: 14 }}>{icon || cfg.defaultIcon}</Text>
      <Text style={{ color: cfg.text, fontSize: 13, lineHeight: 19, flex: 1 }}>{children}</Text>
    </View>
  )
}

// ── Badge ─────────────────────────────────────────────────────
export const Badge = ({ label, type = 'muted', style }) => {
  const C = useC()
  const cfg = {
    success: { bg: C.successDim, text: C.success },
    danger:  { bg: C.dangerDim,  text: C.danger },
    warning: { bg: C.warningDim, text: C.warning },
    accent:  { bg: C.accentDim,  text: C.accent },
    muted:   { bg: C.surface3,   text: C.textSub },
  }[type] || { bg: C.surface3, text: C.textSub }
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: cfg.bg, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: cfg.text, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export const Spinner = ({ size = 'small', fullScreen }) => {
  const C = useC()
  if (fullScreen) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  )
  return <ActivityIndicator size={size} color={C.accent} />
}

// ── InfoRow ───────────────────────────────────────────────────
export const InfoRow = ({ label, value, mono, last }) => {
  const C = useC()
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Text style={[styles.infoLabel, { color: C.textSub }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: C.text }, mono && { fontFamily: FONT.mono, fontSize: 11 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

// ── Divider ───────────────────────────────────────────────────
export const Divider = ({ style }) => {
  const C = useC()
  return <View style={[{ height: 1, backgroundColor: C.border, marginVertical: SPACING.md }, style]} />
}

// ── SectionHeader ─────────────────────────────────────────────
export const SectionHeader = ({ title, action, onAction }) => {
  const C = useC()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: C.textSub }}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={{ color: C.accent, fontSize: 13, fontWeight: '600' }}>{action}</Text></TouchableOpacity>}
    </View>
  )
}

// ── Tag ───────────────────────────────────────────────────────
export const Tag = ({ label, color, onPress }) => {
  const C = useC()
  const base = { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5 }
  const active = color
    ? { backgroundColor: `${color}18`, borderColor: `${color}50` }
    : { backgroundColor: C.accentDim, borderColor: `${C.accent}50` }
  const textColor = color || C.accent
  if (onPress) return (
    <TouchableOpacity style={[base, active]} onPress={onPress} activeOpacity={0.75}>
      <Text style={{ color: textColor, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  )
  return (
    <View style={[base, active]}>
      <Text style={{ color: textColor, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  )
}

// ── Pill selector (horizontal row) ────────────────────────────
export const PillRow = ({ options, selected, onSelect, colorMap }) => {
  const C = useC()
  return options.map(opt => {
    const isSelected = selected === opt
    const col = colorMap?.[opt] || C.accent
    return (
      <TouchableOpacity key={opt}
        style={[styles.pill, { borderColor: isSelected ? col : C.border, backgroundColor: isSelected ? `${col}18` : C.surface2 }]}
        onPress={() => onSelect(opt)} activeOpacity={0.7}
      >
        <Text style={{ color: isSelected ? col : C.textSub, fontWeight: isSelected ? '700' : '500', fontSize: 12 }}>
          {opt}
        </Text>
      </TouchableOpacity>
    )
  })
}

// ── StatCard ──────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon, color, style }) => {
  const C = useC()
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.border, flex: 1 }, style]}>
      {icon && <Text style={{ fontSize: 22, marginBottom: 8 }}>{icon}</Text>}
      <Text style={{ fontSize: 10, color: C.textSub, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 20, fontWeight: '800', color: color || C.text, letterSpacing: -0.5 }}>{value}</Text>
      {sub && <Text style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{sub}</Text>}
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, paddingVertical: 15, paddingHorizontal: 22, ...SHADOWS.accent },
  primaryBtnSm: { paddingVertical: 10, paddingHorizontal: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.1 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginBottom: 7, textTransform: 'uppercase' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },
  input: { flex: 1, fontSize: 15, padding: 0 },
  inputError: { fontSize: 11, marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  infoLabel: { fontSize: 13, flex: 1 },
  infoValue: { fontWeight: '600', fontSize: 13, maxWidth: 220, textAlign: 'right' },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, marginRight: 8 },
})
