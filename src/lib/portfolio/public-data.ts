/**
 * ENVOY — Server-side public portfolio assembly (audit findings S1 / S9)
 *
 * CLOUD MODE DATA BOUNDARY:
 *  - The public page previously read portfolio_sites through the browser
 *    anon client (allowed by RLS for public/unlisted rows) and then tried to
 *    read the owner's profile with the SAME anon client — impossible under
 *    RLS (profiles are owner-only), so every public portfolio 404'd. That is
 *    audit finding S1.
 *  - Fix: this module assembles public portfolio data SERVER-SIDE using the
 *    service-role key, which never reaches the browser. It enforces the
 *    visibility gate in code and returns ONLY the whitelisted projection
 *    from `public-projection.ts`. The canonical profile row itself never
 *    leaves the server; anonymous visitors receive exactly the fields the
 *    themes render.
 *
 * REQUIREMENTS: cloud-mode public portfolios need SUPABASE_SERVICE_ROLE_KEY
 * (declared in .env.example). Without it this returns null (404) and logs a
 * configuration warning — it deliberately does NOT fall back to exposing
 * profiles through weaker RLS.
 */

import { createServiceClient } from '@/lib/supabase/server-public'
import { isPortfolioPubliclyViewable } from '@/lib/portfolio/visibility'
import {
  toPublicProfile,
  toPublicSite,
  type PublicPortfolioProfile,
  type PublicPortfolioSite,
  type PublicSiteInput,
} from '@/lib/portfolio/public-projection'
import type { PortfolioSite, ProfessionalProfile } from '@/types'

export interface PublicPortfolioData {
  site: PublicPortfolioSite
  profile: PublicPortfolioProfile
}

/** Minimal typed shape of the portfolio_sites columns we select. */
interface PortfolioSiteRow {
  id: string
  user_id: string
  profile_id: string
  slug: string
  title: string
  description: string | null
  theme: PortfolioSite['theme']
  accent_color: string
  visibility: PortfolioSite['visibility']
  seo_title: string | null
  seo_description: string | null
  sections: PortfolioSite['sections'] | null
  published_at: string | null
}

function mapSiteRow(row: PortfolioSiteRow): PublicSiteInput {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description || undefined,
    theme: row.theme,
    accentColor: row.accent_color,
    visibility: row.visibility,
    seoTitle: row.seo_title || undefined,
    seoDescription: row.seo_description || undefined,
    sections: row.sections || [],
    publishedAt: row.published_at || undefined,
  }
}

/**
 * True when the deployment runs without Supabase configured at all
 * (offline/demo mode). Server-side counterpart of checkDemoMode() — that
 * helper always reports demo on the server because `window` is undefined.
 */
export function isServerDemoMode(): boolean {
  const hasSupabaseKeys =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !hasSupabaseKeys
}

/**
 * Load the public-safe data for a portfolio slug, or null when the site does
 * not exist or is not publicly viewable. Safe to call from server components;
 * never exposes the canonical profile or private sites.
 */
export async function getPublicPortfolio(slug: string): Promise<PublicPortfolioData | null> {
  if (!slug) return null

  const supabase = createServiceClient()
  if (!supabase) {
    // Cloud mode without a service key cannot assemble public data safely.
    // Fail closed (404) rather than weakening the data boundary.
    console.error(
      '[PublicPortfolio] SUPABASE_SERVICE_ROLE_KEY is not configured; ' +
      'public portfolio pages require it in cloud mode.'
    )
    return null
  }

  const { data: siteRow, error: siteError } = await supabase
    .from('portfolio_sites')
    .select('id,user_id,profile_id,slug,title,description,theme,accent_color,visibility,seo_title,seo_description,sections,published_at')
    .eq('slug', slug)
    .maybeSingle()

  if (siteError) {
    console.error('[PublicPortfolio] Site lookup failed:', siteError.message)
    return null
  }
  if (!siteRow) return null

  const site = mapSiteRow(siteRow as PortfolioSiteRow)

  // Visibility gate: private sites are never publicly rendered. This is
  // enforced in code here because the service role bypasses RLS by design.
  if (!isPortfolioPubliclyViewable(site.visibility)) return null

  // Owner id is used ONLY server-side to fetch the canonical profile row,
  // which is then reduced to the public projection. It never crosses the
  // public boundary.
  const ownerUserId = (siteRow as PortfolioSiteRow).user_id

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('data')
    .eq('user_id', ownerUserId)
    .maybeSingle()

  if (profileError) {
    console.error('[PublicPortfolio] Profile lookup failed:', profileError.message)
    return null
  }
  if (!profileRow?.data) return null

  const profile = profileRow.data as ProfessionalProfile

  return {
    site: toPublicSite(site),
    profile: toPublicProfile(profile),
  }
}