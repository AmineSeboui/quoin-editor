import { describe, expect, it } from 'vitest';
import { inlineText } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { sameDoc } from '../engine/model/same-doc';
import { removeBlocksStep } from '../engine/transform/block-steps';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

const CODE: QuoinBlock = { id: 'k', type: 'CODE', data: { code: 'let x', language: '' } };
const DIVIDER: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };

function clients(blocks: QuoinBlock[]) {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', blocks);
  mesh.flush();
  const two = peer(mesh.docs[1], 'b');
  mesh.flush();
  return { ...mesh, one, two };
}

const lines = ({ editor }: Peer) =>
  editor.state.doc.blocks.map((block) => Object.values(block.regions).map((inline) => inlineText(inline)).join('|'));

const readsAsShown = ({ editor, collaboration }: Peer) =>
  sameDoc(readShared(collaboration.text, requiredRegions(editor.state.schema)).doc, editor.state.doc);

const remove = ({ editor }: Peer, id: string) => {
  const index = editor.state.doc.blocks.findIndex((block) => block.id === id);
  editor.dispatch(editor.createTransaction().step(removeBlocksStep(index, 1)));
};

describe('a block that gains its first region in place', () => {
  it('shows the stray text after it where every client reads it', () => {
    const { one, two, flush } = clients([md('p0', 'one'), CODE, DIVIDER, md('q', 'two'), md('r', 'end')]);
    remove(one, 'q');
    two.editor.commands.setSelection(caret('q', 3));
    two.editor.insertText('X');
    flush();
    one.editor.commands.setSelection({ kind: 'node', block: 'k' });
    expect(one.editor.commands.setBlockType('MARKDOWN', { kind: 'paragraph' })).toBe(true);
    expect(readsAsShown(one)).toBe(true);
    flush();
    expect(lines(one)).toEqual(lines(two));
    one.editor.commands.setSelection(caret('p0', 3));
    one.editor.insertText('!');
    flush();
    expect(lines(one)).toEqual(lines(two));
    expect([one, two].every(readsAsShown)).toBe(true);
  });

  it('shows the text nobody read while the document had no region where every client reads it', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('q', 'second'), DIVIDER]);
    remove(one, 'p');
    two.editor.commands.setSelection(caret('q', 0));
    two.editor.commands.deleteBackward();
    flush();
    one.editor.commands.setSelection({ kind: 'node', block: 'd' });
    expect(one.editor.commands.splitBlock()).toBe(true);
    expect(readsAsShown(one)).toBe(true);
    flush();
    expect(lines(one)).toEqual(lines(two));
    expect(lines(one)).toEqual(['', 'second']);
    expect([one, two].every(readsAsShown)).toBe(true);
  });
});
