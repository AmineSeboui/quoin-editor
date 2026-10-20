import { headBlockId } from '../../engine/commands/block-helpers';
import { endOf } from '../../engine/state/selection';
import type { ViewController } from '../../view';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const reducesMotion = (view: Window | null): boolean =>
  typeof view?.matchMedia === 'function' && view.matchMedia(REDUCED_MOTION).matches;

/**
 * Puts the caret at the end of the heading and brings the block it lands in into view, smoothly unless the reader asks
 * for less motion. The caret meant for a heading a closed toggle hides lands in the toggle.
 */
export function goToHeading(controller: ViewController, blockId: string): void {
  const { editor, root } = controller;
  const { doc, schema } = editor.state;
  const end = doc.index.has(blockId) ? endOf(doc, schema, blockId) : null;
  if (root === null || end?.kind !== 'text') return;
  controller.focus(end.head);
  const landed = headBlockId(editor.state.selection);
  const shell = landed === null ? undefined : controller.blockElement(landed);
  const behavior = reducesMotion(root.ownerDocument.defaultView) ? 'auto' : 'smooth';
  shell?.scrollIntoView({ behavior, block: 'start' });
}
