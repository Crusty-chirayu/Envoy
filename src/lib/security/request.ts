/**
 * ENVOY API Request Guards
 *
 * Shared helpers for API route handlers:
 *  - Size-capped JSON body parsing (DoS protection)
 *  - Consistent, non-leaking error responses
 *  - Structural validation for client-supplied payloads
 *
 * Validation philosophy: payloads originate from the local Zustand store and
 * may contain demo-mode identifiers that are not UUIDs, so strict schema
 * enforcement is intentionally avoided. Guards verify structure and cap
 * sizes instead — enough to block abuse without breaking legitimate flows.
 */

import { NextResponse } from 'next/server'
import type { ProfessionalProfile, EnvoyDocument, JobTarget, ATSReport } from '@/types'

/** Default cap for JSON request bodies (512 KB). */
const DEFAULT_MAX_BODY_BYTES = 512 * 1024

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Parses a JSON body while enforcing a hard byte ceiling.
 * Returns null when the body is missing, oversized, or malformed —
 * the caller is expected to answer with a 4xx response.
 */
export async function parseJsonBody<T>(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES
): Promise<T | null> {
  const contentLength = Number.parseInt(request.headers.get('content-length') ?? '', 10)
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return null
  }

  try {
    const raw = await request.text()
    if (raw.length > maxBytes) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * Logs the real error server-side and returns a sanitized 500 response.
 * Internal error details are never forwarded to clients.
 */
export function serverErrorResponse(scope: string, err: unknown): NextResponse {
  console.error(`[${scope}]`, err)
  return jsonError(500, 'An unexpected server error occurred. Please try again later.')
}

// ─────────────────────────────────────────
// Structural validators
// ─────────────────────────────────────────

/** Maximum characters accepted in a single chat message. */
export const MAX_CHAT_MESSAGE_CHARS = 20_000
/** Maximum messages accepted in a conversation history payload. */
export const MAX_CHAT_MESSAGES = 50
/** Maximum characters accepted in a pasted job description. */
export const MAX_JOB_DESCRIPTION_CHARS = 50_000
/** Maximum upload size for document ingestion (10 MB). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
/** File extensions accepted by the ingestion endpoint. */
export const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.docx', '.txt'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Validates the conversation history portion of a /api/chat payload.
 */
export function validateChatMessages(value: unknown): ChatMessageInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_CHAT_MESSAGES) {
    return null
  }

  const messages: ChatMessageInput[] = []
  for (const entry of value) {
    if (!isRecord(entry)) return null
    const { role, content } = entry
    if (
      (role !== 'user' && role !== 'assistant' && role !== 'system') ||
      typeof content !== 'string' ||
      content.length === 0 ||
      content.length > MAX_CHAT_MESSAGE_CHARS
    ) {
      return null
    }
    messages.push({ role, content })
  }
  return messages
}

/**
 * Validates that profile/document context objects are present and shaped
 * like objects (deep validation is deliberately not performed).
 */
export function validateContextObject(value: unknown): boolean {
  return isRecord(value)
}

/**
 * Validates a job description string for the extraction endpoint.
 */
export function validateJobDescription(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length < 10 || trimmed.length > MAX_JOB_DESCRIPTION_CHARS) {
    return null
  }
  return trimmed
}

// ─────────────────────────────────────────
// Trust-boundary narrowing
//
// These validators check every field that server-side consumers actually
// dereference before narrowing untrusted JSON into ENVOY domain types.
// They are deliberately shallow beyond those fields: payloads originate
// from the user's own store and deep re-validation would duplicate the
// Zod schemas without adding protection where it matters (shape + size).
// ─────────────────────────────────────────

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function hasStringFields(record: Record<string, unknown>, fields: string[]): boolean {
  return fields.every(f => typeof record[f] === 'string')
}

/**
 * Narrows an untrusted payload into ProfessionalProfile after verifying the
 * structure consumed by the AI context builder and ATS engine.
 */
export function narrowProfile(value: unknown): ProfessionalProfile | null {
  if (!isRecord(value)) return null
  if (!isRecord(value.identity) || !hasStringFields(value.identity, ['name', 'email'])) {
    return null
  }
  for (const key of ['experience', 'education', 'skills', 'projects', 'certifications']) {
    if (!isArray(value[key])) return null
  }
  if (value.summary !== undefined && typeof value.summary !== 'string') return null
  return value as unknown as ProfessionalProfile
}

/**
 * Narrows an untrusted payload into EnvoyDocument after verifying the
 * structure consumed by the AI context builder and ATS engine.
 */
export function narrowDocument(value: unknown): EnvoyDocument | null {
  if (!isRecord(value)) return null
  if (!hasStringFields(value, ['type', 'title'])) return null
  if (!isArray(value.sections)) return null
  if (!isRecord(value.settings)) return null
  return value as unknown as EnvoyDocument
}

/**
 * Narrows an optional untrusted payload into JobTarget.
 */
export function narrowJobTarget(value: unknown): JobTarget | null {
  if (!isRecord(value)) return null
  if (!hasStringFields(value, ['title', 'description'])) return null
  return value as unknown as JobTarget
}

/**
 * Narrows an optional untrusted payload into ATSReport.
 */
export function narrowATSReport(value: unknown): ATSReport | null {
  if (!isRecord(value)) return null
  if (!isArray(value.issues) || !isArray(value.keywordMatches) || !isArray(value.missingKeywords)) {
    return null
  }
  return value as unknown as ATSReport
}
