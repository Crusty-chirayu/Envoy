'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ArrowRight, Sparkles, BookOpen, Cpu, FileSearch, PenLine, Rocket } from 'lucide-react'

const PIPELINE = [
  { label: 'Ingest', icon: FileSearch },
  { label: 'Tailor', icon: PenLine },
  { label: 'Deliver', icon: Rocket },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [pipelineIndex, setPipelineIndex] = useState(0)
  const revealRefs = useRef<HTMLElement[]>([])

  // Header elevation on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Live pipeline status cycle in hero eyebrow — respects reduced motion
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return
    const id = setInterval(() => {
      setPipelineIndex((i) => (i + 1) % PIPELINE.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  // Scroll-triggered section reveals
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
    <div className="flex flex-col min-h-screen bg-[#050507] text-[#f2f2f7] relative overflow-hidden selection:bg-[#00d4ff]/20 selection:text-[#f2f2f7]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:bg-[#111118] focus:border focus:border-[#00d4ff]/50 focus:text-[#f2f2f7] focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>

      {/* Ambient glow behind the hero */}
      <div
        aria-hidden="true"
        className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[70%] h-[55%] rounded-full bg-gradient-radial from-[rgba(99,102,241,0.12)] via-[rgba(0,212,255,0.05)] to-transparent blur-3xl pointer-events-none envoy-glow"
      />

      {/* Faint engineering grid — technical texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.35] envoy-grid"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      {/* Bottom vignette for depth */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.55))',
        }}
      />

      {/* Header */}
      <header
        className={`w-full border-b sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
          scrolled ? 'border-[#252535] bg-[#050507]/90 shadow-[0_1px_0_0_rgba(255,255,255,0.03)]' : 'border-[#1e1e2e] bg-[#050507]/75'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo iconSize={36} />
          <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9898b3]">
            <a href="#features" className="relative hover:text-[#f2f2f7] transition-colors duration-200 py-1 focus-visible:outline-none focus-visible:text-[#f2f2f7] group">
              Features
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-[#00d4ff] transition-all duration-300 group-hover:w-full group-focus-visible:w-full" aria-hidden="true" />
            </a>
            <a href="#workflow" className="relative hover:text-[#f2f2f7] transition-colors duration-200 py-1 focus-visible:outline-none focus-visible:text-[#f2f2f7] group">
              How It Thinks
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-[#00d4ff] transition-all duration-300 group-hover:w-full group-focus-visible:w-full" aria-hidden="true" />
            </a>
            <a href="#about" className="relative hover:text-[#f2f2f7] transition-colors duration-200 py-1 focus-visible:outline-none focus-visible:text-[#f2f2f7] group">
              About
              <span className="absolute left-0 -bottom-0.5 h-px w-0 bg-[#00d4ff] transition-all duration-300 group-hover:w-full group-focus-visible:w-full" aria-hidden="true" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-[#9898b3] hover:text-[#f2f2f7] transition-colors px-3 py-2 rounded-md hover:bg-[#16161f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
            >
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm envoy-btn-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main id="main-content" className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-32 md:pb-24 z-10 text-center relative">
        <div className="envoy-hero-enter" style={{ animationDelay: '0ms' }}>
          <div
            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#111118]/80 border border-[#252535] text-xs text-[#00d4ff] mb-8 mx-auto font-mono tracking-wide"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00d4ff]" />
            </span>
            <ActivePipelineIcon size={12} aria-hidden="true" className="envoy-icon-swap" key={pipelineIndex} />
            <span className="envoy-icon-swap" key={`label-${pipelineIndex}`}>
              {PIPELINE[pipelineIndex].label} — Next-Generation Career Workspace
            </span>
          </div>
        </div>

        <h1
          className="envoy-hero-enter text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.06] [text-wrap:balance]"
          style={{ animationDelay: '90ms' }}
        >
          The Career Story You Deserve,
          <br className="hidden sm:block" />{' '}
          Written by an{' '}
          <span className="text-gradient">Agent That Reads the Room</span>
        </h1>

        <p
          className="envoy-hero-enter text-base md:text-lg text-[#9898b3] max-w-2xl mx-auto mb-10 leading-relaxed [text-wrap:pretty]"
          style={{ animationDelay: '160ms' }}
        >
          Envoy is an AI-powered professional identity platform. Ingest your background, build your profile, tailor resumes for job descriptions, run deep ATS checks, and publish personal sites — all from one source of truth.
        </p>

        {/* Primary CTA hierarchy */}
        <div className="envoy-hero-enter flex flex-col sm:flex-row items-center justify-center gap-4 mb-8" style={{ animationDelay: '230ms' }}>
          <Link
            href="/signup"
            className="btn btn-primary w-full sm:w-auto px-7 py-3 text-base envoy-btn-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
          >
            Create Free Account
            <ArrowRight size={18} className="arrow-shift" aria-hidden="true" />
          </Link>
          <Link
            href="/dashboard"
            className="btn btn-secondary w-full sm:w-auto px-7 py-3 text-base envoy-btn-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]"
          >
            Try Demo Mode
          </Link>
        </div>

        {/* Trust signals */}
        <ul
          className="envoy-hero-enter flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#5c5c7a] font-medium"
          style={{ animationDelay: '300ms' }}
        >
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#00d4ff]" aria-hidden="true" />Free to start</li>
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#6366f1]" aria-hidden="true" />Works offline in Demo Mode</li>
          <li className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#a78bfa]" aria-hidden="true" />PDF · DOCX · ATS-safe TXT export</li>
        </ul>

        {/* ── How It Thinks ── */}
        <section id="workflow" aria-label="How Envoy works" className="mt-24 md:mt-32 reveal" ref={setRevealRef}>
          <p className="eyebrow mb-3 font-mono text-xs tracking-[0.2em] uppercase text-[#00d4ff]">How it thinks</p>
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
            ].map((item, idx) => (
              <li
                key={item.step}
                className="bg-[#0b0b10]/90 p-8 relative group envoy-step-card transition-colors duration-300 hover:bg-[#0d0d13]"
                style={{ transitionDelay: `${idx * 40}ms` }}
              >
                <span className="font-mono text-xs text-[#5c5c7a] absolute top-6 right-6 tabular-nums">{item.step}</span>
                <div className="w-11 h-11 rounded-lg bg-[#111118] border border-[#252535] flex items-center justify-center text-[#00d4ff] mb-5 transition-all duration-300 group-hover:border-[#00d4ff]/40 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_24px_-8px_rgba(0,212,255,0.5)]">
                  <item.icon size={20} aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-[#9898b3] leading-relaxed">{item.body}</p>
                <span
                  className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[#00d4ff]/0 via-[#00d4ff]/40 to-[#00d4ff]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </section>

        {/* ── Features ── */}
        <section id="features" aria-label="Feature highlights" className="mt-24 md:mt-32 text-left reveal" ref={setRevealRef}>
          <p className="eyebrow mb-3 text-center font-mono text-xs tracking-[0.2em] uppercase text-[#00d4ff]">Capabilities</p>
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
            ].map((card, idx) => (
              <article
                key={card.title}
                className="surface-card surface-card-hover accent-hairline p-8 relative group envoy-feature-card transition-transform duration-300 hover:-translate-y-1"
                style={{ transitionDelay: `${idx * 40}ms` }}
              >
                <div
                  className="w-12 h-12 rounded-md bg-[#111118] border flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                  style={{ borderColor: `${card.accent}33`, color: card.accent }}
                >
                  <card.icon size={22} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold mb-3">{card.title}</h3>
                <p className="text-sm text-[#9898b3] leading-relaxed">{card.body}</p>
                <div
                  className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow: `0 0 0 1px ${card.accent}33, 0 16px 40px -20px ${card.accent}4d` }}
                  aria-hidden="true"
                />
              </article>
            ))}
          </div>
        </section>

        {/* ── About / closing statement ── */}
        <section id="about" aria-label="About Envoy" className="mt-24 md:mt-32 reveal" ref={setRevealRef}>
          <div className="surface-card accent-hairline max-w-3xl mx-auto p-10 md:p-12 relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-gradient-radial from-[rgba(0,212,255,0.10)] to-transparent blur-2xl pointer-events-none"
            />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-4 [text-wrap:balance] relative">
              {"Your career data deserves an owner's mindset."}
            </h2>
            <p className="text-sm md:text-base text-[#9898b3] leading-relaxed mb-8 relative">
              Resumes scattered across folders. Portfolios rebuilt from scratch for every application. Career history locked inside dead documents. Envoy replaces that drift with one canonical profile your documents, tailoring, and public presence all draw from — privately by default, published only when you decide.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
              <Link href="/signup" className="btn btn-primary w-full sm:w-auto envoy-btn-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]">
                Create Free Account
                <ArrowRight size={16} className="arrow-shift" aria-hidden="true" />
              </Link>
              <Link href="/dashboard" className="btn btn-secondary w-full sm:w-auto envoy-btn-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff]">
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
          <Link href="/privacy" className="hover:text-[#9898b3] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff] rounded-sm">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-[#9898b3] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00d4ff] rounded-sm">Terms of Service</Link>
        </nav>
      </footer>

      <style jsx global>{`
        @keyframes envoyFadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes envoyGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes envoyIconSwap {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .envoy-hero-enter {
          opacity: 0;
          animation: envoyFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .envoy-glow {
          animation: envoyGlowPulse 8s ease-in-out infinite;
        }

        .envoy-icon-swap {
          animation: envoyIconSwap 0.35s ease-out;
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

        .envoy-step-card,
        .envoy-feature-card {
          transition-property: transform, background-color, box-shadow;
        }

        .envoy-btn-lift {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, filter 0.2s ease;
        }
        .envoy-btn-lift:hover {
          transform: translateY(-1px);
        }
        .envoy-btn-lift:active {
          transform: translateY(0px) scale(0.98);
        }

        @media (prefers-reduced-motion: reduce) {
          .envoy-hero-enter,
          .reveal {
            animation: none !important;
            transition: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .envoy-glow,
          .envoy-icon-swap {
            animation: none !important;
          }
          .envoy-btn-lift:hover,
          .envoy-btn-lift:active {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  )
}