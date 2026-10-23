import { describe, expect, it } from 'vitest';
import { inlineText, text } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { caret, md, range } from '../engine/test-support/editor-fixtures';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

function clients(blocks: QuoinBlock[]) {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', blocks);
  mesh.flush();
  const two = peer(mesh.docs[1], 'b');
  return { ...mesh, one, two };
}

const texts = ({ editor }: Peer) => editor.state.doc.blocks.map((block) => inlineText(block.regions.text));

describe('a split or a join while another client edits the same block', () => {
  it('leaves what the other client typed in the tail where it was typed', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', 8));
    two.editor.insertText('ZZ');
    flush();
    expect(texts(one)).toEqual(['hello', ' woZZrld']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('leaves what the other client typed at the end of the tail at its end', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', 11));
    two.editor.insertText(' TYPED');
    flush();
    expect(texts(one)).toEqual(['hello', ' world TYPED']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('keeps a mark the other client set on the tail', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(range('p', 6, 11));
    two.editor.commands.toggleMark('bold');
    flush();
    expect(one.editor.state.doc.blocks[1].regions.text).toEqual([text(' '), text('world', [{ type: 'bold' }])]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it.each([
    ['the first client splits earlier', 5, 8],
    ['the second client splits earlier', 8, 5],
  ])('splits once at each place when both split the block, %s', (_, first, second) => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', first));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', second));
    two.editor.commands.splitBlock();
    flush();
    expect(texts(one)).toEqual(['hello', ' wo', 'rld']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('keeps what the other client typed in a block joined to the one above', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('q', 'second')]);
    one.editor.commands.setSelection(caret('q', 0));
    one.editor.commands.deleteBackward();
    two.editor.commands.setSelection(caret('q', 6));
    two.editor.insertText(' TYPED');
    flush();
    expect(texts(one)).toEqual(['firstsecond TYPED']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('keeps what the other client typed at the start of a block joined to the one above at the join', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('q', 'second')]);
    one.editor.commands.setSelection(caret('q', 0));
    one.editor.commands.deleteBackward();
    two.editor.commands.setSelection(caret('q', 0));
    two.editor.insertText('NEW ');
    flush();
    expect(texts(one)).toEqual(['firstNEW second']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it.each([
    ['the client that splits comes first', 'one', ['hello', ' more']],
    ['the client that types comes first', 'two', ['hello more', '']],
  ] as const)('orders a split and typing at the same end of a line by client, %s', (_, splitter, expected) => {
    const { one, two, flush } = clients([md('p', 'hello')]);
    const [splits, types] = splitter === 'one' ? [one, two] : [two, one];
    splits.editor.commands.setSelection(caret('p', 5));
    splits.editor.commands.splitBlock();
    types.editor.commands.setSelection(caret('p', 5));
    types.editor.insertText(' more');
    flush();
    expect(texts(one)).toEqual(expected);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('moves the caret of the other client into the tail when its text goes there', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    two.editor.commands.setSelection(caret('p', 8));
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    flush();
    const tail = one.editor.state.doc.blocks[1].id;
    expect(two.editor.state.selection).toEqual(caret(tail, 3));
    two.editor.insertText('!');
    flush();
    expect(texts(one)).toEqual(['hello', ' wo!rld']);
  });

  it('writes Enter in a long paragraph as one small update', () => {
    const { docs, one } = clients([md('p', 'x'.repeat(5000))]);
    const updates: Uint8Array[] = [];
    docs[0].on('update', (update: Uint8Array) => updates.push(update));
    one.editor.commands.setSelection(caret('p', 10));
    one.editor.commands.splitBlock();
    expect(updates).toHaveLength(1);
    expect(updates[0].byteLength).toBeLessThan(160);
  });
});
