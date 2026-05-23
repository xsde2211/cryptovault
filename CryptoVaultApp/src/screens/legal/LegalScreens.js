// src/screens/legal/LegalScreens.js
// All compliance pages required for Razorpay merchant approval.
// Add these to your navigator as stack screens.
// Usage: navigation.navigate('TermsAndConditions')

import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../context/ThemeContext'
import { SPACING, RADIUS } from '../../utils/theme'

const COMPANY = {
  name:    'CryptoVault Technologies Pvt. Ltd.',
  email:   'support@cryptovault.app',
  phone:   '+91-8383890370',
  address: 'Shastri Nagar, North West Delhi, Delhi-110052, India',
  // GSTIN: Add this once your business is GST-registered (required above ₹20L/year turnover)
}

const LegalPage = ({ navigation, title, children }) => {
  const { colors } = useTheme()
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ color: colors.accent, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', flex: 1 }}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 60 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const Section = ({ title, children, colors }) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 8 }}>{title}</Text>
    <Text style={{ color: colors.textSub, fontSize: 14, lineHeight: 22 }}>{children}</Text>
  </View>
)

// ══════════════════════════════════════════════════════════════════════════
// TERMS AND CONDITIONS
// ══════════════════════════════════════════════════════════════════════════
export const TermsAndConditionsScreen = ({ navigation }) => {
  const { colors } = useTheme()
  return (
    <LegalPage navigation={navigation} title="Terms & Conditions">
      <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 20 }}>Last updated: January 2025</Text>

      <Section title="1. Acceptance of Terms" colors={colors}>
        By using CryptoVault ("the App"), you agree to these Terms and Conditions. If you do not agree, do not use the App. These terms govern your use of our peer-to-peer cryptocurrency trading platform and related services.
      </Section>

      <Section title="2. Eligibility" colors={colors}>
        You must be at least 18 years of age to use this platform. By using the App, you represent that you meet this requirement and that you are legally permitted to engage in cryptocurrency transactions in your jurisdiction.
      </Section>

      <Section title="3. P2P Trading & Escrow" colors={colors}>
        Our P2P marketplace facilitates direct trades between users. When a sell listing is created, the seller's cryptocurrency is locked in a smart-contract escrow controlled by CryptoVault. Upon successful payment, crypto is automatically released to the buyer. CryptoVault acts as a facilitator only and is not a party to any individual trade.
      </Section>

      <Section title="4. Payments via Razorpay" colors={colors}>
        Fiat payments on this platform are processed by Razorpay Software Private Limited ("Razorpay"), a licensed payment aggregator. Your payment data is processed by Razorpay and subject to their Privacy Policy. CryptoVault does not store your card or banking details.
      </Section>

      <Section title="5. No Guarantee of Returns" colors={colors}>
        Cryptocurrency values are highly volatile. CryptoVault does not guarantee any returns, profits, or exchange rates. All trading decisions are made at your own risk.
      </Section>

      <Section title="6. KYC Requirements" colors={colors}>
        Certain features may require you to complete identity verification (KYC). You agree to provide accurate and complete information. False information may result in account suspension.
      </Section>

      <Section title="7. Prohibited Activities" colors={colors}>
        {`You may not use this platform for:
• Money laundering or financing illegal activities
• Evading taxes or regulatory requirements
• Market manipulation or fraudulent trading
• Creating fake listings or orders
• Any activity that violates applicable law`}
      </Section>

      <Section title="8. Dispute Resolution" colors={colors}>
        In the event of a trade dispute, CryptoVault will review evidence from both parties and make a binding decision. Disputes must be raised within 48 hours of trade expiry. CryptoVault's decision is final.
      </Section>

      <Section title="9. Limitation of Liability" colors={colors}>
        CryptoVault is not liable for losses arising from blockchain network failures, smart contract bugs, market volatility, or third-party service failures (including Razorpay). Our total liability is capped at the transaction fees paid in the prior 30 days.
      </Section>

      <Section title="10. Governing Law" colors={colors}>
        These terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in [Your City], India.
      </Section>

      <Section title="Contact" colors={colors}>
        {`${COMPANY.name}\nEmail: ${COMPANY.email}\nPhone: ${COMPANY.phone}\n${COMPANY.address}`}
      </Section>
    </LegalPage>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// PRIVACY POLICY
