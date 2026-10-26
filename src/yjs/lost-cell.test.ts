import { describe, expect, it } from 'vitest';
import { cellKey } from '../engine/blocks/table-spec';
import { inlineText } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { sameDoc } from '../engine/model/same-doc';
import { textSelection } from '../engine/state/selection';
import { md } from '../engine/test-support/editor-fixtures';
import { deleteText, regionNameOf } from './doc-shape';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

const TABLE: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['a', 'b'], ['c', 'd']], header: true } };

function clients() {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', [TABLE, md('line', 'x')]);
  mesh.flush();
  const two = peer(mesh.docs[1], 'b');
  mesh.flush();
  return { ...mesh, one, two };
}

// Another writer's change that leaves a cell without its region start.
function loseRegionStart({ collaboration }: Peer, name: string): void {
  let at = 0;
  for (const { insert } of collaboration.text.toDelta() as { insert: unknown }[]) {
    if (regionNameOf(insert) === name) break;
    at += typeof insert === 'string' ? insert.length : 1;
  }
  collaboration.doc.transact(() => deleteText(collaboration.text, at, 1), 'elsewhere');
}

const cells = ({ editor }: Peer) => {
  const table = editor.state.doc.blocks[0];
  return [0, 1].map((row) => [0, 1].map((col) => inlineText(table.regions[cellKey(row, col)] ?? [])));
};

const readsAsShown = ({ editor, collaboration }: Peer) =>
  sameDoc(readShared(collaboration.text, requiredRegions(editor.state.schema)).doc, editor.state.doc);

describe('a table cell whose region start is lost', () => {
  it('reads as an empty cell that either client can select and type into', () => {
    const { one, two, flush } = clients();
    loseRegionStart(one, cellKey(0, 1));
    flush();
    expect(one.editor.state.doc.blocks[0].regions[cellKey(0, 1)]).toEqual([]);
    const pos = { block: 't', region: cellKey(0, 1), offset: 0 };
    two.editor.commands.setSelection(textSelection(pos));
    expect(two.editor.state.selection).toEqual(textSelection(pos));
    expect(two.editor.insertText('Z')).toBe(true);
    flush();
    expect(cells(one)).toEqual([
      ['ab', 'Z'],
      ['c', 'd'],
    ]);
    expect(cells(two)).toEqual(cells(one));
    expect(two.editor.getBlocks()).toEqual(one.editor.getBlocks());
    expect([one, two].every(readsAsShown)).toBe(true);
  });
});
