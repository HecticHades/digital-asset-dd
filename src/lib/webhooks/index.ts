import { createHmac, randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { WebhookEventType as WebhookEventTypeEnum, Prisma } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface WebhookPayload {
  id: string
  type: WebhookEventTypeEnum
  timestamp: string
  data: Record<string, unknown>
}

export interface DeliveryResult {
  success: boolean
  statusCode?: number
  responseBody?: string
  responseTimeMs?: number
  error?: string
}

// ============================================
// Configuration
// ============================================

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [1000, 5000, 30000] // Delays in milliseconds for each retry attempt
const RESPONSE_BODY_MAX_LENGTH = 1000 // Maximum length to store for response body
const DELIVERY_TIMEOUT = 30000 // 30 seconds timeout for webhook delivery

// ============================================
// Secret Generation
// ============================================

/**
 * Generate a secure webhook secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

// ============================================
// Signature Generation
// ============================================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: string, secret: string, timestamp: string): string {
  const signedPayload = `${timestamp}.${payload}`
  return createHmac('sha256', secret).update(signedPayload).digest('hex')
}

// ============================================
// Webhook CRUD Operations
// ============================================

/**
 * Create a new webhook
 */
export async function createWebhook(params: {
  name: string
  url: string
  events: WebhookEventTypeEnum[]
  headers?: Record<string, string>
  organizationId: string
  createdById?: string
}) {
  const secret = generateWebhookSecret()

  return prisma.webhook.create({
    data: {
      name: params.name,
      url: params.url,
      events: params.events,
      secret,
      headers: params.headers || {},
      organizationId: params.organizationId,
      createdById: params.createdById,
    },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      secret: true,
      isActive: true,
      headers: true,
      createdAt: true,
    },
  })
}

/**
 * Get all webhooks for an organization
 */
export async function getWebhooks(organizationId: string) {
  return prisma.webhook.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      secret: true,
      isActive: true,
      headers: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          deliveryLogs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get a single webhook by ID
 */
export async function getWebhook(webhookId: string, organizationId: string) {
  return prisma.webhook.findUnique({
    where: {
      id: webhookId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      secret: true,
      isActive: true,
      headers: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  organizationId: string,
  data: {
    name?: string
    url?: string
    events?: WebhookEventTypeEnum[]
    isActive?: boolean
    headers?: Record<string, string>
  }
) {
  return prisma.webhook.update({
    where: {
      id: webhookId,
      organizationId,
    },
    data: {
      ...data,
      headers: data.headers !== undefined ? data.headers : undefined,
    },
    select: {
      id: true,
      name: true,
      url: true,
      events: true,
      isActive: true,
      headers: true,
    },
  })
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string, organizationId: string) {
  return prisma.webhook.delete({
    where: {
      id: webhookId,
      organizationId,
    },
  })
}

/**
 * Regenerate webhook secret
 */
export async function regenerateSecret(webhookId: string, organizationId: string) {
  const newSecret = generateWebhookSecret()

  return prisma.webhook.update({
    where: {
      id: webhookId,
      organizationId,
    },
    data: {
      secret: newSecret,
    },
    select: {
      id: true,
      secret: true,
    },
  })
}

// ============================================
// Webhook Delivery
// ============================================

/**
 * Deliver a webhook event to a single endpoint
 */
async function deliverToEndpoint(
  webhook: { id: string; url: string; secret: string; headers: unknown },
  payload: WebhookPayload
): Promise<DeliveryResult> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, webhook.secret, timestamp)

  const customHeaders = (webhook.headers as Record<string, string>) || {}

  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
        'X-Webhook-Id': payload.id,
        ...customHeaders,
      },
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseTimeMs = Date.now() - startTime
    let responseBody = ''
    try {
      responseBody = await response.text()
      if (responseBody.length > RESPONSE_BODY_MAX_LENGTH) {
        responseBody = responseBody.substring(0, RESPONSE_BODY_MAX_LENGTH) + '...[truncated]'
      }
    } catch {
      responseBody = '[Unable to read response body]'
    }

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      responseTimeMs,
      error: errorMessage,
    }
  }
}

/**
 * Log a webhook delivery attempt
 */
