/**
 * Coinbase API client for fetching trade history, balances, and deposits/withdrawals
 * Uses OAuth2 or API key authentication
 *
 * Note: Coinbase has two APIs:
 * - Coinbase API (retail, wallet-focused)
 * - Coinbase Advanced Trade API (for trading)
 *
 * This implementation uses the Advanced Trade API for comprehensive trading data
 */

import type { ParsedTransaction } from '@/types/transaction'
import { encryptApiKey, decryptApiKey } from './crypto'
import crypto from 'crypto'

// Coinbase Advanced Trade API endpoints
const COINBASE_API_BASE = 'https://api.coinbase.com'

// API endpoint paths
const ENDPOINTS = {
  accounts: '/api/v3/brokerage/accounts',
  transactions: '/api/v3/brokerage/accounts/{account_id}/transactions',
  orders: '/api/v3/brokerage/orders/historical/fills',
  products: '/api/v3/brokerage/products',
} as const

interface CoinbaseCredentials {
  apiKey: string
  secretKey: string
}

interface CoinbaseAccount {
  uuid: string
  name: string
  currency: string
  available_balance: {
    value: string
    currency: string
  }
  hold: {
    value: string
    currency: string
  }
  type: string
  active: boolean
  created_at: string
}

interface CoinbaseAccountsResponse {
  accounts: CoinbaseAccount[]
  has_next: boolean
  cursor: string
}

interface CoinbaseFill {
  entry_id: string
  trade_id: string
  order_id: string
  trade_time: string
  trade_type: 'BUY' | 'SELL'
  price: string
  size: string
  commission: string
  product_id: string
  sequence_timestamp: string
  liquidity_indicator: 'MAKER' | 'TAKER'
  size_in_quote: boolean
  user_id: string
  side: 'BUY' | 'SELL'
}

interface CoinbaseFillsResponse {
  fills: CoinbaseFill[]
  cursor: string
}

interface CoinbaseProduct {
  product_id: string
  price: string
  base_currency_id: string
  quote_currency_id: string
  base_min_size: string
  base_max_size: string
  quote_min_size: string
  quote_max_size: string
  base_increment: string
  quote_increment: string
  status: string
}

interface CoinbaseProductsResponse {
  products: CoinbaseProduct[]
  num_products: number
}

interface CoinbaseTransaction {
  id: string
  type: string
  status: string
  amount: {
    value: string
    currency: string
  }
  native_amount: {
    value: string
    currency: string
  }
  created_at: string
  updated_at: string
  network?: {
    status: string
    hash: string
    name: string
  }
  from?: {
    resource: string
    id: string
  }
  to?: {
    resource: string
    address: string
  }
  details?: {
    title: string
    subtitle: string
  }
}

interface CoinbaseTransactionsResponse {
  data: CoinbaseTransaction[]
  pagination: {
    ending_before: string | null
    starting_after: string | null
    limit: number
    order: string
    previous_uri: string | null
    next_uri: string | null
  }
}

/**
 * Generate signature for Coinbase Advanced Trade API
 * Uses HMAC-SHA256
 */
function generateSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string
): string {
  const message = timestamp + method + requestPath + body
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex')
}

/**
 * Make an authenticated request to Coinbase API
 */
