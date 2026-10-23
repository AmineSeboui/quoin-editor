import { docSources } from './sources';

export type PageKind =
  | { kind: 'home' }
  | { kind: 'doc'; slug: string }
  | { kind: 'blocks' }
  | { kind: 'collaboration' }
  | { kind: 'ai' }
  | { kind: 'comments' }
  | { kind: 'server-rendering' }
  | { kind: 'comparison' }
  | { kind: 'migration' }
  | { kind: 'changelog' };

export type Page = PageKind & { path: string; title: string; description: string };

/** The guide's pages in reading order; a source left out of this list still gets its page, after these. */
export const GUIDE_ORDER = [
  'getting-started',
  'contract',
  'theming',
  'custom-blocks',
  'blocks',
  'uploads',
  'extensions',
  'keyboard',
  'collaboration',
  'comments',
  'ai',
  'server-rendering',
  'headless',
  'api',
  'accessibility',
  'faq',
  'styles-history',
];

const rank = (slug: string) => {
  const index = GUIDE_ORDER.indexOf(slug);
  return index === -1 ? GUIDE_ORDER.length : index;
};

export const guidePages: Page[] = [...docSources.values()]
  .sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug))
  .map(({ slug, title, description }) => ({ kind: 'doc', slug, path: `docs/${slug}/`, title, description }));

export const demoPages: Page[] = [
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
    title: 'How Quoin compares',
    description: 'Quoin beside Tiptap, BlockNote and Editor.js: storage, markdown, UI, licence, collaboration, comments and frameworks, dated and sourced.',
  },
  {
    kind: 'migration',
    path: 'migration/',
    title: 'Migrating from 0.4 to 1.0',
    description: 'What a host of quoin-editor 0.4 changes to move to 1.0: data, props, styles, blocks and a checklist.',
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
  title: 'Quoin, a markdown-native block editor for React',
  description:
    'Quoin is a block editor for React that keeps every text block as readable markdown in a typed array you hold in your own state. MIT.',
};

export const pages: Page[] = [homePage, ...guidePages, ...demoPages, ...referencePages];
