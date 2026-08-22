/**
 * ENVOY In-Memory Rate Limiter
 *
 * Sliding-window limiter used by API route handlers to throttle expensive
 * operations (AI completions, document parsing, ATS scans).
 *
 * Identifier strategy: authenticated user id when available, otherwise the
 * client IP derived from proxy headers. This means anonymous callers share a
 * per-IP budget while signed-in users get their own per-user budget.
 *
 * Known limitation: state is per server instance. On multi-instance
 * deployments this provides approximate protection only; swap the store for
 * Redis/Upstash if strict global limits are required.
 */

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

interface RateLimitOptions {
  /** Maximum requests allowed inside the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

const DEFAULT_LIMIT = 20
const DEFAULT_WINDOW_MS = 60_000

/** Upper bound on tracked keys to keep memory bounded under abuse. */
const MAX_TRACKED_KEYS = 10_000

const buckets = new Map<string, number[]>()

function resolveOptions(limit?: number): RateLimitOptions {
  const envLimit = Number.parseInt(process.env.AI_REQUESTS_PER_MINUTE ?? '', 10)
  const effectiveLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? limit
      : Number.isFinite(envLimit) && envLimit > 0
        ? envLimit
        : DEFAULT_LIMIT
  return { limit: effectiveLimit, windowMs: DEFAULT_WINDOW_MS }
}

function pruneBucket(timestamps: number[], windowStart: number): number[] {
  let start = 0
  while (start < timestamps.length && timestamps[start] <= windowStart) {
    start++
  }
  return start > 0 ? timestamps.slice(start) : timestamps
}

/**
 * Records one request for `key` and reports whether it is within budget.
 */
export function checkRateLimit(key: string, limit?: number): RateLimitResult {
  const { limit: effectiveLimit, windowMs } = resolveOptions(limit)
  const now = Date.now()
  const windowStart = now - windowMs

  const existing = buckets.get(key)
  const current = pruneBucket(existing ?? [], windowStart)

  if (current.length >= effectiveLimit) {
    const oldest = current[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  current.push(now)

  // Keep memory bounded: drop arbitrary keys (Map iteration order ≈ insertion) when over capacity.
  if (buckets.size >= MAX_TRACKED_KEYS && !existing) {
    const firstKey = buckets.keys().next().value
    if (firstKey !== undefined) buckets.delete(firstKey)
  }

  buckets.set(key, current)

  return {
    allowed: true,
    remaining: effectiveLimit - current.length,
    retryAfterSeconds: 0,
  }
}

/**
 * Derives a stable client identifier for rate limiting.
 * Prefers the authenticated user id; falls back to the first forwarded IP,
 * then to a fixed bucket for unidentifiable callers.
 */
export function getClientRateLimitKey(
  userId: string | null,
  request: Request,
  scope: string
): string {
  if (userId) return `${scope}:user:${userId}`

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim()
  if (ip) return `${scope}:ip:${ip}`

  return `${scope}:ip:unknown`
}