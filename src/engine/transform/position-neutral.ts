import type { EngineDoc } from '../model/types';
import { sameLayout } from './same-layout';
import { identityMap, type PosMap, type StepResult } from './step';

export function isPositionNeutral(before: EngineDoc, { doc, map }: StepResult): boolean {
  return map === identityMap && sameLayout(before, doc);
}

/** Whether a whole transaction moves no position: every step keeps the identity map and the layout is checked once. */
export function movesNoPosition(before: EngineDoc, after: EngineDoc, maps: readonly PosMap[]): boolean {
  return maps.every((map) => map === identityMap) && sameLayout(before, after);
}
