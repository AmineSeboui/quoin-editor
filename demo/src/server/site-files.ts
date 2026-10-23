import type { Page } from '../site/pages';
import { SITE_URL } from '../site/site';

const HEAD = '<!--site-head-->';
const BODY = '<!--site-body-->';

/** The built `index.html` with a page's head tags and body put in place of its two markers. */
export function fillTemplate(template: string, page: { head: string; body: string }): string {
  if (!template.includes(HEAD) || !template.includes(BODY)) throw new Error('the page template lost a marker');
  return template.replace(HEAD, () => page.head).replace(BODY, () => page.body);
}

/** Every page's canonical address, for search engines. */
export function sitemap(pages: readonly Page[]): string {
  const urls = pages.map((page) => `  <url><loc>${SITE_URL}${page.path}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const robots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`;
