// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { describeBuilt, dist } from '../test/support/built-dist';
import * as yjs from './yjs';

describe('the yjs entry', () => {
  it('exports the Yjs adapter and the collaboration hook', () => {
    expect(Object.keys(yjs).sort()).toEqual(['applyRemote', 'collaborationExtension', 'yjsCollaboration']);
  });
});

// Two editors in plain Node, which has no DOM, as a worker or a server would run them.
const SYNC = `
  const Y = await import('yjs');
  const { createEditor, coreExtensions } = await import(process.env.QUOIN_ENGINE);
  const { yjsCollaboration, collaborationExtension } = await import(process.env.QUOIN_ENTRY);
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('this process has a DOM');
  const docs = [new Y.Doc(), new Y.Doc()];
  docs[0].on('update', (update) => Y.applyUpdate(docs[1], update));
  const open = (doc, blocks) => {
    const extensions = [...coreExtensions(), collaborationExtension(yjsCollaboration({ doc, user: { name: 'n' } }))];
    const editor = createEditor({ blocks, extensions, isMac: false });
    editor.mount();
    return editor;
  };
  const one = open(docs[0], [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'hello' } }]);
  const two = open(docs[1], []);
  const at = { block: 'a', region: 'text', offset: 5 };
  one.commands.setSelection({ kind: 'text', anchor: at, head: at });
  one.insertText('!');
  process.stdout.write(JSON.stringify(two.getBlocks()));`;

describeBuilt('the built yjs entry', ['yjs.js', 'engine.js'], () => {
  it('syncs two editors in Node without a DOM', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', SYNC], {
      encoding: 'utf8',
      cwd: resolve(__dirname, '..'),
      env: {
        ...process.env,
        QUOIN_ENTRY: pathToFileURL(resolve(dist, 'yjs.js')).href,
        QUOIN_ENGINE: pathToFileURL(resolve(dist, 'engine.js')).href,
      },
    });
    expect(JSON.parse(output)).toEqual([{ id: 'a', type: 'MARKDOWN', data: { markdown: 'hello!' } }]);
  });
});
