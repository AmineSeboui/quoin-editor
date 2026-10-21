import * as Y from 'yjs';

/** The content of a shared text as plain data, with each marker map read out, to compare two clients' copies. */
export const plainDelta = (text: Y.Text): unknown[] =>
  (text.toDelta() as { insert: unknown; attributes?: unknown }[]).map((op) =>
    op.insert instanceof Y.AbstractType ? { ...op, insert: op.insert.toJSON() } : op,
  );
