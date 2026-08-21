/**
 * ENVOY ATS Analysis Engine
 *
 * Real algorithmic ATS analysis — no fake scores.
 * Analyzes structure, keywords, content quality, readability, and ATS risks.
 */

import type {
  ProfessionalProfile,
  EnvoyDocument,
  ATSReport,
  ATSIssue,
  ATSIssueSeverity,
  JobTarget,
} from '@/types'
import { v4 as uuid } from 'uuid'

// ─────────────────────────────────────────
// Action verb database
// ─────────────────────────────────────────

const STRONG_ACTION_VERBS = new Set([
  'accelerated', 'achieved', 'architected', 'automated', 'built', 'championed',
  'collaborated', 'consolidated', 'created', 'delivered', 'deployed', 'designed',
  'developed', 'directed', 'eliminated', 'engineered', 'established', 'executed',
  'expanded', 'generated', 'grew', 'identified', 'implemented', 'improved',
  'increased', 'initiated', 'integrated', 'launched', 'led', 'managed', 'mentored',
  'migrated', 'modernized', 'negotiated', 'optimized', 'orchestrated', 'overhauled',
  'pioneered', 'reduced', 'refactored', 'redesigned', 'resolved', 'scaled',
  'secured', 'spearheaded', 'streamlined', 'transformed', 'upgraded',
])

const WEAK_PHRASES = [
  'responsible for', 'helped with', 'worked on', 'assisted with',
  'participated in', 'was involved in', 'duties included', 'tasks included',
  'helped to', 'contributed to (without metrics)',
]

// ATS-incompatible elements
const ATS_RISK_PATTERNS = {
  tables: /\|.+\|/,
  multiColumn: /\s{10,}/,
  specialChars: /[©®™•◆●▪▶→←]/,
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function extractAllText(profile: ProfessionalProfile): string {
  const parts: string[] = []

  if (profile.summary) parts.push(profile.summary)

  for (const exp of profile.experience) {
    parts.push(exp.company, exp.role)
    parts.push(...exp.bullets)
    if (exp.technologies) parts.push(...exp.technologies)
  }

  for (const edu of profile.education) {
    parts.push(edu.institution, edu.degree)
    if (edu.field) parts.push(edu.field)
  }

  for (const sg of profile.skills) {
    parts.push(sg.category, ...sg.skills)
  }

  for (const proj of profile.projects) {
    parts.push(proj.name, proj.description)
    if (proj.bullets) parts.push(...proj.bullets)
    parts.push(...proj.technologies)
  }

  for (const cert of profile.certifications) {
    parts.push(cert.name, cert.issuer)
  }

  return parts.join(' ').toLowerCase()
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 0).length
}

function startsWithActionVerb(bullet: string): boolean {
  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? ''
  return STRONG_ACTION_VERBS.has(firstWord)
}

function hasMeasurableImpact(bullet: string): boolean {
  return /\d+/.test(bullet) ||
    /\b(increased|decreased|reduced|improved|grew|saved|generated)\b.*\b(by|to|from)\b/i.test(bullet) ||
    /\b\d+(%|k|m|b|x|\+|hrs?|hours?|days?|weeks?|months?|years?|users?|customers?|requests?)\b/i.test(bullet)
}

function estimatePageCount(profile: ProfessionalProfile): number {
  const total = wordCount(extractAllText(profile))
  // Rough estimate: ~500 words per page for a typical resume
  return Math.max(1, Math.ceil(total / 500))
}

// ─────────────────────────────────────────
// Analysis Modules
// ─────────────────────────────────────────

