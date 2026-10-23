export const BASE = '/quoin-editor/';
export const SITE_URL = `https://amineseboui.github.io${BASE}`;
export const REPO_URL = 'https://github.com/AmineSeboui/quoin-editor';
export const NPM_URL = 'https://www.npmjs.com/package/quoin-editor';
export const SITE_NAME = 'Quoin';
export const TAGLINE = 'Blocks on screen. Markdown on disk.';

/** The address of a page of the site, given its path under the base, such as `docs/theming/`. */
export const pageHref = (path: string) => `${BASE}${path}`;
