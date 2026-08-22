import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ArrowRight, Sparkles, BookOpen, Cpu, FileSearch, PenLine, Rocket } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050507] text-[#f2f2f7] relative overflow-hidden">
      {/* Single restrained ambient glow behind the hero */}
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[70%] h-[55%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.10)] via-[rgba(0,212,255,0.04)] to-transparent blur-3xl pointer-events-none" />

      {/* Faint engineering grid — technical texture, near-invisible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Header */}
      <header className="w-full border-b border-[#1e1e2e] bg-[#050507]/75 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo iconSize={36} />
          <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9898b3]">
            <a href="#features" className="hover:text-[#f2f2f7] transition-colors">Features</a>
            <a href="#workflow" className="hover:text-[#f2f2f7] transition-colors">How It Thinks</a>
            <a href="#about" className="hover:text-[#f2f2f7] transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-[#9898b3] hover:text-[#f2f2f7] transition-colors px-3 py-2 rounded-md hover:bg-[#16161f]">
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main id="main-content" className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24 z-10 text-center relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111118]/80 border border-[#252535] text-xs text-[#00d4ff] mb-8 mx-auto font-medium">
          <Sparkles size={12} className="animate-pulse" aria-hidden="true" />
          <span>Next-Generation Career Workspace</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.08] [text-wrap:balance]">
          The Career Story You Deserve,
          <br className="hidden sm:block" />{' '}
          Written by an{' '}
          <span className="text-gradient">Agent That Reads the Room</span>
        </h1>

        <p className="text-base md:text-lg text-[#9898b3] max-w-2xl mx-auto mb-10 leading-relaxed [text-wrap:pretty]">
          Envoy is an AI-powered professional identity platform. Ingest your background, build your profile, tailor resumes for job descriptions, run deep ATS checks, and publish personal sites — all from one source of truth.
        </p>

        {/* Primary CTA hierarchy */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link href="/signup" className="btn btn-primary w-full sm:w-auto px-7 py-3 text-base">
            Create Free Account
            <ArrowRight size={18} className="arrow-shift" aria-hidden="true" />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary w-full sm:w-auto px-7 py-3 text-base">
            Try Demo Mode
          </Link>
        </div>

        {/* Trust signals — real product capabilities only */}
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#5c5c7a] font-medium">
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#00d4ff]" aria-hidden="true" />Free to start</li>
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#6366f1]" aria-hidden="true" />Works offline in Demo Mode</li>
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#a78bfa]" aria-hidden="true" />PDF · DOCX · ATS-safe TXT export</li>
        </ul>

        {/* ── How It Thinks ── */}
        <section id="workflow" aria-label="How Envoy works" className="mt-24 md:mt-32">
          <p className="eyebrow mb-3">How it thinks</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 [text-wrap:balance]">
            One pipeline. Three deliberate moves.
          </h2>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1e1e2e] border border-[#1e1e2e] rounded-xl overflow-hidden text-left">
            {[
              {
                step: '01',
                icon: FileSearch,
                title: 'Ingest',
                body: 'Drop a resume or bio. Envoy parses raw documents into one structured, canonical profile — experience timeline, stacks, outcomes.',
              },
              {
                step: '02',
                icon: PenLine,
                title: 'Tailor',
                body: 'Target any role description. The agent proposes outcome-driven rewrites you review as clean diffs before anything changes.',
              },
              {
                step: '03',
                icon: Rocket,
                title: 'Deliver',
                body: 'Export pixel-perfect PDF, Word, or ATS-safe plain text — then publish a portfolio site from the same source of truth.',
              },
            ].map((item) => (
              <li key={item.step} className="bg-[#0b0b10]/90 p-8 relative group">
                <span className="font-mono text-xs text-[#5c5c7a] absolute top-6 right-6">{item.step}</span>
                <div className="w-11 h-11 rounded-lg bg-[#111118] border border-[#252535] flex items-center justify-center text-[#00d4ff] mb-5 transition-colors duration-200 group-hover:border-[#00d4ff]/40">
                  <item.icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[#9898b3] leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ── */}
        <section id="features" aria-label="Feature highlights" className="mt-24 md:mt-32 text-left">
          <p className="eyebrow mb-3 text-center">Capabilities</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-12 text-center [text-wrap:balance]">
            Built like professional tooling, not a template.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                accent: '#00d4ff',
                title: 'Ingest & Understand',
                body: 'Parse raw resumes or bios into a unified structured profile. Automatically extract experience timeline, tech stacks, quantifiable outcomes, and certifications.',
              },
              {
                icon: Sparkles,
                accent: '#6366f1',
                title: 'Optimize & Tailor',
                body: 'Target role descriptions directly. The AI agent recommends edits, rewrites weak bullets to highlight business outcomes, and dynamically updates spacing and section ordering.',
              },
              {
                icon: BookOpen,
                accent: '#a78bfa',
                title: 'Deliver & Showcase',
                body: 'Export pixel-perfect PDF, DOCX, or ATS-friendly plain text documents. Create an online, responsive web portfolio from your canonical data with a single click.',
              },
            ].map((card) => (
              <article
                key={card.title}
                className="surface-card surface-card-hover accent-hairline p-8 relative group"
              >
                <div
                  className="w-12 h-12 rounded-md bg-[#111118] border flex items-center justify-center mb-6 transition-colors duration-200"
                  style={{ borderColor: `${card.accent}33`, color: card.accent }}
                >
                  <card.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold mb-3">{card.title}</h3>
                <p className="text-sm text-[#9898b3] leading-relaxed">{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── About / closing statement ── */}
        <section id="about" aria-label="About Envoy" className="mt-24 md:mt-32">
          <div className="surface-card accent-hairline max-w-3xl mx-auto p-10 md:p-12">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4 [text-wrap:balance]">
              {"Your career data deserves an owner's mindset."}
            </h2>
            <p className="text-sm md:text-base text-[#9898b3] leading-relaxed mb-8">
              Resumes scattered across folders. Portfolios rebuilt from scratch for every application. Career history locked inside dead documents. Envoy replaces that drift with one canonical profile your documents, tailoring, and public presence all draw from — privately by default, published only when you decide.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto">
                Create Free Account
                <ArrowRight size={16} className="arrow-shift" aria-hidden="true" />
              </Link>
              <Link href="/dashboard" className="btn btn-secondary w-full sm:w-auto">
                Try Demo Mode
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#1e1e2e] py-8 max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto z-10">
        <div className="flex items-center gap-3">
          <Logo iconSize={26} showText={false} />
          <span className="text-xs text-[#5c5c7a]">© {new Date().getFullYear()} ENVOY. All rights reserved.</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-xs text-[#5c5c7a]">
          <Link href="/privacy" className="hover:text-[#9898b3] transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#9898b3] transition-colors">Terms of Service</Link>
        </nav>
      </footer>
    </div>
  )
}