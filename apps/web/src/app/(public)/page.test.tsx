/**
 * apps/web/src/app/(public)/page.test.tsx — landing page smoke test.
 *
 * Tests that the landing page renders all 6 sections (Hero, Marquee,
 * RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection) and
 * that the hidden logotype marker is present.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Mock the server-only lib/env import so the test can render.
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_GITHUB_REPO: 'nordeim/programmer-blog',
    NEXT_PUBLIC_AUTHOR_EMAIL: 'hi@devlog.example',
    GITHUB_STATS_FALLBACK_STARS: 82400,
    GITHUB_STATS_FALLBACK_FORKS: 4180,
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

// Mock the subscribe action so the form doesn't actually hit the DB.
vi.mock('@/features/subscribe/actions', () => ({
  subscribeToNewsletter: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Welcome aboard.',
  }),
}));

import LandingPage from './page';

describe('LandingPage', () => {
  it('renders the hidden logotype marker', () => {
    const { getByTestId } = render(<LandingPage />);
    expect(getByTestId('logotype-marker').textContent).toBe('/dev/log');
  });

  it('renders the hero section', () => {
    const { container } = render(<LandingPage />);
    const hero = container.querySelector('#hero');
    expect(hero).not.toBeNull();
  });

  it('renders the marquee', () => {
    const { container } = render(<LandingPage />);
    const marquee = container.querySelector('.marquee-wrap');
    expect(marquee).not.toBeNull();
  });

  it('renders the recent notes section', () => {
    const { container } = render(<LandingPage />);
    const notes = container.querySelector('#notes');
    expect(notes).not.toBeNull();
  });

  it('renders the snippet showcase section', () => {
    const { container } = render(<LandingPage />);
    const snippets = container.querySelector('#snippets');
    expect(snippets).not.toBeNull();
  });

  it('renders the archive preview section', () => {
    const { container } = render(<LandingPage />);
    const archive = container.querySelector('#archive');
    expect(archive).not.toBeNull();
  });

  it('renders the subscribe section', () => {
    const { container } = render(<LandingPage />);
    const about = container.querySelector('#about');
    expect(about).not.toBeNull();
  });

  it('renders 3 article cards', () => {
    const { container } = render(<LandingPage />);
    const cards = container.querySelectorAll('.article-card');
    expect(cards.length).toBe(3);
  });

  it('renders 6 archive items', () => {
    const { container } = render(<LandingPage />);
    const items = container.querySelectorAll('.archive-item');
    expect(items.length).toBe(6);
  });

  it('renders the subscribe form', () => {
    const { container } = render(<LandingPage />);
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
  });
});
