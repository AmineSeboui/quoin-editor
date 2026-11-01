import { blockById } from '../model/doc';
import { sliceInline } from '../model/inline';
import { sameValue } from '../model/same-value';
import type { EngineBlock, EngineDoc, Pos } from '../model/types';
import { StepError, type PosMap, type Step } from './step';
import { stepFromJSON } from './step-json';

type Fields = { stepType: string; block: string; region: string } & Record<
  'from' | 'to' | 'index' | 'count' | 'offset',
  number
>;

/**
 * Rewrites a step made for `before` to do the same to `after`, which `map` maps `before` to, or gives null when it no
 * longer can without undoing part of that change: its block is gone, or the content or blocks it would replace changed.
 */
export function mapStep(step: Step, map: PosMap, before: EngineDoc, after: EngineDoc): Step | null {
  const json = { ...step.toJSON() } as unknown as Fields;
  const { block, region, from, to, index, count } = json;
  const ids = (doc: EngineDoc) => [...doc.index.keys()];
  const gap = (i: number, list: string[], next: string[]) => next.indexOf(list[i - 1]) + 1 || NaN;
  const content = (doc: EngineDoc, { block, region, offset }: Pos, end: number) =>
    sliceInline(blockById(doc, block)?.regions[region] ?? [], offset, end);
  switch (json.stepType) {
    case 'setAttrs':
    case 'setIndent':
    case 'joinBlocks':
      return step;
    case 'replaceBlock': {
      const { id } = json.block as unknown as EngineBlock;
      return sameValue(blockById(before, id), blockById(after, id)) ? step : null;
    }
    case 'insertBlocks':
    case 'removeBlocks':
      json.index = index && gap(index, ids(before), ids(after));
      if (!sameValue(after.blocks.slice(json.index, json.index + count), before.blocks.slice(index, index + count))) {
        return null;
      }
      break;
    case 'moveBlocks': {
      const moved = ids(before).slice(from, from + count);
      const rest = (doc: EngineDoc) => ids(doc).filter((id) => !moved.includes(id));
      json.from = after.index.get(moved[0]) ?? NaN;
      json.to = to && gap(to, rest(before), rest(after));
      if (!sameValue(ids(after).slice(json.from, json.from + count), moved)) return null;
      break;
    }
    default: {
      const first = from ?? json.offset;
      const last = to ?? first;
      if (!after.index.has(block)) return null;
      const start = map({ block, region, offset: first }, 1);
      const end = first === last ? start : map({ block, region, offset: last }, -1);
      const moved = start.block !== end.block || start.region !== end.region;
      const origin = { block, region, offset: first };
      const kept = sameValue(content(after, start, end.offset), content(before, origin, last));
      if (moved || !kept) return null;
      Object.assign(json, start, { from: start.offset, to: end.offset });
    }
  }
  return attempt(() => stepFromJSON(json));
}

/** Runs `run`, giving null when it throws a StepError and letting any other error through. */
export function attempt<T>(run: () => T): T | null {
  try {
    return run();
  } catch (error) {
    if (error instanceof StepError) return null;
    throw error;
  }
}
