import { compareMarks, markKey, sameMark } from '../../model/marks';
import type { Mark } from '../../model/types';
import type { MarkRange } from './inline-items';

export type ActiveMarks = {
  readonly open: (range: MarkRange) => void;
  readonly close: (range: MarkRange) => void;
  readonly current: () => readonly Mark[];
};

function upperBound(marks: readonly Mark[], mark: Mark): number {
  let low = 0;
  let high = marks.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (compareMarks(marks[middle], mark) <= 0) low = middle + 1;
    else high = middle;
  }
  return low;
}

function indexOfKey(marks: readonly Mark[], mark: Mark): number {
  return upperBound(marks, mark) - 1;
}

// Only the innermost open range of a mark key shows. A range closed beneath it stays on the key's stack,
// flagged in closedBelowTop, and is dropped once it surfaces, so every range is pushed and popped once.
// shown stays sorted by compareMarks, which is equal only for the same key.
// current() copies it only when a key's top differs from the last copy, so a set that changes and comes
// back keeps its identity.
export function createActiveMarks(): ActiveMarks {
  const stacks = new Map<string, MarkRange[]>();
  const closedBelowTop = new Set<MarkRange>();
  const shown: Mark[] = [];
  const copied = new Map<string, Mark>();
  const changed = new Set<string>();
  let copy: readonly Mark[] = [];

  const track = (key: string, top?: Mark) => {
    const last = copied.get(key);
    if (last === top || (last && top && sameMark(last, top))) changed.delete(key);
    else changed.add(key);
  };

  const open = (range: MarkRange) => {
    const key = markKey(range.mark);
    const stack = stacks.get(key);
    if (stack) {
      shown[indexOfKey(shown, range.mark)] = range.mark;
      stack.push(range);
    } else {
      shown.splice(upperBound(shown, range.mark), 0, range.mark);
      stacks.set(key, [range]);
    }
    track(key, range.mark);
  };

  const close = (range: MarkRange) => {
    const key = markKey(range.mark);
    const stack = stacks.get(key);
    if (stack?.at(-1) !== range) {
      closedBelowTop.add(range);
      return;
    }
    stack.pop();
    while (stack.length > 0 && closedBelowTop.delete(stack[stack.length - 1])) stack.pop();
    const index = indexOfKey(shown, range.mark);
    const top = stack.at(-1)?.mark;
    if (top) {
      shown[index] = top;
    } else {
      shown.splice(index, 1);
      stacks.delete(key);
    }
    track(key, top);
  };

  const current = () => {
    if (changed.size === 0) return copy;
    copy = [...shown];
    for (const key of changed) {
      const stack = stacks.get(key);
      if (stack) copied.set(key, stack[stack.length - 1].mark);
      else copied.delete(key);
    }
    changed.clear();
    return copy;
  };

  return { open, close, current };
}
