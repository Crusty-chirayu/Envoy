import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service — Envoy',
  robots: { index: false, follow: false },
}

const SECTIONS = [
  {
    id: 'acceptance',
    number: '01',
    title: 'Acceptance of Terms',
    body: 'By using Envoy, you agree to these terms. If you do not agree, do not use the service.',
  },
  {
    id: 'your-content',
    number: '02',
    title: 'Your Content',
    body:
      'You retain all rights to the professional data and documents you create. You are responsible for the accuracy of the content you provide and for ensuring you have the right to share any third-party information it contains.',
  },
  {
    id: 'public-portfolio',
    number: '03',
    title: 'Public Portfolio Responsibility',
    body:
      'You control portfolio visibility. Publishing personal information such as contact details and career history makes that information publicly accessible. You are responsible for what you choose to publish.',
  },
  {
    id: 'acceptable-use',
    number: '04',
    title: 'Acceptable Use',
    body:
      'You may not use Envoy to generate content that is unlawful, defamatory, harassing, or infringing, or to attempt to disrupt the service, bypass security controls, or access data that does not belong to you.',
  },
  {
    id: 'ai-disclaimer',
    number: '05',
    title: 'AI Output Disclaimer',
    body:
      'AI-generated suggestions, summaries, and analyses are provided as assistance only. You are responsible for reviewing and confirming the accuracy of all output before relying on it or publishing it.',
  },
  {
    id: 'service-disruption',
    number: '06',
    title: 'Service Disruption',
    body:
      'Envoy is provided as-is without warranties. We are not liable for data loss, service interruptions, or decisions made based on generated content. Keep backups of important data.',
  },
  {
    id: 'changes',
    number: '07',
    title: 'Changes to These Terms',
    body:
      'These terms may be updated from time to time. Continued use after changes constitutes acceptance of the revised terms.',
  },
] as const

export default function TermsPage() {
  return (
    <main className="relative min-h-screen bg-[#050507] text-[#f2f2f7] px-6 py-20 sm:py-24 overflow-hidden">
      {/* Ambient top vignette — quiet, not decorative noise */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: 'radial-gradient(60% 100% at 50% 0%, rgba(99,102,241,0.10), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f2f2f7 1px, transparent 1px), linear-gradient(to bottom, #f2f2f7 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-3xl mx-auto">
        <div className="mb-14">
          <Logo iconSize={34} />
        </div>

        <div className="mb-14 pb-10 border-b border-[#1e1e2e]">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5c5c7a] mb-4">
            <span className="h-px w-6 bg-[#252535]" aria-hidden="true" />
            Legal
          </span>
          <h1 className="text-4xl sm:text-[2.75rem] font-extrabold tracking-tight leading-[1.05] mb-3">
            Terms of Service
          </h1>
          <p className="text-sm text-[#5c5c7a]">Last updated August 22, 2026</p>
        </div>

        {/* Section index — quiet map of a document meant to be scanned, not just read */}
        <nav aria-label="Table of contents" className="mb-14">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="group flex items-baseline gap-3 py-1 text-[13px] text-[#9898b3] hover:text-[#f2f2f7] transition-colors duration-150"
                >
                  <span className="font-mono text-[11px] text-[#5c5c7a] group-hover:text-[#6366f1] transition-colors duration-150 shrink-0">
                    {s.number}
                  </span>
                  <span className="truncate">{s.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-0 text-sm leading-relaxed text-[#c5c5d2]">
          {SECTIONS.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className={`scroll-mt-24 py-8 ${i !== 0 ? 'border-t border-[#1e1e2e]' : 'pt-0'}`}
            >
              <div className="flex items-start gap-4 sm:gap-5">
                <span
                  className="hidden sm:flex shrink-0 items-center justify-center w-9 h-9 rounded-md bg-[#0c0c10] border border-[#1e1e2e] font-mono text-[11px] font-semibold text-[#6366f1] mt-0.5"
                  aria-hidden="true"
                >
                  {s.number}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white mb-2.5 tracking-tight">{s.title}</h2>
                  <p>{s.body}</p>
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-[#1e1e2e] flex items-center gap-8 text-sm">
          <Link
            href="/"
            className="relative text-[#a5a8f7] hover:text-[#c7c9ff] font-semibold transition-colors duration-150 after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
          >
            Home
          </Link>
          <Link
            href="/privacy"
            className="relative text-[#a5a8f7] hover:text-[#c7c9ff] font-semibold transition-colors duration-150 after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  )
}