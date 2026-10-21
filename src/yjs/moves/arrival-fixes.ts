import { authority, copyOf } from './authority';
import { deleteUnits, type Context } from './context';
import { idsOf, type Id } from './ids';
import { live, liveCopies, textOfUnit } from './live';
import type { KnownRecord } from './record';
import { visibleIndexOf } from './text-edit';
import { formatAt } from './text-format';
import { isReadable, textById, units } from './text-units';

/**
 * A record copied characters its writer saw before this client's user deleted them: delete the copies too, so the
 * deletion holds. A character this client moved itself was not deleted, and is left to the records.
 */
export function deleteOwnDeletions(context: Context, record: KnownRecord): void {
  const revived: Id[] = [];
  for (const source of idsOf(record.from)) {
    if (!context.deletedByMe(source)) continue;
    if (context.index.copiesOf(source).some((copy) => copy.record.writer === context.me)) continue;
    revived.push(...liveCopies(context.doc, context.index, copyOf(record, source)));
  }
  deleteUnits(context, revived);
}

/** A record that copied a copy this client had taken back copied a duplicate: delete it too. */
export function deleteCopiesOfTrimmed(context: Context, record: KnownRecord): void {
  const duplicates: Id[] = [];
  for (const source of idsOf(record.from)) {
    if (context.index.standsForTrimmed(source)) {
      duplicates.push(...liveCopies(context.doc, context.index, copyOf(record, source)));
    }
  }
  deleteUnits(context, duplicates);
}

export type FormatChange = { readonly copy: Id; readonly key: string; readonly value: unknown };

/**
 * Formatting this client set on characters a record copied without having seen it, to set again on their copies. It
 * is read as the record arrives: once Yjs tidies the text, formatting around characters a split took is gone.
 */
export function ownFormatsCopied(context: Context, record: KnownRecord): FormatChange[] {
  const text = textById(context.doc, record.source);
  if (text === null) return [];
  const list = units(text);
  const owner = authority(list, context.index.over(record.source).filter(({ kind }) => kind !== 'map'), context.index);
  const seen = record.sv[String(context.me)] ?? 0;
  const { governing } = formatAt(list, isReadable);
  const changes: FormatChange[] = [];
  for (const source of idsOf(record.from)) {
    const ordinal = owner.ordinal(source);
    if (ordinal < 0 || owner.of(source)?.key !== record.key) continue;
    for (const [key, unit] of governing[ordinal]) {
      if (unit.id[0] === context.me && unit.id[1] >= seen) {
        changes.push({ copy: copyOf(record, source), key, value: unit.format!.value });
      }
    }
  }
  return changes;
}

export function setFormats(context: Context, changes: readonly FormatChange[]): void {
  for (const { copy, key, value } of changes) {
    const found = live(context.doc, context.index, copy);
    const text = found === null ? null : textOfUnit(context.doc, found);
    if (found !== null && text !== null) text.format(visibleIndexOf(text, found), 1, { [key]: value });
  }
}
