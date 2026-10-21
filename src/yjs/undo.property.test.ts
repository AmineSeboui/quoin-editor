import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { inlineText } from '../engine/model/inline';
import type { EngineDoc } from '../engine/model/types';
import type { SelectionChoice } from '../engine/test-support/selection-arbitrary';
import { md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { arbitraryEdit, runEdit, type Edit } from './test-support/random-edits';

const START = [md('a', 'one two three'), md('b', 'four five'), md('c', 'ten seven')];
const TYPED = ['x', 'y'];

const caretOf = (at: SelectionChoice): SelectionChoice => {
  if (at.kind === 'caret') return at;
  return { kind: 'caret', at: at.kind === 'range' ? at.anchor : [at.kind === 'node' ? at.at : at.anchor, 0, 'end'] };
};

// Typing over a selection would delete what the other client typed, which its own undo then brings back.
const atCaret = (edit: Edit): Edit => (edit.kind === 'insert' ? { ...edit, at: caretOf(edit.at) } : edit);

const turn = fc.record({
  by: fc.constantFrom(0, 1),
  edit: arbitraryEdit(['insert', 'mark', 'attrs']).map(atCaret),
  deliver: fc.constantFrom(null, 0, 1),
});

const written = (doc: EngineDoc) =>
  doc.blocks.flatMap((block) => Object.values(block.regions).map((inline) => inlineText(inline))).join('\n');
const count = (text: string, letter: string) => text.split(letter).length - 1;

function undoAll({ editor }: Peer): void {
  while (editor.commands.undo());
}

describe('undo on one of two synced editors', () => {
  it('undoes only its own changes, and with both undone the text of the start is back', () => {
    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 12 }), (turns) => {
        const { docs, deliver, flush } = linkedDocs();
        const peers = [peer(docs[0], 'a', START)];
        flush();
        peers.push(peer(docs[1], 'b'));
        const start = peers[0].editor.state.doc;
        turns.forEach(({ by, edit, deliver: to }, i) => {
          peers[by].clock.now = i * 1000;
          runEdit(peers[by].editor, edit, TYPED[by]);
          if (to !== null) deliver(to);
        });
        flush();
        const theirs = count(written(peers[1].editor.state.doc), 'y');
        undoAll(peers[0]);
        flush();
        const left = written(peers[1].editor.state.doc);
        expect(count(left, 'x')).toBe(0);
        expect(count(left, 'y')).toBe(theirs);
        expect(peers[0].editor.getBlocks()).toEqual(peers[1].editor.getBlocks());
        undoAll(peers[1]);
        flush();
        // Attrs are not compared: Yjs never lets an undo overwrite a value another client wrote later to the same key.
        expect(written(peers[0].editor.state.doc)).toBe(written(start));
        expect(peers[1].editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
      }),
      { seed: 20261021, numRuns: 300 },
    );
  });
});
