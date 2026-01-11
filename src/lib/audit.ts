/**
 * Audit Logging System - Server Functions
 *
 * This file contains server-only functions that use next/headers.
 * For types and constants, import from '@/lib/audit-shared'
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { headers } from 'next/headers'

// Re-export everything from shared for convenience in server components
export * from './audit-shared'

import {
  type AuditAction,
  type EntityType,
  type AuditLogInput,
  type AuditLogEntry,
  type AuditLogFilter,
  type AuditLogPagination,
} from './audit-shared'

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
