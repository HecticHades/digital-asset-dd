import { z } from 'zod'

/**
 * Available API key scopes
 */
export const API_KEY_SCOPES = ['read', 'write', 'delete'] as const
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

/**
 * Schema for creating a new API key
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, 'At least one scope is required')
    .default(['read']),
  expiresAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>

/**
 * Input type for client-side create (before validation/transformation)
 */
export type CreateApiKeyClientInput = {
  name: string
  scopes: ApiKeyScope[]
  expiresAt?: string | null
}

/**
 * Schema for updating an API key
 */
export const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, 'At least one scope is required')
    .optional(),
  isActive: z.boolean().optional(),
  expiresAt: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
})

export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>

/**
 * Input type for client-side update (before validation/transformation)
 */
export type UpdateApiKeyClientInput = {
  name?: string
  scopes?: ApiKeyScope[]
  isActive?: boolean
  expiresAt?: string | null
}

/**
 * Schema for revoking an API key
 */
export const revokeApiKeySchema = z.object({
  apiKeyId: z.string().cuid('Invalid API key ID'),
})

export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>

/**
 * Scope labels for UI display
 */
export const SCOPE_LABELS: Record<ApiKeyScope, { label: string; description: string }> = {
  read: {
    label: 'Read',
    description: 'Access to read clients, cases, documents, and transactions',
  },
  write: {
    label: 'Write',
    description: 'Access to create and update resources',
  },
  delete: {
    label: 'Delete',
    description: 'Access to delete resources',
  },
}

/**
 * Expiration options for API keys
 */
export const EXPIRATION_OPTIONS = [
  { value: '', label: 'Never expires' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
] as const

/**
 * Calculate expiration date from option value
 */
export function getExpirationDate(option: string): Date | null {
  if (!option) return null

  const now = new Date()
  switch (option) {
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    case '90d':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    case '1y':
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    default:
      return null
  }
}
