'use server'

import {
  getAuditLogs,
  getAuditLogUsers,
  exportAuditLogsToCSV,
  type AuditLogFilter,
  type AuditLogPagination,
  type AuditAction,
  type EntityType,
} from '@/lib/audit'

// Temporary org ID for development
const TEMP_ORG_ID = 'temp-org-id'

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

  const result = await getAuditLogs(TEMP_ORG_ID, auditFilter, pagination)

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
  return getAuditLogUsers(TEMP_ORG_ID)
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
  const result = await getAuditLogs(TEMP_ORG_ID, auditFilter, { page: 1, limit: 10000 })

  // Convert back to Date objects for CSV export
  const logsWithDates = result.logs.map(log => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }))

  return exportAuditLogsToCSV(logsWithDates)
}
