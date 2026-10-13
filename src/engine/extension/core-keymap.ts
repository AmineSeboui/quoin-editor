import { duplicateBlocks, indent, moveBlocksDown, moveBlocksUp, outdent } from '../commands/block-structure';
import type { Command } from '../commands/command';
import { deleteBackward, deleteForward } from '../commands/delete-commands';
import { insertHardBreak } from '../commands/hard-break';
import { toggleMark } from '../commands/marks';
import { selectAll, selectBlock } from '../commands/selection-commands';
import { setBlockType } from '../commands/turn-into';
import { splitBlockWithRules } from '../rules/enter-rules';
import { undoInputRule } from '../state/history';

const HEADINGS = [1, 2, 3, 4, 5, 6];

const line = (attrs: Record<string, unknown>): Command => setBlockType('MARKDOWN', attrs);

const firstThatApplies =
  (...commands: readonly Command[]): Command =>
  (state, dispatch) =>
    commands.some((command) => command(state, dispatch));

export function coreKeymap(options: { newId?: () => string } = {}): Record<string, Command> {
  return {
    Enter: splitBlockWithRules(options),
    'Shift-Enter': insertHardBreak,
    Backspace: firstThatApplies(undoInputRule, deleteBackward),
    Delete: deleteForward,
    Tab: indent,
    'Shift-Tab': outdent,
    'Mod-a': selectAll,
    Escape: selectBlock,
    'Mod-Shift-ArrowUp': moveBlocksUp,
    'Mod-Shift-ArrowDown': moveBlocksDown,
    'Mod-d': duplicateBlocks(options),
    'Mod-Alt-0': line({ kind: 'paragraph' }),
    ...Object.fromEntries(HEADINGS.map((level) => [`Mod-Alt-${level}`, line({ kind: 'heading', level })])),
    'Mod-Shift-7': line({ kind: 'ordered' }),
    'Mod-Shift-8': line({ kind: 'bullet' }),
    'Mod-Shift-9': line({ kind: 'task' }),
    'Mod-b': toggleMark('bold'),
    'Mod-i': toggleMark('italic'),
    'Mod-u': toggleMark('underline'),
    'Mod-Shift-s': toggleMark('strike'),
    'Mod-e': toggleMark('code'),
    'Mod-Shift-h': toggleMark('highlight'),
  };
}
