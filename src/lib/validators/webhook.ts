import { z } from 'zod'

/**
 * Available webhook event types
 */
export const WEBHOOK_EVENT_TYPES = [
  'CASE_CREATED',
  'CASE_STATUS_CHANGED',
  'RISK_FLAG_CREATED',
  'DOCUMENT_UPLOADED',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]

/**
 * Schema for creating a new webhook
 */
export const createWebhookSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  url: z
    .string()
    .url('Invalid URL format')
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    }),
  events: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, 'At least one event type is required'),
  headers: z
    .record(z.string())
    .optional()
    .default({}),
})

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>

/**
 * Input type for client-side create (before validation/transformation)
 */
export type CreateWebhookClientInput = {
  name: string
  url: string
  events: WebhookEventType[]
  headers?: Record<string, string>
}

/**
 * Schema for updating a webhook
 */
export const updateWebhookSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  url: z
    .string()
    .url('Invalid URL format')
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    })
    .optional(),
  events: z
    .array(z.enum(WEBHOOK_EVENT_TYPES))
    .min(1, 'At least one event type is required')
    .optional(),
  isActive: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
})

export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>

/**
 * Input type for client-side update (before validation/transformation)
 */
export type UpdateWebhookClientInput = {
  name?: string
  url?: string
  events?: WebhookEventType[]
  isActive?: boolean
  headers?: Record<string, string>
}

/**
 * Event type labels for UI display
 */
export const EVENT_TYPE_LABELS: Record<WebhookEventType, { label: string; description: string }> = {
  CASE_CREATED: {
    label: 'Case Created',
    description: 'Triggered when a new case is created',
  },
  CASE_STATUS_CHANGED: {
    label: 'Case Status Changed',
    description: 'Triggered when a case status is updated',
  },
  RISK_FLAG_CREATED: {
    label: 'Risk Flag Created',
    description: 'Triggered when a new risk flag is detected or manually added',
  },
  DOCUMENT_UPLOADED: {
    label: 'Document Uploaded',
    description: 'Triggered when a document is uploaded for a client',
  },
}

/**
 * Webhook delivery status
 */
export const DELIVERY_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
} as const

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS]

/**
 * Get delivery status from HTTP status code
 */
export function getDeliveryStatus(statusCode: number | null): DeliveryStatus {
  if (statusCode === null) return DELIVERY_STATUS.PENDING
  if (statusCode >= 200 && statusCode < 300) return DELIVERY_STATUS.SUCCESS
  return DELIVERY_STATUS.FAILED
}
