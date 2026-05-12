// src/screens/vcc/PhysicalCardScreen.js
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { requestPhysicalCard, getShippingFees } from '../../services/supabase/cardService'
import { COLORS, SPACING, RADIUS } from '../../utils/theme'
import { Card, PrimaryButton, SecondaryButton, Input, Alert, Spinner, InfoRow } from '../../components/UI'
import Toast from 'react-native-toast-message'

const CARD_COST_USD = 50

export default function PhysicalCardScreen({ route, navigation }) {
  const card = route?.params?.card
  const [shippingFees, setShippingFees] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [step, setStep] = useState('address')   // address | confirm | done
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [fullName,   setFullName]   = useState('')
  const [address1,   setAddress1]   = useState('')
  const [address2,   setAddress2]   = useState('')
  const [city,       setCity]       = useState('')
  const [state,      setState]      = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone,      setPhone]      = useState('')
  const [error,      setError]      = useState('')

  useEffect(() => {
    getShippingFees().then(fees => { setShippingFees(fees); setSelectedCountry(fees[0]); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const totalUSD = selectedCountry ? CARD_COST_USD + parseFloat(selectedCountry.fee_usd) : CARD_COST_USD

  const validate = () => {
    setError('')
    if (!fullName.trim())   { setError('Enter full name'); return false }
    if (!address1.trim())   { setError('Enter address line 1'); return false }
    if (!city.trim())       { setError('Enter city'); return false }
    if (!postalCode.trim()) { setError('Enter postal code'); return false }
    if (!selectedCountry)   { setError('Select country'); return false }
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await requestPhysicalCard({
        card_id:      card?.id,
        full_name:    fullName,
        address_line1: address1,
        address_line2: address2,
        city, state,
        postal_code:  postalCode,
        country:      selectedCountry.country,
        phone,
        shipping_fee: selectedCountry.fee_usd,
        total_usd:    totalUSD,
      })
      setStep('done')
      Toast.show({ type: 'success', text1: 'Physical card ordered! 📦' })
    } catch (err) { Toast.show({ type: 'error', text1: err.message }) }
    setSubmitting(false)
  }

  if (loading) return <View style={styles.centered}><Spinner size="large" /></View>

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {step === 'address' && (
          <>
            <Card style={{ marginBottom: SPACING.md }}>
              <Text style={styles.cardTitle}>Order Physical Card</Text>
              <Text style={styles.cardDesc}>Your virtual card design will be printed on a real card and shipped to you.</Text>
              <View style={styles.costRow}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Card Cost</Text>
                <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16 }}>${CARD_COST_USD}.00</Text>
              </View>
              {selectedCountry && (
                <View style={styles.costRow}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Shipping ({selectedCountry.est_days} days)</Text>
                  <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 16 }}>${selectedCountry.fee_usd}</Text>
                </View>
              )}
              <View style={[styles.costRow, styles.totalRow]}>
                <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15 }}>Total</Text>
                <Text style={{ color: COLORS.accent, fontWeight: '800', fontSize: 18 }}>${totalUSD.toFixed(2)} USD</Text>
              </View>
            </Card>

            {error ? <Alert type="danger">{error}</Alert> : null}

            <Card>
              <Text style={styles.sectionLabel}>Shipping Address</Text>
              <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="As on official ID" autoCapitalize="words" />
              <Input label="Address Line 1" value={address1} onChangeText={setAddress1} placeholder="Street, Building" />
              <Input label="Address Line 2 (optional)" value={address2} onChangeText={setAddress2} placeholder="Apt, Suite, Floor" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Input label="City" value={city} onChangeText={setCity} placeholder="City" /></View>
                <View style={{ flex: 1 }}><Input label="State/Region" value={state} onChangeText={setState} placeholder="State" /></View>
              </View>
              <Input label="Postal Code" value={postalCode} onChangeText={setPostalCode} placeholder="ZIP/PIN" keyboardType="numeric" />
              <Input label="Phone (for delivery)" value={phone} onChangeText={setPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />

              <Text style={styles.sectionLabel}>Country</Text>
              <ScrollView style={styles.countryList} nestedScrollEnabled showsVerticalScrollIndicator>
                {shippingFees.map(f => (
                  <TouchableOpacity key={f.id} style={[styles.countryRow, selectedCountry?.id === f.id && styles.countryRowActive]}
                    onPress={() => setSelectedCountry(f)}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.countryName, selectedCountry?.id === f.id && { color: COLORS.accent }]}>{f.country}</Text>
                      <Text style={styles.countryMeta}>{f.est_days} business days</Text>
                    </View>
                    <Text style={{ color: selectedCountry?.id === f.id ? COLORS.accent : COLORS.textMuted, fontWeight: '700' }}>
                      ${f.fee_usd}
                    </Text>
                    {selectedCountry?.id === f.id && <Text style={{ color: COLORS.accent, marginLeft: 8 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Alert type="warning" style={{ marginTop: SPACING.md }}>
                Physical card requests are irreversible. Ensure your address is correct before confirming.
              </Alert>

              <PrimaryButton title="Review Order →" onPress={() => { if (validate()) setStep('confirm') }} style={{ marginTop: SPACING.md }} />
            </Card>
          </>
        )}

        {step === 'confirm' && (
          <Card>
            <Text style={styles.cardTitle}>Confirm Order</Text>
            <InfoRow label="Name"     value={fullName} />
            <InfoRow label="Address"  value={`${address1}${address2 ? ', ' + address2 : ''}`} />
            <InfoRow label="City"     value={`${city}${state ? ', ' + state : ''}`} />
            <InfoRow label="Postal"   value={postalCode} />
            <InfoRow label="Country"  value={selectedCountry?.country} />
            <InfoRow label="Phone"    value={phone || '—'} />
            <InfoRow label="Shipping" value={`${selectedCountry?.est_days} days · $${selectedCountry?.fee_usd}`} />
            <InfoRow label="Total"    value={`$${totalUSD.toFixed(2)} USD`} last />
            <Alert type="info" style={{ marginTop: SPACING.md }}>
              Payment of ${totalUSD.toFixed(2)} will be deducted from your crypto wallet balance at current market rate.
            </Alert>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: SPACING.md }}>
              <SecondaryButton title="← Edit" onPress={() => setStep('address')} style={{ flex: 1 }} />
              <PrimaryButton title="Confirm Order 📦" onPress={handleSubmit} loading={submitting} style={{ flex: 1.3 }} />
            </View>
          </Card>
        )}

        {step === 'done' && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>📦</Text>
            <Text style={styles.cardTitle}>Order Placed!</Text>
            <Text style={{ color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg }}>
              Your physical card is being prepared. Expected delivery: {selectedCountry?.est_days} business days to {selectedCountry?.country}.
            </Text>
            <Card style={{ width: '100%', marginBottom: SPACING.lg }}>
              <InfoRow label="Total Paid" value={`$${totalUSD.toFixed(2)} USD`} />
              <InfoRow label="Destination" value={selectedCountry?.country} />
              <InfoRow label="Est. Delivery" value={selectedCountry?.est_days + ' business days'} last />
            </Card>
            <PrimaryButton title="Back to Cards" onPress={() => navigation.navigate('Cards')} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:  { padding: SPACING.md, paddingBottom: 40 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  cardTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: SPACING.md },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 10, marginTop: 4 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  totalRow: { borderBottomWidth: 0, marginTop: 4 },
  countryList: { maxHeight: 220, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  countryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  countryRowActive: { backgroundColor: COLORS.accentDim },
  countryName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  countryMeta: { fontSize: 11, color: COLORS.textDim, marginTop: 1 },
})
