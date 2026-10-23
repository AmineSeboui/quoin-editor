// @vitest-environment node
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STRUCTURAL_ECHO_WINDOW } from '../src/engine/extension/echo-tracker';
import { DOCS_URL, docsDir, docsSources, readText, root } from './docs-sources.mjs';

const README = join(root, 'README.md');
const README_LIMIT = 10_240;
const readme = readText(README);
const pages = [{ slug: 'README', path: README }, ...docsSources()];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const linkedSlugs = (markdown: string) =>
  [...markdown.matchAll(new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/`, 'g'))].map(([, slug]) => slug);
const linkedAnchors = (markdown: string) =>
  [...markdown.matchAll(new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/#([a-z0-9-]+)`, 'g'))].map(
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

// npm and GitHub render the README in full, so it carries the pitch and the links, and the docs pages carry the rest.
describe('the README', () => {
  it(`stays under ${README_LIMIT} bytes`, () => {
    expect(statSync(README).size).toBeLessThan(README_LIMIT);
  });

  it('links each docs page it names to a source the docs site lays out', () => {
    const slugs = linkedSlugs(readme);
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.filter((slug) => !existsSync(join(docsDir, `${slug}.md`)))).toEqual([]);
  });

  it('links the hero animation from the folder the docs site serves', () => {
    expect(readme).toContain('](demo/public/quoin-demo.gif)');
  });
});

describe('the README and the docs sources', () => {
  it('link only docs pages that have a source', () => {
    const missing = pages.flatMap(({ path }) =>
      linkedSlugs(readText(path)).filter((slug) => !existsSync(join(docsDir, `${slug}.md`))),
    );
    expect(missing).toEqual([]);
  });

  it('link only anchors that a heading of the linked page gives', () => {
    const missing = pages.flatMap(({ path }) =>
      linkedAnchors(readText(path)).filter(({ slug, anchor }) => !anchorsOf(slug).includes(anchor)),
    );
    expect(missing).toEqual([]);
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s uses no em or en dash', (_, path) => {
    expect(readText(path).match(/[\u2013\u2014]/g)).toBeNull();
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s makes no claim the code cannot show', (_, path) => {
    expect(readText(path)).not.toMatch(/fully accessible|exactly as written|wysiwyg/i);
  });
});

describe('the controlled contract page', () => {
  it('gives the number of reported changes a structural copy is recognised within', () => {
    const contract = readText(join(docsDir, 'contract.md'));
    const windows = [...contract.matchAll(/last (\d+) changes/g)].map(([, n]) => Number(n));
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((n) => n === STRUCTURAL_ECHO_WINDOW)).toBe(true);
  });
});
