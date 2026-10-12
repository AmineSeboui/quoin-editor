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

function indexOfKey(marks: readonly Mark[], mark: Mark, key: string): number {
  let index = upperBound(marks, mark) - 1;
  while (markKey(marks[index]) !== key) index--;
  return index;
}

// Only the innermost open range of a mark key shows. A range closed beneath it stays on the key's stack,
// flagged in closedBelowTop, and is dropped once it surfaces, so every range is pushed and popped once.
// shown stays sorted, with marks that sort equal in the order they appeared, as a stable sort leaves them.
// current() copies it only when a key's top differs from the last copy or a mark joined marks that sort
// equal to it, so a set that changes and comes back keeps its identity.
export function createActiveMarks(): ActiveMarks {
  const stacks = new Map<string, MarkRange[]>();
  const closedBelowTop = new Set<MarkRange>();
  const shown: Mark[] = [];
  const copied = new Map<string, Mark>();
  const changed = new Set<string>();
  let reordered = false;
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
      shown[indexOfKey(shown, range.mark, key)] = range.mark;
      stack.push(range);
    } else {
      const index = upperBound(shown, range.mark);
      reordered ||= index > 0 && compareMarks(shown[index - 1], range.mark) === 0;
      shown.splice(index, 0, range.mark);
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
    const index = indexOfKey(shown, range.mark, key);
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
    if (changed.size === 0 && !reordered) return copy;
    copy = [...shown];
    for (const key of changed) {
      const stack = stacks.get(key);
      if (stack) copied.set(key, stack[stack.length - 1].mark);
      else copied.delete(key);
    }
    changed.clear();
    reordered = false;
    return copy;
  };

  return { open, close, current };
}
