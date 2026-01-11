import Papa from 'papaparse'
import type { ParsedTransaction, ParseResult, ParsedTransactionType } from '@/types/transaction'

// Kraken ledger CSV headers
const KRAKEN_LEDGER_HEADERS = ['txid', 'refid', 'time', 'type', 'subtype', 'aclass', 'asset', 'amount', 'fee', 'balance']
const KRAKEN_TRADES_HEADERS = ['txid', 'ordertxid', 'pair', 'time', 'type', 'ordertype', 'price', 'cost', 'fee', 'vol', 'margin', 'misc', 'ledgers']

export function isKrakenFile(headers: string[]): boolean {
  const hasLedgerHeaders = KRAKEN_LEDGER_HEADERS.some(h => headers.includes(h)) && headers.includes('asset')
  const hasTradeHeaders = KRAKEN_TRADES_HEADERS.some(h => headers.includes(h)) && headers.includes('pair')
  return hasLedgerHeaders || hasTradeHeaders
}

export function isKrakenLedgerFile(headers: string[]): boolean {
  return headers.includes('txid') && headers.includes('asset') && headers.includes('type') && headers.includes('amount')
}

export function isKrakenTradesFile(headers: string[]): boolean {
  return headers.includes('pair') && headers.includes('type') && headers.includes('vol')
}

interface KrakenLedgerRow {
  txid: string
  refid: string
  time: string
  type: string
  subtype: string
  aclass: string
  asset: string
  amount: string
  fee: string
  balance: string
}

interface KrakenTradesRow {
  txid: string
  ordertxid: string
  pair: string
  time: string
  type: string
  ordertype: string
  price: string
  cost: string
  fee: string
  vol: string
  margin: string
  misc: string
  ledgers: string
}

function parseDate(dateStr: string): Date {
  // Kraken uses format: YYYY-MM-DD HH:mm:ss.SSSS
  const parsed = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(parsed.getTime())) {
    return new Date(dateStr)
  }
  return parsed
}

function parseAmount(value: string): number {
  if (!value) return 0
  return parseFloat(value.replace(/,/g, '')) || 0
}

// Kraken uses special asset names, map them to standard
function normalizeAsset(asset: string): string {
  const assetMap: Record<string, string> = {
    'XXBT': 'BTC',
    'XBT': 'BTC',
    'XETH': 'ETH',
    'XXRP': 'XRP',
    'XXLM': 'XLM',
    'XLTC': 'LTC',
    'ZUSD': 'USD',
    'ZEUR': 'EUR',
    'ZGBP': 'GBP',
    'ZCAD': 'CAD',
    'ZJPY': 'JPY',
  }

  // Remove leading X or Z for assets
  let normalized = asset

  if (assetMap[asset]) {
    return assetMap[asset]
  }

  // Handle assets with X or Z prefix
  if (asset.startsWith('X') || asset.startsWith('Z')) {
    normalized = asset.slice(1)
  }

  return normalized
}

function mapTransactionType(type: string, subtype?: string): ParsedTransactionType {
  const normalized = type.toLowerCase().trim()

  const typeMap: Record<string, ParsedTransactionType> = {
    'trade': 'buy', // Will be adjusted based on amount sign
    'deposit': 'deposit',
    'withdrawal': 'withdrawal',
    'transfer': 'transfer',
    'staking': 'stake',
    'receive': 'deposit',
    'spend': 'withdrawal',
    'reward': 'reward',
    'dividend': 'reward',
    'settled': 'transfer',
    'margin': 'other',
  }

  return typeMap[normalized] || 'other'
}

function extractPairAssets(pair: string): { base: string; quote: string } {
  // Kraken pairs can be like: XXBTZUSD, XETHZUSD, BTCUSD, etc.
  const quoteCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'ZUSD', 'ZEUR', 'ZGBP', 'ZCAD', 'ZJPY', 'XBT', 'XXBT', 'ETH', 'XETH']

  for (const quote of quoteCurrencies) {
    if (pair.endsWith(quote)) {
      return {
        base: normalizeAsset(pair.slice(0, -quote.length)),
        quote: normalizeAsset(quote)
      }
    }
  }

  // Fallback: try to split in half
  const mid = Math.floor(pair.length / 2)
  return {
    base: normalizeAsset(pair.slice(0, mid)),
    quote: normalizeAsset(pair.slice(mid))
  }
}

export function parseKrakenLedger(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Kraken'
  }

  const parsed = Papa.parse<KrakenLedgerRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row.time || !row.asset) continue

      const amount = parseAmount(row.amount)
      let type = mapTransactionType(row.type, row.subtype)

      // For trades, determine buy/sell based on amount sign
      if (row.type.toLowerCase() === 'trade') {
        type = amount > 0 ? 'buy' : 'sell'
      }

      const tx: ParsedTransaction = {
        timestamp: parseDate(row.time),
        type,
        asset: normalizeAsset(row.asset),
        amount: Math.abs(amount),
        fee: Math.abs(parseAmount(row.fee)),
        feeAsset: normalizeAsset(row.asset),
        exchange: 'Kraken',
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

export function parseKrakenTrades(csvContent: string): ParseResult {
  const result: ParseResult = {
    success: true,
    transactions: [],
    errors: [],
    exchange: 'Kraken'
  }

  const parsed = Papa.parse<KrakenTradesRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase()
  })

  if (parsed.errors.length > 0) {
    result.errors = parsed.errors.map(e => `Row ${e.row}: ${e.message}`)
  }

  for (const row of parsed.data) {
    try {
      if (!row.time || !row.pair) continue

      const { base } = extractPairAssets(row.pair)
      const side = row.type.toLowerCase()
      const volume = parseAmount(row.vol)
      const price = parseAmount(row.price)
      const fee = parseAmount(row.fee)

      const tx: ParsedTransaction = {
        timestamp: parseDate(row.time),
        type: side === 'buy' ? 'buy' : 'sell',
        asset: base,
        amount: volume,
        price,
        fee,
        exchange: 'Kraken',
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

export function parseKraken(csvContent: string, headers: string[]): ParseResult {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  if (isKrakenTradesFile(normalizedHeaders)) {
    return parseKrakenTrades(csvContent)
  }
  if (isKrakenLedgerFile(normalizedHeaders)) {
    return parseKrakenLedger(csvContent)
  }

  return {
    success: false,
    transactions: [],
    errors: ['Unrecognized Kraken CSV format'],
    exchange: 'Kraken'
  }
}
