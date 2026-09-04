/**
 * apps/web/src/lib/pagination.ts — pure pagination helpers.
 *
 * Extracted from the archive page during the MEP §5 REFACTOR 5.1 step.
 * Has no side effects and no React/Next.js imports, so it is trivially
 * unit-testable.
 *
 * Output shape:
 *   - `pages`: 1-indexed list of page numbers to render. Empty when
 *     there is only one page (caller hides the entire pager).
 *   - `prev`/`next`: numeric page numbers, or `null` at the boundaries.
 *   - `showPrev`/`showNext`: convenience booleans for templates.
 *   - `from`/`to`: 1-indexed inclusive range of items on the current page.
 */
export interface PaginationInput {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  /** How many page links to render around the current page. */
  siblings?: number;
  /** Hard cap on rendered page links (for very large archives). */
  maxVisible?: number;
}

export interface PaginationResult {
  totalPages: number;
  currentPage: number;
  pages: number[];
  prev: number | null;
  next: number | null;
  showPrev: boolean;
  showNext: boolean;
  from: number;
  to: number;
  hasMultiple: boolean;
}

const DEFAULT_SIBLINGS = 1;
const DEFAULT_MAX_VISIBLE = 7;

export function paginate(input: PaginationInput): PaginationResult {
  const siblings = input.siblings ?? DEFAULT_SIBLINGS;
  const maxVisible = input.maxVisible ?? DEFAULT_MAX_VISIBLE;
  const totalPages = Math.max(1, Math.ceil(input.totalItems / Math.max(1, input.pageSize)));
  const currentPage = clamp(input.currentPage, 1, totalPages);
  const from = input.totalItems === 0 ? 0 : (currentPage - 1) * input.pageSize + 1;
  const to = Math.min(currentPage * input.pageSize, input.totalItems);

  // Build the visible page list with ellipsis-aware neighbors. We keep the
  // first and last page always visible, and `siblings` pages on each side
  // of the current page. R-69 (audit L-44): note the window is NOT hard-
  // trimmed to `maxVisible` — with the pinned defaults (siblings 1,
  // maxVisible 7) it never exceeds 7 entries, but a custom `siblings`
  // larger than `maxVisible/2 - 1` produces a wider window. Capping the
  // visible page count is the caller's concern.
  const pages: number[] = [];
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
  } else {
    const startWindow = Math.max(2, currentPage - siblings);
    const endWindow = Math.min(totalPages - 1, currentPage + siblings);
    pages.push(1);
    if (startWindow > 2) pages.push(-1); // ellipsis marker
    for (let i = startWindow; i <= endWindow; i += 1) pages.push(i);
    if (endWindow < totalPages - 1) pages.push(-1); // ellipsis marker
    pages.push(totalPages);
  }

  const prev = currentPage > 1 ? currentPage - 1 : null;
  const next = currentPage < totalPages ? currentPage + 1 : null;

  return {
    totalPages,
    currentPage,
    pages,
    prev,
    next,
    showPrev: prev !== null,
    showNext: next !== null,
    from,
    to,
    hasMultiple: totalPages > 1,
  };
}

/**
 * Build a URL for a given page number, preserving existing search params
 * (e.g. `?tag=javascript&q=foo`) while overriding `page`.
 *
 * Pass a plain object of search params. Returns a path string starting
 * with `/`. Page 1 strips the `page` key entirely (no `/archive?page=1`).
 */
export function buildPageHref(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === 'page') continue;
    if (Array.isArray(value)) {
      for (const v of value) if (v) params.append(key, v);
    } else if (value) {
      params.append(key, value);
    }
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}
