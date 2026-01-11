'use server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { createCaseSchema, updateCaseSchema, type CreateCaseInput, type UpdateCaseInput } from '@/lib/validators/case'
import { caseApprovalSchema, type CaseApprovalInput } from '@/lib/validators/approval'
import { revalidatePath } from 'next/cache'
import { dispatchCaseCreated, dispatchCaseStatusChanged } from '@/lib/webhooks'

// TODO: Get actual user/org from session - for now use temp values
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

/**
 * Helper to get current user or temp user for development
 */
async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) {
    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    }
  }
  // Fallback for development
  return {
    id: TEMP_USER_ID,
    role: 'ANALYST' as string,
    organizationId: TEMP_ORG_ID,
  }
}

export async function createCase(data: CreateCaseInput) {
  const validated = createCaseSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    const caseData = await prisma.case.create({
      data: {
        title: validated.data.title,
        description: validated.data.description || null,
        clientId: validated.data.clientId,
        assignedToId: validated.data.assignedToId || null,
        dueDate: validated.data.dueDate ? new Date(validated.data.dueDate) : null,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    revalidatePath('/cases')

    // Dispatch webhook for case creation (fire and forget)
    dispatchCaseCreated({
      organizationId: TEMP_ORG_ID,
      caseId: caseData.id,
      caseTitle: caseData.title,
      clientId: caseData.clientId,
      clientName: caseData.client.name,
      status: caseData.status,
      riskLevel: caseData.riskLevel,
    }).catch((err) => console.error('[Webhook] Failed to dispatch case.created:', err))

    return {
      success: true,
      data: caseData,
    }
  } catch (error) {
    console.error('Failed to create case:', error)
    return {
      success: false,
      error: 'Failed to create case. Please try again.',
    }
  }
}

export async function updateCase(id: string, data: UpdateCaseInput) {
  const validated = updateCaseSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    // Get the current case to check for status changes
    const existingCase = await prisma.case.findUnique({
      where: { id },
      select: { status: true },
    })
    const previousStatus = existingCase?.status

    const updateData: Record<string, unknown> = {}

    if (validated.data.title !== undefined) updateData.title = validated.data.title
    if (validated.data.description !== undefined) updateData.description = validated.data.description || null
    if (validated.data.clientId !== undefined) updateData.clientId = validated.data.clientId
    if (validated.data.assignedToId !== undefined) updateData.assignedToId = validated.data.assignedToId || null
    if (validated.data.dueDate !== undefined) updateData.dueDate = validated.data.dueDate ? new Date(validated.data.dueDate) : null
    if (validated.data.status !== undefined) updateData.status = validated.data.status
    if (validated.data.riskLevel !== undefined) updateData.riskLevel = validated.data.riskLevel
    if (validated.data.riskScore !== undefined) updateData.riskScore = validated.data.riskScore

    const caseData = await prisma.case.update({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${id}`)

    // Dispatch webhook if status changed (fire and forget)
    if (validated.data.status !== undefined && previousStatus !== validated.data.status) {
      dispatchCaseStatusChanged({
        organizationId: TEMP_ORG_ID,
        caseId: caseData.id,
        caseTitle: caseData.title,
        clientId: caseData.clientId,
        clientName: caseData.client.name,
        previousStatus: previousStatus || 'UNKNOWN',
        newStatus: validated.data.status,
      }).catch((err) => console.error('[Webhook] Failed to dispatch case.status_changed:', err))
    }

    return {
      success: true,
      data: caseData,
    }
  } catch (error) {
    console.error('Failed to update case:', error)
    return {
      success: false,
      error: 'Failed to update case. Please try again.',
    }
  }
}

export async function getCases(filters?: {
  status?: string
  riskLevel?: string
  assignedToId?: string
}) {
  try {
    const where: Record<string, unknown> = {
      organizationId: TEMP_ORG_ID,
    }

    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.riskLevel) {
      where.riskLevel = filters.riskLevel
    }
    if (filters?.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, data: cases }
  } catch (error) {
    console.error('Failed to fetch cases:', error)
    return { success: false, error: 'Failed to fetch cases', data: [] }
  }
}

export async function getCase(id: string) {
  try {
    const caseData = await prisma.case.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        client: true,
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
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        findings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        checklistItems: {
          orderBy: {
            order: 'asc',
          },
        },
        reports: {
          orderBy: {
            version: 'desc',
          },
        },
      },
    })

    return { success: true, data: caseData }
  } catch (error) {
    console.error('Failed to fetch case:', error)
    return { success: false, error: 'Failed to fetch case', data: null }
  }
}

export async function getClients() {
  try {
    const clients = await prisma.client.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: clients }
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return { success: false, error: 'Failed to fetch clients', data: [] }
  }
}

export async function getAnalysts() {
  try {
    const analysts = await prisma.user.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
        role: {
          in: ['ANALYST', 'MANAGER'],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return { success: true, data: analysts }
  } catch (error) {
    console.error('Failed to fetch analysts:', error)
    return { success: false, error: 'Failed to fetch analysts', data: [] }
  }
}

// Submit case for review (analyst action)
export async function submitCaseForReview(caseId: string) {
  try {
    // Get the case and verify it exists
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        checklistItems: true,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Verify case is in a submittable state
    if (caseData.status !== 'IN_PROGRESS' && caseData.status !== 'DRAFT') {
      return { success: false, error: 'Case must be in Draft or In Progress status to submit for review' }
    }

    // Check that all required checklist items are complete
    const requiredItems = caseData.checklistItems.filter((item) => item.isRequired)
    const incompleteRequired = requiredItems.filter((item) => !item.isCompleted)

    if (incompleteRequired.length > 0) {
      return {
        success: false,
        error: `Cannot submit: ${incompleteRequired.length} required checklist item(s) not completed`,
      }
    }

    // Update case status to PENDING_REVIEW
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'PENDING_REVIEW',
      },
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${caseId}`)

    return { success: true, data: updatedCase }
  } catch (error) {
    console.error('Failed to submit case for review:', error)
    return { success: false, error: 'Failed to submit case for review. Please try again.' }
  }
}

// Process case approval decision (compliance officer action)
export async function processCaseApproval(data: CaseApprovalInput) {
  // Check permission - only ADMIN and COMPLIANCE_OFFICER can approve/reject cases
  const user = await getAuthenticatedUser()
  if (!hasPermission(user.role, 'cases:review')) {
    return {
      success: false,
      error: 'You do not have permission to approve or reject cases',
    }
  }

  const validated = caseApprovalSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  const { caseId, decision, comment } = validated.data

  try {
    // Get the case and verify it exists
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: user.organizationId,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Verify case is in PENDING_REVIEW status
    if (caseData.status !== 'PENDING_REVIEW') {
      return { success: false, error: 'Case must be in Pending Review status to approve or reject' }
    }

    // Determine new status based on decision
    const newStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED'

    // Update case with approval decision
    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: newStatus,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNotes: comment,
      },
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${caseId}`)

    return { success: true, data: updatedCase }
  } catch (error) {
    console.error('Failed to process case approval:', error)
    return { success: false, error: 'Failed to process case approval. Please try again.' }
  }
}

// Get pending review cases (for compliance officer view)
export async function getPendingReviewCases() {
  try {
    const cases = await prisma.case.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
        status: 'PENDING_REVIEW',
      },
      include: {
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
        findings: {
          where: {
            isResolved: false,
          },
          select: {
            id: true,
            severity: true,
          },
        },
        checklistItems: {
          select: {
            id: true,
            isCompleted: true,
            isRequired: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return { success: true, data: cases }
  } catch (error) {
    console.error('Failed to fetch pending review cases:', error)
    return { success: false, error: 'Failed to fetch pending cases', data: [] }
  }
}

// Reopen a rejected case (return to analyst for revision)
export async function reopenRejectedCase(caseId: string) {
  try {
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    if (caseData.status !== 'REJECTED') {
      return { success: false, error: 'Only rejected cases can be reopened' }
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'IN_PROGRESS',
        // Keep review notes for analyst to see feedback
      },
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${caseId}`)

    return { success: true, data: updatedCase }
  } catch (error) {
    console.error('Failed to reopen case:', error)
    return { success: false, error: 'Failed to reopen case. Please try again.' }
  }
}

// Mark an approved case as completed
export async function markCaseCompleted(caseId: string) {
  try {
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    if (caseData.status !== 'APPROVED') {
      return { success: false, error: 'Only approved cases can be marked as completed' }
    }

    const updatedCase = await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'COMPLETED',
      },
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${caseId}`)

    return { success: true, data: updatedCase }
  } catch (error) {
    console.error('Failed to mark case as completed:', error)
    return { success: false, error: 'Failed to complete case. Please try again.' }
  }
}
