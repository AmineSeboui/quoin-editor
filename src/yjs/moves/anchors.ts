import * as Y from 'yjs';
import { authority, copyOf, type Authority } from './authority';
import type { Context } from './context';
import { idAt, idsOf, type Id } from './ids';
import { isRedirect, isUnitAlive, live, textOfUnit } from './live';
import type { KnownRecord } from './record';
import { visibleIndexOf } from './text-edit';
import { isAlive, textId, units } from './text-units';

export type Anchor = { readonly id: Id; readonly after: boolean } | { readonly relative: unknown };

/**
 * Where a character at `ordinal` of a record's source goes: right after the copy of the last source character before
 * it, before the first copy when none comes before it, or at the record's anchor when it copied nothing.
 */
export function anchorIn(record: KnownRecord, owner: Authority, ordinal: number): Anchor | null {
  let before: Id | null = null;
  let best = -1;
  for (const id of idsOf(record.from)) {
    const at = owner.ordinal(id);
    if (at < ordinal && at > best) [best, before] = [at, id];
  }
  if (before !== null) return { id: copyOf(record, before), after: true };
  if (record.to.length > 0) return { id: idAt(record.to, 0), after: false };
  return record.anchor === undefined ? null : { relative: record.anchor };
}

export const anchorKey = (anchor: Anchor) =>
  'relative' in anchor ? JSON.stringify(anchor.relative) : `${anchor.id.join(':')}:${anchor.after}`;

// A character not re-homed yet, in a text a join took, will go where that join's record sends it.
function followText(context: Context, id: Id, hops: number): { text: Y.Text; index: number } | null {
  const text = textOfUnit(context.doc, id);
  if (text === null || hops > 8) return null;
  const list = units(text);
  const owner = authority(list, context.index.over(textId(text)).filter(({ kind }) => kind !== 'map'), context.index);
  const ordinal = owner.ordinal(id);
  const record = owner.of(id);
  const next = record === null ? null : anchorIn(record, owner, ordinal);
  return next === null ? null : resolveAnchor(context, next, hops + 1);
}

/** The live text and index an anchor stands for now, or null when the text it points into is gone. */
export function resolveAnchor(context: Context, anchor: Anchor, hops = 0): { text: Y.Text; index: number } | null {
  const { doc, index } = context;
  if ('relative' in anchor) {
    const position = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(anchor.relative), doc);
    const text = position?.type;
    if (text instanceof Y.Text && isAlive(text)) return { text, index: position!.index };
    // The text is gone: the character the position leans on says where it went.
    const { item, assoc } = anchor.relative as { item?: { client: number; clock: number }; assoc?: number };
    if (item === undefined || hops > 8) return null;
    return resolveAnchor(context, { id: [item.client, item.clock], after: (assoc ?? 0) < 0 }, hops + 1);
  }
  const found = live(doc, index, anchor.id);
  if (found !== null) {
    const text = textOfUnit(doc, found)!;
    return { text, index: visibleIndexOf(text, found) + (anchor.after && isUnitAlive(doc, found) ? 1 : 0) };
  }
  const text = textOfUnit(doc, anchor.id);
  if (text !== null && isAlive(text)) return { text, index: visibleIndexOf(text, anchor.id) };
  const followed = followText(context, anchor.id, hops);
  if (followed !== null || hops > 8) return followed;
  // Yjs may have collected the text it was in: the copies made of it still say where it went.
  for (const { record, copy } of index.copiesOf(anchor.id)) {
    const place = isRedirect(record) ? null : resolveAnchor(context, { id: copy, after: anchor.after }, hops + 1);
    if (place !== null) return place;
  }
  return null;
}
