'use server'

import { requireAuth } from '@/lib/auth'
import {
  getAuditLogs,
  getAuditLogUsers,
  exportAuditLogsToCSV,
  type AuditLogFilter,
  type AuditLogPagination,
  type AuditAction,
  type EntityType,
} from '@/lib/audit'

/**
 * Fetch audit logs with filtering and pagination
 */
export async function fetchAuditLogs(
  filter: {
    userId?: string
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
  } = {},
  pagination: AuditLogPagination = { page: 1, limit: 50 }
) {
  const user = await requireAuth()

  // Build filter object
  const auditFilter: AuditLogFilter = {}

  if (filter.userId) {
    auditFilter.userId = filter.userId
  }

  if (filter.action) {
    auditFilter.action = filter.action as AuditAction
  }

  if (filter.entityType) {
    auditFilter.entityType = filter.entityType as EntityType
  }

  if (filter.startDate) {
    auditFilter.startDate = new Date(filter.startDate)
  }

  if (filter.endDate) {
    auditFilter.endDate = new Date(filter.endDate)
    // Set to end of day
    auditFilter.endDate.setHours(23, 59, 59, 999)
  }

  const result = await getAuditLogs(user.organizationId, auditFilter, pagination)

  // Serialize dates for client component
  return {
    ...result,
    logs: result.logs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
  }
}

/**
 * Get users for filter dropdown
 */
export async function fetchAuditLogUsers() {
  const user = await requireAuth()
  return getAuditLogUsers(user.organizationId)
}

/**
 * Export audit logs to CSV
 */
export async function exportAuditLogs(
  filter: {
    userId?: string
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
  } = {}
) {
  const user = await requireAuth()

  // Build filter object
  const auditFilter: AuditLogFilter = {}

  if (filter.userId) {
    auditFilter.userId = filter.userId
  }

  if (filter.action) {
    auditFilter.action = filter.action as AuditAction
  }

  if (filter.entityType) {
    auditFilter.entityType = filter.entityType as EntityType
  }

  if (filter.startDate) {
    auditFilter.startDate = new Date(filter.startDate)
  }

  if (filter.endDate) {
    auditFilter.endDate = new Date(filter.endDate)
    auditFilter.endDate.setHours(23, 59, 59, 999)
  }

  // Fetch all logs (up to 10000 for export)
  const result = await getAuditLogs(user.organizationId, auditFilter, { page: 1, limit: 10000 })

  // Convert back to Date objects for CSV export
  const logsWithDates = result.logs.map(log => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }))

  return exportAuditLogsToCSV(logsWithDates)
}
