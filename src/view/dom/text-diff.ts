export type TextEdit = { from: number; to: number; insert: string };

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

function commonPrefix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a.charCodeAt(length) === b.charCodeAt(length)) length++;
  // A shared high surrogate whose partner differs must go into the edit with its partner.
  return length > 0 && isHighSurrogate(a.charCodeAt(length - 1)) ? length - 1 : length;
}

function commonSuffix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a.charCodeAt(a.length - 1 - length) === b.charCodeAt(b.length - 1 - length)) length++;
  return length > 0 && isLowSurrogate(a.charCodeAt(a.length - length)) ? length - 1 : length;
}

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
