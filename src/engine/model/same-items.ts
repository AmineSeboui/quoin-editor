/** Whether two lists hold the same items in the same order, compared with `same`, or by identity without it. */
export const sameItems = <T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean = (x, y) => x === y): boolean =>
  a.length === b.length && a.every((item, i) => same(item, b[i]));
