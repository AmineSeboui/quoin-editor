import * as Y from 'yjs';
import type { Id, Run } from './ids';

/**
 * A copy of characters from one text to another, written in the same Yjs transaction as the copy. `split` moves the
 * tail of a text from its first source character on, `join` the whole of a text whose block it deletes, and `map`
 * only redirects copies a client replaced. `from[i]` was copied as `to[i]`. `sv` is what the writer had seen of each
 * client whose characters were in the source; `all` claims every character other clients have in the source,
 * whatever the writer saw.
 */
export type MoveRecord = {
  readonly kind: 'split' | 'join' | 'map';
  readonly writer: number;
  readonly sv: Readonly<Record<string, number>>;
  readonly source: Id;
  readonly from: readonly Run[];
  readonly to: readonly Run[];
  /** Where characters go that no source character comes before: a `Y.RelativePosition` as JSON. */
  readonly anchor?: unknown;
  /** The record a `map` re-homed characters against. */
  readonly against?: string;
  readonly all?: boolean;
};

export type KnownRecord = MoveRecord & { readonly key: string };

/**
 * The records, each under its own key: an entry of a map depends on no other client's entry, so a record arrives in
 * the same update as the change it describes.
 */
export type MoveLog = Y.Map<MoveRecord>;

export const movesOf = (doc: Y.Doc, field: string): MoveLog => doc.getMap(`${field}:moves`);

export const changedRecords = (log: MoveLog, event: Y.YMapEvent<MoveRecord>): KnownRecord[] =>
  [...event.keysChanged].flatMap((key) => {
    const record = log.get(key);
    return record === undefined ? [] : [{ ...record, key }];
  });

export const allRecords = (log: MoveLog): KnownRecord[] => [...log.entries()].map(([key, record]) => ({ ...record, key }));

/** Writes `record` under a key no other record has, returning it with that key. */
export function appendRecord(log: MoveLog, record: MoveRecord): KnownRecord {
  const doc = log.doc!;
  const key = `${doc.clientID}:${Y.getState(doc.store, doc.clientID)}`;
  log.set(key, record);
  return { ...record, key };
}
