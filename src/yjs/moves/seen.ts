import type { Unit } from './text-units';

/**
 * What a writer had seen of each client with characters in a text, or with records of it: enough to tell what it had
 * not seen.
 */
export function seenOf(
  list: readonly Unit[],
  state: ReadonlyMap<number, number>,
  writers: readonly number[] = [],
): Record<string, number> {
  const clients = new Set([...list.map(({ id }) => id[0]), ...writers]);
  return Object.fromEntries([...clients].map((client) => [String(client), state.get(client) ?? 0]));
}
