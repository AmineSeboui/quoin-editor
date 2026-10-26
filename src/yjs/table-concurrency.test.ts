import { describe, expect, it } from 'vitest';
import type { Command } from '../engine/commands/command';
import { addColumn, addRow } from '../engine/commands/table-commands';
import { inlineLength } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { sameDoc } from '../engine/model/same-doc';
import { md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { runEdit, type Edit } from './test-support/random-edits';

const TABLE: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['one', 'two'], ['three', 'four']], header: true } };

const readsAsShown = ({ editor, collaboration }: Peer) =>
  sameDoc(editor.state.doc, readShared(collaboration.text, requiredRegions(editor.state.schema)).doc);
const run = ({ editor }: Peer, command: Command) => command(editor.state, editor.dispatch);
const rowsOf = ({ editor }: Peer) => editor.getBlocks().find((block) => block.id === 't')?.data.rows;

describe('a table edited by two clients at once', () => {
  it('keeps each cell its text after a row both add, a move of the table and a column added', () => {
    const { docs, deliver, flush } = linkedDocs([2, 1]);
    const one = peer(docs[0], 'a', [md('a', 'one **two** three'), TABLE, md('c', 'six')]);
    flush();
    const two = peer(docs[1], 'b');
    run(one, addColumn('t', 1));
    run(one, addRow('t', 2));
    run(two, addRow('t', 2));
    deliver(1);
    two.editor.commands.setSelection({ kind: 'node', block: 't' });
    two.editor.commands.moveBlocksDown();
    deliver(0);
    run(one, addColumn('t', 3));
    expect(readsAsShown(one)).toBe(true);
    flush();
    expect(rowsOf(one)).toEqual([
      ['one', '', 'two', ''],
      ['three', '', 'four', ''],
      ['', '', '', ''],
    ]);
    expect(rowsOf(two)).toEqual(rowsOf(one));
    expect([one, two].every(readsAsShown)).toBe(true);
  });

  it('reads the cells of a row added to a table another client typed over as text of the line before them', () => {
    const errors: Error[] = [];
    const onError = (error: Error) => void errors.push(error);
    const { docs, deliver, flush } = linkedDocs([1, 2]);
    const one = peer(docs[0], 'a', [md('a', 'one **two** three'), TABLE, md('c', 'six')], { onError });
    flush();
    const two = peer(docs[1], 'b', [], { onError });
    one.editor.commands.setSelection({ kind: 'node', block: 'a' });
    one.editor.commands.moveBlocksDown();
    one.editor.commands.setSelection({ kind: 'blocks', anchor: 't', head: 't' });
    one.editor.insertText('x');
    run(two, addRow('t', 0));
    deliver(0);
    expect(one.editor.state.doc.blocks.map((block) => Object.keys(block.regions))).toEqual([['text'], ['text'], ['text']]);
    const [first, line] = one.editor.state.doc.blocks;
    const end = { block: first.id, region: 'text', offset: inlineLength(first.regions.text) };
    one.editor.commands.setSelection({ kind: 'text', anchor: { block: line.id, region: 'text', offset: 0 }, head: end });
    expect(() => one.editor.commands.splitBlock()).not.toThrow();
    flush();
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect([one, two].every(readsAsShown)).toBe(true);
    expect(errors).toEqual([]);
  });

  it('reads a line the same way once another client changes its type as a fresh reading does', () => {
    const { docs, deliver, flush } = linkedDocs([2, 1]);
    const start = [md('a', 'one **two** three'), { ...TABLE, data: { ...TABLE.data, align: [null, null] } }, md('c', 'six')];
    const one = peer(docs[0], 'a', start);
    flush();
    const two = peer(docs[1], 'b');
    const turns: [Peer, Edit][] = [
      [one, { kind: 'insert', at: { kind: 'node', at: 40 }, pick: 0 }],
      [one, { kind: 'retype', at: { kind: 'range', anchor: [0, 0, 'end'], head: [0, 0, 'start'] }, pick: 0 }],
      [two, { kind: 'retype', at: { kind: 'range', anchor: [0, 0, 'end'], head: [0, 0, 'start'] }, pick: 0 }],
      [two, { kind: 'retype', at: { kind: 'range', anchor: [0, 0, 0], head: [0, 0, 0] }, pick: 0 }],
      [two, { kind: 'table', at: { kind: 'blocks', anchor: 0, head: 0 }, pick: 0 }],
      [one, { kind: 'move', at: { kind: 'node', at: 0 }, pick: 15 }],
    ];
    turns.forEach(([client, edit], i) => runEdit(client.editor, edit, `x${i}`));
    deliver(1);
    expect(readsAsShown(two)).toBe(true);
    flush();
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect([one, two].every(readsAsShown)).toBe(true);
  });
});
