import type { QuoinBlock } from '../types';
import { sameBlocks } from './same-blocks';

export const STRUCTURAL_ECHO_LIMIT = 64;

/**
 * The canvas's emissions the host has not handed back yet. Each is numbered in order, and handing one
 * back acknowledges it and every older one. Numbers are looked up by identity, so an emission is
 * recognised however late it returns without being kept alive. Only the newest outstanding ones are
 * kept, for a structural copy from a cloning store to be compared against, which also bounds what a
 * host that never echoes costs.
 */
export type Unacknowledged = {
  sequences: WeakMap<QuoinBlock[], number>;
  emitted: number;
  acknowledged: number;
  newest: QuoinBlock[][];
};

export function createUnacknowledged(): Unacknowledged {
  return { sequences: new WeakMap(), emitted: 0, acknowledged: 0, newest: [] };
}

function keepNewest(outstanding: Unacknowledged) {
  const kept = Math.min(STRUCTURAL_ECHO_LIMIT, outstanding.emitted - outstanding.acknowledged);
  outstanding.newest.splice(0, outstanding.newest.length - kept);
}

export function remember(outstanding: Unacknowledged, blocks: QuoinBlock[]) {
  outstanding.emitted += 1;
  outstanding.sequences.set(blocks, outstanding.emitted);
  outstanding.newest.push(blocks);
  keepNewest(outstanding);
}

/** The oldest match wins, so a document that returns to an earlier state cannot skip the emissions in between. */
function copiedSequence(outstanding: Unacknowledged, blocks: QuoinBlock[]): number | undefined {
  for (const emitted of outstanding.newest) {
    if (sameBlocks(emitted, blocks)) return outstanding.sequences.get(emitted);
  }
  return undefined;
}

/**
 * Whether `blocks` hands back an outstanding emission, as the same array or a copy of a recent one.
 * An emission the host has already moved past is not an echo, so replaying it from the host's undo
 * stack reads as a document of its own.
 */
export function acknowledge(outstanding: Unacknowledged, blocks: QuoinBlock[]): boolean {
  const echoed = outstanding.sequences.get(blocks) ?? copiedSequence(outstanding, blocks);
  if (echoed === undefined || echoed <= outstanding.acknowledged) return false;
  outstanding.acknowledged = echoed;
  keepNewest(outstanding);
  return true;
}

export function forgetAll(outstanding: Unacknowledged) {
  outstanding.acknowledged = outstanding.emitted;
  keepNewest(outstanding);
}
