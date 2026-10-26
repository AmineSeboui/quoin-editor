import { describe, expect, it } from 'vitest';
import type { Command } from '../engine/commands/command';
import { addColumn, addRow } from '../engine/commands/table-commands';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { sameDoc } from '../engine/model/same-doc';
import { md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { linkedDocs, peer, type Peer } from './test-support/peers';

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
});
