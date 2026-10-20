import { insertBlocks, insertBlockToWrite, type NewBlock } from '../../blocks/insert-blocks';
import { headBlockId } from '../../engine/commands/block-helpers';
import type { ViewController } from '../../view';
import type { LinkRequest } from './link-request';

/**
 * Places the link asked for once the press that closed the popover has put the caret where it wanted: at the line the
 * slash was typed on while the caret is still there, else after that line, leaving the caret alone. It goes through the
 * editor itself, so the view follows it only where focus already is.
 */
export function storeAfterPress(controller: ViewController, request: LinkRequest, block: NewBlock): void {
  const { editor } = controller;
  if (controller.readOnly || controller.root === null) return;
  controller.readSelectionFromDom();
  const line = request.at.block;
  const onLine = headBlockId(editor.state.selection) === line;
  const place = onLine ? insertBlockToWrite(block, false, line) : insertBlocks([block], 'stay', line);
  place(editor.state, (tr) => editor.dispatch(tr));
}
