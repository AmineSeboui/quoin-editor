import { claimOwn } from './claims';
import { authority } from './authority';
import type { Context } from './context';
import { deleteCopiesOfTrimmed, deleteOwnDeletions, setFormats, type FormatChange } from './arrival-fixes';
import { idKey, idsOf, type Id } from './ids';
import { textOfUnit } from './live';
import { orderOwnSplits } from './order';
import type { KnownRecord } from './record';
import { textById, textId, units } from './text-units';
import { trimOwn } from './trims';

// The texts of this client's characters a redirect points at, which took the place of a copy taken back.
function textsOfMine(context: Context, record: KnownRecord): Id[] {
  const texts: Id[] = [];
  for (const id of idsOf(record.to)) {
    const text = id[0] === context.me ? textOfUnit(context.doc, id) : null;
    if (text !== null) texts.push(textId(text));
  }
  return texts;
}

function reconcileText(context: Context, source: Id): void {
  const text = textById(context.doc, source);
  if (text === null) return;
  const records = context.index.over(source).filter(({ kind }) => kind !== 'map');
  const before = units(text);
  const owner = authority(before, records, context.index);
  trimOwn(context, records, owner);
  claimOwn(context, text, before, owner);
  orderOwnSplits(context, records, owner);
}

/**
 * After records of other clients arrive, this client fixes what is its own, and nothing else: its copies another
 * record now decides about, its characters a record moved without having seen them, its formatting on them, the
 * order of a block it split, and its deletions and take-backs that a copy undid. Each client doing so for its own
 * makes every character end up once, in one place.
 */
export function reconcile(context: Context, arrived: readonly KnownRecord[], formats: readonly FormatChange[]): void {
  setFormats(context, formats);
  const sources = new Map<string, Id>();
  for (const record of arrived) {
    if (record.kind !== 'map') sources.set(idKey(record.source), record.source);
    else if (record.against === undefined) {
      for (const text of textsOfMine(context, record)) sources.set(idKey(text), text);
    }
  }
  for (const source of sources.values()) reconcileText(context, source);
  for (const record of arrived) {
    deleteOwnDeletions(context, record);
    deleteCopiesOfTrimmed(context, record);
  }
}
