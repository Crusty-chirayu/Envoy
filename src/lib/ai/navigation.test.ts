/**
 * Unit tests for deterministic AI section navigation.
 * Pins the command-parsing contract and resolution against the real
 * DocumentSectionConfig model (visible-only, order-sorted, graceful ends).
 */

import { describe, it, expect } from 'vitest'
import {
  parseNavigationCommand,
  resolveNavigation,
} from './navigation'
import type { DocumentSectionConfig } from '@/types'

function section(
  id: string,
  type: DocumentSectionConfig['type'],
  title: string,
  order: number,
  visible = true
): DocumentSectionConfig {
  return { id, type, title, visible, order }
}

const sections: DocumentSectionConfig[] = [
  section('s1', 'summary', 'Summary', 0),
  section('s2', 'experience', 'Experience', 1),
  section('s3', 'education', 'Education', 2),
  section('s4', 'skills', 'Skills', 3),
  section('s5', 'projects', 'Projects', 4),
]

describe('parseNavigationCommand — advance commands', () => {
  const nextCommands = [
    'next',
    'Next',
    'n',
    'next section',
    'move to the next section',
    'Move to the next portion',
    'go to next',
    'skip to the next section',
    'continue',
    'Continue.',
    'carry on',
    'keep going',
    'proceed',
    'continue from where we stopped',
    'continue from where we left off',
    'move on',
  ]

  it.each(nextCommands)('parses %j as next', input => {
    expect(parseNavigationCommand(input)).toEqual({ kind: 'next' })
  })
})

describe('parseNavigationCommand — previous commands', () => {
  const prevCommands = ['previous', 'prev', 'back', 'previous section', 'go back', 'step back']

  it.each(prevCommands)('parses %j as previous', input => {
    expect(parseNavigationCommand(input)).toEqual({ kind: 'previous' })
  })
})

describe('parseNavigationCommand — goto commands', () => {
  it('parses "go to education"', () => {
    expect(parseNavigationCommand('go to education')).toEqual({
      kind: 'goto',
      target: 'education',
    })
  })

  it('parses work-on-experience phrasing with alias target', () => {
    expect(parseNavigationCommand("Let's work on experience now")).toEqual({
      kind: 'goto',
      target: 'experience',
    })
  })

  it('parses "switch to my work experience section"', () => {
    expect(parseNavigationCommand('switch to my work experience section')).toEqual({
      kind: 'goto',
      target: 'work experience',
    })
  })

  it('parses "take me to projects"', () => {
    expect(parseNavigationCommand('Take me to projects.')).toEqual({
      kind: 'goto',
      target: 'projects',
    })
  })

  it('strips trailing "section"/"now" noise from targets', () => {
    expect(parseNavigationCommand('go to the education section')).toEqual({
      kind: 'goto',
      target: 'education',
    })
    expect(parseNavigationCommand("let's focus on skills now")).toEqual({
      kind: 'goto',
      target: 'skills',
    })
  })
})

describe('parseNavigationCommand — non-navigation chat must pass through', () => {
  const chatMessages = [
    'Improve my professional summary.',
    'Make it more concise and technical.',
    'Improve this section for a software engineering role.',
    'Rewrite my summary to target a backend role',
    'What do you think about adding metrics?',
    'continue improving the bullets with quantified impact', // extra instruction → NOT nav
    '',
  ]

  it.each(chatMessages)('returns null for %j', input => {
    expect(parseNavigationCommand(input)).toBeNull()
  })

  it('does not treat bare pronouns as navigation targets', () => {
    expect(parseNavigationCommand('move to it')).toBeNull()
  })
})

describe('resolveNavigation — next/previous', () => {
  it('advances from first to second section', () => {
    const r = resolveNavigation(sections, 's1', { kind: 'next' })
    expect(r).toMatchObject({ ok: true, sectionId: 's2', index: 1, total: 5 })
  })

  it('starts at the FIRST section when nothing is active yet', () => {
    const r = resolveNavigation(sections, null, { kind: 'next' })
    expect(r).toMatchObject({ ok: true, sectionId: 's1', index: 0 })
  })

  it('resolves gracefully at the last section (no looping)', () => {
    const r = resolveNavigation(sections, 's5', { kind: 'next' })
    expect(r).toEqual({ ok: false, reason: 'already-last', command: { kind: 'next' } })
  })

  it('treats an unknown current id like no selection for "next"', () => {
    const r = resolveNavigation(sections, 'ghost-id', { kind: 'next' })
    expect(r).toMatchObject({ ok: true, sectionId: 's1' })
  })

  it('moves back from second to first section', () => {
    const r = resolveNavigation(sections, 's2', { kind: 'previous' })
    expect(r).toMatchObject({ ok: true, sectionId: 's1', index: 0 })
  })

  it('resolves gracefully at the first section (no looping)', () => {
    const r = resolveNavigation(sections, 's1', { kind: 'previous' })
    expect(r).toEqual({ ok: false, reason: 'already-first', command: { kind: 'previous' } })
  })
})

describe('resolveNavigation — goto', () => {
  it('jumps directly to a section by type alias ("work" → experience)', () => {
    const r = resolveNavigation(sections, 's1', { kind: 'goto', target: 'work' })
    expect(r).toMatchObject({ ok: true, sectionId: 's2', direction: 'goto' })
  })

  it('matches display titles case-insensitively', () => {
    const r = resolveNavigation(sections, 's1', { kind: 'goto', target: 'Education' })
    expect(r).toMatchObject({ ok: true, sectionId: 's3' })
  })

  it('reports unknown targets instead of guessing', () => {
    const r = resolveNavigation(sections, 's1', { kind: 'goto', target: 'hobbies' })
    expect(r).toEqual({
      ok: false,
      reason: 'unknown-target',
      command: { kind: 'goto', target: 'hobbies' },
    })
  })
})

describe('resolveNavigation — visibility and ordering', () => {
  const withHidden = [
    section('a', 'summary', 'Summary', 0, false), // hidden → skipped
    section('b', 'experience', 'Experience', 1),
    section('c', 'education', 'Education', 2),
  ]

  it('skips hidden sections when advancing', () => {
    const r = resolveNavigation(withHidden, null, { kind: 'next' })
    expect(r).toMatchObject({ ok: true, sectionId: 'b', index: 0, total: 2 })
  })

  it('cannot navigate to a hidden section by name', () => {
    const r = resolveNavigation(withHidden, 'b', { kind: 'goto', target: 'summary' })
    expect(r).toEqual({ ok: false, reason: 'unknown-target', command: { kind: 'goto', target: 'summary' } })
  })

  it('follows document order, not array order', () => {
    const shuffled = [
      section('x', 'projects', 'Projects', 2),
      section('y', 'summary', 'Summary', 0),
      section('z', 'skills', 'Skills', 1),
    ]
    const r = resolveNavigation(shuffled, 'y', { kind: 'next' })
    expect(r).toMatchObject({ ok: true, sectionId: 'z' })
  })

  it('handles documents with zero visible sections', () => {
    const empty = [section('h', 'summary', 'Summary', 0, false)]
    const r = resolveNavigation(empty, null, { kind: 'next' })
    expect(r).toEqual({ ok: false, reason: 'no-sections', command: { kind: 'next' } })
  })
})