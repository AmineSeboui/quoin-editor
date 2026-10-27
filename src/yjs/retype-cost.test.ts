import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

const BLOCKS = 20_000;

function median(run: () => void, prepare: (i: number) => void): number {
  const times: number[] = [];
  for (let i = 0; i < 9; i++) {
    prepare(i);
    const start = performance.now();
    run();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[4];
}

describe('a type change by another client in a long document', () => {
  it('costs about what typing does, far less than reading the whole text again', () => {
    const { docs, flush, deliver } = linkedDocs();
    const blocks = Array.from({ length: BLOCKS }, (_, i) => md(`b${i}`, `line **${i}** of text`));
    const one = peer(docs[0], 'a', blocks);
    flush();
    const two = peer(docs[1], 'b');
    const { editor } = one;
    const typing = median(
      () => deliver(1),
      (i) => {
        editor.commands.setSelection(caret(`b${BLOCKS / 2}`, i));
        editor.insertText('x');
      },
    );
    const retyping = median(
      () => deliver(1),
      (i) => {
        editor.commands.setSelection({ kind: 'node', block: `b${BLOCKS / 2 + 1}` });
        if (i % 2 === 0) editor.commands.setBlockType('CODE');
        else editor.commands.setBlockType('MARKDOWN', { kind: 'paragraph' });
      },
    );
    const { text } = one.collaboration;
    const markers = (text.toDelta() as { insert: unknown }[]).filter(({ insert }) => insert instanceof Y.Map);
    const last = markers[markers.length - 1].insert as Y.Map<unknown>;
    // A marker's new id, which another writer could set, reads the whole text again.
    const rereading = median(
      () => deliver(1),
      (i) => text.doc!.transact(() => last.set('id', `z${i}`)),
    );
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect(retyping).toBeLessThan(typing * 3);
    expect(retyping * 2).toBeLessThan(rereading);
  }, 120_000);
});
