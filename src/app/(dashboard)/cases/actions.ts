'use server'

import { prisma } from '@/lib/db'
import { createCaseSchema, updateCaseSchema, type CreateCaseInput, type UpdateCaseInput } from '@/lib/validators/case'
import { revalidatePath } from 'next/cache'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'

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
    })

    revalidatePath('/cases')

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
    })

    revalidatePath('/cases')
    revalidatePath(`/cases/${id}`)

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
