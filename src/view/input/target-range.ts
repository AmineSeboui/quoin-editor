import type { Pos } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { domToPos } from '../controller/dom-selection';

export type ModelRange = { from: Pos; to: Pos };

export function targetRangeToModel(controller: ViewController, event: InputEvent): ModelRange | null {
  const range = typeof event.getTargetRanges === 'function' ? event.getTargetRanges()[0] : undefined;
  if (range === undefined) return null;
  const from = domToPos(controller.registry, range.startContainer, range.startOffset);
  const to = domToPos(controller.registry, range.endContainer, range.endOffset);
  return from && to && { from, to };
}