async function makeRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  credentials: CoinbaseCredentials,
  body?: Record<string, unknown>
): Promise<T> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const bodyStr = body ? JSON.stringify(body) : ''

  const signature = generateSignature(
    timestamp,
    method,
    path,
    bodyStr,
    credentials.secretKey
  )

  const url = `${COINBASE_API_BASE}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'CB-ACCESS-KEY': credentials.apiKey,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp,
  }

  const response = await fetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    let errorMessage = `Coinbase API error: ${response.status} ${response.statusText}`
    try {
      const errorJson = JSON.parse(errorBody)
      errorMessage = errorJson.message || errorJson.error || errorMessage
    } catch {
      // Use default message
    }
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

/**
 * Validate API credentials by fetching accounts
 */
export async function validateCredentials(credentials: CoinbaseCredentials): Promise<{
  valid: boolean
  accountCount: number
  error?: string
}> {
  try {
    const response = await makeRequest<CoinbaseAccountsResponse>(
      'GET',
      ENDPOINTS.accounts,
      credentials
    )
    return {
      valid: true,
      accountCount: response.accounts.length,
    }
  } catch (error) {
    return {
      valid: false,
      accountCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch account balances
 */
export async function fetchBalances(credentials: CoinbaseCredentials): Promise<
  Array<{ asset: string; available: number; hold: number; total: number }>
> {
  const allAccounts: CoinbaseAccount[] = []
  let cursor: string | undefined

  // Paginate through all accounts
  do {
    const path = cursor
      ? `${ENDPOINTS.accounts}?cursor=${cursor}`
      : ENDPOINTS.accounts

    const response = await makeRequest<CoinbaseAccountsResponse>(
      'GET',
      path,
      credentials
    )

    allAccounts.push(...response.accounts.filter((a) => a.active))
    cursor = response.has_next ? response.cursor : undefined
  } while (cursor)

  return allAccounts
    .map((account) => ({
      asset: account.currency,
      available: parseFloat(account.available_balance.value),
      hold: parseFloat(account.hold.value),
      total:
        parseFloat(account.available_balance.value) +
        parseFloat(account.hold.value),
    }))
    .filter((balance) => balance.total > 0)
}

/**
 * Get product info to map product IDs to base/quote assets
 */
async function getProductInfo(credentials: CoinbaseCredentials): Promise<
  Map<string, { base: string; quote: string }>
> {
  const response = await makeRequest<CoinbaseProductsResponse>(
    'GET',
    ENDPOINTS.products,
    credentials
  )

  const productMap = new Map<string, { base: string; quote: string }>()

  for (const product of response.products) {
    productMap.set(product.product_id, {
      base: product.base_currency_id,
      quote: product.quote_currency_id,
    })
  }

  return productMap
}

/**
 * Fetch all trade fills (completed orders)
 */
export async function fetchTradeHistory(
  credentials: CoinbaseCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const productInfo = await getProductInfo(credentials)
  const allFills: CoinbaseFill[] = []
  let cursor: string | undefined

  // Build query params
  const params = new URLSearchParams()
  if (startTime) {
    params.append('start_sequence_timestamp', startTime.toISOString())
  }
  if (endTime) {
    params.append('end_sequence_timestamp', endTime.toISOString())
  }
  params.append('limit', '100')

  // Paginate through all fills
  do {
    const path = cursor
      ? `${ENDPOINTS.orders}?cursor=${cursor}&${params.toString()}`
      : `${ENDPOINTS.orders}?${params.toString()}`

    const response = await makeRequest<CoinbaseFillsResponse>('GET', path, credentials)

    allFills.push(...response.fills)
    cursor = response.cursor || undefined

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100))
  } while (cursor)

  // Convert fills to ParsedTransactions
  return allFills.map((fill) => {
    const product = productInfo.get(fill.product_id)
    const baseAsset = product?.base || fill.product_id.split('-')[0]
    const quoteAsset = product?.quote || fill.product_id.split('-')[1]

    const price = parseFloat(fill.price)
    const size = parseFloat(fill.size)
    const commission = parseFloat(fill.commission)

    return {
      timestamp: new Date(fill.trade_time),
      type: fill.side.toLowerCase() as 'buy' | 'sell',
      asset: baseAsset,
      amount: size,
      price,
      fee: commission,
      feeAsset: quoteAsset,
      exchange: 'Coinbase',
      source: 'API_SYNC' as const,
      rawData: {
        productId: fill.product_id,
        orderId: fill.order_id,
        tradeId: fill.trade_id,
        quoteAsset,
        quoteAmount: size * price,
        liquidityIndicator: fill.liquidity_indicator,
      },
    }
  })
}

/**
 * Fetch deposit and withdrawal history for all accounts
 * Note: This uses the Coinbase retail API endpoints
 */
export async function fetchTransfers(
  credentials: CoinbaseCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  // First, get all accounts
  const balances = await fetchBalances(credentials)
  const allTransfers: ParsedTransaction[] = []

  // For each account with balance, fetch transactions
  // This requires iterating through accounts
  // Note: The Advanced Trade API doesn't have a direct deposits/withdrawals endpoint
  // In a production implementation, you might need to use the Coinbase API v2 for this

  // Placeholder implementation - in production, integrate with Coinbase v2 API
  // for wallet deposits/withdrawals
  console.log('Note: Full deposit/withdrawal history requires Coinbase API v2 integration')

  return allTransfers
}

/**
 * Fetch all transactions (trades only for now)
 * Note: Deposits/withdrawals require additional Coinbase v2 API integration
 */
export async function fetchAllTransactions(
  credentials: CoinbaseCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const trades = await fetchTradeHistory(credentials, startTime, endTime)

  // Sort by timestamp
  trades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return trades
}

/**
 * Store encrypted API credentials
 */
export function encryptCredentials(credentials: CoinbaseCredentials): {
  encryptedApiKey: string
  encryptedSecretKey: string
} {
  return {
    encryptedApiKey: encryptApiKey(credentials.apiKey),
    encryptedSecretKey: encryptApiKey(credentials.secretKey),
  }
}

/**
 * Decrypt stored API credentials
 */
export function decryptCredentials(encrypted: {
  encryptedApiKey: string
  encryptedSecretKey: string
}): CoinbaseCredentials {
  return {
    apiKey: decryptApiKey(encrypted.encryptedApiKey),
    secretKey: decryptApiKey(encrypted.encryptedSecretKey),
  }
}
