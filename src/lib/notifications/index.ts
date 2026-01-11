import { prisma } from '@/lib/db'
import { NotificationType as NotificationTypeEnum } from '@prisma/client'
import {
  sendCaseAssignmentEmail,
  sendHighRiskFlagEmail,
  sendDeadlineReminderEmail,
  isEmailConfigured,
} from '@/lib/email'

// ============================================
// Types
// ============================================

export interface CreateNotificationParams {
  type: NotificationTypeEnum
  title: string
  message: string
  link?: string | null
  userId: string
  organizationId: string
  caseId?: string | null
  clientId?: string | null
  findingId?: string | null
}

export interface NotificationWithMeta {
  id: string
  type: NotificationTypeEnum
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: Date | null
  createdAt: Date
  caseId: string | null
  clientId: string | null
  findingId: string | null
}

// ============================================
// Notification CRUD
// ============================================

/**
 * Create a new notification for a user
 */
export async function createNotification(params: CreateNotificationParams): Promise<NotificationWithMeta | null> {
  const { type, userId, organizationId } = params

  // Check user preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  // If preferences exist, check if this notification type is enabled
  if (preferences) {
    const preferenceKey = getPreferenceKeyForType(type)
    if (preferenceKey && !preferences[preferenceKey as keyof typeof preferences]) {
      // User has disabled this notification type
      return null
    }
  }

  // Create the notification
  const notification = await prisma.notification.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      userId: params.userId,
      organizationId: params.organizationId,
      caseId: params.caseId,
      clientId: params.clientId,
      findingId: params.findingId,
    },
  })

  return notification
}

/**
 * Get notifications for a user with pagination
 */
export async function getNotifications(
  userId: string,
  options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options

  const where = {
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])

  return {
    notifications,
    total,
    unreadCount,
    hasMore: offset + limit < total,
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns this notification
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Get unread count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  })
}

/**
 * Delete old notifications (cleanup)
 */
export async function deleteOldNotifications(userId: string, daysOld: number = 30) {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  return prisma.notification.deleteMany({
    where: {
      userId,
      isRead: true,
      createdAt: { lt: cutoffDate },
    },
  })
}

// ============================================
// Notification Preferences
// ============================================

/**
 * Get or create notification preferences for a user
 */
export async function getOrCreatePreferences(userId: string) {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  })

  if (!preferences) {
    preferences = await prisma.notificationPreference.create({
      data: { userId },
    })
  }

  return preferences
}

/**
 * Update notification preferences for a user
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<{
    caseAssigned: boolean
    caseStatusChanged: boolean
    newRiskFlag: boolean
    deadlineApproaching: boolean
    documentUploaded: boolean
    caseApproved: boolean
    caseRejected: boolean
    commentAdded: boolean
  }>
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      ...updates,
    },
  })
}

// ============================================
// Helper Functions
// ============================================

/**
 * Map notification type to preference key
 */
function getPreferenceKeyForType(type: NotificationTypeEnum): string | null {
  const mapping: Record<NotificationTypeEnum, string> = {
    CASE_ASSIGNED: 'caseAssigned',
    CASE_STATUS_CHANGED: 'caseStatusChanged',
    NEW_RISK_FLAG: 'newRiskFlag',
    DEADLINE_APPROACHING: 'deadlineApproaching',
    DOCUMENT_UPLOADED: 'documentUploaded',
    CASE_APPROVED: 'caseApproved',
    CASE_REJECTED: 'caseRejected',
    COMMENT_ADDED: 'commentAdded',
  }
  return mapping[type] || null
}

// ============================================
// Event-Based Notification Creators
// ============================================

/**
 * Create notification when a case is assigned to a user
 */
export async function notifyCaseAssigned(params: {
  caseId: string
  caseTitle: string
  assignedToId: string
  assignedByName: string
  organizationId: string
  clientName?: string
  dueDate?: Date | null
}) {
  // Create in-app notification
  const notification = await createNotification({
    type: 'CASE_ASSIGNED',
    title: 'Case Assigned',
    message: `You have been assigned to case "${params.caseTitle}" by ${params.assignedByName}`,
    link: `/cases/${params.caseId}`,
    userId: params.assignedToId,
    organizationId: params.organizationId,
    caseId: params.caseId,
  })

  // Send email notification (async, don't block)
  if (isEmailConfigured()) {
    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: params.assignedToId },
      select: { id: true, email: true, name: true },
    })

    if (user) {
      // Fire and forget - don't await
      sendCaseAssignmentEmail({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        caseId: params.caseId,
        caseTitle: params.caseTitle,
        clientName: params.clientName || 'Unknown Client',
        assignedByName: params.assignedByName,
        dueDate: params.dueDate,
      }).catch(err => console.error('[Email] Failed to send case assignment email:', err))
    }
  }

  return notification
}

