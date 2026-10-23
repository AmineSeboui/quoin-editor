import { guidePages, type Page } from './pages';
import { pageHref } from './site';

export function GuideNav({ page }: { page: Page }) {
  return (
    <nav aria-label="Guide" className="guide-nav">
      <ul>
        {guidePages.map((entry) => (
          <li key={entry.path}>
            <a href={pageHref(entry.path)} aria-current={entry.path === page.path ? 'page' : undefined}>
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
