// @vitest-environment node
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { entryBundle } from './measure-size.mjs';

const root = resolve(__dirname, '..');
// The collaboration extension's name and its warning, and the class of a collaborator's caret, which no other code of
// the package holds.
const FEATURE = ['"collaboration"', 'the shared document', 'quoin-presence-caret'];

// An import of the package as esbuild writes it, and names only Yjs code holds.
const YJS = [/from\s*"yjs"|require\("yjs"\)|import\("yjs"\)/, /UndoManager|observeDeep|insertEmbed/];

describeBuilt('the built core entries', ['index.js', 'headless.js', 'engine.js', 'yjs.js'], () => {
  it('hold none of the collaboration hook or of presence', async () => {
    for (const name of ['index', 'headless', 'engine']) {
      const code = await entryBundle(root, name);
      for (const word of FEATURE) expect(code).not.toContain(word);
    }
  });

  it('neither import Yjs nor hold any of its code, which the yjs entry does', async () => {
    for (const name of ['index', 'headless', 'engine']) {
      const code = await entryBundle(root, name);
      for (const pattern of YJS) expect(code).not.toMatch(pattern);
    }
    const adapter = await entryBundle(root, 'yjs');
    for (const pattern of YJS) expect(adapter).toMatch(pattern);
  });
});
