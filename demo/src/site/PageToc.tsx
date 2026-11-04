import type { Heading } from './headings';

const MIN_ENTRIES = 2;
const MAX_ENTRIES = 40;

/**
 * The headings of the page being read, beside it, so a long guide page can be skimmed and jumped into. A reference
 * page has a heading for every export, far more than a reader can skim, so past `MAX_ENTRIES` the outline lists the
 * parts of the page alone.
 */
export function PageToc({ headings }: { headings: Heading[] }) {
  const parts = headings.filter(({ depth }) => depth === 2);
  const detailed = headings.filter(({ depth }) => depth === 2 || depth === 3);
  const entries = detailed.length > MAX_ENTRIES ? parts : detailed;
  if (entries.length < MIN_ENTRIES) return null;
  return (
    <nav className="page-toc" aria-labelledby="page-toc-title">
      <h2 id="page-toc-title">On this page</h2>
      <ul>
        {entries.map(({ id, text, depth }) => (
          <li key={id} data-depth={depth}>
            <a href={`#${id}`}>{text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
