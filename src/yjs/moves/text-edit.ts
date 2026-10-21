import type * as Y from 'yjs';
import { idKey, type Id } from './ids';
import { units, visibleIds } from './text-units';

export type Piece = { readonly insert: string | object; readonly attributes: Readonly<Record<string, unknown>> };

/** The index a reader sees `id` at, counting only what is visible before it, or -1 when the text lacks it. */
export function visibleIndexOf(text: Y.Text, id: Id): number {
  const key = idKey(id);
  let index = 0;
  for (const unit of units(text)) {
    if (idKey(unit.id) === key) return index;
    if (unit.alive && unit.countable) index += 1;
  }
  return -1;
}

export function deleteIds(text: Y.Text, keys: ReadonlySet<string>): void {
  const indexes: number[] = [];
  let index = 0;
  for (const unit of units(text)) {
    if (!unit.alive || !unit.countable) continue;
    if (keys.has(idKey(unit.id))) indexes.push(index);
    index += 1;
  }
  for (const at of indexes.reverse()) text.delete(at, 1);
}

/** Inserts `pieces` at `index` with their own attributes and returns the ids they were given. */
export function insertPieces(text: Y.Text, index: number, pieces: readonly Piece[]): Id[] {
  let at = index;
  for (const { insert, attributes } of pieces) {
    if (typeof insert === 'string') text.insert(at, insert, { ...attributes });
    else text.insertEmbed(at, insert, { ...attributes });
    at += typeof insert === 'string' ? insert.length : 1;
  }
  return visibleIds(text, index, at);
}
