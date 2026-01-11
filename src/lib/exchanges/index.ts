/**
 * Unified CEX API interface
 * Provides a consistent API for interacting with multiple exchanges
 */

import type { ParsedTransaction } from '@/types/transaction'
import * as binance from './binance-api'
import * as coinbase from './coinbase-api'
import * as kraken from './kraken-api'
import { encryptApiKey, decryptApiKey, maskApiKey } from './crypto'

export { encryptApiKey, decryptApiKey, maskApiKey } from './crypto'

/**
 * Supported exchange types
 */
export type ExchangeType = 'binance' | 'coinbase' | 'kraken'

export const EXCHANGE_INFO: Record<
  ExchangeType,
  {
    name: string
    displayName: string
    description: string
    docsUrl: string
    requiresSecretKey: boolean
  }
> = {
  binance: {
    name: 'binance',
    displayName: 'Binance',
    description: 'Binance exchange - requires API key with read permissions',
    docsUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
    requiresSecretKey: true,
  },
  coinbase: {
    name: 'coinbase',
    displayName: 'Coinbase',
    description: 'Coinbase Advanced Trade API - requires API key with read permissions',
    docsUrl: 'https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/api-key-authentication',
    requiresSecretKey: true,
  },
  kraken: {
    name: 'kraken',
    displayName: 'Kraken',
    description: 'Kraken exchange - requires API key with Query permissions',
    docsUrl: 'https://docs.kraken.com/rest/#section/Authentication',
    requiresSecretKey: true,
  },
}

/**
 * Exchange credentials interface
 */
export interface ExchangeCredentials {
  apiKey: string
  secretKey: string
}

/**
 * Encrypted credentials for storage
 */
export interface EncryptedCredentials {
  encryptedApiKey: string
  encryptedSecretKey: string
}

/**
 * Balance entry
 */
export interface ExchangeBalance {
  asset: string
  available: number
  locked?: number
  hold?: number
  total: number
}

/**
 * Credential validation result
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  permissions?: {
    canRead: boolean
    canTrade?: boolean
    canWithdraw?: boolean
  }
}

/**
 * Get the list of supported exchanges
 */
export function getSupportedExchanges(): ExchangeType[] {
  return ['binance', 'coinbase', 'kraken']
}

/**
 * Get exchange information
 */
export function getExchangeInfo(exchange: ExchangeType) {
  return EXCHANGE_INFO[exchange]
}

/**
 * Validate exchange credentials
 */
