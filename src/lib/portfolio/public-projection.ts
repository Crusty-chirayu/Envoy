/**
 * ENVOY — Public portfolio data boundary (audit findings S1 / S9)
 *
 * The canonical ProfessionalProfile contains private data (every section,
 * internal ids, contact details). Public portfolio pages must NEVER receive
 * the canonical profile. These pure builders produce the ONLY shape that may
 * cross the public boundary: exactly the fields the portfolio themes render,
 * nothing more.
 *
 * Enforcement points:
 *  - Cloud mode: the server component assembles data with the service-role
 *    client (server-side only) and passes the PROJECTION to the renderer.
 *  - Demo mode: the client loader applies the same projection to the
 *    localStorage record before rendering.
 *  - Private/unpublished sites never reach this module (visibility gate runs
 *    first in both loaders).
 */

import type {
  ProfessionalProfile,
  PortfolioSite,
  ExperienceEntry,
  EducationEntry,
  SkillGroup,
  ProjectEntry,
} from '@/types'

/** Public-safe identity — only fields the portfolio themes render. */
export interface PublicIdentity {
  name: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin?: string
  github?: string
  website?: string
}

/** Public-safe profile projection. */
export interface PublicPortfolioProfile {
  identity: PublicIdentity
  summary?: string
  experience: ExperienceEntry[]
  education: EducationEntry[]
  skills: SkillGroup[]
  projects: ProjectEntry[]
}

/** Public-safe site projection (no owner ids, no internal config). */
export interface PublicPortfolioSite {
  slug: string
  title: string
  description?: string
  theme: PortfolioSite['theme']
  accentColor: string
  visibility: PortfolioSite['visibility']
  sections: PortfolioSite['sections']
  seoTitle?: string
  seoDescription?: string
  publishedAt?: string
}

function publicIdentity(profile: ProfessionalProfile): PublicIdentity {
  const { identity } = profile
  return {
    name: identity.name,
    headline: identity.headline,
    email: identity.email ?? '',
    phone: identity.phone ?? '',
    location: identity.location ?? '',
    linkedin: identity.linkedin || undefined,
    github: identity.github || undefined,
    website: identity.website || undefined,
  }
}

/**
 * Build the public-safe profile projection. Sections the themes never render
 * (certifications, achievements, publications, awards, volunteering,
 * languages, interests, custom sections) are deliberately excluded.
 */
export function toPublicProfile(profile: ProfessionalProfile): PublicPortfolioProfile {
  return {
    identity: publicIdentity(profile),
    summary: profile.summary || undefined,
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
  }
}

/**
 * The minimal site shape needed to build a public projection. Mirror of the
 * columns selected server-side; ownership ids and timestamps are NOT part of
 * the public boundary.
 */
export type PublicSiteInput = Pick<
  PortfolioSite,
  | 'slug'
  | 'title'
  | 'description'
  | 'theme'
  | 'accentColor'
  | 'visibility'
  | 'sections'
  | 'seoTitle'
  | 'seoDescription'
  | 'publishedAt'
>

/**
 * Build the public-safe site projection. Owner ids (userId/profileId) and
 * unused internal config (customDomain) never cross the boundary.
 */
export function toPublicSite(site: PublicSiteInput): PublicPortfolioSite {
  return {
    slug: site.slug,
    title: site.title,
    description: site.description || undefined,
    theme: site.theme,
    accentColor: site.accentColor,
    visibility: site.visibility,
    sections: Array.isArray(site.sections) ? site.sections : [],
    seoTitle: site.seoTitle || undefined,
    seoDescription: site.seoDescription || undefined,
    publishedAt: site.publishedAt || undefined,
  }
}