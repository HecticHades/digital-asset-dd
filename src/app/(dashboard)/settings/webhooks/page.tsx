import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { WebhookManagement } from './webhook-management'
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  getWebhookDeliveryLogs,
} from './actions'
import type { CreateWebhookClientInput, UpdateWebhookClientInput } from '@/lib/validators/webhook'

async function getAuthenticatedUser() {
  const user = await getCurrentUser()
  if (user) return user

  // Development fallback
  return {
    id: 'dev-user',
    email: 'dev@example.com',
    name: 'Dev User',
    role: 'ADMIN',
    organizationId: 'temp-org-id',
    organizationName: 'Development Org',
  }
}

export default async function WebhooksPage() {
  const currentUser = await getAuthenticatedUser()

  if (!hasPermission(currentUser.role, 'settings:read')) {
    redirect('/dashboard?error=access_denied')
  }

  const webhooks = await getWebhooks()

  // Server action wrappers
  async function handleCreateWebhook(data: CreateWebhookClientInput) {
    'use server'
    return createWebhook(data)
  }

  async function handleUpdateWebhook(webhookId: string, data: UpdateWebhookClientInput) {
    'use server'
    return updateWebhook(webhookId, data)
  }

  async function handleDeleteWebhook(webhookId: string) {
    'use server'
    return deleteWebhook(webhookId)
  }

  async function handleRegenerateSecret(webhookId: string) {
    'use server'
    return regenerateWebhookSecret(webhookId)
  }

  async function handleGetDeliveryLogs(webhookId: string, options?: { limit?: number; offset?: number }) {
    'use server'
    const result = await getWebhookDeliveryLogs(webhookId, options)
    return {
      ...result,
      logs: result.logs.map(log => ({
        ...log,
        deliveredAt: log.deliveredAt?.toISOString() || null,
        createdAt: log.createdAt.toISOString(),
      })),
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
        <p className="text-slate-600 mt-1">Configure webhook endpoints to receive real-time event notifications</p>
      </div>

      <WebhookManagement
        webhooks={webhooks.map(w => ({
          ...w,
          headers: w.headers as Record<string, string> | null,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        }))}
        canCreate={hasPermission(currentUser.role, 'settings:write')}
        canUpdate={hasPermission(currentUser.role, 'settings:write')}
        canDelete={hasPermission(currentUser.role, 'settings:delete')}
        onCreateWebhook={handleCreateWebhook}
        onUpdateWebhook={handleUpdateWebhook}
        onDeleteWebhook={handleDeleteWebhook}
        onRegenerateSecret={handleRegenerateSecret}
        onGetDeliveryLogs={handleGetDeliveryLogs}
      />
    </div>
  )
}
