'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { authService } from '@/lib/auth'
import { Mail, Lock, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
          const redirectTo = searchParams.get('redirectTo') || '/dashboard'
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
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.08)] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(0,212,255,0.08)] to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0c0c10]/60 backdrop-blur-md border border-[#1e1e2e] rounded-xl p-8 shadow-2xl relative z-10 hover:border-[#252535] transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <Logo iconSize={42} showText={true} textSize="lg" className="mb-2" />
        </div>

        <h2 className="text-xl font-bold text-center mb-6">Welcome Back</h2>

        {error && (
          <div role="alert" className="mb-6 p-4 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-sm text-[#ef4444] flex items-start gap-3">
            <ShieldAlert size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div role="status" className="mb-6 p-4 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 text-sm text-[#10b981] flex items-start gap-3">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-[#5c5c7a]" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="login-password" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider">
                Password
              </label>
              <Link href="/reset" className="text-xs text-[#6366f1] hover:underline">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-[#5c5c7a]" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366f1] to-[#00d4ff] text-[#050507] py-2.5 rounded-md font-bold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Signing In...' : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#9898b3]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#6366f1] hover:underline font-semibold">
            Create one
          </Link>
        </div>
      </div>
    </div>
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
