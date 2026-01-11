'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  createChecklistItemSchema,
  updateChecklistItemSchema,
  completeChecklistItemSchema,
  DEFAULT_CHECKLIST_ITEMS,
  type CreateChecklistItemInput,
  type UpdateChecklistItemInput,
  type CompleteChecklistItemInput,
  type ChecklistCompletionStatus,
} from '@/lib/validators/checklist'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

/**
 * Initialize default checklist items for a case
 */
export async function initializeChecklist(caseId: string) {
  try {
    // Check if case exists and belongs to org
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Check if checklist already exists
    const existingItems = await prisma.checklistItem.count({
      where: {
        caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (existingItems > 0) {
      return { success: false, error: 'Checklist already initialized for this case' }
    }

    // Create default checklist items
    await prisma.checklistItem.createMany({
      data: DEFAULT_CHECKLIST_ITEMS.map((item) => ({
        ...item,
        caseId,
        organizationId: TEMP_ORG_ID,
      })),
    })

    revalidatePath(`/cases/${caseId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to initialize checklist:', error)
    return { success: false, error: 'Failed to initialize checklist' }
  }
}

/**
 * Create a custom checklist item
 */
export async function createChecklistItem(data: CreateChecklistItemInput) {
  const validated = createChecklistItemSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    // Check if case exists
    const caseData = await prisma.case.findFirst({
      where: {
        id: validated.data.caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    const item = await prisma.checklistItem.create({
      data: {
        title: validated.data.title,
        description: validated.data.description || null,
        isRequired: validated.data.isRequired,
        order: validated.data.order,
        caseId: validated.data.caseId,
        organizationId: TEMP_ORG_ID,
      },
    })

    revalidatePath(`/cases/${validated.data.caseId}`)

    return { success: true, data: item }
  } catch (error) {
    console.error('Failed to create checklist item:', error)
    return { success: false, error: 'Failed to create checklist item' }
  }
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(itemId: string, data: UpdateChecklistItemInput) {
  const validated = updateChecklistItemSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!item) {
      return { success: false, error: 'Checklist item not found' }
    }

    const updateData: Record<string, unknown> = {}
    if (validated.data.title !== undefined) updateData.title = validated.data.title
    if (validated.data.description !== undefined) updateData.description = validated.data.description || null
    if (validated.data.isRequired !== undefined) updateData.isRequired = validated.data.isRequired
    if (validated.data.notes !== undefined) updateData.notes = validated.data.notes || null

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: updateData,
    })

    revalidatePath(`/cases/${item.caseId}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to update checklist item:', error)
    return { success: false, error: 'Failed to update checklist item' }
  }
}

/**
 * Mark a checklist item as complete
 */
export async function completeChecklistItem(itemId: string, data?: CompleteChecklistItemInput) {
  let notes: string | undefined

  if (data) {
    const validated = completeChecklistItemSchema.safeParse(data)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || 'Validation failed',
      }
    }
    notes = validated.data.notes
  }

  try {
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!item) {
      return { success: false, error: 'Checklist item not found' }
    }

    if (item.isCompleted) {
      return { success: false, error: 'Item is already completed' }
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedById: TEMP_USER_ID,
        notes: notes || item.notes,
      },
    })

    revalidatePath(`/cases/${item.caseId}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to complete checklist item:', error)
    return { success: false, error: 'Failed to complete checklist item' }
  }
}

/**
 * Mark a checklist item as incomplete
 */
export async function uncompleteChecklistItem(itemId: string) {
  try {
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!item) {
      return { success: false, error: 'Checklist item not found' }
    }

    if (!item.isCompleted) {
      return { success: false, error: 'Item is not completed' }
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        isCompleted: false,
        completedAt: null,
        completedById: null,
      },
    })

    revalidatePath(`/cases/${item.caseId}`)

    return { success: true, data: updated }
  } catch (error) {
    console.error('Failed to uncomplete checklist item:', error)
    return { success: false, error: 'Failed to uncomplete checklist item' }
  }
}

/**
 * Delete a checklist item (only non-required custom items)
 */
export async function deleteChecklistItem(itemId: string) {
  try {
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!item) {
      return { success: false, error: 'Checklist item not found' }
    }

    await prisma.checklistItem.delete({
      where: { id: itemId },
    })

    revalidatePath(`/cases/${item.caseId}`)

    return { success: true }
  } catch (error) {
    console.error('Failed to delete checklist item:', error)
    return { success: false, error: 'Failed to delete checklist item' }
  }
}

/**
 * Get checklist items for a case
 */
export async function getChecklistItems(caseId: string) {
  try {
    const items = await prisma.checklistItem.findMany({
      where: {
        caseId,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        completedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    })

    return { success: true, data: items }
  } catch (error) {
    console.error('Failed to fetch checklist items:', error)
    return { success: false, error: 'Failed to fetch checklist items', data: [] }
  }
}

/**
 * Get checklist completion status for a case
 */
export async function getChecklistCompletionStatus(caseId: string): Promise<{ success: boolean; data?: ChecklistCompletionStatus; error?: string }> {
  try {
    const items = await prisma.checklistItem.findMany({
      where: {
        caseId,
        organizationId: TEMP_ORG_ID,
      },
      select: {
        title: true,
        isRequired: true,
        isCompleted: true,
      },
    })

    const total = items.length
    const completed = items.filter((i) => i.isCompleted).length
    const requiredItems = items.filter((i) => i.isRequired)
    const required = requiredItems.length
    const requiredCompleted = requiredItems.filter((i) => i.isCompleted).length
    const missingRequired = requiredItems.filter((i) => !i.isCompleted).map((i) => i.title)

    const status: ChecklistCompletionStatus = {
      total,
      completed,
      required,
      requiredCompleted,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      requiredPercentage: required > 0 ? Math.round((requiredCompleted / required) * 100) : 100,
      isComplete: requiredCompleted === required,
      missingRequired,
    }

    return { success: true, data: status }
  } catch (error) {
    console.error('Failed to get checklist status:', error)
    return { success: false, error: 'Failed to get checklist status' }
  }
}

/**
 * Check if case can be submitted for review (all required items complete)
 */
export async function canSubmitForReview(caseId: string): Promise<{ success: boolean; canSubmit: boolean; missingItems?: string[]; error?: string }> {
  try {
    const statusResult = await getChecklistCompletionStatus(caseId)

    if (!statusResult.success || !statusResult.data) {
      return { success: false, canSubmit: false, error: statusResult.error }
    }

    return {
      success: true,
      canSubmit: statusResult.data.isComplete,
      missingItems: statusResult.data.missingRequired,
    }
  } catch (error) {
    console.error('Failed to check submission status:', error)
    return { success: false, canSubmit: false, error: 'Failed to check submission status' }
  }
}
