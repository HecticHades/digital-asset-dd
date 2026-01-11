import Papa from 'papaparse'
import type { ParsedTransaction, ParseResult, ParsedTransactionType } from '@/types/transaction'

// Coinbase Pro/Standard CSV headers
const COINBASE_HEADERS = ['Timestamp', 'Transaction Type', 'Asset', 'Quantity Transacted', 'Price Currency', 'Price at Transaction', 'Subtotal', 'Total (inclusive of fees and/or spread)', 'Fees and/or Spread', 'Notes']
const COINBASE_PRO_HEADERS = ['portfolio', 'trade id', 'product', 'side', 'created at', 'size', 'size unit', 'price', 'fee', 'total', 'price/fee/total unit']

export function isCoinbaseFile(headers: string[]): boolean {
  // Check for standard Coinbase headers
  const hasStandardHeaders = headers.some(h => h.includes('Transaction Type')) && headers.some(h => h.includes('Asset'))
  // Check for Coinbase Pro headers
  const hasProHeaders = headers.includes('portfolio') && headers.includes('product') && headers.includes('side')

  return hasStandardHeaders || hasProHeaders
}

export function isCoinbaseProFile(headers: string[]): boolean {
  return headers.includes('portfolio') && headers.includes('product') && headers.includes('side')
}

interface CoinbaseRow {
  Timestamp: string
  'Transaction Type': string
  Asset: string
  'Quantity Transacted': string
  'Price Currency': string
  'Price at Transaction': string
  Subtotal: string
  'Total (inclusive of fees and/or spread)': string
  'Fees and/or Spread': string
  Notes: string
}

interface CoinbaseProRow {
  portfolio: string
  'trade id': string
  product: string
  side: string
  'created at': string
  size: string
  'size unit': string
  price: string
  fee: string
  total: string
  'price/fee/total unit': string
}

function parseDate(dateStr: string): Date {
  // Coinbase uses ISO format or similar
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) {
    // Try alternative formats
    return new Date(dateStr.replace(' ', 'T'))
  }
  return parsed
}

function parseAmount(value: string): number {
  if (!value) return 0
  // Remove currency symbols and commas
  const cleaned = value.replace(/[$,]/g, '').trim()
  return parseFloat(cleaned) || 0
}

function mapTransactionType(type: string): ParsedTransactionType {
  const normalized = type.toLowerCase().trim()

  const typeMap: Record<string, ParsedTransactionType> = {
    'buy': 'buy',
    'sell': 'sell',
    'send': 'withdrawal',
    'receive': 'deposit',
    'deposit': 'deposit',
    'withdrawal': 'withdrawal',
    'convert': 'swap',
    'trade': 'swap',
    'rewards income': 'reward',
    'staking income': 'reward',
    'coinbase earn': 'reward',
    'learning reward': 'reward',
    'interest': 'reward',
    'transfer': 'transfer',
    'fee': 'fee',
  }

  for (const [key, value] of Object.entries(typeMap)) {
    if (normalized.includes(key)) {
      return value
    }
  }

  return 'other'
}

export function parseCoinbaseStandard(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Coinbase'
  }

  const parsed = Papa.parse<CoinbaseRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row.Timestamp || !row.Asset) continue

      const type = mapTransactionType(row['Transaction Type'])
      const amount = Math.abs(parseAmount(row['Quantity Transacted']))
      const price = parseAmount(row['Price at Transaction'])
      const fee = parseAmount(row['Fees and/or Spread'])

      const tx: ParsedTransaction = {
        timestamp: parseDate(row.Timestamp),
        type,
        asset: row.Asset,
        amount,
        price: price || undefined,
        fee: fee || undefined,
        feeAsset: row['Price Currency'] || 'USD',
        exchange: 'Coinbase',
        source: 'CEX_IMPORT',
        rawData: row as unknown as Record<string, unknown>
      }

      result.transactions.push(tx)
    } catch (err) {
      result.errors.push(`Failed to parse row: ${JSON.stringify(row)}`)
    }
  }

  result.success = result.errors.length === 0 || result.transactions.length > 0
  return result
}

export function parseCoinbasePro(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Coinbase Pro'
  }

  const parsed = Papa.parse<CoinbaseProRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row['created at'] || !row.product) continue

      const side = row.side.toLowerCase()
      const [baseAsset] = row.product.split('-')
      const amount = parseAmount(row.size)
      const price = parseAmount(row.price)
      const fee = parseAmount(row.fee)

      const tx: ParsedTransaction = {
        timestamp: parseDate(row['created at']),
        type: side === 'buy' ? 'buy' : 'sell',
        asset: baseAsset,
        amount,
        price,
        fee,
        feeAsset: row['price/fee/total unit'] || 'USD',
        exchange: 'Coinbase Pro',
        source: 'CEX_IMPORT',
        rawData: row as unknown as Record<string, unknown>
      }

      result.transactions.push(tx)
    } catch (err) {
      result.errors.push(`Failed to parse row: ${JSON.stringify(row)}`)
    }
  }

  result.success = result.errors.length === 0 || result.transactions.length > 0
  return result
}

export function parseCoinbase(csvContent: string, headers: string[]): ParseResult {
  if (isCoinbaseProFile(headers)) {
    return parseCoinbasePro(csvContent)
  }
  return parseCoinbaseStandard(csvContent)
}
