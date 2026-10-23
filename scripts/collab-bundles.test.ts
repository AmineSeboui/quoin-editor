// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { entryBundle } from './measure-size.mjs';

const root = resolve(__dirname, '..');
// The collaboration extension's name and its warning, `applyRemote`'s transaction, and the class of a collaborator's
// caret, which no other code of the package holds.
const FEATURE = ['"collaboration"', 'the shared document', 'setOrigin("remote")', 'quoin-presence-caret'];

// An import of the package as esbuild writes it, and names only Yjs code holds.
const YJS = [/from\s*"yjs"|require\("yjs"\)|import\("yjs"\)/, /UndoManager|observeDeep|insertEmbed/];

// Every module a built file loads, following its own chunks, as a bundler would.
function importGraph(file: string, seen = new Set<string>()): string[] {
  if (seen.has(file)) return [];
  seen.add(file);
  const code = readFileSync(resolve(root, 'dist', file), 'utf8');
  return [...code.matchAll(/^(?:import|export)\b[^"]*?"([^"]+)";$/gm)].flatMap(([, from]) =>
    from.startsWith('./') ? importGraph(from.slice(2), seen) : [from],
  );
}

describeBuilt('the built core entries', ['index.js', 'headless.js', 'engine.js', 'yjs.js', 'presence.js'], () => {
  it('leave the Yjs adapter free of React and of the canvas, which presence brings', () => {
    expect(importGraph('yjs.js').filter((from) => from !== 'yjs')).toEqual([]);
    expect(importGraph('presence.js')).toContain('react');
  });

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
    expect(adapter).toContain('setOrigin("remote")');
  });
});
