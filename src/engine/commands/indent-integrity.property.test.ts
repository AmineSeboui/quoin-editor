import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbitraryBlocks } from '../blocks/blocks-arbitrary';
import { inlineLength } from '../model/inline';
import type { EngineDoc, Pos, Selection } from '../model/types';
import { blockRangeSelection, nodeSelection, textSelection } from '../state/selection';
import { buildState, newIds, run } from '../test-support/build-state';
import { deleteBlocks } from './block-structure';
import type { Command } from './command';
import {
  deleteBackward,
  deleteForward,
  deleteSelection,
  deleteWordBackward,
  deleteWordForward,
} from './delete-commands';
import { insertText } from './insert-text';
import { setSelection } from './selection-commands';
import { splitBlock } from './split-block';

type Edge = 'start' | 'end' | number;
type Spot = [number, number, Edge];
type Choice =
  | { kind: 'caret'; at: Spot }
  | { kind: 'range'; anchor: Spot; head: Spot }
  | { kind: 'node'; at: number }
  | { kind: 'blocks'; anchor: number; head: number };
type Action = Choice | { kind: 'command'; at: number; times: number };

const edge = fc.oneof(fc.constant<Edge>('start'), fc.constant<Edge>('end'), fc.nat(99));
const spot = fc.tuple(fc.nat(99), fc.nat(9), edge);
const times = fc.integer({ min: 1, max: 3 });
const press = fc.record({ kind: fc.constant('command' as const), at: fc.nat(99), times });
const action: fc.Arbitrary<Action> = fc.oneof(
  fc.record({ kind: fc.constant('caret' as const), at: spot }),
  fc.record({ kind: fc.constant('range' as const), anchor: spot, head: spot }),
  fc.record({ kind: fc.constant('node' as const), at: fc.nat(99) }),
  fc.record({ kind: fc.constant('blocks' as const), anchor: fc.nat(99), head: fc.nat(99) }),
  { weight: 4, arbitrary: press },
);

// Backspace, Delete and Enter at block edges are what joins, removes and outdents, so they come up most often.
function editingCommands(): Command[] {
  const newId = newIds('p');
  const split = splitBlock({ newId });
  return [
    deleteBackward,
    deleteBackward,
    deleteBackward,
    deleteForward,
    deleteForward,
    split,
    split,
    deleteWordBackward,
    deleteWordForward,
    deleteSelection,
    deleteBlocks,
    insertText('x', { newId }),
  ];
}

function posAt(doc: EngineDoc, [block, region, at]: Spot): Pos | null {
  const candidates = doc.blocks.filter((candidate) => Object.keys(candidate.regions).length > 0);
  if (candidates.length === 0) return null;
  const target = candidates[block % candidates.length];
  const names = Object.keys(target.regions);
  const name = names[region % names.length];
  const length = inlineLength(target.regions[name]);
  const offset = at === 'start' ? 0 : at === 'end' ? length : at % (length + 1);
  return { block: target.id, region: name, offset };
}

function selectionFor(doc: EngineDoc, choice: Choice): Selection | null {
  const id = (at: number) => doc.blocks[at % doc.blocks.length].id;
  if (choice.kind === 'node') return nodeSelection(id(choice.at));
  if (choice.kind === 'blocks') return blockRangeSelection(id(choice.anchor), id(choice.head));
  const anchor = posAt(doc, choice.kind === 'caret' ? choice.at : choice.anchor);
  const head = posAt(doc, choice.kind === 'caret' ? choice.at : choice.head);
  return anchor === null || head === null ? null : textSelection(anchor, head);
}

function resolve(doc: EngineDoc, chosen: Action, commands: readonly Command[]): [Command, number] {
  if (chosen.kind === 'command') return [commands[chosen.at % commands.length], chosen.times];
  return [setSelection(selectionFor(doc, chosen)), 1];
}

const orphans = (doc: EngineDoc) =>
  doc.blocks.flatMap((block, i) => (block.indent > (i === 0 ? 0 : doc.blocks[i - 1].indent + 1) ? [block.id] : []));

describe('indent integrity', () => {
  it('keeps every block at most one level below the block before it through any edit', () => {
    fc.assert(
      fc.property(arbitraryBlocks(), fc.array(action, { maxLength: 20 }), (blocks, actions) => {
        const commands = editingCommands();
        let state = buildState(blocks);
        expect(orphans(state.doc)).toEqual([]);
        for (const chosen of actions) {
          if (state.doc.blocks.length === 0) return;
          const [command, times] = resolve(state.doc, chosen, commands);
          for (let time = 0; time < times; time++) {
            state = run(state, command).state;
            expect(orphans(state.doc)).toEqual([]);
          }
        }
      }),
      { numRuns: 1000 },
    );
  });
});
