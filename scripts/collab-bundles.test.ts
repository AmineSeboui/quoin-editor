// @vitest-environment node
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { entryBundle } from './measure-size.mjs';

const root = resolve(__dirname, '..');
// The collaboration extension's name and its warning, which no other code of the package holds.
const FEATURE = ['"collaboration"', 'the shared document'];

describeBuilt('the built core entries', ['index.js', 'headless.js', 'engine.js'], () => {
  it('hold none of the collaboration hook', async () => {
    for (const name of ['index', 'headless', 'engine']) {
      const code = await entryBundle(root, name);
      for (const word of FEATURE) expect(code).not.toContain(word);
    }
  });
});
