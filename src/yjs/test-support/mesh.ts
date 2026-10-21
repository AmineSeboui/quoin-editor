import * as Y from 'yjs';

const SYNC = 'sync';

/**
 * `count` documents, each sending its own updates to every other one, held until delivered: clients of a provider
 * that relays each update unchanged, as late and in whatever order between pairs.
 */
export function meshDocs(count: number) {
  const docs = Array.from({ length: count }, (_, i) => {
    const doc = new Y.Doc();
    doc.clientID = i + 1;
    return doc;
  });
  const pending = docs.map(() => docs.map((): Uint8Array[] => []));
  docs.forEach((doc, from) =>
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === SYNC) return;
      docs.forEach((_, to) => to !== from && pending[from][to].push(update));
    }),
  );
  const deliver = (from: number, to: number) => {
    for (const update of pending[from][to].splice(0)) Y.applyUpdate(docs[to], update, SYNC);
  };
  const waiting = () => pending.some((row) => row.some((queue) => queue.length > 0));
  const flush = () => {
    while (waiting()) docs.forEach((_, from) => docs.forEach((__, to) => from !== to && deliver(from, to)));
  };
  return { docs, deliver, flush };
}
