import { markKey, sortMarks } from '../../model/marks';
import type { Mark } from '../../model/types';
import type { MarkRange } from './inline-items';

export type ActiveMarks = {
  readonly open: (range: MarkRange) => void;
  readonly close: (range: MarkRange) => void;
  readonly current: () => readonly Mark[];
};

// Only the innermost open range of a mark key shows. A range closed beneath it stays on the key's stack,
// flagged in closedBelowTop, and is dropped once it surfaces, so every range is pushed and popped once.
export function createActiveMarks(): ActiveMarks {
  const stacks = new Map<string, MarkRange[]>();
  const closedBelowTop = new Set<MarkRange>();
  let marks: readonly Mark[] | null = [];

  const open = (range: MarkRange) => {
    const key = markKey(range.mark);
    const stack = stacks.get(key);
    if (stack) stack.push(range);
    else stacks.set(key, [range]);
    marks = null;
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
    if (stack.length === 0) stacks.delete(key);
    marks = null;
  };

  const current = () => {
    marks ??= sortMarks(Array.from(stacks.values(), (stack) => stack[stack.length - 1].mark));
    return marks;
  };

  return { open, close, current };
}
