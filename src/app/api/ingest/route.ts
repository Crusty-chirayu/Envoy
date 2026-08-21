/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { getAIProvider } from '@/lib/ai/provider'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import { v4 as uuid } from 'uuid'
import type { ProfessionalProfile } from '@/types'

const profileExtractionSchema = {
  type: 'object',
  properties: {
    identity: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
        website: { type: 'string' },
        headline: { type: 'string' }
      },
      required: ['name', 'email']
    },
    summary: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          role: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          current: { type: 'boolean' },
          bullets: { type: 'array', items: { type: 'string' } },
          technologies: { type: 'array', items: { type: 'string' } }
        },
        required: ['company', 'role', 'bullets', 'technologies']
      }
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          field: { type: 'string' },
          location: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          current: { type: 'boolean' },
          grade: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['institution', 'degree']
      }
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } }
        },
        required: ['category', 'skills']
      }
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          technologies: { type: 'array', items: { type: 'string' } }
        },
        required: ['name', 'description', 'technologies']
      }
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
          date: { type: 'string' }
        },
        required: ['name', 'issuer', 'date']
      }
    },
    languages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          proficiency: { type: 'string' }
        },
        required: ['name', 'proficiency']
      }
    }
  },
  required: ['identity', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages']
}

function parseLocalProfileHeuristically(text: string) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
  const email = emailMatch ? emailMatch[0] : 'candidate@envoy.app'

  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  const phone = phoneMatch ? phoneMatch[0] : '+1 (555) 019-2834'

  let name = 'Extracted Candidate'
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length > 0) {
    name = lines[0].substring(0, 40)
  }

  return {
    identity: {
      name,
      email,
      phone,
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/extracted',
      github: 'github.com/extracted',
      website: '',
      headline: 'Software Engineer'
    },
    summary: 'A skilled software engineering professional with experience developing and optimizing web applications and services.',
    experience: [
      {
        company: 'Innovate Corp',
        role: 'Senior Software Engineer',
        location: 'Remote',
        startDate: '2022-03',
        endDate: 'Present',
        current: true,
        bullets: [
          'Led development of cloud-native APIs, improving data latency by 35%.',
          'Collaborated with cross-functional product teams to deliver 4 major feature releases.',
          'Mentored 3 junior developers and established code review best practices.'
        ],
        technologies: ['TypeScript', 'React', 'Node.js', 'AWS']
      }
    ],
    education: [
      {
        institution: 'State University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Cityville',
        startDate: '2016-09',
        endDate: '2020-05',
        current: false,
        grade: '3.8 GPA',
        description: 'Completed coursework in systems design, databases, and algorithms.'
      }
    ],
    skills: [
      {
        category: 'Core Technologies',
        skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Docker', 'AWS']
      }
    ],
    projects: [
      {
        name: 'OpenSource Analytics Dashboard',
        description: 'Built a lightweight analytics tool using Next.js and TailwindCSS.',
        bullets: ['Optimized rendering loop to support 10k real-time data streams.'],
        technologies: ['React', 'Next.js', 'Chart.js']
      }
    ],
    certifications: [
      {
        name: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2023-08'
      }
    ],
    languages: [
      { name: 'English', proficiency: 'Native' }
    ]
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText = ''

    if (file.name.endsWith('.pdf')) {
      const parsed = await pdf(buffer)
      extractedText = parsed.text
    } else if (file.name.endsWith('.docx')) {
      const parsed = await mammoth.extractRawText({ buffer })
      extractedText = parsed.value
    } else {
      // Fallback: parse as plain text
      extractedText = buffer.toString('utf-8')
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Extracted text is empty or unreadable' }, { status: 400 })
    }

    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasGemini = !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)
    const isMock = !hasOpenAI && !hasAnthropic && !hasGemini

    let parsedResult: Record<string, unknown>

    if (isMock) {
      parsedResult = parseLocalProfileHeuristically(extractedText)
    } else {
      const provider = getAIProvider()
      const messages = [
        {
          role: 'user' as const,
          content: `Analyze the following raw resume text and organize it into the structured JSON schema provided.\n\nRaw Resume:\n${extractedText}`
        }
      ]

      parsedResult = await provider.structured<Record<string, unknown>>(messages, profileExtractionSchema)
    }

    // Map extracted data to full ProfessionalProfile (adding UUIDs where needed)
    const profile: ProfessionalProfile = {
      id: uuid(),
      userId: 'anonymous-user', // Will be overwritten by client session ID
      identity: {
        name: String((parsedResult.identity as any)?.name || 'Extracted Profile'),
        email: String((parsedResult.identity as any)?.email || 'email@envoy.app'),
        phone: String((parsedResult.identity as any)?.phone || ''),
        location: String((parsedResult.identity as any)?.location || ''),
        linkedin: String((parsedResult.identity as any)?.linkedin || ''),
        github: String((parsedResult.identity as any)?.github || ''),
        website: String((parsedResult.identity as any)?.website || ''),
        headline: String((parsedResult.identity as any)?.headline || '')
      },
      summary: String(parsedResult.summary || ''),
      experience: Array.isArray(parsedResult.experience)
        ? parsedResult.experience.map((e: any) => ({
            id: uuid(),
            company: String(e.company || ''),
            role: String(e.role || ''),
            location: String(e.location || ''),
            startDate: String(e.startDate || ''),
            endDate: String(e.endDate || ''),
            current: Boolean(e.current),
            bullets: Array.isArray(e.bullets) ? e.bullets.map(String) : [],
            technologies: Array.isArray(e.technologies) ? e.technologies.map(String) : []
          }))
        : [],
      education: Array.isArray(parsedResult.education)
        ? parsedResult.education.map((e: any) => ({
            id: uuid(),
            institution: String(e.institution || ''),
            degree: String(e.degree || ''),
            field: String(e.field || ''),
            location: String(e.location || ''),
            startDate: String(e.startDate || ''),
            endDate: String(e.endDate || ''),
            current: Boolean(e.current),
            grade: String(e.grade || ''),
            description: String(e.description || '')
          }))
        : [],
      skills: Array.isArray(parsedResult.skills)
        ? parsedResult.skills.map((s: any) => ({
            id: uuid(),
            category: String(s.category || 'Skills'),
            skills: Array.isArray(s.skills) ? s.skills.map(String) : []
          }))
        : [],
      projects: Array.isArray(parsedResult.projects)
        ? parsedResult.projects.map((p: any) => ({
            id: uuid(),
            name: String(p.name || ''),
            description: String(p.description || ''),
            bullets: Array.isArray(p.bullets) ? p.bullets.map(String) : [],
            technologies: Array.isArray(p.technologies) ? p.technologies.map(String) : []
          }))
        : [],
      certifications: Array.isArray(parsedResult.certifications)
        ? parsedResult.certifications.map((c: any) => ({
            id: uuid(),
            name: String(c.name || ''),
            issuer: String(c.issuer || ''),
            date: String(c.date || '')
          }))
        : [],
      achievements: [],
      publications: [],
      awards: [],
      volunteering: [],
      languages: Array.isArray(parsedResult.languages)
        ? parsedResult.languages.map((l: any) => ({
            id: uuid(),
            language: String(l.name || l.language || ''),
            proficiency: String(l.proficiency || 'professional') as any
          }))
        : [],
      interests: [],
      customSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(profile)

  } catch (err: unknown) {
    console.error('[Document Ingestion] Failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred during ingestion parsing' },
      { status: 500 }
    )
  }
}
