import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalogue } from '../src/catalogue';
import { coreBlockSpecs } from '../src/engine';
import type { ExtensionUI } from '../src/extensions/ui-types';

const readme = readFileSync(resolve(__dirname, '..', 'README.md'), 'utf8');
const samples = [...readme.matchAll(/```tsx?\n([\s\S]*?)```/g)].map(([, code]) => code);
const definitions = samples.flatMap((code) =>
  [...code.matchAll(/defineBlock(?:<[^>]*>)?\(\{\s*type: '([^']+)',\s*label: '([^']+)'/g)].map(([, type, label]) => ({
    type,
    label,
  })),
);

// A host copying a sample next to the catalogue would otherwise find its block drawn by a feature, or listed twice.
describe('the custom blocks of the README samples', () => {
  it('each take a type no built-in or opt-in block has', () => {
    expect(definitions.length).toBeGreaterThan(0);
    const builtIn = new Set(coreBlockSpecs.map(({ type }) => type));
    expect(definitions.filter(({ type }) => builtIn.has(type))).toEqual([]);
  });

  it('each take a name no command of an opt-in feature has', () => {
    const titles = catalogue().flatMap(({ ui }) => (ui as ExtensionUI).slashItems?.map(({ title }) => title) ?? []);
    const commands = new Set(titles);
    expect(definitions.filter(({ label }) => commands.has(label))).toEqual([]);
  });
});