/**
 * Create notification when case status changes
 */
export async function notifyCaseStatusChanged(params: {
  caseId: string
  caseTitle: string
  newStatus: string
  userId: string
  organizationId: string
}) {
  const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    IN_PROGRESS: 'In Progress',
    PENDING_REVIEW: 'Pending Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
    ARCHIVED: 'Archived',
  }

  return createNotification({
    type: 'CASE_STATUS_CHANGED',
    title: 'Case Status Updated',
    message: `Case "${params.caseTitle}" status changed to ${statusLabels[params.newStatus] || params.newStatus}`,
    link: `/cases/${params.caseId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
  })
}

/**
 * Create notification for new risk flag
 */
export async function notifyNewRiskFlag(params: {
  caseId: string
  caseTitle: string
  findingId: string
  findingTitle: string
  findingDescription?: string
  severity: string
  userId: string
  organizationId: string
  clientName?: string
}) {
  // Create in-app notification
  const notification = await createNotification({
    type: 'NEW_RISK_FLAG',
    title: `${params.severity} Risk Flag Detected`,
    message: `New ${params.severity.toLowerCase()} risk flag "${params.findingTitle}" detected in case "${params.caseTitle}"`,
    link: `/cases/${params.caseId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
    findingId: params.findingId,
  })

  // Send email for HIGH and CRITICAL severity (async, don't block)
  if (isEmailConfigured() && (params.severity === 'HIGH' || params.severity === 'CRITICAL')) {
    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true },
    })

    if (user) {
      // Fire and forget - don't await
      sendHighRiskFlagEmail({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        caseId: params.caseId,
        caseTitle: params.caseTitle,
        clientName: params.clientName || 'Unknown Client',
        flagTitle: params.findingTitle,
        flagDescription: params.findingDescription || '',
        severity: params.severity,
      }).catch(err => console.error('[Email] Failed to send high risk flag email:', err))
    }
  }

  return notification
}

/**
 * Create notification for approaching deadline
 */
export async function notifyDeadlineApproaching(params: {
  caseId: string
  caseTitle: string
  dueDate: Date
  userId: string
  organizationId: string
  clientName?: string
}) {
  const daysUntilDue = Math.ceil(
    (params.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  // Create in-app notification
  const notification = await createNotification({
    type: 'DEADLINE_APPROACHING',
    title: 'Deadline Approaching',
    message: `Case "${params.caseTitle}" is due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`,
    link: `/cases/${params.caseId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
  })

  // Send email notification (async, don't block)
  if (isEmailConfigured()) {
    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true },
    })

    if (user) {
      // Fire and forget - don't await
      sendDeadlineReminderEmail({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        caseId: params.caseId,
        caseTitle: params.caseTitle,
        clientName: params.clientName || 'Unknown Client',
        dueDate: params.dueDate,
        daysUntilDue,
      }).catch(err => console.error('[Email] Failed to send deadline reminder email:', err))
    }
  }

  return notification
}

/**
 * Create notification when document is uploaded
 */
export async function notifyDocumentUploaded(params: {
  caseId: string | null
  clientId: string
  documentName: string
  uploadedByName: string
  userId: string
  organizationId: string
}) {
  return createNotification({
    type: 'DOCUMENT_UPLOADED',
    title: 'Document Uploaded',
    message: `${params.uploadedByName} uploaded document "${params.documentName}"`,
    link: params.caseId ? `/cases/${params.caseId}` : `/clients/${params.clientId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
    clientId: params.clientId,
  })
}

/**
 * Create notification when case is approved
 */
export async function notifyCaseApproved(params: {
  caseId: string
  caseTitle: string
  approvedByName: string
  userId: string
  organizationId: string
}) {
  return createNotification({
    type: 'CASE_APPROVED',
    title: 'Case Approved',
    message: `Case "${params.caseTitle}" has been approved by ${params.approvedByName}`,
    link: `/cases/${params.caseId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
  })
}

/**
 * Create notification when case is rejected
 */
export async function notifyCaseRejected(params: {
  caseId: string
  caseTitle: string
  rejectedByName: string
  reason: string
  userId: string
  organizationId: string
}) {
  return createNotification({
    type: 'CASE_REJECTED',
    title: 'Case Rejected',
    message: `Case "${params.caseTitle}" was rejected by ${params.rejectedByName}: ${params.reason.substring(0, 100)}${params.reason.length > 100 ? '...' : ''}`,
    link: `/cases/${params.caseId}`,
    userId: params.userId,
    organizationId: params.organizationId,
    caseId: params.caseId,
  })
}
