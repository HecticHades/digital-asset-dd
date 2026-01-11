import Papa from 'papaparse'
import type { ParseResult, ExchangeType } from '@/types/transaction'
import { isBinanceFile, parseBinance } from './binance'
import { isCoinbaseFile, parseCoinbase } from './coinbase'
import { isKrakenFile, parseKraken } from './kraken'

export { parseBinance } from './binance'
export { parseCoinbase } from './coinbase'
export { parseKraken } from './kraken'

/**
 * Extracts headers from CSV content
 */
export function extractHeaders(csvContent: string): string[] {
  const parsed = Papa.parse(csvContent, {
    preview: 1,
    skipEmptyLines: true
  })

  if (parsed.data.length > 0 && Array.isArray(parsed.data[0])) {
    return (parsed.data[0] as string[]).map(h => h?.trim() || '')
  }

  return []
}

/**
 * Detects the exchange from CSV headers
 */
export function detectExchange(headers: string[]): ExchangeType {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim())

  if (isBinanceFile(headers)) {
    return 'binance'
  }

  if (isCoinbaseFile(headers)) {
    return 'coinbase'
  }

  if (isKrakenFile(headers) || isKrakenFile(normalizedHeaders)) {
    return 'kraken'
  }

  return 'unknown'
}

/**
 * Auto-detects the exchange and parses the CSV content
 */
export function parseCSV(csvContent: string): ParseResult {
  const headers = extractHeaders(csvContent)

  if (headers.length === 0) {
    return {
      success: false,
      transactions: [],
      errors: ['CSV file appears to be empty or invalid'],
      exchange: null
    }
  }

  const exchange = detectExchange(headers)

  switch (exchange) {
    case 'binance':
      return parseBinance(csvContent, headers)

    case 'coinbase':
      return parseCoinbase(csvContent, headers)

    case 'kraken':
      return parseKraken(csvContent, headers)

    default:
      return {
        success: false,
        transactions: [],
        errors: [
          'Unable to detect exchange from CSV headers.',
          'Supported exchanges: Binance, Coinbase, Kraken',
          `Headers found: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`
        ],
        exchange: null
      }
  }
}

/**
 * Parses a file and returns the result
 */
export async function parseFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) {
        resolve({
          success: false,
          transactions: [],
          errors: ['Failed to read file content'],
          exchange: null
        })
        return
      }

      const result = parseCSV(content)
      resolve(result)
    }

    reader.onerror = () => {
      resolve({
        success: false,
        transactions: [],
        errors: ['Failed to read file'],
        exchange: null
      })
    }

    reader.readAsText(file)
  })
}

/**
 * Returns supported exchange names
 */
export function getSupportedExchanges(): string[] {
  return ['Binance', 'Coinbase', 'Coinbase Pro', 'Kraken']
}
