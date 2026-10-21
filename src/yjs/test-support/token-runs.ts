import fc from 'fast-check';
import { inlineText } from '../../engine/model/inline';
import type { EngineDoc } from '../../engine/model/types';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { sameDoc } from '../../engine/model/same-doc';
import { removeBlocksStep, replaceBlockStep } from '../../engine/transform/block-steps';
import { md } from '../../engine/test-support/editor-fixtures';
import { meshDocs } from './mesh';
import { peer, type Peer } from './peers';

const DIVIDER: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };
const TABLE: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['', ''], ['', '']], header: true } };
const START = [md('z', ''), md('a', 'abcdefgh'), DIVIDER, md('e', ''), md('b', 'ijklmnop'), TABLE, md('c', 'qrstuvwx')];
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

/** Edits two clients make at once that leave the shared text out of shape before the run starts. */
type Trigger = { kind: 'move' | 'row' | 'stray' | 'first'; block: number };

const trigger: fc.Arbitrary<Trigger> = fc.record({
  kind: fc.constantFrom('move', 'row', 'stray', 'first'),
  block: fc.nat(6),
});

export type TokenRun = [clients: number, seedAll: boolean, triggers: readonly Trigger[], turns: readonly Turn[]];

/**
 * Two or three clients, whether all of them seed the document at once, edits that leave the text out of shape, and
 * what each client then does in turn: type a token at a caret, press Enter, or Backspace at a start.
 */
export const tokenRun: fc.Arbitrary<TokenRun> = fc
  .constantFrom(2, 3)
  .chain((clients) =>
    fc.tuple(
      fc.constant(clients),
      fc.boolean(),
      fc.array(trigger, { maxLength: 3 }),
      fc.array(turn(clients), { minLength: 1, maxLength: TOKENS.length - 4 }),
    ),
  );

const written = (doc: EngineDoc) =>
  doc.blocks.flatMap((block) => Object.values(block.regions).map((inline) => inlineText(inline))).join('');

const caretAt = (block: string, offset: number) => {
  const at = { block, region: 'text', offset };
  return { kind: 'text' as const, anchor: at, head: at };
};

function addRow({ editor }: Peer): void {
  const table = editor.state.doc.blocks.find((block) => block.type === 'TABLE');
  if (table === undefined) return;
  const rows = Number(table.attrs.rows);
  const regions = { ...table.regions, [`cell:${rows}:0`]: [], [`cell:${rows}:1`]: [] };
  const step = replaceBlockStep({ ...table, attrs: { ...table.attrs, rows: rows + 1 }, regions });
  editor.dispatch(editor.createTransaction().step(step));
}

const removeBlock = ({ editor }: Peer, id: string) => {
  const index = editor.state.doc.blocks.findIndex((block) => block.id === id);
  if (index >= 0) editor.dispatch(editor.createTransaction().step(removeBlocksStep(index, 1)));
};

// Only an empty block is taken out, so that no original letter goes with it.
const empty = ({ editor }: Peer, id: string) => {
  const block = editor.state.doc.blocks.find((candidate) => candidate.id === id);
  return block !== undefined && inlineText(block.regions.text ?? []) === '';
};

// The two first clients make the edit at the same moment; returns the token it typed, if any.
function triggered([one, two]: Peer[], { kind, block }: Trigger, token: string): string[] {
  if (kind === 'row') [one, two].forEach(addRow);
  if (kind === 'move') {
    const { blocks } = one.editor.state.doc;
    const id = blocks[block % blocks.length].id;
    for (const { editor } of [one, two]) {
      if (!editor.state.doc.index.has(id)) continue;
      editor.commands.setSelection({ kind: 'node', block: id });
      editor.commands.moveBlocksDown();
    }
  }
  if (kind === 'stray' && [one, two].every((client) => empty(client, 'e'))) {
    removeBlock(one, 'e');
    two.editor.commands.setSelection(caretAt('e', 0));
    return two.editor.insertText(token) ? [token] : [];
  }
  const leading = one.editor.state.doc.blocks[0].id === 'z' && two.editor.state.doc.blocks[1]?.id === 'a';
  if (kind === 'first' && leading && empty(one, 'z')) {
    removeBlock(one, 'z');
    two.editor.commands.setSelection(caretAt('a', 0));
    two.editor.commands.deleteBackward();
  }
  return [];
}

function play({ editor }: Peer, { kind, block, offset }: Turn, token: string): boolean {
  const blocks = editor.state.doc.blocks.filter((candidate) => Object.hasOwn(candidate.regions, 'text'));
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
export function playTokenRun([clients, seedAll, triggers, turns]: TokenRun): string | null {
  const { docs, deliver, flush } = meshDocs(clients);
  const peers = [peer(docs[0], 'a', START)];
  if (!seedAll) flush();
  for (let i = 1; i < clients; i++) peers.push(peer(docs[i], 'abc'[i], seedAll ? START : []));
  flush();
  const typed: string[] = [];
  triggers.forEach((edit, i) => {
    typed.push(...triggered(peers, edit, TOKENS[TOKENS.length - 1 - i]));
    flush();
  });
  turns.forEach((step, i) => {
    if (play(peers[step.by], step, TOKENS[i]) && step.kind === 'insert') typed.push(TOKENS[i]);
    if (step.deliver !== null && step.deliver[0] !== step.deliver[1]) deliver(...step.deliver);
  });
  flush();
  const text = written(peers[0].editor.state.doc);
  const wrong = [...ORIGINAL, ...typed].filter((letter) => text.split(letter).length !== 2);
  if (wrong.length > 0 || text.length !== ORIGINAL.length + typed.length) return `${text}: ${wrong.join('')}`;
  // Engine documents, not getBlocks: a client keeps the host data of a block it loaded, which the others write anew.
  const doc = peers[0].editor.state.doc;
  return peers.every(({ editor }) => sameDoc(editor.state.doc, doc)) ? null : 'clients differ';
}