async function logDelivery(params: {
  webhookId: string
  eventType: WebhookEventTypeEnum
  eventId: string
  payload: WebhookPayload
  result: DeliveryResult
  attempt: number
  caseId?: string
  clientId?: string
  findingId?: string
}) {
  return prisma.webhookDeliveryLog.create({
    data: {
      webhookId: params.webhookId,
      eventType: params.eventType,
      eventId: params.eventId,
      payload: params.payload as unknown as Prisma.InputJsonValue,
      statusCode: params.result.statusCode,
      responseBody: params.result.responseBody,
      responseTimeMs: params.result.responseTimeMs,
      error: params.result.error,
      attempt: params.attempt,
      deliveredAt: params.result.success ? new Date() : null,
      caseId: params.caseId,
      clientId: params.clientId,
      findingId: params.findingId,
    },
  })
}

/**
 * Deliver webhook with retry logic
 */
async function deliverWithRetry(
  webhook: { id: string; url: string; secret: string; headers: unknown },
  payload: WebhookPayload,
  context?: { caseId?: string; clientId?: string; findingId?: string }
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    const result = await deliverToEndpoint(webhook, payload)

    // Log the delivery attempt
    await logDelivery({
      webhookId: webhook.id,
      eventType: payload.type,
      eventId: payload.id,
      payload,
      result,
      attempt,
      ...context,
    })

    if (result.success) {
      return true
    }

    // If not the last attempt, wait before retrying
    if (attempt < MAX_RETRY_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt - 1]))
    }
  }

  return false
}

// ============================================
// Event Dispatching
// ============================================

/**
 * Get all active webhooks subscribed to an event type for an organization
 */
async function getSubscribedWebhooks(organizationId: string, eventType: WebhookEventTypeEnum) {
  return prisma.webhook.findMany({
    where: {
      organizationId,
      isActive: true,
      events: { has: eventType },
    },
    select: {
      id: true,
      url: true,
      secret: true,
      headers: true,
    },
  })
}

/**
 * Dispatch a webhook event to all subscribed endpoints
 */
export async function dispatchWebhookEvent(params: {
  organizationId: string
  eventType: WebhookEventTypeEnum
  data: Record<string, unknown>
  caseId?: string
  clientId?: string
  findingId?: string
}): Promise<{ dispatched: number; succeeded: number; failed: number }> {
  const webhooks = await getSubscribedWebhooks(params.organizationId, params.eventType)

  if (webhooks.length === 0) {
    return { dispatched: 0, succeeded: 0, failed: 0 }
  }

  const payload: WebhookPayload = {
    id: randomUUID(),
    type: params.eventType,
    timestamp: new Date().toISOString(),
    data: params.data,
  }

  const context = {
    caseId: params.caseId,
    clientId: params.clientId,
    findingId: params.findingId,
  }

  // Deliver to all webhooks in parallel (fire and forget style, but track results)
  const results = await Promise.all(
    webhooks.map((webhook) => deliverWithRetry(webhook, payload, context))
  )

  const succeeded = results.filter(Boolean).length
  const failed = results.length - succeeded

  return {
    dispatched: webhooks.length,
    succeeded,
    failed,
  }
}

// ============================================
// Event-Specific Helpers
// ============================================

/**
 * Dispatch case.created event
 */
export async function dispatchCaseCreated(params: {
  organizationId: string
  caseId: string
  caseTitle: string
  clientId: string
  clientName: string
  status: string
  riskLevel: string
  createdById?: string
  createdByName?: string
}) {
  return dispatchWebhookEvent({
    organizationId: params.organizationId,
    eventType: 'CASE_CREATED',
    caseId: params.caseId,
    clientId: params.clientId,
    data: {
      case: {
        id: params.caseId,
        title: params.caseTitle,
        status: params.status,
        riskLevel: params.riskLevel,
      },
      client: {
        id: params.clientId,
        name: params.clientName,
      },
      createdBy: params.createdById
        ? {
            id: params.createdById,
            name: params.createdByName,
          }
        : null,
    },
  })
}

/**
 * Dispatch case.status_changed event
 */
export async function dispatchCaseStatusChanged(params: {
  organizationId: string
  caseId: string
  caseTitle: string
  clientId: string
  clientName: string
  previousStatus: string
  newStatus: string
  changedById?: string
  changedByName?: string
}) {
  return dispatchWebhookEvent({
    organizationId: params.organizationId,
    eventType: 'CASE_STATUS_CHANGED',
    caseId: params.caseId,
    clientId: params.clientId,
    data: {
      case: {
        id: params.caseId,
        title: params.caseTitle,
      },
      client: {
        id: params.clientId,
        name: params.clientName,
      },
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      changedBy: params.changedById
        ? {
            id: params.changedById,
            name: params.changedByName,
          }
        : null,
    },
  })
}

