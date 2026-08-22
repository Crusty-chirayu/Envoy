/**
 * Tests for the public portfolio data boundary (audit findings S1 / S9).
 *
 * The canonical ProfessionalProfile contains private data that must NEVER
 * cross the public boundary: full section arrays (certifications, awards,
 * languages, interests, custom sections), internal ids, and coercion of
 * missing contact fields. These tests pin exactly what the public
 * projection may and may not contain.
 */

import { describe, expect, it } from 'vitest'
import { toPublicProfile, toPublicSite } from './public-projection'
import type { ProfessionalProfile, PortfolioSite } from '@/types'

function makeProfile(overrides?: Partial<ProfessionalProfile>): ProfessionalProfile {
  return {
    id: 'profile-internal-id',
    userId: 'user-private-id',
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    identity: {
      name: 'Jane Doe',
      headline: 'Software Engineer',
      email: 'jane@example.com',
      phone: '+1 555 000 0000',
      location: 'San Francisco, CA',
      linkedin: 'jane-doe',
      github: '',
      website: '',
      socials: [{ platform: 'linkedin', url: 'https://linkedin.com/in/jane' }],
    },
    summary: 'Experienced engineer.',
    experience: [
      {
        id: 'exp-1',
        company: 'Acme',
        role: 'Engineer',
        location: 'Remote',
        startDate: '2022-01',
        current: true,
        bullets: ['Shipped things'],
        technologies: ['TypeScript'],
      },
    ],
    education: [],
    skills: [],
    projects: [],
    certifications: [
      { id: 'cert-secret', name: 'AWS Certified', issuer: 'Amazon', date: '2024-01' },
    ],
    achievements: [{ id: 'ach-secret', title: 'Prize', description: 'Secret' }],
    publications: [
      { id: 'pub-secret', title: 'Paper', authors: ['Jane'], date: '2023-01' },
    ],
    awards: [{ id: 'award-secret', title: 'Award', issuer: 'Org' }],
    volunteering: [
      { id: 'vol-secret', organization: 'Org', role: 'Helper', startDate: '2020-01', current: false },
    ],
    languages: [{ id: 'lang-secret', language: 'English', proficiency: 'native' }],
    interests: [{ id: 'int-secret', interest: 'hiking' }],
    customSections: [
      { id: 'custom-secret', title: 'Secret Section', entries: [], visible: true, order: 0 },
    ],
    ...overrides,
  }
}

function makeSite(overrides?: Partial<PortfolioSite>): PortfolioSite {
  return {
    id: 'site-internal-id',
    userId: 'user-private-id',
    profileId: 'profile-internal-id',
    slug: 'jane-doe',
    title: "Jane Doe's Portfolio",
    theme: 'minimal',
    accentColor: '#6366f1',
    visibility: 'public',
    sections: [],
    customDomain: 'custom.example.com',
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('toPublicProfile — public data boundary (S1)', () => {
  it('exposes only the identity fields the themes render, coerced to strings', () => {
    const pub = toPublicProfile(makeProfile())
    expect(pub.identity).toEqual({
      name: 'Jane Doe',
      headline: 'Software Engineer',
      email: 'jane@example.com',
      phone: '+1 555 000 0000',
      location: 'San Francisco, CA',
      linkedin: 'jane-doe',
      github: undefined,
      website: undefined,
    })
  })

  it('never exposes internal ids, userId, or timestamps', () => {
    const pub = toPublicProfile(makeProfile())
    const serialized = JSON.stringify(pub)
    expect(serialized).not.toContain('user-private-id')
    expect(serialized).not.toContain('profile-internal-id')
    expect(serialized).not.toContain('createdAt')
    expect(serialized).not.toContain('updatedAt')
  })

  it('never exposes private sections the themes do not render', () => {
    const pub = toPublicProfile(makeProfile())
    const serialized = JSON.stringify(pub)
    expect(serialized).not.toContain('certifications')
    expect(serialized).not.toContain('achievements')
    expect(serialized).not.toContain('publications')
    expect(serialized).not.toContain('awards')
    expect(serialized).not.toContain('volunteering')
    expect(serialized).not.toContain('languages')
    expect(serialized).not.toContain('interests')
    expect(serialized).not.toContain('customSections')
    expect(serialized).not.toContain('cert-secret')
    expect(serialized).not.toContain('ach-secret')
  })

  it('retains only the renderable sections (experience, education, skills, projects)', () => {
    const pub = toPublicProfile(
      makeProfile({
        experience: [
          {
            id: 'exp-1',
            company: 'Acme',
            role: 'Engineer',
            location: 'Remote',
            startDate: '2022-01',
            current: true,
            bullets: ['Shipped'],
            technologies: ['TypeScript'],
          },
        ],
        education: [
          {
            id: 'edu-1',
            institution: 'MIT',
            degree: 'B.S.',
            field: 'CS',
            startDate: '2018',
            current: false,
            endDate: '2022',
          },
        ],
        skills: [{ id: 'skill-1', category: 'Languages', skills: ['TS'] }],
        projects: [
          {
            id: 'proj-1',
            name: 'Envoy',
            description: 'ATS',
            technologies: ['Next.js'],
          },
        ],
      })
    )
    expect(pub.experience).toHaveLength(1)
    expect(pub.education).toHaveLength(1)
    expect(pub.skills).toHaveLength(1)
    expect(pub.projects).toHaveLength(1)
  })

  it('replaces missing contact fields with empty strings instead of undefined (theme-safe)', () => {
    const pub = toPublicProfile(
      makeProfile({
        identity: {
          name: 'Jane',
          headline: '',
          email: '',
          phone: '',
          location: '',
          socials: [],
        },
      })
    )
    expect(pub.identity.email).toBe('')
    expect(pub.identity.phone).toBe('')
    expect(pub.identity.location).toBe('')
    expect(pub.identity.linkedin).toBeUndefined()
  })

  it('tolerates profiles with missing arrays by defaulting to empty arrays', () => {
    const raw = makeProfile() as unknown as Record<string, unknown>
    delete raw.experience
    delete raw.education
    const pub = toPublicProfile(raw as unknown as ProfessionalProfile)
    expect(pub.experience).toEqual([])
    expect(pub.education).toEqual([])
    expect(pub.skills).toEqual([])
    expect(pub.projects).toEqual([])
  })
})

describe('toPublicSite — public site projection (S1)', () => {
  it('exposes only presentation config, never owner ids or customDomain', () => {
    const pub = toPublicSite(makeSite())
    const serialized = JSON.stringify(pub)
    expect(serialized).not.toContain('user-private-id')
    expect(serialized).not.toContain('profile-internal-id')
    expect(serialized).not.toContain('custom.example.com')
    expect(pub.slug).toBe('jane-doe')
    expect(pub.theme).toBe('minimal')
    expect(pub.visibility).toBe('public')
  })

  it('keeps seo fields for metadata generation (S9)', () => {
    const pub = toPublicSite(
      makeSite({
        seoTitle: 'Jane Doe — Portfolio',
        seoDescription: 'Senior engineer.',
      })
    )
    expect(pub.seoTitle).toBe('Jane Doe — Portfolio')
    expect(pub.seoDescription).toBe('Senior engineer.')
  })
})