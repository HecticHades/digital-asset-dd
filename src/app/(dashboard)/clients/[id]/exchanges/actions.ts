'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import {
  addExchangeConnectionSchema,
  updateExchangeConnectionSchema,
  removeExchangeConnectionSchema,
  syncExchangeConnectionSchema,
  type ExchangeTypeValue,
} from '@/lib/validators/exchange'
import {
  validateCredentials,
  encryptCredentials,
  decryptCredentials,
  fetchAllTransactions,
  fetchBalances,
  getMaskedApiKey,
  type ExchangeType,
} from '@/lib/exchanges'
import { TransactionType, TransactionSource, Prisma } from '@prisma/client'

// TODO: Get from auth context
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

/**
 * Convert Prisma exchange type to our exchange type
 */
function toExchangeType(prismaType: ExchangeTypeValue): ExchangeType {
  return prismaType.toLowerCase() as ExchangeType
}

/**
 * Get exchange connections for a client
 */
export async function getExchangeConnections(clientId: string): Promise<{
  connections: Array<{
    id: string
    exchange: ExchangeTypeValue
    label: string | null
    maskedApiKey: string
    isActive: boolean
    lastSyncAt: Date | null
    lastSyncStatus: string | null
    createdAt: Date
  }>
}> {
  const connections = await prisma.exchangeConnection.findMany({
    where: {
      clientId,
      organizationId: TEMP_ORG_ID,
    },
    orderBy: { createdAt: 'desc' },
  })

  return {
    connections: connections.map((conn) => ({
      id: conn.id,
      exchange: conn.exchange,
      label: conn.label,
      maskedApiKey: getMaskedApiKey(conn.encryptedApiKey),
      isActive: conn.isActive,
      lastSyncAt: conn.lastSyncAt,
      lastSyncStatus: conn.lastSyncStatus,
      createdAt: conn.createdAt,
    })),
  }
}

/**
 * Add a new exchange connection
 */
export async function addExchangeConnection(input: {
  clientId: string
  exchange: ExchangeTypeValue
  apiKey: string
  secretKey: string
  label?: string
}): Promise<{ success: boolean; error?: string; connectionId?: string }> {
  const parsed = addExchangeConnectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { clientId, exchange, apiKey, secretKey, label } = parsed.data

  // Verify client exists and belongs to org
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: TEMP_ORG_ID },
  })

  if (!client) {
    return { success: false, error: 'Client not found' }
  }

  // Check if connection already exists for this exchange
  const existing = await prisma.exchangeConnection.findUnique({
    where: {
      clientId_exchange: { clientId, exchange },
    },
  })

  if (existing) {
    return { success: false, error: `A ${exchange} connection already exists for this client` }
  }

  // Validate credentials with the exchange
  const exchangeType = toExchangeType(exchange)
  const validation = await validateCredentials(exchangeType, { apiKey, secretKey })

  if (!validation.valid) {
    return {
      success: false,
      error: `Invalid API credentials: ${validation.error || 'Could not validate with exchange'}`
    }
  }

  // Encrypt credentials
  const encrypted = encryptCredentials({ apiKey, secretKey })

  // Create connection
  const connection = await prisma.exchangeConnection.create({
    data: {
      exchange,
      label,
      encryptedApiKey: encrypted.encryptedApiKey,
      encryptedSecretKey: encrypted.encryptedSecretKey,
      organizationId: TEMP_ORG_ID,
      clientId,
      createdById: TEMP_USER_ID,
    },
  })

  revalidatePath(`/clients/${clientId}`)

  return { success: true, connectionId: connection.id }
}

/**
 * Update an exchange connection
 */
