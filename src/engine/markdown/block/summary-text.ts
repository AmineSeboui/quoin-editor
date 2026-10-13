import { trimBlank } from './lines';

const OPENING_TAG = /^\s*<summary(?:\s[^>]*)?>/i;
const FINAL_CLOSING_TAG = /<\/summary>[ \t]*$/i;
const FIRST_CLOSING_TAG = /<\/summary>[\s\S]*$/i;

// Quoin writes the closing tag last, so a final tag ends the summary and earlier ones are text. Foreign html that closes
// the summary in the middle of a line has no final tag, so its first tag does.
export function summaryText(lines: readonly string[]): string {
  const text = lines.join('\n').replace(OPENING_TAG, '');
  return trimBlank(text.replace(FINAL_CLOSING_TAG.test(text) ? FINAL_CLOSING_TAG : FIRST_CLOSING_TAG, ''));
}
