import React from 'react'
import { Logo } from '@/components/Logo'
import { ShieldAlert, CheckCircle } from 'lucide-react'

interface AuthShellProps {
  /** Card heading, e.g. "Welcome Back" */
  title: string
  /** Optional supporting line under the heading */
  subtitle?: string
  /** Error banner text (role="alert") */
  error?: string | null
  /** Success banner text (role="status") */
  success?: string | null
  /** Form fields + submit button */
  children: React.ReactNode
  /** Footer row under the form (switch-screen links etc.) */
  footer?: React.ReactNode
}

/**
 * Shared chrome for the authentication surfaces (/login, /signup, /reset).
 * One implementation of the ambient background, elevated card, brand mark,
 * and status banners keeps the three screens pixel-consistent.
 */
export function AuthShell({ title, subtitle, error, success, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[#050507] text-[#f2f2f7] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Restrained ambient glows */}
      <div className="absolute top-[-25%] left-[-12%] w-[55%] h-[55%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.07)] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-12%] w-[55%] h-[55%] rounded-full bg-gradient-radial from-[rgba(0,212,255,0.06)] to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md surface-card accent-hairline rounded-2xl p-8 relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-7">
          <Logo iconSize={40} showText={true} textSize="lg" className="mb-1" />
        </div>

        <h1 className="text-xl font-bold text-center mb-1 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#9898b3] text-center mb-6">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-6" />}

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-sm text-[#ef4444] flex items-start gap-2.5 animate-fade-in"
          >
            <ShieldAlert size={17} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-sm text-emerald-400 flex items-start gap-2.5 animate-fade-in"
          >
            <CheckCircle size={17} className="shrink-0 mt-0.5" aria-hidden="true" />
            <span>{success}</span>
          </div>
        )}

        {children}

        {footer && <div className="mt-7 text-center text-sm text-[#9898b3]">{footer}</div>}
      </div>
    </div>
  )
}