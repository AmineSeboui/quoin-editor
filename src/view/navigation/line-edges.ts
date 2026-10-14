import { domMapOf } from '../dom/render-inline';
import type { CaretPoint } from './caret-from-point';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

const hasSize = (rect: DOMRect | undefined): rect is DOMRect =>
  rect !== undefined && (rect.width > 0 || rect.height > 0);

const edgeOf = (rect: DOMRect, right: boolean): DOMRect =>
  new DOMRect(right ? rect.right : rect.left, rect.top, 0, rect.height);

function textCaretRect(text: Text, offset: number): DOMRect | null {
  const range = (text.ownerDocument as Document).createRange();
  range.setStart(text, offset);
  const rect = range.getClientRects()[0];
  return hasSize(rect) ? rect : null;
}

function besideNode(node: Node, before: boolean): DOMRect | null {
  if (node.nodeType === TEXT_NODE) return textCaretRect(node as Text, before ? 0 : (node as Text).length);
  if (node.nodeType !== ELEMENT_NODE) return null;
  const rects = (node as Element).getClientRects();
  const rect = before ? rects[0] : rects[rects.length - 1];
  return hasSize(rect) ? edgeOf(rect, !before) : null;
}

// A collapsed range between two elements has no client rects, so the box of the child on either side marks the caret.
export function caretClientRect(point: CaretPoint): DOMRect | null {
  const { node, offset } = point;
  if (node.nodeType === TEXT_NODE) return textCaretRect(node as Text, offset);
  const after = node.childNodes[offset];
  const before = node.childNodes[offset - 1];
  return (after && besideNode(after, true)) ?? (before && besideNode(before, false)) ?? null;
}

function contentBox(host: HTMLElement): DOMRect {
  const box = host.getBoundingClientRect();
  const style = (host.ownerDocument.defaultView as Window).getComputedStyle(host);
  const left = box.left + host.clientLeft + parseFloat(style.paddingLeft);
  const top = box.top + host.clientTop + parseFloat(style.paddingTop);
  const width = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = host.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  return new DOMRect(left, top, width, height);
}

export function lineEdgeRect(host: HTMLElement, last: boolean): DOMRect | null {
  const map = domMapOf(host);
  if (!map || map.length === 0) return contentBox(host);
  return caretClientRect(map.toDom(last ? map.length : 0, last ? -1 : 1));
}

function onEdgeLine(host: HTMLElement, point: CaretPoint, last: boolean): boolean {
  if (domMapOf(host)?.length === 0) return true;
  const caret = caretClientRect(point);
  const edge = lineEdgeRect(host, last);
  if (!caret || !edge) return false;
  return Math.abs(caret.top - edge.top) < Math.max(caret.height, edge.height) / 2;
}

export function isOnFirstLine(host: HTMLElement, point: CaretPoint): boolean {
  return onEdgeLine(host, point, false);
}

export function isOnLastLine(host: HTMLElement, point: CaretPoint): boolean {
  return onEdgeLine(host, point, true);
}
