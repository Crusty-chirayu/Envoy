'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { authService } from '@/lib/auth'
import { Mail, Lock, ArrowRight, ShieldAlert, CheckCircle, KeyRound } from 'lucide-react'

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
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.08)] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(0,212,255,0.08)] to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0c0c10]/60 backdrop-blur-md border border-[#1e1e2e] rounded-xl p-8 shadow-2xl relative z-10 hover:border-[#252535] transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <Logo iconSize={42} showText={true} textSize="lg" className="mb-2" />
        </div>

        <h2 className="text-xl font-bold text-center mb-2">
          {isRecovery ? 'Set a New Password' : 'Reset Your Password'}
        </h2>
        <p className="text-xs text-[#9898b3] text-center mb-6">
          {isRecovery
            ? 'Choose a new password for your account.'
            : 'Enter your account email and we will send you a reset link.'}
        </p>

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
          {!isRecovery && (
            <div>
              <label htmlFor="reset-email" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-[#5c5c7a]" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] transition-colors"
                />
              </div>
            </div>
          )}

          {isRecovery && (
            <>
              <div>
                <label htmlFor="reset-password" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-[#5c5c7a]" />
                  <input
                    id="reset-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-xs font-semibold text-[#9898b3] uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-5 w-5 text-[#5c5c7a]" />
                  <input
                    id="reset-confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="w-full bg-[#111118]/80 border border-[#252535] rounded-md py-2.5 pl-10 pr-4 text-sm text-[#f2f2f7] placeholder-[#5c5c7a] focus:outline-none focus:border-[#6366f1] transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366f1] to-[#00d4ff] text-[#050507] py-2.5 rounded-md font-bold text-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? isRecovery
                ? 'Updating...'
                : 'Sending...'
              : isRecovery
              ? 'Update Password'
              : 'Send Reset Link'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-[#9898b3]">
          Remembered it?{' '}
          <Link href="/login" className="text-[#6366f1] hover:underline font-semibold">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
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