export function matchAt(pattern: RegExp, src: string, pos: number): RegExpExecArray | null {
  pattern.lastIndex = pos;
  return pattern.exec(src);
}
