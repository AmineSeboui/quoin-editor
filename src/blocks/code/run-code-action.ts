import { blockRangeSelection, redo, undo, type Command } from '../../engine';
import { selectAll, setSelection } from '../../engine/commands/selection-commands';
import type { ViewController } from '../../view';
import { textDiff } from '../../view/dom/text-diff';
import { codeToParagraph, leaveCode } from './code-actions';
import { applyCodeEdit } from './code-field';
import type { CodeKeyAction } from './code-keys';

export type CodeActionContext = {
  controller: ViewController;
  blockId: string;
  area: HTMLTextAreaElement;
  write(value: string): void;
  focusControls(): void;
};

function selectAndFocus({ controller }: CodeActionContext, command: Command): true {
  controller.run(command);
  controller.focus();
  return true;
}

// A step of history that changed the code leaves the caret where it did; one that changed another block takes focus to it.
function travel({ controller, blockId, area }: CodeActionContext, command: Command): true {
  const before = area.value;
  controller.run(command);
  const { selection } = controller.editor.state;
  const edit = textDiff(before, area.value);
  if (selection?.kind !== 'node' || selection.block !== blockId) controller.focus();
  else if (edit !== null) area.setSelectionRange(edit.from + edit.insert.length, edit.from + edit.insert.length);
  return true;
}

/** Runs what a key asked of the code block. False when the key is the text area's after all. */
export function runCodeAction(action: CodeKeyAction, context: CodeActionContext): boolean {
  const { controller, blockId, area } = context;
  switch (action.kind) {
    case 'edit':
      applyCodeEdit(area, action.field, context.write);
      return true;
    case 'leave':
      return leaveCode(controller, blockId, action.direction, action.addsLine);
    case 'paragraph':
      return selectAndFocus(context, codeToParagraph(blockId));
    case 'undo':
      return travel(context, undo);
    case 'redo':
      return travel(context, redo);
    case 'selectAll':
      return selectAndFocus(context, selectAll);
    case 'escape':
      return selectAndFocus(context, setSelection(blockRangeSelection(blockId)));
    case 'controls':
      context.focusControls();
      return true;
  }
}
