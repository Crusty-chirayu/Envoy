'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { authService } from '@/lib/auth'
import { Mail, Lock, ArrowRight, Eye, EyeOff, KeyRound, Loader, Check, X } from 'lucide-react'

/**
 * Password reset (audit finding U2).
 * With ?code= the user is in the Supabase recovery-link flow and sets a new
 * password; otherwise this requests a reset email.
 */
function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const recoveryCode = searchParams.get('code')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const isRecovery = Boolean(recoveryCode)

  // Real-data read-out only — derived from state already tracked below.
  // Submit-time validation (length, match) is unchanged in handleSubmit.
  const passwordsTyped = password.length > 0 && confirmPassword.length > 0
  const passwordsMatch = password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!isRecovery) {
      if (!email.trim()) {
        setError('Please enter your email address.')
        return
      }
      setLoading(true)
      const { error: resetError } = await authService.resetPassword(email)
      setLoading(false)
      if (resetError) {
        setError(resetError)
        return
      }
      setSuccess('If an account exists with that email, a reset link has been sent.')
      return
    }

    // Recovery flow: validate + set a new password.
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: updateError } = await authService.updatePassword(password)
    setLoading(false)
    if (updateError) {
      setError(updateError)
      return
    }
    setSuccess('Your password has been updated. You can now sign in.')
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <AuthShell
      title={isRecovery ? 'Set a New Password' : 'Reset Your Password'}
      subtitle={
        isRecovery
          ? 'Choose a new password for your account.'
          : 'Enter your account email and we will send you a reset link.'
      }
      error={error}
      success={success}
      footer={
        <>
          Remembered it?{' '}
          <Link
            href="/login"
            className="text-[#6366f1] hover:text-[#00d4ff] hover:underline font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff] rounded-sm"
          >
            Back to Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 envoy-form-enter">
        {!isRecovery && (
          <div className="envoy-field-enter" style={{ animationDelay: '40ms' }}>
            <label htmlFor="reset-email" className="field-label">
              Email Address
            </label>
            <div className="relative group">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
                aria-hidden="true"
              />
              <input
                id="reset-email"
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
        )}

        {isRecovery && (
          <>
            <div className="envoy-field-enter" style={{ animationDelay: '40ms' }}>
              <label htmlFor="reset-password" className="field-label">
                New Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
                  aria-hidden="true"
                />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
            </div>

            <div className="envoy-field-enter" style={{ animationDelay: '100ms' }}>
              <label htmlFor="reset-confirm" className="field-label">
                Confirm New Password
              </label>
              <div className="relative group">
                <KeyRound
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none transition-colors duration-200 group-focus-within:text-[#00d4ff]"
                  aria-hidden="true"
                />
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  aria-describedby="reset-confirm-hint"
                  className={`w-full py-2.5 pl-10 pr-11 text-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                    passwordsTyped && !passwordsMatch
                      ? 'focus:ring-[#f87171]/30 focus:border-[#f87171]/60'
                      : 'focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/60'
                  }`}
                />
                <span
                  className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                    passwordsTyped ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                  aria-hidden="true"
                >
                  {passwordsMatch ? (
                    <Check size={16} className="text-[#34d399]" strokeWidth={2.5} />
                  ) : (
                    <X size={16} className="text-[#f87171]" strokeWidth={2.5} />
                  )}
                </span>
              </div>
              <p
                id="reset-confirm-hint"
                className={`mt-1.5 text-[11px] transition-all duration-200 overflow-hidden ${
                  passwordsTyped && !passwordsMatch ? 'max-h-5 opacity-100 text-[#f87171]' : 'max-h-0 opacity-0'
                }`}
                aria-live="polite"
              >
                Passwords don&apos;t match yet
              </p>
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full mt-1 envoy-btn-lift envoy-field-enter disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
          style={{ animationDelay: '160ms' }}
        >
          {loading ? (
            <>
              <Loader size={15} className="animate-spin" aria-hidden="true" />
              <span>{isRecovery ? 'Updating...' : 'Sending...'}</span>
            </>
          ) : (
            <>
              <span>{isRecovery ? 'Update Password' : 'Send Reset Link'}</span>
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

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-sm text-[#9898b3]">
            <Loader size={15} className="animate-spin text-[#00d4ff]" aria-hidden="true" />
            <span>Loading reset form...</span>
          </div>
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  )
}