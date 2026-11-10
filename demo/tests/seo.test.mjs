import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { SITE_URL, builtPage, canonicalOf, count, dist, expectedPages, mainText, metaOf, movedPages, ownPages, pngSize, readText, titleOf } from './built-site.mjs';

// The pages this site draws. A documentation address is a notice now, checked on its own below.
const pages = ownPages().map((path) => ({ path, html: builtPage(path) }));

describe('every page of the built site', () => {
  for (const { path, html } of pages) {
    describe(`/${path}`, () => {
      it('is built', () => assert.notEqual(html, '', `no ${join(dist, path, 'index.html')}`));

      it('has a title, a description and its canonical address', () => {
        assert.notEqual(titleOf(html), '');
        assert.ok(metaOf(html, 'name', 'description').length >= 50, 'a description of 50 characters or more');
        assert.equal(canonicalOf(html), SITE_URL + path);
      });

      it('says in its title that Quoin is a markdown editor', () => {
        assert.match(titleOf(html), /markdown editor/i);
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

describe('the structured data of the home page', () => {
  const blocks = [...builtPage('').matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)];
  const graph = blocks.length === 1 ? JSON.parse(blocks[0][1])['@graph'] : [];
  const ofType = (type) => graph.find((node) => node['@type'] === type) ?? {};

  it('names the site Quoin, also known by its package name', () => {
    assert.equal(blocks.length, 1, 'one JSON-LD block');
    assert.deepEqual(ofType('WebSite'), { '@type': 'WebSite', name: 'Quoin', alternateName: 'quoin-editor', url: SITE_URL });
  });

  it('describes the package as source code with its repository, its npm page and its licence', () => {
    const code = ofType('SoftwareSourceCode');
    assert.equal(code.codeRepository, 'https://github.com/AmineSeboui/quoin-editor');
    assert.deepEqual(code.sameAs, [code.codeRepository, 'https://www.npmjs.com/package/quoin-editor']);
    assert.equal(code.license, 'https://opensource.org/licenses/MIT');
    assert.equal(code.description, metaOf(builtPage(''), 'name', 'description'));
  });

  it('is left off the other pages', () => {
    for (const path of ownPages().filter((path) => path !== '')) {
      assert.doesNotMatch(builtPage(path), /application\/ld\+json/, `/${path}`);
    }
  });
});

describe('the files search engines and link previews read', () => {
  it('lists every page this site owns in the sitemap, and nothing it has given away', () => {
    const sitemap = existsSync(join(dist, 'sitemap.xml')) ? readText(join(dist, 'sitemap.xml')) : '';
    const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
    assert.deepEqual(listed.sort(), ownPages().map((path) => SITE_URL + path).sort());
  });

  // Every one of these addresses has been linked to for a year. They stay, and they say where they went.
  it('leaves each documentation address as a notice pointing at the page that now holds it', () => {
    for (const path of movedPages()) {
      const slug = path.slice('docs/'.length, -1);
      const html = builtPage(path);
      const to = `https://quoincloud.com/docs/editor/${slug}`;
      assert.match(html, new RegExp(`<link rel="canonical" href="${to}">`), path);
      assert.match(html, new RegExp(`http-equiv="refresh" content="0; url=${to}"`), path);
      assert.match(html, /This page has moved/, path);
    }
  });

  it('points robots.txt at the sitemap', () => {
    const robots = existsSync(join(dist, 'robots.txt')) ? readText(join(dist, 'robots.txt')) : '';
    assert.match(robots, new RegExp(`^Sitemap: ${SITE_URL}sitemap.xml$`, 'm'));
  });

  // Search Console re-reads this file to keep the site verified, so removing it loses the owner's access.
  it('ships the Google Search Console verification file', () => {
    const file = 'googleced1a4c00a4650ee.html';
    const text = existsSync(join(dist, file)) ? readText(join(dist, file)) : '';
    assert.equal(text, `google-site-verification: ${file}`);
  });

  it('ships a 1280 by 640 og.png and a favicon', () => {
    assert.ok(existsSync(join(dist, 'og.png')), 'no og.png');
    assert.deepEqual(pngSize(join(dist, 'og.png')), { width: 1280, height: 640 });
    assert.ok(existsSync(join(dist, 'favicon.svg')), 'no favicon.svg');
  });
});
