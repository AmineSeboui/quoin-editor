import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  BASE,
  builtPage,
  demoRoot,
  dist,
  docSlugs,
  DOCS_URL,
  expectedPages,
  hrefsOf,
  idsOf,
  mainText,
  readText,
  repoRoot,
  srcsOf,
} from './built-site.mjs';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const headingAnchor = (heading) =>
  heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');

const headingsOf = (markdown) =>
  markdown
    .replace(/```[\s\S]*?```/g, '')
    .split('\n')
    .filter((line) => /^#{1,6} /.test(line))
    .map((line) => line.replace(/^#+ /, ''));

const sources = [
  { name: 'README.md', path: join(repoRoot, 'README.md') },
  ...docSlugs().map((slug) => ({ name: `docs/${slug}.md`, path: join(demoRoot, 'docs', `${slug}.md`) })),
];

describe('links into the docs site', () => {
  const pattern = new RegExp(`${escapeRegExp(DOCS_URL)}([a-z0-9-]+)/(?:#([a-z0-9-]+))?`, 'g');
  for (const { name, path } of sources) {
    it(`from ${name} reach a built page and the heading they name`, () => {
      const broken = [...readText(path).matchAll(pattern)].filter(([, slug, anchor]) => {
        const html = builtPage(`docs/${slug}/`);
        return html === '' || (anchor !== undefined && !idsOf(html).has(anchor));
      });
      assert.deepEqual(broken.map(([link]) => link), []);
    });
  }
});

/** The file a link of the site points to, and the anchor it names. */
function target(href, from) {
  const [path, anchor] = href.split('#');
  if (path === '') return { file: join(dist, from, 'index.html'), anchor };
  const rest = path.slice(BASE.length);
  return { file: rest === '' || rest.endsWith('/') ? join(dist, rest, 'index.html') : join(dist, rest), anchor };
}

describe('links between the pages of the built site', () => {
  for (const from of expectedPages()) {
    it(`from /${from} reach a page or a file, and the anchor they name`, () => {
      const internal = hrefsOf(builtPage(from)).filter((href) => href.startsWith(BASE) || href.startsWith('#'));
      const broken = internal.filter((href) => {
        const { file, anchor } = target(href, from);
        if (!existsSync(file) || statSync(file).isDirectory()) return true;
        return anchor !== undefined && anchor !== '' && file.endsWith('.html') && !idsOf(readText(file)).has(anchor);
      });
      assert.deepEqual(broken, []);
    });
  }
});

describe('the addresses of the built site', () => {
  const relative = (address) => !/^([a-z][a-z\d+.-]*:|[#/])/i.test(address);
  for (const from of expectedPages()) {
    it(`on /${from} are none relative, and every picture and script of the site's own is there`, () => {
      const html = builtPage(from);
      const addresses = [...hrefsOf(html), ...srcsOf(html)];
      assert.deepEqual(addresses.filter(relative), []);
      const missing = srcsOf(html).filter((src) => src.startsWith(BASE) && !existsSync(join(dist, src.slice(BASE.length))));
      assert.deepEqual(missing, []);
    });
  }
});

describe('the pages drawn from markdown', () => {
  const drawn = [
    ...docSlugs().map((slug) => ({ page: `docs/${slug}/`, source: join(demoRoot, 'docs', `${slug}.md`) })),
    { page: 'migration/', source: join(repoRoot, 'MIGRATION.md') },
    { page: 'changelog/', source: join(repoRoot, 'CHANGELOG.md') },
  ];
  for (const { page, source } of drawn) {
    it(`/${page} gives every heading of its source the anchor GitHub gives it`, () => {
      const ids = idsOf(builtPage(page));
      const missing = headingsOf(readText(source))
        .map(headingAnchor)
        .filter((anchor) => !ids.has(anchor));
      assert.deepEqual(missing, []);
    });
  }

  it('/comparison/ draws the README table with its date and its sources', () => {
    const text = mainText(builtPage('comparison/'));
    const dated = /Sources, checked on (\d{4}-\d{2}-\d{2})/.exec(readText(join(repoRoot, 'README.md')));
    assert.ok(dated, 'the README dates its comparison');
    assert.ok(text.includes(`Sources, checked on ${dated[1]}`));
    assert.match(builtPage('comparison/'), /<div class="table-scroll"[^>]*><table>/);
  });
});
