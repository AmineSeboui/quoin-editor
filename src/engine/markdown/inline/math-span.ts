const SPACE = /\s/;
const DIGIT = /[0-9]/;

// A dollar before a digit and after a space or the start of the text is a price, not a formula.
export function opensMath(src: string, pos: number): boolean {
  const next = src[pos + 1];
  if (next === undefined || SPACE.test(next)) return false;
  return !(DIGIT.test(next) && (pos === 0 || SPACE.test(src[pos - 1])));
}

export function dollarRunEnd(src: string, pos: number): number {
  let end = pos;
  while (src[end] === '$') end++;
  return end;
}

export function findMathClose(src: string, from: number): number {
  for (let p = src.indexOf('$', from); p >= 0; p = src.indexOf('$', p + 1)) {
    const before = src[p - 1];
    if (before !== '\\' && !SPACE.test(before) && !DIGIT.test(src[p + 1] ?? '')) return p;
  }
  return -1;
}

export function mathLatex(src: string, open: number, close: number): string {
  return src.slice(open + 1, close).replace(/\\\$/g, '$');
}
