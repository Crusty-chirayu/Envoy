/**
 * ENVOY — Redirect target sanitation (audit finding S6)
 *
 * Single source of truth for validating post-auth redirect targets on BOTH
 * the server (`/api/auth/callback`) and the client (`/login`).
 *
 * Only same-origin relative paths are accepted. Anything else — absolute
 * URLs, protocol-relative "//host", backslash-prefixed "\host" tricks,
 * control characters — falls back to the safe default to prevent
 * open-redirect abuse of the auth flow.
 */

export const DEFAULT_AUTH_REDIRECT = '/dashboard'

/**
 * Validate a redirect target. Returns the target when it is a safe
 * same-origin relative path; otherwise returns `fallback`.
 */
export function sanitizeRedirectPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT
): string {
  if (!next) return fallback
  if (!next.startsWith('/')) return fallback
  // Reject protocol-relative ("//host") and backslash-prefixed ("\host") tricks.
  if (next.startsWith('//')) return fallback
  if (next.charCodeAt(1) === 92) return fallback // 92 === backslash
  // Reject control characters that could confuse URL parsers or terminals.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback
  return next
}