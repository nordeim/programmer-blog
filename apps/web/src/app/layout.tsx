/**
 * apps/web/src/app/layout.tsx — Root layout.
 * Phase 1 minimal version: sets up the theme cookie + SSR-safe theme
 * attribute, exports metadata, renders a placeholder body. Phase 3 will
 * add self-hosted Fraunces / JetBrains Mono / Space Grotesk via
 * next/font/local with files in public/fonts/, plus the <ThemeProvider>,
 * <SkipLink>, <Nav>, <Footer>, and <Toaster>.
 *
 * The theme cookie pattern (PAD §3.3 Pattern 1) prevents hydration
 * mismatch — the server reads the cookie and emits data-theme="...",
 * while an inline <head> script keeps the cookie in sync with localStorage
 * for client-side theme changes.
 */
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

import './globals.css';
import { THEME_COOKIE, VALID_THEMES, type Theme } from '@/domain/theme';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
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
    url: 'http://localhost:3000',
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
      'application/rss+xml': 'http://localhost:3000/rss.xml',
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
    <html lang="en" data-theme={initialTheme} suppressHydrationWarning>
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
