/**
 * Tests for post-auth redirect target sanitation (audit findings S6 / TS1-5).
 *
 * The same rule guards the server OAuth callback and the client login
 * redirect: only same-origin relative paths survive; everything else falls
 * back to the safe default.
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_AUTH_REDIRECT, sanitizeRedirectPath } from './redirect'

describe('sanitizeRedirectPath — open-redirect protection (S6)', () => {
  it('accepts a normal relative path', () => {
    expect(sanitizeRedirectPath('/editor?id=abc')).toBe('/editor?id=abc')
  })

  it('accepts the root path', () => {
    expect(sanitizeRedirectPath('/')).toBe('/')
  })

  it('falls back when the target is missing or empty', () => {
    expect(sanitizeRedirectPath(null)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath(undefined)).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('rejects absolute URLs to other origins', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('http://evil.com/path')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('rejects protocol-relative URLs ("//host")', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('//evil.com/path')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('rejects backslash-prefixed paths (browser-treated as protocol-relative)', () => {
    expect(sanitizeRedirectPath('\\evil.com')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('/\\evil.com')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('rejects scheme-relative tricks with whitespace padding', () => {
    expect(sanitizeRedirectPath(' /dashboard')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('\t/dashboard')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('rejects control characters inside the path', () => {
    expect(sanitizeRedirectPath('/dashboard\u0000')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('/dash\u001fboard')).toBe(DEFAULT_AUTH_REDIRECT)
    expect(sanitizeRedirectPath('/dash\u007fboard')).toBe(DEFAULT_AUTH_REDIRECT)
  })

  it('supports a custom fallback for non-auth contexts', () => {
    expect(sanitizeRedirectPath('//evil.com', '/home')).toBe('/home')
  })

  it('keeps deep internal paths intact', () => {
    expect(sanitizeRedirectPath('/dashboard?tab=portfolio#settings')).toBe(
      '/dashboard?tab=portfolio#settings'
    )
  })
})