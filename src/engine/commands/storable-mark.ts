import { parseInline } from '../markdown/inline/parse-inline';
import { serializeInline } from '../markdown/inline/serialize-inline';
import { sanitizeHref } from '../markdown/urls';
import { atom, equalInline, normalizeInline, text } from '../model/inline';
import type { Attrs, Inline, Mark } from '../model/types';

// A mark or atom is storable when the markdown written for it reads back as the very same inline content.
function readsBack(inline: Inline): boolean {
  return equalInline(parseInline(serializeInline(inline)), normalizeInline(inline));
}

function safeLink(mark: Mark): Mark | null {
  const href = mark.attrs?.href;
  const safe = typeof href === 'string' ? sanitizeHref(href) : null;
  return safe ? { type: 'link', attrs: { ...mark.attrs, href: safe } } : null;
}

export function storableMark(mark: Mark): Mark | null {
  const candidate = mark.type === 'link' ? safeLink(mark) : mark;
  return candidate !== null && readsBack([text('a', [candidate])]) ? candidate : null;
}

export function storableAtom(type: string, attrs: Attrs): boolean {
  return readsBack([atom(type, attrs)]);
}
