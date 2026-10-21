import * as Y from 'yjs';
import { idAt, type Id, type Run } from './ids';
import type { KnownRecord } from './record';

const known = (doc: Y.Doc, [client, clock]: Id) => clock < Y.getState(doc.store, client);

const runsKnown = (doc: Y.Doc, runs: readonly Run[]) =>
  runs.every(([client, clock, length]) => known(doc, [client, clock + length - 1]));

/** Whether this client holds everything a record names, so the change it describes has arrived whole. */
export function isReady(doc: Y.Doc, record: KnownRecord): boolean {
  if (!known(doc, record.source) || !runsKnown(doc, record.from) || !runsKnown(doc, record.to)) return false;
  const anchor = record.anchor as { item?: { client: number; clock: number } } | undefined;
  return anchor?.item === undefined || known(doc, [anchor.item.client, anchor.item.clock]);
}

export const firstCopy = (record: KnownRecord): Id | null => (record.to.length === 0 ? null : idAt(record.to, 0));
