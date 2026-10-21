import fc from 'fast-check';
import { inlineText } from '../../engine/model/inline';
import type { EngineDoc } from '../../engine/model/types';
import { md } from '../../engine/test-support/editor-fixtures';
import { meshDocs } from './mesh';
import { peer, type Peer } from './peers';

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

/** Two or three clients, and what each does in turn: type a token at a caret, press Enter, or Backspace at a start. */
export const tokenRun = fc
  .constantFrom(2, 3)
  .chain((clients) => fc.tuple(fc.constant(clients), fc.array(turn(clients), { minLength: 1, maxLength: TOKENS.length })));

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

/**
 * Plays a run with updates delivered between pairs of clients in the order the run gives, then all of them. Returns
 * what went wrong, or null when every original letter and typed token is in the converged document exactly once and
 * every client holds the same blocks.
 */
export function playTokenRun([clients, turns]: [number, readonly Turn[]]): string | null {
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
  const wrong = [...ORIGINAL, ...typed].filter((letter) => text.split(letter).length !== 2);
  if (wrong.length > 0 || text.length !== ORIGINAL.length + typed.length) return `${text}: ${wrong.join('')}`;
  const blocks = JSON.stringify(peers[0].editor.getBlocks());
  return peers.every(({ editor }) => JSON.stringify(editor.getBlocks()) === blocks) ? null : 'clients differ';
}
