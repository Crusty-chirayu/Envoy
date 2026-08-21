import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai/provider'
import type { JobExtraction } from '@/types'

const jobExtractionSchema = {
  type: 'object',
  properties: {
    company: { type: 'string' },
    role: { type: 'string' },
    seniority: { type: 'string' },
    requiredSkills: { type: 'array', items: { type: 'string' } },
    preferredSkills: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' } },
    responsibilities: { type: 'array', items: { type: 'string' } },
    qualifications: { type: 'array', items: { type: 'string' } },
    technologies: { type: 'array', items: { type: 'string' } },
    softSkills: { type: 'array', items: { type: 'string' } }
  },
  required: [
    'company', 'role', 'seniority', 'requiredSkills', 'preferredSkills', 
    'keywords', 'responsibilities', 'qualifications', 'technologies', 'softSkills'
  ]
}

function extractLocalJobTarget(description: string) {
  const text = description.toLowerCase()

  const techs = [
    'react', 'next.js', 'typescript', 'javascript', 'node.js', 'python', 'java', 'c++', 
    'go', 'rust', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'sql', 'postgresql', 
    'mongodb', 'redis', 'graphql', 'rest', 'git', 'ci/cd', 'html', 'css', 'tailwind'
  ]
  const skills = [
    'agile', 'scrum', 'leadership', 'collaboration', 'communication', 'problem solving', 
    'project management', 'product management', 'system design', 'microservices'
  ]
  const keywords = [
    'frontend', 'backend', 'fullstack', 'devops', 'software engineer', 'developer',
    'cloud', 'database', 'testing', 'security', 'scalability', 'performance'
  ]

  const matchedTechs = techs.filter(t => text.includes(t))
  const matchedSkills = skills.filter(s => text.includes(s))
  const matchedKeywords = keywords.filter(k => text.includes(k))

  let company = 'Target Company'
  let role = 'Target Role'

  const lines = description.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length > 0) {
    const potentialRole = lines[0]
    if (potentialRole.length < 60 && !potentialRole.toLowerCase().includes('job description') && !potentialRole.toLowerCase().includes('about')) {
      role = potentialRole
    }
  }

  const companyMatch = description.match(/(?:at|join)\s+([A-Z][a-zA-Z0-9\s]+?)(?:\s+is\s+looking|\s+as|\s+team|\.)/)
  if (companyMatch && companyMatch[1]) {
    const candidate = companyMatch[1].trim()
    if (candidate.length > 2 && candidate.length < 40 && !['the', 'work', 'our', 'a', 'this'].includes(candidate.toLowerCase())) {
      company = candidate
    }
  }

  return {
    company,
    role,
    extracted: {
      role,
      seniority: 'Mid-Senior',
      requiredSkills: matchedTechs.length > 0 ? matchedTechs : ['typescript', 'react'],
      preferredSkills: [],
      keywords: matchedKeywords.length > 0 ? matchedKeywords : ['software engineering', 'performance optimization'],
      responsibilities: [],
      qualifications: [],
      technologies: matchedTechs,
      softSkills: matchedSkills.length > 0 ? matchedSkills : ['collaboration', 'problem solving']
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.clone().json()
    const { description } = body
    if (!description) {
      return NextResponse.json({ error: 'Missing job description' }, { status: 400 })
    }

    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasGemini = !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)
    const isMock = !hasOpenAI && !hasAnthropic && !hasGemini

    if (isMock) {
      const mockResult = extractLocalJobTarget(description)
      return NextResponse.json(mockResult)
    }

    const provider = getAIProvider()
    const messages = [
      {
        role: 'user' as const,
        content: `Extract the company name, role name, seniority, required skills, preferred skills, keywords, responsibilities, qualifications, technologies, and soft skills from the job description below.\n\nJob Description:\n${description}`
      }
    ]

    const result = await provider.structured<{
      company: string
      role: string
      seniority: string
      requiredSkills: string[]
      preferredSkills: string[]
      keywords: string[]
      responsibilities: string[]
      qualifications: string[]
      technologies: string[]
      softSkills: string[]
    }>(messages, jobExtractionSchema)

    const extraction: JobExtraction = {
      role: result.role || 'Target Role',
      seniority: result.seniority || 'Mid-Senior',
      requiredSkills: result.requiredSkills || [],
      preferredSkills: result.preferredSkills || [],
      keywords: result.keywords || [],
      responsibilities: result.responsibilities || [],
      qualifications: result.qualifications || [],
      technologies: result.technologies || [],
      softSkills: result.softSkills || []
    }

    return NextResponse.json({
      company: result.company || 'Target Company',
      role: result.role || 'Target Role',
      extracted: extraction
    })

  } catch (err: unknown) {
    console.warn('[Job Extraction] AI extraction failed or bypassed, falling back to heuristic:', err)
    try {
      const { description } = await request.json()
      const fallback = extractLocalJobTarget(description)
      return NextResponse.json(fallback)
    } catch {
      return NextResponse.json({ error: 'Failed to process extraction fallback' }, { status: 500 })
    }
  }
}
