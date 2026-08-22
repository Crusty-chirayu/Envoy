'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { authService } from '@/lib/auth'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setLoading(false)
      return
    }

    try {
      const { user, error: authError } = await authService.signUp(email, password, name)
      if (authError) {
        setError(authError)
      } else if (user) {
        setSuccess('Registration successful! Setting up your workspace...')
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="One canonical profile. Every document and portfolio derives from it."
      error={error}
      success={success}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-[#6366f1] hover:text-[#00d4ff] hover:underline font-semibold transition-colors">
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="signup-name" className="field-label">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className="field-label">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
            <input
              id="signup-email"
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
          <label htmlFor="signup-password" className="field-label">
            Password (min 8 chars)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
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
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Get Started</span>
              <ArrowRight size={16} className="arrow-shift" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}