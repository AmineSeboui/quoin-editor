import { blockById } from '../model/doc';
import { marksAt } from '../model/inline';
import type { EngineDoc, Mark, Pos } from '../model/types';
import type { Schema } from '../schema/types';

export function caretMarks(
  doc: EngineDoc,
  schema: Schema,
  storedMarks: readonly Mark[] | null,
  pos: Pos,
): readonly Mark[] {
  if (storedMarks !== null) return storedMarks;
  const inline = blockById(doc, pos.block)?.regions[pos.region] ?? [];
  return marksAt(inline, pos.offset, (mark) => schema.marks.get(mark.type)?.inclusive ?? true);
}
