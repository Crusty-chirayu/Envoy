'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { authService } from '@/lib/auth'
import { sanitizeRedirectPath } from '@/lib/security/redirect'
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'auth-callback-failed') {
      setError('OAuth callback failed. Please try again.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const { user, error: authError } = await authService.signIn(email, password)
      if (authError) {
        setError(authError)
      } else if (user) {
        setSuccess('Successfully signed in!')
        // Small delay for success animation
        setTimeout(() => {
          // S6 (audit): sanitize the client-side redirect target with the same
          // rule as /api/auth/callback to prevent open-redirect abuse.
          const redirectTo = sanitizeRedirectPath(searchParams.get('redirectTo'))
          router.push(redirectTo)
          router.refresh()
        }, 800)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to your professional identity workspace."
      error={error}
      success={success}
      footer={
        <>
          {"Don't have an account?"}{' '}
          <Link href="/signup" className="text-[#6366f1] hover:text-[#00d4ff] hover:underline font-semibold transition-colors">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="field-label">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="login-password" className="field-label !mb-0">
              Password
            </label>
            <Link href="/reset" className="text-xs text-[#6366f1] hover:text-[#00d4ff] hover:underline transition-colors">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full py-2.5 pl-10 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#5c5c7a] hover:text-[#f2f2f7] transition-colors"
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
          {loading ? (
            <>
              <Loader size={15} className="animate-spin" aria-hidden="true" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} className="arrow-shift" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-[#9898b3]">Loading authentication form...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}