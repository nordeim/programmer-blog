import type { NextConfig } from 'next';

const securityHeaders = () => [
  // R-9 (audit remediation): removed 'unsafe-eval' from script-src per PRD §5.4.
  // Next.js 16 production builds do not require 'unsafe-eval'. 'unsafe-inline'
  // is required because Next.js injects inline scripts for hydration data.
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://api.resend.com; frame-ancestors 'none';" },
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

  // MDX support for content/posts/*.mdx and content/snippets/*.mdx.
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  experimental: {
    // Next.js 16 partial prerendering is now enabled via cacheComponents
    // (previously experimental.ppr). Disabled for Phase 1; enable in Phase 4
    // when landing page is fully built.
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
    return [];
  },
};

export default nextConfig;
