/** @type {import('next').NextConfig} */

/**
 * Content-Security-Policy
 *
 * Notes on the policy:
 *  - 'unsafe-inline' for styles is required by Next.js injected styles and
 *    Tailwind runtime usage.
 *  - 'unsafe-inline'/'unsafe-eval' for scripts keeps Next.js hydration and
 *    dev-mode overlays working. Tightening this requires nonce-based CSP
 *    middleware; documented as a known limitation.
 *  - connect-src covers Supabase (REST + realtime websocket) — AI provider
 *    traffic is server-side only and therefore not exposed here.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['pino'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;