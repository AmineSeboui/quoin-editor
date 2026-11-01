import { attempt, mapStep } from '../transform/map-step';
import type { PosMap, Step } from '../transform/step';
import type { HistoryItem } from './history';
import { mapSelection } from './selection';
import type { Transaction } from './transaction';

type Fields = { block: string; region: string; from: number; to: number; created?: { id: string } } & Record<
  'target' | 'source',
  string | null
>;

const fields = (step: Step) => step.toJSON() as unknown as Fields;

const blocksOf = (step: Step) => {
  const { block, created, target = null, source = target } = fields(step);
  return typeof block === 'string' ? [block, created?.id ?? block] : [target, source];
};

/**
 * Carries a stack of undo or redo items, newest last, over the change a transaction made. Each item applies to the
 * document its newer items leave, so the change is carried down the stack with them: from what an item leaves, back
 * through the item, over the change, and through the item as rewritten. An item that cannot be rewritten is dropped.
 * A position in text a step puts back would collapse going back through it, so it is recovered from where the step
 * as rewritten puts that text. While the change and the items carried so far only edit blocks by id, an item editing
 * only other blocks keeps its steps and moves no position the rest of the walk maps, so it is kept as it is.
 */
export function rebaseItems(items: readonly HistoryItem[], tr: Transaction): HistoryItem[] {
  const kept: HistoryItem[] = [];
  const touched = tr.steps.flatMap(blocksOf);
  const mirrors = new Map<PosMap, [PosMap, Fields, Fields]>();
  const through =
    (maps: readonly PosMap[]): PosMap =>
    (pos, assoc = 1) => {
      for (let i = 0; i < maps.length; i++) {
        const [ahead, gone, put] = mirrors.get(maps[i]) ?? [];
        const at = pos.offset - (assoc < 0 ? 1 : 0);
        const inside = gone?.block === pos.block && gone.region === pos.region && at >= gone.from && at < gone.to;
        const j = inside ? maps.indexOf(ahead!, i) : -1;
        if (j < i) pos = maps[i](pos, assoc);
        else [pos, i] = [{ block: put!.block, region: put!.region, offset: pos.offset - gone!.from + put!.from }, j];
      }
      return pos;
    };
  let [before, after, change] = [tr.before.doc, tr.doc, tr.maps];
  items: for (const item of [...items].reverse()) {
    const { selection } = item;
    const caret = !selection
      ? []
      : selection.kind === 'node'
        ? [selection.block]
        : selection.kind === 'text'
          ? [selection.anchor.block, selection.head.block]
          : [selection.anchor, selection.head];
    const blocks = item.steps.flatMap(blocksOf);
    const apart =
      ![...touched, ...blocks].includes(null) && ![...blocks, ...caret].some((block) => touched.includes(block));
    const [back, ahead]: PosMap[][] = [[], []];
    let [b, a, steps] = [before, after, [] as Step[] | null];
    if (!apart) touched.push(...blocks);
    for (const step of item.steps) {
      const rewritten = steps && (apart ? step : mapStep(step, through([...back, ...change, ...ahead]), b, a));
      const result = rewritten && attempt(() => rewritten.apply(a));
      const original = attempt(() => step.apply(b));
      if (!original) continue items;
      if (!apart) {
        const inverse = step.invert(b);
        const { map } = inverse.apply(original.doc);
        back.unshift(map);
        if (result && inverse.stepType === 'replaceInline') {
          mirrors.set(map, [result.map, fields(inverse), fields(rewritten)]);
        }
      }
      if (result) {
        [a, steps] = [result.doc, [...steps!, rewritten]];
        if (!apart) ahead.push(result.map);
      } else steps = null;
      b = original.doc;
    }
    [before, after, change] = [b, steps ? a : after, [...back, ...change, ...(steps ? ahead : [])]];
    const selected = selection && mapSelection(selection, through(change), b);
    if (steps) kept.unshift(apart ? item : { ...item, steps, selection: selected });
  }
  return kept;
}
