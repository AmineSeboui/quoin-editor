import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { builtPage, canonicalOf, dist, idsOf, metaOf, ownPages, readText, titleOf } from './built-site.mjs';

const indexFile = join(dist, 'search-index.json');
const records = existsSync(indexFile) ? JSON.parse(readText(indexFile)) : [];
const pages = new Set(ownPages());

describe('the search index', () => {
  it('is built', () => assert.ok(records.length > 0, `no ${indexFile}`));

  it('covers every page of the site', () =>
    assert.deepEqual([...pages].filter((path) => !records.some((record) => record.path === path)), []));

  it('sends every result to a page that exists', () =>
    assert.deepEqual(records.filter(({ path }) => !pages.has(path)).map(({ path }) => path), []));

  it('sends every result with an anchor to an id that page has', () => {
    const missing = records
      .filter(({ id }) => id)
      .filter(({ path, id }) => !idsOf(builtPage(path)).has(id))
      .map(({ path, id }) => `${path}#${id}`);
    assert.deepEqual(missing, []);
  });

  it('gives every record text to match on', () =>
    assert.deepEqual(records.filter(({ text }) => !text?.trim()).map(({ path }) => path), []));

  it('splits a long page into sections rather than indexing it whole', () => {
    const changelog = records.filter(({ path }) => path === 'changelog/');
    assert.ok(changelog.length > 3, `the changelog is ${changelog.length} record(s), not its sections`);
  });
});

describe('the 404 page', () => {
  const html = existsSync(join(dist, '404.html')) ? readText(join(dist, '404.html')) : '';

  it('is built at the root of the site', () => assert.notEqual(html, '', 'no dist/404.html'));

  it('asks not to be indexed, and claims no canonical address', () => {
    assert.equal(metaOf(html, 'name', 'robots'), 'noindex');
    assert.equal(canonicalOf(html), '');
  });

  it('is titled and carries the site nav', () => {
    assert.match(titleOf(html), /Page not found/);
    assert.match(html, /class="site-nav"/);
  });

  it('is left out of the sitemap', () =>
    assert.doesNotMatch(readText(join(dist, 'sitemap.xml')), /404/));
});
