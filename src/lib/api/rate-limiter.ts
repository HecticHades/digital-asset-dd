/**
 * Simple in-memory rate limiter for API endpoints
 * Rate: 100 requests per minute per API key
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // 100 requests per window

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier for rate limiting (e.g., API key ID)
 * @returns Object with allowed status and rate limit headers
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
} {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpiredEntries()
  }

  if (!entry || now >= entry.resetAt) {
    // Create new rate limit window
    const resetAt = now + RATE_LIMIT_WINDOW_MS
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt,
      limit: RATE_LIMIT_MAX_REQUESTS,
    }
  }

  // Increment request count
  entry.count += 1
  rateLimitStore.set(identifier, entry)

  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count)
  const allowed = entry.count <= RATE_LIMIT_MAX_REQUESTS

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit: RATE_LIMIT_MAX_REQUESTS,
  }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries() {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, entry] of entries) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(rateLimit: {
  remaining: number
  resetAt: number
  limit: number
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(rateLimit.limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
  }
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier)
}

/**
 * Get current rate limit stats for monitoring
 */
export function getRateLimitStats(): { totalEntries: number; oldestEntry: number | null } {
  let oldestEntry: number | null = null
  const entries = Array.from(rateLimitStore.values())
  for (const entry of entries) {
    if (oldestEntry === null || entry.resetAt < oldestEntry) {
      oldestEntry = entry.resetAt
    }
  }

  return {
    totalEntries: rateLimitStore.size,
    oldestEntry,
  }
}
