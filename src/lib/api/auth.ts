import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, hasScope, logApiKeyUsage } from '@/lib/api-keys'
import { checkRateLimit, getRateLimitHeaders } from './rate-limiter'
import type { ApiKeyScope } from '@/lib/validators/api-key'

/**
 * API authentication result
 */
export interface ApiAuthResult {
  authenticated: boolean
  apiKeyId?: string
  organizationId?: string
  scopes?: string[]
  error?: string
  statusCode?: number
}

/**
 * Extract API key from request headers
 * Supports both "Authorization: Bearer <key>" and "X-API-Key: <key>" headers
 */
export function extractApiKey(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * Authenticate an API request
 * Returns authenticated context or error
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiAuthResult> {
  const apiKey = extractApiKey(request)

  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Provide via Authorization header (Bearer token) or X-API-Key header.',
      statusCode: 401,
    }
  }

  const validation = await validateApiKey(apiKey)

  if (!validation.valid || !validation.apiKey) {
    return {
      authenticated: false,
      error: validation.error || 'Invalid API key',
      statusCode: 401,
    }
  }

  return {
    authenticated: true,
    apiKeyId: validation.apiKey.id,
    organizationId: validation.apiKey.organizationId,
    scopes: validation.apiKey.scopes,
  }
}

/**
 * Middleware to protect API routes
 * Handles authentication, rate limiting, and scope checking
 */
export async function withApiAuth(
  request: NextRequest,
  options: {
    requiredScopes?: ApiKeyScope[]
  } = {}
): Promise<
  | { success: true; apiKeyId: string; organizationId: string; scopes: string[] }
  | { success: false; response: NextResponse }
> {
  // Authenticate request
  const auth = await authenticateApiRequest(request)

  if (!auth.authenticated) {
    return {
      success: false,
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.statusCode || 401 }
      ),
    }
  }

  // Check rate limiting
  const rateLimit = checkRateLimit(auth.apiKeyId!)
  const rateLimitHeaders = getRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: rateLimitHeaders,
        }
      ),
    }
  }

  // Check required scopes
  if (options.requiredScopes && options.requiredScopes.length > 0) {
    const missingScopes = options.requiredScopes.filter(
      (scope) => !hasScope(auth.scopes!, scope)
    )

    if (missingScopes.length > 0) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: `Missing required scopes: ${missingScopes.join(', ')}`,
            required_scopes: options.requiredScopes,
            your_scopes: auth.scopes,
          },
          { status: 403, headers: rateLimitHeaders }
        ),
      }
    }
  }

  // Log API usage (fire and forget)
  logApiKeyUsage({
    apiKeyId: auth.apiKeyId!,
    endpoint: request.nextUrl.pathname,
    method: request.method,
    statusCode: 200, // Will be updated if response differs
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  }).catch(() => {
    // Silently ignore logging errors
  })

  return {
    success: true,
    apiKeyId: auth.apiKeyId!,
    organizationId: auth.organizationId!,
    scopes: auth.scopes!,
  }
}

/**
 * Create an error response with rate limit headers
 */
export function createApiErrorResponse(
  error: string,
  status: number,
  apiKeyId?: string
): NextResponse {
  const headers: Record<string, string> = {}

  if (apiKeyId) {
    const rateLimit = checkRateLimit(apiKeyId)
    Object.assign(headers, getRateLimitHeaders(rateLimit))
  }

  return NextResponse.json({ error }, { status, headers })
}

/**
 * Create a success response with rate limit headers
 */
export function createApiResponse<T>(
  data: T,
  status: number = 200,
  apiKeyId?: string
): NextResponse {
  const headers: Record<string, string> = {}

  if (apiKeyId) {
    const rateLimit = checkRateLimit(apiKeyId)
    Object.assign(headers, getRateLimitHeaders(rateLimit))
  }

  return NextResponse.json(data, { status, headers })
}

/**
 * Standard API response formats
 */
export interface ApiListResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiItemResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: string
  details?: Record<string, unknown>
}
