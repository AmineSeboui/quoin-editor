import * as Y from 'yjs';
import { authority, copied, copyOf } from './authority';
import { idKey, type Id } from './ids';
import type { KnownRecord } from './record';
import type { RecordIndex } from './record-index';
import { itemAt, textId, units } from './text-units';

const MAX_HOPS = 256;

/** A record that points copies a client took back at what stands instead, rather than copying anything. */
export const isRedirect = (record: KnownRecord) =>
  (record.kind === 'map' && record.against === undefined) || record.all === true;

export const isUnitAlive = (doc: Y.Doc, id: Id) => {
  const item = itemAt(doc, id);
  return item !== null && !item.deleted;
};

export function textOfUnit(doc: Y.Doc, id: Id): Y.Text | null {
  const parent = itemAt(doc, id)?.parent;
  return parent instanceof Y.Text ? parent : null;
}

function authoritativeCopy(doc: Y.Doc, index: RecordIndex, id: Id): Id | null {
  const text = textOfUnit(doc, id);
  if (text === null) return null;
  const list = units(text);
  const owner = authority(list, index.over(textId(text)), index);
  const record = owner.of(id);
  return record !== null && copied(record, id) ? copyOf(record, id) : null;
}

/**
 * Where the character `id` lives now: itself while it is not deleted, otherwise the live copy its records lead to. A
 * redirect wins, the latest first; then the copy of the record that decides where it lives; then any copy.
 */
export function live(doc: Y.Doc, index: RecordIndex, id: Id, visited = new Set<string>()): Id | null {
  if (isUnitAlive(doc, id)) return id;
  if (visited.has(idKey(id)) || visited.size > MAX_HOPS) return null;
  visited.add(idKey(id));
  const copies = index.copiesOf(id);
  const redirects = copies.filter(({ record }) => record.kind === 'map').reverse();
  const owner = authoritativeCopy(doc, index, id);
  const others = copies.filter(({ record }) => record.kind !== 'map').map(({ copy }) => copy);
  for (const next of [...redirects.map(({ copy }) => copy), ...(owner === null ? [] : [owner]), ...others]) {
    const found = live(doc, index, next, visited);
    if (found !== null) return found;
  }
  return null;
}

/**
 * The live characters that are `id` or stand for it: copies made by splits, joins and re-homing, but not the copy a
 * redirect points at, which stands for another record's character.
 */
export function liveCopies(doc: Y.Doc, index: RecordIndex, id: Id, visited = new Set<string>()): Id[] {
  if (isUnitAlive(doc, id)) return [id];
  if (visited.has(idKey(id)) || visited.size > MAX_HOPS) return [];
  visited.add(idKey(id));
  return index
    .copiesOf(id)
    .filter(({ record }) => !isRedirect(record))
    .flatMap(({ copy }) => liveCopies(doc, index, copy, visited));
}
