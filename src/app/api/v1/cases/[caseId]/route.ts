import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { withApiAuth, createApiResponse, createApiErrorResponse, type ApiItemResponse } from '@/lib/api/auth'
import { z } from 'zod'

// Response type for case with details
interface CaseDetailResponse {
  id: string
  title: string
  description: string | null
  status: string
  riskScore: number | null
  riskLevel: string
  dueDate: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    name: string
    email: string | null
    status: string
    riskLevel: string
  }
  assignedTo: {
    id: string
    name: string
    email: string
  } | null
  reviewedBy: {
    id: string
    name: string
    email: string
  } | null
  _counts: {
    findings: number
    checklistItems: number
    reports: number
  }
}

// Update case schema
const updateCaseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'ARCHIVED']).optional(),
  riskScore: z.number().int().min(0).max(100).optional().nullable(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNASSESSED']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
})

/**
 * GET /api/v1/cases/[caseId]
 * Get a single case by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['read'] })
  if (!auth.success) return auth.response

  try {
    const { caseId } = await params

    const caseRecord = await prisma.case.findUnique({
      where: {
        id: caseId,
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
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            riskLevel: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            findings: true,
            checklistItems: true,
            reports: true,
          },
        },
      },
    })

    if (!caseRecord) {
      return createApiErrorResponse('Case not found', 404, auth.apiKeyId)
    }

    const response: ApiItemResponse<CaseDetailResponse> = {
      data: {
        id: caseRecord.id,
        title: caseRecord.title,
        description: caseRecord.description,
        status: caseRecord.status,
        riskScore: caseRecord.riskScore,
        riskLevel: caseRecord.riskLevel,
        dueDate: caseRecord.dueDate?.toISOString() || null,
        reviewNotes: caseRecord.reviewNotes,
        reviewedAt: caseRecord.reviewedAt?.toISOString() || null,
        createdAt: caseRecord.createdAt.toISOString(),
        updatedAt: caseRecord.updatedAt.toISOString(),
        client: caseRecord.client,
        assignedTo: caseRecord.assignedTo,
        reviewedBy: caseRecord.reviewedBy,
        _counts: caseRecord._count,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [GET /api/v1/cases/[caseId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * PATCH /api/v1/cases/[caseId]
 * Update a case
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['write'] })
  if (!auth.success) return auth.response

  try {
    const { caseId } = await params
    const body = await request.json()
    const validation = updateCaseSchema.safeParse(body)

    if (!validation.success) {
      return createApiErrorResponse(
        validation.error.errors[0]?.message || 'Invalid request body',
        400,
        auth.apiKeyId
      )
    }

    // Check if case exists
    const existingCase = await prisma.case.findUnique({
      where: {
        id: caseId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingCase) {
      return createApiErrorResponse('Case not found', 404, auth.apiKeyId)
    }

    // If assignedToId provided, verify user exists
    if (validation.data.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: {
          id: validation.data.assignedToId,
          organizationId: auth.organizationId,
        },
      })

      if (!assignee) {
        return createApiErrorResponse('Assigned user not found', 404, auth.apiKeyId)
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validation.data.title !== undefined) updateData.title = validation.data.title
    if (validation.data.description !== undefined) updateData.description = validation.data.description
    if (validation.data.status !== undefined) updateData.status = validation.data.status
    if (validation.data.riskScore !== undefined) updateData.riskScore = validation.data.riskScore
    if (validation.data.riskLevel !== undefined) updateData.riskLevel = validation.data.riskLevel
    if (validation.data.dueDate !== undefined) updateData.dueDate = validation.data.dueDate ? new Date(validation.data.dueDate) : null
    if (validation.data.assignedToId !== undefined) updateData.assignedToId = validation.data.assignedToId

    const caseRecord = await prisma.case.update({
      where: {
        id: caseId,
        organizationId: auth.organizationId,
      },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        riskScore: true,
        riskLevel: true,
        dueDate: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            riskLevel: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            findings: true,
            checklistItems: true,
            reports: true,
          },
        },
      },
    })

    const response: ApiItemResponse<CaseDetailResponse> = {
      data: {
        id: caseRecord.id,
        title: caseRecord.title,
        description: caseRecord.description,
        status: caseRecord.status,
        riskScore: caseRecord.riskScore,
        riskLevel: caseRecord.riskLevel,
        dueDate: caseRecord.dueDate?.toISOString() || null,
        reviewNotes: caseRecord.reviewNotes,
        reviewedAt: caseRecord.reviewedAt?.toISOString() || null,
        createdAt: caseRecord.createdAt.toISOString(),
        updatedAt: caseRecord.updatedAt.toISOString(),
        client: caseRecord.client,
        assignedTo: caseRecord.assignedTo,
        reviewedBy: caseRecord.reviewedBy,
        _counts: caseRecord._count,
      },
    }

    return createApiResponse(response, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [PATCH /api/v1/cases/[caseId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}

/**
 * DELETE /api/v1/cases/[caseId]
 * Delete a case
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  const auth = await withApiAuth(request, { requiredScopes: ['delete'] })
  if (!auth.success) return auth.response

  try {
    const { caseId } = await params

    // Check if case exists
    const existingCase = await prisma.case.findUnique({
      where: {
        id: caseId,
        organizationId: auth.organizationId,
      },
    })

    if (!existingCase) {
      return createApiErrorResponse('Case not found', 404, auth.apiKeyId)
    }

    // Prevent deletion of completed/approved cases
    if (['COMPLETED', 'APPROVED'].includes(existingCase.status)) {
      return createApiErrorResponse(
        'Cannot delete completed or approved cases',
        400,
        auth.apiKeyId
      )
    }

    await prisma.case.delete({
      where: {
        id: caseId,
        organizationId: auth.organizationId,
      },
    })

    return createApiResponse({ message: 'Case deleted successfully' }, 200, auth.apiKeyId)
  } catch (error) {
    console.error('API Error [DELETE /api/v1/cases/[caseId]]:', error)
    return createApiErrorResponse('Internal server error', 500, auth.apiKeyId)
  }
}
