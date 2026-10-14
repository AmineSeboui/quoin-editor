import type { Pos } from '../../engine';
import { domToPos } from '../controller/dom-selection';
import type { HostEntry } from '../controller/host-registry';
import type { ViewController } from '../controller/view-controller';
import { domMapOf } from '../dom/render-inline';
import { caretFromPoint } from '../navigation/caret-from-point';
import { visibleBlockIndexes } from '../navigation/visible-blocks';

function distance(rect: DOMRect, x: number, y: number): [number, number] {
  const dy = y < rect.top ? rect.top - y : Math.max(0, y - rect.bottom);
  const dx = x < rect.left ? rect.left - x : Math.max(0, x - rect.right);
  return [dy, dx];
}

function nearest<T>(items: Iterable<T>, element: (item: T) => HTMLElement, x: number, y: number): T | null {
  let best: T | null = null;
  let bestY = Infinity;
  let bestX = Infinity;
  for (const item of items) {
    const [dy, dx] = distance(element(item).getBoundingClientRect(), x, y);
    if (dy < bestY || (dy === bestY && dx < bestX)) [best, bestY, bestX] = [item, dy, dx];
  }
  return best;
}

const elementAt = (controller: ViewController, x: number, y: number): Element | null =>
  controller.root?.ownerDocument.elementFromPoint(x, y) ?? null;

// Between blocks, or past the editor, the pointer belongs to the host nearest to it vertically.
export function hostAt(controller: ViewController, x: number, y: number): HostEntry | null {
  const { registry } = controller;
  return registry.locate(elementAt(controller, x, y)) ?? nearest(registry.all(), (entry) => entry.element, x, y);
}

export function blockAt(controller: ViewController, x: number, y: number): string | null {
  const element = elementAt(controller, x, y);
  const under = element && controller.blockAt(element);
  if (under !== undefined && under !== null) return under;
  const { doc } = controller.editor.state;
  const drawn = visibleBlockIndexes(doc).flatMap((index) => {
    const shell = controller.blockElement(doc.blocks[index].id);
    return shell ? [{ id: doc.blocks[index].id, shell }] : [];
  });
  return nearest(drawn, (entry) => entry.shell, x, y)?.id ?? null;
}

export function caretPosAt(controller: ViewController, host: HostEntry, x: number, y: number): Pos {
  const { element, block, region } = host;
  const at = (offset: number): Pos => ({ block, region, offset });
  const end = domMapOf(element)?.length ?? 0;
  const box = element.getBoundingClientRect();
  if (y < box.top) return at(0);
  if (y >= box.bottom) return at(end);
  const point = caretFromPoint(element.ownerDocument, Math.min(Math.max(x, box.left), box.right - 1), y);
  const pos = point && domToPos(controller.registry, point.node, point.offset);
  if (pos && pos.block === block && pos.region === region) return pos;
  return at(x < box.left ? 0 : end);
}
