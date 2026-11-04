import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { MAIN_ENTRY, packageEntries } from '../../scripts/package-entries.mjs';
import { demoRoot, readText, repoRoot } from './built-site.mjs';

const api = readText(join(demoRoot, 'docs', 'api.md'));
const readme = readText(join(repoRoot, 'README.md'));
const exported = Object.keys(JSON.parse(readText(join(repoRoot, 'package.json'))).exports);

const subpaths = packageEntries.filter(({ name }) => name !== MAIN_ENTRY).map(({ name }) => name);

describe('the Exports page', () => {
  for (const name of subpaths) {
    it(`names quoin-editor/${name}`, () =>
      assert.ok(api.includes(`quoin-editor/${name}`), `demo/docs/api.md never mentions quoin-editor/${name}`));
  }

  it('names the main entry', () => assert.ok(api.includes('`quoin-editor`')));

  it('names the stylesheet', () => assert.ok(api.includes('quoin-editor/styles.css')));
});

describe('the README', () => {
  for (const name of subpaths) {
    it(`names /${name} in what ships`, () =>
      assert.ok(
        readme.includes(`quoin-editor/${name}`) || readme.includes(`\`/${name}\``),
        `README.md never mentions the ${name} entry`,
      ));
  }
});

describe('package.json exports', () => {
  it('matches the entry list the build and the docs read', () =>
    assert.deepEqual(
      exported.filter((key) => key !== '.' && key !== './styles.css' && key !== './package.json').sort(),
      subpaths.map((name) => `./${name}`).sort(),
    ));
});
