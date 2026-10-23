// @vitest-environment node
import { resolve } from 'node:path';
import { entryAliases } from '../e2e/vite.config';
import { MAIN_ENTRY, packageEntries } from './package-entries.mjs';

const root = resolve(__dirname, '..');
const resolved = (specifier: string) => entryAliases.find(({ find }) => find.test(specifier))?.replacement;

describe('the e2e harness', () => {
  it('resolves every entry of the package to the source it is built from', () => {
    for (const { name, source } of packageEntries) {
      const specifier = name === MAIN_ENTRY ? 'quoin-editor' : `quoin-editor/${name}`;
      expect(resolved(specifier)).toBe(resolve(root, source));
    }
    expect(resolved('quoin-editor/view')).toBe(resolve(root, 'src/view-static/index.ts'));
    expect(resolved('quoin-editor/src/view')).toBeUndefined();
  });
});
