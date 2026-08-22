import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Terms of Service — Envoy',
  robots: { index: false, follow: false },
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050507] text-[#f2f2f7] px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <Logo iconSize={34} />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-[#9898b3] mb-10">Last updated: August 22, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-[#c5c5d2]">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. Acceptance of Terms</h2>
            <p>
              By using Envoy, you agree to these terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. Your Content</h2>
            <p>
              You retain all rights to the professional data and documents you create. You are
              responsible for the accuracy of the content you provide and for ensuring you have
              the right to share any third-party information it contains.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. Public Portfolio Responsibility</h2>
            <p>
              You control portfolio visibility. Publishing personal information such as contact
              details and career history makes that information publicly accessible. You are
              responsible for what you choose to publish.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. Acceptable Use</h2>
            <p>
              You may not use Envoy to generate content that is unlawful, defamatory, harassing,
              or infringing, or to attempt to disrupt the service, bypass security controls, or
              access data that does not belong to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">5. AI Output Disclaimer</h2>
            <p>
              AI-generated suggestions, summaries, and analyses are provided as assistance only.
              You are responsible for reviewing and confirming the accuracy of all output before
              relying on it or publishing it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">6. Service Disruption</h2>
            <p>
              Envoy is provided as-is without warranties. We are not liable for data loss, service
              interruptions, or decisions made based on generated content. Keep backups of
              important data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">7. Changes to These Terms</h2>
            <p>
              These terms may be updated from time to time. Continued use after changes
              constitutes acceptance of the revised terms.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1e1e2e] flex gap-6 text-sm">
          <Link href="/" className="text-[#6366f1] hover:underline font-semibold">
            Home
          </Link>
          <Link href="/privacy" className="text-[#6366f1] hover:underline font-semibold">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  )
}