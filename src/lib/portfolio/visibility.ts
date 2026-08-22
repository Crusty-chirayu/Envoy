/**
 * ENVOY — Portfolio privacy semantics (audit finding S7)
 *
 * Single source of truth for the portfolio privacy contract:
 *  1. Every NEW portfolio is created PRIVATE (`DEFAULT_PORTFOLIO_VISIBILITY`).
 *  2. A portfolio becomes publicly reachable ONLY through an explicit user
 *     publish action (saving with a non-private visibility), which stamps
 *     `publishedAt` the first time the site goes live.
 *  3. Private sites are NEVER rendered on the public `/p/[slug]` route.
 *
 * The public page, the dashboard creation path, and the publish save path all
 * consume these helpers so the contract is enforced — and tested — in one place.
 */

import type { PortfolioVisibility } from '@/types'

/**
 * Privacy default: portfolios start PRIVATE. Publishing requires an explicit
 * user action in Portfolio Setup. A newly created portfolio must never become
 * publicly accessible merely because it was created.
 */
export const DEFAULT_PORTFOLIO_VISIBILITY: PortfolioVisibility = 'private'

/**
 * Whether a site with this visibility may be rendered for anonymous visitors
 * on `/p/[slug]`. `private` sites must never be publicly rendered; `public`
 * and `unlisted` sites remain publicly accessible (unlisted is discoverable
 * only via the direct link, but is still intentionally viewable).
 */
export function isPortfolioPubliclyViewable(visibility: PortfolioVisibility): boolean {
  return visibility !== 'private'
}

export interface ResolvePublishedAtInput {
  /** The visibility being saved. */
  visibility: PortfolioVisibility
  /** The site's existing `publishedAt`, if any. */
  currentPublishedAt?: string | null
  /** Clock override for tests. Defaults to `new Date()`. */
  now?: Date
}

/**
 * Resolve the `publishedAt` timestamp for a portfolio save.
 *
 * Contract:
 *  - First save with a non-private visibility → stamp the publish time.
 *  - Already-published sites keep their ORIGINAL timestamp (republishing or
 *    editing a live site must not rewrite its publication history).
 *  - Private saves never fabricate a publication timestamp.
 *  - Going back to private keeps the historical timestamp (the site WAS
 *    published before); it is simply no longer publicly viewable.
 */
export function resolvePublishedAt(input: ResolvePublishedAtInput): string | undefined {
  const { visibility, currentPublishedAt, now = new Date() } = input
  if (currentPublishedAt) return currentPublishedAt
  if (!isPortfolioPubliclyViewable(visibility)) return undefined
  return now.toISOString()
}