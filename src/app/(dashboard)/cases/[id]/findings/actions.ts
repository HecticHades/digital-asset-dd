'use server'

import { prisma } from '@/lib/db'
import {
  createFindingSchema,
  updateFindingSchema,
  resolveFindingSchema,
  type CreateFindingInput,
  type UpdateFindingInput,
  type ResolveFindingInput,
} from '@/lib/validators/finding'
import { revalidatePath } from 'next/cache'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

export async function createFinding(data: CreateFindingInput) {
  const validated = createFindingSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    // Verify case exists and belongs to org
    const caseData = await prisma.case.findFirst({
      where: {
        id: validated.data.caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!caseData) {
      return {
        success: false,
        error: 'Case not found',
      }
    }

    const finding = await prisma.finding.create({
      data: {
        title: validated.data.title,
        description: validated.data.description || null,
        severity: validated.data.severity,
        category: validated.data.category,
        caseId: validated.data.caseId,
        walletId: validated.data.walletId || null,
        transactionId: validated.data.transactionId || null,
        organizationId: TEMP_ORG_ID,
      },
    })

    revalidatePath(`/cases/${validated.data.caseId}`)

    return {
      success: true,
      data: finding,
    }
  } catch (error) {
    console.error('Failed to create finding:', error)
    return {
      success: false,
      error: 'Failed to create finding. Please try again.',
    }
  }
}

export async function updateFinding(id: string, data: UpdateFindingInput) {
  const validated = updateFindingSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    const finding = await prisma.finding.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!finding) {
      return {
        success: false,
        error: 'Finding not found',
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validated.data.title !== undefined) updateData.title = validated.data.title
    if (validated.data.description !== undefined) updateData.description = validated.data.description || null
    if (validated.data.severity !== undefined) updateData.severity = validated.data.severity
    if (validated.data.category !== undefined) updateData.category = validated.data.category

    const updated = await prisma.finding.update({
      where: { id },
      data: updateData,
    })

    revalidatePath(`/cases/${finding.caseId}`)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Failed to update finding:', error)
    return {
      success: false,
      error: 'Failed to update finding. Please try again.',
    }
  }
}

export async function resolveFinding(id: string, data: ResolveFindingInput) {
  const validated = resolveFindingSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    const finding = await prisma.finding.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!finding) {
      return {
        success: false,
        error: 'Finding not found',
      }
    }

    if (finding.isResolved) {
      return {
        success: false,
        error: 'Finding is already resolved',
      }
    }

    const updated = await prisma.finding.update({
      where: { id },
      data: {
        isResolved: true,
        resolution: validated.data.resolution,
        resolvedById: TEMP_USER_ID,
        resolvedAt: new Date(),
      },
    })

    revalidatePath(`/cases/${finding.caseId}`)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Failed to resolve finding:', error)
    return {
      success: false,
      error: 'Failed to resolve finding. Please try again.',
    }
  }
}

export async function reopenFinding(id: string) {
  try {
    const finding = await prisma.finding.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!finding) {
      return {
        success: false,
        error: 'Finding not found',
      }
    }

    if (!finding.isResolved) {
      return {
        success: false,
        error: 'Finding is not resolved',
      }
    }

    const updated = await prisma.finding.update({
      where: { id },
      data: {
        isResolved: false,
        resolution: null,
        resolvedById: null,
        resolvedAt: null,
      },
    })

    revalidatePath(`/cases/${finding.caseId}`)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Failed to reopen finding:', error)
    return {
      success: false,
      error: 'Failed to reopen finding. Please try again.',
    }
  }
}

export async function deleteFinding(id: string) {
  try {
    const finding = await prisma.finding.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!finding) {
      return {
        success: false,
        error: 'Finding not found',
      }
    }

    await prisma.finding.delete({
      where: { id },
    })

    revalidatePath(`/cases/${finding.caseId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Failed to delete finding:', error)
    return {
      success: false,
      error: 'Failed to delete finding. Please try again.',
    }
  }
}

export async function getFindings(caseId: string) {
  try {
    const findings = await prisma.finding.findMany({
      where: {
        caseId,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        wallet: {
          select: {
            id: true,
            address: true,
            blockchain: true,
            label: true,
          },
        },
        transaction: {
          select: {
            id: true,
            txHash: true,
            type: true,
            asset: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isResolved: 'asc' },
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return { success: true, data: findings }
  } catch (error) {
    console.error('Failed to fetch findings:', error)
    return { success: false, error: 'Failed to fetch findings', data: [] }
  }
}
