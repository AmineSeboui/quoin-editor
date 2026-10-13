import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbitraryBlocks } from '../blocks/blocks-arbitrary';
import type { EngineDoc } from '../model/types';
import { buildState, newIds, run } from '../test-support/build-state';
import { orphans } from '../test-support/orphans';
import { selectionChoice, selectionFor, type SelectionChoice } from '../test-support/selection-arbitrary';
import { deleteBlocks, duplicateBlocks, indent, moveBlocksDown, moveBlocksUp, outdent } from './block-structure';
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

type Action = SelectionChoice | { kind: 'command'; at: number; times: number };

const times = fc.integer({ min: 1, max: 3 });
const press = fc.record({ kind: fc.constant('command' as const), at: fc.nat(99), times });
const action: fc.Arbitrary<Action> = fc.oneof(selectionChoice, press);

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
    indent,
    outdent,
    moveBlocksUp,
    moveBlocksDown,
    duplicateBlocks({ newId }),
  ];
}

function resolve(doc: EngineDoc, chosen: Action, commands: readonly Command[]): [Command, number] {
  if (chosen.kind === 'command') return [commands[chosen.at % commands.length], chosen.times];
  return [setSelection(selectionFor(doc, chosen)), 1];
}

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
