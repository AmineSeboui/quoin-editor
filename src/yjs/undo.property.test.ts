import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { blockById } from '../engine/model/doc';
import { inlineText } from '../engine/model/inline';
import { sameValue } from '../engine/model/same-value';
import type { EngineBlock, EngineDoc } from '../engine/model/types';
import type { Transaction } from '../engine/state/transaction';
import type { SelectionChoice } from '../engine/test-support/selection-arbitrary';
import { md } from '../engine/test-support/editor-fixtures';
import { linkedDocs, peer, type Peer } from './test-support/peers';
import { arbitraryEdit, runEdit, type Edit } from './test-support/random-edits';

const START = [md('a', 'one two three'), md('b', 'four five'), md('c', 'ten seven')];
const TYPED = ['x', 'y'];
const FOREIGN: readonly string[] = ['remote', 'history'];

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

const settings = (block?: EngineBlock): Record<string, unknown> => ({ ...block?.attrs, indent: block?.indent });

// Which client wrote each setting of each block, as `block key`, even a value it already held.
function noteSettings(writers: Map<string, Set<number>>, by: number, tr: Transaction): void {
  for (const step of tr.steps) {
    const { stepType, block, patch } = step.toJSON() as { stepType: string; block: string; patch?: object };
    const keys = stepType === 'setIndent' ? ['indent'] : stepType === 'setAttrs' ? Object.keys(patch!) : [];
    for (const key of keys) writers.set(`${block} ${key}`, (writers.get(`${block} ${key}`) ?? new Set()).add(by));
  }
}

// Settings both clients changed are left out: Yjs never lets an undo overwrite a value another client wrote later to
// the same key.
function changedBack(writers: Map<string, Set<number>>, start: EngineDoc, end: EngineDoc): string[] {
  return start.blocks.flatMap((block) => {
    const [was, now] = [settings(block), settings(blockById(end, block.id))];
    return [...new Set([...Object.keys(was), ...Object.keys(now)])]
      .filter((key) => (writers.get(`${block.id} ${key}`)?.size ?? 0) < 2 && !sameValue(was[key], now[key]))
      .map((key) => `${block.id} ${key}`);
  });
}

function undoAll({ editor }: Peer): void {
  while (editor.commands.undo());
}

describe('undo on one of two synced editors', () => {
  it('undoes only its own changes, and with both undone the text and the settings of the start are back', () => {
    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 12 }), (turns) => {
        const { docs, deliver, flush } = linkedDocs();
        const peers = [peer(docs[0], 'a', START)];
        flush();
        peers.push(peer(docs[1], 'b'));
        const start = peers[0].editor.state.doc;
        const writers = new Map<string, Set<number>>();
        peers.forEach(({ editor }, by) =>
          editor.subscribe((_, tr) => tr !== null && !FOREIGN.includes(tr.origin) && noteSettings(writers, by, tr)),
        );
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
        expect(written(peers[0].editor.state.doc)).toBe(written(start));
        expect(changedBack(writers, start, peers[0].editor.state.doc)).toEqual([]);
        expect(peers[1].editor.getBlocks()).toEqual(peers[0].editor.getBlocks());
      }),
      { seed: 20261021, numRuns: 300 },
    );
  });
});
