import { describe, expect, it } from 'vitest';
import type * as Y from 'yjs';
import type { QuoinBlock } from '../engine/model/quoin-block';
import type { Transaction } from '../engine/state/transaction';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer } from './test-support/peers';

const paragraphs = (count: number) => Array.from({ length: count }, (_, i) => md(`p${i}`, `Paragraph ${i}`));

function twoPeers(blocks: QuoinBlock[]) {
  const link = linkedDocs();
  const one = peer(link.docs[0], 'a', blocks);
  link.flush();
  const two = peer(link.docs[1], 'b');
  return { ...link, one, two };
}

describe('an editor synced through a shared document', () => {
  it('writes a keystroke as one small transaction on the text of its block alone', () => {
    const { docs, one, flush } = twoPeers(paragraphs(1000));
    const changed: unknown[] = [];
    const updates: Uint8Array[] = [];
    docs[1].getArray('quoin').observeDeep((events) => changed.push(...events.map((event) => event.target)));
    docs[0].on('update', (update: Uint8Array) => updates.push(update));
    one.editor.commands.setSelection(caret('p500', 3));
    one.editor.insertText('x');
    flush();
    const text = (docs[1].getArray<Y.Map<unknown>>('quoin').get(500).get('regions') as Y.Map<Y.Text>).get('text');
    expect(changed).toEqual([text]);
    expect(updates).toHaveLength(1);
    expect(updates[0].byteLength).toBeLessThan(64);
  });

  it('applies a remote keystroke as one remote transaction of one step', () => {
    const { one, two, flush } = twoPeers(paragraphs(3));
    const seen: Transaction[] = [];
    two.editor.subscribe((_, tr) => tr && seen.push(tr));
    one.editor.commands.setSelection(caret('p1', 0));
    one.editor.insertText('x');
    flush();
    expect(seen.map((tr) => [tr.origin, tr.addToHistory, tr.steps.map((step) => step.stepType)])).toEqual([
      ['remote', false, ['replaceInline']],
    ]);
    expect(two.editor.getBlocks()[1]).toEqual(md('p1', 'xParagraph 1'));
  });

  it('carries the local caret over a remote insertion before it', () => {
    const { one, two, flush } = twoPeers([md('a', 'hello')]);
    two.editor.commands.setSelection(caret('a', 3));
    one.editor.commands.setSelection(caret('a', 0));
    one.editor.insertText('XY');
    flush();
    expect(two.editor.state.selection).toEqual(caret('a', 5));
  });

  it('converges when two clients move the same block at once, keeping one copy of it', () => {
    const { one, two, flush } = twoPeers(paragraphs(4));
    one.editor.commands.setSelection(caret('p1', 0));
    one.editor.commands.moveBlocksDown();
    two.editor.commands.setSelection(caret('p1', 0));
    two.editor.commands.moveBlocksUp();
    flush();
    const ids = one.editor.getBlocks().map((block) => block.id);
    expect(ids.slice().sort()).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('loses an edit made inside a block another client moves at the same time, and still converges', () => {
    const { one, two, flush } = twoPeers(paragraphs(3));
    one.editor.commands.setSelection(caret('p0', 0));
    one.editor.commands.moveBlocksDown();
    two.editor.commands.setSelection(caret('p0', 0));
    two.editor.insertText('lost ');
    flush();
    expect(one.editor.getBlocks().map((block) => block.id)).toEqual(['p1', 'p0', 'p2']);
    expect(one.editor.getBlocks()[1]).toEqual(md('p0', 'Paragraph 0'));
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('keeps blocks and marks the local schema does not know through a remote edit', () => {
    const unknown: QuoinBlock = { id: 'u', type: 'X_FROM_A_PLUGIN', data: { deep: { list: [1, 'two'] } } };
    const { one, two, flush } = twoPeers([md('a', 'hello'), unknown]);
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello'), unknown]);
    one.editor.commands.setSelection(caret('a', 5));
    one.editor.insertText('!');
    flush();
    expect(two.editor.getBlocks()).toEqual([md('a', 'hello!'), unknown]);
  });
});
