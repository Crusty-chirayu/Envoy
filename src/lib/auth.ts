/**
 * ENVOY Unified Authentication Layer
 *
 * Handles sign-in, sign-up, sign-out, session restoration, and state tracking.
 * Dispatches transparently between:
 *  - Connected/Cloud Mode (Supabase Auth)
 *  - Demo/Local Mode (Simulated localStorage Session)
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { checkDemoMode } from '@/lib/db'
import type { AppUser } from '@/types'

const DEMO_USER_KEY = 'envoy:demo_user'

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(email: string, password: string, name: string): Promise<{ user: AppUser | null; error: string | null }> {
    if (checkDemoMode()) {
      const user: AppUser = {
        id: 'demo-user-id-1234',
        email,
        name,
        avatarUrl: undefined,
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
      }
      return { user, error: null }
    }

    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) return { user: null, error: error.message }
    if (!data.user) return { user: null, error: 'Registration failed' }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || '',
      },
      error: null,
    }
  },

  /**
   * Sign in an existing user
   */
  async signIn(email: string, password: string): Promise<{ user: AppUser | null; error: string | null }> {
    if (checkDemoMode()) {
      // In demo mode, accept any password and restore/simulate user profile
      const user: AppUser = {
        id: 'demo-user-id-1234',
        email,
        name: email.split('@')[0] || 'Demo User',
        avatarUrl: undefined,
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user))
      }
      return { user, error: null }
    }

    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) return { user: null, error: error.message }
    if (!data.user) return { user: null, error: 'Sign in failed' }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || '',
      },
      error: null,
    }
  },

  /**
   * Request a password reset email (audit finding U2).
   * In demo mode this simulates success; in cloud mode it calls Supabase.
   */
  async resetPassword(email: string): Promise<{ error: string | null }> {
    if (checkDemoMode()) {
      // Demo mode has no real password; report success so the flow works.
      return { error: null }
    }

    const supabase = createBrowserClient()
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/reset?code=`
      : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) return { error: error.message }
    return { error: null }
  },

  /**
   * Update the current user's password (recovery-link flow, audit U2).
   * In demo mode this simulates success; in cloud mode it calls Supabase.
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    if (checkDemoMode()) {
      return { error: null }
    }

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { error: error.message }
    return { error: null }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    if (checkDemoMode()) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DEMO_USER_KEY)
      }
      return
    }

    const supabase = createBrowserClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Auth Service] SignOut failed:', error)
      throw error
    }
  },

  /**
   * Get the current active user session
   */
  async getUser(): Promise<AppUser | null> {
    if (checkDemoMode()) {
      if (typeof window === 'undefined') return null
      const raw = localStorage.getItem(DEMO_USER_KEY)
      return raw ? (JSON.parse(raw) as AppUser) : null
    }

    const supabase = createBrowserClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) return null

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || '',
      avatarUrl: user.user_metadata?.avatar_url || undefined,
    }
  },

  /**
   * Subscribe to auth changes
   */
  onAuthStateChange(callback: (user: AppUser | null) => void): () => void {
    if (checkDemoMode()) {
      // Return a simulated poll-based subscription or instant callback
      let lastUserJson = typeof window !== 'undefined' ? localStorage.getItem(DEMO_USER_KEY) : null
      
      const interval = setInterval(() => {
        if (typeof window === 'undefined') return
        const currentUserJson = localStorage.getItem(DEMO_USER_KEY)
        if (currentUserJson !== lastUserJson) {
          lastUserJson = currentUserJson
          callback(currentUserJson ? (JSON.parse(currentUserJson) as AppUser) : null)
        }
      }, 1000)

      // Trigger initial callback
      callback(lastUserJson ? (JSON.parse(lastUserJson) as AppUser) : null)

      return () => clearInterval(interval)
    }

    const supabase = createBrowserClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !session.user) {
        callback(null)
      } else {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || '',
          avatarUrl: session.user.user_metadata?.avatar_url || undefined,
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  },
}
