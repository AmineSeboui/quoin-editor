import { demoPages, guidePages, referencePages, type Page } from './pages';
import { NPM_URL, pageHref, REPO_URL } from './site';

type Current = 'page' | 'true' | undefined;
type Item = { label: string; path: string; current: (page: Page) => Current };

const LABELS: Record<string, string> = {
  blocks: 'Blocks',
  collaboration: 'Collaboration',
  ai: 'AI',
  comments: 'Comments',
  'server-rendering': 'Server rendering',
  comparison: 'Comparison',
  migration: 'Migration',
  changelog: 'Changelog',
};

const ITEMS: Item[] = [
  {
    label: 'Guide',
    path: guidePages[0].path,
    current: (page) => (page.path === guidePages[0].path ? 'page' : page.kind === 'doc' ? 'true' : undefined),
  },
  ...[...demoPages, ...referencePages].map((target) => ({
    label: LABELS[target.kind],
    path: target.path,
    current: (page: Page): Current => (page.path === target.path ? 'page' : undefined),
  })),
];

export function SiteHeader({ page }: { page: Page }) {
  return (
    <header className="site-header">
      <a className="brand" href={pageHref('')} aria-current={page.kind === 'home' ? 'page' : undefined}>
        <span className="brand-mark" aria-hidden="true">
          Q
        </span>
        Quoin
      </a>
      <nav aria-label="Site" className="site-nav">
        <ul>
          {ITEMS.map(({ label, path, current }) => (
            <li key={path}>
              <a href={pageHref(path)} aria-current={current(page)}>
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href={REPO_URL}>GitHub</a>
          </li>
          <li>
            <a href={NPM_URL}>npm</a>
          </li>
        </ul>
      </nav>
      <button type="button" className="theme-toggle" data-theme-toggle aria-pressed="false">
        Dark mode
      </button>
    </header>
  );
}
