import { describe, expect, it } from 'vitest';
import { createBlockCodec } from '../blocks/codec';
import type { Command } from '../commands/command';
import type { QuoinBlock } from '../model/quoin-block';
import { historyPlugin, undo } from '../state/history';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { sliceFromSelection } from './extract-slice';
import { insertSlice } from './insert-slice';
import { sliceToClipboard } from './serialize-slice';
import type { Slice } from './slice';
import { sliceFromClipboard } from './slice-from-clipboard';

type Entries = Parameters<typeof buildState>[0];
type Selection = Parameters<typeof buildState>[1];

const slice = (markdown: string[], open = true): Slice => ({
  blocks: markdown.map((m, i) => ({ id: `s${i}`, type: 'MARKDOWN', data: { markdown: m } })),
  openStart: open,
  openEnd: open,
});
const closed = (blocks: readonly QuoinBlock[]): Slice => ({ blocks, openStart: false, openEnd: false });
const paste = (blocks: Entries, selection: Selection, pasted: Slice) =>
  run(buildState(blocks, selection), insertSlice(pasted, { newId: newIds('p') })).state;
const caret = (block: number, offset: number) => ({ block, offset });
const range = (from: [number, number], to: [number, number]) => ({
  anchor: caret(...from),
  head: caret(...to),
});
const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['abc', 'def']], header: false } };

describe('insertSlice at a caret', () => {
  it('merges the open start and appends closed blocks at the end of a block', () => {
    const state = paste(['abc'], caret(0, 3), slice(['X', '- Y']));
    expect(markdownOf(state)).toEqual(['abcX', '- Y']);
    expect(caretOf(state)).toEqual(caret(1, 1));
  });

  it('puts closed blocks before the block at its start and joins the open end', () => {
    const state = paste(['abc'], caret(0, 0), slice(['X', '- Y', 'Z']));
    expect(markdownOf(state)).toEqual(['X', '- Y', 'Zabc']);
    expect(caretOf(state)).toEqual(caret(2, 1));
    const closedOnly = paste(['abc'], caret(0, 0), closed(slice(['Q']).blocks));
    expect(markdownOf(closedOnly)).toEqual(['Q', 'abc']);
    expect(caretOf(closedOnly)).toEqual(caret(1, 0));
  });

  it('fills an empty block with the first paragraph and keeps going after it', () => {
    const state = paste([''], caret(0, 0), slice(['X', 'Y']));
    expect(markdownOf(state)).toEqual(['X', 'Y']);
    expect(caretOf(state)).toEqual(caret(1, 1));
  });

  it('splits a heading into a heading and a paragraph', () => {
    const state = paste(['## Hello'], caret(0, 2), slice(['X', 'Y']));
    expect(markdownOf(state)).toEqual(['## HeX', 'Yllo']);
  });

  it('splits a checked task into a checked and an unchecked item', () => {
    const state = paste(['- [x] abcd'], caret(0, 2), slice(['X', 'Y']));
    expect(markdownOf(state)).toEqual(['- [x] abX', '- [ ] Ycd']);
  });

  it('only splits when something goes between the halves', () => {
    expect(markdownOf(paste(['abcd'], caret(0, 2), { ...slice(['X']), openEnd: false }))).toEqual(['abXcd']);
    const lastOnly = paste(['abcd'], caret(0, 2), { ...slice(['X']), openStart: false });
    expect(markdownOf(lastOnly)).toEqual(['ab', 'Xcd']);
    expect(caretOf(lastOnly)).toEqual(caret(1, 1));
  });

  it('keeps closed blocks of a slice with open ends that are not text', () => {
    const state = paste(['abcd'], caret(0, 2), {
      blocks: [DIVIDER_FIXTURE, { id: 'q', type: 'MARKDOWN', data: { markdown: 'Q' } }, DIVIDER_FIXTURE],
      openStart: true,
      openEnd: true,
    });
    expect(markdownOf(state)).toEqual(['ab', '<DIVIDER>', 'Q', '<DIVIDER>', 'cd']);
  });

  it('offsets slice indents by the indent of the current block', () => {
    const deep: QuoinBlock = { id: 'p', type: 'MARKDOWN', data: { markdown: '- item' }, indent: 2 };
    const pasted = closed([
      { id: 'a', type: 'MARKDOWN', data: { markdown: '- a' }, indent: 1 },
      { id: 'b', type: 'MARKDOWN', data: { markdown: '- b' }, indent: 2 },
    ]);
    expect(markdownOf(paste([deep], caret(0, 4), pasted))).toEqual(['    - item', '    - a', '      - b']);
  });

  it('gives pasted blocks fresh ids, also when pasted twice', () => {
    const first = paste(['a'], caret(0, 1), closed(slice(['- x']).blocks));
    const again = run(first, insertSlice(closed(slice(['- x']).blocks), { newId: newIds('q') })).state;
    const ids = again.doc.blocks.map((block) => block.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids).not.toContain('s0');
  });

  it('pastes inline content with its marks into any region', () => {
    const state = paste([table], { block: 0, region: 'cell:0:1', offset: 1 }, slice(['**x**']));
    expect(blocksOf(state)[0].data.rows).toEqual([['abc', 'd**x**ef']]);
    expect(caretOf(state)).toEqual({ block: 0, region: 'cell:0:1', offset: 2 });
  });

  it('puts multiple blocks after a block that cannot be split', () => {
    const state = paste([table, 'tail'], { block: 0, region: 'cell:0:0', offset: 1 }, slice(['X', '- Y']));
    expect(markdownOf(state)).toEqual(['<TABLE>', 'X', '- Y', 'tail']);
    expect(caretOf(state)).toEqual(caret(2, 1));
  });

  it('puts closed blocks after the children of the current block', () => {
    const child: QuoinBlock = { id: 'c', type: 'MARKDOWN', data: { markdown: '- kid' }, indent: 1 };
    const toggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'Tog', open: true } };
    const state = paste([table, child], { block: 0, region: 'cell:0:0', offset: 0 }, closed(slice(['Z']).blocks));
    expect(markdownOf(state)).toEqual(['<TABLE>', '  - kid', 'Z']);
    expect(markdownOf(paste([toggle, child], caret(0, 3), closed(slice(['Z']).blocks)))).toEqual(['<TOGGLE>', 'Z', '  - kid']);
  });
});

