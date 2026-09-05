import type { NextConfig } from 'next';

const securityHeaders = () => [
  // R-9 (audit remediation): removed 'unsafe-eval' from script-src per PRD §5.4.
  // Next.js 16 production builds do not require 'unsafe-eval'. 'unsafe-inline'
  // is required because Next.js injects inline scripts for hydration data
  // (plus the layout's theme-flash script) — nonce-based script-src is the
  // documented Phase-4+ upgrade path (Pass 7 backlog).
  // R-81 (Pass 7, M-55): base-uri / object-src / form-action do NOT fall
  // back to default-src, so they must be explicit; without them, an HTML
  // injection vector could hijack <base> or embed plugins.
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://api.resend.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self';" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',

  // Consume local packages' TypeScript source directly.
  transpilePackages: [
    '@devlog/db',
    '@devlog/auth',
    '@devlog/email',
    '@devlog/types',
    '@devlog/config',
  ],

  // MDX support for content/snippets/*.mdx (posts live in SQLite, not as MDX files — Pass 6 doc sync).
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  experimental: {
    // Next.js 16 partial prerendering is now enabled via cacheComponents
    // (previously experimental.ppr). Disabled; enable in Phase 8+ when
    // landing page is fully built (deferred from original Phase 4 target).
    // cacheComponents: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders(),
      },
      {
        // RSS feeds need the right content type.
        source: '/rss.xml',
        headers: [{ key: 'Content-Type', value: 'application/rss+xml; charset=utf-8' }],
      },
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Content-Type', value: 'application/xml; charset=utf-8' }],
      },
    ];
  },

  async rewrites() {
    // R-34 (Pass 3, fixes H-32): README's "Routes Implemented" contract
    // lists the top-level /rss.xml, /sitemap.xml and /robots.txt URLs —
    // the canonical URLs subscribers and crawlers use. The handlers live
    // under /api/*; these rewrites make the documented URLs resolve while
    // the Content-Type headers above keep the correct MIME types.
    // (Pinned by src/next.config.test.ts.)
    return [
      { source: '/rss.xml', destination: '/api/rss.xml' },
      { source: '/sitemap.xml', destination: '/api/sitemap.xml' },
      { source: '/robots.txt', destination: '/api/robots.txt' },
    ];
  },
};

export default nextConfig;
