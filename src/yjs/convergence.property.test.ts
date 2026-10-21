import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDoc } from '../engine/model/doc';
import { sameDoc } from '../engine/model/same-doc';
import { md } from '../engine/test-support/editor-fixtures';
import { fromYBlock } from './doc-shape';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { arbitraryEdit, runEdit } from './test-support/random-edits';

const START = [md('a', 'one **two** three'), md('b', '- four five'), md('c', 'six'), md('d', '> seven eight')];

const turn = fc.record({ by: fc.constantFrom(0, 1), edit: arbitraryEdit(), deliver: fc.constantFrom(null, 0, 1) });

const matchesShared = ({ editor, collaboration }: Peer) =>
  sameDoc(editor.state.doc, createDoc(collaboration.blocks.toArray().map(fromYBlock)));

describe('two editors on two synced documents', () => {
  it('converge after random concurrent edits of every kind', () => {
    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 16 }), (turns) => {
        const { docs, deliver, flush } = linkedDocs();
        const peers = [peer(docs[0], 'a', START)];
        flush();
        peers.push(peer(docs[1], 'b'));
        turns.forEach(({ by, edit, deliver: to }, i) => {
          runEdit(peers[by].editor, edit, `${'xy'[by]}${i}`);
          if (to !== null) deliver(to);
        });
        flush();
        expect(peers[1].editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
        expect(docs[1].getArray('quoin').toJSON()).toEqual(docs[0].getArray('quoin').toJSON());
        expect(peers.every(matchesShared)).toBe(true);
      }),
      { seed: 20261021, numRuns: 300 },
    );
  });
});
