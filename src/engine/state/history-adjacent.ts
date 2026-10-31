import { inlineLength } from '../model/inline';
import type { Inline, Pos } from '../model/types';
import { isCollapsed } from './selection';
import type { Transaction } from './transaction';

type Replacement = { block: string; region: string; from: number; to: number; slice: Inline };

function replacements(tr: Transaction): Replacement[] {
  const replaced = tr.steps.filter((step) => step.stepType === 'replaceInline');
  return replaced.map((step) => step.toJSON() as unknown as Replacement);
}

/** Where the caret stands after a transaction's edit: its resulting caret, else the end of its last inline replacement. */
export function editEnd(tr: Transaction): Pos | null {
  const { selection } = tr;
  if (selection?.kind === 'text' && isCollapsed(selection)) return selection.head;
  const last = replacements(tr).at(-1);
  return last === undefined
    ? null
    : { block: last.block, region: last.region, offset: last.from + inlineLength(last.slice) };
}

/** Whether typing or deleting right where the previous edit ended: a caret jump starts a new group of its own. */
export function continuesEdit(tr: Transaction, end: Pos | null | undefined): boolean {
  if (end === null || end === undefined) return true;
  const first = replacements(tr)[0];
  if (first === undefined) return true;
  return (
    first.block === end.block && first.region === end.region && first.from <= end.offset && end.offset <= first.to
  );
}
