export type ParsedTransactionType = 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'transfer' | 'swap' | 'stake' | 'unstake' | 'reward' | 'fee' | 'other'

export interface ParsedTransaction {
  timestamp: Date
  type: ParsedTransactionType
  asset: string
  amount: number
  price?: number
  fee?: number
  feeAsset?: string
  exchange: string
  source: 'CEX_IMPORT' | 'ON_CHAIN' | 'API_SYNC' | 'MANUAL'
  rawData?: Record<string, unknown>
}

export interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  errors: string[]
  exchange: string | null
}

export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'unknown'
