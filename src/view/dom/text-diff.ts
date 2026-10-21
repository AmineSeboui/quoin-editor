import { commonPrefix, commonSuffix } from '../../engine/model/common-ends';

export type TextEdit = { from: number; to: number; insert: string };

// The smallest edit turning `before` into `after`. Repeated characters let that edit slide: typing "a" into "aa" is the
// same text change at offsets 0, 1 and 2, so the placement whose end lands on the caret reported after the change wins.
export function textDiff(before: string, after: string, caretHint?: number): TextEdit | null {
  if (before === after) return null;
  const prefix = commonPrefix(before, after);
  const suffix = commonSuffix(before, after);
  const shared = Math.min(suffix, Math.min(before.length, after.length) - prefix);
  const removed = before.length - prefix - shared;
  const inserted = after.length - prefix - shared;
  const earliest = prefix - (suffix - shared);
  const from =
    caretHint === undefined ? prefix : Math.min(Math.max(caretHint - inserted, earliest), prefix);
  return { from, to: from + removed, insert: after.slice(from, from + inserted) };
}
