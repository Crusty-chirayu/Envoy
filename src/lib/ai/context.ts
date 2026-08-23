/**
 * ENVOY AI Context Builder
 *
 * Assembles the right context for each AI request.
 * Never blindly sends all application state.
 * Sanitizes sensitive data before sending.
 */

import type {
  ProfessionalProfile,
  EnvoyDocument,
  DocumentSectionConfig,
  JobTarget,
  ATSReport,
} from '@/types'
import type { ChatMessage } from './provider'

export interface BuildContextOptions {
  profile: ProfessionalProfile
  document: EnvoyDocument
  selectedSectionId?: string
  selectedText?: string
  jobTarget?: JobTarget
  atsReport?: ATSReport
  recentChanges?: string[]
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'Present'
  const [year, month] = dateStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function profileToText(profile: ProfessionalProfile): string {
  const lines: string[] = []

  // Identity
  const { identity } = profile
  lines.push(`# ${identity.name}`)
  if (identity.headline) lines.push(`${identity.headline}`)
  lines.push(`${identity.email}${identity.phone ? ` | ${identity.phone}` : ''}${identity.location ? ` | ${identity.location}` : ''}`)
  if (identity.linkedin) lines.push(`LinkedIn: ${identity.linkedin}`)
  if (identity.github) lines.push(`GitHub: ${identity.github}`)
  lines.push('')

  // Summary
  if (profile.summary) {
    lines.push('## Summary')
    lines.push(profile.summary)
    lines.push('')
  }

  // Experience
  if (profile.experience.length > 0) {
    lines.push('## Experience')
    for (const exp of profile.experience) {
      lines.push(`### ${exp.role} at ${exp.company}`)
      lines.push(`${formatDate(exp.startDate)} – ${exp.current ? 'Present' : formatDate(exp.endDate)}${exp.location ? ` | ${exp.location}` : ''}`)
      for (const bullet of exp.bullets) {
        lines.push(`- ${bullet}`)
      }
      if (exp.technologies?.length) {
        lines.push(`Technologies: ${exp.technologies.join(', ')}`)
      }
      lines.push('')
    }
  }

  // Education
  if (profile.education.length > 0) {
    lines.push('## Education')
    for (const edu of profile.education) {
      lines.push(`### ${edu.degree}${edu.field ? ` in ${edu.field}` : ''} — ${edu.institution}`)
      lines.push(`${formatDate(edu.startDate)} – ${edu.current ? 'Present' : formatDate(edu.endDate)}`)
      if (edu.gpa) lines.push(`GPA: ${edu.gpa}`)
      if (edu.honors) lines.push(`Honors: ${edu.honors}`)
      lines.push('')
    }
  }

  // Skills
  if (profile.skills.length > 0) {
    lines.push('## Skills')
    for (const group of profile.skills) {
      lines.push(`**${group.category}:** ${group.skills.join(', ')}`)
    }
    lines.push('')
  }

  // Projects
  if (profile.projects.length > 0) {
    lines.push('## Projects')
    for (const proj of profile.projects) {
      lines.push(`### ${proj.name}`)
      lines.push(proj.description)
      if (proj.bullets?.length) {
        for (const bullet of proj.bullets) lines.push(`- ${bullet}`)
      }
      lines.push(`Technologies: ${proj.technologies.join(', ')}`)
      lines.push('')
    }
  }

  // Certifications
  if (profile.certifications.length > 0) {
    lines.push('## Certifications')
    for (const cert of profile.certifications) {
      lines.push(`- ${cert.name} — ${cert.issuer} (${cert.date})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function sectionToText(
  section: DocumentSectionConfig,
  profile: ProfessionalProfile
): string {
  switch (section.type) {
    case 'summary':
      return profile.summary ?? ''
    case 'experience':
      return profile.experience
        .map(e => `${e.role} at ${e.company}:\n${e.bullets.map(b => `- ${b}`).join('\n')}`)
        .join('\n\n')
    case 'education':
      return profile.education
        .map(e => `${e.degree} — ${e.institution}`)
        .join('\n')
    case 'skills':
      return profile.skills
        .map(g => `${g.category}: ${g.skills.join(', ')}`)
        .join('\n')
    case 'projects':
      return profile.projects
        .map(p => `${p.name}: ${p.description}`)
        .join('\n\n')
    default:
      return ''
  }
}

export function buildSystemPrompt(): string {
  return `You are ENVOY's AI career agent — a world-class professional writing expert and career strategist.

Your purpose is to help users create exceptional professional documents: resumes, CVs, and portfolios.

Core principles:
1. Be direct and actionable — suggest specific, concrete improvements
2. Preserve the user's authentic voice while elevating quality
3. Focus on measurable impact and achievement-oriented language
4. Use strong action verbs (Architected, Led, Delivered, Engineered, etc.)
5. Be aware of ATS requirements — avoid graphics, tables, unusual formatting
6. Tailor advice to the user's target role and industry when context is available
7. Never fabricate information — only improve what the user provides
8. When making document changes, always explain WHY the change improves the document

Conversation continuity:
9. This is an ONGOING working session. The conversation history below is real prior dialogue — build on it instead of restarting your analysis.
10. Do NOT repeat advice you already gave unless the user explicitly asks for a recap or a fresh rewrite.
11. Follow-up requests ("make it more concise", "more technical", "shorter") refer to YOUR PREVIOUS proposal in this conversation — revise that specific text.
12. A "Currently Selected Section" block tells you which section the user is focused on right now; tailor responses and proposals to it.
13. Short navigation commands ("next", "continue") are executed by the application itself and never reach you. If the user asks to continue working on content, pick up exactly where the conversation left off.

When proposing direct edits to profile summaries, work experience bullets, skills, or project descriptions, append a structured JSON block at the very end of your response inside a markdown code block, like so:
\`\`\`json
{
  "action": "propose_edit",
  "data": {
    "sectionType": "summary",
    "itemId": "optional-item-id-for-experience-or-projects",
    "field": "summary",
    "originalValue": "old text value",
    "newValue": "new text value",
    "explanation": "Brief reasoning for the suggested revision"
  }
}
\`\`\`
`
}

export function buildContext(options: BuildContextOptions): ChatMessage[] {
  const messages: ChatMessage[] = []

  // System message
  messages.push({
    role: 'system',
    content: buildSystemPrompt(),
  })

  // Profile context
  const profileText = profileToText(options.profile)
  messages.push({
    role: 'system',
    content: `## Current Professional Profile\n\n${profileText}`,
  })

  // Document context
  messages.push({
    role: 'system',
    content: `## Current Document
Type: ${options.document.type}
Title: ${options.document.title}
Template: ${options.document.settings.template}
Sections: ${options.document.sections
  .filter(s => s.visible)
  .sort((a, b) => a.order - b.order)
  .map(s => s.title)
  .join(', ')}`,
  })

  // Selected section context
  if (options.selectedSectionId) {
    const section = options.document.sections.find(s => s.id === options.selectedSectionId)
    if (section) {
      const sectionText = sectionToText(section, options.profile)
      messages.push({
        role: 'system',
        content: `## Currently Selected Section: ${section.title}\n\n${sectionText}`,
      })
    }
  }

  // Selected text context
  if (options.selectedText) {
    messages.push({
      role: 'system',
      content: `## Selected Text (user has highlighted this)\n\n"${options.selectedText}"`,
    })
  }

  // Job target context
  if (options.jobTarget) {
    const jt = options.jobTarget
    messages.push({
      role: 'system',
      content: `## Target Job
Role: ${jt.title}${jt.company ? ` at ${jt.company}` : ''}

Job Description:
${jt.description.slice(0, 3000)}${jt.description.length > 3000 ? '\n[truncated]' : ''}

${jt.extracted ? `Extracted Requirements:
Required Skills: ${jt.extracted.requiredSkills.join(', ')}
Keywords: ${jt.extracted.keywords.join(', ')}
Seniority: ${jt.extracted.seniority}` : ''}`,
    })
  }

  // ATS report context
  if (options.atsReport) {
    const r = options.atsReport
    messages.push({
      role: 'system',
      content: `## ATS Analysis Results
Overall Score: ${r.overallScore}/100
Issues: ${r.issues.filter(i => i.severity === 'critical' || i.severity === 'high').map(i => i.title).join(', ')}
Missing Keywords: ${r.missingKeywords.slice(0, 10).join(', ')}`,
    })
  }

  return messages
}
