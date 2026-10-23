import { describe, expect, it } from 'vitest';
import { inlineText, text } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { removeBlocksStep, replaceBlockStep } from '../engine/transform/block-steps';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

const LINE = md('line', 'hello world');
const TABLE: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['a', 'b'], ['c', 'd']], header: true } };
const DIVIDER: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };

function clients(blocks: QuoinBlock[], { seedBoth = false } = {}) {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', blocks);
  if (!seedBoth) mesh.flush();
  const two = peer(mesh.docs[1], 'b', seedBoth ? blocks : []);
  mesh.flush();
  return { ...mesh, one, two };
}

function addRow({ editor }: Peer): void {
  const table = editor.state.doc.blocks.find((block) => block.type === 'TABLE')!;
  const regions = { ...table.regions, 'cell:2:0': [], 'cell:2:1': [] };
  const step = replaceBlockStep({ ...table, attrs: { ...table.attrs, rows: 3 }, regions });
  editor.dispatch(editor.createTransaction().step(step));
}

const at = (peer: Peer, id: string) => peer.editor.state.doc.blocks.findIndex((block) => block.id === id);

const triggers: [string, QuoinBlock[], (one: Peer, two: Peer) => void, { seedBoth?: boolean }?][] = [
  [
    'two clients move one block at once',
    [md('p0', 'zero'), md('p1', 'one'), LINE],
    (one, two) => {
      for (const { editor } of [one, two]) {
        editor.commands.setSelection(caret('p0', 0));
        editor.commands.moveBlocksDown();
      }
    },
  ],
  ['two clients add the same table row at once', [TABLE, LINE], (one, two) => [one, two].forEach(addRow)],
  ['two clients seed one empty document at once', [md('p0', 'zero'), LINE], () => undefined, { seedBoth: true }],
  [
    'one client deletes a line after a divider while the other types in it',
    [md('p0', 'one'), DIVIDER, md('q', 'two'), LINE],
    (one, two) => {
      one.editor.dispatch(one.editor.createTransaction().step(removeBlocksStep(at(one, 'q'), 1)));
      two.editor.commands.setSelection(caret('q', 3));
      two.editor.insertText('X');
    },
  ],
  [
    'one client deletes the first line while the other joins the second into it',
    [md('p0', 'first'), md('q', 'second'), md('r', 'third'), LINE],
    (one, two) => {
      one.editor.dispatch(one.editor.createTransaction().step(removeBlocksStep(0, 1)));
      two.editor.commands.setSelection(caret('q', 0));
      two.editor.commands.deleteBackward();
    },
  ],
];

describe('a split or join in one block of a text another edit left out of shape', () => {
  it.each(triggers)('keeps typing where it was typed after %s', (_, blocks, trigger, options) => {
    const { one, two, flush } = clients(blocks, options);
    trigger(one, two);
    flush();
    expect(readShared(one.collaboration.text).layout.clean).toBe(false);
    one.editor.commands.setSelection(caret('line', 5));
    one.editor.commands.splitBlock();
    two.editor.commands.setSelection(caret('line', 8));
    two.editor.insertText('ZZ');
    flush();
    const lines = one.editor.state.doc.blocks.map((block) => inlineText(block.regions.text ?? []));
    expect(lines.slice(at(one, 'line'), at(one, 'line') + 2)).toEqual(['hello', ' woZZrld']);
    one.editor.commands.setSelection(caret(one.editor.state.doc.blocks[at(one, 'line') + 1].id, 0));
    one.editor.commands.deleteBackward();
    two.editor.commands.setSelection(caret('line', 5));
    two.editor.insertText('!');
    flush();
    expect(one.editor.state.doc.blocks[at(one, 'line')].regions.text).toEqual([text('hello! woZZrld')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });
});

describe('a block taken out right after a copy of a block two clients moved at once', () => {
  it('keeps what another client typed in it, in the region before it', () => {
    const { one, two, flush } = clients([md('p0', 'zero'), md('q', 'two'), md('r', 'gone')]);
    for (const { editor } of [one, two]) {
      editor.commands.setSelection(caret('p0', 0));
      editor.commands.moveBlocksDown();
    }
    flush();
    one.editor.dispatch(one.editor.createTransaction().step(removeBlocksStep(at(one, 'r'), 1)));
    two.editor.commands.setSelection(caret('r', 0));
    two.editor.insertText('X');
    flush();
    expect(one.editor.getBlocks()).toEqual([md('q', 'two'), md('p0', 'zeroX')]);
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
  });
});