export async function validateCredentials(
  exchange: ExchangeType,
  credentials: ExchangeCredentials
): Promise<ValidationResult> {
  try {
    switch (exchange) {
      case 'binance': {
        const result = await binance.validateCredentials(credentials)
        return {
          valid: result.valid,
          error: result.error,
          permissions: result.valid
            ? {
                canRead: true,
                canTrade: result.canTrade,
                canWithdraw: result.canWithdraw,
              }
            : undefined,
        }
      }
      case 'coinbase': {
        const result = await coinbase.validateCredentials(credentials)
        return {
          valid: result.valid,
          error: result.error,
          permissions: result.valid
            ? {
                canRead: true,
              }
            : undefined,
        }
      }
      case 'kraken': {
        const result = await kraken.validateCredentials(credentials)
        return {
          valid: result.valid,
          error: result.error,
          permissions: result.valid
            ? {
                canRead: true,
              }
            : undefined,
        }
      }
      default:
        return { valid: false, error: `Unsupported exchange: ${exchange}` }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Fetch account balances from an exchange
 */
export async function fetchBalances(
  exchange: ExchangeType,
  credentials: ExchangeCredentials
): Promise<ExchangeBalance[]> {
  switch (exchange) {
    case 'binance': {
      const balances = await binance.fetchBalances(credentials)
      return balances.map((b) => ({
        asset: b.asset,
        available: b.free,
        locked: b.locked,
        total: b.total,
      }))
    }
    case 'coinbase': {
      const balances = await coinbase.fetchBalances(credentials)
      return balances.map((b) => ({
        asset: b.asset,
        available: b.available,
        hold: b.hold,
        total: b.total,
      }))
    }
    case 'kraken': {
      const balances = await kraken.fetchBalances(credentials)
      return balances.map((b) => ({
        asset: b.asset,
        available: b.amount,
        total: b.amount,
      }))
    }
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}

/**
 * Fetch trade history from an exchange
 */
export async function fetchTradeHistory(
  exchange: ExchangeType,
  credentials: ExchangeCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  switch (exchange) {
    case 'binance':
      return binance.fetchTradeHistory(credentials, startTime, endTime)
    case 'coinbase':
      return coinbase.fetchTradeHistory(credentials, startTime, endTime)
    case 'kraken':
      return kraken.fetchTradeHistory(credentials, startTime, endTime)
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}

/**
 * Fetch deposit history from an exchange
 */
export async function fetchDepositHistory(
  exchange: ExchangeType,
  credentials: ExchangeCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  switch (exchange) {
    case 'binance':
      return binance.fetchDepositHistory(credentials, startTime, endTime)
    case 'coinbase':
      // Coinbase deposits require v2 API integration
      return []
    case 'kraken':
      return kraken.fetchDepositHistory(credentials, startTime, endTime)
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}

/**
 * Fetch withdrawal history from an exchange
 */
export async function fetchWithdrawalHistory(
  exchange: ExchangeType,
  credentials: ExchangeCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  switch (exchange) {
    case 'binance':
      return binance.fetchWithdrawalHistory(credentials, startTime, endTime)
    case 'coinbase':
      // Coinbase withdrawals require v2 API integration
      return []
    case 'kraken':
      return kraken.fetchWithdrawalHistory(credentials, startTime, endTime)
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}

/**
 * Fetch all transactions from an exchange
 */
export async function fetchAllTransactions(
  exchange: ExchangeType,
  credentials: ExchangeCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  switch (exchange) {
    case 'binance':
      return binance.fetchAllTransactions(credentials, startTime, endTime)
    case 'coinbase':
      return coinbase.fetchAllTransactions(credentials, startTime, endTime)
    case 'kraken':
      return kraken.fetchAllTransactions(credentials, startTime, endTime)
    default:
      throw new Error(`Unsupported exchange: ${exchange}`)
  }
}

/**
 * Encrypt credentials for storage
 */
export function encryptCredentials(credentials: ExchangeCredentials): EncryptedCredentials {
  return {
    encryptedApiKey: encryptApiKey(credentials.apiKey),
    encryptedSecretKey: encryptApiKey(credentials.secretKey),
  }
}

/**
 * Decrypt stored credentials
 */
export function decryptCredentials(encrypted: EncryptedCredentials): ExchangeCredentials {
  return {
    apiKey: decryptApiKey(encrypted.encryptedApiKey),
    secretKey: decryptApiKey(encrypted.encryptedSecretKey),
  }
}

/**
 * Get masked API key for display
 */
export function getMaskedApiKey(encryptedApiKey: string): string {
  try {
    const apiKey = decryptApiKey(encryptedApiKey)
    return maskApiKey(apiKey)
  } catch {
    return '****'
  }
}

/**
 * Sync transactions from an exchange connection
 * Returns new transactions not already in the database
 */
export async function syncExchangeTransactions(
  exchange: ExchangeType,
  credentials: ExchangeCredentials,
  lastSyncTime?: Date
): Promise<{
  transactions: ParsedTransaction[]
  balances: ExchangeBalance[]
  syncedAt: Date
}> {
  const syncedAt = new Date()

  // Fetch transactions since last sync
  const transactions = await fetchAllTransactions(
    exchange,
    credentials,
    lastSyncTime
  )

  // Fetch current balances
  const balances = await fetchBalances(exchange, credentials)

  return {
    transactions,
    balances,
    syncedAt,
  }
}
