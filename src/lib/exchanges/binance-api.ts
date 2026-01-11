/**
 * Binance API client for fetching trade history, balances, and deposits/withdrawals
 * Uses read-only API endpoints with API key authentication
 */

import type { ParsedTransaction } from '@/types/transaction'
import { encryptApiKey, decryptApiKey } from './crypto'
import crypto from 'crypto'

// Binance API endpoints
const BINANCE_API_BASE = 'https://api.binance.com'

// API endpoint paths
const ENDPOINTS = {
  account: '/api/v3/account',
  myTrades: '/api/v3/myTrades',
  depositHistory: '/sapi/v1/capital/deposit/hisrec',
  withdrawHistory: '/sapi/v1/capital/withdraw/history',
  exchangeInfo: '/api/v3/exchangeInfo',
  allOrders: '/api/v3/allOrders',
} as const

interface BinanceCredentials {
  apiKey: string
  secretKey: string
}

interface BinanceAccountInfo {
  makerCommission: number
  takerCommission: number
  buyerCommission: number
  sellerCommission: number
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
  updateTime: number
  accountType: string
  balances: Array<{
    asset: string
    free: string
    locked: string
  }>
}

interface BinanceTrade {
  symbol: string
  id: number
  orderId: number
  orderListId: number
  price: string
  qty: string
  quoteQty: string
  commission: string
  commissionAsset: string
  time: number
  isBuyer: boolean
  isMaker: boolean
  isBestMatch: boolean
}

interface BinanceDeposit {
  amount: string
  coin: string
  network: string
  status: number
  address: string
  addressTag: string
  txId: string
  insertTime: number
  transferType: number
  confirmTimes: string
}

interface BinanceWithdrawal {
  address: string
  amount: string
  applyTime: string
  coin: string
  id: string
  withdrawOrderId: string
  network: string
  transferType: number
  status: number
  transactionFee: string
  txId: string
  confirmNo: number
}

interface BinanceExchangeInfo {
  timezone: string
  serverTime: number
  symbols: Array<{
    symbol: string
    baseAsset: string
    quoteAsset: string
    status: string
  }>
}

/**
 * Generate HMAC-SHA256 signature for Binance API
 */
function generateSignature(queryString: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(queryString)
    .digest('hex')
}

/**
 * Make an authenticated request to Binance API
 */
