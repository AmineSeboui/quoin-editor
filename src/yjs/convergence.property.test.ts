import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { sameDoc } from '../engine/model/same-doc';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { md } from '../engine/test-support/editor-fixtures';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { plainDelta } from './test-support/plain-delta';
import { ALL_KINDS, arbitraryEdit, runEdit } from './test-support/random-edits';

const CODE: QuoinBlock = { id: 'k', type: 'CODE', data: { code: 'let x', language: '' } };
const DIVIDER: QuoinBlock = { id: 'h', type: 'DIVIDER', data: {} };
const START = [md('a', 'one **two** three'), CODE, md('b', '- four five'), DIVIDER, md('c', 'six'), md('d', '> seven')];

const turn = fc.record({
  by: fc.constantFrom(0, 1),
  edit: arbitraryEdit(ALL_KINDS),
  deliver: fc.constantFrom(null, 0, 1),
});

type Turn = typeof turn extends fc.Arbitrary<infer T> ? T : never;

// Concurrent edits that leave a marker of a block already in the document right after a split point.
const SPLIT_OF_A_COPY: Turn[] = [
  { by: 1, edit: { kind: 'insert', at: { kind: 'blocks', anchor: 58, head: 0 }, pick: 0 }, deliver: null },
  { by: 1, edit: { kind: 'split', at: { kind: 'caret', at: [3, 0, 0] }, pick: 0 }, deliver: null },
  { by: 1, edit: { kind: 'remove', at: { kind: 'blocks', anchor: 0, head: 0 }, pick: 0 }, deliver: null },
  {
    by: 0,
    edit: { kind: 'insert', at: { kind: 'range', anchor: [0, 0, 0], head: [0, 0, 'end'] }, pick: 0 },
    deliver: 0,
  },
  { by: 0, edit: { kind: 'move', at: { kind: 'node', at: 0 }, pick: 0 }, deliver: null },
  { by: 1, edit: { kind: 'move', at: { kind: 'caret', at: [0, 0, 'end'] }, pick: 0 }, deliver: null },
];

const matchesShared = ({ editor, collaboration }: Peer) =>
  sameDoc(editor.state.doc, readShared(collaboration.text, requiredRegions(editor.state.schema)).doc);

describe('two editors on two synced documents', () => {
  it('converge after random concurrent edits of every kind', () => {
    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 16 }), (turns) => {
        const { docs, deliver, flush } = linkedDocs();
        const errors: Error[] = [];
        const onError = (error: Error) => void errors.push(error);
        const peers = [peer(docs[0], 'a', START, { onError })];
        flush();
        peers.push(peer(docs[1], 'b', [], { onError }));
        turns.forEach(({ by, edit, deliver: to }, i) => {
          runEdit(peers[by].editor, edit, `${'xy'[by]}${i}`);
          expect(matchesShared(peers[by])).toBe(true);
          if (to !== null) deliver(to);
        });
        flush();
        expect(peers[1].editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
        expect(plainDelta(docs[1].getText('quoin'))).toEqual(plainDelta(docs[0].getText('quoin')));
        expect(peers.every(matchesShared)).toBe(true);
        expect(errors).toEqual([]);
      }),
      { seed: 20261021, numRuns: 300, examples: [[SPLIT_OF_A_COPY]] },
    );
  });
});
