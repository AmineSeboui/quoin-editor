import * as Y from 'yjs';
import type { YBlocks } from '../doc-shape';
import type { KnownRecord } from './record';
import { idsOf } from './ids';
import { blockOf, itemAt, textById, units } from './text-units';

type DeleteSet = Y.Transaction['deleteSet'];

const parentItem = (item: Y.Item): Y.Item | null => (item.parent instanceof Y.AbstractType ? item.parent._item : null);

// A deleted map answers no reads, so its entries are read from the items Yjs still holds for them.
function deletedChild(type: Y.AbstractType<unknown>, key: string): Y.AbstractType<unknown> | null {
  const content = type._map.get(key)?.content;
  return content instanceof Y.ContentType ? content.type : null;
}

function holdsOwn(block: Y.AbstractType<unknown>, me: number): boolean {
  const regions = deletedChild(block, 'regions');
  if (regions === null) return false;
  return [...regions._map.keys()].some((name) => {
    const text = deletedChild(regions, name);
    return text instanceof Y.Text && units(text).some(({ id }) => id[0] === me);
  });
}

// The copies a redirect says were taken back still hold the content of the characters they copied.
function takenBack(doc: Y.Doc, waiting: readonly KnownRecord[]): Set<Y.Item> {
  const items = new Set<Y.Item>();
  for (const record of waiting) {
    if (record.kind !== 'map' || record.against !== undefined) continue;
    for (const id of idsOf(record.from)) {
      const item = itemAt(doc, id);
      if (item !== null) items.add(item);
    }
  }
  return items;
}

/**
 * Holds back Yjs's garbage collection where records still need what it would collect. A deleted block keeps its types,
 * so where each character of its texts stood stays known; the characters' content is collected, except in a block a
 * join took that is not settled yet, or a deleted block holding this client's characters while updates are pending,
 * since the record that moved them may be among them.
 */
export function gcGuard(blocks: YBlocks) {
  const doc = blocks.doc!;
  const gcFilter = doc.gcFilter;
  let joined = new Set<Y.Item>();
  let redirected = new Set<Y.Item>();
  const deleted = new Set<Y.Item>();
  const deferred: DeleteSet[] = [];
  const isHeld = (item: Y.Item | null): boolean =>
    item !== null && (joined.has(item) || deleted.has(item) || redirected.has(item) || isHeld(parentItem(item)));
  const inBlocks = (item: Y.Item | null): boolean => item !== null && (item.parent === blocks || inBlocks(parentItem(item)));
  const filter = (item: Y.Item) =>
    !isHeld(item) && !(item.content instanceof Y.ContentType && inBlocks(item)) && gcFilter(item);
  doc.gcFilter = filter;
  const pending = () => doc.store.pendingStructs !== null || doc.store.pendingDs !== null;
  return {
    /** Holds the blocks the waiting joins took, and the deleted blocks of `tr` that held this client's characters. */
    hold(tr: Y.Transaction, waiting: readonly KnownRecord[]): void {
      redirected = takenBack(doc, waiting);
      joined = new Set();
      for (const record of waiting) {
        const text = record.kind === 'join' ? textById(doc, record.source) : null;
        const block = text === null ? null : blockOf(text);
        if (block?._item) joined.add(block._item);
      }
      Y.iterateDeletedStructs(tr, tr.deleteSet, (struct) => {
        if (struct instanceof Y.Item && struct.parent === blocks && struct.content instanceof Y.ContentType) {
          if (holdsOwn(struct.content.type, doc.clientID)) deleted.add(struct);
        }
      });
      if (joined.size > 0 || deleted.size > 0 || redirected.size > 0) deferred.push(tr.deleteSet);
    },
    /** Lets go of what no waiting record needs, and collects it. */
    release(waiting: readonly KnownRecord[]): void {
      joined = new Set(
        waiting.flatMap((record) => {
          const text = record.kind === 'join' ? textById(doc, record.source) : null;
          const item = text === null ? null : blockOf(text)?._item;
          return item ? [item] : [];
        }),
      );
      redirected = takenBack(doc, waiting);
      if (!pending()) deleted.clear();
      if (joined.size > 0 || deleted.size > 0 || redirected.size > 0) return;
      for (const deleteSet of deferred.splice(0)) Y.tryGc(deleteSet, doc.store, filter);
    },
    stop(): void {
      if (doc.gcFilter === filter) doc.gcFilter = gcFilter;
    },
  };
}
