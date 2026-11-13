import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  BASE,
  builtPage,
  dist,
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
  { name: 'MIGRATION.md', path: join(repoRoot, 'MIGRATION.md') },
];

describe('links to the documentation', () => {
  const old = DOCS_URL;
  for (const { name, path } of sources) {
    // The documentation is served from the one site now. A link written here should go there rather than to
    // the notice left behind, which still works but costs the reader a redirect to read the next page.
    it(`from ${name} go to the site that serves it`, () => {
      const stale = [...readText(path).matchAll(new RegExp(`${escapeRegExp(old)}[a-z0-9-]+/`, 'g'))];
      assert.deepEqual(stale.map(([link]) => link), []);
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
