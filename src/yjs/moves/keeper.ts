import * as Y from 'yjs';
import type { YBlocks } from '../doc-shape';
import { ownFormatsCopied, type FormatChange } from './arrival-fixes';
import type { Context } from './context';
import type { Id, Run } from './ids';
import { isReady } from './readiness';
import { allRecords, appendRecord, changedRecords, movesOf, type KnownRecord, type MoveRecord } from './record';
import { RecordIndex } from './record-index';
import { reconcile } from './reconcile';
import { seenOf } from './seen';
import { gcGuard } from './gc-guard';
import { textId, units } from './text-units';

// A redirect that sends a copy someone took back to a character of this client's: that character may need re-homing.
const pointsAtMine = (record: KnownRecord, me: number) => record.to.some(([client]) => client === me);

/** A copy a local change made: where from, the characters it copied and their copies, and its own extras. */
export type LocalMove = {
  readonly kind: 'split' | 'join';
  readonly source: Y.Text;
  readonly from: readonly Run[];
  readonly to: readonly Run[];
  readonly anchor?: unknown;
};

export type MoveRecorder = (move: LocalMove) => void;

export type MoveKeeper = {
  recorder(tr: Y.Transaction): MoveRecorder;
  stop(): void;
};

type Work = { readonly batch: KnownRecord[]; readonly formats: FormatChange[] };

/**
 * Keeps the log of copies beside the shared blocks: records each local split and join in the transaction that makes
 * it, and once the change a record of another client describes has arrived whole, fixes this client's own characters
 * in a transaction of `origin`.
 */
export function moveKeeper(
  blocks: YBlocks,
  { field, origin, deletedByMe }: { field: string; origin: object; deletedByMe: (id: Id) => boolean },
): MoveKeeper {
  const doc = blocks.doc!;
  const log = movesOf(doc, field);
  const index = new RecordIndex(doc.clientID);
  for (const record of allRecords(log)) index.add(record, Y.getState(doc.store, doc.clientID));
  const waiting = new Map<string, KnownRecord>();
  let work: Work[] = [];
  const guard = gcGuard(blocks);
  const context = (): Context => ({ doc, me: doc.clientID, index, log, blocks, deletedByMe });

  const onLog = (event: Y.YMapEvent<MoveRecord>) => {
    for (const record of changedRecords(log, event)) {
      index.add(record, Y.getState(doc.store, doc.clientID));
      const matters = record.kind !== 'map' || record.against !== undefined || pointsAtMine(record, doc.clientID);
      if (record.writer !== doc.clientID && matters) waiting.set(record.key, record);
    }
  };
  // Formatting is read as a record turns ready, before Yjs tidies away marks around characters a split took.
  const onTransaction = (tr: Y.Transaction) => {
    guard.hold(tr, [...waiting.values()]);
    const ready = [...waiting.values()].filter((record) => isReady(doc, record));
    for (const record of ready) waiting.delete(record.key);
    if (ready.length > 0) work.push({ batch: ready, formats: ready.filter(({ kind }) => kind !== 'map').flatMap((record) => ownFormatsCopied(context(), record)) });
  };
  // Writing while Yjs still cleans up the arrival would slip those writes into the arrival's own update, half done.
  const onSettled = () => {
    const done = work;
    work = [];
    if (done.length > 0) {
      doc.transact(() => {
        for (const { batch, formats } of done) reconcile(context(), batch, formats);
      }, origin);
    }
    guard.release([...waiting.values()]);
  };
  log.observe(onLog);
  doc.on('afterTransaction', onTransaction);
  doc.on('afterAllTransactions', onSettled);
  return {
    recorder: (tr) => (move) => {
      const writers = index.over(textId(move.source)).map(({ writer }) => writer);
      const sv = seenOf(units(move.source), tr.beforeState, writers);
      const { kind, from, to, anchor } = move;
      const record: MoveRecord = { kind, writer: doc.clientID, sv, source: textId(move.source), from, to, anchor };
      index.add(appendRecord(log, anchor === undefined ? { kind, writer: record.writer, sv, source: record.source, from, to } : record));
    },
    stop() {
      log.unobserve(onLog);
      doc.off('afterTransaction', onTransaction);
      doc.off('afterAllTransactions', onSettled);
      guard.stop();
    },
  };
}
