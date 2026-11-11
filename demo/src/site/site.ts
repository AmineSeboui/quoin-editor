export const BASE = '/quoin-editor/';
export const SITE_URL = `https://amineseboui.github.io${BASE}`;
export const REPO_URL = 'https://github.com/AmineSeboui/quoin-editor';
export const NPM_URL = 'https://www.npmjs.com/package/quoin-editor';
export const CLOUD_URL = 'https://quoincloud.com';
export const SITE_NAME = 'Quoin';
export const TAGLINE = 'Blocks on screen. Markdown on disk.';

/** Where the documentation went: the one site, with the editor, the server and the hosting all on it. */
export const DOCS_HOME = `${CLOUD_URL}/docs/editor/`;

/**
 * The address of a page of the site, given its path under the base, such as `playground/`.
 *
 * A documentation path answers with its address on the other site rather than the notice left behind here,
 * so a link from this site goes straight there instead of through a page that only says where to go.
 */
export const pageHref = (path: string) =>
  path.startsWith('docs/') ? `${DOCS_HOME}${path.slice(5).replace(/\/$/, '')}` : `${BASE}${path}`;
