import type { Metadata } from 'next'
import PublicPortfolioClient from './PublicPortfolioClient'
import PublicPortfolioViews, {
  PublicPortfolioNotFound,
} from '@/components/PublicPortfolioViews'
import { getPublicPortfolio, isServerDemoMode } from '@/lib/portfolio/public-data'
import { sanitizeRedirectPath } from '@/lib/security/redirect'
import { PUBLIC_CANONICAL_BASE_URL } from '@/lib/public-url'

interface Params {
  slug: string
}

/**
 * Public portfolio metadata (audit finding S9).
 * Private/unlisted handling:
 *  - Cloud mode: unlisted sites render `noindex` (direct-link only); private
 *    sites never reach here (getPublicPortfolio enforces the gate).
 *  - Demo mode: metadata is static/noindex, because no server-side data is
 *    available.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = sanitizeRedirectPath(`/${rawSlug}`).slice(1)

  if (isServerDemoMode()) {
    return {
      title: 'Portfolio',
      robots: { index: false, follow: false },
    }
  }

  const data = await getPublicPortfolio(slug)
  if (!data) {
    return {
      title: 'Portfolio Not Found',
      robots: { index: false, follow: false },
    }
  }

  const siteTitle = data.site.seoTitle || data.site.title || `${data.profile.identity.name}'s Portfolio`
  const description =
    data.site.seoDescription ||
    data.profile.identity.headline ||
    `${data.profile.identity.name}'s professional portfolio`

  return {
    title: siteTitle,
    description,
    openGraph: {
      title: siteTitle,
      description,
      type: 'website',
      url: data.site.slug ? `${PUBLIC_CANONICAL_BASE_URL}/p/${data.site.slug}` : undefined,
    },
    robots:
      data.site.visibility === 'unlisted'
        ? { index: false, follow: false, noarchive: true }
        : { index: true, follow: true },
  }
}

export default async function PublicPortfolioPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug: rawSlug } = await params
  const slug = sanitizeRedirectPath(`/${rawSlug}`).slice(1)

  // Demo/offline mode (no Supabase configured): render client-side from
  // localStorage. The visibility gate + projection are applied client-side.
  if (isServerDemoMode()) {
    return <PublicPortfolioClient slug={slug} />
  }

  // Cloud mode: server-assembled public-safe data (S1 boundary).
  const data = await getPublicPortfolio(slug)
  if (!data) return <PublicPortfolioNotFound />

  return <PublicPortfolioViews profile={data.profile} site={data.site} />
}