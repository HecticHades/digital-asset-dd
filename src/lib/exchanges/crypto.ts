/**
 * Cryptographic utilities for secure API key storage
 * Uses AES-256-GCM encryption with a server-side key
 */

import crypto from 'crypto'

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const KEY_LENGTH = 32 // 256 bits

/**
 * Get encryption key from environment or generate a default for development
 * In production, this MUST be set via ENCRYPTION_KEY environment variable
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY

  if (envKey) {
    // If the key is a hex string, convert it
    if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
      return Buffer.from(envKey, 'hex')
    }
    // Otherwise, derive a key from the provided string
    return crypto.scryptSync(envKey, 'digital-asset-dd-salt', KEY_LENGTH)
  }

  // Development fallback - NOT SECURE FOR PRODUCTION
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️ Using development encryption key. Set ENCRYPTION_KEY in production!')
    return crypto.scryptSync('development-key-not-for-production', 'dev-salt', KEY_LENGTH)
  }

  throw new Error('ENCRYPTION_KEY environment variable must be set in production')
}

/**
 * Encrypt a string value (API key or secret)
 * Returns a base64-encoded string containing IV + ciphertext + auth tag
 */
export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([
    iv,
    Buffer.from(encrypted, 'hex'),
    authTag,
  ])

  return combined.toString('base64')
}

/**
 * Decrypt a previously encrypted string
 * Expects base64-encoded string containing IV + ciphertext + auth tag
 */
export function decryptApiKey(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedBase64, 'base64')

  // Extract IV, ciphertext, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * Generate a new random encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Mask an API key for display (show first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return '*'.repeat(apiKey.length)
  }
  return `${apiKey.substring(0, 4)}${'*'.repeat(apiKey.length - 8)}${apiKey.substring(apiKey.length - 4)}`
}
