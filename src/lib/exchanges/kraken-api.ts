/**
 * Kraken API client for fetching trade history, balances, and deposits/withdrawals
 * Uses API key authentication with HMAC-SHA512 signatures
 */

import type { ParsedTransaction } from '@/types/transaction'
import { encryptApiKey, decryptApiKey } from './crypto'
import crypto from 'crypto'

// Kraken API endpoints
const KRAKEN_API_BASE = 'https://api.kraken.com'

// API endpoint paths
const ENDPOINTS = {
  balance: '/0/private/Balance',
  tradeBalance: '/0/private/TradeBalance',
  tradesHistory: '/0/private/TradesHistory',
  ledgers: '/0/private/Ledgers',
  depositMethods: '/0/private/DepositMethods',
  depositStatus: '/0/private/DepositStatus',
  withdrawStatus: '/0/private/WithdrawStatus',
  assetPairs: '/0/public/AssetPairs',
  assets: '/0/public/Assets',
} as const

interface KrakenCredentials {
  apiKey: string
  secretKey: string
}

interface KrakenBalance {
  [asset: string]: string
}

interface KrakenTrade {
  ordertxid: string
  postxid: string
  pair: string
  time: number
  type: 'buy' | 'sell'
  ordertype: string
  price: string
  cost: string
  fee: string
  vol: string
  margin: string
  misc: string
}

interface KrakenTradesResponse {
  trades: { [txid: string]: KrakenTrade }
  count: number
}

interface KrakenLedgerEntry {
  refid: string
  time: number
  type: 'deposit' | 'withdrawal' | 'trade' | 'transfer' | 'margin' | 'rollover' | 'spend' | 'receive' | 'staking' | 'reward'
  subtype: string
  aclass: string
  asset: string
  amount: string
  fee: string
  balance: string
}

interface KrakenLedgersResponse {
  ledger: { [id: string]: KrakenLedgerEntry }
  count: number
}

interface KrakenAssetPair {
  altname: string
  wsname: string
  aclass_base: string
  base: string
  aclass_quote: string
  quote: string
  pair_decimals: number
  lot_decimals: number
}

interface KrakenAssetPairsResponse {
  [pair: string]: KrakenAssetPair
}

interface KrakenAsset {
  aclass: string
  altname: string
  decimals: number
  display_decimals: number
}

interface KrakenAssetsResponse {
  [asset: string]: KrakenAsset
}

interface KrakenApiResponse<T> {
  error: string[]
  result?: T
}

/**
 * Map Kraken's internal asset names to standard symbols
 */
const ASSET_MAP: Record<string, string> = {
  XXBT: 'BTC',
  XBT: 'BTC',
  XETH: 'ETH',
  XXRP: 'XRP',
  XLTC: 'LTC',
  XXLM: 'XLM',
  XXDG: 'DOGE',
  ZUSD: 'USD',
  ZEUR: 'EUR',
  ZGBP: 'GBP',
  ZJPY: 'JPY',
  ZCAD: 'CAD',
  ZAUD: 'AUD',
  // Most other assets use their standard symbols
}

/**
 * Normalize Kraken asset name to standard symbol
 */
function normalizeAsset(krakenAsset: string): string {
  // Check the mapping first
  if (ASSET_MAP[krakenAsset]) {
    return ASSET_MAP[krakenAsset]
  }

  // Remove X or Z prefix if present and not mapped
  if ((krakenAsset.startsWith('X') || krakenAsset.startsWith('Z')) && krakenAsset.length === 4) {
    return krakenAsset.substring(1)
  }

  return krakenAsset
}

/**
 * Generate signature for Kraken API
 * Uses HMAC-SHA512 with the secret key
 */
function generateSignature(
  path: string,
  nonce: string,
  postData: string,
  secretKey: string
): string {
  const message = nonce + postData
  const hash = crypto.createHash('sha256').update(message).digest()
  const hmac = crypto.createHmac('sha512', Buffer.from(secretKey, 'base64'))
  hmac.update(path)
  hmac.update(hash)
  return hmac.digest('base64')
}

/**
 * Make an authenticated request to Kraken API
 */
