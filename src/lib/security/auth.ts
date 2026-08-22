/**
 * ENVOY Server-Side API Auth Guard
 *
 * Protects API route handlers from anonymous access.
 *
 * Policy:
 *  - Cloud mode (Supabase configured): a valid Supabase session is REQUIRED.
 *  - Fully offline demo mode (no Supabase AND no AI provider keys configured):
 *    anonymous access is permitted so the offline demo keeps working.
 *    In this state every AI route serves deterministic mock output and no
 *    secrets are at risk.
 *  - Misconfiguration (AI keys present but Supabase missing): access is
 *    REFUSED. Paid AI endpoints must never be reachable anonymously, even in
 *    a partially configured environment.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface AuthContext {
  userId: string
  email: string
}

const DEMO_USER_ID = 'demo-user-id-1234'
const DEMO_USER_EMAIL = 'demo@envoy.app'

function hasSupabaseConfig(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function hasAIProviderConfig(): boolean {
  return (
    !!process.env.OPENAI_API_KEY ||
    !!process.env.ANTHROPIC_API_KEY ||
    !!process.env.GOOGLE_AI_API_KEY ||
    !!process.env.GEMINI_API_KEY ||
    !!process.env.OPENROUTER_API_KEY
  )
}

/**
 * True when the deployment is a fully offline demo:
 * no Supabase project and no AI provider keys are configured.
 */
export function isOfflineDemoMode(): boolean {
  return !hasSupabaseConfig() && !hasAIProviderConfig()
}

/**
 * Resolves the authenticated caller for an API route.
 *
 * Returns an AuthContext when the request may proceed, or null when the
 * caller must be rejected with 401. Never throws.
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  // Fully offline demo: nothing to protect, keep the demo usable.
  if (isOfflineDemoMode()) {
    return { userId: DEMO_USER_ID, email: DEMO_USER_EMAIL }
  }

  // AI keys exist but no auth backend: refuse anonymous access to paid APIs.
  if (!hasSupabaseConfig()) {
    return null
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null
    return {
      userId: data.user.id,
      email: data.user.email ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Standard 401 response for protected routes.
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Authentication required. Please sign in to continue.' },
    { status: 401 }
  )
}