import type { Heading } from './headings';

const MIN_ENTRIES = 2;

/** The headings of the page being read, beside it, so a long guide page can be skimmed and jumped into. */
export function PageToc({ headings }: { headings: Heading[] }) {
  const entries = headings.filter(({ depth }) => depth === 2 || depth === 3);
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
