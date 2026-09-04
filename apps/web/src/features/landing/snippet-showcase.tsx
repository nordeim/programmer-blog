/**
 * apps/web/src/features/landing/snippet-showcase.tsx — FR-9.
 *
 * Renders the "Snippet of the week" section with two <CodeWindow>s
 * (the useTypewriter hook + a usage example). Server component.
 *
 * Source: landing_page_mockup.html lines 774-882.
 */
import { CodeWindow } from '@/components/code-window';
import { Tag } from '@/components/tag';

const SNIPPET_CODE = `// A self-cleaning typewriter hook. No deps, ~30 lines.
import { useState, useEffect } from 'react';

export function useTypewriter(
  words: string[],
  speed = 80,
  pause = 1800,
) {
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const word = words[i % words.length];
    const delay = del ? speed / 2 : speed;

    const t = setTimeout(() => {
      setText(del
        ? word.slice(0, text.length - 1)
        : word.slice(0, text.length + 1));
    }, delay);

    if (!del && text === word) {
      const p = setTimeout(() => setDel(true), pause);
      return () => { clearTimeout(t); clearTimeout(p); };
    }
    if (del && text === '') {
      setDel(false);
      setI(i + 1);
    }
    return () => clearTimeout(t);
  }, [text, del, i, words, speed, pause]);

  return text;
}`;

const USAGE_CODE = `function Hero() {
  const greeting = useTypewriter([
    'hello, traveler.',
    'you found /dev/log.',
    'console.log(love)'
  ]);

  return <h1>{greeting}</h1>;
}`;

export function SnippetShowcase() {
  return (
    <section
      className="py-24 md:py-32 px-6"
      id="snippets"
      style={{ background: 'var(--bg-elev)' }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4 lg:sticky min-w-0" style={{ top: 120 }}>
            <div
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--accent)' }}
            >
              {'//'} snippet of the week
            </div>
            <h2
              className="font-display font-black text-4xl md:text-5xl mb-6"
              style={{ letterSpacing: '-0.03em', lineHeight: 1.05 }}
            >
              <span style={{ fontStyle: 'italic', fontWeight: 400 }}>useTypewriter</span>() —
              the hook powering this hero.
            </h2>
            <p
              className="text-base mb-8"
              style={{ color: 'var(--muted)', lineHeight: 1.65 }}
            >
              The blinking greeting at the top of this page isn&apos;t a CSS
              animation — it&apos;s a real React hook. Type, pause, delete,
              advance. Click <em>copy</em> and paste it into your project.
            </p>
            <ul
              className="space-y-3 font-mono text-sm mb-8"
              style={{ color: 'var(--fg-dim)' }}
            >
              <li className="flex items-center gap-3">
                <span style={{ color: 'var(--accent)' }}>→</span> zero dependencies
              </li>
              <li className="flex items-center gap-3">
                <span style={{ color: 'var(--accent)' }}>→</span> ~30 lines, fully typed
              </li>
              <li className="flex items-center gap-3">
                <span style={{ color: 'var(--accent)' }}>→</span> cleanup-safe on unmount
              </li>
            </ul>
            <div className="flex flex-wrap gap-2">
              <Tag>React</Tag>
              <Tag>TypeScript</Tag>
              <Tag>Hooks</Tag>
            </div>
          </div>

          <div className="lg:col-span-8 min-w-0">
            <CodeWindow title="useTypewriter.ts" code={SNIPPET_CODE} language="ts" />
            <div className="mt-6">
              <CodeWindow title="usage.tsx" code={USAGE_CODE} language="tsx" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
