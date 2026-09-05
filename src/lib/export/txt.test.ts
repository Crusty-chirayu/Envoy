/**
 * Tests for the plain-text exporter (audit findings D1 / D2).
 */

import { describe, expect, it } from 'vitest'
import { generatePlainText } from './txt'
import type { ProfessionalProfile, EnvoyDocument } from '@/types'

function makeProfile(overrides?: Partial<ProfessionalProfile>): ProfessionalProfile {
  return {
    id: 'profile-1',
    userId: 'user-1',
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    identity: {
      name: 'Jane Doe',
      headline: 'Software Engineer',
      email: 'jane@example.com',
      phone: '',
      location: '',
      socials: [],
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    publications: [],
    awards: [],
    volunteering: [],
    languages: [],
    interests: [],
    customSections: [],
    ...overrides,
  }
}

function makeDocument(overrides?: Partial<EnvoyDocument>): EnvoyDocument {
  return {
    id: 'doc-1',
    userId: 'user-1',
    profileId: 'profile-1',
    type: 'resume',
    title: 'My Resume',
    sections: [
      { id: 's1', type: 'summary', title: 'Summary', visible: true, order: 0 },
      { id: 's2', type: 'experience', title: 'Experience', visible: true, order: 1 },
      { id: 's3', type: 'education', title: 'Education', visible: true, order: 2 },
    ],
    settings: {
      template: 'minimal',
      accentColor: '#6366f1',
      fontFamily: 'inter',
      fontSize: 'normal',
      pageMargin: 'normal',
      showPhoto: false,
    },
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('generatePlainText — export correctness', () => {
  it('renders an education entry WITH a field as "degree in field"', () => {
    const text = generatePlainText(
      makeProfile({
        education: [
          {
            id: 'edu-1',
            institution: 'MIT',
            degree: 'B.S.',
            field: 'Computer Science',
            startDate: '2020-09',
            current: true,
          },
        ],
      })
    )
    expect(text).toContain('B.S. in Computer Science | MIT')
  })

  it('never renders "undefined" when an education entry has NO field (D2 regression)', () => {
    const text = generatePlainText(
      makeProfile({
        education: [
          {
            id: 'edu-1',
            institution: 'MIT',
            degree: 'B.S.',
            startDate: '2020-09',
            current: true,
          },
        ],
      })
    )
    expect(text).toContain('B.S. | MIT')
    expect(text).not.toContain('undefined')
  })

  it('produces a structured document with identity header and section banners', () => {
    const text = generatePlainText(makeProfile({ summary: 'Experienced engineer.' }))
    expect(text.startsWith('JANE DOE')).toBe(true)
    expect(text).toContain('PROFESSIONAL SUMMARY')
    expect(text).toContain('Experienced engineer.')
  })

  it('omits invisible sections when document configuration is provided (D1)', () => {
    const profile = makeProfile({
      summary: 'Experienced engineer.',
      experience: [
        {
          id: 'exp-1',
          role: 'Lead Dev',
          company: 'Acme',
          startDate: '2021',
          current: true,
          bullets: ['Built things'],
        },
      ],
    })
    const doc = makeDocument({
      sections: [
        { id: 's1', type: 'summary', title: 'Summary', visible: false, order: 0 },
        { id: 's2', type: 'experience', title: 'Experience', visible: true, order: 1 },
      ],
    })
    const text = generatePlainText(profile, doc)
    expect(text).not.toContain('Experienced engineer.')
    expect(text).toContain('LEAD DEV | Acme')
  })

  it('respects section ordering specified in document configuration (D1)', () => {
    const profile = makeProfile({
      summary: 'Summary text',
      experience: [
        {
          id: 'exp-1',
          role: 'Dev',
          company: 'Corp',
          startDate: '2021',
          current: true,
          bullets: [],
        },
      ],
    })
    const doc = makeDocument({
      sections: [
        { id: 's1', type: 'experience', title: 'Experience', visible: true, order: 0 },
        { id: 's2', type: 'summary', title: 'Summary', visible: true, order: 1 },
      ],
    })
    const text = generatePlainText(profile, doc)
    const expIndex = text.indexOf('EXPERIENCE')
    const summaryIndex = text.indexOf('SUMMARY')
    expect(expIndex).toBeGreaterThan(-1)
    expect(summaryIndex).toBeGreaterThan(-1)
    expect(expIndex).toBeLessThan(summaryIndex)
  })
})