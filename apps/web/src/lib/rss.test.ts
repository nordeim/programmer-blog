/**
 * apps/web/src/lib/rss.test.ts — TDD RED+GREEN 5.4 for the RSS helpers.
 */
import { describe, expect, it } from 'vitest';

import { buildRssItem, buildRssXml, postToRssItem, xmlEscape } from './rss';

const CHANNEL = {
  title: '/dev/log',
  description: 'Notes from a programmer\'s desk.',
  siteUrl: 'http://localhost:3000',
  authorName: 'Alex Rivera',
  authorEmail: 'hi@devlog.example',
};

const SAMPLE_POST = {
  slug: 'a-slug',
  title: 'A Title',
  excerpt: 'An excerpt.',
  publishedAt: new Date('2024-11-12T00:00:00Z'),
  authorName: 'Alex Rivera',
};

describe('xmlEscape', () => {
  it('escapes &, <, >, ", \'', () => {
    expect(xmlEscape('a & b')).toBe('a &amp; b');
    expect(xmlEscape('<tag>')).toBe('&lt;tag&gt;');
    expect(xmlEscape('"q"')).toBe('&quot;q&quot;');
    expect(xmlEscape("it's")).toBe('it&apos;s');
  });
});

describe('buildRssItem', () => {
  it('renders a single <item> with title, link, guid, description, dc:creator, pubDate', () => {
    const xml = buildRssItem(CHANNEL, SAMPLE_POST);
    expect(xml).toContain('<item>');
    expect(xml).toContain('<title>A Title</title>');
    expect(xml).toContain('<link>http://localhost:3000/posts/a-slug</link>');
    expect(xml).toContain('<guid isPermaLink="true">http://localhost:3000/posts/a-slug</guid>');
    expect(xml).toContain('<description>An excerpt.</description>');
    expect(xml).toContain('<dc:creator>Alex Rivera</dc:creator>');
    expect(xml).toContain('<pubDate>');
    expect(xml).toContain('GMT</pubDate>');
  });

  it('escapes dangerous characters in title', () => {
    const xml = buildRssItem(CHANNEL, { ...SAMPLE_POST, title: 'A <b>bold</b> & "scary"' });
    expect(xml).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;scary&quot;');
    expect(xml).not.toContain('<b>bold</b>');
  });
});

describe('buildRssXml', () => {
  it('returns a well-formed RSS 2.0 XML document with the rss root and channel', () => {
    const xml = buildRssXml(CHANNEL, [SAMPLE_POST]);
    expect(xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<channel>');
    expect(xml).toContain('</channel>');
    expect(xml.trim().endsWith('</rss>')).toBe(true);
  });

  it('renders one <item> per post', () => {
    const xml = buildRssXml(CHANNEL, [
      SAMPLE_POST,
      { ...SAMPLE_POST, slug: 'second', title: 'Second' },
    ]);
    expect((xml.match(/<item>/g) ?? []).length).toBe(2);
    expect(xml).toContain('Second');
  });

  it('renders zero <item> elements when posts is empty', () => {
    const xml = buildRssXml(CHANNEL, []);
    expect((xml.match(/<item>/g) ?? []).length).toBe(0);
  });

  it('includes the atom:link self reference', () => {
    const xml = buildRssXml(CHANNEL, [SAMPLE_POST]);
    expect(xml).toContain('atom:link');
    expect(xml).toContain('href="http://localhost:3000/rss.xml"');
  });
});

describe('postToRssItem', () => {
  it('maps a Post row into an RssItem', () => {
    const item = postToRssItem(
      {
        slug: 'a-slug',
        title: 'A Title',
        excerpt: 'An excerpt.',
        publishedAt: new Date('2024-11-12T00:00:00Z'),
      },
      'Alex Rivera',
    );
    expect(item).toEqual({
      slug: 'a-slug',
      title: 'A Title',
      excerpt: 'An excerpt.',
      publishedAt: new Date('2024-11-12T00:00:00Z'),
      authorName: 'Alex Rivera',
    });
  });
});