async function makePrivateRequest<T>(
  endpoint: string,
  credentials: KrakenCredentials,
  params: Record<string, string | number> = {}
): Promise<T> {
  const nonce = Date.now().toString()

  const postData = new URLSearchParams({
    nonce,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  }).toString()

  const signature = generateSignature(
    endpoint,
    nonce,
    postData,
    credentials.secretKey
  )

  const url = `${KRAKEN_API_BASE}${endpoint}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'API-Key': credentials.apiKey,
      'API-Sign': signature,
    },
    body: postData,
  })

  if (!response.ok) {
    throw new Error(`Kraken API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as KrakenApiResponse<T>

  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API error: ${data.error.join(', ')}`)
  }

  if (!data.result) {
    throw new Error('Kraken API returned no result')
  }

  return data.result
}

/**
 * Make a public request to Kraken API
 */
async function makePublicRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    )
  ).toString()

  const url = `${KRAKEN_API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`

  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Kraken API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as KrakenApiResponse<T>

  if (data.error && data.error.length > 0) {
    throw new Error(`Kraken API error: ${data.error.join(', ')}`)
  }

  if (!data.result) {
    throw new Error('Kraken API returned no result')
  }

  return data.result
}

/**
 * Validate API credentials by fetching balance
 */
export async function validateCredentials(credentials: KrakenCredentials): Promise<{
  valid: boolean
  assetCount: number
  error?: string
}> {
  try {
    const balance = await makePrivateRequest<KrakenBalance>(
      ENDPOINTS.balance,
      credentials
    )
    return {
      valid: true,
      assetCount: Object.keys(balance).length,
    }
  } catch (error) {
    return {
      valid: false,
      assetCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch account balances
 */
export async function fetchBalances(credentials: KrakenCredentials): Promise<
  Array<{ asset: string; amount: number }>
> {
  const balance = await makePrivateRequest<KrakenBalance>(
    ENDPOINTS.balance,
    credentials
  )

  return Object.entries(balance)
    .map(([asset, amount]) => ({
      asset: normalizeAsset(asset),
      amount: parseFloat(amount),
    }))
    .filter((b) => b.amount > 0)
}

/**
 * Get asset pairs info
 */
async function getAssetPairs(): Promise<Map<string, { base: string; quote: string }>> {
  const pairs = await makePublicRequest<KrakenAssetPairsResponse>(ENDPOINTS.assetPairs)

  const pairMap = new Map<string, { base: string; quote: string }>()

  for (const [pairName, pair] of Object.entries(pairs)) {
    pairMap.set(pairName, {
      base: normalizeAsset(pair.base),
      quote: normalizeAsset(pair.quote),
    })
    // Also map by altname
    if (pair.altname) {
      pairMap.set(pair.altname, {
        base: normalizeAsset(pair.base),
        quote: normalizeAsset(pair.quote),
      })
    }
  }

  return pairMap
}

/**
 * Fetch trade history
 */
export async function fetchTradeHistory(
  credentials: KrakenCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const pairInfo = await getAssetPairs()
  const allTrades: ParsedTransaction[] = []
  let offset = 0
  const pageSize = 50

  const params: Record<string, string | number> = {}
  if (startTime) params.start = Math.floor(startTime.getTime() / 1000)
  if (endTime) params.end = Math.floor(endTime.getTime() / 1000)

  // Paginate through all trades
  while (true) {
    const response = await makePrivateRequest<KrakenTradesResponse>(
      ENDPOINTS.tradesHistory,
      credentials,
      { ...params, ofs: offset }
    )

    const trades = Object.values(response.trades || {})

    if (trades.length === 0) break

    for (const trade of trades) {
      const pair = pairInfo.get(trade.pair)
      const baseAsset = pair?.base || trade.pair.substring(0, trade.pair.length / 2)
      const quoteAsset = pair?.quote || trade.pair.substring(trade.pair.length / 2)

      allTrades.push({
        timestamp: new Date(trade.time * 1000),
        type: trade.type,
        asset: normalizeAsset(baseAsset),
        amount: parseFloat(trade.vol),
        price: parseFloat(trade.price),
        fee: parseFloat(trade.fee),
        feeAsset: normalizeAsset(quoteAsset),
        exchange: 'Kraken',
        source: 'API_SYNC',
        rawData: {
          pair: trade.pair,
          ordertxid: trade.ordertxid,
          ordertype: trade.ordertype,
          cost: trade.cost,
          quoteAsset: normalizeAsset(quoteAsset),
        },
      })
    }

    if (trades.length < pageSize) break
    offset += pageSize

    // Rate limiting - Kraken is stricter
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return allTrades
}

/**
 * Fetch ledger entries (deposits, withdrawals, transfers)
 */
export async function fetchLedgers(
  credentials: KrakenCredentials,
  type?: 'deposit' | 'withdrawal',
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const allLedgers: ParsedTransaction[] = []
  let offset = 0
  const pageSize = 50

  const params: Record<string, string | number> = {}
  if (type) params.type = type
  if (startTime) params.start = Math.floor(startTime.getTime() / 1000)
  if (endTime) params.end = Math.floor(endTime.getTime() / 1000)

  // Paginate through all ledger entries
  while (true) {
    const response = await makePrivateRequest<KrakenLedgersResponse>(
      ENDPOINTS.ledgers,
      credentials,
      { ...params, ofs: offset }
    )

    const entries = Object.values(response.ledger || {})

    if (entries.length === 0) break

    for (const entry of entries) {
      // Only process deposit and withdrawal types
      if (entry.type !== 'deposit' && entry.type !== 'withdrawal') {
        continue
      }

      const amount = parseFloat(entry.amount)

      allLedgers.push({
        timestamp: new Date(entry.time * 1000),
        type: entry.type,
        asset: normalizeAsset(entry.asset),
        amount: Math.abs(amount),
        fee: parseFloat(entry.fee) || 0,
        exchange: 'Kraken',
        source: 'API_SYNC',
        rawData: {
          refid: entry.refid,
          subtype: entry.subtype,
          balance: entry.balance,
        },
      })
    }

    if (entries.length < pageSize) break
    offset += pageSize

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return allLedgers
}

/**
 * Fetch deposit history
 */
export async function fetchDepositHistory(
  credentials: KrakenCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  return fetchLedgers(credentials, 'deposit', startTime, endTime)
}

/**
 * Fetch withdrawal history
 */
export async function fetchWithdrawalHistory(
  credentials: KrakenCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  return fetchLedgers(credentials, 'withdrawal', startTime, endTime)
}

/**
 * Fetch all transactions (trades, deposits, withdrawals)
 */
export async function fetchAllTransactions(
  credentials: KrakenCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const [trades, deposits, withdrawals] = await Promise.all([
    fetchTradeHistory(credentials, startTime, endTime),
    fetchDepositHistory(credentials, startTime, endTime),
    fetchWithdrawalHistory(credentials, startTime, endTime),
  ])

  const allTransactions = [...trades, ...deposits, ...withdrawals]

  // Sort by timestamp
  allTransactions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return allTransactions
}

/**
 * Store encrypted API credentials
 */
export function encryptCredentials(credentials: KrakenCredentials): {
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
}): KrakenCredentials {
  return {
    apiKey: decryptApiKey(encrypted.encryptedApiKey),
    secretKey: decryptApiKey(encrypted.encryptedSecretKey),
  }
}
