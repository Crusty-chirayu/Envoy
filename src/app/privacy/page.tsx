import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Privacy Policy — Envoy',
  robots: { index: false, follow: false },
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050507] text-[#f2f2f7] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <Logo iconSize={34} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#9898b3] mb-10">Last updated: August 22, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[#c5c5d2]">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. Data You Provide</h2>
            <p>
              Envoy stores the professional profile information you enter (identity, experience,
              education, skills, projects) and the documents you create from it. This data is used
              exclusively to provide the resume, ATS, export, and portfolio features you use.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. Public Portfolios</h2>
            <p>
              Portfolios are PRIVATE by default. They become publicly viewable only when you
              explicitly choose Public or Unlisted visibility and save your portfolio settings.
              Public portfolios expose the profile fields selected for display (name, contact
              details, and career history) to anyone on the internet. Profile data for private or
              unlisted-at-rest portfolios is never exposed.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. AI Processing</h2>
            <p>
              When you configure AI provider keys, your resume content and job descriptions may be
              sent to the provider you select for generating suggestions, tailored extracts, and
              structured analysis. This happens only when you explicitly use those features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. Data Storage</h2>
            <p>
              In demo/offline mode all data is stored in your browser{"'"}s local storage and never
              leaves your device. In connected cloud mode, data is stored in your Supabase project
              under the row-level security policies defined in the project schema.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. Analytics & Cookies</h2>
            <p>
              Envoy does not embed third-party analytics or advertising trackers. Authentication
              sessions use secure HTTP-only cookies managed by your authentication provider.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. Data Deletion</h2>
            <p>
              Deleting your account removes your profile, documents, versions, portfolios, and
              preferences. Demo-mode data can be cleared via the app{"'"}s data reset flows.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Contact</h2>
            <p>
              Questions about this policy? Open an issue on the project{"'"}s GitHub repository.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1e1e2e] flex gap-6 text-sm">
          <Link href="/" className="text-[#6366f1] hover:underline font-semibold">
            Home
          </Link>
          <Link href="/terms" className="text-[#6366f1] hover:underline font-semibold">
            Terms of Service
          </Link>
        </div>
      </div>
    </main>
  )
}