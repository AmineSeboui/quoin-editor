// @vitest-environment node
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCS_URL, docsDir, docsSources, readText, REFERENCE_SLUGS, root } from './docs-sources.mjs';

const README = join(root, 'README.md');
const README_LIMIT = 14_336;
const readme = readText(README);
const pages = [{ slug: 'README', path: README }, ...docsSources()];
const guide: string[] = JSON.parse(readText(join(root, 'demo', 'src', 'site', 'moved-guide.json'))).map(
  ({ slug }: { slug: string }) => slug,
);
const packageVersion: string = JSON.parse(readText(join(root, 'package.json'))).version;
const packageMinor = packageVersion.split('.').slice(0, 2).join('.');

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const linkedSlugs = (markdown: string) =>
  [...markdown.matchAll(new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/?`, 'g'))].map(([, slug]) => slug);
const linkedAnchors = (markdown: string) =>
  [...markdown.matchAll(new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/?#([a-z0-9-]+)`, 'g'))].map(
    ([, slug, anchor]) => ({ slug, anchor }),
  );

// The anchor GitHub and the docs site give a heading: lower case, punctuation dropped, each space a hyphen.
const headingAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
const anchorsOf = (slug: string) =>
  readText(join(docsDir, `${slug}.md`))
    .split('\n')
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) => headingAnchor(line.replace(/^#+ /, '')));

const REPOSITORY_FILE = /\b(?:src|e2e|scripts|test)\/[\w./-]*\.(?:[cm]?[jt]sx?|css)\b/;
const linkTargetsDropped = (markdown: string) => markdown.replace(/\]\([^)]*\)/g, ']()');

// The generated reference sends each export to the line that declares it, so a path is a link target there, never copy.
const visibleCopy = (slug: string, path: string) =>
  REFERENCE_SLUGS.includes(slug) ? linkTargetsDropped(readText(path)) : readText(path);

// npm and GitHub render the README in full, so it carries the pitch and the links, and the guide carries the rest.
describe('the README', () => {
  it(`stays under ${README_LIMIT} bytes`, () => {
    expect(statSync(README).size).toBeLessThan(README_LIMIT);
  });

  it('links each docs page it names to a page of the guide', () => {
    const slugs = linkedSlugs(readme);
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((slug) => !guide.includes(slug))).toEqual([]);
  });

  it('links the hero animation from the folder the docs site serves', () => {
    expect(readme).toContain('](demo/public/quoin-demo.gif)');
  });

  it('heads the comparison table with the minor version the package is at', () => {
    const heading = readme.match(/\| Feature \| Quoin (\d+\.\d+) \|/);
    expect(heading).not.toBeNull();
    expect(heading?.[1]).toBe(packageMinor);
  });
});

describe('the README and the reference pages', () => {
  it('link only pages of the guide', () => {
    const missing = pages.flatMap(({ path }) => linkedSlugs(readText(path)).filter((slug) => !guide.includes(slug)));
    expect(missing).toEqual([]);
  });

  // The guide's other pages are written at quoincloud.com, whose tests check the README's anchors into them.
  it('link only anchors that a heading of a reference page here gives', () => {
    const missing = pages.flatMap(({ path }) =>
      linkedAnchors(readText(path))
        .filter(({ slug }) => existsSync(join(docsDir, `${slug}.md`)))
        .filter(({ slug, anchor }) => !anchorsOf(slug).includes(anchor)),
    );
    expect(missing).toEqual([]);
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s uses no em or en dash', (_, path) => {
    expect(readText(path).match(/[\u2013\u2014]/g)).toBeNull();
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s makes no claim the code cannot show', (_, path) => {
    expect(readText(path)).not.toMatch(/fully accessible|exactly as written|wysiwyg/i);
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s names no source or test file of the repository', (slug, path) => {
    expect(visibleCopy(slug, path)).not.toMatch(REPOSITORY_FILE);
  });
});
