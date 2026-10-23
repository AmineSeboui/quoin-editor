import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  builtPage,
  canonicalOf,
  count,
  dist,
  expectedPages,
  mainText,
  metaOf,
  pngSize,
  readText,
  SITE_URL,
  titleOf,
} from './built-site.mjs';

const pages = expectedPages().map((path) => ({ path, html: builtPage(path) }));

describe('every page of the built site', () => {
  for (const { path, html } of pages) {
    describe(`/${path}`, () => {
      it('is built', () => assert.notEqual(html, '', `no ${join(dist, path, 'index.html')}`));

      it('has a title, a description and its canonical address', () => {
        assert.notEqual(titleOf(html), '');
        assert.ok(metaOf(html, 'name', 'description').length >= 50, 'a description of 50 characters or more');
        assert.equal(canonicalOf(html), SITE_URL + path);
      });

      it('has Open Graph and Twitter tags with the shared picture', () => {
        assert.equal(metaOf(html, 'property', 'og:title'), titleOf(html));
        assert.equal(metaOf(html, 'property', 'og:description'), metaOf(html, 'name', 'description'));
        assert.equal(metaOf(html, 'property', 'og:url'), SITE_URL + path);
        assert.equal(metaOf(html, 'property', 'og:image'), `${SITE_URL}og.png`);
        assert.equal(metaOf(html, 'property', 'og:image:width'), '1280');
        assert.equal(metaOf(html, 'property', 'og:image:height'), '640');
        assert.equal(metaOf(html, 'name', 'twitter:card'), 'summary_large_image');
        assert.equal(metaOf(html, 'name', 'twitter:image'), `${SITE_URL}og.png`);
      });

      it('has one h1, one main and a skip link to it', () => {
        assert.equal(count(html, /<h1[\s>]/g), 1);
        assert.equal(count(html, /<main[\s>]/g), 1);
        assert.match(html, /<a class="skip-link" href="#content">/);
        assert.match(html, /<main id="content"/);
      });

      it('carries its main content in the HTML, drawn at build time', () => {
        assert.ok(mainText(html).length > 300, `only ${mainText(html).length} characters of text in main`);
      });

      it('names the language and the favicon', () => {
        assert.match(html, /<html lang="en">/);
        assert.match(html, /<link rel="icon" href="\/quoin-editor\/favicon.svg"/);
      });
    });
  }

  it('each have a title and a description of their own', () => {
    const built = pages.filter(({ html }) => html !== '');
    assert.equal(new Set(built.map(({ html }) => titleOf(html))).size, built.length);
    assert.equal(new Set(built.map(({ html }) => metaOf(html, 'name', 'description'))).size, built.length);
  });
});

describe('the files search engines and link previews read', () => {
  it('lists every page in the sitemap', () => {
    const sitemap = existsSync(join(dist, 'sitemap.xml')) ? readText(join(dist, 'sitemap.xml')) : '';
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
    assert.deepEqual(listed.sort(), expectedPages().map((path) => SITE_URL + path).sort());
  });

  it('points robots.txt at the sitemap', () => {
    const robots = existsSync(join(dist, 'robots.txt')) ? readText(join(dist, 'robots.txt')) : '';
    assert.match(robots, new RegExp(`^Sitemap: ${SITE_URL}sitemap.xml$`, 'm'));
  });

  it('ships a 1280 by 640 og.png and a favicon', () => {
    assert.ok(existsSync(join(dist, 'og.png')), 'no og.png');
    assert.deepEqual(pngSize(join(dist, 'og.png')), { width: 1280, height: 640 });
    assert.ok(existsSync(join(dist, 'favicon.svg')), 'no favicon.svg');
  });
});
