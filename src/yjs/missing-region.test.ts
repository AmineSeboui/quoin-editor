import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { inlineText } from '../engine/model/inline';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { sameDoc } from '../engine/model/same-doc';
import { caret, md } from '../engine/test-support/editor-fixtures';
import { deleteText } from './doc-shape';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';
import { writeTokens } from './test-support/tokens';

function clients(blocks: QuoinBlock[]) {
  const mesh = meshDocs(2);
  const one = peer(mesh.docs[0], 'a', blocks);
  mesh.flush();
  const two = peer(mesh.docs[1], 'b');
  mesh.flush();
  return { ...mesh, one, two };
}

const lines = ({ editor }: Peer) =>
  editor.state.doc.blocks.map((block) => [block.id, Object.values(block.regions).map((i) => inlineText(i)).join('|')]);

const readsAsShown = ({ editor, collaboration }: Peer) =>
  sameDoc(readShared(collaboration.text, requiredRegions(editor.state.schema)).doc, editor.state.doc);

// Another writer's change that leaves the first line without its region start.
function loseFirstRegionStart({ collaboration }: Peer): void {
  collaboration.doc.transact(() => deleteText(collaboration.text, 1, 1), 'elsewhere');
}

describe('a text block whose region start is lost', () => {
  it('reads with an empty region where its schema has one', () => {
    const shared = new Y.Doc().getText('quoin');
    writeTokens(shared, [{ kind: 'marker', id: 'p', type: 'MARKDOWN', indent: 0, attrs: null }]);
    const { schema } = peer(new Y.Doc(), 'a', [md('x', '')], { mount: false }).editor.state;
    expect(readShared(shared, requiredRegions(schema)).doc.blocks[0].regions).toEqual({ text: [] });
    expect(readShared(shared).doc.blocks[0].regions).toEqual({});
  });

  it('takes Backspace at the start of the next line as a join into that empty region', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('q', 'second')]);
    loseFirstRegionStart(one);
    flush();
    expect(one.editor.state.doc.blocks[0].regions).toEqual({ text: [] });
    two.editor.commands.setSelection(caret('q', 0));
    expect(two.editor.commands.deleteBackward()).toBe(true);
    expect(readsAsShown(two)).toBe(true);
    flush();
    expect(lines(one)).toEqual([['p', 'firstsecond']]);
    expect(lines(two)).toEqual(lines(one));
    expect([one, two].every(readsAsShown)).toBe(true);
  });

  it('writes what is typed into that empty region, which then reads the text before it as the first region', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('q', 'second')]);
    loseFirstRegionStart(one);
    flush();
    one.editor.commands.setSelection(caret('p', 0));
    expect(one.editor.insertText('Z')).toBe(true);
    one.editor.commands.splitBlock();
    flush();
    const tail = two.editor.state.doc.blocks[1].id;
    expect(lines(two)).toEqual([['p', 'firstZ'], [tail, ''], ['q', 'second']]);
    expect(lines(two)).toEqual(lines(one));
    expect([one, two].every(readsAsShown)).toBe(true);
  });

  it('keeps the regions a block needs when another client changes only its type', () => {
    const { one, two, flush } = clients([md('p', 'first'), md('r', 'next')]);
    one.editor.commands.setSelection(caret('p', 1));
    one.editor.commands.setBlockType('CODE');
    two.editor.commands.setSelection(caret('p', 1));
    two.editor.commands.setBlockType('TOGGLE');
    flush();
    expect([one, two].every(readsAsShown)).toBe(true);
    expect(lines(two)).toEqual(lines(one));
    for (const client of [one, two]) {
      client.editor.commands.setSelection(caret('r', 0));
      expect(() => client.editor.commands.deleteBackward()).not.toThrow();
    }
    flush();
    expect(lines(two)).toEqual(lines(one));
    expect([one, two].every(readsAsShown)).toBe(true);
  });
});
