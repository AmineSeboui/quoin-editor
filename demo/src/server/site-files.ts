import type { Page } from '../site/pages';
import { DOCS_HOME, SITE_URL } from '../site/site';

const HEAD = '<!--site-head-->';
const BODY = '<!--site-body-->';

/** The built `index.html` with a page's head tags and body put in place of its two markers. */
export function fillTemplate(template: string, page: { head: string; body: string }): string {
  if (!template.includes(HEAD) || !template.includes(BODY)) throw new Error('the page template lost a marker');
  return template.replace(HEAD, () => page.head).replace(BODY, () => page.body);
}

/** Every page's canonical address, for search engines. */
export function sitemap(pages: readonly Page[]): string {
  // A page that has moved is not this site's to offer: its canonical address is on the other one.
  const urls = pages
    .filter((page) => page.kind !== 'doc')
    .map((page) => `  <url><loc>${SITE_URL}${page.path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`;

const escape = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A page that has moved, written as a page rather than a redirect because GitHub Pages serves files and
 * cannot answer 301. The canonical tag is what tells a search engine where the page went, the refresh is what
 * moves a reader, and the script carries the anchor they arrived with, which a refresh on its own drops.
 * Everything is visible without JavaScript, including the address, so a reader who blocks it is not stranded.
 */
export function movedHtml(title: string, slug: string): string {
  const to = `${DOCS_HOME}${slug}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)} has moved</title>
<link rel="canonical" href="${escape(to)}">
<meta http-equiv="refresh" content="0; url=${escape(to)}">
<script>location.replace(${JSON.stringify(to)} + location.hash);</script>
<style>
body { margin: 0; font: 400 16px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1f2b; background: #fff; }
main { max-width: 34rem; margin: 18vh auto 0; padding: 0 1.5rem; }
h1 { font-size: 1.35rem; letter-spacing: -0.02em; margin: 0 0 0.75rem; }
p { margin: 0 0 0.75rem; color: #555e6e; }
a { color: #2d54d3; }
@media (prefers-color-scheme: dark) {
  body { color: #f1f3f7; background: #11141b; }
  p { color: #9ea5b2; }
  a { color: #7fa0fc; }
}
</style>
</head>
<body>
<main>
<h1>This page has moved</h1>
<p>Quoin's documentation is served from one site now, with the editor, the collaboration server and the hosting all in one place.</p>
<p><a href="${escape(to)}">${escape(to)}</a></p>
</main>
</body>
</html>
`;
}
