/**
 * Data Retention Policy System
 *
 * Handles archival and secure deletion of data based on configurable retention policies.
 * All deletions are logged in the DeletionLog for audit purposes.
 */

import { prisma } from '@/lib/db'
import { Prisma, CaseStatus, RiskLevel } from '@prisma/client'
import { logAction } from '@/lib/audit'

// ============================================
// Types
// ============================================

export interface RetentionPolicySettings {
  caseRetentionDays: number
  clientRetentionDays: number
  documentRetentionDays: number
  transactionRetentionDays: number
  auditLogRetentionDays: number
  autoArchiveEnabled: boolean
  autoDeleteEnabled: boolean
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicySettings = {
  caseRetentionDays: 2555, // ~7 years
  clientRetentionDays: 2555,
  documentRetentionDays: 2555,
  transactionRetentionDays: 2555,
  auditLogRetentionDays: 3650, // 10 years
  autoArchiveEnabled: false,
  autoDeleteEnabled: false,
}

export interface ArchiveResult {
  success: boolean
  archivedCaseId?: string
  error?: string
}

export interface DeletionResult {
  success: boolean
  deletedCount: number
  error?: string
}

// Allowed statuses for archival
const ARCHIVABLE_STATUSES: CaseStatus[] = [
  'COMPLETED',
  'REJECTED',
  'ARCHIVED',
]

// Active statuses that cannot be deleted
const ACTIVE_STATUSES: CaseStatus[] = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_REVIEW',
]

// ============================================
// Retention Policy Functions
// ============================================

/**
 * Get or create retention policy for an organization
 */
export async function getRetentionPolicy(organizationId: string): Promise<RetentionPolicySettings> {
  const policy = await prisma.retentionPolicy.findUnique({
    where: { organizationId },
  })

  if (!policy) {
    return DEFAULT_RETENTION_POLICY
  }

  return {
    caseRetentionDays: policy.caseRetentionDays,
    clientRetentionDays: policy.clientRetentionDays,
    documentRetentionDays: policy.documentRetentionDays,
    transactionRetentionDays: policy.transactionRetentionDays,
    auditLogRetentionDays: policy.auditLogRetentionDays,
    autoArchiveEnabled: policy.autoArchiveEnabled,
    autoDeleteEnabled: policy.autoDeleteEnabled,
  }
}

/**
 * Update retention policy for an organization
 */
export async function updateRetentionPolicy(
  organizationId: string,
  settings: Partial<RetentionPolicySettings>,
  userId: string | null
): Promise<RetentionPolicySettings> {
  const policy = await prisma.retentionPolicy.upsert({
    where: { organizationId },
    update: {
      ...settings,
      updatedAt: new Date(),
    },
    create: {
      organizationId,
      ...DEFAULT_RETENTION_POLICY,
      ...settings,
    },
  })

  // Audit log the change
  await logAction(
    'UPDATE',
    'ORGANIZATION',
    organizationId,
    { type: 'retention_policy', settings },
    userId,
    organizationId
  )

  return {
    caseRetentionDays: policy.caseRetentionDays,
    clientRetentionDays: policy.clientRetentionDays,
    documentRetentionDays: policy.documentRetentionDays,
    transactionRetentionDays: policy.transactionRetentionDays,
    auditLogRetentionDays: policy.auditLogRetentionDays,
    autoArchiveEnabled: policy.autoArchiveEnabled,
    autoDeleteEnabled: policy.autoDeleteEnabled,
  }
}

// ============================================
// Archive Functions
// ============================================

/**
 * Check if a case can be archived
 */
export function canArchiveCase(status: CaseStatus): boolean {
  return ARCHIVABLE_STATUSES.includes(status)
}

/**
 * Check if a case can be deleted (not in active status)
 */
export function canDeleteCase(status: CaseStatus): boolean {
  return !ACTIVE_STATUSES.includes(status)
}

/**
 * Archive a single case
 * Creates a snapshot and moves it to the archived_cases table
 */
