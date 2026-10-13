import { describe, expect, it } from 'vitest';
import { inlineText } from '../model/inline';
import { historyPlugin, undo, undoInputRule } from '../state/history';
import { blocksOf, buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { blockInputRules } from './block-rules';
import { insertTextWithRules } from './input-rule';

type Entry = Parameters<typeof buildState>[0][number];
type Selection = Parameters<typeof buildState>[1];

const typeAt = (entry: Entry, selection: Selection, value: string) =>
  run(buildState([entry], selection, { plugins: [historyPlugin()] }), insertTextWithRules(value, blockInputRules, { newId: newIds() }));
const type = (entry: Entry, offset: number, value: string) => typeAt(entry, { block: 0, offset }, value).state;
const kindOf = (entry: Entry, offset: number, value: string) => type(entry, offset, value).doc.blocks[0].attrs;

describe('block input rules in detail', () => {
  it.each([
    ['*', 1, '- '],
    ['+', 1, '- '],
    ['1)', 2, '1. '],
    ['12.', 3, '12. '],
    ['0.', 2, '0. '],
    ['[ ]', 3, '- [ ] '],
    ['[X]', 3, '- [x] '],
    ['######', 6, '###### '],
  ])('%j then a space makes %j', (paragraph, offset, expected) => {
    expect(markdownOf(type({ paragraph }, offset, ' '))).toEqual([expected]);
  });

  it('does not fire for seven hashes, ten digits or a missing space', () => {
    expect(kindOf({ paragraph: '#######' }, 7, ' ')).toEqual({ kind: 'paragraph' });
    expect(kindOf({ paragraph: '1234567890' }, 10, '.')).toEqual({ kind: 'paragraph' });
    expect(kindOf({ paragraph: '#' }, 1, '#')).toEqual({ kind: 'paragraph' });
  });

  it('only matches from the start of the text', () => {
    expect(kindOf({ paragraph: 'a #' }, 3, ' ')).toEqual({ kind: 'paragraph' });
  });

  it('turns a bullet into a task but no other kind', () => {
    expect(markdownOf(type('- []', 2, ' '))).toEqual(['- [ ] ']);
    expect(kindOf('1. []', 2, ' ')).toMatchObject({ kind: 'ordered' });
    expect(kindOf('## ##', 2, ' ')).toMatchObject({ kind: 'heading', level: 2 });
    expect(kindOf('> >', 1, ' ')).toMatchObject({ kind: 'quote' });
  });

  it('keeps the block id and the indent', () => {
    const state = type({ id: 'x', type: 'MARKDOWN', data: { markdown: '\\#' }, indent: 1 }, 1, ' ');
    expect(state.doc.blocks.map((block) => [block.id, block.indent])).toEqual([['b0', 1]]);
    expect(markdownOf(state)).toEqual(['  # ']);
  });

  it('puts the caret where the prefix was', () => {
    expect(caretOf(type({ paragraph: '#tail' }, 1, ' '))).toEqual({ block: 0, offset: 0 });
    expect(caretOf(type({ paragraph: '-' }, 1, ' '))).toEqual({ block: 0, offset: 0 });
  });

  it('works when the typed text replaces a selection', () => {
    const { state, tr } = typeAt({ paragraph: '#xy' }, { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 3 } }, ' ');
    expect(markdownOf(state)).toEqual(['# ']);
    expect(tr?.getMeta('inputRule')).toEqual({ undoText: ' ' });
    expect(run(state, undoInputRule).ok).toBe(false);
  });

  it('records the typed text and keeps the input origin', () => {
    const { tr } = typeAt({ paragraph: '##' }, { block: 0, offset: 2 }, ' ');
    expect(tr?.getMeta('inputRule')).toEqual({ undoText: ' ' });
    expect(tr?.origin).toBe('input');
  });

  it('undoes the whole conversion in one step', () => {
    const typed = type({ paragraph: '#' }, 1, ' ');
    expect(markdownOf(run(typed, undo).state)).toEqual(['\\#']);
  });

  it('restores the block type when the rule is undone', () => {
    const typed = type({ paragraph: '3.' }, 2, ' ');
    const undone = run(typed, undoInputRule).state;
    expect(undone.doc.blocks[0].attrs).toEqual({ kind: 'paragraph' });
    expect(inlineText(undone.doc.blocks[0].regions.text)).toBe('3. ');
    expect(caretOf(undone)).toEqual({ block: 0, offset: 3 });
  });

  it('turns a divider into a block and moves the tail to the new paragraph', () => {
    const state = type({ paragraph: '--tail' }, 2, '-');
    expect(markdownOf(state)).toEqual(['<DIVIDER>', 'tail']);
    expect(state.doc.blocks.map((block) => block.id)).toEqual(['b0', 'n0']);
    expect(caretOf(state)).toEqual({ block: 1, offset: 0 });
  });

  it.each([
    ['**', '*'],
    ['__', '_'],
  ])('also makes a divider from %j plus %j', (paragraph, value) => {
    expect(markdownOf(type({ paragraph }, 2, value))).toEqual(['<DIVIDER>', '']);
  });

  it('keeps the indent of a divider and its new paragraph, and the children after them', () => {
    const state = buildState(
      [{ id: 'a', type: 'MARKDOWN', data: { markdown: '\\-\\-' }, indent: 1 }, { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 2 }],
      { block: 0, offset: 2 },
    );
    const next = run(state, insertTextWithRules('-', blockInputRules, { newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['  <DIVIDER>', '  ', '    child']);
  });

  it('leaves a divider typed in other block kinds alone', () => {
    expect(kindOf('## --', 3, '-')).toMatchObject({ kind: 'heading' });
  });

  it('makes a math block that is node selected', () => {
    const state = type({ paragraph: '$$' }, 2, ' ');
    expect(markdownOf(state)).toEqual(['<MATH>']);
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('keeps the text after the caret as the code or the formula', () => {
    expect(blocksOf(type({ paragraph: '```tail' }, 3, ' '))[0].data).toEqual({ language: '', code: 'tail' });
    expect(blocksOf(type({ paragraph: '$$x' }, 2, ' '))[0].data).toEqual({ latex: 'x' });
  });

  it.each(['ts', 'c++', 'c#', 'objective-c', 'f.s'])('reads the language %j from the fence', (language) => {
    const state = type({ paragraph: `\`\`\`${language}` }, 3 + language.length, ' ');
    expect(blocksOf(state)[0]).toMatchObject({ type: 'CODE', data: { language } });
    expect(caretOf(state)).toEqual({ node: 0 });
  });

  it('does not fire without the closing space or with a space inside the fence', () => {
    expect(kindOf({ paragraph: '```' }, 3, 'a')).toEqual({ kind: 'paragraph' });
    expect(kindOf({ paragraph: '``` js' }, 6, ' ')).toEqual({ kind: 'paragraph' });
  });

  it('does not run inside a table cell', () => {
    const table = { id: 't', type: 'TABLE', data: { rows: [['#', 'b']] } };
    const { state } = typeAt(table, { block: 0, region: 'cell:0:0', offset: 1 }, ' ');
    expect(state.doc.blocks.map((block) => block.type)).toEqual(['TABLE']);
    expect(inlineText(state.doc.blocks[0].regions['cell:0:0'])).toBe('# ');
  });

  it('does not run inside another text block type', () => {
    const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: '#' } };
    const { state } = typeAt(callout, { block: 0, offset: 1 }, ' ');
    expect(state.doc.blocks[0].type).toBe('CALLOUT');
  });

  it('creates the divider paragraph id itself when a handler is called without a context', () => {
    const divider = blockInputRules.find((rule) => rule.name === 'divider');
    const state = buildState([{ paragraph: '---' }], { block: 0, offset: 3 });
    const match = divider?.match.exec('---');
    const tr = match && divider?.handler(state, match, { block: 'b0', region: 'text', from: 0, to: 3 });
    expect(tr && tr.doc.blocks.map((block) => block.type)).toEqual(['DIVIDER', 'MARKDOWN']);
    expect(tr && tr.doc.blocks[1].id).not.toBe('b0');
  });

  it('is undone to the typed prefix when it was typed key by key', () => {
    const keys = (value: string) => insertTextWithRules(value, blockInputRules, { newId: newIds() });
    let state = buildState([{ paragraph: '' }], { block: 0, offset: 0 }, { plugins: [historyPlugin()] });
    for (const key of ['#', '#', ' ']) state = run(state, keys(key)).state;
    expect(markdownOf(state)).toEqual(['## ']);
    const undone = run(state, undoInputRule).state;
    expect(inlineText(undone.doc.blocks[0].regions.text)).toBe('## ');
    expect(undone.doc.blocks[0].attrs).toEqual({ kind: 'paragraph' });
  });
});
