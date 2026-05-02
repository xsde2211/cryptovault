// src/utils/encryption.js
// AES-256 encryption — identical logic to the web app

import CryptoJS from 'crypto-js'

const ENCRYPTION_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_SECRET || 'fallback-secret-change-me'

const deriveKey = (password, salt) =>
  CryptoJS.PBKDF2(password + ENCRYPTION_SECRET, salt, {
    keySize:    256 / 32,
    iterations: 10000,
    hasher:     CryptoJS.algo.SHA256,
  }).toString()

export const encryptPrivateKey = (privateKey, password) => {
  const salt      = CryptoJS.lib.WordArray.random(128 / 8).toString()
  const iv        = CryptoJS.lib.WordArray.random(128 / 8)
  const key       = deriveKey(password, salt)
  const encrypted = CryptoJS.AES.encrypt(privateKey, CryptoJS.enc.Hex.parse(key), {
    iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7,
  })
  return JSON.stringify({ salt, iv: iv.toString(), ciphertext: encrypted.ciphertext.toString() })
}

export const decryptPrivateKey = (encryptedData, password) => {
  try {
    const { salt, iv, ciphertext } = JSON.parse(encryptedData)
    const key       = deriveKey(password, salt)
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(ciphertext) },
      CryptoJS.enc.Hex.parse(key),
      { iv: CryptoJS.enc.Hex.parse(iv), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    )
    const result = decrypted.toString(CryptoJS.enc.Utf8)
    if (!result) throw new Error('Wrong password')
    return result
  } catch {
    throw new Error('Invalid password or corrupted key data')
  }
}
