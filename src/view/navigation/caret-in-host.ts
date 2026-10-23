import type { Pos } from '../../engine';
import { domToPos } from '../controller/dom-selection';
import type { HostRegistry } from '../controller/host-registry';
import { caretFromPoint } from './caret-from-point';

/** The position at a point, kept between the left and right edges of the host; null when it is outside its region. */
export function caretInHost(
  registry: HostRegistry,
  element: HTMLElement,
  box: DOMRect,
  at: { block: string; region: string },
  x: number,
  y: number,
): Pos | null {
  const point = caretFromPoint(element.ownerDocument, Math.min(Math.max(x, box.left), box.right - 1), y);
  const pos = point && domToPos(registry, point.node, point.offset);
  return pos && pos.block === at.block && pos.region === at.region ? pos : null;
}
