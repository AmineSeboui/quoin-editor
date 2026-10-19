const ELLIPSIS = '\u2026';

/** The text, or when it is longer than `max` characters, its start and end around an ellipsis, `max` in all. */
export function truncateMiddle(text: string, max: number): string {
  const characters = [...text];
  if (characters.length <= max) return text;
  const kept = max - 1;
  const head = Math.ceil(kept / 2);
  return characters.slice(0, head).join('') + ELLIPSIS + characters.slice(characters.length - (kept - head)).join('');
}
