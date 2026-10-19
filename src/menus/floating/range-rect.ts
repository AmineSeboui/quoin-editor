import type { SuggestionRange } from '../../extensions/ui-types';
import { domMapOf, hostKey, type DomPoint, type ViewController } from '../../view';

const TEXT_NODE = 3;

// A text range's box is as tall as its font, shorter than the line it sits on, so it is grown to the line height: a
// menu placed against it then never covers the line.
function lineBox(rect: DOMRect, host: HTMLElement): DOMRect {
  const lineHeight = parseFloat(getComputedStyle(host).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= rect.height) return rect;
  const grow = (lineHeight - rect.height) / 2;
  return new DOMRect(rect.x, rect.y - grow, rect.width, lineHeight);
}

const nodeLength = (node: Node): number =>
  node.nodeType === TEXT_NODE ? (node as Text).length : node.childNodes.length;

// The offset map describes the DOM the view last drew, which the browser can change under it, so a point is kept to a
// node still in the host and to that node's length.
function pointInHost(host: HTMLElement, { node, offset }: DomPoint): DomPoint | null {
  return host.contains(node) ? { node, offset: Math.min(offset, nodeLength(node)) } : null;
}

function textRect(host: HTMLElement, { from, to }: SuggestionRange): DOMRect | null {
  const map = domMapOf(host);
  const range = host.ownerDocument.createRange();
  if (map === undefined || typeof range.getBoundingClientRect !== 'function') return null;
  const start = pointInHost(host, map.toDom(from, 1));
  const end = pointInHost(host, map.toDom(to, -1));
  if (start === null || end === null) return null;
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const rect = range.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : rect;
}

/**
 * Where a range of a host's text is drawn, or the host's own box when the text has no layout to measure. Nothing is
 * measured in a host an IME is composing in: its text is not the one the range's offsets count until the view applies
 * the composition.
 */
export function rangeRect(controller: ViewController, range: SuggestionRange): DOMRect | null {
  const host = controller.registry.get(range.block, range.region);
  if (host === undefined || !host.isConnected || controller.composingKey === hostKey(range.block, range.region)) {
    return null;
  }
  const rect = textRect(host, range);
  return rect === null ? host.getBoundingClientRect() : lineBox(rect, host);
}
