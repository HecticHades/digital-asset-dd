'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import {
  createWebhookSchema,
  updateWebhookSchema,
  type CreateWebhookClientInput,
  type UpdateWebhookClientInput,
} from '@/lib/validators/webhook'
import {
  createWebhook as createWebhookService,
  updateWebhook as updateWebhookService,
  deleteWebhook as deleteWebhookService,
  getWebhooks as getWebhooksService,
  getWebhook as getWebhookService,
  getWebhookDeliveryLogs as getWebhookDeliveryLogsService,
  getWebhookStats as getWebhookStatsService,
  regenerateSecret as regenerateSecretService,
} from '@/lib/webhooks'
import { WebhookEventType } from '@prisma/client'

/**
 * Get the authenticated user with fallback for development
 */
async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) return user

  // Development fallback - return a mock admin user
  return {
    id: 'dev-user',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'ADMIN' as const,
    organizationId: 'temp-org-id',
    organizationName: 'Development Org',
  }
}

/**
 * Get all webhooks for the current organization
 */
export async function getWebhooks() {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view webhooks')
  }

  return getWebhooksService(user.organizationId)
}

/**
 * Get a single webhook by ID
 */
export async function getWebhook(webhookId: string) {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view webhooks')
  }

  return getWebhookService(webhookId, user.organizationId)
}

/**
 * Create a new webhook
 */
export async function createWebhook(input: CreateWebhookClientInput): Promise<{
  success: boolean
  webhook?: { id: string; secret: string }
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:write')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create webhooks' }
    }

    const validation = createWebhookSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input' }
    }

    const { name, url, events, headers } = validation.data

    const webhook = await createWebhookService({
      name,
      url,
      events: events as WebhookEventType[],
      headers,
      organizationId: user.organizationId,
      createdById: user.id,
    })

    revalidatePath('/settings/webhooks')

    return {
      success: true,
      webhook: {
        id: webhook.id,
        secret: webhook.secret,
      },
    }
  } catch (error) {
    console.error('Error creating webhook:', error)
    return { success: false, error: 'Failed to create webhook' }
  }
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(
  webhookId: string,
  input: UpdateWebhookClientInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:write')) {
      return { success: false, error: 'Unauthorized: You do not have permission to update webhooks' }
    }

    const validation = updateWebhookSchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input' }
    }

    await updateWebhookService(webhookId, user.organizationId, {
      name: validation.data.name,
      url: validation.data.url,
      events: validation.data.events as WebhookEventType[] | undefined,
      isActive: validation.data.isActive,
      headers: validation.data.headers,
    })

    revalidatePath('/settings/webhooks')

    return { success: true }
  } catch (error) {
    console.error('Error updating webhook:', error)
    return { success: false, error: 'Failed to update webhook' }
  }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:delete')) {
      return { success: false, error: 'Unauthorized: You do not have permission to delete webhooks' }
    }

    await deleteWebhookService(webhookId, user.organizationId)

    revalidatePath('/settings/webhooks')

    return { success: true }
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return { success: false, error: 'Failed to delete webhook' }
  }
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(
  webhookId: string
): Promise<{ success: boolean; secret?: string; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:write')) {
      return { success: false, error: 'Unauthorized: You do not have permission to regenerate webhook secrets' }
    }

    const result = await regenerateSecretService(webhookId, user.organizationId)

    revalidatePath('/settings/webhooks')

    return {
      success: true,
      secret: result.secret,
    }
  } catch (error) {
    console.error('Error regenerating webhook secret:', error)
    return { success: false, error: 'Failed to regenerate webhook secret' }
  }
}

/**
 * Get delivery logs for a webhook
 */
export async function getWebhookDeliveryLogs(
  webhookId: string,
  options?: { limit?: number; offset?: number }
) {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view webhook logs')
  }

  return getWebhookDeliveryLogsService(webhookId, user.organizationId, options)
}

/**
 * Get webhook statistics
 */
export async function getWebhookStats(webhookId: string, days = 7) {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view webhook stats')
  }

  return getWebhookStatsService(webhookId, user.organizationId, days)
}
