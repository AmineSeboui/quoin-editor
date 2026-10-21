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
  it('moves what the other client typed in the moved tail along with it', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', 8));
    two.editor.insertText('ZZ');
    flush();
    expect(texts(one)).toEqual(['hello', ' woZZrld']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('moves what the other client typed at the end of the moved tail', () => {
    const { one, two, flush } = clients([md('p', 'hello world')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', 11));
    two.editor.insertText(' TYPED');
    flush();
    expect(texts(one)).toEqual(['hello', ' world TYPED']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });

  it('keeps a mark the other client set on the moved tail', () => {
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

  it('leaves what the other client typed at the end of a line split at its end', () => {
    const { one, two, flush } = clients([md('p', 'hello')]);
    one.editor.commands.setSelection(caret('p', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('p', 5));
    two.editor.insertText(' more');
    flush();
    expect(texts(one)).toEqual(['hello more', '']);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });
});
