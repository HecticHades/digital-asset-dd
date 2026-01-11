import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiListResponse, type ApiItemResponse } from '@/lib/api/auth'
import { z } from 'zod'

// Response type for client
interface ClientResponse {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  status: string
  riskLevel: string
  createdAt: string
  updatedAt: string
}

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED']).optional(),
  search: z.string().optional(),
})

// Create client schema
const createClientSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

/**
 * GET /api/v1/clients
 * List all clients with pagination and filtering
 */
export async function GET(request: NextRequest) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { searchParams } = request.nextUrl
    const queryResult = listQuerySchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      status: searchParams.get('status') || undefined,
      riskLevel: searchParams.get('risk_level') || undefined,
      search: searchParams.get('search') || undefined,
    })

    if (!queryResult.success) {
      return createApiErrorResponse(
        'Invalid query parameters',
        400,
        auth.apiKeyId
      )
    }

    const { page, limit, status, riskLevel, search } = queryResult.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ClientWhereInput = {
      organizationId: auth.organizationId,
    }

    if (status) {
      where.status = status
    }

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          riskLevel: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.client.count({ where }),
    ])

    const response: ApiListResponse<ClientResponse> = {
      data: clients.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
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
    console.error('API Error [GET /api/v1/clients]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * POST /api/v1/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  const auth = await withApiAuth(request, { requiredScopes: ['write'] })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const validation = createClientSchema.safeParse(body)

    if (!validation.success) {
      return createApiErrorResponse(
        validation.error.errors[0]?.message || 'Invalid request body',
        400,
        auth.apiKeyId
      )
    }

    const { name, email, phone, address, notes } = validation.data

    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone,
        address,
        notes,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const response: ApiItemResponse<ClientResponse> = {
      data: {
        ...client,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
      },
    }

    return createApiResponse(response, 201, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [POST /api/v1/clients]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
