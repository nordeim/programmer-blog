/**
 * apps/web/src/features/landing/hero-typewriter.tsx — FR-6.
 *
 * Wraps `useTypewriter` and renders the .cursor span. Mounted as a
 * client component inside the server-rendered <Hero>.
 *
 * Source: landing_page_mockup.html lines 638-641, 1030-1065.
 */
'use client';

import { useTypewriter } from '@/hooks/use-typewriter';

const GREETINGS = [
  'hello, traveler.',
  'you found /dev/log.',
  'i write bugs so you don\'t have to.',
  "console.log('welcome back.');",
  '0x72656164657220313a20666f756e642e',
];

export function HeroTypewriter() {
  const text = useTypewriter(GREETINGS);
  return (
    <span id="typewriter" className="cursor" aria-label={text || 'greeting'}>
      {text}
    </span>
  );
}
