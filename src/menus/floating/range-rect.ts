import type { SuggestionRange } from '../../extensions/ui-types';
import { domMapOf, type ViewController } from '../../view';

// A text range's box is as tall as its font, shorter than the line it sits on, so it is grown to the line height: a
// menu placed against it then never covers the line.
function lineBox(rect: DOMRect, host: HTMLElement): DOMRect {
  const lineHeight = parseFloat(getComputedStyle(host).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= rect.height) return rect;
  const grow = (lineHeight - rect.height) / 2;
  return new DOMRect(rect.x, rect.y - grow, rect.width, lineHeight);
}

function textRect(host: HTMLElement, { from, to }: SuggestionRange): DOMRect | null {
  const map = domMapOf(host);
  const range = host.ownerDocument.createRange();
  if (map === undefined || typeof range.getBoundingClientRect !== 'function') return null;
  const start = map.toDom(from, 1);
  const end = map.toDom(to, -1);
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  const rect = range.getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : rect;
}

/** Where a range of a host's text is drawn, or the host's own box when the text has no layout to measure. */
export function rangeRect(controller: ViewController, range: SuggestionRange): DOMRect | null {
  const host = controller.registry.get(range.block, range.region);
  if (host === undefined || !host.isConnected) return null;
  const rect = textRect(host, range);
  return rect === null ? host.getBoundingClientRect() : lineBox(rect, host);
}
