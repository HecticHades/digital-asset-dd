import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiItemResponse } from '@/lib/api/auth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Response type for client with details
interface ClientDetailResponse {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  status: string
  riskLevel: string
  createdAt: string
  updatedAt: string
  _counts: {
    wallets: number
    documents: number
    transactions: number
    cases: number
  }
}

// Update client schema
const updateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED']).optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED']).optional(),
})

/**
 * GET /api/v1/clients/[clientId]
 * Get a single client by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { clientId } = await params

    const client = await prisma.client.findUnique({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        notes: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            wallets: true,
            documents: true,
            transactions: true,
            cases: true,
          },
        },
      },
    })

    if (!client) {
      return createApiErrorResponse('Client not found', 404, auth.apiKeyId)
    }

    const response: ApiItemResponse<ClientDetailResponse> = {
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        status: client.status,
        riskLevel: client.riskLevel,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        _counts: client._count,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [GET /api/v1/clients/[clientId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * PATCH /api/v1/clients/[clientId]
 * Update a client
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['write'] })
  if (!auth.success) return auth.response

  try {
    const { clientId } = await params
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

    if (!validation.success) {
      return createApiErrorResponse(
        validation.error.errors[0]?.message || 'Invalid request body',
        400,
        auth.apiKeyId
      )
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingClient) {
      return createApiErrorResponse('Client not found', 404, auth.apiKeyId)
    }

    const client = await prisma.client.update({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
      data: validation.data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        notes: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            wallets: true,
            documents: true,
            transactions: true,
            cases: true,
          },
        },
      },
    })

    const response: ApiItemResponse<ClientDetailResponse> = {
      data: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        notes: client.notes,
        status: client.status,
        riskLevel: client.riskLevel,
        createdAt: client.createdAt.toISOString(),
        updatedAt: client.updatedAt.toISOString(),
        _counts: client._count,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [PATCH /api/v1/clients/[clientId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * DELETE /api/v1/clients/[clientId]
 * Delete a client
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['delete'] })
  if (!auth.success) return auth.response

  try {
    const { clientId } = await params

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingClient) {
      return createApiErrorResponse('Client not found', 404, auth.apiKeyId)
    }

    await prisma.client.delete({
      where: {
        id: clientId,
        organizationId: auth.organizationId,
      },
    })

    return createApiResponse({ message: 'Client deleted successfully' }, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [DELETE /api/v1/clients/[clientId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
