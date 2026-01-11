/**
 * Audit Logging System - Shared Types and Constants
 *
 * This file contains types and constants that can be safely imported
 * in both server and client components.
 */

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
// Utility Functions (Client-safe)
// ============================================

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

/**
 * Escape CSV value
 */
export function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

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