function analyzeStructure(
  profile: ProfessionalProfile,
  document: EnvoyDocument
): { score: number; issues: ATSIssue[] } {
  const issues: ATSIssue[] = []
  let score = 100

  // Check contact info completeness
  const { identity } = profile
  if (!identity.email) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'critical',
      title: 'Missing email address',
      description: 'ATS systems require an email address to process your application.',
      suggestion: 'Add your professional email address to your profile.',
    })
    score -= 15
  }

  if (!identity.phone) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'medium',
      title: 'Missing phone number',
      description: 'Most employers expect a contact phone number.',
      suggestion: 'Add your phone number to your profile.',
    })
    score -= 5
  }

  if (!identity.name) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'critical',
      title: 'Missing name',
      description: 'Your name must be clearly visible at the top of your resume.',
      suggestion: 'Add your full name to your profile.',
    })
    score -= 20
  }

  // Check for summary
  if (!profile.summary) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'medium',
      title: 'Missing professional summary',
      description: 'A professional summary helps ATS systems categorize your application and gives recruiters immediate context.',
      suggestion: 'Add a 2-3 sentence professional summary highlighting your key qualifications.',
    })
    score -= 8
  }

  // Check experience entries have dates
  for (const exp of profile.experience) {
    if (!exp.startDate) {
      issues.push({
        id: uuid(),
        category: 'structure',
        severity: 'high',
        title: `Missing start date for ${exp.role} at ${exp.company}`,
        description: 'ATS systems use dates to calculate experience duration.',
        suggestion: 'Add a start date for this position.',
        affectedSection: 'experience',
      })
      score -= 5
    }
  }

  // Check page count
  const pageCount = estimatePageCount(profile)
  if (pageCount > 2) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'medium',
      title: `Resume is approximately ${pageCount} pages`,
      description: 'Resumes longer than 2 pages are harder for ATS and recruiters to process efficiently.',
      suggestion: 'Aim for 1-2 pages. Remove older or less relevant experience.',
      affectedSection: 'experience',
    })
    score -= 10
  }

  // Check for sections
  const visibleSections = document.sections.filter(s => s.visible).map(s => s.type)
  if (!visibleSections.includes('experience')) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'high',
      title: 'No experience section',
      description: 'The experience section is critical for most ATS systems.',
      suggestion: 'Add your work experience.',
    })
    score -= 15
  }

  if (!visibleSections.includes('education')) {
    issues.push({
      id: uuid(),
      category: 'structure',
      severity: 'medium',
      title: 'No education section',
      description: 'Many job postings require educational credentials.',
      suggestion: 'Add your education history.',
    })
    score -= 8
  }

  return { score: Math.max(0, score), issues }
}

function analyzeKeywords(
  profile: ProfessionalProfile,
  jobTarget?: JobTarget
): { score: number; matches: string[]; missing: string[]; matchPercentage: number; issues: ATSIssue[] } {
  const issues: ATSIssue[] = []
  const resumeText = extractAllText(profile)
  const matches: string[] = []
  const missing: string[] = []

  if (!jobTarget?.extracted) {
    return { score: 70, matches: [], missing: [], matchPercentage: 0, issues: [] }
  }

  const allKeywords = [
    ...jobTarget.extracted.keywords,
    ...jobTarget.extracted.requiredSkills,
    ...jobTarget.extracted.technologies,
  ]

  for (const keyword of allKeywords) {
    if (resumeText.includes(keyword.toLowerCase())) {
      matches.push(keyword)
    } else {
      missing.push(keyword)
    }
  }

  const matchPercentage = allKeywords.length > 0
    ? Math.round((matches.length / allKeywords.length) * 100)
    : 0

  const score = matchPercentage

  if (matchPercentage < 40) {
    issues.push({
      id: uuid(),
      category: 'keywords',
      severity: 'critical',
      title: `Low keyword match: ${matchPercentage}%`,
      description: `Your resume only matches ${matchPercentage}% of the job's key terms. ATS systems may filter you out before a human sees your resume.`,
      suggestion: `Incorporate these missing keywords naturally: ${missing.slice(0, 8).join(', ')}`,
    })
  } else if (matchPercentage < 60) {
    issues.push({
      id: uuid(),
      category: 'keywords',
      severity: 'high',
      title: `Moderate keyword match: ${matchPercentage}%`,
      description: 'Your resume matches some key terms but could be better optimized.',
      suggestion: `Consider adding: ${missing.slice(0, 5).join(', ')}`,
    })
  } else if (matchPercentage < 80) {
    issues.push({
      id: uuid(),
      category: 'keywords',
      severity: 'medium',
      title: `Good keyword match: ${matchPercentage}%`,
      description: 'Your resume is reasonably well-matched to this job.',
      suggestion: `A few more terms could help: ${missing.slice(0, 3).join(', ')}`,
    })
  }

  return { score, matches, missing, matchPercentage, issues }
}

