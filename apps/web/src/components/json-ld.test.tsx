/**
 * apps/web/src/components/json-ld.test.tsx — R-44 (Pass 4, M-39).
 *
 * Pins the script-context escaping contract: JSON.stringify does NOT
 * escape `<`, so any `</script>` inside a schema string would terminate
 * the LD+JSON script element early (stored XSS via author-controlled
 * post fields). serializeJsonLd must emit `\u003c` instead.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonLd, serializeJsonLd } from './json-ld';

describe('serializeJsonLd — R-44 / M-39', () => {
  it('escapes < to \\u003c so </script> cannot break out', () => {
    const out = serializeJsonLd({ headline: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
    // The output is still valid JSON after unescaping.
    expect(JSON.parse(out.replace(/\\u003c/g, '<'))).toEqual({
      headline: '</script><script>alert(1)</script>',
    });
  });

  it('escapes the U+2028 / U+2029 line separators', () => {
    const out = serializeJsonLd({ text: 'a\u2028b\u2029c' });
    expect(out).not.toContain('\u2028');
    expect(out).not.toContain('\u2029');
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
  });

  it('leaves safe strings untouched', () => {
    const data = { name: '/dev/log', url: 'https://example.com' };
    expect(serializeJsonLd(data)).toBe(JSON.stringify(data));
  });
});

describe('JsonLd component — R-44', () => {
  it('renders an ld+json script whose body contains no literal </script>', () => {
    const { container } = render(
      <JsonLd data={{ headline: 'Why </script> tags are dangerous' }} />,
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeTruthy();
    expect(script?.innerHTML).not.toContain('</script>');
  });
});
