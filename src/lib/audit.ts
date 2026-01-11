/**
 * Audit Logging System
 *
 * Provides immutable audit logging for all user actions.
 * Logs are stored with user, action, entity, and details information.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { headers } from 'next/headers'

// ============================================
// Types
// ============================================

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_RESET'
  | 'INVITE_SENT'
  | 'INVITE_ACCEPTED'
  | 'APPROVE'
  | 'REJECT'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'EXPORT'
  | 'SYNC'
  | 'SCREEN'

export type EntityType =
  | 'USER'
  | 'CLIENT'
  | 'CASE'
  | 'WALLET'
  | 'TRANSACTION'
  | 'DOCUMENT'
  | 'FINDING'
  | 'CHECKLIST_ITEM'
  | 'REPORT'
  | 'EXCHANGE_CONNECTION'
  | 'ORGANIZATION'
  | 'INVITATION'
  | 'SESSION'

export interface AuditLogInput {
  action: AuditAction
  entityType: EntityType
  entityId?: string | null
  details?: Record<string, unknown> | null
  userId?: string | null
  organizationId: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  timestamp: Date
  ipAddress: string | null
  userAgent: string | null
  userId: string | null
  organizationId: string
  user?: {
    id: string
    name: string
    email: string
  } | null
}

export interface AuditLogFilter {
  userId?: string
  action?: AuditAction | AuditAction[]
  entityType?: EntityType | EntityType[]
  entityId?: string
  startDate?: Date
  endDate?: Date
}

export interface AuditLogPagination {
  page: number
  limit: number
}

// ============================================
// Action Labels
// ============================================

export const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  VIEW: 'Viewed',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  FAILED_LOGIN: 'Failed login attempt',
  PASSWORD_RESET: 'Reset password',
  INVITE_SENT: 'Sent invitation',
  INVITE_ACCEPTED: 'Accepted invitation',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  UPLOAD: 'Uploaded',
  DOWNLOAD: 'Downloaded',
  EXPORT: 'Exported',
  SYNC: 'Synced',
  SCREEN: 'Screened',
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  USER: 'User',
  CLIENT: 'Client',
  CASE: 'Case',
  WALLET: 'Wallet',
  TRANSACTION: 'Transaction',
  DOCUMENT: 'Document',
  FINDING: 'Finding',
  CHECKLIST_ITEM: 'Checklist Item',
  REPORT: 'Report',
  EXCHANGE_CONNECTION: 'Exchange Connection',
  ORGANIZATION: 'Organization',
  INVITATION: 'Invitation',
  SESSION: 'Session',
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get IP address and user agent from request headers
 */
export async function getRequestInfo(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  try {
    const headersList = await headers()
    const forwarded = headersList.get('x-forwarded-for')
    const ipAddress = forwarded?.split(',')[0]?.trim() || headersList.get('x-real-ip') || null
    const userAgent = headersList.get('user-agent') || null
    return { ipAddress, userAgent }
  } catch {
    return { ipAddress: null, userAgent: null }
  }
}

// ============================================
// Core Logging Functions
// ============================================

/**
 * Create an audit log entry
 * This is the main function for logging actions
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        details: input.details ? (input.details as Prisma.InputJsonValue) : Prisma.JsonNull,
        userId: input.userId || null,
        organizationId: input.organizationId,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
        timestamp: new Date(),
      },
    })
  } catch (error) {
    // Log to console but don't throw - audit logging should not break the app
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Convenience wrapper that automatically gets IP and user agent from headers
 */
export async function logAction(
  action: AuditAction,
  entityType: EntityType,
  entityId: string | null,
  details: Record<string, unknown> | null,
  userId: string | null,
  organizationId: string
): Promise<void> {
  const { ipAddress, userAgent } = await getRequestInfo()

  await createAuditLog({
    action,
    entityType,
    entityId,
    details,
    userId,
    organizationId,
    ipAddress,
    userAgent,
  })
}

// ============================================
// Query Functions
// ============================================

/**
 * Get audit logs for an organization with filtering and pagination
 */
export async function getAuditLogs(
  organizationId: string,
  filter: AuditLogFilter = {},
  pagination: AuditLogPagination = { page: 1, limit: 50 }
): Promise<{
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  // Build where clause
  const where: Record<string, unknown> = {
    organizationId,
  }

  if (filter.userId) {
    where.userId = filter.userId
  }

  if (filter.action) {
    where.action = Array.isArray(filter.action)
      ? { in: filter.action }
      : filter.action
  }

  if (filter.entityType) {
    where.entityType = Array.isArray(filter.entityType)
      ? { in: filter.entityType }
      : filter.entityType
  }

  if (filter.entityId) {
    where.entityId = filter.entityId
  }

  if (filter.startDate || filter.endDate) {
    where.timestamp = {}
    if (filter.startDate) {
      (where.timestamp as Record<string, Date>).gte = filter.startDate
    }
    if (filter.endDate) {
      (where.timestamp as Record<string, Date>).lte = filter.endDate
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return {
    logs: logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details as Record<string, unknown> | null,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      userId: log.userId,
      organizationId: log.organizationId,
      user: log.user,
    })),
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLogs(
  organizationId: string,
  entityType: EntityType,
  entityId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      entityType,
      entityId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details as Record<string, unknown> | null,
    timestamp: log.timestamp,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    userId: log.userId,
    organizationId: log.organizationId,
    user: log.user,
  }))
}

