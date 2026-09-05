import type { ProfessionalProfile, EnvoyDocument, SectionType } from '@/types'

const DEFAULT_SECTION_ORDER: SectionType[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'achievements',
  'publications',
  'awards',
  'volunteering',
  'languages',
  'interests',
  'custom',
]

export function generatePlainText(
  profile: ProfessionalProfile,
  document?: EnvoyDocument
): string {
  const { identity } = profile
  const lines: string[] = []

  lines.push(identity.name.toUpperCase())
  if (identity.headline) lines.push(identity.headline)

  const contact: string[] = []
  if (identity.email) contact.push(identity.email)
  if (identity.phone) contact.push(identity.phone)
  if (identity.location) contact.push(identity.location)
  if (identity.linkedin) contact.push(`LinkedIn: ${identity.linkedin}`)
  if (identity.github) contact.push(`GitHub: ${identity.github}`)
  if (identity.website) contact.push(`Website: ${identity.website}`)
  lines.push(contact.join('  |  '))
  lines.push('='.repeat(60))
  lines.push('')

  // Determine section order and visibility from document if present
  let activeSections: { type: SectionType; title?: string; customSectionId?: string }[] = []

  if (document?.sections && document.sections.length > 0) {
    activeSections = [...document.sections]
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ type: s.type, title: s.title, customSectionId: s.customSectionId }))
  } else {
    activeSections = DEFAULT_SECTION_ORDER.map((type) => ({ type }))
  }

  const renderSection = (item: { type: SectionType; title?: string; customSectionId?: string }) => {
    switch (item.type) {
      case 'summary':
        if (!profile.summary) return
        lines.push(item.title ? item.title.toUpperCase() : 'PROFESSIONAL SUMMARY')
        lines.push('-'.repeat(20))
        lines.push(profile.summary)
        lines.push('')
        break

      case 'experience':
        if (!profile.experience || profile.experience.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'WORK EXPERIENCE')
        lines.push('-'.repeat(15))
        for (const exp of profile.experience) {
          lines.push(`${exp.role.toUpperCase()} | ${exp.company} | ${exp.location || ''}`)
          lines.push(`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate || ''}`)
          if (exp.technologies && exp.technologies.length > 0) {
            lines.push(`Technologies: ${exp.technologies.join(', ')}`)
          }
          if (exp.bullets) {
            for (const bullet of exp.bullets) {
              lines.push(`* ${bullet}`)
            }
          }
          lines.push('')
        }
        break

      case 'education':
        if (!profile.education || profile.education.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'EDUCATION')
        lines.push('-'.repeat(9))
        for (const edu of profile.education) {
          lines.push(
            edu.field ? `${edu.degree} in ${edu.field} | ${edu.institution}` : `${edu.degree} | ${edu.institution}`
          )
          lines.push(`${edu.startDate} - ${edu.current ? 'Present' : edu.endDate || ''}`)
          lines.push('')
        }
        break

      case 'skills':
        if (!profile.skills || profile.skills.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'TECHNICAL SKILLS')
        lines.push('-'.repeat(16))
        for (const group of profile.skills) {
          lines.push(`${group.category}: ${group.skills.join(', ')}`)
        }
        lines.push('')
        break

      case 'projects':
        if (!profile.projects || profile.projects.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'PROJECTS')
        lines.push('-'.repeat(8))
        for (const proj of profile.projects) {
          lines.push(`${proj.name.toUpperCase()}`)
          if (proj.technologies && proj.technologies.length > 0) {
            lines.push(`Technologies: ${proj.technologies.join(', ')}`)
          }
          if (proj.description) lines.push(proj.description)
          if (proj.bullets) {
            for (const bullet of proj.bullets) {
              lines.push(`* ${bullet}`)
            }
          }
          lines.push('')
        }
        break

      case 'certifications':
        if (!profile.certifications || profile.certifications.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'CERTIFICATIONS')
        lines.push('-'.repeat(14))
        for (const cert of profile.certifications) {
          lines.push(`${cert.name} - ${cert.issuer} ${cert.date ? `(${cert.date})` : ''}`)
        }
        lines.push('')
        break

      case 'achievements':
        if (!profile.achievements || profile.achievements.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'KEY ACHIEVEMENTS')
        lines.push('-'.repeat(16))
        for (const ach of profile.achievements) {
          lines.push(`${ach.title} | ${ach.organization || ''} ${ach.date ? `(${ach.date})` : ''}`)
          lines.push(ach.description)
          lines.push('')
        }
        break

      case 'publications':
        if (!profile.publications || profile.publications.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'PUBLICATIONS')
        lines.push('-'.repeat(12))
        for (const pub of profile.publications) {
          lines.push(`${pub.title} (${pub.date})`)
          if (pub.authors && pub.authors.length > 0) {
            lines.push(`Authors: ${pub.authors.join(', ')}`)
          }
          if (pub.journal || pub.conference) {
            lines.push(`Venue: ${pub.journal || pub.conference}`)
          }
          lines.push('')
        }
        break

      case 'awards':
        if (!profile.awards || profile.awards.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'HONORS & AWARDS')
        lines.push('-'.repeat(15))
        for (const awd of profile.awards) {
          lines.push(`${awd.title} - ${awd.issuer} ${awd.date ? `(${awd.date})` : ''}`)
          if (awd.description) lines.push(awd.description)
          lines.push('')
        }
        break

      case 'volunteering':
        if (!profile.volunteering || profile.volunteering.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'VOLUNTEER WORK')
        lines.push('-'.repeat(14))
        for (const vol of profile.volunteering) {
          lines.push(`${vol.role} | ${vol.organization}`)
          lines.push(`${vol.startDate} - ${vol.current ? 'Present' : vol.endDate || ''}`)
          if (vol.description) lines.push(vol.description)
          lines.push('')
        }
        break

      case 'languages':
        if (!profile.languages || profile.languages.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'LANGUAGES')
        lines.push('-'.repeat(9))
        lines.push(profile.languages.map((l) => `${l.language} (${l.proficiency})`).join(', '))
        lines.push('')
        break

      case 'interests':
        if (!profile.interests || profile.interests.length === 0) return
        lines.push(item.title ? item.title.toUpperCase() : 'INTERESTS')
        lines.push('-'.repeat(9))
        lines.push(profile.interests.map((i) => i.interest).join(', '))
        lines.push('')
        break

      case 'custom':
        if (!profile.customSections || profile.customSections.length === 0) return
        const matches = item.customSectionId
          ? profile.customSections.filter((c) => c.id === item.customSectionId)
          : profile.customSections
        for (const cs of matches) {
          if (!cs.visible) continue
          lines.push((item.title || cs.title).toUpperCase())
          lines.push('-'.repeat(cs.title.length))
          for (const entry of cs.entries) {
            lines.push(entry.title)
            if (entry.content) lines.push(entry.content)
            if (entry.bullets) {
              for (const b of entry.bullets) {
                lines.push(`* ${b}`)
              }
            }
          }
          lines.push('')
        }
        break
    }
  }

  for (const s of activeSections) {
    renderSection(s)
  }

  return lines.join('\n')
}
