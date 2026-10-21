import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

const origins = (doc: Y.Doc) => {
  const seen: unknown[] = [];
  doc.on('update', (_update: Uint8Array, origin: unknown) => seen.push(origin));
  return seen;
};

describe('connecting an editor to a shared document', () => {
  it('seeds an empty document from the editor in one transaction, which cannot be undone', () => {
    const doc = new Y.Doc();
    const seen = origins(doc);
    const { editor, collaboration } = peer(doc, 'a', [md('a', 'hello'), md('b', '**bold**')]);
    expect(seen).toEqual([collaboration.origin]);
    expect(collaboration.blocks.toArray().map((block) => block.get('id'))).toEqual(['a', 'b']);
    expect(editor.can().undo()).toBe(false);
    expect(editor.commands.undo()).toBe(false);
  });

  it('replaces the editor document with a document that has content, in one remote change', () => {
    const { docs, flush } = linkedDocs();
    peer(docs[0], 'a', [md('a', 'shared')]);
    flush();
    const origins: string[] = [];
    const later = peer(docs[1], 'b', [md('x', 'mine')], { mount: false });
    later.editor.subscribe((_, tr) => origins.push(tr?.origin ?? 'none'));
    later.editor.mount();
    expect(later.editor.getBlocks()).toEqual([md('a', 'shared')]);
    expect(later.editor.can().undo()).toBe(false);
    expect(origins).toEqual(['remote']);
  });

  it('leaves an empty document empty without seeding, and empties the editor to match', () => {
    const doc = new Y.Doc();
    const { editor, collaboration } = peer(doc, 'a', [md('a', 'hello')], { seed: false });
    expect(collaboration.blocks.length).toBe(0);
    expect(editor.getBlocks()).toEqual([]);
  });

  it('keeps one copy of the starting blocks when two clients seed the same ones at once', () => {
    const { docs, flush } = linkedDocs();
    const one = peer(docs[0], 'a', [md('a', 'hello'), md('b', 'world')]);
    const two = peer(docs[1], 'b', [md('a', 'hello'), md('b', 'world')]);
    flush();
    expect(one.editor.getBlocks()).toEqual([md('a', 'hello'), md('b', 'world')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect(docs[0].getArray('quoin').length).toBe(2);
    expect(docs[1].getArray('quoin').toJSON()).toEqual(docs[0].getArray('quoin').toJSON());
  });

  it('catches up with what changed while it was disconnected when it connects again', () => {
    const { docs, flush } = linkedDocs();
    const one = peer(docs[0], 'a', [md('a', 'hello')]);
    flush();
    const two = peer(docs[1], 'b');
    two.unmount();
    one.editor.commands.setSelection({
      kind: 'text',
      anchor: { block: 'a', region: 'text', offset: 5 },
      head: { block: 'a', region: 'text', offset: 5 },
    });
    one.editor.insertText('!');
    flush();
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello')]);
    two.editor.mount();
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello!')]);
    one.editor.insertText('?');
    flush();
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello!?')]);
  });

  it('keeps the blocks in the array the field names', () => {
    const doc = new Y.Doc();
    peer(doc, 'a', [md('a', 'hello')], { field: 'notes' });
    expect(doc.getArray('notes').length).toBe(1);
    expect(doc.getArray('quoin').length).toBe(0);
  });
});
