/**
 * apps/web/src/components/tag.test.tsx — Phase 3 component test.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tag } from './tag';

describe('<Tag>', () => {
  it('renders its children inside a .tag span', () => {
    const { container } = render(<Tag>JavaScript</Tag>);
    const span = container.querySelector('.tag');
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe('JavaScript');
  });

  it('accepts an additional className', () => {
    const { container } = render(<Tag className="extra">Rust</Tag>);
    const span = container.querySelector('.tag.extra');
    expect(span).not.toBeNull();
  });
});
