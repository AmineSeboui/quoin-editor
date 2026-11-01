import { attempt, mapStep } from '../transform/map-step';
import type { PosMap, Step } from '../transform/step';
import type { HistoryItem } from './history';
import { mapSelection } from './selection';
import type { Transaction } from './transaction';

const through =
  (maps: readonly PosMap[]): PosMap =>
  (pos, assoc) =>
    maps.reduce((mapped, map) => map(mapped, assoc), pos);

const textBlock = (step: Step) =>
  ['replaceInline', 'addMark', 'removeMark', 'restoreMarks'].includes(step.stepType)
    ? (step.toJSON().block as string)
    : null;

/**
 * Carries a stack of undo or redo items, newest last, over the change a transaction made. Each item applies to the
 * document its newer items leave, so the change is carried down the stack with them: from what an item leaves, back
 * through the item, over the change, and through the item as rewritten. An item that cannot be rewritten is dropped.
 * While the change and the items carried so far only edit text, an item editing only the text of other blocks keeps
 * its steps and moves no position the rest of the walk maps, so it is kept as it is and only applied to both sides.
 */
export function rebaseItems(items: readonly HistoryItem[], tr: Transaction): HistoryItem[] {
  const kept: HistoryItem[] = [];
  const touched = tr.steps.map(textBlock);
  let [before, after, change] = [tr.before.doc, tr.doc, tr.maps];
  items: for (const item of [...items].reverse()) {
    const { selection } = item;
    const caret = selection?.kind === 'text' ? [selection.anchor.block, selection.head.block] : [];
    const blocks = item.steps.map(textBlock);
    const apart =
      ![...touched, ...blocks].includes(null) && ![...blocks, ...caret].some((block) => touched.includes(block));
    const [back, ahead]: PosMap[][] = [[], []];
    let [b, a, steps] = [before, after, [] as Step[] | null];
    if (!apart) touched.push(...blocks);
    for (const step of item.steps) {
      const rewritten = steps && (apart ? step : mapStep(step, through([...back, ...change, ...ahead]), b, a));
      const result = rewritten && attempt(() => rewritten.apply(a));
      if (result) {
        [a, steps] = [result.doc, [...steps!, rewritten]];
        if (!apart) ahead.push(result.map);
      } else steps = null;
      const original = attempt(() => step.apply(b));
      if (!original) continue items;
      if (!apart) back.unshift(step.invert(b).apply(original.doc).map);
      b = original.doc;
    }
    [before, after, change] = [b, steps ? a : after, [...back, ...change, ...(steps ? ahead : [])]];
    const selected = selection && mapSelection(selection, through(change), b);
    if (steps) kept.unshift(apart ? item : { ...item, steps, selection: selected });
  }
  return kept;
}
