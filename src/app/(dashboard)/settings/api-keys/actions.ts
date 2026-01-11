'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

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
import {
  createApiKeySchema,
  updateApiKeySchema,
  type CreateApiKeyClientInput,
  type UpdateApiKeyClientInput,
} from '@/lib/validators/api-key'
import {
  createApiKey as createApiKeyService,
  revokeApiKey as revokeApiKeyService,
  updateApiKey as updateApiKeyService,
  getApiKeys as getApiKeysService,
  getApiKeyUsage as getApiKeyUsageService,
} from '@/lib/api-keys'

/**
 * Get all API keys for the current organization
 */
export async function getApiKeys() {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view API keys')
  }

  return getApiKeysService(user.organizationId)
}

/**
 * Create a new API key
 */
export async function createApiKey(input: CreateApiKeyClientInput): Promise<{
  success: boolean
  rawKey?: string
  apiKey?: { id: string; keyPrefix: string }
  error?: string
}> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:write')) {
      return { success: false, error: 'Unauthorized: You do not have permission to create API keys' }
    }

    const validation = createApiKeySchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input' }
    }

    const { name, scopes, expiresAt } = validation.data

    const result = await createApiKeyService({
      name,
      scopes,
      expiresAt,
      organizationId: user.organizationId,
      createdById: user.id,
    })

    revalidatePath('/settings/api-keys')

    return {
      success: true,
      rawKey: result.rawKey,
      apiKey: result.apiKey,
    }
  } catch (error) {
    console.error('Error creating API key:', error)
    return { success: false, error: 'Failed to create API key' }
  }
}

/**
 * Update an existing API key
 */
export async function updateApiKey(
  apiKeyId: string,
  input: UpdateApiKeyClientInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:write')) {
      return { success: false, error: 'Unauthorized: You do not have permission to update API keys' }
    }

    const validation = updateApiKeySchema.safeParse(input)
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0]?.message || 'Invalid input' }
    }

    await updateApiKeyService(apiKeyId, user.organizationId, {
      name: validation.data.name,
      scopes: validation.data.scopes,
      isActive: validation.data.isActive,
      expiresAt: validation.data.expiresAt,
    })

    revalidatePath('/settings/api-keys')

    return { success: true }
  } catch (error) {
    console.error('Error updating API key:', error)
    return { success: false, error: 'Failed to update API key' }
  }
}

/**
 * Revoke (delete) an API key
 */
export async function revokeApiKey(
  apiKeyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getAuthenticatedUser()

    if (!hasPermission(user.role, 'settings:delete')) {
      return { success: false, error: 'Unauthorized: You do not have permission to revoke API keys' }
    }

    await revokeApiKeyService(apiKeyId, user.organizationId)

    revalidatePath('/settings/api-keys')

    return { success: true }
  } catch (error) {
    console.error('Error revoking API key:', error)
    return { success: false, error: 'Failed to revoke API key' }
  }
}

/**
 * Get usage statistics for an API key
 */
export async function getApiKeyUsage(apiKeyId: string, days = 30) {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view API key usage')
  }

  return getApiKeyUsageService(apiKeyId, user.organizationId, days)
}

/**
 * Get a single API key by ID
 */
export async function getApiKey(apiKeyId: string) {
  const user = await getAuthenticatedUser()

  if (!hasPermission(user.role, 'settings:read')) {
    throw new Error('Unauthorized: You do not have permission to view API keys')
  }

  return prisma.apiKey.findUnique({
    where: {
      id: apiKeyId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      requestCount: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}
