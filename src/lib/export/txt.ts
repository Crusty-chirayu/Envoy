import type { ProfessionalProfile } from '@/types'

export function generatePlainText(profile: ProfessionalProfile): string {
  const { identity } = profile
  const lines: string[] = []

  lines.push(identity.name.toUpperCase())
  if (identity.headline) lines.push(identity.headline)
  
  const contact = []
  if (identity.email) contact.push(identity.email)
  if (identity.phone) contact.push(identity.phone)
  if (identity.location) contact.push(identity.location)
  if (identity.linkedin) contact.push(`LinkedIn: ${identity.linkedin}`)
  if (identity.github) contact.push(`GitHub: ${identity.github}`)
  lines.push(contact.join('  |  '))
  lines.push('='.repeat(60))
  lines.push('')

  if (profile.summary) {
    lines.push('PROFESSIONAL SUMMARY')
    lines.push('-'.repeat(20))
    lines.push(profile.summary)
    lines.push('')
  }

  if (profile.experience.length > 0) {
    lines.push('WORK EXPERIENCE')
    lines.push('-'.repeat(15))
    for (const exp of profile.experience) {
      lines.push(`${exp.role.toUpperCase()} | ${exp.company} | ${exp.location || ''}`)
      lines.push(`${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}`)
      if (exp.technologies && exp.technologies.length > 0) {
        lines.push(`Technologies: ${exp.technologies.join(', ')}`)
      }
      for (const bullet of exp.bullets) {
        lines.push(`* ${bullet}`)
      }
      lines.push('')
    }
  }

  if (profile.education.length > 0) {
    lines.push('EDUCATION')
    lines.push('-'.repeat(9))
    for (const edu of profile.education) {
      lines.push(`${edu.degree} in ${edu.field} | ${edu.institution}`)
      lines.push(`${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}`)
      lines.push('')
    }
  }

  if (profile.skills.length > 0) {
    lines.push('TECHNICAL SKILLS')
    lines.push('-'.repeat(16))
    for (const group of profile.skills) {
      lines.push(`${group.category}: ${group.skills.join(', ')}`)
    }
    lines.push('')
  }

  if (profile.projects.length > 0) {
    lines.push('PROJECTS')
    lines.push('-'.repeat(8))
    for (const proj of profile.projects) {
      lines.push(`${proj.name.toUpperCase()}`)
      lines.push(`Technologies: ${proj.technologies.join(', ')}`)
      lines.push(proj.description)
      if (proj.bullets) {
        for (const bullet of proj.bullets) {
          lines.push(`* ${bullet}`)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
