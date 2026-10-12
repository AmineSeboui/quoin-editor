const SPACE = /\s/;
const DIGIT = /[0-9]/;

export function opensMath(src: string, pos: number): boolean {
  return pos + 1 < src.length && !SPACE.test(src[pos + 1]);
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
