const BACKTICK_RUNS = /`+/g;

export function findCodeClose(src: string, from: number, fence: number): number {
  BACKTICK_RUNS.lastIndex = from;
  for (let run = BACKTICK_RUNS.exec(src); run; run = BACKTICK_RUNS.exec(src)) {
    if (run[0].length === fence) return run.index;
  }
  return -1;
}

export function codeSpanText(raw: string): string {
  const content = raw.replace(/\n/g, ' ');
  const padded = content.startsWith(' ') && content.endsWith(' ') && /[^ ]/.test(content);
  return padded ? content.slice(1, -1) : content;
}
