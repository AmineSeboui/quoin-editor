import type { Page } from '../site/pages';

export type SearchRecord = { path: string; title: string; section?: string; id?: string; text: string };

const MAIN = /<main[^>]*>([\s\S]*)<\/main>/;
const SECTION_START = /(?=<h2[\s>])/;
const SECTION_HEADING = /^<h2\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/;
const MAX_TEXT = 1200;

const PROSE: Page['kind'][] = ['doc', 'comparison', 'migration', 'changelog'];

const decode = (text: string) =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const textOf = (html: string) =>
  decode(html.replace(/<(script|style|template)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT);

/**
 * A page as the search reads it. A page of prose is split at its level 2 headings, so a hit sends the reader to the
 * section that holds it; a page that is a live demo is indexed by its name alone, since its text is the sample document.
 */
export function searchRecords(page: Page, body: string): SearchRecord[] {
  if (!PROSE.includes(page.kind)) return [{ path: page.path, title: page.title, text: page.description }];
  const main = MAIN.exec(body)?.[1] ?? '';
  return main
    .split(SECTION_START)
    .map((part): SearchRecord | null => {
      const heading = SECTION_HEADING.exec(part);
      const text = textOf(part);
      if (text === '') return null;
      if (!heading) return { path: page.path, title: page.title, text };
      return { path: page.path, title: page.title, section: textOf(heading[2]), id: heading[1], text };
    })
    .filter((record): record is SearchRecord => record !== null);
}
