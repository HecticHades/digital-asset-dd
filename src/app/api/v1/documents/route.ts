import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiListResponse } from '@/lib/api/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Response type for document
interface DocumentResponse {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  category: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  verifiedAt: string | null
  client: {
    id: string
    name: string
  }
  verifiedBy: {
    id: string
    name: string
  } | null
}

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  clientId: z.string().optional(),
  category: z.enum([
    'ID',
    'PROOF_OF_ADDRESS',
    'TAX_RETURNS',
    'BANK_STATEMENTS',
    'SOURCE_OF_WEALTH',
    'SOURCE_OF_FUNDS',
    'EXCHANGE_STATEMENTS',
    'WALLET_PROOF',
    'OTHER',
  ]).optional(),
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
})

/**
 * GET /api/v1/documents
 * List all documents with pagination and filtering
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
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || undefined,
    })

    if (!queryResult.success) {
      return createApiErrorResponse(
        'Invalid query parameters',
        400,
        auth.apiKeyId
      )
    }

    const { page, limit, clientId, category, status } = queryResult.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.DocumentWhereInput = {
      organizationId: auth.organizationId,
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          size: true,
          category: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          verifiedAt: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          verifiedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.document.count({ where }),
    ])

    const response: ApiListResponse<DocumentResponse> = {
      data: documents.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        verifiedAt: d.verifiedAt?.toISOString() || null,
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
    console.error('API Error [GET /api/v1/documents]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
