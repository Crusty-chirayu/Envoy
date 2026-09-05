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
 * Shared chrome for authentication surfaces (/login, /signup, /reset)
 * styled with the Red Noir Superdesign aesthetic.
 */
export function AuthShell({ title, subtitle, error, success, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-black text-[#f2f2f7] flex items-center justify-center p-6 relative overflow-hidden selection-red font-sans">
      {/* Red Noir Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0505] via-[#080203] to-black" />
        <div className="absolute top-0 left-0 w-[1px] h-[1px] bg-transparent stars-1 animate-[animStar_50s_linear_infinite]" />
        <div className="absolute top-0 left-0 w-[2px] h-[2px] bg-transparent stars-2 animate-[animStar_80s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]" />
      </div>

      <div className="w-full max-w-md bg-black/80 border border-white/10 hover:border-[#ef233c]/40 transition-colors rounded-2xl p-8 relative z-10 animate-fade-in shadow-[0_0_40px_rgba(239,35,60,0.1)] backdrop-blur-xl">
        <div className="flex flex-col items-center mb-6">
          <Logo iconSize={40} showText={true} textSize="lg" className="mb-1" />
        </div>

        <h1 className="text-2xl font-bold font-manrope text-center mb-1 tracking-tight text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-6" />}

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-[#ef233c]/10 border border-[#ef233c]/30 text-xs text-red-200 flex items-start gap-2.5 animate-fade-in"
          >
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-[#ef233c]" aria-hidden="true" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5 animate-fade-in"
          >
            <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" aria-hidden="true" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {children}

        {footer && <div className="mt-7 text-center text-xs text-zinc-400">{footer}</div>}
      </div>
    </div>
  )
}