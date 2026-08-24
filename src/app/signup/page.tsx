'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { authService } from '@/lib/auth'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader, Check } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Derived, real-data strength read-out — purely reflects the password
  // already held in state. No new validation rules; signup still only
  // enforces the existing 8-character minimum below.
  const passwordChecks = useMemo(
    () => [
      { label: '8+ characters', met: password.length >= 8 },
      { label: 'A number', met: /\d/.test(password) },
      { label: 'Upper & lowercase', met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    ],
    [password]
  )
  const metCount = passwordChecks.filter((c) => c.met).length
  const strengthLabel = password.length === 0 ? '' : ['Weak', 'Weak', 'Good', 'Strong'][metCount]
  const strengthColor = ['#5c5c7a', '#f87171', '#00d4ff', '#34d399'][metCount] ?? '#5c5c7a'

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
          <Link
            href="/login"
            className="text-[#6366f1] hover:text-[#00d4ff] hover:underline font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff] rounded-sm"
          >
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 envoy-form-enter">
        <div className="envoy-field-enter" style={{ animationDelay: '40ms' }}>
          <label htmlFor="signup-name" className="field-label">
            Full Name
          </label>
          <div className="relative group">
            <User
              className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
              aria-hidden="true"
            />
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full py-2.5 pl-10 pr-4 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/60"
            />
          </div>
        </div>

        <div className="envoy-field-enter" style={{ animationDelay: '100ms' }}>
          <label htmlFor="signup-email" className="field-label">
            Email Address
          </label>
          <div className="relative group">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
              aria-hidden="true"
            />
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full py-2.5 pl-10 pr-4 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/60"
            />
          </div>
        </div>

        <div className="envoy-field-enter" style={{ animationDelay: '160ms' }}>
          <label htmlFor="signup-password" className="field-label">
            Password (min 8 chars)
          </label>
          <div className="relative group">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
              aria-hidden="true"
            />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-describedby="signup-password-hints"
              className="w-full py-2.5 pl-10 pr-11 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-[#5c5c7a] hover:text-[#f2f2f7] hover:bg-[#16161f] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
            >
              {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>

          {/* Live strength read-out — reflects actual password state, enforces nothing new */}
          <div
            id="signup-password-hints"
            className={`mt-2.5 overflow-hidden transition-all duration-300 ease-out ${
              password.length > 0 ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
            }`}
            aria-live="polite"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1 rounded-full bg-[#1e1e2e] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${(metCount / passwordChecks.length) * 100}%`,
                    backgroundColor: strengthColor,
                  }}
                />
              </div>
              <span className="text-[11px] font-mono tracking-wide" style={{ color: strengthColor }}>
                {strengthLabel}
              </span>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {passwordChecks.map((check) => (
                <li
                  key={check.label}
                  className={`flex items-center gap-1 text-[11px] transition-colors duration-200 ${
                    check.met ? 'text-[#9898b3]' : 'text-[#5c5c7a]'
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-3 h-3 rounded-full border transition-all duration-200 ${
                      check.met ? 'bg-[#00d4ff]/15 border-[#00d4ff]/50' : 'border-[#252535]'
                    }`}
                  >
                    {check.met && <Check size={8} className="text-[#00d4ff]" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full mt-1 envoy-btn-lift envoy-field-enter disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
          style={{ animationDelay: '220ms' }}
        >
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

      <style jsx global>{`
        @keyframes envoyFormFieldEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .envoy-field-enter {
          opacity: 0;
          animation: envoyFormFieldEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .envoy-btn-lift {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
        }
        .envoy-btn-lift:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .envoy-btn-lift:active:not(:disabled) {
          transform: translateY(0px) scale(0.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .envoy-field-enter {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .envoy-btn-lift:hover:not(:disabled),
          .envoy-btn-lift:active:not(:disabled) {
            transform: none !important;
          }
        }
      `}</style>
    </AuthShell>
  )
}