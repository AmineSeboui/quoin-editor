// @vitest-environment node
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCS_URL, docsDir, docsSources, readText, root } from './docs-sources.mjs';

const README = join(root, 'README.md');
const README_LIMIT = 10_240;
const readme = readText(README);
const pages = [{ slug: 'README', path: README }, ...docsSources()];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const linkedSlugs = (markdown: string) =>
  [...markdown.matchAll(new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/`, 'g'))].map(([, slug]) => slug);

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

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s uses no em or en dash', (_, path) => {
    expect(readText(path).match(/[–—]/g)).toBeNull();
  });

  it.each(pages.map(({ slug, path }) => [slug, path]))('%s makes no claim the code cannot show', (_, path) => {
    expect(readText(path)).not.toMatch(/fully accessible|exactly as written|wysiwyg/i);
  });
});
