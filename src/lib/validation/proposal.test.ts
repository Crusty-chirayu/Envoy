/**
 * Tests for the AI proposal validation gate (audit finding S3).
 *
 * These tests pin the security contract: the model can never select an
 * arbitrary object key, value shapes are enforced per field, and rejected
 * operations are reported without ambiguity.
 */

import { describe, it, expect } from 'vitest'
import { extractProposal, validateProposalBlock } from './proposal'

function block(data: unknown) {
  return { action: 'propose_edit', data }
}

describe('validateProposalBlock — allowlist enforcement', () => {
  it('accepts a valid summary proposal', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'summary',
        field: 'summary',
        originalValue: 'Old summary',
        newValue: 'New summary text',
        explanation: 'Stronger metrics.',
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.proposal.sectionType).toBe('summary')
      expect(result.proposal.newValue).toBe('New summary text')
    }
  })

  it('accepts a valid experience bullets proposal with itemId', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'bullets',
        itemId: 'exp-1',
        originalValue: ['old bullet'],
        newValue: ['Led migration cutting latency by 40%', 'Mentored 3 engineers'],
      })
    )
    expect(result.ok).toBe(true)
  })

  it('REJECTS an arbitrary object key injection (field: "id")', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'id',
        itemId: 'exp-1',
        originalValue: 'exp-1',
        newValue: 'attacker-controlled-id',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS arbitrary key injection on summary (field: "userId")', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'summary',
        field: 'userId',
        originalValue: 'x',
        newValue: 'attacker',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS unknown section types (e.g. education — applier does not support it)', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'education',
        field: 'degree',
        itemId: 'edu-1',
        originalValue: 'BSc',
        newValue: 'PhD',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS a completely fabricated section type', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'identity',
        field: 'name',
        originalValue: 'A',
        newValue: 'B',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS missing action literal', () => {
    const result = validateProposalBlock({
      action: 'delete_everything',
      data: { sectionType: 'summary', field: 'summary', originalValue: 'a', newValue: 'b' },
    })
    expect(result.ok).toBe(false)
  })
})

describe('validateProposalBlock — item reference requirements', () => {
  it('REJECTS experience proposal without itemId', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'role',
        originalValue: 'Engineer',
        newValue: 'Senior Engineer',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS blank itemId for skills proposals', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'skills',
        field: 'skills',
        itemId: '   ',
        originalValue: ['a'],
        newValue: ['b'],
      })
    )
    expect(result.ok).toBe(false)
  })

  it('does NOT require itemId for summary proposals', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'summary',
        field: 'summary',
        originalValue: 'old',
        newValue: 'new',
      })
    )
    expect(result.ok).toBe(true)
  })
})

describe('validateProposalBlock — value shape enforcement', () => {
  it('REJECTS a string where bullets require an array', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'bullets',
        itemId: 'exp-1',
        originalValue: ['x'],
        newValue: 'not-an-array',
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS an array where summary requires a string', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'summary',
        field: 'summary',
        originalValue: 'x',
        newValue: ['not', 'text'],
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS oversized summary values', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'summary',
        field: 'summary',
        originalValue: 'x',
        newValue: 'a'.repeat(2001),
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS empty bullet arrays', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'projects',
        field: 'bullets',
        itemId: 'p-1',
        originalValue: [],
        newValue: [],
      })
    )
    expect(result.ok).toBe(false)
  })

  it('REJECTS bullet lists exceeding the maximum length', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'bullets',
        itemId: 'exp-1',
        originalValue: [],
        newValue: Array.from({ length: 11 }, (_, i) => `bullet ${i}`),
      })
    )
    expect(result.ok).toBe(false)
  })

  it('accepts technologies tag list within limits', () => {
    const result = validateProposalBlock(
      block({
        sectionType: 'experience',
        field: 'technologies',
        itemId: 'exp-1',
        originalValue: ['React'],
        newValue: ['React', 'TypeScript', 'Node.js'],
      })
    )
    expect(result.ok).toBe(true)
  })
})

describe('extractProposal — message extraction', () => {
  const validJson = JSON.stringify(
    block({
      sectionType: 'summary',
      field: 'summary',
      originalValue: 'Old',
      newValue: 'New professional summary.',
      explanation: 'Tightened focus.',
    })
  )

  it('extracts and validates a fenced proposal with preceding prose', () => {
    const content = `Here is my suggestion:\n\n\`\`\`json\n${validJson}\n\`\`\`\nLet me know what you think.`
    const extracted = extractProposal(content)
    expect(extracted).not.toBeNull()
    if (extracted) {
      expect(extracted.preText).toContain('Here is my suggestion')
      expect(extracted.preText).not.toContain('propose_edit')
      expect(extracted.proposal.newValue).toBe('New professional summary.')
    }
  })

  it('returns null when no proposal block exists', () => {
    expect(extractProposal('Just some friendly advice, no JSON here.')).toBeNull()
  })

  it('returns null for malformed JSON inside the fence', () => {
    const content = '```\u0060json\n{ not valid json }\n```'
    expect(extractProposal(content)).toBeNull()
  })

  it('returns null when the embedded block fails validation (injection attempt)', () => {
    const malicious = JSON.stringify(
      block({
        sectionType: 'experience',
        field: 'id',
        itemId: 'exp-1',
        originalValue: 'exp-1',
        newValue: 'hijacked',
      })
    )
    const content = `Sure!\n\`\`\`json\n${malicious}\n\`\`\``
    // Invalid proposals must be invisible as actionable cards.
    expect(extractProposal(content)).toBeNull()
  })

  it('tolerates uppercase fence markers', () => {
    const content = `\`\`\`JSON\n${validJson}\n\`\`\``
    const extracted = extractProposal(content)
    expect(extracted).not.toBeNull()
  })
})