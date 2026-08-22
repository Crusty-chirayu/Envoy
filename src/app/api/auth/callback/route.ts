import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Validates a post-auth redirect target.
 * Only same-origin relative paths are accepted; anything else (absolute URLs,
 * protocol-relative "//host", backslash tricks) falls back to /dashboard to
 * prevent open-redirect abuse of the OAuth flow.
 */
function sanitizeRedirectPath(next: string | null): string {
  if (!next) return '/dashboard'
  if (!next.startsWith('/')) return '/dashboard'
  // Reject protocol-relative ("//host") and backslash-prefixed ("\host") tricks.
  if (next.startsWith('//')) return '/dashboard'
  if (next.charCodeAt(1) === 92) return '/dashboard' // 92 === backslash
  return next
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardTo = new URL(next, origin)
      return NextResponse.redirect(forwardTo)
    }
  }

  // Return the user to an error page or the home page if something fails
  return NextResponse.redirect(new URL('/login?error=auth-callback-failed', origin))
}