import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiListResponse, type ApiItemResponse } from '@/lib/api/auth'
import { z } from 'zod'

// Response type for case
interface CaseResponse {
  id: string
  title: string
  description: string | null
  status: string
  riskScore: number | null
  riskLevel: string
  dueDate: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
  }
  assignedTo: {
    id: string
    name: string
  } | null
}

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'ARCHIVED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED']).optional(),
  clientId: z.string().optional(),
})

// Create case schema
const createCaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  clientId: z.string(),
  dueDate: z.string().datetime().optional().nullable(),
})

/**
 * GET /api/v1/cases
 * List all cases with pagination and filtering
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
      clientId: searchParams.get('client_id') || undefined,
    })

    if (!queryResult.success) {
      return createApiErrorResponse(
        'Invalid query parameters',
        400,
        auth.apiKeyId
      )
    }

    const { page, limit, status, riskLevel, clientId } = queryResult.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.CaseWhereInput = {
      organizationId: auth.organizationId,
    }

    if (status) {
      where.status = status
    }

    if (riskLevel) {
      where.riskLevel = riskLevel
    }

    if (clientId) {
      where.clientId = clientId
    }

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          riskScore: true,
          riskLevel: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.case.count({ where }),
    ])

    const response: ApiListResponse<CaseResponse> = {
      data: cases.map((c) => ({
        ...c,
        dueDate: c.dueDate?.toISOString() || null,
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
    console.error('API Error [GET /api/v1/cases]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * POST /api/v1/cases
 * Create a new case
 */
export async function POST(request: NextRequest) {
  const auth = await withApiAuth(request, { requiredScopes: ['write'] })
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const validation = createCaseSchema.safeParse(body)

    if (!validation.success) {
      return createApiErrorResponse(
        validation.error.errors[0]?.message || 'Invalid request body',
        400,
        auth.apiKeyId
      )
    }

    const { title, description, clientId, dueDate } = validation.data

    // Verify client exists and belongs to organization
    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
    })

    if (!client) {
      return createApiErrorResponse('Client not found', 404, auth.apiKeyId)
    }

    const caseRecord = await prisma.case.create({
      data: {
        title,
        description,
        clientId,
        dueDate: dueDate ? new Date(dueDate) : null,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const response: ApiItemResponse<CaseResponse> = {
      data: {
        ...caseRecord,
        dueDate: caseRecord.dueDate?.toISOString() || null,
        createdAt: caseRecord.createdAt.toISOString(),
        updatedAt: caseRecord.updatedAt.toISOString(),
      },
    }

    return createApiResponse(response, 201, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [POST /api/v1/cases]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
