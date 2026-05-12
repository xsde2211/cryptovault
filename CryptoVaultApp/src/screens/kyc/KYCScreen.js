// src/screens/kyc/KYCScreen.js
// FIXES:
// 1. uploadKYCFile now uses ArrayBuffer (not Blob) — works in React Native
// 2. user_id injected in submitKYC via cardService (not here) — fixes RLS
// 3. Upload is now optional — user can proceed and submit without uploading

import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { submitKYC, getMyKYC, generateUniqueCode, uploadKYCFile } from '../../services/supabase/cardService'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Input, Alert, Badge, Spinner, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

const STEPS    = ['Identity', 'Selfie', 'Document', 'Review']
const DOC_TYPES = ['Passport', 'Driving Licence', 'Identity Card', 'Other']
const DOC_ICONS = { Passport: '🛂', 'Driving Licence': '🚗', 'Identity Card': '🪪', Other: '📄' }

export default function KYCScreen({ navigation }) {
  const { colors } = useTheme()
  const s = makeStyles(colors)

  const [step,        setStep]        = useState(0)
  const [existingKYC, setExistingKYC] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [submitting,  setSubmitting]  = useState(false)

  // Step 0
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [address,  setAddress]  = useState('')

  // Step 1 — Selfie
  const [selfieMode,      setSelfieMode]      = useState('code')
  const [uniqueCode,      setUniqueCode]      = useState('')
  const [selfieUri,       setSelfieUri]       = useState(null)
  const [selfieUrl,       setSelfieUrl]       = useState(null)
  const [selfieUploading, setSelfieUploading] = useState(false)

  // Step 2 — Document
  const [docType,      setDocType]      = useState('Passport')
  const [docUri,       setDocUri]       = useState(null)
  const [docUrl,       setDocUrl]       = useState(null)
  const [docUploading, setDocUploading] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    getMyKYC()
      .then(kyc => { setExistingKYC(kyc) })
      .catch(() => {})
      .finally(() => setLoading(false))
    setUniqueCode(generateUniqueCode())
  }, [])

  // ── Pick & Upload Selfie ───────────────────────────────────
  const pickSelfie = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync()
    if (!granted) { Toast.show({ type: 'error', text1: 'Camera permission required' }); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
    if (result.canceled || !result.assets?.[0]) return
    const uri = result.assets[0].uri
    setSelfieUri(uri); setSelfieUploading(true)
    try {
      // uploadKYCFile uses ArrayBuffer — works in RN
      const url = await uploadKYCFile(uri, 'selfies')
      setSelfieUrl(url)
      Toast.show({ type: 'success', text1: 'Selfie uploaded ✅' })
    } catch (err) {
      Toast.show({ type: 'warning', text1: 'Upload skipped — will submit without selfie URL' })
      // Don't block flow — let user proceed
    }
    setSelfieUploading(false)
  }

  // ── Pick & Upload Document ─────────────────────────────────
  const pickDoc = async (fromCamera = false) => {
    setDocUploading(true)
    try {
      let uri = null
      if (fromCamera) {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync()
        if (!granted) { Toast.show({ type: 'error', text1: 'Camera permission required' }); setDocUploading(false); return }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.9 })
        if (!result.canceled && result.assets?.[0]) uri = result.assets[0].uri
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.9 })
        if (!result.canceled && result.assets?.[0]) uri = result.assets[0].uri
      }
      if (!uri) { setDocUploading(false); return }
      setDocUri(uri)
      try {
        const url = await uploadKYCFile(uri, 'docs')
        setDocUrl(url)
        Toast.show({ type: 'success', text1: 'Document uploaded ✅' })
      } catch {
        Toast.show({ type: 'warning', text1: 'Upload skipped — will submit without doc URL' })
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setDocUploading(false)
  }

  const pickDocFile = async () => {
    setDocUploading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'] })
      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri
        setDocUri(uri)
        try {
          const url = await uploadKYCFile(uri, 'docs')
          setDocUrl(url)
          Toast.show({ type: 'success', text1: 'Document uploaded ✅' })
        } catch {
          Toast.show({ type: 'warning', text1: 'Upload skipped — will submit without doc URL' })
        }
      }
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setDocUploading(false)
  }

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!fullName.trim())                      { setError('Enter your full name'); return false }
      if (!email.includes('@'))                  { setError('Enter a valid email'); return false }
      if (phone.length < 7)                      { setError('Enter a valid phone number'); return false }
      if (!address.trim())                       { setError('Enter your full address'); return false }
    }
    if (step === 1 && !selfieUri)                { setError('Please take a selfie photo first'); return false }
    if (step === 2 && !docUri)                   { setError('Please upload a document photo first'); return false }
    return true
  }

  const handleNext = () => {
    if (!validateStep()) return
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitKYC({
        // user_id is injected inside submitKYC via getCurrentUserId()
        full_name:   fullName,
        email,
        phone,
        address,
        selfie_url:  selfieUrl  || null,
        unique_code: selfieMode === 'code' ? uniqueCode : null,
        doc_type:    docType,
        doc_url:     docUrl    || null,
        kyc_type:    'personal',
      })
      Toast.show({ type: 'success', text1: 'KYC submitted! Under review 🎉' })
      navigation.goBack()
    } catch (err) {
      Toast.show({ type: 'error', text1: err.message })
    }
    setSubmitting(false)
  }

  if (loading) return <View style={s.centered}><Spinner size="large" /></View>

  // ── Existing KYC status ────────────────────────────────────
  if (existingKYC) {
    const statusIcon = { approved: '✅', rejected: '❌', pending: '⏳' }[existingKYC.status] || '⏳'
    return (
      <SafeAreaView style={s.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>{statusIcon}</Text>
            <Text style={[s.cardTitle, { color: colors.text }]}>
              KYC {existingKYC.status.charAt(0).toUpperCase() + existingKYC.status.slice(1)}
            </Text>
            <Badge label={existingKYC.status} type={existingKYC.status === 'approved' ? 'success' : existingKYC.status === 'rejected' ? 'danger' : 'warning'} style={{ marginBottom: SPACING.lg }} />
            <Text style={{ color: colors.textSub, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.lg }}>
              {existingKYC.status === 'pending'
                ? 'Your KYC is under review. This typically takes 1–2 business days.'
                : existingKYC.status === 'approved'
                ? 'Identity verified! You can now apply for virtual cards.'
                : `Rejected: ${existingKYC.notes || 'Please resubmit with clearer documents.'}`}
            </Text>
            <Card style={{ width: '100%' }}>
              <InfoRow label="Name"      value={existingKYC.full_name} />
              <InfoRow label="Email"     value={existingKYC.email} />
              <InfoRow label="Doc Type"  value={existingKYC.doc_type} />
              <InfoRow label="Submitted" value={new Date(existingKYC.created_at).toLocaleDateString()} last />
            </Card>
            {existingKYC.status === 'rejected' && (
              <PrimaryButton title="Resubmit KYC" onPress={() => setExistingKYC(null)} style={{ marginTop: SPACING.lg, width: '100%' }} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Progress bar */}
        <View style={{ marginBottom: SPACING.lg }}>
          <View style={s.stepRow}>
            {STEPS.map((st, i) => (
              <View key={st} style={{ alignItems: 'center', flex: 1 }}>
                <View style={[s.stepDot,
                  i < step  && { backgroundColor: colors.success,  borderColor: colors.success },
                  i === step && { backgroundColor: colors.accentDim, borderColor: colors.accent },
                ]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: i <= step ? (i < step ? '#fff' : colors.accent) : colors.textSub }}>
                    {i < step ? '✓' : i + 1}
                  </Text>
                </View>
                <Text style={{ fontSize: 9, marginTop: 5, color: i === step ? colors.accent : colors.textDim, fontWeight: i === step ? '700' : '400' }}>{st}</Text>
              </View>
            ))}
          </View>
          <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[s.progressFill, { width: `${(step / (STEPS.length - 1)) * 100}%`, backgroundColor: colors.accent }]} />
          </View>
        </View>

        {error ? <Alert type="danger" style={{ marginBottom: SPACING.md }}>{error}</Alert> : null}

        {/* ── STEP 0: Identity ── */}
        {step === 0 && (
          <Card>
            <Text style={[s.cardTitle, { color: colors.text }]}>Personal Information</Text>
            <Text style={[s.cardDesc, { color: colors.textSub }]}>Required for identity verification and regulatory compliance.</Text>
            <Input label="Full Legal Name" value={fullName} onChangeText={setFullName} placeholder="As shown on your ID" autoCapitalize="words" />
            <Input label="Email Address"   value={email}    onChangeText={setEmail}    placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Phone Number"    value={phone}    onChangeText={setPhone}    placeholder="+1 555 000 0000" keyboardType="phone-pad" />
            <Input label="Full Address"    value={address}  onChangeText={setAddress}  placeholder="Street, City, Country, ZIP" />
            <PrimaryButton title="Continue →" onPress={handleNext} />
          </Card>
        )}

        {/* ── STEP 1: Selfie ── */}
        {step === 1 && (
          <Card>
            <Text style={[s.cardTitle, { color: colors.text }]}>Identity Selfie</Text>

            {/* Mode selector */}
            <View style={[s.modeRow, { backgroundColor: colors.surface2 }]}>
              {[['code','🤳 Code Selfie'],['video','👁 Eye Blink']].map(([m, l]) => (
                <TouchableOpacity key={m}
                  style={[s.modeBtn, selfieMode === m && { backgroundColor: colors.surface, ...SHADOWS.sm }]}
                  onPress={() => setSelfieMode(m)}
                >
                  <Text style={{ color: selfieMode === m ? colors.text : colors.textSub, fontWeight: '600', fontSize: 13 }}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selfieMode === 'code' && (
              <View style={[s.codeBox, { backgroundColor: colors.surface2, borderColor: `${colors.accent}30` }]}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSub, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                  Your Unique Code
                </Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color: colors.accent, letterSpacing: 5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' }}>
                  {uniqueCode}
                </Text>
                <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 10, textAlign: 'center' }}>
                  Write this on white paper, hold it in your selfie
                </Text>
              </View>
            )}

            {selfieMode === 'video' && (
              <Alert type="info" style={{ marginBottom: SPACING.md }}>
                Record a 3–5 second video looking straight at camera and blinking both eyes slowly.
              </Alert>
            )}

            {selfieUri ? (
              <View style={{ marginBottom: SPACING.md }}>
                <Image source={{ uri: selfieUri }} style={s.previewImg} />
                {selfieUploading
                  ? <View style={s.uploadOverlay}><Spinner /><Text style={{ color: '#fff', marginTop: 8 }}>Uploading…</Text></View>
                  : selfieUrl
                    ? <View style={[s.uploadBadge, { backgroundColor: `${colors.success}20`, borderColor: colors.success }]}><Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>✓ Uploaded</Text></View>
                    : <View style={[s.uploadBadge, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}><Text style={{ color: colors.warning, fontWeight: '700', fontSize: 12 }}>⚠ Saved locally</Text></View>
                }
                <TouchableOpacity onPress={() => { setSelfieUri(null); setSelfieUrl(null) }} style={s.retakeBtn}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[s.uploadBox, { backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={pickSelfie}>
                <Text style={{ fontSize: 44, marginBottom: 10 }}>📷</Text>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Open Camera</Text>
                <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 4 }}>
                  {selfieMode === 'code' ? 'Take selfie holding the code paper' : 'Record yourself blinking'}
                </Text>
              </TouchableOpacity>
            )}

            <Alert type="info" style={{ marginBottom: SPACING.md }}>
              Face must be fully visible · Good lighting · No sunglasses
            </Alert>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton title="← Back" onPress={() => setStep(0)} style={{ flex: 1 }} />
              <PrimaryButton title="Continue →" onPress={handleNext} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* ── STEP 2: Document ── */}
        {step === 2 && (
          <Card>
            <Text style={[s.cardTitle, { color: colors.text }]}>Upload Document</Text>
            <Text style={[s.cardDesc, { color: colors.textSub }]}>Government-issued ID · All corners must be visible</Text>

            <View style={s.docGrid}>
              {DOC_TYPES.map(dt => (
                <TouchableOpacity key={dt}
                  style={[s.docBtn, { backgroundColor: docType === dt ? colors.accentDim : colors.surface2, borderColor: docType === dt ? `${colors.accent}60` : colors.border }]}
                  onPress={() => setDocType(dt)}
                >
                  <Text style={{ fontSize: 26, marginBottom: 6 }}>{DOC_ICONS[dt]}</Text>
                  <Text style={{ color: docType === dt ? colors.accent : colors.textSub, fontSize: 11, fontWeight: '600', textAlign: 'center' }}>{dt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {docUri ? (
              <View style={{ marginBottom: SPACING.md }}>
                <Image source={{ uri: docUri }} style={s.previewImg} />
                {docUploading
                  ? <View style={s.uploadOverlay}><Spinner /><Text style={{ color: '#fff', marginTop: 8 }}>Uploading…</Text></View>
                  : docUrl
                    ? <View style={[s.uploadBadge, { backgroundColor: `${colors.success}20`, borderColor: colors.success }]}><Text style={{ color: colors.success, fontWeight: '700', fontSize: 12 }}>✓ Uploaded</Text></View>
                    : <View style={[s.uploadBadge, { backgroundColor: `${colors.warning}20`, borderColor: colors.warning }]}><Text style={{ color: colors.warning, fontWeight: '700', fontSize: 12 }}>⚠ Saved locally</Text></View>
                }
                <TouchableOpacity onPress={() => { setDocUri(null); setDocUrl(null) }} style={s.retakeBtn}>
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: SPACING.md }}>
                <TouchableOpacity style={[s.uploadBox, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => pickDoc(true)}>
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>📷</Text>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.uploadBox, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={() => pickDoc(false)}>
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>🖼️</Text>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.uploadBox, { flex: 1, backgroundColor: colors.surface2, borderColor: colors.border }]} onPress={pickDocFile}>
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>📁</Text>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>File</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <SecondaryButton title="← Back" onPress={() => setStep(1)} style={{ flex: 1 }} />
              <PrimaryButton title="Continue →" onPress={handleNext} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <Card>
            <Text style={[s.cardTitle, { color: colors.text }]}>Review & Submit</Text>
            {[
              { label: 'Full Name', value: fullName },
              { label: 'Email',     value: email },
              { label: 'Phone',     value: phone },
              { label: 'Address',   value: address },
              { label: 'Doc Type',  value: docType },
              { label: 'Selfie',    value: selfieUri ? '✓ Taken' : '✗ Missing' },
              { label: 'Document',  value: docUri    ? '✓ Taken' : '✗ Missing' },
            ].map((r, i, arr) => (
              <InfoRow key={r.label} label={r.label} value={r.value} last={i === arr.length - 1} />
            ))}
            <Alert type="info" style={{ marginTop: SPACING.md }}>
              By submitting you confirm all information is accurate. False information may result in account suspension.
            </Alert>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: SPACING.md }}>
              <SecondaryButton title="← Back" onPress={() => setStep(2)} style={{ flex: 1 }} />
              <PrimaryButton title="Submit KYC 🚀" onPress={handleSubmit} loading={submitting} style={{ flex: 1.3 }} />
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (C) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  scroll:  { padding: SPACING.lg, paddingBottom: 50 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.border },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 4 },
  progressFill:  { height: 3, borderRadius: 2 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  cardDesc:  { fontSize: 13, lineHeight: 19, marginBottom: SPACING.md },
  modeRow:   { flexDirection: 'row', borderRadius: RADIUS.md, padding: 4, marginBottom: SPACING.md },
  modeBtn:   { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: 'center' },
  codeBox:   { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', marginBottom: SPACING.md, borderWidth: 1 },
  uploadBox: { borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', marginBottom: SPACING.md },
  previewImg:    { width: '100%', height: 200, borderRadius: RADIUS.lg, marginBottom: SPACING.sm },
  uploadOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  uploadBadge:   { position: 'absolute', top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  retakeBtn:     { alignItems: 'center', paddingVertical: 10, marginTop: 4 },
  docGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.md },
  docBtn:    { width: '47%', padding: 16, borderRadius: RADIUS.lg, alignItems: 'center', borderWidth: 1.5 },
})
