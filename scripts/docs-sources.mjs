import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');
export const docsDir = join(root, 'demo', 'docs');
export const DOCS_URL = 'https://amineseboui.github.io/quoin-editor/docs/';

/** The docs pages' markdown sources, which the docs site lays out as pages at `DOCS_URL<slug>/`. */
export const docsSources = () =>
  readdirSync(docsDir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ slug: name.slice(0, -'.md'.length), path: join(docsDir, name) }));

/** The fenced `ts` and `tsx` samples of a markdown file, each with its language. */
export const codeSamples = (markdown) =>
  [...markdown.matchAll(/```(tsx?)\n([\s\S]*?)```/g)].map(([, lang, code]) => ({ lang, code }));

export const readText = (path) => readFileSync(path, 'utf8');
