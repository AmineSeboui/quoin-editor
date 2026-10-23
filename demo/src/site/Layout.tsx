import type { ReactNode } from 'react';
import { GuideNav } from './GuideNav';
import type { Page } from './pages';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/** The frame of every page: a skip link, the site's header, the page's one `main` and the footer. */
export function Layout({ page, children }: { page: Page; children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <SiteHeader page={page} />
      <div className={page.kind === 'doc' ? 'page page-with-nav' : 'page'}>
        {page.kind === 'doc' && <GuideNav page={page} />}
        <main id="content" tabIndex={-1}>
          {children}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
