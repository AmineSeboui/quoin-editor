import type { ReactNode } from 'react';
import type { Page } from '../site/pages';
import { pageHref } from '../site/site';

type Props = { page: Page; guide: string; guideTitle: string; children: ReactNode };

/** A live demonstration: the page's title, what it shows, and a link to the guide page that explains it. */
export function DemoPage({ page, guide, guideTitle, children }: Props) {
  return (
    <>
      <h1>{page.title}</h1>
      <p className="lede">{page.description}</p>
      {children}
      <p className="guide-link">
        How it works: <a href={pageHref(`docs/${guide}/`)}>{guideTitle}</a>.
      </p>
    </>
  );
}
