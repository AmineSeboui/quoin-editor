import movedGuide from './moved-guide.json';

export type PageKind =
  | { kind: 'home' }
  | { kind: 'doc'; slug: string }
  | { kind: 'playground' }
  | { kind: 'blocks' }
  | { kind: 'collaboration' }
  | { kind: 'ai' }
  | { kind: 'comments' }
  | { kind: 'server-rendering' }
  | { kind: 'comparison' }
  | { kind: 'migration' }
  | { kind: 'changelog' }
  | { kind: 'not-found' };

export type Page = PageKind & { path: string; title: string; description: string };

/**
 * The guide's pages, which quoincloud.com serves now. Each address here answers with a notice that sends the reader
 * there, so this list is history rather than something derived, and it keeps every address a link was ever written to.
 */
export const guidePages: Page[] = movedGuide.map(({ slug, title, description }) => ({
  kind: 'doc' as const,
  slug,
  path: `docs/${slug}/`,
  title,
  description,
}));

export const demoPages: Page[] = [
  {
    kind: 'playground',
    path: 'playground/',
    title: 'Playground',
    description:
      'Quoin in eight languages, with comments, AI, collaboration, syntax highlighting and the markdown source pane switched on and off, and the code behind every setting beside it.',
  },
  {
    kind: 'blocks',
    path: 'blocks/',
    title: 'Every block, live',
    description: 'Every block Quoin ships, from paragraphs and callouts to tables, math, embeds and a table of contents, in one live editor.',
  },
  {
    kind: 'collaboration',
    path: 'collaboration/',
    title: 'Collaboration, live',
    description: 'Two Quoin editors side by side, sharing one Yjs document over a BroadcastChannel provider, with each other’s carets.',
  },
  {
    kind: 'ai',
    path: 'ai/',
    title: 'AI actions, simulated',
    description: 'Quoin’s AI menu streaming answers from a simulated model in the browser, accepted or discarded in one undo step.',
  },
  {
    kind: 'comments',
    path: 'comments/',
    title: 'Comments, live',
    description: 'Comment threads anchored to text, kept in a store of the page’s own, with replies, resolving and deleting.',
  },
  {
    kind: 'server-rendering',
    path: 'server-rendering/',
    title: 'Server rendering, shown',
    description: 'A document drawn at build time by QuoinView and a diff of two versions drawn by QuoinDiff, with no editor loaded on the page.',
  },
];

export const referencePages: Page[] = [
  {
    kind: 'comparison',
    path: 'comparison/',
    title: 'Quoin vs Tiptap, BlockNote, Editor.js, Lexical and Plate',
    description:
      'A Tiptap, BlockNote, Editor.js, Lexical or Plate alternative? Quoin beside each on storage, markdown, UI, licence, collaboration, comments, localization and frameworks, dated and sourced.',
  },
  {
    kind: 'migration',
    path: 'migration/',
    title: 'Migrating Quoin',
    description:
      'What a host of quoin-editor changes to move up a major version: 1.x to 2.0, where seven view-internal exports go, and 0.4 to 1.0, where the data, props, styles and blocks changed.',
  },
  {
    kind: 'changelog',
    path: 'changelog/',
    title: 'Changelog',
    description: 'Every release of quoin-editor, newest first: what each one added, changed and fixed, and what was breaking.',
  },
];

export const homePage: Page = {
  kind: 'home',
  path: '',
  title: 'Quoin, a rich markdown editor and block editor for React',
  description:
    'Quoin is an open source rich markdown editor for React: a Notion-style block editor with real-time collaboration and AI that stores readable markdown. MIT.',
};

export const pages: Page[] = [homePage, ...guidePages, ...demoPages, ...referencePages];

/** What a host serves for an address the site has no page for; written to the root as `404.html`, outside `pages`. */
export const notFoundPage: Page = {
  kind: 'not-found',
  path: '404.html',
  title: 'Page not found',
  description: 'That address has no page on the Quoin site. The documentation, the live demos and the changelog are listed here.',
};
