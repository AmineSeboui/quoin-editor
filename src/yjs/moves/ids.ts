/** A character of a `Y.Text` by its Yjs id: the client that wrote it and its clock. */
export type Id = readonly [client: number, clock: number];
/** Consecutive clocks of one client: characters written in one go. */
export type Run = readonly [client: number, clock: number, length: number];

export const idKey = ([client, clock]: Id) => `${client}:${clock}`;

export function appendId(runs: Run[], [client, clock]: Id): void {
  const last = runs.at(-1);
  if (last !== undefined && last[0] === client && last[1] + last[2] === clock) {
    runs[runs.length - 1] = [client, last[1], last[2] + 1];
  } else {
    runs.push([client, clock, 1]);
  }
}

export const runsLength = (runs: readonly Run[]) => runs.reduce((sum, run) => sum + run[2], 0);

/** Where `id` falls among the characters of `runs`, or -1. */
export function indexInRuns(runs: readonly Run[], [client, clock]: Id): number {
  let base = 0;
  for (const [runClient, start, length] of runs) {
    if (runClient === client && clock >= start && clock < start + length) return base + clock - start;
    base += length;
  }
  return -1;
}

export function idAt(runs: readonly Run[], index: number): Id {
  let rest = index;
  for (const [client, start, length] of runs) {
    if (rest < length) return [client, start + rest];
    rest -= length;
  }
  throw new RangeError(`no character ${index} in ${runsLength(runs)}`);
}

export function* idsOf(runs: readonly Run[]): Generator<Id> {
  for (const [client, start, length] of runs) for (let i = 0; i < length; i++) yield [client, start + i];
}

export function toRuns(ids: Iterable<Id>): Run[] {
  const runs: Run[] = [];
  for (const id of ids) appendId(runs, id);
  return runs;
}
