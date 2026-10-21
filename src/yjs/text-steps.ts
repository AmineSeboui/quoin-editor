import { inlineLength } from '../engine/model/inline';
import { addMarkStep, removeMarkStep } from '../engine/transform/mark-steps';
import { replaceInlineStep } from '../engine/transform/replace-inline-step';
import type { Step } from '../engine/transform/step';
import { isAtomEmbed } from './doc-shape';
import { inlineOfOps, type InsertOp } from './inline-codec';
import { grow, offsetIn, spanAt, spanStart, type Layout, type Seg } from './layout';
import { markFromAttribute } from './marks-codec';

export type DeltaOp = { insert?: unknown; retain?: number; delete?: number; attributes?: Record<string, unknown> };

// The seg of a region that the place `at` of the text is in: inside it or at either of its ends.
function segAt(layout: Layout, at: number, item: boolean): { seg: Seg; rel: number } | null {
  const span = spanAt(layout, at, item);
  const rel = at - spanStart(layout, span);
  const seg = span.segs.find((candidate) => candidate.at <= rel && rel <= candidate.at + candidate.length);
  return seg === undefined ? null : { seg, rel };
}

function formatSteps(layout: Layout, at: number, length: number, attributes: Record<string, unknown>): Step[] {
  const steps: Step[] = [];
  for (let span = spanAt(layout, at, true); ; span = layout.spans[span.index + 1]) {
    const start = spanStart(layout, span);
    if (start >= at + length) break;
    for (const seg of span.segs) {
      const from = Math.max(at - start, seg.at);
      const to = Math.min(at + length - start, seg.at + seg.length);
      if (to <= from) continue;
      const { entry, name } = seg.region;
      const [first, last] = [offsetIn(seg, from), offsetIn(seg, to)];
      for (const [key, value] of Object.entries(attributes)) {
        const mark = markFromAttribute(key, value ?? true);
        steps.push((value === null ? removeMarkStep : addMarkStep)(entry.id, name, first, last, mark));
      }
    }
    if (span.index + 1 >= layout.spans.length) break;
  }
  return steps;
}

/**
 * The engine steps of a change to the shared text that touches only the characters of regions, read in order as Yjs
 * reports it, with `layout` kept up to date; null when the change puts in or takes out anything else.
 */
export function textSteps(layout: Layout, delta: readonly DeltaOp[]): Step[] | null {
  const steps: Step[] = [];
  let at = 0;
  for (const op of delta) {
    if (op.retain !== undefined) {
      if (op.attributes !== undefined) steps.push(...formatSteps(layout, at, op.retain, op.attributes));
      at += op.retain;
    } else if (op.delete !== undefined) {
      const found = segAt(layout, at, true);
      if (found === null || found.rel + op.delete > found.seg.at + found.seg.length) return null;
      const from = offsetIn(found.seg, found.rel);
      const { entry, name } = found.seg.region;
      steps.push(replaceInlineStep(entry.id, name, from, from + op.delete, []));
      grow(layout, found.seg, found.rel, -op.delete);
    } else {
      const found = typeof op.insert === 'string' || isAtomEmbed(op.insert) ? segAt(layout, at, false) : null;
      if (found === null) return null;
      const inline = inlineOfOps([op as InsertOp]);
      const from = offsetIn(found.seg, found.rel);
      const { entry, name } = found.seg.region;
      steps.push(replaceInlineStep(entry.id, name, from, from, inline));
      grow(layout, found.seg, found.rel, inlineLength(inline));
      at += inlineLength(inline);
    }
  }
  return steps;
}