// ══════════════════════════════════════════════════════════════════════════
export const PrivacyPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme()
  return (
    <LegalPage navigation={navigation} title="Privacy Policy">
      <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 20 }}>Last updated: January 2025</Text>

      <Section title="1. Information We Collect" colors={colors}>
        {`• Account information: email, name, phone (for KYC)
• Identity documents: uploaded during KYC verification
• Transaction data: trade amounts, wallet addresses, timestamps
• Device information: device type, OS, IP address for fraud prevention
• Payment data: processed by Razorpay; we do not store card details`}
      </Section>

      <Section title="2. How We Use Your Data" colors={colors}>
        {`• To provide P2P trading services
• To comply with KYC/AML regulations
• To prevent fraud and abuse
• To send transactional notifications
• To improve our services`}
      </Section>

      <Section title="3. Data Sharing" colors={colors}>
        We share data with: Razorpay (payment processing), Supabase (infrastructure), and regulatory authorities when legally required. We do not sell your data to third parties.
      </Section>

      <Section title="4. Blockchain Data" colors={colors}>
        Blockchain transactions are public and irreversible. Wallet addresses and transaction amounts may be visible on public block explorers. We cannot delete this data.
      </Section>

      <Section title="5. Data Retention" colors={colors}>
        We retain transaction data for 7 years as required by Indian financial regulations. KYC documents are retained for 5 years. Account data is deleted upon request (subject to legal requirements).
      </Section>

      <Section title="6. Your Rights" colors={colors}>
        {`• Access your personal data
• Request correction of inaccurate data
• Request deletion (where legally permitted)
• Opt out of marketing communications
Contact: ${COMPANY.email}`}
      </Section>

      <Section title="7. Security" colors={colors}>
        We use AES-256 encryption for sensitive data, TLS 1.3 for data in transit, and row-level security in our database. Private keys are never stored on our servers.
      </Section>

      <Section title="8. Cookies" colors={colors}>
        The App does not use browser cookies. We may use device identifiers for authentication and fraud prevention.
      </Section>
    </LegalPage>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// REFUND POLICY
// ══════════════════════════════════════════════════════════════════════════
export const RefundPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme()
  return (
    <LegalPage navigation={navigation} title="Refund Policy">
      <Text style={{ color: colors.textDim, fontSize: 12, marginBottom: 20 }}>Last updated: January 2025</Text>

      <Section title="1. Completed Trades" colors={colors}>
        Once a trade is marked complete (crypto released and fiat confirmed), it cannot be reversed. Cryptocurrency transactions on the blockchain are irreversible by nature.
      </Section>

      <Section title="2. Payment Failures" colors={colors}>
        If your Razorpay payment fails after being charged, you will receive a full refund within 5–7 business days to your original payment method. The listing reservation will be released immediately.
      </Section>

      <Section title="3. Cancelled Listings (Seller)" colors={colors}>
        If you (as a seller) cancel a listing with locked escrow, your cryptocurrency will be refunded to the wallet address used to lock the escrow. Blockchain network fees (gas) are non-refundable.
      </Section>

      <Section title="4. Disputed Trades" colors={colors}>
        In a dispute, CryptoVault will review evidence and may refund the buyer's fiat or return the seller's crypto depending on the outcome. Resolution takes 1–5 business days.
      </Section>

      <Section title="5. Platform Fees" colors={colors}>
        Platform fees are non-refundable once a trade is initiated, except in cases of platform error. We currently charge 0% fees during beta — this may change with prior notice.
      </Section>

      <Section title="6. How to Request a Refund" colors={colors}>
        {`Contact us at: ${COMPANY.email}\nInclude: your order ID, payment reference, and description of the issue.\nResponse time: 1–2 business days.`}
      </Section>
    </LegalPage>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// CONTACT US
// ══════════════════════════════════════════════════════════════════════════
export const ContactUsScreen = ({ navigation }) => {
  const { colors } = useTheme()
  return (
    <LegalPage navigation={navigation} title="Contact Us">
      <Section title="Company" colors={colors}>{COMPANY.name}</Section>
      <Section title="Email" colors={colors}>{COMPANY.email}</Section>
      <Section title="Phone" colors={colors}>{COMPANY.phone}</Section>
      <Section title="Address" colors={colors}>{COMPANY.address}</Section>
      <Section title="Business Type" colors={colors}>Sole Proprietorship / Individual (GST not applicable at current stage)</Section>

      <Section title="Support Hours" colors={colors}>
        Monday – Friday: 9:00 AM – 6:00 PM IST{'\n'}
        Saturday: 10:00 AM – 2:00 PM IST{'\n'}
        Sunday: Closed (Disputes handled within 24h)
      </Section>

      <Section title="Dispute Resolution" colors={colors}>
        For trade disputes, email disputes@cryptovault.app with your Order ID and payment proof. We respond within 24 hours.
      </Section>

      <Section title="Razorpay Payment Issues" colors={colors}>
        For payment failures or duplicate charges, email support@cryptovault.app with your Razorpay payment ID. We will coordinate with Razorpay for resolution.
      </Section>
    </LegalPage>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// CANCELLATION POLICY (required by Razorpay for digital goods)
// ══════════════════════════════════════════════════════════════════════════
export const CancellationPolicyScreen = ({ navigation }) => {
  const { colors } = useTheme()
  return (
    <LegalPage navigation={navigation} title="Cancellation Policy">
      <Section title="Buyer Cancellation" colors={colors}>
        Buyers may cancel an order within the payment window (5 minutes from listing reservation) before completing the Razorpay payment. Once payment is captured, cancellation is not possible and the trade proceeds automatically.
      </Section>

      <Section title="Seller Cancellation" colors={colors}>
        Sellers may cancel a listing at any time if no active orders exist. If an order is in progress, the seller must wait for the payment window to expire or the buyer to cancel. Escrow funds are returned automatically upon cancellation.
      </Section>

      <Section title="Partial Order Completion" colors={colors}>
        For listings that support partial fills, a buyer may purchase less than the full listing amount. The listing will remain active for the remaining amount.
      </Section>

      <Section title="How to Cancel" colors={colors}>
        To cancel a listing: open P2P → My Listings → Delete Listing.{'\n'}
        To cancel an order (before payment): close the payment window and wait for the 5-minute reservation to expire.
      </Section>
    </LegalPage>
  )
}
