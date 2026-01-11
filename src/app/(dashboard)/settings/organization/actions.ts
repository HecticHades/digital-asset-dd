'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  getOrganization,
  updateOrganization,
  getComplianceTemplates,
  updateComplianceTemplates,
  addComplianceTemplate,
  deleteComplianceTemplate,
  getOrganizationStats,
  type OrganizationSettings,
  type ComplianceTemplate,
} from '@/lib/organization'
import { logAction } from '@/lib/audit'

// ============================================
// Organization Settings Actions
// ============================================

export async function getOrganizationAction(): Promise<{
  id: string
  name: string
  logo: string | null
  settings: OrganizationSettings
  complianceTemplates: ComplianceTemplate[]
  isActive: boolean
} | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  return getOrganization(session.user.organizationId)
}

export async function updateOrganizationAction(input: {
  name?: string
  logo?: string
  settings?: OrganizationSettings
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Only admins can update organization settings
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only administrators can update organization settings' }
  }

  const result = await updateOrganization(session.user.organizationId, input)

  if (result.success) {
    // Log the change
    await logAction(
      'UPDATE',
      'ORGANIZATION',
      session.user.organizationId,
      { type: 'settings', changes: input },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/settings/organization')
  }

  return result
}

// ============================================
// Compliance Template Actions
// ============================================

export async function getComplianceTemplatesAction(): Promise<ComplianceTemplate[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return []

  return getComplianceTemplates(session.user.organizationId)
}

export async function updateComplianceTemplatesAction(
  templates: ComplianceTemplate[]
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only administrators can update compliance templates' }
  }

  const result = await updateComplianceTemplates(session.user.organizationId, templates)

  if (result.success) {
    await logAction(
      'UPDATE',
      'ORGANIZATION',
      session.user.organizationId,
      { type: 'compliance_templates', templateCount: templates.length },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/settings/organization')
  }

  return result
}

export async function addComplianceTemplateAction(
  template: Omit<ComplianceTemplate, 'id'>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only administrators can add compliance templates' }
  }

  const result = await addComplianceTemplate(session.user.organizationId, template)

  if (result.success) {
    await logAction(
      'CREATE',
      'ORGANIZATION',
      session.user.organizationId,
      { type: 'compliance_template', templateName: template.name },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/settings/organization')
  }

  return result
}

export async function deleteComplianceTemplateAction(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only administrators can delete compliance templates' }
  }

  const result = await deleteComplianceTemplate(session.user.organizationId, templateId)

  if (result.success) {
    await logAction(
      'DELETE',
      'ORGANIZATION',
      session.user.organizationId,
      { type: 'compliance_template', templateId },
      session.user.id,
      session.user.organizationId
    )

    revalidatePath('/settings/organization')
  }

  return result
}

// ============================================
// Stats Actions
// ============================================

export async function getOrganizationStatsAction(): Promise<{
  totalUsers: number
  activeUsers: number
  totalClients: number
  totalCases: number
  pendingCases: number
  completedCases: number
} | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  return getOrganizationStats(session.user.organizationId)
}
