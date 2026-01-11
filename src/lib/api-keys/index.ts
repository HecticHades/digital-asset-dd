import { createHash, randomBytes } from 'crypto'
import { prisma } from '@/lib/db'
import { ApiKeyScope } from '@/lib/validators/api-key'

/**
 * API key prefix for identification
 */
const API_KEY_PREFIX = 'dd_sk_'

/**
 * Generate a new API key
 * Returns the raw key (only shown once) and the hashed version for storage
 */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  // Generate 32 random bytes = 256 bits of entropy
  const randomPart = randomBytes(32).toString('base64url')
  const rawKey = `${API_KEY_PREFIX}${randomPart}`

  // Hash the key for secure storage
  const keyHash = hashApiKey(rawKey)

  // Keep first 12 chars (prefix + 4 chars) for identification
  const keyPrefix = rawKey.substring(0, 12)

  return { rawKey, keyHash, keyPrefix }
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

/**
 * Validate an API key and return the associated key record
 */
export async function validateApiKey(rawKey: string): Promise<{
  valid: boolean
  apiKey?: {
    id: string
    name: string
    scopes: string[]
    organizationId: string
    isActive: boolean
  }
  error?: string
}> {
  // Check if key has correct prefix
  if (!rawKey.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' }
  }

  const keyHash = hashApiKey(rawKey)

  // Find the API key in database
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      name: true,
      scopes: true,
      organizationId: true,
      isActive: true,
      expiresAt: true,
    },
  })

  if (!apiKey) {
    return { valid: false, error: 'API key not found' }
  }

  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' }
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }

  // Update last used timestamp and increment request count (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    })
    .catch(() => {
      // Silently ignore errors updating usage stats
    })

  return {
    valid: true,
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      organizationId: apiKey.organizationId,
      isActive: apiKey.isActive,
    },
  }
}

/**
 * Check if an API key has the required scope
 */
export function hasScope(keyScopes: string[], requiredScope: ApiKeyScope): boolean {
  return keyScopes.includes(requiredScope)
}

/**
 * Check if an API key has any of the required scopes
 */
export function hasAnyScope(keyScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.some((scope) => keyScopes.includes(scope))
}

/**
 * Check if an API key has all of the required scopes
 */
export function hasAllScopes(keyScopes: string[], requiredScopes: ApiKeyScope[]): boolean {
  return requiredScopes.every((scope) => keyScopes.includes(scope))
}

/**
 * Create a new API key
 */
export async function createApiKey(params: {
  name: string
  scopes: string[]
  expiresAt?: Date | null
  organizationId: string
  createdById?: string
}): Promise<{ apiKey: { id: string; keyPrefix: string }; rawKey: string }> {
  const { rawKey, keyHash, keyPrefix } = generateApiKey()

  const apiKey = await prisma.apiKey.create({
    data: {
      name: params.name,
      keyHash,
      keyPrefix,
      scopes: params.scopes,
      expiresAt: params.expiresAt,
      organizationId: params.organizationId,
      createdById: params.createdById,
    },
    select: {
      id: true,
      keyPrefix: true,
    },
  })

  return { apiKey, rawKey }
}

/**
 * Get all API keys for an organization
 */
export async function getApiKeys(organizationId: string) {
  return prisma.apiKey.findMany({
    where: { organizationId },
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
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Update an API key
 */
export async function updateApiKey(
  apiKeyId: string,
  organizationId: string,
  data: {
    name?: string
    scopes?: string[]
    isActive?: boolean
    expiresAt?: Date | null
  }
) {
  return prisma.apiKey.update({
    where: {
      id: apiKeyId,
      organizationId, // Ensure tenant isolation
    },
    data,
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      expiresAt: true,
    },
  })
}

/**
 * Revoke (delete) an API key
 */
export async function revokeApiKey(apiKeyId: string, organizationId: string) {
  return prisma.apiKey.delete({
    where: {
      id: apiKeyId,
      organizationId, // Ensure tenant isolation
    },
  })
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyUsage(apiKeyId: string, organizationId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [apiKey, usageLogs] = await Promise.all([
    prisma.apiKey.findUnique({
      where: {
        id: apiKeyId,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        requestCount: true,
        lastUsedAt: true,
      },
    }),
    prisma.apiKeyUsageLog.groupBy({
      by: ['endpoint', 'method'],
      where: {
        apiKeyId,
        timestamp: { gte: since },
      },
      _count: true,
    }),
  ])

  return { apiKey, usageLogs }
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(params: {
  apiKeyId: string
  endpoint: string
  method: string
  statusCode: number
  ipAddress?: string
  userAgent?: string
}) {
  return prisma.apiKeyUsageLog.create({
    data: {
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      statusCode: params.statusCode,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  })
}

/**
 * Mask an API key for display (show only prefix)
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}${'•'.repeat(20)}`
}