export async function updateExchangeConnection(input: {
  connectionId: string
  label?: string
  isActive?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const parsed = updateExchangeConnectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { connectionId, label, isActive } = parsed.data

  // Verify connection exists and belongs to org
  const connection = await prisma.exchangeConnection.findFirst({
    where: { id: connectionId, organizationId: TEMP_ORG_ID },
  })

  if (!connection) {
    return { success: false, error: 'Connection not found' }
  }

  // Update connection
  await prisma.exchangeConnection.update({
    where: { id: connectionId },
    data: {
      ...(label !== undefined && { label }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  revalidatePath(`/clients/${connection.clientId}`)

  return { success: true }
}

/**
 * Remove an exchange connection
 */
export async function removeExchangeConnection(input: {
  connectionId: string
}): Promise<{ success: boolean; error?: string }> {
  const parsed = removeExchangeConnectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { connectionId } = parsed.data

  // Verify connection exists and belongs to org
  const connection = await prisma.exchangeConnection.findFirst({
    where: { id: connectionId, organizationId: TEMP_ORG_ID },
  })

  if (!connection) {
    return { success: false, error: 'Connection not found' }
  }

  // Delete connection
  await prisma.exchangeConnection.delete({
    where: { id: connectionId },
  })

  revalidatePath(`/clients/${connection.clientId}`)

  return { success: true }
}

/**
 * Sync transactions from an exchange connection
 */
export async function syncExchangeConnection(input: {
  connectionId: string
}): Promise<{
  success: boolean
  error?: string
  transactionsImported?: number
  balances?: Array<{ asset: string; total: number }>
}> {
  const parsed = syncExchangeConnectionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const { connectionId } = parsed.data

  // Get connection with client info
  const connection = await prisma.exchangeConnection.findFirst({
    where: { id: connectionId, organizationId: TEMP_ORG_ID },
    include: { client: true },
  })

  if (!connection) {
    return { success: false, error: 'Connection not found' }
  }

  if (!connection.isActive) {
    return { success: false, error: 'Connection is inactive' }
  }

  try {
    // Decrypt credentials
    const credentials = decryptCredentials({
      encryptedApiKey: connection.encryptedApiKey,
      encryptedSecretKey: connection.encryptedSecretKey,
    })

    const exchangeType = toExchangeType(connection.exchange)

    // Fetch transactions (since last sync if available)
    const transactions = await fetchAllTransactions(
      exchangeType,
      credentials,
      connection.lastSyncAt || undefined
    )

    // Fetch current balances
    const balances = await fetchBalances(exchangeType, credentials)

    // Get existing transaction identifiers to avoid duplicates
    const existingTxIds = new Set(
      (await prisma.transaction.findMany({
        where: {
          clientId: connection.clientId,
          source: 'API_SYNC',
          exchange: connection.exchange,
        },
        select: { rawData: true },
      })).map((tx) => {
        const raw = tx.rawData as { orderId?: string; tradeId?: string; refid?: string } | null
        return raw?.orderId || raw?.tradeId || raw?.refid || ''
      }).filter(Boolean)
    )

    // Filter out duplicates and prepare for insert
    const newTransactions = transactions.filter((tx) => {
      const raw = tx.rawData as { orderId?: string; tradeId?: string; refid?: string } | undefined
      const txId = raw?.orderId || raw?.tradeId || raw?.refid
      return !txId || !existingTxIds.has(txId)
    })

    // Insert new transactions
    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: newTransactions.map((tx) => ({
          timestamp: tx.timestamp,
          type: tx.type.toUpperCase() as TransactionType,
          asset: tx.asset,
          amount: tx.amount,
          price: tx.price || null,
          fee: tx.fee || null,
          value: tx.price ? tx.amount * tx.price : null,
          exchange: connection.exchange,
          source: 'API_SYNC' as TransactionSource,
          rawData: tx.rawData ? (tx.rawData as Prisma.InputJsonValue) : Prisma.JsonNull,
          organizationId: TEMP_ORG_ID,
          clientId: connection.clientId,
        })),
      })
    }

    // Update connection with sync status
    await prisma.exchangeConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: `Success: ${newTransactions.length} new transactions`,
      },
    })

    revalidatePath(`/clients/${connection.clientId}`)

    return {
      success: true,
      transactionsImported: newTransactions.length,
      balances: balances.map((b) => ({ asset: b.asset, total: b.total })),
    }
  } catch (error) {
    // Update connection with error status
    await prisma.exchangeConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync transactions',
    }
  }
}

/**
 * Test exchange credentials without saving
 */
export async function testExchangeCredentials(input: {
  exchange: ExchangeTypeValue
  apiKey: string
  secretKey: string
}): Promise<{
  success: boolean
  error?: string
  permissions?: {
    canRead: boolean
    canTrade?: boolean
    canWithdraw?: boolean
  }
}> {
  const { exchange, apiKey, secretKey } = input

  if (!apiKey || !secretKey) {
    return { success: false, error: 'API key and secret key are required' }
  }

  const exchangeType = toExchangeType(exchange)
  const result = await validateCredentials(exchangeType, { apiKey, secretKey })

  return {
    success: result.valid,
    error: result.error,
    permissions: result.permissions,
  }
}
