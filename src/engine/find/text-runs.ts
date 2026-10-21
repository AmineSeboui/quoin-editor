import type { Inline } from '../model/types';

/** A stretch of text between atoms, `start` being its offset in the region. */
export type TextRun = { readonly start: number; readonly text: string };

/** The text of a region cut at every atom, with marks dropped so that they never break a match. */
export function textRuns(inline: Inline): TextRun[] {
  const runs: TextRun[] = [];
  let start = 0;
  let text = '';
  let offset = 0;
  for (const node of inline) {
    if (node.kind === 'text') {
      text += node.text;
      offset += node.text.length;
      continue;
    }
    if (text !== '') runs.push({ start, text });
    offset += 1;
    start = offset;
    text = '';
  }
  if (text !== '') runs.push({ start, text });
  return runs;
}

/** The run that holds the whole of `from` to `to`, if no atom stands in that range. */
export function runHolding(inline: Inline, from: number, to: number): TextRun | undefined {
  return textRuns(inline).find(({ start, text }) => start <= from && to <= start + text.length);
}
