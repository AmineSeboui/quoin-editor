import { describe, expect, it } from 'vitest';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { note, noteSchema } from './command-fixtures';
import { splitBlock } from './split-block';

const enter = (blocks: Parameters<typeof buildState>[0], caret: Parameters<typeof buildState>[1]) =>
  run(buildState(blocks, caret), splitBlock({ newId: newIds() }));

describe('splitBlock', () => {
  it('splits a paragraph and moves the caret into the new block', () => {
    const { state } = enter(['hello'], { block: 0, offset: 2 });
    expect(markdownOf(state)).toEqual(['he', 'llo']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('continues lists and tasks, and starts a paragraph after a heading', () => {
    expect(markdownOf(enter(['- a'], { block: 0, offset: 1 }).state)).toEqual(['- a', '- ']);
    expect(markdownOf(enter(['- [x] a'], { block: 0, offset: 1 }).state)).toEqual(['- [x] a', '- [ ] ']);
    expect(markdownOf(enter(['## a'], { block: 0, offset: 1 }).state)).toEqual(['## a', '']);
  });

  it('leaves an empty list item by outdenting, then by becoming a paragraph', () => {
    const nested = buildState([{ id: 'a', type: 'MARKDOWN', data: { markdown: '- ' }, indent: 1 }], { block: 0, offset: 0 });
    expect(markdownOf(run(nested, splitBlock()).state)).toEqual(['- ']);
    expect(markdownOf(enter(['- '], { block: 0, offset: 0 }).state)).toEqual(['']);
  });

  it('inserts an empty block above when the caret is at the start, keeping the caret', () => {
    const { state } = enter(['- item'], { block: 0, offset: 0 });
    expect(markdownOf(state)).toEqual(['- ', '- item']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('adds a line inside a callout and leaves it from an empty last line', () => {
    const callout = (body: string) => [{ id: 'c', type: 'CALLOUT', data: { tone: 'info', body } }];
    expect(blocksOf(enter(callout('ab'), { block: 0, offset: 2 }).state)[0].data.body).toBe('ab<br>');
    const out = enter(callout('ab<br>'), { block: 0, offset: 3 }).state;
    expect(markdownOf(out)).toEqual(['<CALLOUT>', '']);
    expect(blocksOf(out)[0].data.body).toBe('ab');
    expect(caretOf(out)).toEqual({ block: 1, offset: 0 });
  });

  it('puts the tail of an open toggle into its first child', () => {
    const toggle = [{ id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: true } }];
    expect(markdownOf(enter(toggle, { block: 0, offset: 3 }).state)).toEqual(['<TOGGLE>', '  mary']);
  });
});

describe('splitBlock with selections and special blocks', () => {
  const toggle = (open: boolean) => ({ id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open } });
  const child = (id: string, indent: number) => ({ id, type: 'MARKDOWN', data: { markdown: id }, indent });

  it('deletes a selection first, then splits', () => {
    const selection = { anchor: { block: 0, offset: 2 }, head: { block: 2, offset: 3 } };
    const { state } = enter(['hello', 'mid', 'world'], selection);
    expect(markdownOf(state)).toEqual(['he', 'ld']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('does not leave a list item because a selection emptied it', () => {
    const { state } = enter(['- item'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 4 } });
    expect(markdownOf(state)).toEqual(['- ', '- ']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('inserts an empty paragraph after a node-selected block', () => {
    const { state } = enter(['a', DIVIDER_FIXTURE, 'b'], { node: 1 });
    expect(markdownOf(state)).toEqual(['a', '<DIVIDER>', '', 'b']);
    expect(caretOf(state)).toEqual({ block: 2, offset: 0 });
  });

  it('does nothing for a block range', () => {
    expect(enter(['a', 'b'], { blocks: [0, 1] }).ok).toBe(false);
  });

  it('does nothing inside a table cell', () => {
    const table = { id: 't', type: 'TABLE', data: { rows: [['ab']] } };
    expect(enter([table], { block: 0, offset: 1 }).ok).toBe(false);
  });

  it('starts a new paragraph below an empty paragraph and keeps the indent', () => {
    const indented = { id: 'p', type: 'MARKDOWN', data: { markdown: '' }, indent: 1 };
    const { state } = enter([indented], { block: 0, offset: 0 });
    expect(state.doc.blocks.map((block) => block.indent)).toEqual([1, 1]);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('puts a plain paragraph above a heading when the caret is at its start', () => {
    const { state } = enter(['## Head'], { block: 0, offset: 0 });
    expect(markdownOf(state)).toEqual(['', '## Head']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('leaves an empty quote and an empty task by becoming paragraphs', () => {
    expect(markdownOf(enter(['> '], { block: 0, offset: 0 }).state)).toEqual(['']);
    expect(markdownOf(enter(['- [ ] '], { block: 0, offset: 0 }).state)).toEqual(['']);
  });

  it('puts the tail of a closed toggle after its last descendant', () => {
    const { state } = enter([toggle(false), child('c1', 1), child('c2', 2), 'after'], { block: 0, offset: 3 });
    expect(markdownOf(state)).toEqual(['<TOGGLE>', '  c1', '    c2', 'mary', 'after']);
    expect(caretOf(state)).toEqual({ block: 3, offset: 0 });
  });

  it('puts an empty first child in an open toggle when the caret is at its end', () => {
    const { state } = enter([toggle(true), child('c1', 1)], { block: 0, offset: 7 });
    expect(markdownOf(state)).toEqual(['<TOGGLE>', '  ', '  c1']);
    expect(blocksOf(state)[0].data).toMatchObject({ markdown: 'Summary' });
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it('inserts a line break in the middle of a callout and keeps the caret after it', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'abcd' } };
    const { state } = enter([callout], { block: 0, offset: 2 });
    expect(blocksOf(state)[0].data.body).toBe('ab\\\ncd');
    expect(caretOf(state)).toEqual({ block: 0, offset: 3 });
  });

  it('leaves a callout after its children', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'ab<br>' } };
    const { state } = enter([callout, child('c1', 1), 'after'], { block: 0, offset: 3 });
    expect(markdownOf(state)).toEqual(['<CALLOUT>', '  c1', '', 'after']);
    expect(caretOf(state)).toEqual({ block: 2, offset: 0 });
  });

  it('splits a text block without its own split rule into the same type and attrs', () => {
    const state = buildState([note('abcd')], { block: 0, offset: 2 }, { schema: noteSchema });
    const next = run(state, splitBlock({ newId: newIds() })).state;
    expect(next.doc.blocks.map((block) => [block.type, block.attrs])).toEqual([
      ['NOTE', { tone: 'warn' }],
      ['NOTE', { tone: 'warn' }],
    ]);
    expect(blocksOf(next).map((block) => block.data.text)).toEqual(['ab', 'cd']);
  });

  it('puts a paragraph above a text block without its own split rule', () => {
    const state = buildState([note('abcd')], { block: 0, offset: 0 }, { schema: noteSchema });
    const next = run(state, splitBlock({ newId: newIds() })).state;
    expect(next.doc.blocks.map((block) => block.type)).toEqual(['MARKDOWN', 'NOTE']);
    expect(caretOf(next)).toEqual({ block: 1, offset: 0 });
  });
});
