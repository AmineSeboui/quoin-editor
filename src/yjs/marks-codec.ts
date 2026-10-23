import { markKey } from '../engine/model/marks';
import type { Attrs, Mark } from '../engine/model/types';

export type FormatValue = boolean | string | Attrs;

// Yjs reads attributes as properties of plain objects, so a key Object.prototype has would read as already set.
const ESCAPE = '$';
const escapeKey = (key: string) => (key in Object.prototype || key.startsWith(ESCAPE) ? ESCAPE + key : key);
const unescapeKey = (key: string) => (key.startsWith(ESCAPE) ? key.slice(1) : key);

const onlyString = (attrs: Attrs, key: string) =>
  Object.keys(attrs).length === 1 && Object.hasOwn(attrs, key) && typeof attrs[key] === 'string';

/**
 * A mark as a formatting attribute of `Y.Text`, keyed like the engine keys marks so stackable marks such as
 * `comment:c1` sit side by side. The value is the shortest form the reader can tell apart: `true` for a mark with no
 * attrs, or a stacked one whose only attr is its id; `false` for a stacked one with no attrs; the string when the only
 * attr is a string named like the mark (`color: 'red'`); otherwise the attrs themselves.
 */
export function markAttribute(mark: Mark): [string, FormatValue] {
  const key = markKey(mark);
  const { attrs } = mark;
  const stacked = key !== mark.type;
  if (attrs === undefined) return [escapeKey(key), !stacked];
  if (stacked && onlyString(attrs, 'id')) return [escapeKey(key), true];
  if (onlyString(attrs, mark.type)) return [escapeKey(key), attrs[mark.type]];
  return [escapeKey(key), attrs];
}

function stackedType(key: string): [string, string] | null {
  const colon = key.indexOf(':');
  if (colon < 1) return null;
  const type = key.slice(0, colon);
  const id = key.slice(colon + 1);
  return markKey({ type, attrs: { id } }) === key ? [type, id] : null;
}

export function markFromAttribute(attribute: string, value: unknown): Mark {
  const key = unescapeKey(attribute);
  const stacked = stackedType(key);
  const type = stacked?.[0] ?? key;
  if (value === true) return stacked === null ? { type } : { type, attrs: { id: stacked[1] } };
  if (value === false) return { type };
  if (typeof value === 'string') return { type, attrs: { [type]: value } };
  return { type, attrs: value as Attrs };
}

export const marksToAttributes = (marks: readonly Mark[]): Record<string, FormatValue> =>
  Object.fromEntries(marks.map(markAttribute));

export const attributesToMarks = (attributes: Readonly<Record<string, unknown>> = {}): Mark[] =>
  Object.entries(attributes).map(([key, value]) => markFromAttribute(key, value));
