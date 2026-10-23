import { scrollableTables } from './scrollable-tables';
import { BASE, REPO_URL, SITE_URL } from './site';

const ROOT_GUIDES: Record<string, string> = { 'MIGRATION.md': 'migration/', 'CHANGELOG.md': 'changelog/' };

function siteHref(href: string): string {
  if (href.startsWith(SITE_URL)) return BASE + href.slice(SITE_URL.length);
  const [path, anchor] = href.replace(`${REPO_URL}/blob/main/`, '').split('#');
  if (path in ROOT_GUIDES) return BASE + ROOT_GUIDES[path] + (anchor ? `#${anchor}` : '');
  if (href.startsWith(`${REPO_URL}/blob/main/`)) return href;
  if (/^[a-z][a-z\d+.-]*:|^[#/]/i.test(href)) return href;
  return `${REPO_URL}/blob/main/${href}`;
}

/**
 * The page as it is served: headings keep their anchors without `toHTML`'s `h-` prefix, links to this site stay on the
 * site whichever host serves it, the root guides link to their pages and other repository paths to GitHub, and a table
 * scrolls inside a region the keyboard can reach rather than widening the page.
 */
export function finishHtml(html: string): string {
  return scrollableTables(html)
    .replace(/<h([1-6]) id="h-/g, '<h$1 id="')
    .replace(/ href="#h-/g, ' href="#')
    .replace(/ href="([^"]*)"/g, (_, href: string) => ` href="${siteHref(href.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}"`);
}
