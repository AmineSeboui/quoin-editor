import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const demoRoot = resolve(import.meta.dirname, '..');
export const repoRoot = resolve(demoRoot, '..');
export const dist = resolve(process.env.SITE_DIST ?? join(demoRoot, 'dist'));
export const BASE = '/quoin-editor/';
export const SITE_URL = `https://amineseboui.github.io${BASE}`;
export const DOCS_URL = `${SITE_URL}docs/`;

export const readText = (path) => readFileSync(path, 'utf8');

export const docSlugs = () =>
  readdirSync(join(demoRoot, 'docs'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -'.md'.length))
    .sort();

/** Every page the site must have, by its path under the base. */
export const expectedPages = () => [
  '',
  ...docSlugs().map((slug) => `docs/${slug}/`),
  'blocks/',
  'collaboration/',
  'ai/',
  'comments/',
  'server-rendering/',
  'comparison/',
  'migration/',
  'changelog/',
];

export const pageFile = (path) => join(dist, path, 'index.html');

/** The built HTML of a page, or an empty string when the build has no such page. */
export const builtPage = (path) => (existsSync(pageFile(path)) ? readText(pageFile(path)) : '');

const unescape = (text) =>
  text.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export const titleOf = (html) => unescape(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');

export const metaOf = (html, key, name) =>
  unescape(new RegExp(`<meta ${key}="${name}" content="([^"]*)"`).exec(html)?.[1] ?? '');

export const canonicalOf = (html) => /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? '';

export const count = (html, pattern) => (html.match(pattern) ?? []).length;

/** The text of the page's `main`, without its markup. */
export const mainText = (html) => {
  const main = /<main[^>]*>([\s\S]*)<\/main>/.exec(html)?.[1] ?? '';
  return unescape(main.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
};

export const idsOf = (html) => new Set([...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => unescape(id)));

export const hrefsOf = (html) => [...html.matchAll(/ href="([^"]*)"/g)].map(([, href]) => unescape(href));

export const srcsOf = (html) => [...html.matchAll(/ src="([^"]*)"/g)].map(([, src]) => unescape(src));

/** The width and height a PNG file declares in its header. */
export function pngSize(path) {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(1, 4).toString('latin1');
  if (signature !== 'PNG') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
