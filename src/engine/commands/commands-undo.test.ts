import { describe, expect, it } from 'vitest';
import { historyPlugin, undo } from '../state/history';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import type { Command } from './command';
import { note, noteSchema } from './command-fixtures';
import { deleteBackward, deleteForward, deleteSelection } from './delete-commands';
import { insertHardBreak } from './hard-break';
import { insertText } from './insert-text';
import { splitBlock } from './split-block';

const toggle = (open: boolean) => ({ id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open } });
const callout = { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'ab<br>' } };
const nested = (markdown: string) => ({ id: 'n', type: 'MARKDOWN', data: { markdown }, indent: 1 });
const split = splitBlock({ newId: newIds() });
const table = { id: 'g', type: 'TABLE', data: { rows: [['abc', 'def', 'ghi']] } };
const cells = { anchor: { block: 0, offset: 1 }, head: { block: 0, region: 'cell:0:2', offset: 1 } };
const range = { anchor: { block: 0, offset: 1 }, head: { block: 2, offset: 1 } };

const cases: [string, Parameters<typeof buildState>[0], Parameters<typeof buildState>[1], Command][] = [
  ['insertText over a cross-block selection', ['abc', 'def', 'ghi'], range, insertText('X')],
  ['insertText over a node selection', ['a', DIVIDER_FIXTURE], { node: 1 }, insertText('X')],
  ['insertHardBreak', ['abcd'], { block: 0, offset: 2 }, insertHardBreak],
  ['deleteSelection across blocks', ['abc', 'def', 'ghi'], range, deleteSelection],
  ['deleteSelection around a divider', ['ab', DIVIDER_FIXTURE, 'cd'], range, deleteSelection],
  ['deleteSelection across table cells', [table], cells, deleteSelection],
  ['deleteBackward joining blocks', ['ab', 'cd'], { block: 1, offset: 0 }, deleteBackward],
  ['deleteBackward on a heading', ['## Head'], { block: 0, offset: 0 }, deleteBackward],
  ['deleteBackward on a toggle', [toggle(true)], { block: 0, offset: 0 }, deleteBackward],
  ['deleteBackward on an empty paragraph', [DIVIDER_FIXTURE, ''], { block: 1, offset: 0 }, deleteBackward],
  ['deleteBackward on a removed node selection', ['a', DIVIDER_FIXTURE], { node: 1 }, deleteBackward],
  ['deleteForward joining blocks', ['ab', 'cd'], { block: 0, offset: 2 }, deleteForward],
  ['splitBlock on a list item', ['- item'], { block: 0, offset: 2 }, split],
  ['splitBlock on an open toggle', [toggle(true)], { block: 0, offset: 3 }, split],
  ['splitBlock on a closed toggle', [toggle(false), nested('c')], { block: 0, offset: 3 }, split],
  ['splitBlock leaving a callout', [callout], { block: 0, offset: 3 }, split],
  ['splitBlock leaving an empty item', [nested('- ')], { block: 0, offset: 0 }, splitBlock()],
  ['splitBlock above a list item', ['- item'], { block: 0, offset: 0 }, split],
];

describe('commands are undoable', () => {
  it.each(cases)('%s', (_name, blocks, selection, command) => {
    const before = buildState(blocks, selection, { plugins: [historyPlugin()] });
    const done = run(before, command);
    expect(done.ok).toBe(true);
    const undone = run(done.state, undo).state;
    expect(markdownOf(undone)).toEqual(markdownOf(before));
    expect(undone.doc.blocks).toEqual(before.doc.blocks);
    expect(caretOf(undone)).toEqual(caretOf(before));
  });

  it('undoes the conversion of a custom text block', () => {
    const plugins = [historyPlugin()];
    const before = buildState([note('hi')], { block: 0, offset: 0 }, { schema: noteSchema, plugins });
    const undone = run(run(before, deleteBackward).state, undo).state;
    expect(undone.doc.blocks).toEqual(before.doc.blocks);
  });
});
