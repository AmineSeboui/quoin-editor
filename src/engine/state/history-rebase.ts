import { blockById } from '../model/doc';
import { sameValue } from '../model/same-value';
import type { EngineDoc, Pos } from '../model/types';
import { attempt, mapStep } from '../transform/map-step';
import type { Assoc, PosMap, Step } from '../transform/step';
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
 * The blocks a change of the block list touched: added, removed, edited, or followed by another block than before,
 * which a join of that block with the next depends on. Every other block holds the same positions before and after.
 */
function changedBlocks(before: EngineDoc, after: EngineDoc): string[] {
  const next = (doc: EngineDoc, id: string) => doc.blocks[doc.index.get(id)! + 1]?.id;
  return [...new Set([...before.index.keys(), ...after.index.keys()])].filter((id) => {
    const [was, is] = [blockById(before, id), blockById(after, id)];
    return !was || !is || !sameValue(was, is) || next(before, id) !== next(after, id);
  });
}

/**
 * What going back through a step's inverse loses of a position in what the step leaves, kept for the way on through
 * the step as rewritten, `ahead`: a position in text the step puts back, which the inverse deletes, and the side of the
 * step a position is on, -1 before it and 1 after, which decides where the change left nothing between the two.
 */
type Pair = { recover(pos: Pos, assoc: Assoc): Pos | null; side(pos: Pos): Assoc | 0; ahead?: Link; now?: Assoc | 0 };

/** A map the walk goes through: the inverse of a step, `back`, or the step as rewritten, holding their pair. */
type Link = { map: PosMap; pair?: Pair; back?: boolean };

function pairOf(step: Step, inverse: Step, rewritten: Step): Pair | undefined {
  if (step.stepType === 'splitBlock') {
    const { block, region, created } = fields(step);
    const side = (pos: Pos) => (pos.block === block && pos.region === region ? -1 : pos.block === created!.id ? 1 : 0);
    return { recover: () => null, side };
  }
  if (inverse.stepType !== 'replaceInline') return undefined;
  const { block, region, from, to } = fields(inverse);
  const put = fields(rewritten);
  const here = (pos: Pos) => pos.block === block && pos.region === region;
  return {
    recover(pos, assoc) {
      const at = pos.offset - (assoc < 0 ? 1 : 0);
      const offset = pos.offset - from + put.from;
      return here(pos) && at >= from && at < to ? { block: put.block, region: put.region, offset } : null;
    },
    side: (pos) => (!here(pos) ? 0 : pos.offset <= from ? -1 : pos.offset >= to ? 1 : 0),
  };
}

const through =
  (links: readonly Link[]): PosMap =>
  (pos, assoc = 1) => {
    for (let i = 0; i < links.length; i++) {
      const { map, pair, back } = links[i];
      if (pair && back) {
        const put = pair.recover(pos, assoc);
        const j = put ? links.indexOf(pair.ahead!, i) : -1;
        if (j > i) {
          [pos, i] = [put!, j];
          continue;
        }
        pair.now = pair.side(pos);
      }
      pos = map(pos, (!back && pair?.now) || assoc);
    }
    return pos;
  };

/**
 * Carries a stack of undo or redo items, newest last, over the change a transaction made. Each item applies to the
 * document its newer items leave, so the change is carried down the stack with them: from what an item leaves, back
 * through the item, over the change, and through the item as rewritten. An item that cannot be rewritten is dropped.
 * While the items carried so far only edit blocks by id, an item editing only blocks that neither the change nor those
 * items touched keeps its steps and moves no position the rest of the walk maps, so it is kept as it is.
 */
export function rebaseItems(items: readonly HistoryItem[], tr: Transaction): HistoryItem[] {
  const kept: HistoryItem[] = [];
  const named = tr.steps.flatMap(blocksOf);
  const touched = named.includes(null) ? changedBlocks(tr.before.doc, tr.doc) : named;
  let [before, after, change] = [tr.before.doc, tr.doc, tr.maps.map((map): Link => ({ map }))];
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
    const [back, ahead]: Link[][] = [[], []];
    let [b, a, steps] = [before, after, [] as Step[] | null];
    if (!apart) touched.push(...blocks);
    for (const step of item.steps) {
      const rewritten = steps && (apart ? step : mapStep(step, through([...back, ...change, ...ahead]), b, a));
      const result = rewritten && attempt(() => rewritten.apply(a));
      const original = attempt(() => step.apply(b));
      if (!original) continue items;
      if (!apart) {
        const inverse = step.invert(b);
        const pair = result ? pairOf(step, inverse, rewritten!) : undefined;
        back.unshift({ map: inverse.apply(original.doc).map, pair, back: true });
        if (result) ahead.push(pair ? (pair.ahead = { map: result.map, pair }) : { map: result.map });
      }
      if (result) [a, steps] = [result.doc, [...steps!, rewritten]];
      else steps = null;
      b = original.doc;
    }
    [before, after, change] = [b, steps ? a : after, [...back, ...change, ...(steps ? ahead : [])]];
    const selected = selection && mapSelection(selection, through(change), b);
    if (steps) kept.unshift(apart ? item : { ...item, steps, selection: selected });
  }
  return kept;
}
