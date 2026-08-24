import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy — Envoy',
  robots: { index: false, follow: false },
}

const SECTIONS = [
  {
    id: 'data-you-provide',
    number: '01',
    title: 'Data You Provide',
    body:
      'Envoy stores the professional profile information you enter (identity, experience, education, skills, projects) and the documents you create from it. This data is used exclusively to provide the resume, ATS, export, and portfolio features you use.',
  },
  {
    id: 'public-portfolios',
    number: '02',
    title: 'Public Portfolios',
    body:
      "Portfolios are PRIVATE by default. They become publicly viewable only when you explicitly choose Public or Unlisted visibility and save your portfolio settings. Public portfolios expose the profile fields selected for display (name, contact details, and career history) to anyone on the internet. Profile data for private or unlisted-at-rest portfolios is never exposed.",
  },
  {
    id: 'ai-processing',
    number: '03',
    title: 'AI Processing',
    body:
      'When you configure AI provider keys, your resume content and job descriptions may be sent to the provider you select for generating suggestions, tailored extracts, and structured analysis. This happens only when you explicitly use those features.',
  },
  {
    id: 'data-storage',
    number: '04',
    title: 'Data Storage',
    body:
      "In demo/offline mode all data is stored in your browser's local storage and never leaves your device. In connected cloud mode, data is stored in your Supabase project under the row-level security policies defined in the project schema.",
  },
  {
    id: 'analytics-cookies',
    number: '05',
    title: 'Analytics & Cookies',
    body:
      'Envoy does not embed third-party analytics or advertising trackers. Authentication sessions use secure HTTP-only cookies managed by your authentication provider.',
  },
  {
    id: 'data-deletion',
    number: '06',
    title: 'Data Deletion',
    body:
      "Deleting your account removes your profile, documents, versions, portfolios, and preferences. Demo-mode data can be cleared via the app's data reset flows.",
  },
  {
    id: 'contact',
    number: '07',
    title: 'Contact',
    body: "Questions about this policy? Open an issue on the project's GitHub repository.",
  },
] as const

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen bg-[#050507] text-[#f2f2f7] px-6 py-20 sm:py-24 overflow-hidden">
      {/* Ambient top vignette — quiet, not decorative noise */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background: 'radial-gradient(60% 100% at 50% 0%, rgba(0,212,255,0.08), transparent 70%)',
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
            Privacy Policy
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
                  <span className="font-mono text-[11px] text-[#5c5c7a] group-hover:text-[#00d4ff] transition-colors duration-150 shrink-0">
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
                  className="hidden sm:flex shrink-0 items-center justify-center w-9 h-9 rounded-md bg-[#0c0c10] border border-[#1e1e2e] font-mono text-[11px] font-semibold text-[#00d4ff] mt-0.5"
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
            href="/terms"
            className="relative text-[#a5a8f7] hover:text-[#c7c9ff] font-semibold transition-colors duration-150 after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-0 after:bg-current after:transition-all after:duration-200 hover:after:w-full"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  )
}