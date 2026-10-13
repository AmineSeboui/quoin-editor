import fc from 'fast-check';
import { inlineLength } from '../model/inline';
import type { EngineDoc, Pos, Selection } from '../model/types';
import { blockRangeSelection, nodeSelection, textSelection } from '../state/selection';

type Edge = 'start' | 'end' | number;
type Spot = [number, number, Edge];
export type SelectionChoice =
  | { kind: 'caret'; at: Spot }
  | { kind: 'range'; anchor: Spot; head: Spot }
  | { kind: 'node'; at: number }
  | { kind: 'blocks'; anchor: number; head: number };

const edge = fc.oneof(fc.constant<Edge>('start'), fc.constant<Edge>('end'), fc.nat(99));
const spot = fc.tuple(fc.nat(99), fc.nat(9), edge);

export const selectionChoice: fc.Arbitrary<SelectionChoice> = fc.oneof(
  fc.record({ kind: fc.constant('caret' as const), at: spot }),
  fc.record({ kind: fc.constant('range' as const), anchor: spot, head: spot }),
  fc.record({ kind: fc.constant('node' as const), at: fc.nat(99) }),
  fc.record({ kind: fc.constant('blocks' as const), anchor: fc.nat(99), head: fc.nat(99) }),
);

function posAt(doc: EngineDoc, [block, region, at]: Spot): Pos | null {
  const candidates = doc.blocks.filter((candidate) => Object.keys(candidate.regions).length > 0);
  if (candidates.length === 0) return null;
  const target = candidates[block % candidates.length];
  const names = Object.keys(target.regions);
  const name = names[region % names.length];
  const length = inlineLength(target.regions[name]);
  const offset = at === 'start' ? 0 : at === 'end' ? length : at % (length + 1);
  return { block: target.id, region: name, offset };
}

export function selectionFor(doc: EngineDoc, choice: SelectionChoice): Selection | null {
  const id = (at: number) => doc.blocks[at % doc.blocks.length].id;
  if (choice.kind === 'node') return nodeSelection(id(choice.at));
  if (choice.kind === 'blocks') return blockRangeSelection(id(choice.anchor), id(choice.head));
  const anchor = posAt(doc, choice.kind === 'caret' ? choice.at : choice.anchor);
  const head = posAt(doc, choice.kind === 'caret' ? choice.at : choice.head);
  return anchor === null || head === null ? null : textSelection(anchor, head);
}
