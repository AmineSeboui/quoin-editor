import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { inlineText } from '../engine/model/inline';
import type { EngineDoc } from '../engine/model/types';
import { md } from '../engine/test-support/editor-fixtures';
import { meshDocs } from './test-support/mesh';
import { peer, type Peer } from './test-support/peers';

const START = [md('a', 'abcdefgh'), md('b', 'ijklmnop'), md('c', 'qrstuvwx')];
const ORIGINAL = 'abcdefghijklmnopqrstuvwx';
const TOKENS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

type Turn = { by: number; kind: 'insert' | 'split' | 'join'; block: number; offset: number; deliver: [number, number] | null };

const turn = (clients: number): fc.Arbitrary<Turn> =>
  fc.record({
    by: fc.nat(clients - 1),
    kind: fc.constantFrom('insert', 'insert', 'split', 'join'),
    block: fc.nat(20),
    offset: fc.nat(20),
    deliver: fc.option(fc.tuple(fc.nat(clients - 1), fc.nat(clients - 1)), { nil: null }),
  });

const run = fc.constantFrom(2, 3).chain((clients) =>
  fc.tuple(fc.constant(clients), fc.array(turn(clients), { minLength: 1, maxLength: TOKENS.length })),
);

const written = (doc: EngineDoc) =>
  doc.blocks.flatMap((block) => Object.values(block.regions).map((inline) => inlineText(inline))).join('');

function play({ editor }: Peer, { kind, block, offset }: Turn, token: string): boolean {
  const { blocks } = editor.state.doc;
  if (blocks.length === 0) return false;
  const target = blocks[block % blocks.length];
  const length = inlineText(target.regions.text ?? []).length;
  const at = { block: target.id, region: 'text', offset: kind === 'join' ? 0 : offset % (length + 1) };
  editor.commands.setSelection({ kind: 'text', anchor: at, head: at });
  if (kind === 'insert') return editor.insertText(token);
  if (kind === 'split') return editor.commands.splitBlock();
  return editor.commands.deleteBackward();
}

describe('clients that type, split and join one document at once', () => {
  it('keep every character exactly once, and converge', () => {
    fc.assert(
      fc.property(run, ([clients, turns]) => {
        const { docs, deliver, flush } = meshDocs(clients);
        const peers = [peer(docs[0], 'a', START)];
        flush();
        for (let i = 1; i < clients; i++) peers.push(peer(docs[i], 'abc'[i]));
        const typed: string[] = [];
        turns.forEach((step, i) => {
          if (play(peers[step.by], step, TOKENS[i]) && step.kind === 'insert') typed.push(TOKENS[i]);
          if (step.deliver !== null && step.deliver[0] !== step.deliver[1]) deliver(...step.deliver);
        });
        flush();
        const text = written(peers[0].editor.state.doc);
        for (const letter of [...ORIGINAL, ...typed]) expect(text.split(letter).length - 1, letter).toBe(1);
        expect(text.length).toBe(ORIGINAL.length + typed.length);
        for (const other of peers.slice(1)) expect(other.editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
      }),
      { seed: 20261021, numRuns: 300 },
    );
  });
});
