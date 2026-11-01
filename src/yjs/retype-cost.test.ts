import { describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { caret, md } from '../engine/test-support/editor-fixtures';
import type * as DocShape from './doc-shape';
import { linkedDocs, peer } from './test-support/peers';

const BLOCKS = 1_000;
const markersRead = vi.hoisted(() => new Set<unknown>());

vi.mock('./doc-shape', async (importOriginal) => {
  const original = await importOriginal<typeof DocShape>();
  return {
    ...original,
    readMarker: (marker: Y.Map<unknown>) => {
      markersRead.add(marker);
      return original.readMarker(marker);
    },
  };
});

describe('a type change by another client in a long document', () => {
  it('reads that block alone, as typing reads none, where reading the whole text again reads every block', () => {
    const { docs, flush, deliver } = linkedDocs();
    const blocks = Array.from({ length: BLOCKS }, (_, i) => md(`b${i}`, `line ${i} of text`));
    const one = peer(docs[0], 'a', blocks);
    flush();
    const two = peer(docs[1], 'b');
    const { editor } = one;
    const blocksRead = (change: () => void) => {
      change();
      markersRead.clear();
      deliver(1);
      return markersRead.size;
    };
    const typing = blocksRead(() => {
      editor.commands.setSelection(caret(`b${BLOCKS / 2}`, 0));
      editor.insertText('x');
    });
    const retype = (...args: Parameters<typeof editor.commands.setBlockType>) =>
      blocksRead(() => {
        editor.commands.setSelection({ kind: 'node', block: `b${BLOCKS / 2 + 1}` });
        editor.commands.setBlockType(...args);
      });
    const retyping = [retype('TOGGLE'), retype('CODE'), retype('MARKDOWN', { kind: 'paragraph' })];
    const { text } = one.collaboration;
    const markers = (text.toDelta() as { insert: unknown }[]).filter(({ insert }) => insert instanceof Y.Map);
    const last = markers[markers.length - 1].insert as Y.Map<unknown>;
    // A marker's new id, which another writer could set, reads the whole text again.
    const rereading = blocksRead(() => text.doc!.transact(() => last.set('id', 'z')));
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect(typing).toBe(0);
    expect(retyping).toEqual([1, 1, 1]);
    expect(rereading).toBe(BLOCKS);
  });
});
