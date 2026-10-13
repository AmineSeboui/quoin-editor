import type { Pos } from '../../engine';
import { inlineText } from '../../engine/model/inline';
import type { ViewController } from '../controller/view-controller';
import { regionInline } from '../controller/region-inline';
import { readDomText } from '../dom/read-dom-text';
import { textDiff } from '../dom/text-diff';
import { replaceRange } from './replace-range';

// The host's offset map predates the browser's edit, so the caret is measured on the DOM text before it instead.
function domCaretOffset(host: HTMLElement): number | undefined {
  const doc = host.ownerDocument;
  const selection = doc.getSelection();
  const node = selection?.focusNode;
  if (!selection || !node || !host.contains(node)) return undefined;
  const range = doc.createRange();
  range.setStart(host, 0);
  range.setEnd(node, selection.focusOffset);
  const before = doc.createElement('div');
  before.append(range.cloneContents());
  return readDomText(before).length;
}

export function reconcileHost(controller: ViewController, block: string, region: string, caretHint?: number): boolean {
  const element = controller.registry.get(block, region);
  const inline = regionInline(controller.editor.state, block, region);
  if (element === undefined || inline === undefined) return false;
  const edit = textDiff(inlineText(inline), readDomText(element), caretHint ?? domCaretOffset(element));
  if (edit === null) return false;
  const at = (offset: number): Pos => ({ block, region, offset });
  // Painted inside the edit so the selection is written back onto DOM the offset map describes, even when the model
  // refused the change.
  controller.edit(() => {
    const applied = replaceRange(controller.editor, { from: at(edit.from), to: at(edit.to) }, edit.insert, true);
    controller.renderHost(block, region);
    return applied;
  });
  return true;
}
