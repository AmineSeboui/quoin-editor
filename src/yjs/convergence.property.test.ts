import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sameDoc } from '../engine/model/same-doc';
import { md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { plainDelta } from './test-support/plain-delta';
import { arbitraryEdit, runEdit } from './test-support/random-edits';

const START = [md('a', 'one **two** three'), md('b', '- four five'), md('c', 'six'), md('d', '> seven eight')];

const turn = fc.record({ by: fc.constantFrom(0, 1), edit: arbitraryEdit(), deliver: fc.constantFrom(null, 0, 1) });

const matchesShared = ({ editor, collaboration }: Peer) =>
  sameDoc(editor.state.doc, readShared(collaboration.text).doc);

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
          expect(matchesShared(peers[by])).toBe(true);
          if (to !== null) deliver(to);
        });
        flush();
        expect(peers[1].editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
        expect(plainDelta(docs[1].getText('quoin'))).toEqual(plainDelta(docs[0].getText('quoin')));
        expect(peers.every(matchesShared)).toBe(true);
      }),
      { seed: 20261021, numRuns: 300 },
    );
  });
});
