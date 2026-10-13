type Order = -1 | 0 | 1;

const DIGITS = /^\d+$/;

export function compareCodeUnits(a: string, b: string): Order {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareDigitRuns(a: string, b: string): Order {
  const x = a.replace(/^0+/, '');
  const y = b.replace(/^0+/, '');
  if (x.length !== y.length) return x.length < y.length ? -1 : 1;
  return compareCodeUnits(x, y) || compareCodeUnits(a, b);
}

function compareSegments(a: string, b: string): Order {
  const aNumber = DIGITS.test(a);
  const bNumber = DIGITS.test(b);
  if (aNumber && bNumber) return compareDigitRuns(a, b);
  if (aNumber !== bNumber) return aNumber ? -1 : 1;
  return compareCodeUnits(a, b);
}

export function compareRegionNames(a: string, b: string): Order {
  const left = a.split(':');
  const right = b.split(':');
  const shared = Math.min(left.length, right.length);
  for (let i = 0; i < shared; i++) {
    const order = compareSegments(left[i], right[i]);
    if (order !== 0) return order;
  }
  return left.length < right.length ? -1 : left.length > right.length ? 1 : 0;
}
