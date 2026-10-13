import { blockById } from '../model/doc';
import { marksAt, text } from '../model/inline';
import type { Mark, Pos } from '../model/types';
import type { Schema } from '../schema/types';
import type { Transaction } from '../state/transaction';
import { replaceInlineStep } from '../transform/replace-inline-step';

function marksFor(tr: Transaction, schema: Schema, pos: Pos): readonly Mark[] {
  if (tr.storedMarks !== null) return tr.storedMarks;
  const inline = blockById(tr.doc, pos.block)?.regions[pos.region] ?? [];
  return marksAt(inline, pos.offset, (mark) => schema.marks.get(mark.type)?.inclusive ?? true);
}

export function insertTextAt(tr: Transaction, schema: Schema, pos: Pos, value: string): Pos {
  const slice = [text(value, marksFor(tr, schema, pos))];
  tr.step(replaceInlineStep(pos.block, pos.region, pos.offset, pos.offset, slice));
  return { ...pos, offset: pos.offset + value.length };
}
