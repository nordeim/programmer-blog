/**
 * apps/web/src/app/layout.tsx — Root layout.
 *
 * Self-hosted fonts (R-10, audit remediation for H-3): Fraunces /
 * JetBrains Mono / Space Grotesk are loaded via next/font/local from
 * ./fonts/*.woff2 (latin subsets, variable axes). Fonts are served from
 * /_next/static/media/ — zero runtime Google Fonts requests, zero CLS.
 *
 * The theme cookie pattern (PAD §3.3 Pattern 1) prevents hydration
 * mismatch — the server reads the cookie and emits data-theme="...",
 * while an inline <head> script keeps the cookie in sync with localStorage
 * for client-side theme changes.
 */
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';

import './globals.css';
import { THEME_COOKIE, VALID_THEMES, type Theme } from '@/domain/theme';
import { env } from '@/lib/env';

// Self-hosted variable fonts (latin subset). woff2 files live in ./fonts/.
const fraunces = localFont({
  src: [
    {
      path: './fonts/fraunces-latin-var.woff2',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: './fonts/fraunces-latin-italic-400.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-fraunces',
  display: 'swap',
  preload: true,
});

const jetbrainsMono = localFont({
  src: [
    {
      path: './fonts/jetbrains-mono-latin-var.woff2',
      weight: '400 800',
      style: 'normal',
    },
    {
      path: './fonts/jetbrains-mono-latin-italic-400.woff2',
      weight: '400',
      style: 'italic',
    },
  ],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  preload: true,
});

const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-var.woff2',
  weight: '300 700',
  style: 'normal',
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
});

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "/dev/log — Notes from a Programmer's Desk",
    template: '%s · /dev/log',
  },
  description:
    "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am. By Alex Rivera. New essay every other Tuesday.",
  authors: [{ name: 'Alex Rivera' }],
  creator: 'Alex Rivera',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: '/dev/log',
    title: "/dev/log — Notes from a Programmer's Desk",
    description:
      "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.",
  },
  twitter: {
    card: 'summary_large_image',
    title: '/dev/log',
    description: "Notes from a programmer's desk. New essay every other Tuesday.",
  },
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': `${siteUrl}/rss.xml`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c0b09' },
    { media: '(prefers-color-scheme: light)', color: '#f3ecdc' },
  ],
  colorScheme: 'dark light',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE)?.value;
  const initialTheme: Theme = VALID_THEMES.includes(themeCookie as never)
    ? (themeCookie as Theme)
    : 'dark';

  // Inline script — runs before hydration, syncs the cookie with localStorage
  // so the client-rendered theme matches what the server emitted. The body
  // also gets a `.theme-anim` class for 700ms to animate the transition.
  // See PAD §3.3 Pattern 1.
  const themeSyncScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
    'devlog-theme',
  )});if(t && ${JSON.stringify(
    VALID_THEMES,
  )}.includes(t)){document.cookie=${JSON.stringify(
    THEME_COOKIE,
  )}+'='+t+';path=/;max-age=31536000;samesite=lax';var e=document.documentElement;if(e.getAttribute('data-theme')!==t){e.setAttribute('data-theme',t);}}}catch(e){}})();`;

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${fraunces.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeSyncScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-[var(--accent)]"
        >
          skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