/**
 * Dispatch risk_flag.created event
 */
export async function dispatchRiskFlagCreated(params: {
  organizationId: string
  caseId: string
  caseTitle: string
  findingId: string
  title: string
  description?: string
  severity: string
  category: string
  clientId: string
  clientName: string
}) {
  return dispatchWebhookEvent({
    organizationId: params.organizationId,
    eventType: 'RISK_FLAG_CREATED',
    caseId: params.caseId,
    clientId: params.clientId,
    findingId: params.findingId,
    data: {
      finding: {
        id: params.findingId,
        title: params.title,
        description: params.description,
        severity: params.severity,
        category: params.category,
      },
      case: {
        id: params.caseId,
        title: params.caseTitle,
      },
      client: {
        id: params.clientId,
        name: params.clientName,
      },
    },
  })
}

/**
 * Dispatch document.uploaded event
 */
export async function dispatchDocumentUploaded(params: {
  organizationId: string
  documentId: string
  documentName: string
  category: string
  clientId: string
  clientName: string
  uploadedById?: string
  uploadedByName?: string
}) {
  return dispatchWebhookEvent({
    organizationId: params.organizationId,
    eventType: 'DOCUMENT_UPLOADED',
    clientId: params.clientId,
    data: {
      document: {
        id: params.documentId,
        name: params.documentName,
        category: params.category,
      },
      client: {
        id: params.clientId,
        name: params.clientName,
      },
      uploadedBy: params.uploadedById
        ? {
            id: params.uploadedById,
            name: params.uploadedByName,
          }
        : null,
    },
  })
}

// ============================================
// Delivery Logs
// ============================================

/**
 * Get delivery logs for a webhook
 */
export async function getWebhookDeliveryLogs(
  webhookId: string,
  organizationId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options

  // First verify the webhook belongs to the organization
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId, organizationId },
    select: { id: true },
  })

  if (!webhook) {
    throw new Error('Webhook not found')
  }

  const [logs, total] = await Promise.all([
    prisma.webhookDeliveryLog.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        eventType: true,
        eventId: true,
        statusCode: true,
        responseTimeMs: true,
        error: true,
        attempt: true,
        deliveredAt: true,
        createdAt: true,
        caseId: true,
        clientId: true,
        findingId: true,
      },
    }),
    prisma.webhookDeliveryLog.count({ where: { webhookId } }),
  ])

  return {
    logs,
    total,
    hasMore: offset + limit < total,
  }
}

/**
 * Get recent delivery statistics for a webhook
 */
export async function getWebhookStats(webhookId: string, organizationId: string, days = 7) {
  // First verify the webhook belongs to the organization
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId, organizationId },
    select: { id: true },
  })

  if (!webhook) {
    throw new Error('Webhook not found')
  }

  const since = new Date()
  since.setDate(since.getDate() - days)

  const [totalDeliveries, successfulDeliveries, failedDeliveries, averageResponseTime] =
    await Promise.all([
      prisma.webhookDeliveryLog.count({
        where: { webhookId, createdAt: { gte: since } },
      }),
      prisma.webhookDeliveryLog.count({
        where: { webhookId, createdAt: { gte: since }, deliveredAt: { not: null } },
      }),
      prisma.webhookDeliveryLog.count({
        where: {
          webhookId,
          createdAt: { gte: since },
          deliveredAt: null,
          attempt: MAX_RETRY_ATTEMPTS,
        },
      }),
      prisma.webhookDeliveryLog.aggregate({
        where: { webhookId, createdAt: { gte: since }, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
      }),
    ])

  return {
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    successRate:
      totalDeliveries > 0 ? Math.round((successfulDeliveries / totalDeliveries) * 100) : 0,
    averageResponseTimeMs: Math.round(averageResponseTime._avg.responseTimeMs || 0),
  }
}

/**
 * Mask webhook secret for display
 */
export function maskWebhookSecret(secret: string): string {
  if (secret.length <= 12) return '•'.repeat(secret.length)
  return `${secret.substring(0, 8)}${'•'.repeat(20)}${secret.substring(secret.length - 4)}`
}
