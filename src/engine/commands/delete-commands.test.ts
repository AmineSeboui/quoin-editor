import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import type { Command } from './command';
import { note, noteSchema } from './command-fixtures';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import {
  deleteBackward,
  deleteForward,
  deleteSelection,
  deleteToLineEnd,
  deleteToLineStart,
  deleteWordBackward,
  deleteWordForward,
} from './delete-commands';

const TABLE = { id: 't', type: 'TABLE', data: { rows: [['ab', 'cd']] } };
const caret = (block: number, offset: number) => ({ block, offset });
const after = (blocks: Parameters<typeof buildState>[0], at: Parameters<typeof buildState>[1], command: Command) =>
  run(buildState(blocks, at), command);

const back = (blocks: (string | typeof DIVIDER_FIXTURE)[], caret: Parameters<typeof buildState>[1]) =>
  run(buildState(blocks, caret), deleteBackward);

describe('deleteBackward', () => {
  it('deletes one grapheme', () => {
    const { state } = back(['a👍🏽'], { block: 0, offset: 5 });
    expect(markdownOf(state)).toEqual(['a']);
  });

  it.each([
    [['## Head'], ['Head']],
    [['- item'], ['item']],
    [['- [x] task'], ['task']],
    [['> quote'], ['quote']],
  ])('turns %j into a paragraph at its start', (blocks, expected) => {
    expect(markdownOf(back(blocks, { block: 0, offset: 0 }).state)).toEqual(expected);
  });

  it('outdents an indented paragraph before merging', () => {
    const state = buildState([{ id: 'x', type: 'MARKDOWN', data: { markdown: 'a' } }, { id: 'y', type: 'MARKDOWN', data: { markdown: 'b' }, indent: 1 }], {
      block: 1,
      offset: 0,
    });
    expect(markdownOf(run(state, deleteBackward).state)).toEqual(['a', 'b']);
  });

  it('joins with the previous text block and keeps the caret at the seam', () => {
    const { state } = back(['ab', 'cd'], { block: 1, offset: 0 });
    expect(markdownOf(state)).toEqual(['abcd']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 2 });
  });

  it('selects a previous divider, and removes an empty paragraph first', () => {
    expect(caretOf(back([DIVIDER_FIXTURE, 'x'], { block: 1, offset: 0 }).state)).toEqual({ node: 0 });
    const { state } = back([DIVIDER_FIXTURE, ''], { block: 1, offset: 0 });
    expect(markdownOf(state)).toEqual(['<DIVIDER>']);
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('turns a callout into a paragraph at its start', () => {
    const state = buildState([{ id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'hi' } }], { block: 0, offset: 0 });
    expect(markdownOf(run(state, deleteBackward).state)).toEqual(['hi']);
  });

  it('does nothing at the start of the first paragraph', () => {
    expect(back(['a'], { block: 0, offset: 0 }).ok).toBe(false);
  });

  it('removes a node-selected block', () => {
    const { state } = back(['a', DIVIDER_FIXTURE, 'b'], { node: 1 });
    expect(markdownOf(state)).toEqual(['a', 'b']);
    expect(caretOf(state)).toEqual({ block: 0, offset: 1 });
  });
});

describe('deleteForward and word deletes', () => {
  it('joins the next block at the end', () => {
    expect(markdownOf(run(buildState(['ab', 'cd'], { block: 0, offset: 2 }), deleteForward).state)).toEqual(['abcd']);
  });

  it('deletes the previous word', () => {
    expect(markdownOf(run(buildState(['hello big world'], { block: 0, offset: 15 }), deleteWordBackward).state)).toEqual([
      'hello big&#32;',
    ]);
  });
});

