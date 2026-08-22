'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthShell } from '@/components/AuthShell'
import { authService } from '@/lib/auth'
import { Mail, Lock, ArrowRight, Eye, EyeOff, KeyRound, Loader } from 'lucide-react'

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
          <Link href="/login" className="text-[#6366f1] hover:text-[#00d4ff] hover:underline font-semibold transition-colors">
            Back to Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isRecovery && (
          <div>
            <label htmlFor="reset-email" className="field-label">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
              <input
                id="reset-email"
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
        )}

        {isRecovery && (
          <>
            <div>
              <label htmlFor="reset-password" className="field-label">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
                <input
                  id="reset-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
            <div>
              <label htmlFor="reset-confirm" className="field-label">
                Confirm New Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-[#5c5c7a] pointer-events-none" aria-hidden="true" />
                <input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
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
    </AuthShell>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center">
        <p className="text-sm text-[#9898b3]">Loading reset form...</p>
      </div>
    }>
      <ResetForm />
    </Suspense>
  )
}