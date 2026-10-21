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
import { redo, undo, undoInputRule } from '../../engine/state/history';
import type { ViewController } from '../controller/view-controller';
import { wholeBlocks } from '../selection/selection-sink';
import { replaceRange } from './replace-range';
import { targetBeyondSelection, targetRangeToModel, type ModelRange } from './target-range';

type Action = (controller: ViewController, event: InputEvent) => void;

const ENTER: KeyLike = { key: 'Enter', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

const deleteRange = (controller: ViewController, range: ModelRange): boolean =>
  controller.edit(() => replaceRange(controller.editor, range, '', false));

const run =
  (command: Command): Action =>
  (controller) =>
    void controller.run(command);

const targetOr =
  (command: Command): Action =>
  (controller, event) => {
    const range = targetBeyondSelection(controller, event);
    if (range === null) controller.run(command);
    else deleteRange(controller, range);
  };

const leaveToHandlers: Action = () => undefined;

// WebKit sends Ctrl+T's transposed pair as insertText with no data, the pair in dataTransfer and the characters it
// replaces as the target range.
function insertTypedText(controller: ViewController, event: InputEvent): void {
  const text = event.data ?? event.dataTransfer?.getData('text/plain');
  if (!text) return;
  const range = targetBeyondSelection(controller, event);
  if (range === null) controller.edit(() => controller.editor.insertText(text));
  else controller.edit(() => replaceRange(controller.editor, range, text, false));
}

function deleteContentBackward(controller: ViewController, event: InputEvent): void {
  if (!controller.run(undoInputRule)) targetOr(deleteBackward)(controller, event);
}

function insertReplacementText(controller: ViewController, event: InputEvent): void {
  const text = event.dataTransfer?.getData('text/plain') || event.data;
  if (!text) return;
  const range = targetRangeToModel(controller, event);
  if (range === null) controller.run(insertText(text, { origin: 'input' }));
  else controller.edit(() => replaceRange(controller.editor, range, text, false));
}

const actions: Readonly<Record<string, Action>> = {
  insertText: insertTypedText,
  insertReplacementText,
  insertParagraph: (controller) => void controller.edit(() => controller.editor.handleKey(ENTER)),
  insertLineBreak: run(insertHardBreak),
  deleteContentBackward,
  deleteContentForward: targetOr(deleteForward),
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

export const isComposingInput = (controller: ViewController, event: InputEvent): boolean =>
  event.isComposing || controller.composingKey !== null;

// The sink holds whole blocks editable only so that the browser fires clipboard events for them, so what is typed into
// it is ignored, as it was when focus sat on a shell that could not be typed into.
const TYPED_INPUT: ReadonlySet<string> = new Set(['insertText', 'insertReplacementText']);

export function handleBeforeInput(controller: ViewController, event: InputEvent): void {
  const { inputType } = event;
  if (isComposingInput(controller, event)) return;
  if (!event.cancelable || !Object.hasOwn(actions, inputType)) return;
  event.preventDefault();
  if (TYPED_INPUT.has(inputType) && wholeBlocks(controller.editor.state.selection)) return;
  actions[inputType](controller, event);
}
