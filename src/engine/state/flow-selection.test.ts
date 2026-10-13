import { describe, expect, it } from 'vitest';
import { insertText } from '../commands/insert-text';
import type { Pos } from '../model/types';
import { blocksOf, buildState, newIds, run } from '../test-support/build-state';
import { blockRangeSelection, textSelection, validateSelection } from './selection';

const image = { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: '', caption: 'cap' } };
const table = { id: 't', type: 'TABLE', data: { rows: [['ab', 'cd']] } };
const caption = (offset: number): Pos => ({ block: 'b0', region: 'caption', offset });
const text = (block: number, offset: number): Pos => ({ block: `b${block}`, region: 'text', offset });

describe('a text selection across blocks only ends in flow regions', () => {
  it('leaves an image alone when typing over a selection that starts in its caption', () => {
    const state = buildState([image, 'para'], { anchor: { block: 0, region: 'caption', offset: 2 }, head: { block: 1, offset: 1 } });
    const { state: next } = run(state, insertText('x', { newId: newIds() }));
    expect(blocksOf(next).map((block) => block.data)).toEqual([
      { storageKey: 'k', alt: '', caption: 'cap' },
      { markdown: 'xara' },
    ]);
  });

  it('moves an end in a structured region to the nearest flow position inside the selection', () => {
    const { doc, schema } = buildState([image, 'para', table]);
    const cell: Pos = { block: 'b2', region: 'cell:0:1', offset: 1 };
    expect(validateSelection(doc, schema, textSelection(caption(2), text(1, 1)))).toEqual(textSelection(text(1, 0), text(1, 1)));
    expect(validateSelection(doc, schema, textSelection(text(1, 3), caption(1)))).toEqual(textSelection(text(1, 3), text(1, 0)));
    expect(validateSelection(doc, schema, textSelection(text(1, 1), cell))).toEqual(textSelection(text(1, 1), text(1, 4)));
    expect(validateSelection(doc, schema, textSelection(cell, caption(0)))).toEqual(textSelection(text(1, 4), text(1, 0)));
  });

  it('selects the blocks themselves when no flow region lies between the two ends', () => {
    const { doc, schema } = buildState([image, table]);
    const cell: Pos = { block: 'b1', region: 'cell:0:0', offset: 1 };
    expect(validateSelection(doc, schema, textSelection(caption(1), cell))).toEqual(blockRangeSelection('b0', 'b1'));
  });

  it('keeps a selection across the cells of one table', () => {
    const { doc, schema } = buildState([table]);
    const across = textSelection({ block: 'b0', region: 'cell:0:0', offset: 1 }, { block: 'b0', region: 'cell:0:1', offset: 1 });
    expect(validateSelection(doc, schema, across)).toBe(across);
  });
});
