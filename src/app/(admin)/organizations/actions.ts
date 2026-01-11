'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  createOrganization,
  listOrganizations,
  deactivateOrganization,
  reactivateOrganization,
  isSuperAdmin,
  type CreateOrganizationInput,
  type OrganizationSummary,
} from '@/lib/organization'
import { logAction } from '@/lib/audit'

// ============================================
// Super Admin Organization Actions
// ============================================

export async function listOrganizationsAction(
  page: number = 1,
  limit: number = 50
): Promise<{
  organizations: Array<{
    id: string
    name: string
    logo: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    userCount: number
    clientCount: number
    caseCount: number
  }>
  total: number
  page: number
  limit: number
  totalPages: number
} | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  // Only super admins can list all organizations
  if (!isSuperAdmin(session.user.role)) {
    return null
  }

  const result = await listOrganizations({ page, limit })

  return {
    ...result,
    organizations: result.organizations.map(org => ({
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    })),
  }
}

export async function createOrganizationAction(
  input: CreateOrganizationInput
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!isSuperAdmin(session.user.role)) {
    return { success: false, error: 'Only super administrators can create organizations' }
  }

  if (!input.name || input.name.trim().length < 2) {
    return { success: false, error: 'Organization name must be at least 2 characters' }
  }

  try {
    const org = await createOrganization({
      name: input.name.trim(),
      logo: input.logo,
      settings: input.settings,
    })

    // Log the action (use a system org ID for super admin actions)
    if (session.user.organizationId) {
      await logAction(
        'CREATE',
        'ORGANIZATION',
        org.id,
        { name: org.name },
        session.user.id,
        session.user.organizationId
      )
    }

    revalidatePath('/organizations')

    return { success: true, organizationId: org.id }
  } catch (error) {
    console.error('Failed to create organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create organization',
    }
  }
}

export async function deactivateOrganizationAction(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!isSuperAdmin(session.user.role)) {
    return { success: false, error: 'Only super administrators can deactivate organizations' }
  }

  const result = await deactivateOrganization(organizationId)

  if (result.success && session.user.organizationId) {
    await logAction(
      'UPDATE',
      'ORGANIZATION',
      organizationId,
      { action: 'deactivated' },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/organizations')
  }

  return result
}

export async function reactivateOrganizationAction(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!isSuperAdmin(session.user.role)) {
    return { success: false, error: 'Only super administrators can reactivate organizations' }
  }

  const result = await reactivateOrganization(organizationId)

  if (result.success && session.user.organizationId) {
    await logAction(
      'UPDATE',
      'ORGANIZATION',
      organizationId,
      { action: 'reactivated' },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/organizations')
  }

  return result
}
