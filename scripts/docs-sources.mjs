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

/** The pages whose samples a consumer copies from: the README, the migration guide and the docs pages. */
export const samplePages = () => [
  { slug: 'readme', path: join(root, 'README.md') },
  { slug: 'migration', path: join(root, 'MIGRATION.md') },
  ...docsSources(),
];

/**
 * The text under a heading, up to the next heading of the same level or higher; empty when it has none.
 * @param {string} markdown
 * @param {string} heading
 * @returns {string}
 */
export function sectionOf(markdown, heading) {
  if (!heading) return '';
  const lines = markdown.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) return '';
  const level = heading.match(/^#+/)[0].length;
  const next = lines.findIndex((line, i) => i > start && /^#+ /.test(line) && line.match(/^#+/)[0].length <= level);
  return lines.slice(start + 1, next === -1 ? undefined : next).join('\n');
}

/**
 * The heading of a release's section, `## <version> (unreleased)` or `## <version> (YYYY-MM-DD)`; empty when it has none.
 * @param {string} markdown
 * @param {string} version
 * @returns {string}
 */
export const releaseHeading = (markdown, version) => {
  const pattern = new RegExp(`^## ${version.replaceAll('.', '\\.')} \\((unreleased|\\d{4}-\\d{2}-\\d{2})\\)$`);
  return markdown.split('\n').find((line) => pattern.test(line)) ?? '';
};

/** Whether a release heading carries a date rather than "(unreleased)". */
export const isDated = (heading) => /\(\d{4}-\d{2}-\d{2}\)$/.test(heading);
