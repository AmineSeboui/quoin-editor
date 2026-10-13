export function indentLines(text: string, prefix: string): string {
  if (prefix === '') return text;
  return text
    .split('\n')
    .map((line) => (line === '' ? line : prefix + line))
    .join('\n');
}

export function hangLines(text: string, width: number): string {
  if (width === 0) return text;
  const [first, ...rest] = text.split('\n');
  return [first, ...rest.map((line) => (line === '' ? line : ' '.repeat(width) + line))].join('\n');
}

export function quoteLines(text: string): string {
  return text
    .split('\n')
    .map((line) => (line === '' ? '>' : `> ${line}`))
    .join('\n');
}
