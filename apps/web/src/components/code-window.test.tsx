/**
 * apps/web/src/components/code-window.test.tsx — Phase 3 component test.
 *
 * Tests:
 *   1. Renders title and code.
 *   2. Renders three traffic-light dots.
 *   3. Renders a CopyButton with `target=code`.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CodeWindow } from './code-window';

describe('<CodeWindow>', () => {
  it('renders the title', () => {
    render(<CodeWindow title="useTypewriter.ts" code="const x = 1;" language="ts" />);
    expect(screen.getByText('useTypewriter.ts')).toBeInTheDocument();
  });

  it('renders the code inside <pre><code>', () => {
    const { container } = render(
      <CodeWindow title="example.ts" code="const x = 1;" language="ts" />,
    );
    const code = container.querySelector('pre code');
    expect(code?.textContent).toBe('const x = 1;');
    expect(code?.className).toContain('language-ts');
  });

  it('renders three traffic-light dots', () => {
    const { container } = render(
      <CodeWindow title="example.ts" code="const x = 1;" language="ts" />,
    );
    const dots = container.querySelectorAll('.code-header span span[style*="border-radius: 50%"]');
    expect(dots.length).toBe(3);
  });

  it('renders a copy button by default', () => {
    const { container } = render(
      <CodeWindow title="example.ts" code="const x = 1;" language="ts" />,
    );
    const copyBtn = container.querySelector('.copy-btn');
    expect(copyBtn).not.toBeNull();
  });

  it('hides the copy button when showCopyButton=false', () => {
    const { container } = render(
      <CodeWindow title="example.ts" code="const x = 1;" showCopyButton={false} />,
    );
    const copyBtn = container.querySelector('.copy-btn');
    expect(copyBtn).toBeNull();
  });
});
