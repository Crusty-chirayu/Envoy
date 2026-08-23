/**
 * ENVOY AI Section Navigation
 *
 * Deterministic navigation-intent parsing and resolution for the AI chat.
 *
 * Commands such as "next", "move to the next section", "continue",
 * or "go to education" are APPLICATION ACTIONS, not conversation. The LLM
 * cannot mutate application state, so these commands are intercepted in the
 * editor and executed directly against the document's real section model
 * (DocumentSectionConfig[], ordered by `order`, hidden sections skipped).
 *
 * This module is pure and unit-tested; the editor page owns the state change.
 */

import type { DocumentSectionConfig } from '@/types'

export type NavigationCommand =
  | { kind: 'next' }
  | { kind: 'previous' }
  | { kind: 'goto'; target: string }

export type NavigationResolution =
  | {
      ok: true
      sectionId: string
      sectionTitle: string
      index: number
      total: number
      direction: 'next' | 'previous' | 'goto'
    }
  | {
      ok: false
      reason: 'no-sections' | 'already-last' | 'already-first' | 'unknown-target'
      command: NavigationCommand
    }

/**
 * Aliases map common phrases onto the repository's ACTUAL SectionType values.
 * No invented section names — every alias resolves to an existing SectionType.
 */
const SECTION_TYPE_ALIASES: Record<string, DocumentSectionConfig['type']> = {
  summary: 'summary',
  profile: 'summary',
  objective: 'summary',
  about: 'summary',
  experience: 'experience',
  work: 'experience',
  employment: 'experience',
  career: 'experience',
  education: 'education',
  academics: 'education',
  academic: 'education',
  skills: 'skills',
  skill: 'skills',
  projects: 'projects',
  project: 'projects',
  certifications: 'certifications',
  certificates: 'certifications',
  achievements: 'achievements',
  publications: 'publications',
  awards: 'awards',
  volunteering: 'volunteering',
  volunteer: 'volunteering',
  languages: 'languages',
  interests: 'interests',
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Trailing punctuation must never block a command match ("Continue." → "continue")
    .replace(/[.!?,;:]+$/, '')
}

function stripTrailingNoise(phrase: string): string {
  return phrase
    .replace(/[.!?,]+$/, '')
    .replace(/\s+(?:section|part|portion|block|area)$/, '')
    .replace(/\s+now$/, '')
    .trim()
}

/**
 * Parses a raw chat message into a deterministic navigation command.
 * Returns null when the message is ordinary conversational intent and must
 * be forwarded to the AI provider.
 *
 * Matching is deliberately strict: short imperative commands only. Longer
 * sentences containing extra instructions ("make it more concise") never
 * match, so real editing requests always reach the model.
 */
export function parseNavigationCommand(rawText: string): NavigationCommand | null {
  const text = normalize(rawText).replace(/^(?:hey|ok|okay|please)[,\s]+/, '')

  // ── Advance ────────────────────────────────────────────────
  if (
    /^(?:next|n)$/.test(text) ||
    /^(?:next|following)\s+(?:section|part|portion)$/.test(text) ||
    /^(?:move|go|skip|jump|advance|scroll)\s+(?:on|forward|ahead|along)?\s*(?:to\s+)?(?:the\s+)?next(?:\s+(?:section|part|portion))?$/.test(text) ||
    /^(?:move|go|skip|jump|advance)\s+(?:on|forward|ahead)$/.test(text) ||
    /^(?:continue|continuing|carry\s+on|keep\s+going|proceed)(?:\s+(?:to|with|on)\s+(?:the\s+)?)?(?:next\s*)?(?:section|part|portion)?$/.test(text) ||
    /^continue\s+from\s+where\s+we\s+(?:stopped|left)(?:\s+off)?$/.test(text)
  ) {
    return { kind: 'next' }
  }

  // ── Go back ────────────────────────────────────────────────
  if (
    /^(?:previous|prev|back|b)$/.test(text) ||
    /^(?:previous|last)\s+(?:section|part|portion)$/.test(text) ||
    /^(?:go|step|move)\s+(?:back|backwards?|backward)(?:\s+(?:one|a)?\s*(?:section|step))?$/.test(text)
  ) {
    return { kind: 'previous' }
  }

  // ── Go to a named section ──────────────────────────────────
  const gotoMatch =
    /^(?:go|jump|switch|move|navigate|take\s+me)\s+to\s+(?:the\s+|my\s+)?(.+)$/.exec(text) ||
    /^(?:open|show|select)\s+(?:the\s+|my\s+)?(.+?)(?:\s+section)?$/.exec(text) ||
    /^(?:lets?|let's|let\s+us)\s+(?:work|focus|concentrate)\s+on\s+(?:the\s+|my\s+)?(.+)$/.exec(text) ||
    /^(?:work|focus)\s+on\s+(?:the\s+|my\s+)?(.+)$/.exec(text)

  if (gotoMatch) {
    const target = stripTrailingNoise(gotoMatch[1])
    if (target && !['next', 'previous', 'it', 'this', 'that'].includes(target)) {
      return { kind: 'goto', target }
    }
  }

  return null
}

/**
 * Resolves a navigation command against the document's REAL section model.
 * Only visible sections participate, ordered by `order` (same ordering the
 * canvas renderer uses). Reaching past the ends resolves gracefully instead
 * of looping.
 */
export function resolveNavigation(
  sections: DocumentSectionConfig[],
  currentSectionId: string | null,
  command: NavigationCommand
): NavigationResolution {
  const navigable = [...sections]
    .filter(s => s.visible)
    .sort((a, b) => a.order - b.order)

  if (navigable.length === 0) {
    return { ok: false, reason: 'no-sections', command }
  }

  const currentIndex = currentSectionId
    ? navigable.findIndex(s => s.id === currentSectionId)
    : -1

  if (command.kind === 'next') {
    // No active selection yet → start at the first section.
    if (currentIndex >= navigable.length - 1) {
      return { ok: false, reason: 'already-last', command }
    }
    const target = navigable[currentIndex + 1] ?? navigable[0]
    return {
      ok: true,
      sectionId: target.id,
      sectionTitle: target.title,
      index: currentIndex + 1,
      total: navigable.length,
      direction: 'next',
    }
  }

  if (command.kind === 'previous') {
    if (currentIndex <= 0) {
      return { ok: false, reason: 'already-first', command }
    }
    const target = navigable[currentIndex - 1]
    return {
      ok: true,
      sectionId: target.id,
      sectionTitle: target.title,
      index: currentIndex - 1,
      total: navigable.length,
      direction: 'previous',
    }
  }

  // ── goto ───────────────────────────────────────────────────
  const targetKey = normalize(command.target)
  const aliasType = SECTION_TYPE_ALIASES[targetKey]

  const match =
    // Exact type match (via alias or literal type name)
    (aliasType ? navigable.find(s => s.type === aliasType) : undefined) ??
    navigable.find(s => s.type === targetKey) ??
    // Exact display-title match
    navigable.find(s => normalize(s.title) === targetKey) ??
    // Display title contains the target phrase
    navigable.find(s => normalize(s.title).includes(targetKey))

  if (!match) {
    return { ok: false, reason: 'unknown-target', command }
  }

  return {
    ok: true,
    sectionId: match.id,
    sectionTitle: match.title,
    index: navigable.findIndex(s => s.id === match!.id),
    total: navigable.length,
    direction: 'goto',
  }
}