export async function archiveCase(
  caseId: string,
  userId: string | null,
  userName: string | null,
  reason?: string
): Promise<ArchiveResult> {
  try {
    // Get the full case with all related data
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: true,
        assignedTo: true,
        reviewedBy: true,
        findings: true,
        checklistItems: true,
        reports: true,
      },
    })

    if (!caseData) {
      return { success: false, error: 'Case not found' }
    }

    // Check if case can be archived
    if (!canArchiveCase(caseData.status)) {
      return {
        success: false,
        error: `Cannot archive case with status: ${caseData.status}. Only completed, rejected, or already archived cases can be archived.`,
      }
    }

    // Check if already archived
    const existingArchive = await prisma.archivedCase.findUnique({
      where: { originalCaseId: caseId },
    })

    if (existingArchive) {
      return { success: false, error: 'Case is already archived' }
    }

    // Get retention policy for expiration date
    const policy = await getRetentionPolicy(caseData.organizationId)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + policy.caseRetentionDays)

    // Create archive record with full data snapshot
    const archivedCase = await prisma.archivedCase.create({
      data: {
        originalCaseId: caseId,
        title: caseData.title,
        description: caseData.description,
        status: caseData.status,
        riskScore: caseData.riskScore,
        riskLevel: caseData.riskLevel,
        clientName: caseData.client.name,
        clientEmail: caseData.client.email,
        assignedToName: caseData.assignedTo?.name || null,
        reviewedByName: caseData.reviewedBy?.name || null,
        reviewedAt: caseData.reviewedAt,
        reviewNotes: caseData.reviewNotes,
        archivedData: {
          case: {
            id: caseData.id,
            title: caseData.title,
            description: caseData.description,
            status: caseData.status,
            riskScore: caseData.riskScore,
            riskLevel: caseData.riskLevel,
            dueDate: caseData.dueDate?.toISOString(),
            createdAt: caseData.createdAt.toISOString(),
            updatedAt: caseData.updatedAt.toISOString(),
            reviewedAt: caseData.reviewedAt?.toISOString(),
            reviewNotes: caseData.reviewNotes,
          },
          client: {
            id: caseData.client.id,
            name: caseData.client.name,
            email: caseData.client.email,
            phone: caseData.client.phone,
            address: caseData.client.address,
            notes: caseData.client.notes,
            status: caseData.client.status,
            riskLevel: caseData.client.riskLevel,
          },
          findings: caseData.findings.map(f => ({
            id: f.id,
            title: f.title,
            description: f.description,
            severity: f.severity,
            category: f.category,
            isResolved: f.isResolved,
            resolution: f.resolution,
            createdAt: f.createdAt.toISOString(),
          })),
          checklistItems: caseData.checklistItems.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            isRequired: c.isRequired,
            isCompleted: c.isCompleted,
            notes: c.notes,
            completedAt: c.completedAt?.toISOString(),
          })),
          reports: caseData.reports.map(r => ({
            id: r.id,
            version: r.version,
            filename: r.filename,
            createdAt: r.createdAt.toISOString(),
            isLocked: r.isLocked,
          })),
        } as Prisma.InputJsonValue,
        archivedByName: userName,
        archiveReason: reason,
        expiresAt,
        organizationId: caseData.organizationId,
      },
    })

    // Update the original case status to ARCHIVED
    await prisma.case.update({
      where: { id: caseId },
      data: { status: 'ARCHIVED' },
    })

    // Audit log
    await logAction(
      'UPDATE',
      'CASE',
      caseId,
      { action: 'archived', archivedCaseId: archivedCase.id, reason },
      userId,
      caseData.organizationId
    )

    return { success: true, archivedCaseId: archivedCase.id }
  } catch (error) {
    console.error('Failed to archive case:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to archive case',
    }
  }
}

/**
 * Restore an archived case back to active status
 */
export async function restoreCase(
  archivedCaseId: string,
  userId: string | null,
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const archivedCase = await prisma.archivedCase.findUnique({
      where: { id: archivedCaseId },
    })

    if (!archivedCase) {
      return { success: false, error: 'Archived case not found' }
    }

    if (archivedCase.organizationId !== organizationId) {
      return { success: false, error: 'Access denied' }
    }

    // Check if original case still exists
    const originalCase = await prisma.case.findUnique({
      where: { id: archivedCase.originalCaseId },
    })

    if (!originalCase) {
      return { success: false, error: 'Original case no longer exists' }
    }

    // Restore case status to COMPLETED (or the status it had before archiving)
    await prisma.case.update({
      where: { id: archivedCase.originalCaseId },
      data: { status: archivedCase.status === 'ARCHIVED' ? 'COMPLETED' : archivedCase.status },
    })

    // Delete the archive record
    await prisma.archivedCase.delete({
      where: { id: archivedCaseId },
    })

    // Audit log
    await logAction(
      'UPDATE',
      'CASE',
      archivedCase.originalCaseId,
      { action: 'restored_from_archive', archivedCaseId },
      userId,
      organizationId
    )

    return { success: true }
  } catch (error) {
    console.error('Failed to restore case:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to restore case',
    }
  }
}

// ============================================
// Deletion Functions
// ============================================

/**
 * Securely delete a case with audit record
 * Only allows deletion of non-active cases
 */
export async function secureDeleteCase(
  caseId: string,
  userId: string | null,
  userName: string | null,
  reason: string
): Promise<DeletionResult> {
  try {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        client: true,
        findings: true,
        checklistItems: true,
        reports: true,
      },
    })

    if (!caseData) {
      return { success: false, deletedCount: 0, error: 'Case not found' }
    }

    // Check if case can be deleted
    if (!canDeleteCase(caseData.status)) {
      return {
        success: false,
        deletedCount: 0,
        error: `Cannot delete active case with status: ${caseData.status}. Archive the case first or wait until it is completed.`,
      }
    }

    // Create deletion log with snapshot
    await prisma.deletionLog.create({
      data: {
        entityType: 'CASE',
        entityId: caseId,
        entityTitle: caseData.title,
        deletedData: {
          case: {
            id: caseData.id,
            title: caseData.title,
            status: caseData.status,
            riskScore: caseData.riskScore,
            riskLevel: caseData.riskLevel,
            clientId: caseData.clientId,
            clientName: caseData.client.name,
          },
          findingsCount: caseData.findings.length,
          checklistItemsCount: caseData.checklistItems.length,
          reportsCount: caseData.reports.length,
        } as Prisma.InputJsonValue,
        deletedByName: userName,
        deletionReason: reason,
        organizationId: caseData.organizationId,
      },
    })

    // Delete the case (cascade will handle related records)
    await prisma.case.delete({
      where: { id: caseId },
    })

    // Audit log
    await logAction(
      'DELETE',
      'CASE',
      caseId,
      { title: caseData.title, reason },
      userId,
      caseData.organizationId
    )

    return { success: true, deletedCount: 1 }
  } catch (error) {
    console.error('Failed to delete case:', error)
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to delete case',
    }
  }
}

