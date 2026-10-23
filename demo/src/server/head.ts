import type { Page } from '../site/pages';
import { BASE, SITE_NAME, SITE_URL } from '../site/site';

export const OG_IMAGE = {
  path: 'og.png',
  width: 1280,
  height: 640,
  alt: 'Quoin. Blocks on screen. Markdown on disk. A release notes excerpt as the editor shows it and as the markdown it stores.',
};

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const meta = (key: 'name' | 'property', name: string, content: string | number) =>
  `<meta ${key}="${name}" content="${escape(String(content))}" />`;

/** The title a page is listed under: its own, and the site's name after it unless the page is the home page. */
export const documentTitle = (page: Page) => (page.kind === 'home' ? page.title : `${page.title} | ${SITE_NAME}`);

/** The tags a search engine and a link preview read: title, description, canonical address, Open Graph and Twitter. */
export function headTags(page: Page): string {
  const url = SITE_URL + page.path;
  const image = SITE_URL + OG_IMAGE.path;
  const title = documentTitle(page);
  return [
    `<title>${escape(title)}</title>`,
    meta('name', 'description', page.description),
    `<link rel="canonical" href="${url}" />`,
    `<link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml" />`,
    meta('property', 'og:type', page.kind === 'home' ? 'website' : 'article'),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:title', title),
    meta('property', 'og:description', page.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:width', OG_IMAGE.width),
    meta('property', 'og:image:height', OG_IMAGE.height),
    meta('property', 'og:image:alt', OG_IMAGE.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', page.description),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', OG_IMAGE.alt),
  ].join('\n    ');
}
