/**
 * apps/web/src/components/json-ld.tsx — JSON-LD structured data renderer (R-11).
 *
 * Renders a `<script type="application/ld+json">` element with the
 * JSON-stringified data. Used for SEO structured data per PRD §5.3:
 *   - Landing page: WebSite schema
 *   - Post pages: Article schema
 *
 * The data is server-controlled and additionally `<`-escaped by
 * `serializeJsonLd` (R-44), so the `dangerouslySetInnerHTML` cannot be
 * abused to terminate the script element early.
 */
import React from 'react';

export interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * R-44 (audit M-39): JSON.stringify does not escape `<`, so a literal
 * `</script>` inside any schema string could terminate the LD+JSON
 * script element early. Escape `<` (plus the U+2028/U+2029 line
 * separators, which are valid JSON but not valid JS string literals)
 * to their `\uXXXX` forms — the output stays valid JSON and parses to
 * the identical value.
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function JsonLd({ data }: JsonLdProps): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

/**
 * Build a WebSite schema for the landing page.
 */
export function buildWebSiteSchema(opts: {
  name: string;
  url: string;
  description?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: opts.name,
    url: opts.url,
    ...(opts.description ? { description: opts.description } : {}),
  };
}

/**
 * Build an Article schema for a post page.
 */
export function buildArticleSchema(opts: {
  headline: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  image?: string;
  description?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    url: opts.url,
    datePublished: opts.datePublished,
    ...(opts.dateModified ? { dateModified: opts.dateModified } : {}),
    author: {
      '@type': 'Person',
      name: opts.authorName,
      ...(opts.authorUrl ? { url: opts.authorUrl } : {}),
    },
    ...(opts.image ? { image: opts.image } : {}),
    ...(opts.description ? { description: opts.description } : {}),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': opts.url,
    },
  };
}
