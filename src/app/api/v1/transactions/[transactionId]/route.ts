import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiItemResponse } from '@/lib/api/auth'

// Response type for transaction detail
interface TransactionDetailResponse {
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
  rawData: unknown
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string | null
  }
  wallet: {
    id: string
    address: string
    blockchain: string
    label: string | null
  } | null
  findings: Array<{
    id: string
    title: string
    severity: string
    category: string
    isResolved: boolean
  }>
}

/**
 * GET /api/v1/transactions/[transactionId]
 * Get a single transaction by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { transactionId } = await params

    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
        organizationId: auth.organizationId,
      },
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
        rawData: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        wallet: {
          select: {
            id: true,
            address: true,
            blockchain: true,
            label: true,
          },
        },
        findings: {
          select: {
            id: true,
            title: true,
            severity: true,
            category: true,
            isResolved: true,
          },
        },
      },
    })

    if (!transaction) {
      return createApiErrorResponse('Transaction not found', 404, auth.apiKeyId)
    }

    const response: ApiItemResponse<TransactionDetailResponse> = {
      data: {
        ...transaction,
        timestamp: transaction.timestamp.toISOString(),
        amount: transaction.amount.toString(),
        price: transaction.price?.toString() || null,
        fee: transaction.fee?.toString() || null,
        value: transaction.value?.toString() || null,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [GET /api/v1/transactions/[transactionId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * DELETE /api/v1/transactions/[transactionId]
 * Delete a transaction
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['delete'] })
  if (!auth.success) return auth.response

  try {
    const { transactionId } = await params

    // Check if transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingTransaction) {
      return createApiErrorResponse('Transaction not found', 404, auth.apiKeyId)
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
        organizationId: auth.organizationId,
      },
    })

    return createApiResponse({ message: 'Transaction deleted successfully' }, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [DELETE /api/v1/transactions/[transactionId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
