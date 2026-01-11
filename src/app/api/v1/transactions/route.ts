import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiListResponse } from '@/lib/api/auth'
import { z } from 'zod'

// Response type for transaction
interface TransactionResponse {
  id: string
  timestamp: string
  type: string
  asset: string
  amount: string
  price: string | null
  fee: string | null
  value: string | null
  exchange: string | null
  source: string
  txHash: string | null
  fromAddress: string | null
  toAddress: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
  }
  wallet: {
    id: string
    address: string
    blockchain: string
  } | null
}

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clientId: z.string().optional(),
  walletId: z.string().optional(),
  type: z.enum([
    'BUY',
    'SELL',
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'SWAP',
    'STAKE',
    'UNSTAKE',
    'REWARD',
    'FEE',
    'OTHER',
  ]).optional(),
  source: z.enum(['CEX_IMPORT', 'ON_CHAIN', 'API_SYNC', 'MANUAL']).optional(),
  asset: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

/**
 * GET /api/v1/transactions
 * List all transactions with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = request.nextUrl
    const queryResult = listQuerySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      clientId: searchParams.get('client_id') || undefined,
      walletId: searchParams.get('wallet_id') || undefined,
      type: searchParams.get('type') || undefined,
      source: searchParams.get('source') || undefined,
      asset: searchParams.get('asset') || undefined,
      startDate: searchParams.get('start_date') || undefined,
      endDate: searchParams.get('end_date') || undefined,
    })

    if (!queryResult.success) {
      return createApiErrorResponse(
        'Invalid query parameters',
        400,
        auth.apiKeyId
      )
    }

    const { page, limit, clientId, walletId, type, source, asset, startDate, endDate } = queryResult.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      organizationId: auth.organizationId,
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (walletId) {
      where.walletId = walletId
    }

    if (type) {
      where.type = type
    }

    if (source) {
      where.source = source
    }

    if (asset) {
      where.asset = { equals: asset, mode: 'insensitive' }
    }

    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) {
        where.timestamp.gte = new Date(startDate)
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate)
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          type: true,
          asset: true,
          amount: true,
          price: true,
          fee: true,
          value: true,
          exchange: true,
          source: true,
          txHash: true,
          fromAddress: true,
          toAddress: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          wallet: {
            select: {
              id: true,
              address: true,
              blockchain: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ])

    const response: ApiListResponse<TransactionResponse> = {
      data: transactions.map((t) => ({
        ...t,
        timestamp: t.timestamp.toISOString(),
        amount: t.amount.toString(),
        price: t.price?.toString() || null,
        fee: t.fee?.toString() || null,
        value: t.value?.toString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [GET /api/v1/transactions]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
