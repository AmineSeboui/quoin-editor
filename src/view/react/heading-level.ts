export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export function headingLevel(level: unknown): HeadingLevel {
  if (typeof level !== 'number' || !Number.isInteger(level)) return 1;
  return Math.min(6, Math.max(1, level)) as HeadingLevel;
}
