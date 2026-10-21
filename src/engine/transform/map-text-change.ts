import { commonPrefix, commonSuffix } from '../model/common-ends';
import type { Assoc } from './step';

export type OffsetMap = (offset: number, assoc: Assoc) => number;

/**
 * Maps offsets in `before` to `after` through the one span the two texts differ in, measured once. An offset after the
 * span keeps its distance from the end, one in text the change removed goes to where it was removed, and one where text
 * was only inserted goes to the side `assoc` names.
 */
export function mapTextChange(before: string, after: string): OffsetMap {
  const from = commonPrefix(before, after);
  const inserted = from + commonSuffix(before, after) >= before.length;
  return (offset, assoc) =>
    offset > from || (offset === from && inserted && assoc > 0) ? Math.max(offset + after.length - before.length, from) : offset;
}
