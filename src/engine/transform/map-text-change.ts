import { diffSequences } from '../diff/myers';
import { commonPrefix, commonSuffix } from '../model/common-ends';
import type { Assoc } from './step';

export type OffsetMap = (offset: number, assoc: Assoc) => number;

// Past this many changed characters the change maps as one replaced span: a character diff grows with its square.
const DIFF_LIMIT = 1000;

/**
 * Maps offsets in `before` to `after` through each span the two texts differ in, measured once. An offset in text the
 * change kept moves with it, one in text the change removed goes to where it was removed, and one where text was only
 * inserted goes to the side `assoc` names.
 */
export function mapTextChange(before: string, after: string): OffsetMap {
  const from = commonPrefix(before, after);
  const to = Math.min(commonSuffix(before, after), before.length - from, after.length - from);
  const removed = before.slice(from, before.length - to);
  const added = after.slice(from, after.length - to);
  const ops: readonly { op: string; items: ArrayLike<string> }[] =
    removed.length + added.length > DIFF_LIMIT
      ? [
          { op: 'delete', items: removed },
          { op: 'insert', items: added },
        ]
      : diffSequences(removed.split(''), added.split(''));
  return (offset, assoc) => {
    let b = from;
    let a = from;
    let replaced = false;
    if (offset < b) return offset;
    for (const { op, items } of ops) {
      const n = items.length;
      if (op !== 'insert' && offset < b + n) return op === 'equal' ? a + offset - b : a;
      if (op === 'insert' && offset === b && !replaced && assoc < 0) return a;
      replaced = op === 'delete' && n > 0;
      if (op !== 'insert') b += n;
      if (op !== 'delete') a += n;
    }
    return a + offset - b;
  };
}
