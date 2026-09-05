'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import {
  ArrowRight,
  Sparkles,
  Cpu,
  FileSearch,
  PenLine,
  Rocket,
  Shield,
  Code,
  Globe,
} from 'lucide-react'

const PIPELINE = [
  { label: 'Ingest & Understand', icon: FileSearch },
  { label: 'Strategize & Target', icon: PenLine },
  { label: 'Compose & Deliver', icon: Rocket },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [pipelineIndex, setPipelineIndex] = useState(0)
  const revealRefs = useRef<HTMLElement[]>([])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const id = setInterval(() => {
      setPipelineIndex((_i) => (_i + 1) % PIPELINE.length)
    }, 2500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      revealRefs.current.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    revealRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const setRevealRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el)
  }

  const ActivePipelineIcon = PIPELINE[pipelineIndex].icon

  return (
    <div className="min-h-screen bg-black text-white font-sans relative overflow-x-hidden selection-red">
      {/* Top Blur Header */}
      <div className="gradient-blur" />

      {/* Global Background — Red Noir Starfield & Radial Glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a0505] via-[#050203] to-black" />
        <div className="absolute top-0 left-0 w-[1px] h-[1px] bg-transparent stars-1 animate-[animStar_50s_linear_infinite]" />
        <div className="absolute top-0 left-0 w-[2px] h-[2px] bg-transparent stars-2 animate-[animStar_80s_linear_infinite]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]" />
      </div>

      {/* Floating Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 pt-6 px-4">
        <nav
          className={`max-w-5xl mx-auto flex items-center justify-between bg-black/70 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl transition-all duration-300 ${
            scrolled ? 'border-white/20 shadow-[0_0_30px_rgba(239,35,60,0.15)]' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <Logo iconSize={32} />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Capabilities
            </a>
            <a
              href="#workflow"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              How It Thinks
            </a>
            <a
              href="#architecture"
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Architecture
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white/5 px-6 py-2 transition-transform active:scale-95 border border-white/10 hover:border-[#ef233c]/50"
            >
              <span className="relative z-10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
                Get Started Free <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#ef233c]" />
              </span>
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center">
          <div className="max-w-5xl mx-auto">
            {/* Live Pipeline Eyebrow Badge */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-up"
              style={{ animationDelay: '0.1s' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef233c]" />
              </span>
              <ActivePipelineIcon className="w-3.5 h-3.5 text-[#ef233c]" />
              <span className="text-xs font-medium text-red-100/90 tracking-wide font-manrope">
                Envoy 2.0: {PIPELINE[pipelineIndex].label}
              </span>
              <ArrowRight className="w-3 h-3 text-red-400" />
            </div>

            {/* Main Headline */}
            <h1
              className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter font-manrope leading-[1.08] mb-8 animate-fade-up [text-wrap:balance]"
              style={{ animationDelay: '0.2s' }}
            >
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                Career Intelligence
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                for the{' '}
                <span className="text-[#ef233c] inline-block relative">
                  Future
                  <svg
                    className="absolute w-full h-3 -bottom-2 left-0 text-[#ef233c] opacity-60"
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                </span>
              </span>
            </h1>

            {/* Subheading */}
            <p
              className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-up [text-wrap:pretty]"
              style={{ animationDelay: '0.3s' }}
            >
              Envoy reads your raw background, strategizes against target job roles, scores your ATS fit deterministically, and composes tailored resumes and deployable portfolios.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-fade-up"
              style={{ animationDelay: '0.4s' }}
            >
              <Link href="/signup" className="shiny-cta group">
                <span className="relative z-10 flex items-center gap-2 text-white font-semibold">
                  Build Your Workspace <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>

              <Link
                href="/dashboard"
                className="group px-8 py-4 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-300 font-medium hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-2"
              >
                <span>Try Instant Demo</span>
                <Sparkles className="w-4 h-4 text-[#ef233c]" />
              </Link>
            </div>
          </div>

          {/* Integration Bar */}
          <div className="w-full mt-28 border-y border-white/5 bg-white/[0.02] backdrop-blur-sm py-8 opacity-70 hover:opacity-100 transition-opacity">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-6 md:gap-12 justify-between">
              <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase shrink-0">
                Multi-Provider AI & Delivery Engine:
              </p>
              <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center w-full">
                <div className="flex items-center gap-2 font-manrope font-semibold text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-[#ef233c]" />
                  OpenAI
                </div>
                <div className="flex items-center gap-2 font-manrope font-semibold text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-[#ef233c]" />
                  Anthropic Claude
                </div>
                <div className="flex items-center gap-2 font-manrope font-semibold text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-[#ef233c]" />
                  Google Gemini
                </div>
                <div className="flex items-center gap-2 font-manrope font-semibold text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-[#ef233c]" />
                  OpenRouter
                </div>
                <div className="flex items-center gap-2 font-manrope font-semibold text-sm text-zinc-300">
                  <div className="w-2 h-2 rounded-full bg-[#ef233c]" />
                  Supabase RLS
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-28 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="mb-20 text-center max-w-3xl mx-auto reveal" ref={setRevealRef}>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight font-manrope mb-6">
                The Career Operating System <br />
                <span className="text-[#ef233c]">Engineered for Serious Job Seekers</span>
              </h2>
              <p className="text-lg text-zinc-400 font-light">
                Replace fragmented tools, paywalled templates, and generic prompt bots with one transparent agentic platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Main Bento Feature Card */}
              <div className="lg:col-span-2 lg:row-span-2 group relative overflow-hidden p-8 border border-white/10 bg-gradient-to-b from-zinc-900/60 via-zinc-950 to-black hover:border-[#ef233c]/40 transition-all rounded-2xl">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="mb-6 inline-flex p-3 rounded-xl bg-white/5 border border-white/10 text-[#ef233c]">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="text-3xl font-bold text-white font-manrope mb-4 tracking-tight">
                      Deterministic ATS Intelligence
                    </h3>
                    <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                      Envoy runs algorithmic keyword scoring, word boundary analysis, formatting risk checks, and readability metrics. Every score comes with a clear explanation — know exactly why you score 74 and how to reach 90+.
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-white/5 text-xs font-mono text-[#ef233c]">
                    <span>REAL-TIME SCORING ENGINE</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle at top right, #ef233c, transparent 70%)' }}
                />
              </div>

              {/* Feature Card 2 */}
              <div className="lg:col-span-2 group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-white/20 transition-all rounded-2xl">
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <div className="mb-4 inline-flex p-3 rounded-xl bg-white/5 border border-white/10 text-red-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold text-white font-manrope mb-2">
                      Human-Controlled AI Proposals & Diffs
                    </h3>
                    <p className="text-zinc-400">
                      AI suggestions never directly mutate your data. Review proposed bullet rewrites as side-by-side diffs, accept or tweak changes explicitly, and roll back anytime.
                    </p>
                  </div>
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                  style={{ background: 'radial-gradient(circle at top right, #ef233c, transparent 70%)' }}
                />
              </div>

              {/* Feature Card 3 */}
              <div className="group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-white/20 transition-all rounded-2xl">
                <div className="relative z-10">
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-white/5 border border-white/10 text-red-400">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-manrope mb-2">Live Web Portfolio</h3>
                  <p className="text-sm text-zinc-400">
                    Publish personal websites from your profile data. Complete with custom slugs, themes, and SEO metadata.
                  </p>
                </div>
              </div>

              {/* Feature Card 4 */}
              <div className="group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-white/20 transition-all rounded-2xl">
                <div className="relative z-10">
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-white/5 border border-white/10 text-red-400">
                    <Code className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white font-manrope mb-2">Multi-Format Export</h3>
                  <p className="text-sm text-zinc-400">
                    Export to PDF, editable Word (.docx), or ATS-safe plain text (.txt) while respecting section visibility.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Pipeline */}
        <section id="workflow" className="py-28 px-6 bg-zinc-950/40 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 reveal" ref={setRevealRef}>
              <h2 className="text-4xl md:text-5xl font-bold text-white font-manrope mb-4">
                The Four-Stage Agentic Loop
              </h2>
              <p className="text-zinc-400 max-w-2xl mx-auto">
                Each stage produces structured data, maintaining complete traceability and data safety.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                {
                  step: 'STAGE 01',
                  title: 'INGEST',
                  desc: 'Parse existing PDF, DOCX, or bio text into a canonical professional profile.',
                },
                {
                  step: 'STAGE 02',
                  title: 'UNDERSTAND',
                  desc: 'Structure roles, skills, impact metrics, certifications, and timeline without data loss.',
                },
                {
                  step: 'STAGE 03',
                  title: 'STRATEGIZE',
                  desc: 'Analyze target job requirements against your profile to uncover ATS gaps and priority keywords.',
                },
                {
                  step: 'STAGE 04',
                  title: 'COMPOSE',
                  desc: 'Render pixel-perfect ATS resumes, academic CVs, or live deployable web portfolios.',
                },
              ].map((stg) => (
                <div
                  key={stg.step}
                  className="p-8 border border-white/10 bg-black/80 hover:border-[#ef233c]/50 transition-all rounded-xl relative group"
                >
                  <div className="text-xs font-mono text-[#ef233c] font-bold mb-3">{stg.step}</div>
                  <h3 className="text-xl font-bold font-manrope mb-3 text-white">{stg.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{stg.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial Banner / Vision */}
        <div className="w-full bg-[#ef233c] py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl md:text-5xl font-extrabold text-black font-manrope leading-tight mb-6">
              &ldquo;Built because career tools that actually work shouldn&apos;t sit behind a $12/month paywall.&rdquo;
            </h3>
            <p className="text-black/80 font-bold uppercase tracking-wider text-sm font-mono">
              Radically Open Source · 100% Free Forever · Your Data Remains Yours
            </p>
          </div>
        </div>

        {/* CTA Waitlist / Join Section */}
        <section className="py-28 px-6 text-center bg-black relative border-t border-white/5">
          <div className="max-w-3xl mx-auto reveal" ref={setRevealRef}>
            <h2 className="text-5xl md:text-7xl font-extrabold font-manrope mb-8 tracking-tighter">
              Ready to Own Your <span className="text-[#ef233c]">Career Story?</span>
            </h2>
            <p className="text-xl text-zinc-400 mb-12">
              Start building your master profile and generating tailored ATS resumes today.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="shiny-cta group">
                <span className="relative z-10 flex items-center gap-2 text-white font-semibold">
                  Get Started Free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-900 pt-20 pb-10 relative overflow-hidden z-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Logo iconSize={36} />
            </div>
            <p className="text-zinc-500 max-w-sm leading-relaxed text-sm">
              Open-source AI-powered career operating system. Reads the job. Reads you. Writes the fit.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#ef233c] uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Capabilities
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-white transition-colors">
                  How It Thinks
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[#ef233c] uppercase tracking-widest mb-6">Legal & Open Source</h4>
            <ul className="space-y-3 text-zinc-400 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/Crusty-chirayu/Envoy"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Large Branding Footer Text */}
        <div className="flex justify-center items-center py-6 opacity-15 pointer-events-none">
          <h1 className="text-[16vw] leading-none font-extrabold font-manrope tracking-tighter text-stroke select-none">
            ENVOY AI
          </h1>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between text-zinc-600 text-[10px] uppercase tracking-widest">
          <p>&copy; {new Date().getFullYear()} ENVOY Open Source Project. MIT License.</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  )
}