// src/utils/encryption.js
// AES-256 encryption for private key storage
// The raw private key is NEVER stored in DB – only the encrypted blob.

import CryptoJS from 'crypto-js'

const ENCRYPTION_SECRET = import.meta.env.VITE_ENCRYPTION_SECRET || 'fallback-secret-change-me'

/**
 * Derive a deterministic encryption key from the user's password + a salt.
 * Using PBKDF2 so brute-force is expensive.
 */
const deriveKey = (password, salt) => {
  return CryptoJS.PBKDF2(password + ENCRYPTION_SECRET, salt, {
    keySize: 256 / 32, // 256-bit key
    iterations: 10000,
    hasher: CryptoJS.algo.SHA256,
  }).toString()
}

/**
 * Encrypt a private key with the user's password.
 * Returns a JSON string containing { salt, iv, ciphertext }.
 */
export const encryptPrivateKey = (privateKey, password) => {
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString()
  const iv = CryptoJS.lib.WordArray.random(128 / 8)
  const key = deriveKey(password, salt)

  const encrypted = CryptoJS.AES.encrypt(privateKey, CryptoJS.enc.Hex.parse(key), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  })

  return JSON.stringify({
    salt,
    iv: iv.toString(),
    ciphertext: encrypted.ciphertext.toString(),
  })
}

/**
 * Decrypt a stored encrypted private key.
 * Throws if the password is wrong (bad padding / garbled output).
 */
export const decryptPrivateKey = (encryptedData, password) => {
  try {
    const { salt, iv, ciphertext } = JSON.parse(encryptedData)
    const key = deriveKey(password, salt)

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(ciphertext) },
      CryptoJS.enc.Hex.parse(key),
      {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    )

    const result = decrypted.toString(CryptoJS.enc.Utf8)
    if (!result) throw new Error('Decryption failed – wrong password?')
    return result
  } catch {
    throw new Error('Invalid password or corrupted key data')
  }
}

/**
 * Verify that a password can decrypt the stored blob (used at login).
 */
export const verifyPassword = (encryptedData, password) => {
  try {
    decryptPrivateKey(encryptedData, password)
    return true
  } catch {
    return false
  }
}
