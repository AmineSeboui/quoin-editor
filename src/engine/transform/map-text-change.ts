import { commonPrefix, commonSuffix } from '../model/common-ends';
import type { Assoc } from './step';

/**
 * Maps an offset in `before` to `after` through the one span the two texts differ in. An offset after the span keeps
 * its distance from the end, one in text the change removed goes to where it was removed, and one where text was only
 * inserted goes to the side `assoc` names.
 */
export function mapTextChange(before: string, after: string, offset: number, assoc: Assoc): number {
  const from = commonPrefix(before, after);
  const inserted = offset === from && from + commonSuffix(before, after) >= before.length && assoc > 0;
  return offset > from || inserted ? Math.max(offset + after.length - before.length, from) : offset;
}
