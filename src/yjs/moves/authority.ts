import { compareCodeUnits } from '../../engine/model/compare';
import { idAt, idKey, indexInRuns, type Id } from './ids';
import type { KnownRecord } from './record';
import type { Unit } from './text-units';

type Cover = { readonly record: KnownRecord; readonly first: number };

export type Authority = {
  readonly ordinal: (id: Id) => number;
  /** The record that decides where the character `id` lives, or null when none covers it. */
  readonly of: (id: Id) => KnownRecord | null;
};

const clockOf = (record: KnownRecord) => Number(record.key.split(':')[1]);

/** Whether `later` was written by a client that had seen `earlier`. */
export const saw = (later: KnownRecord, earlier: KnownRecord) =>
  (later.sv[String(earlier.writer)] ?? 0) > clockOf(earlier);

const writerOrder = (a: KnownRecord, b: KnownRecord) => a.writer - b.writer || compareCodeUnits(a.key, b.key);

/**
 * Splits and joins of one text decide where each of its characters lives. A split covers its tail, from its first
 * source character on; a join covers the whole text. Of the records covering a character, a split wins over a join,
 * the split that starts latest wins over the others, and between equals the lower client id wins; but a record that
 * copied the character, written after the winner was known, decides instead, since its writer saw the character there.
 * Every client computes the same answer from the same records, whatever order they came in.
 */
export type Learnt = {
  readonly me: number;
  learntAt(record: KnownRecord): number;
  madeBy(id: Id): readonly KnownRecord[];
};

export function authority(units: readonly Unit[], records: readonly KnownRecord[], learnt?: Learnt): Authority {
  const ordinals = new Map(units.map((unit, i) => [idKey(unit.id), i]));
  const ordinal = (id: Id) => ordinals.get(idKey(id)) ?? -1;
  const splits: Cover[] = [];
  const joins: KnownRecord[] = [];
  for (const record of records) {
    if (record.kind === 'join') joins.push(record);
    else if (record.kind === 'split' && record.from.length > 0) {
      const first = ordinal(idAt(record.from, 0));
      if (first >= 0) splits.push({ record, first });
    }
  }
  splits.sort((a, b) => b.first - a.first || writerOrder(a.record, b.record));
  joins.sort(writerOrder);
  const of = (id: Id) => {
    const position = ordinal(id);
    if (position < 0) return null;
    // What was written knowing a record came after it, wherever it sits: its writer's later characters, this client's
    // characters written after it learnt the record, and copies made by a record that had seen it.
    const later = (record: KnownRecord) =>
      (id[0] === record.writer && id[1] > clockOf(record)) ||
      (learnt !== undefined && id[0] === learnt.me && id[1] >= learnt.learntAt(record)) ||
      (learnt?.madeBy(id).some((maker) => saw(maker, record)) ?? false);
    // A record decides only what it copied or had not seen: what its writer saw and left had gone already.
    const decides = (record: KnownRecord) =>
      !later(record) && (record.all === true || copied(record, id) || id[1] >= (record.sv[String(id[0])] ?? 0));
    const covering = [
      ...splits.filter(({ first, record }) => first <= position && decides(record)).map(({ record }) => record),
      ...joins.filter(decides),
    ];
    const winner = covering[0] ?? null;
    if (winner === null || copied(winner, id)) return winner;
    return covering.find((record) => copied(record, id) && saw(record, winner)) ?? winner;
  };
  return { ordinal, of };
}

export const copied = (record: KnownRecord, id: Id) => indexInRuns(record.from, id) >= 0;

export const copyOf = (record: KnownRecord, id: Id): Id => idAt(record.to, indexInRuns(record.from, id));
