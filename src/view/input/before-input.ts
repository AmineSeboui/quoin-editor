import type { Command, KeyLike } from '../../engine';
import {
  deleteBackward,
  deleteForward,
  deleteToLineEnd,
  deleteToLineStart,
  deleteWordBackward,
  deleteWordForward,
} from '../../engine/commands/delete-commands';
import { insertHardBreak } from '../../engine/commands/hard-break';
import { insertText } from '../../engine/commands/insert-text';
import { toggleMark } from '../../engine/commands/marks';
import { transposeChars } from '../../engine/commands/transpose-chars';
import { sameSelection, textSelection } from '../../engine/state/selection';
import { redo, undo, undoInputRule } from '../../engine/state/history';
import type { ViewController } from '../controller/view-controller';
import { replaceRange } from './replace-range';
import { targetRangeToModel, type ModelRange } from './target-range';

type Action = (controller: ViewController, event: InputEvent) => void;

const ENTER: KeyLike = { key: 'Enter', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

const isEmpty = ({ from, to }: ModelRange): boolean =>
  from.block === to.block && from.region === to.region && from.offset === to.offset;

const deleteRange = (controller: ViewController, range: ModelRange): boolean =>
  controller.edit(() => replaceRange(controller.editor, range, '', false));

const run =
  (command: Command): Action =>
  (controller) =>
    void controller.run(command);

const targetOr =
  (command: Command): Action =>
  (controller, event) => {
    const range = targetRangeToModel(controller, event);
    if (range === null || isEmpty(range)) controller.run(command);
    else deleteRange(controller, range);
  };

const leaveToHandlers: Action = () => undefined;

function insertTypedText(controller: ViewController, { data }: InputEvent): void {
  if (data) controller.edit(() => controller.editor.insertText(data));
}

function deleteContentBackward(controller: ViewController, event: InputEvent): void {
  if (controller.run(undoInputRule)) return;
  const range = targetRangeToModel(controller, event);
  const selection = controller.editor.state.selection;
  if (range === null || isEmpty(range) || sameSelection(textSelection(range.from, range.to), selection)) {
    controller.run(deleteBackward);
  } else {
    deleteRange(controller, range);
  }
}

function insertReplacementText(controller: ViewController, event: InputEvent): void {
  const text = event.dataTransfer?.getData('text/plain') || event.data;
  if (!text) return;
  const range = targetRangeToModel(controller, event);
  if (range === null) controller.run(insertText(text));
  else controller.edit(() => replaceRange(controller.editor, range, text, false));
}

const actions: Readonly<Record<string, Action>> = {
  insertText: insertTypedText,
  insertReplacementText,
  insertParagraph: (controller) => void controller.edit(() => controller.editor.handleKey(ENTER)),
  insertLineBreak: run(insertHardBreak),
  deleteContentBackward,
  deleteContentForward: run(deleteForward),
  deleteWordBackward: targetOr(deleteWordBackward),
  deleteWordForward: targetOr(deleteWordForward),
  deleteSoftLineBackward: targetOr(deleteToLineStart),
  deleteHardLineBackward: targetOr(deleteToLineStart),
  deleteSoftLineForward: targetOr(deleteToLineEnd),
  deleteHardLineForward: targetOr(deleteToLineEnd),
  formatBold: run(toggleMark('bold')),
  formatItalic: run(toggleMark('italic')),
  formatUnderline: run(toggleMark('underline')),
  formatStrikeThrough: run(toggleMark('strike')),
  historyUndo: run(undo),
  historyRedo: run(redo),
  insertTranspose: run(transposeChars),
  insertFromPaste: leaveToHandlers,
  insertFromDrop: leaveToHandlers,
  deleteByCut: leaveToHandlers,
  deleteByDrag: leaveToHandlers,
};

export function handleBeforeInput(controller: ViewController, event: InputEvent): void {
  const { inputType } = event;
  if (event.isComposing || controller.composingKey !== null) return;
  if (!event.cancelable || !Object.hasOwn(actions, inputType)) return;
  event.preventDefault();
  actions[inputType](controller, event);
}
