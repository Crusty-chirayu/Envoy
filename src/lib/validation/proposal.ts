/**
 * ENVOY — AI Proposal Validation Gate
 *
 * Single source of truth for validating AI-proposed document edits BEFORE
 * they are allowed to touch canonical state.
 *
 * Pipeline enforced here:
 *   AI response → parse → schema validation → operation allowlist
 *   → section/field validation → normalized typed operation
 *
 * Guarantees:
 *  - The model can NEVER select an arbitrary object key. Every (sectionType,
 *    field) pair must appear in the allowlist below.
 *  - Value shapes are enforced per field (text vs list, length caps).
 *  - Rejected operations carry zero canonical side effects — callers must
 *    treat a failed validation as a hard stop.
 *
 * Item-existence checks (does itemId reference a real entry?) require the
 * live profile and are performed by the mutation boundary (editor), not here.
 */

import { z } from 'zod'

// ─────────────────────────────────────────
// Value primitives
// ─────────────────────────────────────────

/** Single line of resume copy. */
const ProposalText = (max: number) => z.string().min(1).max(max)

/** Bulleted accomplishment list. */
const BulletList = z.array(z.string().min(1).max(500)).min(1).max(10)

/** Technology / keyword tag list. */
const TagList = z.array(z.string().min(1).max(50)).max(20)

// ─────────────────────────────────────────
// Per-section allowlists
//
// Each entry pairs an editable field with the exact value shape the
// canonical applier supports. Anything not listed here is rejected.
// NOTE: 'education' is intentionally absent — the current applier does not
// support it, so education proposals are rejected with zero side effects.
// ─────────────────────────────────────────

const SUMMARY_FIELDS = ['summary'] as const
const EXPERIENCE_FIELDS = ['bullets', 'role', 'company', 'location', 'technologies'] as const
const SKILLS_FIELDS = ['category', 'skills'] as const
const PROJECTS_FIELDS = ['name', 'description', 'bullets', 'technologies'] as const

type FieldSpec = {
  readonly fields: readonly string[]
  /** Returns a Zod schema when the field accepts this value shape. */
  readonly valueFor: (field: string) => z.ZodTypeAny | null
}

const TEXT = (max: number) => ProposalText(max)
const LIST_BULLETS = BulletList
const LIST_TAGS = TagList

const SECTION_SPECS: Record<string, FieldSpec> = {
  summary: {
    fields: SUMMARY_FIELDS,
    valueFor: (f) => (f === 'summary' ? TEXT(2000) : null),
  },
  experience: {
    fields: EXPERIENCE_FIELDS,
    valueFor: (f) => {
      if (f === 'bullets') return LIST_BULLETS
      if (f === 'technologies') return LIST_TAGS
      if (f === 'role' || f === 'company') return TEXT(120)
      if (f === 'location') return TEXT(100)
      return null
    },
  },
  skills: {
    fields: SKILLS_FIELDS,
    valueFor: (f) => {
      if (f === 'skills') return LIST_TAGS
      if (f === 'category') return TEXT(50)
      return null
    },
  },
  projects: {
    fields: PROJECTS_FIELDS,
    valueFor: (f) => {
      if (f === 'bullets') return LIST_BULLETS
      if (f === 'technologies') return LIST_TAGS
      if (f === 'name') return TEXT(100)
      if (f === 'description') return TEXT(500)
      return null
    },
  },
}

// ─────────────────────────────────────────
// Block schema
// ─────────────────────────────────────────

const ProposalDataSchema = z
  .object({
    sectionType: z.string().min(1).max(30),
    field: z.string().min(1).max(40),
    itemId: z.string().min(1).max(64).optional(),
    originalValue: z.union([z.string().max(4000), z.array(z.string().max(500)).max(12)]),
    newValue: z.union([z.string().max(4000), z.array(z.string().max(500)).max(12)]),
    explanation: z.string().max(1000).optional(),
  })
  .superRefine((value, ctx) => {
    const spec = SECTION_SPECS[value.sectionType]
    if (!spec) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sectionType'],
        message: `Unsupported section type "${value.sectionType}". Allowed: ${Object.keys(SECTION_SPECS).join(', ')}.`,
      })
      return
    }

    if (!(spec.fields as readonly string[]).includes(value.field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['field'],
        message: `Field "${value.field}" is not editable within "${value.sectionType}". Allowed: ${spec.fields.join(', ')}.`,
      })
      return
    }

    const needsItem = value.sectionType !== 'summary'
    if (needsItem && (!value.itemId || value.itemId.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['itemId'],
        message: `"${value.sectionType}" proposals must reference an existing entry via itemId.`,
      })
      return
    }

    const valueSchema = spec.valueFor(value.field)
    if (!valueSchema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['field'],
        message: `No value schema registered for "${value.sectionType}.${value.field}".`,
      })
      return
    }

    const parsed = valueSchema.safeParse(value.newValue)
    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['newValue'],
        message: `Value rejected for "${value.sectionType}.${value.field}": ${parsed.error.issues[0]?.message ?? 'invalid shape'}.`,
      })
    }
  })

export const ProposalBlockSchema = z.object({
  action: z.literal('propose_edit'),
  data: ProposalDataSchema,
})

export type ValidatedProposal = z.infer<typeof ProposalDataSchema>

export type ProposalValidation =
  | { ok: true; proposal: ValidatedProposal }
  | { ok: false; error: string }

/**
 * Validates a full proposal block ({ action, data }).
 * Returns a normalized, typed proposal on success; on failure the error
 * message is safe to surface to the user and the caller MUST NOT mutate
 * any state.
 */
export function validateProposalBlock(block: unknown): ProposalValidation {
  const parsed = ProposalBlockSchema.safeParse(block)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path?.length ? `${issue.path.join('.')}: ` : ''
    return { ok: false, error: `${path}${issue?.message ?? 'Invalid proposal.'}` }
  }
  return { ok: true, proposal: parsed.data.data }
}

// ─────────────────────────────────────────
// Extraction from assistant message content
// ─────────────────────────────────────────

const PROPOSAL_BLOCK_REGEX = /```json\s*([\s\S]*?)```/i

export interface ExtractedProposal {
  /** Message content with the JSON block removed (what the user reads). */
  preText: string
  /** Validated, normalized proposal ready for review UI. */
  proposal: ValidatedProposal
}

/**
 * Extracts and validates the FIRST proposal block embedded in an assistant
 * message. Invalid or malformed blocks yield null — the message is then
 * rendered as plain text and offers NO actionable mutation, guaranteeing
 * rejected operations have zero canonical side effects.
 */
export function extractProposal(content: string): ExtractedProposal | null {
  const match = content.match(PROPOSAL_BLOCK_REGEX)
  if (!match || match[1] === undefined) return null

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(match[1].trim())
  } catch {
    return null
  }

  const validation = validateProposalBlock(parsedJson)
  if (!validation.ok) return null

  const preText = content.replace(PROPOSAL_BLOCK_REGEX, '').trim()
  return { preText, proposal: validation.proposal }
}