function analyzeContent(profile: ProfessionalProfile): { score: number; issues: ATSIssue[] } {
  const issues: ATSIssue[] = []
  let score = 100

  const allBullets: string[] = []
  for (const exp of profile.experience) {
    allBullets.push(...exp.bullets)
  }
  for (const proj of profile.projects) {
    if (proj.bullets) allBullets.push(...proj.bullets)
  }

  if (allBullets.length === 0) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'high',
      title: 'No bullet points found',
      description: 'Strong resumes use bullet points to highlight specific achievements.',
      suggestion: 'Add 3-5 bullet points for each experience position.',
    })
    score -= 20
    return { score: Math.max(0, score), issues }
  }

  // Check action verb usage
  const withActionVerbs = allBullets.filter(startsWithActionVerb)
  const actionVerbPct = Math.round((withActionVerbs.length / allBullets.length) * 100)

  if (actionVerbPct < 50) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'high',
      title: `Only ${actionVerbPct}% of bullets start with action verbs`,
      description: 'Strong resume bullets start with powerful action verbs that demonstrate impact and ownership.',
      suggestion: 'Start each bullet with a strong action verb like Architected, Led, Delivered, or Engineered.',
    })
    score -= 15
  } else if (actionVerbPct < 75) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'medium',
      title: 'Some bullets lack strong action verbs',
      description: `${100 - actionVerbPct}% of your bullets don't start with action verbs.`,
      suggestion: 'Review bullets that begin with weak phrases and replace with action verbs.',
    })
    score -= 8
  }

  // Check for measurable impact
  const withMetrics = allBullets.filter(hasMeasurableImpact)
  const metricPct = Math.round((withMetrics.length / allBullets.length) * 100)

  if (metricPct < 20) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'high',
      title: 'Very few quantifiable achievements',
      description: 'Bullets with specific numbers and metrics are significantly more impactful and ATS-friendly.',
      suggestion: 'Add metrics to at least 30% of your bullets. Example: "Reduced load time by 40%" instead of "Improved performance".',
    })
    score -= 12
  } else if (metricPct < 40) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'medium',
      title: 'Limited quantifiable achievements',
      description: `Only ${metricPct}% of your bullets include specific metrics.`,
      suggestion: 'Add more numbers, percentages, and impact metrics to your experience bullets.',
    })
    score -= 6
  }

  // Check for weak phrases
  const allText = allBullets.join(' ').toLowerCase()
  for (const phrase of WEAK_PHRASES) {
    if (allText.includes(phrase.replace(' (without metrics)', ''))) {
      issues.push({
        id: uuid(),
        category: 'content',
        severity: 'low',
        title: `Weak phrase detected: "${phrase}"`,
        description: 'This phrase is passive and doesn\'t demonstrate ownership or impact.',
        suggestion: 'Replace with a strong action verb and specific outcome.',
      })
      score -= 3
    }
  }

  // Check for very short bullets
  const shortBullets = allBullets.filter(b => wordCount(b) < 5)
  if (shortBullets.length > 0) {
    issues.push({
      id: uuid(),
      category: 'content',
      severity: 'medium',
      title: `${shortBullets.length} bullet(s) are too brief`,
      description: 'Bullets should be substantive — typically 1-2 lines describing the action, context, and impact.',
      suggestion: 'Expand short bullets to include context and measurable outcomes.',
    })
    score -= shortBullets.length * 2
  }

  return { score: Math.max(0, score), issues }
}

