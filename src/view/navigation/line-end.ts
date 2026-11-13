import type { Selection } from '../../engine';
import { isCollapsed } from '../../engine/state/selection';
import type { ViewController } from '../controller/view-controller';
import { glyphsAround } from './glyph';
import { wrapsAt } from './stay-on-line';

const leftLines = new WeakMap<ViewController, number>();

const toLineEnd = ({ isMac }: ViewController, { altKey, ctrlKey, metaKey }: KeyboardEvent, key: string): boolean =>
  !altKey && (isMac ? key === 'ArrowRight' && metaKey && !ctrlKey : key === 'End' && !ctrlKey && !metaKey);

/**
 * The browser takes the caret to the end of its line on End, or on Command with the arrow towards the end of the line
 * on a Mac, where End scrolls the page, and draws it at that end before a soft wrap. The native selection cannot tell
 * that from the start of the next line, so the line the key left from is kept to read the side back.
 */
export function noteLineEnd(controller: ViewController, event: KeyboardEvent, key: string): void {
  leftLines.delete(controller);
  const { selection } = controller.editor.state;
  if (selection?.kind !== 'text' || event.defaultPrevented || !toLineEnd(controller, event, key)) return;
  const { head, assoc } = selection;
  const glyphAt = glyphsAround(controller.registry, head);
  const glyph = (assoc !== -1 && glyphAt(head.offset)) || glyphAt(head.offset - 1);
  if (glyph) leftLines.set(controller, glyph.rect.top + glyph.rect.height / 2);
}

/** The first caret read after the line end key, on the side of the soft wrap that ends the line it left from. */
export function sideOfLineEnd(controller: ViewController, selection: Selection | null): Selection | null {
  const y = leftLines.get(controller);
  leftLines.delete(controller);
  if (y === undefined || selection?.kind !== 'text' || !isCollapsed(selection)) return selection;
  const { head } = selection;
  return wrapsAt(head, y, glyphsAround(controller.registry, head)) ? { ...selection, assoc: -1 } : selection;
}
