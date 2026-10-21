import type * as Y from 'yjs';
import { anchorIn, anchorKey, resolveAnchor, type Anchor } from './anchors';
import { copied, copyOf, type Authority } from './authority';
import { deleteUnits, writeRecord, type Context } from './context';
import { appendId, idKey, toRuns, type Id, type Run } from './ids';
import { liveCopies } from './live';
import type { KnownRecord } from './record';
import { contentFor, fallbackPlace } from './claim-sources';
import { insertPieces, type Piece } from './text-edit';
import { isReadable, textId, type Unit } from './text-units';

type Claim = { readonly original: Id; readonly piece: Piece; readonly shown: boolean };
type Decision = {
  readonly claim: Claim | null;
  /** The live copies of an earlier re-homing this decision takes the place of, and that re-homing's copy. */
  readonly replaces: readonly Id[];
  readonly retired: Id | null;
  /** Every copy that re-homing made, live or not, which this decision speaks for. */
  readonly chain: readonly Id[];
};
type Group = { readonly record: KnownRecord; readonly anchor: Anchor; readonly claims: Claim[] };

// A character still in play: shown, deleted with a block a join took and kept for its writers, or copied.
function inPlay(context: Context, unit: Unit): boolean {
  if (isReadable(unit)) return true;
  return context.index.rehomeOf(unit.id) !== undefined || context.index.copiesOf(unit.id).length > 0;
}

const KEEP: Decision = { claim: null, replaces: [], retired: null, chain: [] };

// The copies this client's re-homing made of `id`, and of those copies in turn.
function rehomeChain(context: Context, id: Id, seen = new Set<string>()): Id[] {
  const rehome = context.index.rehomeOf(id);
  if (rehome === undefined || seen.has(idKey(rehome.copy))) return [];
  seen.add(idKey(rehome.copy));
  return [rehome.copy, ...rehomeChain(context, rehome.copy, seen)];
}

// What becomes of one of this client's characters: left where it is, or claimed, replacing where it was re-homed.
function decide(context: Context, unit: Unit, record: KnownRecord): Decision {
  if (context.index.standsForTrimmed(unit.id)) return KEEP;
  const rehome = context.index.rehomeOf(unit.id);
  const earlier = rehome === undefined ? [] : liveCopies(context.doc, context.index, rehome.copy);
  const retired = rehome?.copy ?? null;
  const chain = rehomeChain(context, unit.id);
  if (copied(record, unit.id)) return { claim: null, replaces: earlier, retired, chain };
  const seen = unit.id[1] < (record.sv[String(context.me)] ?? 0);
  if ((seen && record.all !== true) || rehome?.against === record.key || !inPlay(context, unit)) return KEEP;
  const piece = contentFor(context, unit, rehome?.copy ?? null);
  return piece === null ? KEEP : { claim: { original: unit.id, piece, shown: unit.alive }, replaces: earlier, retired, chain };
}

/**
 * Puts each of this client's characters in `text` where the record that decides it says: a character that record
 * did not copy, because its writer had not seen it, moves to the matching place of the copy, once.
 */
export function claimOwn(context: Context, text: Y.Text, list: readonly Unit[], owner: Authority): void {
  const groups = new Map<string, Group>();
  const decided = list.flatMap((unit, ordinal) => {
    const record = unit.id[0] === context.me && unit.format === null ? owner.of(unit.id) : null;
    return record === null ? [] : [{ ordinal, record, ...decide(context, unit, record) }];
  });
  // A character re-homed again takes the place of its earlier copies, which are not claimed on their own.
  const taken = decided.filter(({ claim, retired }) => claim !== null || retired !== null);
  const replaced = new Set(taken.flatMap(({ replaces, chain }) => [...replaces, ...chain]).map(idKey));
  deleteUnits(context, decided.flatMap(({ replaces }) => replaces));
  const redirects: [Id, Id][] = [];
  const retiredBy = new Map<string, Id>();
  for (const { ordinal, record, claim, retired } of decided) {
    if (retired !== null && claim === null) redirects.push([retired, copyOf(record, list[ordinal].id)]);
    if (claim === null || replaced.has(idKey(claim.original))) continue;
    if (retired !== null) retiredBy.set(idKey(claim.original), retired);
    const anchor = anchorIn(record, owner, ordinal);
    if (anchor === null) continue;
    const key = `${record.key}|${anchorKey(anchor)}`;
    const group = groups.get(key) ?? { record, anchor, claims: [] };
    groups.set(key, group);
    group.claims.push(claim);
  }
  for (const { record, anchor, claims } of groups.values()) {
    const place = resolveAnchor(context, anchor) ?? fallbackPlace(context, record);
    if (place === null) continue;
    const to = insertPieces(place.text, place.index, claims.map(({ piece }) => piece));
    const from: Run[] = [];
    const copies: Run[] = [];
    claims.forEach(({ original }, i) => {
      appendId(from, original);
      appendId(copies, to[i]);
      const retired = retiredBy.get(idKey(original));
      if (retired !== undefined) redirects.push([retired, to[i]]);
    });
    const source = textId(text);
    writeRecord(context, { kind: 'map', writer: context.me, sv: {}, source, from, to: copies, against: record.key });
    deleteUnits(context, claims.filter(({ shown }) => shown).map(({ original }) => original));
  }
  // A re-homing taken back is marked so, like a trimmed copy, so copies others made of it are known as duplicates.
  if (redirects.length > 0) {
    const [from, to] = [toRuns(redirects.map(([old]) => old)), toRuns(redirects.map(([, next]) => next))];
    writeRecord(context, { kind: 'map', writer: context.me, sv: {}, source: textId(text), from, to });
  }
}