async function makeRequest<T>(
  endpoint: string,
  credentials: BinanceCredentials,
  params: Record<string, string | number> = {}
): Promise<T> {
  // Add timestamp for signed endpoints
  const timestamp = Date.now()
  const queryParams = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
    timestamp: String(timestamp),
  })

  // Generate signature
  const signature = generateSignature(queryParams.toString(), credentials.secretKey)
  queryParams.append('signature', signature)

  const url = `${BINANCE_API_BASE}${endpoint}?${queryParams.toString()}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    let errorMessage = `Binance API error: ${response.status} ${response.statusText}`
    try {
      const errorJson = JSON.parse(errorBody)
      errorMessage = errorJson.msg || errorMessage
    } catch {
      // Use default message
    }
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}

/**
 * Make an unsigned request (public endpoints)
 */
async function makePublicRequest<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const queryParams = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    )
  )

  const url = `${BINANCE_API_BASE}${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

/**
 * Validate API credentials by fetching account info
 */
export async function validateCredentials(credentials: BinanceCredentials): Promise<{
  valid: boolean
  canTrade: boolean
  canWithdraw: boolean
  canDeposit: boolean
  error?: string
}> {
  try {
    const accountInfo = await makeRequest<BinanceAccountInfo>(
      ENDPOINTS.account,
      credentials
    )
    return {
      valid: true,
      canTrade: accountInfo.canTrade,
      canWithdraw: accountInfo.canWithdraw,
      canDeposit: accountInfo.canDeposit,
    }
  } catch (error) {
    return {
      valid: false,
      canTrade: false,
      canWithdraw: false,
      canDeposit: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Fetch account balances
 */
export async function fetchBalances(credentials: BinanceCredentials): Promise<
  Array<{ asset: string; free: number; locked: number; total: number }>
> {
  const accountInfo = await makeRequest<BinanceAccountInfo>(
    ENDPOINTS.account,
    credentials
  )

  return accountInfo.balances
    .map((balance) => ({
      asset: balance.asset,
      free: parseFloat(balance.free),
      locked: parseFloat(balance.locked),
      total: parseFloat(balance.free) + parseFloat(balance.locked),
    }))
    .filter((balance) => balance.total > 0)
}

/**
 * Get exchange info to map symbols to base/quote assets
 */
async function getSymbolInfo(): Promise<Map<string, { base: string; quote: string }>> {
  const info = await makePublicRequest<BinanceExchangeInfo>(ENDPOINTS.exchangeInfo)
  const symbolMap = new Map<string, { base: string; quote: string }>()

  for (const symbol of info.symbols) {
    symbolMap.set(symbol.symbol, {
      base: symbol.baseAsset,
      quote: symbol.quoteAsset,
    })
  }

  return symbolMap
}

/**
 * Fetch trade history for a specific symbol
 */
async function fetchTradesForSymbol(
  credentials: BinanceCredentials,
  symbol: string,
  startTime?: number,
  endTime?: number
): Promise<BinanceTrade[]> {
  const params: Record<string, string | number> = {
    symbol,
    limit: 1000,
  }

  if (startTime) params.startTime = startTime
  if (endTime) params.endTime = endTime

  return makeRequest<BinanceTrade[]>(ENDPOINTS.myTrades, credentials, params)
}

/**
 * Fetch all trade history across all traded symbols
 */
export async function fetchTradeHistory(
  credentials: BinanceCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  // First, get balances to determine which symbols have been traded
  const balances = await fetchBalances(credentials)
  const symbolInfo = await getSymbolInfo()

  // Build list of symbols to query based on assets with non-zero balance
  // and common quote currencies
  const quoteCurrencies = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB']
  const symbols = new Set<string>()

  for (const balance of balances) {
    for (const quote of quoteCurrencies) {
      const symbol = `${balance.asset}${quote}`
      if (symbolInfo.has(symbol)) {
        symbols.add(symbol)
      }
      // Also check reverse pairs
      const reverseSymbol = `${quote}${balance.asset}`
      if (symbolInfo.has(reverseSymbol)) {
        symbols.add(reverseSymbol)
      }
    }
  }

  // Fetch trades for all relevant symbols
  const allTrades: ParsedTransaction[] = []
  const startMs = startTime?.getTime()
  const endMs = endTime?.getTime()

  for (const symbol of Array.from(symbols)) {
    try {
      const trades = await fetchTradesForSymbol(credentials, symbol, startMs, endMs)
      const info = symbolInfo.get(symbol)

      if (!info) continue

      for (const trade of trades) {
        const baseAmount = parseFloat(trade.qty)
        const quoteAmount = parseFloat(trade.quoteQty)
        const price = parseFloat(trade.price)
        const fee = parseFloat(trade.commission)

        // Determine if this is a buy or sell of the base asset
        const type = trade.isBuyer ? 'buy' : 'sell'

        allTrades.push({
          timestamp: new Date(trade.time),
          type,
          asset: info.base,
          amount: baseAmount,
          price,
          fee,
          feeAsset: trade.commissionAsset,
          exchange: 'Binance',
          source: 'API_SYNC',
          rawData: {
            symbol,
            orderId: trade.orderId,
            tradeId: trade.id,
            quoteAsset: info.quote,
            quoteAmount,
            isMaker: trade.isMaker,
          },
        })
      }

      // Rate limiting - Binance allows 1200 requests per minute
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch (error) {
      // Log but continue with other symbols
      console.error(`Failed to fetch trades for ${symbol}:`, error)
    }
  }

  // Sort by timestamp
  allTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return allTrades
}

/**
 * Fetch deposit history
 */
export async function fetchDepositHistory(
  credentials: BinanceCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const params: Record<string, string | number> = {
    status: 1, // Only successful deposits
  }

  if (startTime) params.startTime = startTime.getTime()
  if (endTime) params.endTime = endTime.getTime()

  const deposits = await makeRequest<BinanceDeposit[]>(
    ENDPOINTS.depositHistory,
    credentials,
    params
  )

  return deposits.map((deposit) => ({
    timestamp: new Date(deposit.insertTime),
    type: 'deposit' as const,
    asset: deposit.coin,
    amount: parseFloat(deposit.amount),
    exchange: 'Binance',
    source: 'API_SYNC' as const,
    rawData: {
      network: deposit.network,
      address: deposit.address,
      txId: deposit.txId,
      status: deposit.status,
    },
  }))
}

/**
 * Fetch withdrawal history
 */
export async function fetchWithdrawalHistory(
  credentials: BinanceCredentials,
  startTime?: Date,
  endTime?: Date
): Promise<ParsedTransaction[]> {
  const params: Record<string, string | number> = {}

  if (startTime) params.startTime = startTime.getTime()
  if (endTime) params.endTime = endTime.getTime()

  const withdrawals = await makeRequest<BinanceWithdrawal[]>(
    ENDPOINTS.withdrawHistory,
    credentials,
    params
  )

  return withdrawals
    .filter((w) => w.status === 6) // Only completed withdrawals
    .map((withdrawal) => ({
      timestamp: new Date(withdrawal.applyTime),
      type: 'withdrawal' as const,
      asset: withdrawal.coin,
      amount: parseFloat(withdrawal.amount),
      fee: parseFloat(withdrawal.transactionFee),
      exchange: 'Binance',
      source: 'API_SYNC' as const,
      rawData: {
        network: withdrawal.network,
        address: withdrawal.address,
        txId: withdrawal.txId,
        withdrawOrderId: withdrawal.withdrawOrderId,
      },
    }))
}

/**
 * Fetch all transactions (trades, deposits, withdrawals)
 */
export async function fetchAllTransactions(
  credentials: BinanceCredentials,
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
export function encryptCredentials(credentials: BinanceCredentials): {
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
}): BinanceCredentials {
  return {
    apiKey: decryptApiKey(encrypted.encryptedApiKey),
    secretKey: decryptApiKey(encrypted.encryptedSecretKey),
  }
}
