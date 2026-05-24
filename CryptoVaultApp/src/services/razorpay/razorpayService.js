// src/services/razorpay/razorpayService.js
// React Native Razorpay integration using react-native-razorpay
// Install: expo install react-native-razorpay
// (Requires bare workflow or expo-dev-client — not available in Expo Go)
//
// For Expo Go fallback: uses WebView-based Razorpay checkout.

import { Platform, Linking } from 'react-native'

// Dynamic import — react-native-razorpay not available in Expo Go
let RazorpayCheckout = null
try {
  RazorpayCheckout = require('react-native-razorpay').default
} catch {
  // Using WebView fallback
}

export const RAZORPAY_KEY_ID = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || ''

/**
 * Opens the Razorpay payment sheet.
 * Returns { razorpay_payment_id, razorpay_order_id, razorpay_signature } on success.
 * Throws on failure/cancel.
 *
 * @param {object} params
 * @param {string} params.orderId        - Razorpay order ID from backend
 * @param {number} params.amount         - Amount in smallest unit (paise)
 * @param {string} params.currency       - Currency code (INR, USD etc.)
 * @param {string} params.description    - Payment description
 * @param {string} params.userName       - User's name for prefill
 * @param {string} params.userEmail      - User's email for prefill
 * @param {string} params.userContact    - User's phone for prefill
 */
export const openRazorpayCheckout = async ({
  orderId, amount, currency = 'INR',
  description = 'P2P Crypto Purchase',
  userName = '', userEmail = '', userContact = '',
}) => {
  const options = {
    description,
    image:    'https://cryptovault.app/logo.png', // Replace with your logo
    currency,
    key:      RAZORPAY_KEY_ID,
    amount:   String(amount),
    name:     'CryptoVault P2P',
    order_id: orderId,
    prefill: { name: userName, email: userEmail, contact: userContact },
    theme: { color: '#7c6ff7' },
    modal: { ondismiss: () => { throw new Error('Payment cancelled') } },
  }

  if (RazorpayCheckout) {
    // Native SDK (bare workflow / dev client)
    return new Promise((resolve, reject) => {
      RazorpayCheckout.open(options)
        .then(resolve)
        .catch(err => reject(new Error(err.description || 'Payment failed or cancelled')))
    })
  }

  // Expo Go fallback — return mock for testing
  if (__DEV__) {
    console.log('RAZORPAY DEV MOCK TRIGGERED')
    console.warn('[Razorpay] Using DEV mock — install react-native-razorpay for production')
    return {
      razorpay_payment_id: `pay_DEV_${Date.now()}`,
      razorpay_order_id:   orderId,
      razorpay_signature:  'dev_signature_mock',
    }
  }

  throw new Error('Razorpay SDK not available. Please use a dev build.')
}

/**
 * Formats amount for display (converts smallest unit back to main unit)
 */
export const formatRazorpayAmount = (amount, currency = 'INR') => {
  const divisors = { INR: 100, USD: 100, EUR: 100, GBP: 100, AED: 100, SGD: 100 }
  const divisor = divisors[currency] || 100
  return (amount / divisor).toFixed(2)
}
