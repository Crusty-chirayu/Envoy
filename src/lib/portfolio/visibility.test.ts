/**
 * Tests for portfolio privacy semantics (audit finding S7).
 *
 * Contract under test:
 *  1. Newly created portfolios default to PRIVATE — never public merely by
 *     being created.
 *  2. Publishing is an explicit user action: the first save with a
 *     non-private visibility stamps `publishedAt`.
 *  3. An unpublished (private) portfolio can never be publicly rendered on
 *     `/p/[slug]` (the exact predicate the page gate uses).
 *  4. A published portfolio remains publicly accessible (public AND unlisted).
 *  5. Demo/offline mode round-trips visibility + publish state correctly
 *     through localStorage, with the page-level gate as the enforcement point.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PORTFOLIO_VISIBILITY,
  isPortfolioPubliclyViewable,
  resolvePublishedAt,
} from './visibility'
import { dbPortfolios } from '@/lib/db'
import type { PortfolioSite } from '@/types'

// ─────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────

function makeSite(overrides?: Partial<PortfolioSite>): PortfolioSite {
  return {
    id: 'site-1',
    userId: 'user-1',
    profileId: 'profile-1',
    slug: 'jane-doe',
    title: "Jane Doe's Portfolio",
    theme: 'minimal',
    accentColor: '#6366f1',
    visibility: DEFAULT_PORTFOLIO_VISIBILITY,
    sections: [],
    createdAt: '2026-08-22T00:00:00.000Z',
    updatedAt: '2026-08-22T00:00:00.000Z',
    ...overrides,
  }
}

// ─────────────────────────────────────────
// 1. Creation default
// ─────────────────────────────────────────

describe('DEFAULT_PORTFOLIO_VISIBILITY — creation default (S7)', () => {
  it('new portfolios are created PRIVATE, never public', () => {
    expect(DEFAULT_PORTFOLIO_VISIBILITY).toBe('private')
  })

  it('the default is not publicly viewable', () => {
    expect(isPortfolioPubliclyViewable(DEFAULT_PORTFOLIO_VISIBILITY)).toBe(false)
  })
})

// ─────────────────────────────────────────
// 3 & 4. Public render gate (/p/[slug])
// ─────────────────────────────────────────

describe('isPortfolioPubliclyViewable — /p/[slug] render gate (S7)', () => {
  it('an unpublished (private) portfolio cannot be publicly rendered', () => {
    expect(isPortfolioPubliclyViewable('private')).toBe(false)
  })

  it('a published PUBLIC portfolio remains publicly accessible', () => {
    expect(isPortfolioPubliclyViewable('public')).toBe(true)
  })

  it('a published UNLISTED portfolio remains accessible via its direct link', () => {
    expect(isPortfolioPubliclyViewable('unlisted')).toBe(true)
  })
})

// ─────────────────────────────────────────
// 2. Explicit publish stamping
// ─────────────────────────────────────────

describe('resolvePublishedAt — explicit publish action (S7)', () => {
  const t0 = new Date('2026-08-22T10:00:00.000Z')
  const later = new Date('2026-08-22T12:00:00.000Z')

  it('creating a private portfolio never fabricates a publication timestamp', () => {
    expect(resolvePublishedAt({ visibility: 'private', now: t0 })).toBeUndefined()
  })

  it('the first explicit publish (public) stamps publishedAt', () => {
    expect(resolvePublishedAt({ visibility: 'public', now: t0 })).toBe(t0.toISOString())
  })

  it('the first explicit publish (unlisted) stamps publishedAt', () => {
    expect(resolvePublishedAt({ visibility: 'unlisted', now: t0 })).toBe(t0.toISOString())
  })

  it('editing an already-published site keeps its ORIGINAL publication timestamp', () => {
    const original = t0.toISOString()
    expect(
      resolvePublishedAt({ visibility: 'public', currentPublishedAt: original, now: later })
    ).toBe(original)
  })

  it('switching back to private keeps the historical timestamp but stops public rendering', () => {
    const original = t0.toISOString()
    expect(
      resolvePublishedAt({ visibility: 'private', currentPublishedAt: original, now: later })
    ).toBe(original)
    expect(isPortfolioPubliclyViewable('private')).toBe(false)
  })

  it('treats a blank stored timestamp as unpublished and stamps on publish', () => {
    expect(resolvePublishedAt({ visibility: 'public', currentPublishedAt: '', now: t0 })).toBe(
      t0.toISOString()
    )
  })
})

// ─────────────────────────────────────────
// 5. Demo/offline persistence behavior
// ─────────────────────────────────────────

/**
 * Minimal in-memory Storage double satisfying the DOM Storage interface.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>()
  const storage: Storage = {
    get length(): number {
      return entries.size
    },
    clear(): void {
      entries.clear()
    },
    getItem(key: string): string | null {
      const value = entries.get(key)
      return value === undefined ? null : value
    },
    key(index: number): string | null {
      return Array.from(entries.keys())[index] ?? null
    },
    removeItem(key: string): void {
      entries.delete(key)
    },
    setItem(key: string, value: string): void {
      entries.set(key, value)
    },
  }
  return storage
}

describe('dbPortfolios — demo/offline behavior preserves the S7 contract (S7)', () => {
  let storage: Storage
  let hadWindow = false
  let hadLocalStorage = false
  let originalWindow: unknown
  let originalLocalStorage: unknown

  beforeEach(() => {
    hadWindow = 'window' in globalThis
    hadLocalStorage = 'localStorage' in globalThis
    originalWindow = Reflect.get(globalThis, 'window')
    originalLocalStorage = Reflect.get(globalThis, 'localStorage')

    storage = createMemoryStorage()
    // Simulate a browser-like offline environment so db.ts dispatches to the
    // localStorage demo path (no Supabase env vars are set under vitest).
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    if (hadWindow) {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }
    if (hadLocalStorage) {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      })
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  function storedRecord(userId: string): PortfolioSite {
    const raw = storage.getItem(`envoy:portfolio:${userId}`)
    expect(raw).not.toBeNull()
    return JSON.parse(raw ?? '') as PortfolioSite
  }

  it('saving a newly created portfolio persists it PRIVATE with no publishedAt', async () => {
    await dbPortfolios.save(makeSite())

    const record = storedRecord('user-1')
    expect(record.visibility).toBe('private')
    expect(record.publishedAt).toBeUndefined()
  })

  it('getByUserId returns the newly created private portfolio unchanged', async () => {
    const site = makeSite()
    await dbPortfolios.save(site)

    const loaded = await dbPortfolios.getByUserId('user-1')
    expect(loaded).not.toBeNull()
    expect(loaded?.visibility).toBe('private')
    expect(loaded?.publishedAt).toBeUndefined()
    expect(loaded?.slug).toBe(site.slug)
  })

  it('getBySlug still resolves a private site locally; the page gate blocks rendering', async () => {
    await dbPortfolios.save(makeSite())

    // In demo mode there is no RLS layer, so the record IS retrievable by slug;
    // enforcement happens at the /p/[slug] render gate (isPortfolioPubliclyViewable).
    const loaded = await dbPortfolios.getBySlug('jane-doe')
    expect(loaded?.visibility).toBe('private')
    expect(isPortfolioPubliclyViewable(loaded?.visibility ?? 'private')).toBe(false)
  })

  it('an explicit publish save persists BOTH the non-private visibility AND publishedAt', async () => {
    const published = makeSite({
      visibility: 'public',
      publishedAt: resolvePublishedAt({
        visibility: 'public',
        now: new Date('2026-08-22T10:00:00.000Z'),
      }),
    })
    await dbPortfolios.save(published)

    const record = storedRecord('user-1')
    expect(record.visibility).toBe('public')
    expect(record.publishedAt).toBe('2026-08-22T10:00:00.000Z')

    // A published site remains publicly resolvable and viewable.
    const loaded = await dbPortfolios.getBySlug('jane-doe')
    expect(loaded?.visibility).toBe('public')
    expect(isPortfolioPubliclyViewable(loaded?.visibility ?? 'private')).toBe(true)
  })

  it('unlisted publishing also persists as explicitly published and viewable', async () => {
    const unlisted = makeSite({
      visibility: 'unlisted',
      publishedAt: resolvePublishedAt({
        visibility: 'unlisted',
        now: new Date('2026-08-22T11:00:00.000Z'),
      }),
    })
    await dbPortfolios.save(unlisted)

    const loaded = await dbPortfolios.getBySlug('jane-doe')
    expect(loaded?.visibility).toBe('unlisted')
    expect(loaded?.publishedAt).toBe('2026-08-22T11:00:00.000Z')
    expect(isPortfolioPubliclyViewable(loaded?.visibility ?? 'private')).toBe(true)
  })
})