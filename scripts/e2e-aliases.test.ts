// @vitest-environment node
import { resolve } from 'node:path';
import { builtAliases, entryAliases } from '../e2e/vite.config';
import { MAIN_ENTRY, packageEntries } from './package-entries.mjs';

const root = resolve(__dirname, '..');
const resolvedBy = (aliases: typeof entryAliases) => (specifier: string) =>
  aliases.find(({ find }) => find.test(specifier))?.replacement;
const specifierOf = (name: string) => (name === MAIN_ENTRY ? 'quoin-editor' : `quoin-editor/${name}`);

describe('the e2e harness', () => {
  it('resolves every entry of the package to the source it is built from', () => {
    const resolved = resolvedBy(entryAliases);
    for (const { name, source } of packageEntries) expect(resolved(specifierOf(name))).toBe(resolve(root, source));
    expect(resolved('quoin-editor/view')).toBe(resolve(root, 'src/view-static/index.ts'));
    expect(resolved('quoin-editor/src/view')).toBeUndefined();
  });

  it('resolves every entry of the package to its built module when it serves the build', () => {
    const resolved = resolvedBy(builtAliases);
    for (const { name } of packageEntries) expect(resolved(specifierOf(name))).toBe(resolve(root, `dist/${name}.js`));
    expect(resolved('quoin-editor/src/view')).toBeUndefined();
  });
});
