/**
 * Regression tests for audit finding S14.
 *
 * S14: the Phase 15 rewrite consumed the request body twice — once in the
 * primary path and once inside the error handler's heuristic fallback.
 * A Request body is single-consumption, so the fallback could never run
 * and every provider failure returned a 500 instead of the deterministic
 * heuristic result. These tests pin the corrected behavior: the body is
 * read exactly once and BOTH paths operate correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hermetic mocks: keep the route independent of env-based auth policy and
// of any real AI provider network calls.
vi.mock('@/lib/security/auth', () => ({
  getAuthContext: vi.fn(async () => ({ userId: 'test-user', email: 'test@example.com' })),
  unauthorizedResponse: () =>
    new Response(JSON.stringify({ error: 'Authentication required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
}))

const structuredMock = vi.fn()
vi.mock('@/lib/ai/provider', () => ({
  getAIProvider: () => ({
    structured: structuredMock,
  }),
  resolveMaxOutputTokens: () => 1024,
}))

import { POST } from './route'

function makeRequest(description: unknown): Request {
  return new Request('http://localhost/api/jobs/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  })
}

beforeEach(() => {
  structuredMock.mockReset()
})

describe('/api/jobs/extract — request body consumption (S14)', () => {
  it('serves the deterministic heuristic result when NO AI keys are configured', async () => {
    // No OPENAI_API_KEY etc. set in the vitest environment → isMock path.
    const response = await POST(
      makeRequest(
        'Senior Frontend Engineer at Acme Corp. Requires React, TypeScript, Node.js and AWS experience.'
      )
    )
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.company).toBe('Acme Corp')
    expect(Array.isArray(data.extracted.requiredSkills)).toBe(true)
    expect(data.extracted.requiredSkills.length).toBeGreaterThan(0)
    expect(structuredMock).not.toHaveBeenCalled()
  })

  it('falls back to the heuristic result when the AI provider THROWS (the S14 regression)', async () => {
    // Simulate a configured provider whose structured call fails.
    process.env.OPENAI_API_KEY = 'test-key'
    structuredMock.mockRejectedValue(new Error('provider unavailable'))

    try {
      const response = await POST(
        makeRequest(
          'Backend Engineer\nGlobex is hiring for a role requiring Go, Kubernetes, PostgreSQL and strong system design skills.'
        )
      )

      // THE REGRESSION: previously this returned 500 because the body had
      // already been consumed and the fallback re-read threw. Now the
      // fallback serves the deterministic heuristic result instead.
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.role).toBe('Backend Engineer')
      expect(data.extracted.seniority).toBe('Mid-Senior')
      expect(Array.isArray(data.extracted.technologies)).toBe(true)
      expect(data.extracted.technologies).toContain('go')
      expect(structuredMock).toHaveBeenCalledTimes(1)
    } finally {
      delete process.env.OPENAI_API_KEY
    }
  })

  it('returns the structured result when the provider succeeds', async () => {
    process.env.OPENAI_API_KEY = 'test-key'
    structuredMock.mockResolvedValue({
      company: 'Initech',
      role: 'Staff Engineer',
      seniority: 'Staff',
      requiredSkills: ['TypeScript'],
      preferredSkills: ['GraphQL'],
      keywords: ['distributed systems'],
      responsibilities: ['Lead architecture'],
      qualifications: ['10 years experience'],
      technologies: ['Node.js'],
      softSkills: ['Mentoring'],
    })

    try {
      const response = await POST(makeRequest('A perfectly valid job description text here.'))
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.company).toBe('Initech')
      expect(data.extracted.role).toBe('Staff Engineer')
      expect(structuredMock).toHaveBeenCalledTimes(1)
    } finally {
      delete process.env.OPENAI_API_KEY
    }
  })

  it('rejects descriptions below the minimum length with 400', async () => {
    const response = await POST(makeRequest('short'))
    expect(response.status).toBe(400)
  })

  it('rejects malformed JSON bodies with 400 (single consumption, no crash)', async () => {
    const response = await POST(
      new Request('http://localhost/api/jobs/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ not json',
      })
    )
    expect(response.status).toBe(400)
  })
})