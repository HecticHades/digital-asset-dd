import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import { ApiKeyManagement } from './api-key-management'
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  revokeApiKey,
} from './actions'
import type { CreateApiKeyClientInput, UpdateApiKeyClientInput } from '@/lib/validators/api-key'

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

export default async function ApiKeysPage() {
  const currentUser = await getAuthenticatedUser()

  if (!hasPermission(currentUser.role, 'settings:read')) {
    redirect('/dashboard?error=access_denied')
  }

  const apiKeys = await getApiKeys()

  // Server action wrappers
  async function handleCreateApiKey(data: CreateApiKeyClientInput) {
    'use server'
    return createApiKey(data)
  }

  async function handleUpdateApiKey(apiKeyId: string, data: UpdateApiKeyClientInput) {
    'use server'
    return updateApiKey(apiKeyId, data)
  }

  async function handleRevokeApiKey(apiKeyId: string) {
    'use server'
    return revokeApiKey(apiKeyId)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        <p className="text-slate-600 mt-1">Manage API keys for external integrations</p>
      </div>

      <ApiKeyManagement
        apiKeys={apiKeys.map(k => ({
          ...k,
          expiresAt: k.expiresAt?.toISOString() || null,
          lastUsedAt: k.lastUsedAt?.toISOString() || null,
          createdAt: k.createdAt.toISOString(),
        }))}
        canCreate={hasPermission(currentUser.role, 'settings:write')}
        canUpdate={hasPermission(currentUser.role, 'settings:write')}
        canRevoke={hasPermission(currentUser.role, 'settings:delete')}
        onCreateApiKey={handleCreateApiKey}
        onUpdateApiKey={handleUpdateApiKey}
        onRevokeApiKey={handleRevokeApiKey}
      />
    </div>
  )
}
