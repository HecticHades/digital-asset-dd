import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiItemResponse } from '@/lib/api/auth'
import { z } from 'zod'

// Response type for document detail
interface DocumentDetailResponse {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  category: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  verifiedAt: string | null
  client: {
    id: string
    name: string
    email: string | null
  }
  verifiedBy: {
    id: string
    name: string
    email: string
  } | null
}

// Update document schema
const updateDocumentSchema = z.object({
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
  notes: z.string().max(5000).optional().nullable(),
})

/**
 * GET /api/v1/documents/[documentId]
 * Get a single document by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { documentId } = await params

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        organizationId: auth.organizationId,
      },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true,
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
            email: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!document) {
      return createApiErrorResponse('Document not found', 404, auth.apiKeyId)
    }

    const response: ApiItemResponse<DocumentDetailResponse> = {
      data: {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        verifiedAt: document.verifiedAt?.toISOString() || null,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [GET /api/v1/documents/[documentId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * PATCH /api/v1/documents/[documentId]
 * Update a document (status, category, notes)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['write'] })
  if (!auth.success) return auth.response

  try {
    const { documentId } = await params
    const body = await request.json()
    const validation = updateDocumentSchema.safeParse(body)

    if (!validation.success) {
      return createApiErrorResponse(
        validation.error.errors[0]?.message || 'Invalid request body',
        400,
        auth.apiKeyId
      )
    }

    // Check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: {
        id: documentId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingDocument) {
      return createApiErrorResponse('Document not found', 404, auth.apiKeyId)
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.category !== undefined) updateData.category = validation.data.category
    if (validation.data.notes !== undefined) updateData.notes = validation.data.notes

    // Handle status change with verification tracking
    if (validation.data.status !== undefined) {
      updateData.status = validation.data.status
      if (validation.data.status === 'VERIFIED') {
        updateData.verifiedAt = new Date()
        // Note: verifiedById would need to come from API key context or be passed
      } else if (validation.data.status === 'PENDING') {
        updateData.verifiedAt = null
        updateData.verifiedById = null
      }
    }

    const document = await prisma.document.update({
      where: {
        id: documentId,
        organizationId: auth.organizationId,
      },
      data: updateData,
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        path: true,
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
            email: true,
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const response: ApiItemResponse<DocumentDetailResponse> = {
      data: {
        ...document,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        verifiedAt: document.verifiedAt?.toISOString() || null,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [PATCH /api/v1/documents/[documentId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * DELETE /api/v1/documents/[documentId]
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['delete'] })
  if (!auth.success) return auth.response

  try {
    const { documentId } = await params

    // Check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: {
        id: documentId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingDocument) {
      return createApiErrorResponse('Document not found', 404, auth.apiKeyId)
    }

    await prisma.document.delete({
      where: {
        id: documentId,
        organizationId: auth.organizationId,
      },
    })

    return createApiResponse({ message: 'Document deleted successfully' }, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [DELETE /api/v1/documents/[documentId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
