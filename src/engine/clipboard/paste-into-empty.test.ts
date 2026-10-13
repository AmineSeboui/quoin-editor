import { describe, expect, it } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { historyPlugin, undo } from '../state/history';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { sliceFromSelection } from './extract-slice';
import { insertSlice } from './insert-slice';
import type { Slice } from './slice';

const nested: QuoinBlock = { id: 'n', type: 'MARKDOWN', data: { markdown: '- nested' }, indent: 1 };
const kid: QuoinBlock = { id: 'k', type: 'MARKDOWN', data: { markdown: '- kid' }, indent: 1 };
const SOURCE = ['# Title', '- **bold** item', nested, 'end para'];

function copiedFromStart(): Slice {
  const source = buildState(SOURCE, { anchor: { block: 0, offset: 0 }, head: { block: 3, offset: 8 } });
  return sliceFromSelection(source, createBlockCodec(source.schema))!;
}

describe('pasting into an empty text block', () => {
  it('keeps the type and indent of every copied block', () => {
    const state = buildState(['before', '', 'after'], { block: 1, offset: 0 });
    const done = run(state, insertSlice(copiedFromStart(), { newId: newIds('p') })).state;
    expect(markdownOf(done)).toEqual(['before', '# Title', '- **bold** item', '  - nested', 'end para', 'after']);
    expect(caretOf(done)).toEqual({ block: 4, offset: 8 });
  });

  it('replaces the empty block instead of leaving it behind', () => {
    const state = buildState([''], { block: 0, offset: 0 });
    const done = run(state, insertSlice(copiedFromStart(), { newId: newIds('p') })).state;
    expect(done.doc.blocks.map((block) => block.id)).not.toContain('b0');
    expect(done.doc.blocks).toHaveLength(4);
  });

  it('replaces an empty list item and keeps its children after the pasted blocks', () => {
    const state = buildState(['- ', kid], { block: 0, offset: 0 });
    const done = run(state, insertSlice(copiedFromStart(), { newId: newIds('p') })).state;
    expect(markdownOf(done)).toEqual(['# Title', '- **bold** item', '  - nested', 'end para', '  - kid']);
  });

  it('keeps the first block type when the slice is closed at the start', () => {
    const closed = { ...copiedFromStart(), openStart: false, openEnd: false };
    const done = run(buildState([''], { block: 0, offset: 0 }), insertSlice(closed, { newId: newIds('p') })).state;
    expect(markdownOf(done)).toEqual(['# Title', '- **bold** item', '  - nested', 'end para']);
  });

  it('keeps pasting one open paragraph into an empty heading as an inline paste', () => {
    const single: Slice = {
      blocks: [{ id: 's', type: 'MARKDOWN', data: { markdown: 'x **y**' } }],
      openStart: true,
      openEnd: true,
    };
    const done = run(buildState(['## '], { block: 0, offset: 0 }), insertSlice(single, { newId: newIds('p') })).state;
    expect(markdownOf(done)).toEqual(['## x **y**']);
  });

  it('is one undo step', () => {
    const before = buildState(['before', '', 'after'], { block: 1, offset: 0 }, { plugins: [historyPlugin()] });
    const done = run(before, insertSlice(copiedFromStart(), { newId: newIds('p') }));
    const undone = run(done.state, undo).state;
    expect(blocksOf(undone)).toEqual(blocksOf(before));
    expect(caretOf(undone)).toEqual({ block: 1, offset: 0 });
  });
});
