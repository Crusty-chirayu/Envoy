/**
 * ENVOY — Canonical public base URL for OpenGraph/metadata (audit finding S9).
 *
 * Uses NEXT_PUBLIC_APP_URL when configured; falls back to a sensible default
 * so metadata generation never crashes in demo mode.
 */

export const PUBLIC_CANONICAL_BASE_URL: string = (
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://envoy.app'
).replace(/\/+$/, '')