describe('insertSlice over a selection', () => {
  it('replaces a text range inside a block', () => {
    expect(markdownOf(paste(['hello world'], range([0, 0], [0, 5]), slice(['**X**'])))).toEqual(['**X** world']);
  });

  it('replaces a range across blocks', () => {
    expect(markdownOf(paste(['abc', 'def', 'ghi'], range([0, 1], [2, 2]), slice(['X'])))).toEqual(['aXi']);
    const state = paste(['abc', 'def', 'ghi'], range([2, 2], [0, 1]), slice(['X', '- Y', 'Z']));
    expect(markdownOf(state)).toEqual(['aX', '- Y', 'Zi']);
    expect(caretOf(state)).toEqual(caret(2, 1));
  });

  it('replaces a node selection with the blocks of the slice', () => {
    const state = paste(['a', DIVIDER_FIXTURE, 'c'], { node: 1 }, slice(['X', '- Y']));
    expect(markdownOf(state)).toEqual(['a', 'X', '- Y', 'c']);
    expect(caretOf(state)).toEqual(caret(2, 1));
  });

  it('replaces a block range and the children of its blocks, at the indent of the first', () => {
    const toggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'Tog', open: true }, indent: 1 };
    const child: QuoinBlock = { id: 'c', type: 'MARKDOWN', data: { markdown: 'kid' }, indent: 2 };
    const state = paste(['a', toggle, child, 'z'], { blocks: [1, 1] }, closed(slice(['X']).blocks));
    expect(markdownOf(state)).toEqual(['a', '  X', 'z']);
    expect(markdownOf(paste(['a', 'b', 'c'], { blocks: [2, 0] }, slice(['X', 'Y'])))).toEqual(['X', 'Y']);
  });
});

describe('copy and paste round trip', () => {
  it('pastes a copied selection through the clipboard formats', () => {
    const source = buildState(['abc', '- mid', 'xyz'], range([0, 1], [2, 2]));
    const copied = sliceFromSelection(source, createBlockCodec(source.schema))!;
    const { json, html, text } = sliceToClipboard(copied);
    const target = (data: Parameters<typeof sliceFromClipboard>[0]) =>
      markdownOf(paste(['12'], caret(0, 1), sliceFromClipboard(data, { newId: newIds('c') })!));
    expect(target({ json })).toEqual(['1bc', '- mid', 'xy2']);
    expect(target({ html })).toEqual(['1bc', '- mid', 'xy2']);
    expect(target({ text })).toEqual(['1bc', '- mid', 'xy2']);
  });
});

describe('insertSlice commands', () => {
  it('does nothing without a selection or without blocks', () => {
    expect(run(buildState([], null), insertSlice(slice(['x']))).ok).toBe(false);
    expect(run(buildState(['a'], caret(0, 0)), insertSlice({ blocks: [], openStart: true, openEnd: true })).ok).toBe(false);
  });

  it('records a paste transaction and can be probed without dispatching', () => {
    const state = buildState(['ab'], caret(0, 1));
    const done = run(state, insertSlice(slice(['x'])));
    expect(done.tr?.origin).toBe('paste');
    expect(insertSlice(slice(['x']))(state)).toBe(true);
  });

  const cases: [string, Entries, Selection, Slice][] = [
    ['an inline paste', ['ab'], caret(0, 1), slice(['**x**'])],
    ['a multi block paste', ['abcd'], caret(0, 2), slice(['X', '- Y', 'Z'])],
    ['a paste at the start', ['abcd'], caret(0, 0), slice(['X', '- Y', 'Z'])],
    ['a paste over a range', ['abc', 'def'], range([0, 1], [1, 2]), slice(['X', 'Y'])],
    ['a paste over a node', ['a', DIVIDER_FIXTURE], { node: 1 }, slice(['X', '- Y'])],
    ['a paste into a cell', [table], { block: 0, region: 'cell:0:0', offset: 1 }, slice(['X', '- Y'])],
  ];

  it.each(cases)('undoes %s', (_name, blocks, selection, pasted) => {
    const before = buildState(blocks, selection, { plugins: [historyPlugin()] });
    const done = run(before, insertSlice(pasted, { newId: newIds('p') }) as Command);
    expect(done.ok).toBe(true);
    const undone = run(done.state, undo).state;
    expect(undone.doc.blocks).toEqual(before.doc.blocks);
    expect(caretOf(undone)).toEqual(caretOf(before));
  });
});
