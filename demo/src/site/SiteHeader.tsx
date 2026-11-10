import { BrandMark } from './BrandMark';
import { GitHubIcon, MoonIcon, SearchIcon, SunIcon } from './icons';
import { demoPages, guidePages, referencePages, type Page } from './pages';
import { NPM_URL, pageHref, REPO_URL } from './site';

type Current = 'page' | 'true' | undefined;
type Item = { label: string; path: string; current: (page: Page) => Current };

const LABELS: Record<string, string> = {
  playground: 'Playground',
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
      <div className="site-header-inner">
        <a className="brand" href={pageHref('')} aria-current={page.kind === 'home' ? 'page' : undefined}>
          <BrandMark />
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
          </ul>
        </nav>
        <div className="site-actions">
          <button type="button" className="site-search" aria-label="Search this site" hidden data-search-open>
            <SearchIcon />
            <span>Search</span>
            <kbd>/</kbd>
          </button>
          <a className="site-action" href={NPM_URL}>
            npm
          </a>
          <a className="site-action icon-button" href={REPO_URL} aria-label="GitHub">
            <GitHubIcon />
          </a>
          <button type="button" className="icon-button" data-theme-toggle aria-pressed="false" aria-label="Dark mode">
            <MoonIcon />
            <SunIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
