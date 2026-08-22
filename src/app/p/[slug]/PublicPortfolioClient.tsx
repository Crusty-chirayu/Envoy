'use client'

import { useEffect, useState } from 'react'
import { dbPortfolios, dbProfile } from '@/lib/db'
import { isPortfolioPubliclyViewable } from '@/lib/portfolio/visibility'
import {
  toPublicProfile,
  toPublicSite,
  type PublicPortfolioProfile,
  type PublicPortfolioSite,
} from '@/lib/portfolio/public-projection'
import PublicPortfolioViews, {
  PublicPortfolioNotFound,
  PublicPortfolioLoader,
} from '@/components/PublicPortfolioViews'

interface DemoPortfolioData {
  site: PublicPortfolioSite
  profile: PublicPortfolioProfile
}

/**
 * Demo/offline-mode public portfolio loader.
 *
 * There is no RLS layer in localStorage, so the S7/S1 visibility gate and the
 * public-safe projection are applied HERE, client-side, before anything is
 * rendered — identical to the server path in cloud mode.
 */
export default function PublicPortfolioClient({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [data, setData] = useState<DemoPortfolioData | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const site = await dbPortfolios.getBySlug(slug)
        // Visibility gate (S7): private/unpublished sites are never rendered.
        if (!site || !isPortfolioPubliclyViewable(site.visibility)) {
          if (!cancelled) setStatus('missing')
          return
        }

        const profile = await dbProfile.get(site.userId)
        if (!profile) {
          if (!cancelled) setStatus('missing')
          return
        }

        // Public-safe projection (S1): canonical profile fields that the
        // themes never render never reach the view layer.
        if (!cancelled) {
          setData({
            site: toPublicSite(site),
            profile: toPublicProfile(profile),
          })
          setStatus('ready')
        }
      } catch {
        if (!cancelled) setStatus('missing')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug])

  if (status === 'loading') return <PublicPortfolioLoader />
  if (status !== 'ready' || !data) return <PublicPortfolioNotFound />
  return <PublicPortfolioViews profile={data.profile} site={data.site} />
}