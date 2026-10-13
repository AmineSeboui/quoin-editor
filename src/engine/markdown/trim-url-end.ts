const TRAILING_PUNCTUATION = '?!.,:;*_~\'"';

function count(value: string, char: string): number {
  return value.split(char).length - 1;
}

export function trimUrlEnd(url: string): string {
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    const kept = url.slice(0, end);
    const unbalanced = last === ')' && count(kept, ')') > count(kept, '(');
    if (!TRAILING_PUNCTUATION.includes(last) && !unbalanced) break;
    end -= 1;
  }
  return url.slice(0, end);
}
