import { z } from 'zod'

// Notification type enum
export const NotificationType = z.enum([
  'CASE_ASSIGNED',
  'CASE_STATUS_CHANGED',
  'NEW_RISK_FLAG',
  'DEADLINE_APPROACHING',
  'DOCUMENT_UPLOADED',
  'CASE_APPROVED',
  'CASE_REJECTED',
  'COMMENT_ADDED',
])

export type NotificationTypeEnum = z.infer<typeof NotificationType>

// Create notification schema
export const createNotificationSchema = z.object({
  type: NotificationType,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().url().optional().nullable(),
  userId: z.string().cuid(),
  caseId: z.string().cuid().optional().nullable(),
  clientId: z.string().cuid().optional().nullable(),
  findingId: z.string().cuid().optional().nullable(),
})

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>

// Update notification preferences schema
export const updateNotificationPreferencesSchema = z.object({
  caseAssigned: z.boolean().optional(),
  caseStatusChanged: z.boolean().optional(),
  newRiskFlag: z.boolean().optional(),
  deadlineApproaching: z.boolean().optional(),
  documentUploaded: z.boolean().optional(),
  caseApproved: z.boolean().optional(),
  caseRejected: z.boolean().optional(),
  commentAdded: z.boolean().optional(),
})

export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>

// Notification preference labels for UI
export const NOTIFICATION_PREFERENCE_LABELS: Record<string, { label: string; description: string }> = {
  caseAssigned: {
    label: 'Case Assigned',
    description: 'When a case is assigned to you',
  },
  caseStatusChanged: {
    label: 'Case Status Changed',
    description: 'When the status of a case you are involved in changes',
  },
  newRiskFlag: {
    label: 'New Risk Flag',
    description: 'When a new risk flag is detected in your cases',
  },
  deadlineApproaching: {
    label: 'Deadline Approaching',
    description: 'When a case deadline is approaching (3 days or less)',
  },
  documentUploaded: {
    label: 'Document Uploaded',
    description: 'When a document is uploaded to a case you are assigned to',
  },
  caseApproved: {
    label: 'Case Approved',
    description: 'When a case you submitted is approved',
  },
  caseRejected: {
    label: 'Case Rejected',
    description: 'When a case you submitted is rejected',
  },
  commentAdded: {
    label: 'Comment Added',
    description: 'When someone adds a comment to your case',
  },
}

// Get notification icon based on type
export function getNotificationIcon(type: NotificationTypeEnum): string {
  switch (type) {
    case 'CASE_ASSIGNED':
      return 'user-plus'
    case 'CASE_STATUS_CHANGED':
      return 'refresh'
    case 'NEW_RISK_FLAG':
      return 'alert-triangle'
    case 'DEADLINE_APPROACHING':
      return 'clock'
    case 'DOCUMENT_UPLOADED':
      return 'file-plus'
    case 'CASE_APPROVED':
      return 'check-circle'
    case 'CASE_REJECTED':
      return 'x-circle'
    case 'COMMENT_ADDED':
      return 'message-circle'
    default:
      return 'bell'
  }
}

// Get notification color based on type
export function getNotificationColor(type: NotificationTypeEnum): string {
  switch (type) {
    case 'NEW_RISK_FLAG':
    case 'CASE_REJECTED':
      return 'text-red-600'
    case 'DEADLINE_APPROACHING':
      return 'text-amber-600'
    case 'CASE_APPROVED':
      return 'text-green-600'
    case 'CASE_ASSIGNED':
      return 'text-blue-600'
    default:
      return 'text-slate-600'
  }
}