function analyzeReadability(profile: ProfessionalProfile): { score: number; issues: ATSIssue[] } {
  const issues: ATSIssue[] = []
  let score = 100

  const allText = extractAllText(profile)
  const words = wordCount(allText)

  if (words < 150) {
    issues.push({
      id: uuid(),
      category: 'readability',
      severity: 'high',
      title: 'Resume is too sparse',
      description: `Your resume has only ${words} words. Most effective resumes have 400-700 words.`,
      suggestion: 'Add more detail to your experience bullets and consider adding more sections.',
    })
    score -= 20
  }

  if (words > 1000) {
    issues.push({
      id: uuid(),
      category: 'readability',
      severity: 'medium',
      title: 'Resume may be too dense',
      description: `Your resume has ${words} words, which may be overwhelming for recruiters.`,
      suggestion: 'Consider trimming older experience and focusing on the most relevant information.',
    })
    score -= 10
  }

  // Check bullet length
  const allBullets: string[] = profile.experience.flatMap(e => e.bullets)
  const longBullets = allBullets.filter(b => wordCount(b) > 40)
  if (longBullets.length > 2) {
    issues.push({
      id: uuid(),
      category: 'readability',
      severity: 'low',
      title: `${longBullets.length} bullet(s) are too long`,
      description: 'Resume bullets should be concise — ideally 1-2 lines.',
      suggestion: 'Break long bullets into two separate points or trim unnecessary words.',
    })
    score -= 5
  }

  return { score: Math.max(0, score), issues }
}

function analyzeATSRisks(profile: ProfessionalProfile): { score: number; issues: ATSIssue[] } {
  const issues: ATSIssue[] = []
  let score = 100

  const allText = extractAllText(profile)

  // Check for special characters that ATS systems can't parse
  if (ATS_RISK_PATTERNS.specialChars.test(allText)) {
    issues.push({
      id: uuid(),
      category: 'risk',
      severity: 'high',
      title: 'Special characters detected',
      description: 'Some ATS systems cannot parse special characters like bullet symbols, arrows, or trademark signs.',
      suggestion: 'Replace special characters with plain text alternatives.',
    })
    score -= 15
  }

  // Check for too many special sections
  if (profile.customSections.length > 3) {
    issues.push({
      id: uuid(),
      category: 'risk',
      severity: 'low',
      title: 'Many custom sections',
      description: 'Custom section titles may not be recognized by ATS parsers.',
      suggestion: 'Consolidate custom sections and use standard section names where possible.',
    })
    score -= 5
  }

  // No profile photo warning (generally ATS-safe)
  // Check for LinkedIn and GitHub presence (positive signal)
  if (!profile.identity.linkedin) {
    issues.push({
      id: uuid(),
      category: 'risk',
      severity: 'info',
      title: 'No LinkedIn URL',
      description: 'A LinkedIn profile URL helps recruiters verify your experience and increases credibility.',
      suggestion: 'Add your LinkedIn profile URL to your contact information.',
    })
  }

  return { score: Math.max(0, score), issues }
}

// ─────────────────────────────────────────
// Main Analysis Function
// ─────────────────────────────────────────

export function analyzeATS(
  profile: ProfessionalProfile,
  document: EnvoyDocument,
  userId: string,
  jobTarget?: JobTarget
): ATSReport {
  const structure = analyzeStructure(profile, document)
  const keywords = analyzeKeywords(profile, jobTarget)
  const content = analyzeContent(profile)
  const readability = analyzeReadability(profile)
  const risk = analyzeATSRisks(profile)

  const allIssues: ATSIssue[] = [
    ...structure.issues,
    ...keywords.issues,
    ...content.issues,
    ...readability.issues,
    ...risk.issues,
  ]

  // Weight the overall score
  const overallScore = Math.round(
    structure.score * 0.25 +
    keywords.score * 0.30 +
    content.score * 0.25 +
    readability.score * 0.10 +
    risk.score * 0.10
  )

  const allText = extractAllText(profile)

  return {
    id: uuid(),
    documentId: document.id,
    userId,
    jobTargetId: jobTarget?.id,
    overallScore: Math.min(100, Math.max(0, overallScore)),
    structureScore: structure.score,
    keywordScore: keywords.score,
    contentScore: content.score,
    readabilityScore: readability.score,
    riskScore: risk.score,
    issues: allIssues,
    keywordMatches: keywords.matches,
    missingKeywords: keywords.missing,
    matchPercentage: keywords.matchPercentage,
    pageCount: estimatePageCount(profile),
    wordCount: wordCount(allText),
    createdAt: new Date().toISOString(),
  }
}

// Severity color helper
export function severityColor(severity: ATSIssueSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    case 'info': return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
  }
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}
