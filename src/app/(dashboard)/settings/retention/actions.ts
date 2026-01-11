'use server'

import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getRetentionPolicy,
  updateRetentionPolicy,
  archiveCase,
  restoreCase,
  secureDeleteCase,
  getArchivedCases,
  getDeletionLogs,
  getCasesEligibleForArchival,
  type RetentionPolicySettings,
} from '@/lib/retention'
import { revalidatePath } from 'next/cache'
import type { CaseStatus, RiskLevel } from '@prisma/client'

// ============================================
// Retention Policy Actions
// ============================================

export async function getRetentionPolicyAction(): Promise<RetentionPolicySettings | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  return getRetentionPolicy(session.user.organizationId)
}

export async function updateRetentionPolicyAction(
  settings: Partial<RetentionPolicySettings>
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Only admins can update retention policy
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can update retention policies' }
  }

  try {
    await updateRetentionPolicy(
      session.user.organizationId,
      settings,
      session.user.id
    )
    revalidatePath('/settings/retention')
    return { success: true }
  } catch (error) {
    console.error('Failed to update retention policy:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update retention policy',
    }
  }
}

// ============================================
// Archive Actions
// ============================================

export async function archiveCaseAction(
  caseId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Only admins and managers can archive cases
  if (!session.user.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions to archive cases' }
  }

  const result = await archiveCase(
    caseId,
    session.user.id,
    session.user.name || null,
    reason
  )

  if (result.success) {
    revalidatePath('/cases')
    revalidatePath('/settings/retention')
  }

  return result
}

export async function restoreCaseAction(
  archivedCaseId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Only admins and managers can restore cases
  if (!session.user.role || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
    return { success: false, error: 'Insufficient permissions to restore cases' }
  }

  const result = await restoreCase(
    archivedCaseId,
    session.user.id,
    session.user.organizationId
  )

  if (result.success) {
    revalidatePath('/cases')
    revalidatePath('/settings/retention')
  }

  return result
}

export async function deleteCaseAction(
  caseId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) {
    return { success: false, error: 'Not authenticated' }
  }

  // Only admins can delete cases
  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Only administrators can delete cases' }
  }

  if (!reason || reason.trim().length < 10) {
    return { success: false, error: 'A deletion reason (at least 10 characters) is required' }
  }

  const result = await secureDeleteCase(
    caseId,
    session.user.id,
    session.user.name || null,
    reason.trim()
  )

  if (result.success) {
    revalidatePath('/cases')
    revalidatePath('/settings/retention')
  }

  return result
}

// ============================================
// Query Actions
// ============================================

export async function getArchivedCasesAction(
  page: number = 1,
  limit: number = 50
): Promise<{
  cases: Array<{
    id: string
    originalCaseId: string
    title: string
    status: CaseStatus
    riskLevel: RiskLevel
    clientName: string
    archivedAt: string
    archivedByName: string | null
    expiresAt: string | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
} | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  const result = await getArchivedCases(session.user.organizationId, { page, limit })

  return {
    ...result,
    cases: result.cases.map(c => ({
      ...c,
      archivedAt: c.archivedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() || null,
    })),
  }
}

export async function getDeletionLogsAction(
  page: number = 1,
  limit: number = 50
): Promise<{
  logs: Array<{
    id: string
    entityType: string
    entityId: string
    entityTitle: string | null
    deletedAt: string
    deletedByName: string | null
    deletionReason: string | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
} | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  // Only admins can view deletion logs
  if (session.user.role !== 'ADMIN') return null

  const result = await getDeletionLogs(session.user.organizationId, { page, limit })

  return {
    ...result,
    logs: result.logs.map(l => ({
      ...l,
      deletedAt: l.deletedAt.toISOString(),
    })),
  }
}

export async function getEligibleCasesAction(): Promise<Array<{
  id: string
  title: string
  status: string
  updatedAt: string
}> | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.organizationId) return null

  const policy = await getRetentionPolicy(session.user.organizationId)
  const cases = await getCasesEligibleForArchival(
    session.user.organizationId,
    policy.caseRetentionDays
  )

  return cases.map(c => ({
    id: c.id,
    title: c.title,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
  }))
}
