import type * as Y from 'yjs';
import type { YBlocks } from '../doc-shape';
import { idKey, type Id } from './ids';
import { textOfUnit } from './live';
import { appendRecord, type MoveLog, type MoveRecord } from './record';
import type { RecordIndex } from './record-index';
import { deleteIds } from './text-edit';

/** What a client works with while it puts its own characters where the records it was sent say they belong. */
export type Context = {
  readonly doc: Y.Doc;
  readonly me: number;
  readonly index: RecordIndex;
  readonly log: MoveLog;
  readonly blocks: YBlocks;
  /** Whether this client's own user deleted the character, in a change undo could still take back. */
  readonly deletedByMe: (id: Id) => boolean;
};

export function writeRecord(context: Context, record: MoveRecord): void {
  context.index.add(appendRecord(context.log, record));
}

export function deleteUnits(context: Context, ids: readonly Id[]): void {
  const byText = new Map<Y.Text, Set<string>>();
  for (const id of ids) {
    const text = textOfUnit(context.doc, id);
    if (text !== null) byText.set(text, (byText.get(text) ?? new Set()).add(idKey(id)));
  }
  for (const [text, keys] of byText) deleteIds(text, keys);
}