describe('deleteBackward at the start of a block', () => {
  it('keeps the indent when a heading or item becomes a paragraph', () => {
    const heading = { id: 'h', type: 'MARKDOWN', data: { markdown: '## Head' }, indent: 1 };
    const { state } = after([heading], caret(0, 0), deleteBackward);
    expect(state.doc.blocks[0]).toMatchObject({ indent: 1, attrs: { kind: 'paragraph' } });
    expect(markdownOf(state)).toEqual(['  Head']);
    expect(caretOf(state)).toEqual(caret(0, 0));
  });

  it('turns a toggle into a paragraph with the same text', () => {
    const toggle = { id: 't', type: 'TOGGLE', data: { markdown: '**Sum**', open: true } };
    const { state } = after([toggle], caret(0, 0), deleteBackward);
    expect(state.doc.blocks[0]).toMatchObject({ id: 'b0', type: 'MARKDOWN', attrs: { kind: 'paragraph' } });
    expect(markdownOf(state)).toEqual(['**Sum**']);
    expect(caretOf(state)).toEqual(caret(0, 0));
  });

  it('turns any other text block into a paragraph with its text', () => {
    const { state } = run(buildState([note('hi')], caret(0, 0), { schema: noteSchema }), deleteBackward);
    expect(state.doc.blocks[0]).toMatchObject({ id: 'b0', type: 'MARKDOWN', attrs: { kind: 'paragraph' } });
    expect(markdownOf(state)).toEqual(['hi']);
  });

  it('outdents one level at a time and keeps the caret', () => {
    const deep = { id: 'p', type: 'MARKDOWN', data: { markdown: 'b' }, indent: 2 };
    const { state } = after(['a', deep], caret(1, 0), deleteBackward);
    expect(state.doc.blocks.map((block) => block.indent)).toEqual([0, 1]);
    expect(caretOf(state)).toEqual(caret(1, 0));
  });

  it('only selects a previous void block when the paragraph has text', () => {
    const { state } = after([DIVIDER_FIXTURE, 'x'], caret(1, 0), deleteBackward);
    expect(markdownOf(state)).toEqual(['<DIVIDER>', 'x']);
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('does nothing at the start of a table cell', () => {
    expect(after([TABLE], { block: 0, offset: 0 }, deleteBackward).ok).toBe(false);
  });

  it('deletes inside a table cell', () => {
    const { state } = after([TABLE], { block: 0, offset: 2 }, deleteBackward);
    expect(state.doc.blocks[0].regions['cell:0:0']).toEqual([{ kind: 'text', text: 'a', marks: [] }]);
  });

  it('reports nothing to do without a selection', () => {
    expect(after([], null, deleteBackward).ok).toBe(false);
  });
});

describe('deleteForward', () => {
  it('deletes one grapheme ahead of the caret', () => {
    expect(markdownOf(after(['\u{1F44D}\u{1F3FD}a'], caret(0, 0), deleteForward).state)).toEqual(['a']);
  });

  it('selects a following void block', () => {
    const { state } = after(['x', DIVIDER_FIXTURE], caret(0, 1), deleteForward);
    expect(markdownOf(state)).toEqual(['x', '<DIVIDER>']);
    expect(caretOf(state)).toEqual({ node: 1 });
  });

  it('removes an empty paragraph before selecting the following void block', () => {
    const { state } = after(['', DIVIDER_FIXTURE], caret(0, 0), deleteForward);
    expect(markdownOf(state)).toEqual(['<DIVIDER>']);
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('keeps an empty heading when selecting the following void block', () => {
    const { state } = after(['#', DIVIDER_FIXTURE], caret(0, 0), deleteForward);
    expect(state.doc.blocks).toHaveLength(2);
    expect(caretOf(state)).toEqual({ node: 1 });
  });

  it('does nothing at the end of the last block or of a table cell', () => {
    expect(after(['a'], caret(0, 1), deleteForward).ok).toBe(false);
    expect(after([TABLE], caret(0, 2), deleteForward).ok).toBe(false);
  });

  it('keeps the first block when joining a heading into it', () => {
    const { state } = after(['a', '# b'], caret(0, 1), deleteForward);
    expect(markdownOf(state)).toEqual(['ab']);
    expect(caretOf(state)).toEqual(caret(0, 1));
  });
});

describe('selections and ranges', () => {
  it('deletes a selection inside one block and across blocks', () => {
    const within = after(['hello'], { anchor: caret(0, 1), head: caret(0, 4) }, deleteBackward);
    expect(markdownOf(within.state)).toEqual(['ho']);
    expect(caretOf(within.state)).toEqual(caret(0, 1));
    const across = after(['ab', 'cd', 'ef'], { anchor: caret(2, 1), head: caret(0, 1) }, deleteForward);
    expect(markdownOf(across.state)).toEqual(['af']);
    expect(caretOf(across.state)).toEqual(caret(0, 1));
  });

  it('removes a range of blocks and selects the end of the one before', () => {
    const { state } = after(['a', 'b', 'c', 'd'], { blocks: [2, 1] }, deleteSelection);
    expect(markdownOf(state)).toEqual(['a', 'd']);
    expect(caretOf(state)).toEqual(caret(0, 1));
  });

  it('selects the start of the next block when the first block is removed, and nothing when all go', () => {
    const first = after([DIVIDER_FIXTURE, 'b'], { node: 0 }, deleteSelection).state;
    expect(caretOf(first)).toEqual(caret(0, 0));
    const all = after([DIVIDER_FIXTURE], { node: 0 }, deleteSelection).state;
    expect(all.doc.blocks).toEqual([]);
    expect(all.selection).toBeNull();
  });

  it('does nothing for a collapsed caret', () => {
    expect(after(['a'], caret(0, 1), deleteSelection).ok).toBe(false);
  });
});

describe('word and line deletes', () => {
  it('deletes the next word, reaching its end', () => {
    expect(markdownOf(after(['hello big world'], caret(0, 5), deleteWordForward).state)).toEqual(['hello world']);
  });

  it('falls back to the block boundary at the edges', () => {
    expect(markdownOf(after(['ab', 'cd'], caret(1, 0), deleteWordBackward).state)).toEqual(['abcd']);
    expect(markdownOf(after(['ab', 'cd'], caret(0, 2), deleteWordForward).state)).toEqual(['abcd']);
    expect(markdownOf(after(['ab', 'cd'], caret(1, 0), deleteToLineStart).state)).toEqual(['abcd']);
    expect(markdownOf(after(['ab', 'cd'], caret(0, 2), deleteToLineEnd).state)).toEqual(['abcd']);
  });

  it('deletes to the region start and end when there is no line break', () => {
    expect(markdownOf(after(['hello world'], caret(0, 5), deleteToLineStart).state)).toEqual(['&#32;world']);
    expect(markdownOf(after(['hello world'], caret(0, 5), deleteToLineEnd).state)).toEqual(['hello']);
  });

  it('stops at the previous and next line break', () => {
    const lines = { paragraph: 'one\ntwo\nthree' };
    const start = after([lines], caret(0, 6), deleteToLineStart);
    expect(start.state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'one\no\nthree', marks: [] }]);
    expect(caretOf(start.state)).toEqual(caret(0, 4));
    const end = after([lines], caret(0, 5), deleteToLineEnd);
    expect(end.state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'one\nt\nthree', marks: [] }]);
    expect(caretOf(end.state)).toEqual(caret(0, 5));
  });

  it('deletes the line break itself when the caret sits right next to it', () => {
    const lines = { paragraph: 'ab\ncd' };
    const back = after([lines], caret(0, 3), deleteToLineStart);
    expect(back.state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'abcd', marks: [] }]);
    const forward = after([lines], caret(0, 2), deleteToLineEnd);
    expect(forward.state.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'abcd', marks: [] }]);
  });
});
