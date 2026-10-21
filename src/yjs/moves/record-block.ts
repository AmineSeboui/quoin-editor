import type { YBlock } from '../doc-shape';
import type { Context } from './context';
import { idAt } from './ids';
import { textOfUnit } from './live';
import type { KnownRecord } from './record';
import { blockOf, isAlive } from './text-units';

/** The block a record wrote its copies into, while it is not deleted. */
export function blockOfRecord(context: Context, record: KnownRecord): YBlock | null {
  if (record.to.length === 0) return null;
  const text = textOfUnit(context.doc, idAt(record.to, 0));
  const block = text === null ? null : blockOf(text);
  return block !== null && isAlive(block) ? block : null;
}
