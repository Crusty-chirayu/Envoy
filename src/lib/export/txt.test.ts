/**
 * Tests for the plain-text exporter (audit finding D2).
 *
 * D2: an education entry without a `field` must not render a literal
 * "in undefined" in exported files.
 */

import { describe, expect, it } from 'vitest'
import { generatePlainText } from './txt'
import type { ProfessionalProfile } from '@/types'

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
})