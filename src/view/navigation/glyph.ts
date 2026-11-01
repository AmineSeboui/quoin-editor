import type { Pos } from '../../engine';
import type { HostRegistry } from '../controller/host-registry';
import { domMapOf } from '../dom/render-inline';
import type { GlyphAt } from './stay-on-line';

/** The range over the character or atom that starts at `pos`, or null past the end of its region. */
export function glyphAt(registry: HostRegistry, pos: Pos): Range | null {
  const host = registry.get(pos.block, pos.region);
  const map = host && domMapOf(host);
  if (!host || !map || pos.offset < 0 || pos.offset >= map.length) return null;
  const start = map.toDom(pos.offset, 1);
  const end = map.toDom(pos.offset + 1, -1);
  const range = host.ownerDocument.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}

/** Where a caret drawn at the end of a line before a soft wrap is: the right edge of the glyph before `pos`. */
export function upstreamCaret(registry: HostRegistry, pos: Pos): DOMRect | null {
  const rect = glyphAt(registry, { ...pos, offset: pos.offset - 1 })?.getBoundingClientRect();
  return rect ? new DOMRect(rect.right, rect.top, 0, rect.height) : null;
}

export const glyphsAround = (registry: HostRegistry, pos: Pos): GlyphAt => (offset) => {
  const range = glyphAt(registry, { ...pos, offset });
  return range && { rect: range.getBoundingClientRect(), text: range.toString() };
};
