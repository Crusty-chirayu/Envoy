import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ArrowRight, Sparkles, BookOpen, Cpu } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050507] text-[#f2f2f7] relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.08)] to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-radial from-[rgba(0,212,255,0.08)] to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="w-full border-b border-[#1e1e2e] bg-[#050507]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Logo iconSize={38} />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9898b3]">
          <a href="#features" className="hover:text-[#f2f2f7] transition-colors">Features</a>
          <a href="#workflow" className="hover:text-[#f2f2f7] transition-colors">How It Thinks</a>
          <a href="#about" className="hover:text-[#f2f2f7] transition-colors">About</a>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-[#9898b3] hover:text-[#f2f2f7] transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-gradient-to-r from-[#6366f1] to-[#00d4ff] text-[#050507] px-4 py-2 rounded-md hover:opacity-90 transition-opacity font-semibold shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-6 py-16 md:py-24 z-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111118] border border-[#252535] text-xs text-[#00d4ff] mb-8 mx-auto">
          <Sparkles size={12} className="animate-pulse" />
          <span>Next-Generation Career Workspace</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
          The Career Story You Deserve, Written by an{' '}
          <span className="bg-gradient-to-r from-[#00d4ff] via-[#6366f1] to-[#7c3aed] bg-clip-text text-transparent">
            Agent That Reads the Room
          </span>
        </h1>

        <p className="text-base md:text-lg text-[#9898b3] max-w-2xl mx-auto mb-10 leading-relaxed">
          Envoy is an AI-powered professional identity platform. Ingest your background, build your profile, tailor resumes for job descriptions, run deep ATS checks, and publish personal sites — all from one source of truth.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/signup" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#6366f1] to-[#00d4ff] text-[#050507] px-6 py-3 rounded-md font-bold text-base hover:opacity-90 transition-opacity shadow-lg">
            Create Free Account
            <ArrowRight size={18} />
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#252535] bg-[#0c0c10]/80 hover:bg-[#111118] text-[#f2f2f7] px-6 py-3 rounded-md font-semibold text-base transition-colors">
            Try Demo Mode
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-12">
          {/* Card 1 */}
          <div className="bg-[#0c0c10]/60 backdrop-blur-sm border border-[#1e1e2e] p-8 rounded-lg hover:border-[#252535] transition-all relative group">
            <div className="w-12 h-12 rounded-md bg-[#111118] border border-[#252535] flex items-center justify-center text-[#00d4ff] mb-6 group-hover:border-[#00d4ff]/40 transition-colors">
              <Cpu size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f7] mb-3">🧠 Ingest & Understand</h3>
            <p className="text-sm text-[#9898b3] leading-relaxed">
              Parse raw resumes or bios into a unified structured profile. Automatically extract experience timeline, tech stacks, quantifiable outcomes, and certifications.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#0c0c10]/60 backdrop-blur-sm border border-[#1e1e2e] p-8 rounded-lg hover:border-[#252535] transition-all relative group">
            <div className="w-12 h-12 rounded-md bg-[#111118] border border-[#252535] flex items-center justify-center text-[#6366f1] mb-6 group-hover:border-[#6366f1]/40 transition-colors">
              <Sparkles size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f7] mb-3">🎯 Optimize & Tailor</h3>
            <p className="text-sm text-[#9898b3] leading-relaxed">
              Target role descriptions directly. The AI agent recommends edits, rewrites weak bullets to highlight business outcomes, and dynamically updates spacing and section ordering.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#0c0c10]/60 backdrop-blur-sm border border-[#1e1e2e] p-8 rounded-lg hover:border-[#252535] transition-all relative group">
            <div className="w-12 h-12 rounded-md bg-[#111118] border border-[#252535] flex items-center justify-center text-[#7c3aed] mb-6 group-hover:border-[#7c3aed]/40 transition-colors">
              <BookOpen size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#f2f2f7] mb-3">📄 Deliver & Showcase</h3>
            <p className="text-sm text-[#9898b3] leading-relaxed">
              Export pixel-perfect PDF, DOCX, or ATS-friendly plain text documents. Create an online, responsive web portfolio from your canonical data with a single click.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1e1e2e] py-8 text-center text-xs text-[#5c5c7a] max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
        <span>© {new Date().getFullYear()} ENVOY. All rights reserved.</span>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-[#9898b3] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#9898b3] transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  )
}
