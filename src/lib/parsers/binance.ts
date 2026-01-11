import Papa from 'papaparse'
import type { ParsedTransaction, ParseResult, ParsedTransactionType } from '@/types/transaction'

// Binance trade history CSV headers
const BINANCE_TRADE_HEADERS = ['Date(UTC)', 'Pair', 'Side', 'Price', 'Executed', 'Amount', 'Fee']
const BINANCE_DEPOSIT_HEADERS = ['Date(UTC)', 'Coin', 'Network', 'Amount', 'TransactionFee', 'Address', 'TXID', 'Status']
const BINANCE_WITHDRAW_HEADERS = ['Date(UTC)', 'Coin', 'Network', 'Amount', 'TransactionFee', 'Address', 'TXID', 'Status']

export function isBinanceTradeHistory(headers: string[]): boolean {
  return BINANCE_TRADE_HEADERS.every(h => headers.includes(h))
}

export function isBinanceDepositHistory(headers: string[]): boolean {
  return BINANCE_DEPOSIT_HEADERS.every(h => headers.includes(h))
}

export function isBinanceWithdrawHistory(headers: string[]): boolean {
  return BINANCE_WITHDRAW_HEADERS.some(h => headers.includes(h)) && headers.includes('Coin')
}

export function isBinanceFile(headers: string[]): boolean {
  return isBinanceTradeHistory(headers) || isBinanceDepositHistory(headers) || isBinanceWithdrawHistory(headers)
}

interface BinanceTradeRow {
  'Date(UTC)': string
  Pair: string
  Side: string
  Price: string
  Executed: string
  Amount: string
  Fee: string
}

interface BinanceDepositRow {
  'Date(UTC)': string
  Coin: string
  Network: string
  Amount: string
  TransactionFee: string
  Address: string
  TXID: string
  Status: string
}

function parseDate(dateStr: string): Date {
  // Binance uses format: YYYY-MM-DD HH:mm:ss
  const parsed = new Date(dateStr.replace(' ', 'T') + 'Z')
  if (isNaN(parsed.getTime())) {
    return new Date(dateStr)
  }
  return parsed
}

function extractAssetFromPair(pair: string, side: string): { baseAsset: string; quoteAsset: string } {
  // Common quote assets in order of priority
  const quoteAssets = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB']

  for (const quote of quoteAssets) {
    if (pair.endsWith(quote)) {
      return {
        baseAsset: pair.slice(0, -quote.length),
        quoteAsset: quote
      }
    }
  }

  // Fallback: assume last 4 chars are quote
  return {
    baseAsset: pair.slice(0, -4),
    quoteAsset: pair.slice(-4)
  }
}

function parseAmount(value: string): number {
  if (!value) return 0
  // Remove commas and parse
  return parseFloat(value.replace(/,/g, '')) || 0
}

function extractFeeAsset(feeStr: string): { fee: number; asset: string } {
  // Fee format: "0.001BTC" or "0.5 USDT"
  const match = feeStr.match(/^([\d.,]+)\s*([A-Z]+)$/)
  if (match) {
    return {
      fee: parseAmount(match[1]),
      asset: match[2]
    }
  }
  return { fee: parseAmount(feeStr), asset: '' }
}

export function parseBinanceTrades(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Binance'
  }

  const parsed = Papa.parse<BinanceTradeRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row['Date(UTC)'] || !row.Pair) continue

      const { baseAsset, quoteAsset } = extractAssetFromPair(row.Pair, row.Side)
      const side = row.Side.toLowerCase()
      const executed = parseAmount(row.Executed)
      const price = parseAmount(row.Price)
      const { fee, asset: feeAsset } = extractFeeAsset(row.Fee)

      const tx: ParsedTransaction = {
        timestamp: parseDate(row['Date(UTC)']),
        type: side === 'buy' ? 'buy' : 'sell',
        asset: baseAsset,
        amount: executed,
        price: price,
        fee: fee,
        feeAsset: feeAsset || quoteAsset,
        exchange: 'Binance',
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

export function parseBinanceDeposits(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Binance'
  }

  const parsed = Papa.parse<BinanceDepositRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row['Date(UTC)'] || !row.Coin) continue
      if (row.Status && row.Status.toLowerCase() !== 'completed') continue

      const tx: ParsedTransaction = {
        timestamp: parseDate(row['Date(UTC)']),
        type: 'deposit',
        asset: row.Coin,
        amount: parseAmount(row.Amount),
        fee: parseAmount(row.TransactionFee),
        feeAsset: row.Coin,
        exchange: 'Binance',
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

export function parseBinanceWithdrawals(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Binance'
  }

  const parsed = Papa.parse<BinanceDepositRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row['Date(UTC)'] || !row.Coin) continue
      if (row.Status && row.Status.toLowerCase() !== 'completed') continue

      const tx: ParsedTransaction = {
        timestamp: parseDate(row['Date(UTC)']),
        type: 'withdrawal',
        asset: row.Coin,
        amount: parseAmount(row.Amount),
        fee: parseAmount(row.TransactionFee),
        feeAsset: row.Coin,
        exchange: 'Binance',
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

export function parseBinance(csvContent: string, headers: string[]): ParseResult {
  if (isBinanceTradeHistory(headers)) {
    return parseBinanceTrades(csvContent)
  }
  if (isBinanceDepositHistory(headers)) {
    return parseBinanceDeposits(csvContent)
  }
  if (isBinanceWithdrawHistory(headers)) {
    return parseBinanceWithdrawals(csvContent)
  }

  return {
    success: false,
    transactions: [],
    errors: ['Unrecognized Binance CSV format'],
    exchange: 'Binance'
  }
}
