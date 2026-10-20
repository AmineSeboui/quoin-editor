import type { EditorState } from '../state/editor-state';
import { redo, undo, undoInputRule } from '../state/history';
import type { Transaction } from '../state/transaction';
import {
  deleteBlocks,
  duplicateBlocks,
  indent,
  insertBlockAfter,
  moveBlocksDown,
  moveBlocksUp,
  outdent,
  toggleTask,
} from './block-structure';
import { setAttrs, setBlockColor, setTextAlign } from './block-style';
import type { Command } from './command';
import { runCommands } from './run-commands';
import {
  deleteBackward,
  deleteForward,
  deleteSelection,
  deleteToLineEnd,
  deleteToLineStart,
  deleteWordBackward,
  deleteWordForward,
} from './delete-commands';
import { insertHardBreak } from './hard-break';
import { insertText } from './insert-text';
import {
  clearFormatting,
  insertAtom,
  insertMention,
  setLink,
  setMark,
  toggleMark,
  unsetLink,
  unsetMark,
} from './marks';
import { moveBlocksTo } from './move-blocks-to';
import { selectAll, selectBlock, setSelection } from './selection-commands';
import { splitBlock } from './split-block';
import { setBlockType } from './turn-into';

export type CommandFactories = Readonly<Record<string, (...args: never[]) => Command>>;

export type BoundCommands<F extends CommandFactories> = { [K in keyof F]: (...args: Parameters<F[K]>) => boolean };

export type Chain<F extends CommandFactories> = {
  [K in keyof F]: (...args: Parameters<F[K]>) => Chain<F>;
} & { run(): boolean };

export const coreCommandFactories = {
  insertText,
  insertHardBreak: () => insertHardBreak,
  deleteSelection: () => deleteSelection,
  deleteBackward: () => deleteBackward,
  deleteForward: () => deleteForward,
  deleteWordBackward: () => deleteWordBackward,
  deleteWordForward: () => deleteWordForward,
  deleteToLineStart: () => deleteToLineStart,
  deleteToLineEnd: () => deleteToLineEnd,
  splitBlock,
  undo: () => undo,
  redo: () => redo,
  undoInputRule: () => undoInputRule,
  toggleMark,
  setMark,
  unsetMark,
  setLink,
  unsetLink: () => unsetLink,
  clearFormatting: () => clearFormatting,
  insertAtom,
  insertMention,
  setBlockType,
  setAttrs,
  toggleTask: () => toggleTask,
  indent: () => indent,
  outdent: () => outdent,
  moveBlocksUp: () => moveBlocksUp,
  moveBlocksDown: () => moveBlocksDown,
  moveBlocksTo,
  duplicateBlocks,
  deleteBlocks: () => deleteBlocks,
  insertBlockAfter,
  setTextAlign,
  setBlockColor,
  selectAll: () => selectAll,
  selectBlock: () => selectBlock,
  setSelection,
} satisfies CommandFactories;

export function createCommandHelpers<F extends CommandFactories>(
  getState: () => EditorState,
  dispatch: (tr: Transaction) => void,
  factories: F,
  live: () => boolean = () => true,
): { commands: BoundCommands<F>; chain(): Chain<F>; can(): BoundCommands<F> } {
  const names = Object.keys(factories);
  const bind = (send?: (tr: Transaction) => void): BoundCommands<F> =>
    Object.fromEntries(
      names.map((name) => [name, (...args: never[]) => live() && factories[name](...args)(getState(), send)]),
    ) as unknown as BoundCommands<F>;
  const commands = bind(dispatch);
  const dryRun = bind();

  function chain(): Chain<F> {
    const queue: Command[] = [];
    const built: Record<string, unknown> = {
      run() {
        if (!live()) return false;
        const { ok, tr } = runCommands(getState(), queue);
        if (ok && tr !== null) dispatch(tr);
        return ok;
      },
    };
    for (const name of names) {
      built[name] = (...args: never[]) => {
        queue.push(factories[name](...args));
        return built;
      };
    }
    return built as Chain<F>;
  }

  return { commands, chain, can: () => dryRun };
}