/**
 * Get recent activity for a user
 */
export async function getUserActivityLogs(
  organizationId: string,
  userId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  })

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    details: log.details as Record<string, unknown> | null,
    timestamp: log.timestamp,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    userId: log.userId,
    organizationId: log.organizationId,
    user: log.user,
  }))
}

/**
 * Get unique users who have logs (for filter dropdown)
 */
export async function getAuditLogUsers(organizationId: string): Promise<Array<{ id: string; name: string; email: string }>> {
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      auditLogs: {
        some: {},
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return users
}

// ============================================
// CSV Export
// ============================================

/**
 * Export audit logs to CSV format
 */
export function exportAuditLogsToCSV(logs: AuditLogEntry[]): string {
  const headers = [
    'Timestamp',
    'User',
    'Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'Details',
    'IP Address',
    'User Agent',
  ]

  const rows = logs.map(log => [
    escapeCSV(log.timestamp.toISOString()),
    escapeCSV(log.user?.name || 'System'),
    escapeCSV(log.user?.email || '-'),
    escapeCSV(ACTION_LABELS[log.action as AuditAction] || log.action),
    escapeCSV(ENTITY_TYPE_LABELS[log.entityType as EntityType] || log.entityType),
    escapeCSV(log.entityId || '-'),
    escapeCSV(log.details ? JSON.stringify(log.details) : '-'),
    escapeCSV(log.ipAddress || '-'),
    escapeCSV(log.userAgent || '-'),
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ============================================
// Utility Functions for Common Actions
// ============================================

/**
 * Log a create action
 */
export async function logCreate(
  entityType: EntityType,
  entityId: string,
  details: Record<string, unknown> | null,
  userId: string | null,
  organizationId: string
): Promise<void> {
  await logAction('CREATE', entityType, entityId, details, userId, organizationId)
}

/**
 * Log an update action
 */
export async function logUpdate(
  entityType: EntityType,
  entityId: string,
  details: Record<string, unknown> | null,
  userId: string | null,
  organizationId: string
): Promise<void> {
  await logAction('UPDATE', entityType, entityId, details, userId, organizationId)
}

/**
 * Log a delete action
 */
export async function logDelete(
  entityType: EntityType,
  entityId: string,
  details: Record<string, unknown> | null,
  userId: string | null,
  organizationId: string
): Promise<void> {
  await logAction('DELETE', entityType, entityId, details, userId, organizationId)
}

/**
 * Log a view action
 */
export async function logView(
  entityType: EntityType,
  entityId: string,
  userId: string | null,
  organizationId: string
): Promise<void> {
  await logAction('VIEW', entityType, entityId, null, userId, organizationId)
}

/**
 * Format log for display
 */
export function formatLogMessage(log: AuditLogEntry): string {
  const actionLabel = ACTION_LABELS[log.action as AuditAction] || log.action
  const entityLabel = ENTITY_TYPE_LABELS[log.entityType as EntityType] || log.entityType

  if (log.entityId) {
    return `${actionLabel} ${entityLabel.toLowerCase()} (${log.entityId})`
  }

  return `${actionLabel} ${entityLabel.toLowerCase()}`
}

/**
 * Get icon for action type
 */
export function getActionIcon(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'plus-circle'
    case 'UPDATE':
      return 'pencil'
    case 'DELETE':
      return 'trash'
    case 'VIEW':
      return 'eye'
    case 'LOGIN':
      return 'login'
    case 'LOGOUT':
      return 'logout'
    case 'FAILED_LOGIN':
      return 'x-circle'
    case 'APPROVE':
      return 'check-circle'
    case 'REJECT':
      return 'x-circle'
    case 'UPLOAD':
      return 'upload'
    case 'DOWNLOAD':
      return 'download'
    case 'EXPORT':
      return 'arrow-down-tray'
    case 'SYNC':
      return 'refresh'
    case 'SCREEN':
      return 'shield-check'
    default:
      return 'information-circle'
  }
}

/**
 * Get color class for action type
 */
export function getActionColor(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'text-green-600'
    case 'UPDATE':
      return 'text-blue-600'
    case 'DELETE':
      return 'text-red-600'
    case 'VIEW':
      return 'text-slate-600'
    case 'LOGIN':
      return 'text-green-600'
    case 'LOGOUT':
      return 'text-slate-600'
    case 'FAILED_LOGIN':
      return 'text-red-600'
    case 'APPROVE':
      return 'text-green-600'
    case 'REJECT':
      return 'text-red-600'
    case 'UPLOAD':
      return 'text-blue-600'
    case 'DOWNLOAD':
      return 'text-blue-600'
    case 'EXPORT':
      return 'text-purple-600'
    case 'SYNC':
      return 'text-blue-600'
    case 'SCREEN':
      return 'text-yellow-600'
    default:
      return 'text-slate-600'
  }
}
