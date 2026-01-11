/**
 * Zod validators for exchange API connections
 */

import { z } from 'zod'

/**
 * Exchange types matching Prisma enum
 */
export const ExchangeTypeSchema = z.enum(['BINANCE', 'COINBASE', 'KRAKEN'])
export type ExchangeTypeValue = z.infer<typeof ExchangeTypeSchema>

/**
 * Schema for adding an exchange connection
 */
export const addExchangeConnectionSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  exchange: ExchangeTypeSchema,
  apiKey: z.string().min(1, 'API key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
  label: z.string().optional(),
})

export type AddExchangeConnectionInput = z.infer<typeof addExchangeConnectionSchema>

/**
 * Schema for updating an exchange connection
 */
export const updateExchangeConnectionSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
  label: z.string().optional(),
  isActive: z.boolean().optional(),
})

export type UpdateExchangeConnectionInput = z.infer<typeof updateExchangeConnectionSchema>

/**
 * Schema for removing an exchange connection
 */
export const removeExchangeConnectionSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
})

/**
 * Schema for syncing exchange transactions
 */
export const syncExchangeConnectionSchema = z.object({
  connectionId: z.string().min(1, 'Connection ID is required'),
})

/**
 * Exchange display names and info
 */
export const EXCHANGE_DISPLAY_INFO: Record<ExchangeTypeValue, {
  displayName: string
  description: string
  logoColor: string
  docsUrl: string
}> = {
  BINANCE: {
    displayName: 'Binance',
    description: 'Binance exchange - requires API key with read permissions',
    logoColor: 'bg-yellow-500',
    docsUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
  },
  COINBASE: {
    displayName: 'Coinbase',
    description: 'Coinbase Advanced Trade API - requires API key with read permissions',
    logoColor: 'bg-blue-600',
    docsUrl: 'https://docs.cloud.coinbase.com/sign-in-with-coinbase/docs/api-key-authentication',
  },
  KRAKEN: {
    displayName: 'Kraken',
    description: 'Kraken exchange - requires API key with Query permissions',
    logoColor: 'bg-purple-600',
    docsUrl: 'https://docs.kraken.com/rest/#section/Authentication',
  },
}