/**
 * Get cases eligible for archival based on retention policy
 */
export async function getCasesEligibleForArchival(
  organizationId: string,
  daysOld: number
): Promise<Array<{ id: string; title: string; status: CaseStatus; updatedAt: Date }>> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const cases = await prisma.case.findMany({
    where: {
      organizationId,
      status: { in: ARCHIVABLE_STATUSES },
      updatedAt: { lt: cutoffDate },
    },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'asc' },
  })

  return cases
}

/**
 * Get archived cases for an organization
 */
export async function getArchivedCases(
  organizationId: string,
  pagination: { page: number; limit: number } = { page: 1, limit: 50 }
): Promise<{
  cases: Array<{
    id: string
    originalCaseId: string
    title: string
    status: CaseStatus
    riskLevel: RiskLevel
    clientName: string
    archivedAt: Date
    archivedByName: string | null
    expiresAt: Date | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const [cases, total] = await Promise.all([
    prisma.archivedCase.findMany({
      where: { organizationId },
      select: {
        id: true,
        originalCaseId: true,
        title: true,
        status: true,
        riskLevel: true,
        clientName: true,
        archivedAt: true,
        archivedByName: true,
        expiresAt: true,
      },
      orderBy: { archivedAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.archivedCase.count({ where: { organizationId } }),
  ])

  return {
    cases,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  }
}

/**
 * Get deletion logs for an organization
 */
export async function getDeletionLogs(
  organizationId: string,
  pagination: { page: number; limit: number } = { page: 1, limit: 50 }
): Promise<{
  logs: Array<{
    id: string
    entityType: string
    entityId: string
    entityTitle: string | null
    deletedAt: Date
    deletedByName: string | null
    deletionReason: string | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const [logs, total] = await Promise.all([
    prisma.deletionLog.findMany({
      where: { organizationId },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        entityTitle: true,
        deletedAt: true,
        deletedByName: true,
        deletionReason: true,
      },
      orderBy: { deletedAt: 'desc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.deletionLog.count({ where: { organizationId } }),
  ])

  return {
    logs,
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  }
}

// ============================================
// Batch Operations (for scheduled jobs)
// ============================================

/**
 * Auto-archive eligible cases for an organization
 */
export async function autoArchiveCases(
  organizationId: string,
  userId: string | null
): Promise<{ archived: number; failed: number }> {
  const policy = await getRetentionPolicy(organizationId)

  if (!policy.autoArchiveEnabled) {
    return { archived: 0, failed: 0 }
  }

  const eligibleCases = await getCasesEligibleForArchival(
    organizationId,
    policy.caseRetentionDays
  )

  let archived = 0
  let failed = 0

  for (const caseItem of eligibleCases) {
    const result = await archiveCase(
      caseItem.id,
      userId,
      'System',
      'Auto-archived based on retention policy'
    )
    if (result.success) {
      archived++
    } else {
      failed++
    }
  }

  return { archived, failed }
}

/**
 * Clean up expired archived cases
 */
export async function cleanupExpiredArchives(
  organizationId: string,
  userId: string | null,
  userName: string | null
): Promise<{ deleted: number }> {
  const policy = await getRetentionPolicy(organizationId)

  if (!policy.autoDeleteEnabled) {
    return { deleted: 0 }
  }

  const now = new Date()

  // Find expired archives
  const expiredArchives = await prisma.archivedCase.findMany({
    where: {
      organizationId,
      expiresAt: { lt: now },
    },
    select: {
      id: true,
      originalCaseId: true,
      title: true,
    },
  })

  let deleted = 0

  for (const archive of expiredArchives) {
    // Log deletion
    await prisma.deletionLog.create({
      data: {
        entityType: 'ARCHIVED_CASE',
        entityId: archive.id,
        entityTitle: archive.title,
        deletedByName: userName || 'System',
        deletionReason: 'Expired based on retention policy',
        organizationId,
      },
    })

    // Delete the archive
    await prisma.archivedCase.delete({
      where: { id: archive.id },
    })

    // Audit log
    await logAction(
      'DELETE',
      'CASE',
      archive.originalCaseId,
      { action: 'expired_archive_deleted', archivedCaseId: archive.id },
      userId,
      organizationId
    )

    deleted++
  }

  return { deleted }
}
