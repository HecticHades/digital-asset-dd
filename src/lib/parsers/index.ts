import type { ParseResult, ExchangeType } from '@/types/transaction'
import { isBinanceFile, parseBinance } from './binance'
import { isCoinbaseFile, parseCoinbase } from './coinbase'
import { isKrakenFile, parseKraken } from './kraken'

// Note: Import parsers directly from their files instead of re-exporting
// e.g., import { parseBinance } from '@/lib/parsers/binance'

/**
 * Extracts headers from CSV content
 * Dynamically imports papaparse to reduce bundle size
 */
export async function extractHeaders(csvContent: string): Promise<string[]> {
  const Papa = (await import('papaparse')).default

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
 * @deprecated Use extractHeaders() first, then call detectExchange()
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
export async function parseCSV(csvContent: string): Promise<ParseResult> {
  const headers = await extractHeaders(csvContent)

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

    reader.onload = async (event) => {
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

      const result = await parseCSV(content)
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
