import { describe, it, expect } from 'vitest'
import { analyzeATS } from './analyzer'
import type { ProfessionalProfile, EnvoyDocument, JobTarget } from '@/types'

const dummyProfile: ProfessionalProfile = {
  id: 'p1',
  userId: 'u1',
  summary: 'Experienced software engineer specializing in TypeScript, Node.js, and React microservices.',
  identity: {
    name: 'Alex Mercer',
    headline: 'Senior Full Stack Engineer',
    email: 'alex@example.com',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/alexmercer',
    github: 'https://github.com/alexmercer',
  },
  experience: [
    {
      id: 'e1',
      company: 'TechCorp',
      role: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: '2021-01',
      endDate: undefined,
      current: true,
      bullets: [
        'Architected high-throughput microservices reducing API latency by 45%.',
        'Led a team of 6 engineers delivering React and TypeScript features.',
      ],
      technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    },
  ],
  education: [
    {
      id: 'ed1',
      institution: 'UC Berkeley',
      degree: 'B.S.',
      field: 'Computer Science',
      startDate: '2016',
      endDate: '2020',
      current: false,
    },
  ],
  skills: [
    {
      id: 'sk1',
      category: 'Languages & Frameworks',
      skills: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'Python'],
    },
  ],
  projects: [],
  certifications: [],
  achievements: [],
  publications: [],
  awards: [],
  volunteering: [],
  languages: [],
  interests: [],
  customSections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const dummyDocument: EnvoyDocument = {
  id: 'doc1',
  userId: 'u1',
  profileId: 'p1',
  type: 'resume',
  title: 'Alex Mercer Resume',
  targetJobId: undefined,
  settings: {
    template: 'modern',
    accentColor: '#ef4444',
    fontFamily: 'inter',
    fontSize: 'normal',
    pageMargin: 'normal',
    showPhoto: false,
  },
  sections: [
    { id: 's1', type: 'summary', title: 'Summary', visible: true, order: 0 },
    { id: 's2', type: 'experience', title: 'Experience', visible: true, order: 1 },
    { id: 's3', type: 'education', title: 'Education', visible: true, order: 2 },
    { id: 's4', type: 'skills', title: 'Skills', visible: true, order: 3 },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const dummyJobTarget: JobTarget = {
  id: 'job1',
  userId: 'u1',
  title: 'Senior Staff Engineer',
  company: 'InnovateInc',
  description: 'Looking for a Senior Staff Engineer with expertise in Java, React, TypeScript, and microservices.',
  extracted: {
    role: 'Senior Staff Engineer',
    seniority: 'Senior',
    keywords: ['Java', 'React', 'TypeScript', 'microservices'],
    requiredSkills: ['React', 'Go'],
    preferredSkills: ['PostgreSQL'],
    softSkills: ['Leadership'],
    technologies: ['PostgreSQL', 'Docker'],
    responsibilities: ['Architect microservices'],
    qualifications: ['B.S. in CS'],
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('ATS Analyzer Engine', () => {
  it('prevents substring traps (Java should NOT match JavaScript)', () => {
    const report = analyzeATS(dummyProfile, dummyDocument, 'u1', dummyJobTarget)
    
    // Java is in the JD keywords, but dummyProfile contains "JavaScript", NOT "Java".
    // "Java" should be in missingKeywords, NOT keywordMatches!
    expect(report.missingKeywords).toContain('Java')
    expect(report.keywordMatches).not.toContain('Java')
  })

  it('correctly matches exact keywords and handles plural variations', () => {
    const report = analyzeATS(dummyProfile, dummyDocument, 'u1', dummyJobTarget)
    
    expect(report.keywordMatches).toContain('React')
    expect(report.keywordMatches).toContain('TypeScript')
    expect(report.keywordMatches).toContain('microservices')
  })

  it('deduplicates keywords from extracted job targets', () => {
    const report = analyzeATS(dummyProfile, dummyDocument, 'u1', dummyJobTarget)
    
    const reactMatches = report.keywordMatches.filter(k => k.toLowerCase() === 'react')
    expect(reactMatches.length).toBe(1)
  })

  it('calculates composite overallScore between 0 and 100', () => {
    const report = analyzeATS(dummyProfile, dummyDocument, 'u1', dummyJobTarget)
    
    expect(report.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.overallScore).toBeLessThanOrEqual(100)
    expect(report.issues).toBeDefined()
    expect(report.pageCount).toBeGreaterThan(0)
  })
})
