import { renderToString } from 'react-dom/server';
import { PageBody } from '../pages/PageBody';
import { finishHtml } from '../site/finish-html';
import { Layout } from '../site/Layout';
import { notFoundPage, pages, type Page } from '../site/pages';
import { headTags } from './head';

export { notFoundPage, pages };
export { searchRecords } from './search-index';
export { fillTemplate, movedHtml, robots, sitemap } from './site-files';

/** A page as the build writes it: the tags of its head and its body, its main content drawn on the server. */
export function renderPage(page: Page): { head: string; body: string } {
  const body = renderToString(
    <Layout page={page}>
      <PageBody page={page} />
    </Layout>,
  );
  return { head: headTags(page), body: finishHtml(body) };
}
